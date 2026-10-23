"""DocsService gRPC implementation (proto/docs/v1/docs.proto)."""

import re
import uuid
from collections import defaultdict
from datetime import UTC, datetime

import grpc
from docs.v1 import docs_pb2, docs_pb2_grpc
from google.protobuf.timestamp_pb2 import Timestamp
from sqlalchemy import delete, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from .models import Page, Space, utcnow

KEY_PATTERN = re.compile(r"^[A-Z][A-Z0-9]{1,9}$")
DEFAULT_SEARCH_LIMIT = 20


class Abort(Exception):
    """Raised inside an RPC to answer with a gRPC error; see DocsService._run."""

    def __init__(self, code: grpc.StatusCode, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def invalid(message: str) -> Abort:
    return Abort(grpc.StatusCode.INVALID_ARGUMENT, message)


def not_found(message: str) -> Abort:
    return Abort(grpc.StatusCode.NOT_FOUND, message)


def parse_uuid(value: str) -> uuid.UUID | None:
    try:
        return uuid.UUID(value)
    except ValueError:
        return None


def required_text(value: str, field: str, max_len: int) -> str:
    text = value.strip()
    if not text or len(text) > max_len:
        raise invalid(f"{field}: must be 1 to {max_len} characters")
    return text


def like_pattern(q: str) -> str:
    """User text → ILIKE "contains" pattern with % and _ matched literally."""
    escaped = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def timestamp(dt: datetime) -> Timestamp:
    if dt.tzinfo is None:  # SQLite (tests) gives back naive datetimes; they are UTC
        dt = dt.replace(tzinfo=UTC)
    ts = Timestamp()
    ts.FromDatetime(dt)
    return ts


# ---------------- rows → proto ----------------


def space_proto(s: Space) -> docs_pb2.Space:
    return docs_pb2.Space(
        id=str(s.id), key=s.key, name=s.name, description=s.description, create_time=timestamp(s.created_at)
    )


def page_proto(p: Page) -> docs_pb2.Page:
    return docs_pb2.Page(
        id=str(p.id),
        space_key=p.space_key,
        parent_id=str(p.parent_id) if p.parent_id else None,
        title=p.title,
        content_md=p.content_md,
        author_id=str(p.author_id),
        create_time=timestamp(p.created_at),
        update_time=timestamp(p.updated_at),
    )


def page_summary(p: Page) -> docs_pb2.PageSummary:
    return docs_pb2.PageSummary(id=str(p.id), space_key=p.space_key, title=p.title, update_time=timestamp(p.updated_at))


# ---------------- the service ----------------


class DocsService(docs_pb2_grpc.DocsServiceServicer):
    def __init__(self, session_factory: sessionmaker[Session]):
        self.Session = session_factory

    # Every RPC body runs in one transaction. Raising Abort answers with that
    # gRPC status; anything else becomes INTERNAL (details only in the log).
    def _run(self, context: grpc.ServicerContext, body):
        try:
            with self.Session.begin() as session:
                return body(session)
        except Abort as err:
            context.abort(err.code, err.message)

    # ---- spaces ----

    def ListSpaces(self, request, context):
        def body(session: Session):
            spaces = session.scalars(select(Space).order_by(Space.created_at, Space.id))
            return docs_pb2.ListSpacesResponse(spaces=[space_proto(s) for s in spaces])

        return self._run(context, body)

    def CreateSpace(self, request, context):
        def body(session: Session):
            if not KEY_PATTERN.match(request.key):
                raise invalid("key: must match ^[A-Z][A-Z0-9]{1,9}$")
            name = required_text(request.name, "name", 100)
            already = Abort(grpc.StatusCode.ALREADY_EXISTS, f"space key {request.key} already exists")
            if session.scalar(select(Space).where(Space.key == request.key)):
                raise already
            space = Space(
                key=request.key,
                name=name,
                description=request.description if request.HasField("description") else None,
            )
            session.add(space)
            try:
                session.flush()
            except IntegrityError:  # created by someone else at the same moment
                raise already from None
            return docs_pb2.CreateSpaceResponse(space=space_proto(space))

        return self._run(context, body)

    def GetSpace(self, request, context):
        def body(session: Session):
            return docs_pb2.GetSpaceResponse(space=space_proto(find_space(session, request.key)))

        return self._run(context, body)

    # ---- pages ----

    def GetPageTree(self, request, context):
        def body(session: Session):
            space = find_space(session, request.space_key)
            pages = session.scalars(
                select(Page).where(Page.space_key == space.key).order_by(Page.created_at, Page.id)
            ).all()
            children: dict[uuid.UUID | None, list[Page]] = defaultdict(list)
            for p in pages:
                children[p.parent_id].append(p)

            def build(parent_id: uuid.UUID | None) -> list[docs_pb2.PageTreeNode]:
                return [
                    docs_pb2.PageTreeNode(id=str(p.id), title=p.title, children=build(p.id))
                    for p in children[parent_id]
                ]

            return docs_pb2.GetPageTreeResponse(roots=build(None))

        return self._run(context, body)

    def CreatePage(self, request, context):
        def body(session: Session):
            title = required_text(request.title, "title", 200)
            author_id = parse_uuid(request.author_id)
            if author_id is None:
                raise invalid("author_id: must be a UUID")
            space = find_space(session, request.space_key)
            parent_id = None
            if request.HasField("parent_id"):
                parent_id = valid_parent(session, space.key, request.parent_id).id

            now = utcnow()
            page = Page(
                space_key=space.key,
                parent_id=parent_id,
                title=title,
                content_md=request.content_md,
                author_id=author_id,
                created_at=now,
                updated_at=now,
            )
            session.add(page)
            session.flush()
            return docs_pb2.CreatePageResponse(page=page_proto(page))

        return self._run(context, body)

    def GetPage(self, request, context):
        def body(session: Session):
            return docs_pb2.GetPageResponse(page=page_proto(find_page(session, request.id)))

        return self._run(context, body)

    def UpdatePage(self, request, context):
        def body(session: Session):
            paths = list(request.update_mask.paths)
            if not paths:
                raise invalid("update_mask: must list at least one field")
            page = find_page(session, request.id)
            new = request.page
            for path in paths:
                if path == "title":
                    page.title = required_text(new.title, "title", 200)
                elif path == "content_md":
                    page.content_md = new.content_md
                elif path == "parent_id":
                    if not new.HasField("parent_id"):
                        page.parent_id = None  # move to top level
                        continue
                    parent = valid_parent(session, page.space_key, new.parent_id)
                    # Moving a page under itself or its own child would create a loop.
                    if parent.id == page.id or parent.id in descendant_ids(session, page.id):
                        raise invalid("a page cannot be moved under itself or its own children")
                    page.parent_id = parent.id
                else:
                    raise invalid(f"update_mask: {path} cannot be updated")
            page.updated_at = utcnow()
            session.flush()
            return docs_pb2.UpdatePageResponse(page=page_proto(page))

        return self._run(context, body)

    def DeletePage(self, request, context):
        def body(session: Session):
            page = find_page(session, request.id)
            ids = [page.id, *descendant_ids(session, page.id)]
            session.execute(delete(Page).where(Page.id.in_(ids)))
            return docs_pb2.DeletePageResponse(deleted_page_ids=[str(i) for i in ids])

        return self._run(context, body)

    def BatchGetPages(self, request, context):
        def body(session: Session):
            ids = [i for i in (parse_uuid(raw) for raw in request.ids) if i is not None]
            if not ids:
                return docs_pb2.BatchGetPagesResponse()
            by_id = {p.id: p for p in session.scalars(select(Page).where(Page.id.in_(ids)))}
            # Same order as asked; unknown ids are skipped.
            return docs_pb2.BatchGetPagesResponse(pages=[page_summary(by_id[i]) for i in ids if i in by_id])

        return self._run(context, body)

    def SearchPages(self, request, context):
        def body(session: Session):
            q = request.q.strip()
            if not q:
                raise invalid("q: must not be blank")
            pattern = like_pattern(q)
            pages = session.scalars(
                select(Page)
                .where(or_(Page.title.ilike(pattern, escape="\\"), Page.content_md.ilike(pattern, escape="\\")))
                .order_by(Page.created_at, Page.id)
                .limit(request.limit if request.limit > 0 else DEFAULT_SEARCH_LIMIT)
            )
            return docs_pb2.SearchPagesResponse(pages=[page_summary(p) for p in pages])

        return self._run(context, body)


# ---------------- helpers ----------------


def find_space(session: Session, key: str) -> Space:
    space = session.scalar(select(Space).where(Space.key == key))
    if space is None:
        raise not_found(f"space {key} not found")
    return space


def find_page(session: Session, raw_id: str) -> Page:
    page_id = parse_uuid(raw_id)
    page = session.get(Page, page_id) if page_id else None
    if page is None:
        raise not_found(f"page {raw_id} not found")
    return page


def valid_parent(session: Session, space_key: str, raw_id: str) -> Page:
    """A parent must be an existing page in the same space."""
    parent_id = parse_uuid(raw_id)
    parent = session.get(Page, parent_id) if parent_id else None
    if parent is None or parent.space_key != space_key:
        raise invalid(f"parentId {raw_id} is not a page in space {space_key}")
    return parent


def descendant_ids(session: Session, page_id: uuid.UUID) -> list[uuid.UUID]:
    """All pages below page_id (children, grandchildren, …), one query per level."""
    found: list[uuid.UUID] = []
    level = [page_id]
    while level:
        level = list(session.scalars(select(Page.id).where(Page.parent_id.in_(level))))
        found.extend(level)
    return found
