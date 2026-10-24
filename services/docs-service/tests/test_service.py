import uuid

import grpc
import pytest
from docs.v1 import docs_pb2 as pb
from google.protobuf.field_mask_pb2 import FieldMask

from docs_service.seed import P, seed

AUTHOR = "7f1c2a9e-0000-4000-8000-000000000001"


def code_of(call) -> grpc.StatusCode:
    with pytest.raises(grpc.RpcError) as err:
        call()
    return err.value.code()


def make_space(stub, key="ENG"):
    return stub.CreateSpace(pb.CreateSpaceRequest(key=key, name=" Engineering ")).space


def make_page(stub, title, parent=None, space="ENG", content=""):
    return stub.CreatePage(
        pb.CreatePageRequest(space_key=space, title=title, parent_id=parent, content_md=content, author_id=AUTHOR)
    ).page


def tree(stub, space="ENG"):
    """Page tree as nested (title, [children]) tuples — easy to compare."""

    def walk(nodes):
        return [(n.title, walk(n.children)) for n in nodes]

    return walk(stub.GetPageTree(pb.GetPageTreeRequest(space_key=space)).roots)


def test_spaces(stub):
    space = make_space(stub)
    assert space.name == "Engineering"
    assert not space.HasField("description")
    assert [s.key for s in stub.ListSpaces(pb.ListSpacesRequest()).spaces] == ["ENG"]
    assert stub.GetSpace(pb.GetSpaceRequest(key="ENG")).space.id == space.id

    assert code_of(lambda: make_space(stub)) == grpc.StatusCode.ALREADY_EXISTS
    assert code_of(lambda: make_space(stub, key="eng")) == grpc.StatusCode.INVALID_ARGUMENT
    assert code_of(lambda: stub.GetSpace(pb.GetSpaceRequest(key="NOPE"))) == grpc.StatusCode.NOT_FOUND


def test_create_and_get_page(stub):
    make_space(stub)
    page = make_page(stub, "  Home  ", content="# Hi TB-1")
    assert page.title == "Home"
    assert not page.HasField("parent_id")
    assert page.author_id == AUTHOR

    got = stub.GetPage(pb.GetPageRequest(id=page.id)).page
    assert got.content_md == "# Hi TB-1"
    assert got.create_time == got.update_time

    assert code_of(lambda: make_page(stub, "   ")) == grpc.StatusCode.INVALID_ARGUMENT
    assert code_of(lambda: make_page(stub, "x", space="NOPE")) == grpc.StatusCode.NOT_FOUND
    assert code_of(lambda: stub.GetPage(pb.GetPageRequest(id=str(uuid.uuid4())))) == grpc.StatusCode.NOT_FOUND
    assert code_of(lambda: stub.GetPage(pb.GetPageRequest(id="not-a-uuid"))) == grpc.StatusCode.NOT_FOUND


def test_parent_must_be_in_the_same_space(stub):
    make_space(stub)
    make_space(stub, key="PM")
    other = make_page(stub, "PM page", space="PM")
    assert code_of(lambda: make_page(stub, "x", parent=other.id)) == grpc.StatusCode.INVALID_ARGUMENT
    assert code_of(lambda: make_page(stub, "x", parent=str(uuid.uuid4()))) == grpc.StatusCode.INVALID_ARGUMENT


def test_page_tree(stub):
    make_space(stub)
    home = make_page(stub, "Home")
    arch = make_page(stub, "Architecture", parent=home.id)
    make_page(stub, "gRPC", parent=arch.id)
    make_page(stub, "Onboarding")
    assert tree(stub) == [("Home", [("Architecture", [("gRPC", [])])]), ("Onboarding", [])]


def test_update_page(stub):
    make_space(stub)
    home = make_page(stub, "Home")
    child = make_page(stub, "Child", parent=home.id)
    grandchild = make_page(stub, "Grandchild", parent=child.id)

    def update(page_id, paths, **fields):
        mask = FieldMask(paths=paths)
        return stub.UpdatePage(pb.UpdatePageRequest(id=page_id, page=pb.Page(**fields), update_mask=mask))

    got = update(child.id, ["title", "content_md"], title=" Renamed ", content_md="new", parent_id=grandchild.id).page
    assert (got.title, got.content_md, got.parent_id) == ("Renamed", "new", home.id)  # parent_id not in the mask
    assert got.update_time.ToDatetime() > got.create_time.ToDatetime()

    # Move to top level, then back under home.
    assert not update(child.id, ["parent_id"]).page.HasField("parent_id")
    assert update(child.id, ["parent_id"], parent_id=home.id).page.parent_id == home.id

    for parent in (home.id, grandchild.id):  # under itself / under its own grandchild
        assert code_of(lambda p=parent: update(home.id, ["parent_id"], parent_id=p)) == grpc.StatusCode.INVALID_ARGUMENT
    assert code_of(lambda: update(home.id, ["author_id"])) == grpc.StatusCode.INVALID_ARGUMENT
    assert code_of(lambda: update(home.id, ["title"], title=" ")) == grpc.StatusCode.INVALID_ARGUMENT
    assert code_of(lambda: update(home.id, [])) == grpc.StatusCode.INVALID_ARGUMENT


def test_delete_page_removes_the_subtree(stub):
    make_space(stub)
    home = make_page(stub, "Home")
    child = make_page(stub, "Child", parent=home.id)
    grandchild = make_page(stub, "Grandchild", parent=child.id)
    other = make_page(stub, "Other")

    deleted = stub.DeletePage(pb.DeletePageRequest(id=child.id)).deleted_page_ids
    assert set(deleted) == {child.id, grandchild.id}
    assert tree(stub) == [("Home", []), ("Other", [])]
    assert code_of(lambda: stub.DeletePage(pb.DeletePageRequest(id=child.id))) == grpc.StatusCode.NOT_FOUND
    assert other.id  # untouched


def test_batch_get_keeps_the_order_and_skips_unknown(stub):
    make_space(stub)
    a, b = make_page(stub, "A"), make_page(stub, "B")
    got = stub.BatchGetPages(pb.BatchGetPagesRequest(ids=[b.id, str(uuid.uuid4()), "nope", a.id])).pages
    assert [p.title for p in got] == ["B", "A"]
    assert got[0].space_key == "ENG"


def test_search_pages(stub):
    make_space(stub)
    make_page(stub, "Board Spec", content="columns: TODO / DONE")
    make_page(stub, "Budget", content="100% done")

    def search(q):
        return [p.title for p in stub.SearchPages(pb.SearchPagesRequest(q=q)).pages]

    assert search("board") == ["Board Spec"]  # title, any case
    assert search("todo") == ["Board Spec"]  # content
    assert search("0%") == ["Budget"]  # % is literal
    assert search("_") == []  # _ is not a wildcard
    assert search("b") == ["Board Spec", "Budget"]
    assert [p.title for p in stub.SearchPages(pb.SearchPagesRequest(q="b", limit=1)).pages] == ["Board Spec"]
    assert code_of(lambda: search("  ")) == grpc.StatusCode.INVALID_ARGUMENT


def test_seed(stub, session_factory):
    with session_factory.begin() as session:
        seed(session)
    with session_factory.begin() as session:
        seed(session)  # second run is a no-op

    assert [s.key for s in stub.ListSpaces(pb.ListSpacesRequest()).spaces] == ["ENG", "PM"]
    assert tree(stub)[0][0] == "Engineering Home"
    board_spec = stub.GetPage(pb.GetPageRequest(id=str(P["board_spec"]))).page
    assert board_spec.parent_id == str(P["frontend"])


def test_sqlalchemy_url():
    from docs_service.server import sqlalchemy_url

    assert sqlalchemy_url("postgresql://u:p@h:5432/postgres") == "postgresql+psycopg://u:p@h:5432/postgres"
    assert sqlalchemy_url("postgres://u:p@h/db") == "postgresql+psycopg://u:p@h/db"
    assert sqlalchemy_url("postgresql+psycopg://u:p@h/db") == "postgresql+psycopg://u:p@h/db"


def test_login_rejected():
    from docs_service.server import login_rejected

    assert login_rejected('FATAL:  password authentication failed for user "postgres"')
    assert login_rejected("server error: FATAL: (ECIRCUITBREAKER) too many authentication failures")
    assert not login_rejected("connection refused")
