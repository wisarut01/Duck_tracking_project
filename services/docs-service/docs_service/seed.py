"""Demo data — the same spaces and pages as the mock (services/mock-api/src/seed.js),
with the same ids, so issue links in tracker-service and users in auth-service match."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import Page, Space


def seed_id(prefix: str, n: int) -> uuid.UUID:
    return uuid.UUID(f"{prefix}-0000-4000-8000-{n:012d}")


def day(d: int, time: str = "09:00") -> datetime:
    hour, minute = map(int, time.split(":"))
    return datetime(2026, 10, d, hour, minute, tzinfo=UTC)


DUCK, MINT, PLOY = (seed_id("7f1c2a9e", n) for n in (1, 2, 3))
P = {
    name: seed_id("5e6f7081", n)
    for n, name in enumerate(
        [
            "board_spec",
            "home",
            "architecture",
            "grpc",
            "database",
            "frontend",
            "design_system",
            "onboarding",
            "local_setup",
            "roadmap",
        ],
        start=1,
    )
}


def seed(session: Session) -> None:
    """Add the demo spaces ENG and PM with their pages, if there are no spaces yet."""
    if session.scalar(select(func.count()).select_from(Space)):
        return

    session.add_all(
        [
            Space(
                id=seed_id("6f708192", 1), key="ENG", name="Engineering", description="เอกสารทีม dev", created_at=day(1)
            ),
            Space(
                id=seed_id("6f708192", 2),
                key="PM",
                name="Product",
                description="Roadmap และ requirement",
                created_at=day(1, "10:00"),
            ),
        ]
    )
    session.flush()

    def page(key, parent, title, content, author, created, updated, space="ENG"):
        return Page(
            id=P[key],
            space_key=space,
            parent_id=P[parent] if parent else None,
            title=title,
            content_md=content,
            author_id=author,
            created_at=created,
            updated_at=updated,
        )

    # Parents first, so the parent_id foreign key is always satisfied.
    pages = [
        page("home", None, "Engineering Home",
             "# Engineering Home\n\nยินดีต้อนรับสู่ space ของทีม dev\n\n- งาน setup repo: TB-1\n- Architecture ดูที่หน้าลูก",
             DUCK, day(2, "09:00"), day(2, "09:00")),
        page("architecture", "home", "Architecture",
             "# Architecture\n\nweb → api-gateway (REST) → services (gRPC)\n\nตัดสินใจไว้ใน TB-2, auth อยู่ใน TB-5",
             DUCK, day(2, "10:00"), day(3, "11:00")),
        page("grpc", "architecture", "gRPC Contracts",
             "# gRPC Contracts\n\nไฟล์อยู่ที่ `proto/`. งานที่เกี่ยวข้อง: TB-6",
             DUCK, day(3, "09:00"), day(4, "09:00")),
        page("database", "architecture", "Database Schema",
             "# Database Schema\n\n1 database ต่อ service. ตาราง `issue_page_links` อยู่ใน tracker (TB-7)",
             PLOY, day(3, "10:00"), day(4, "10:00")),
        page("frontend", "home", "Frontend",
             "# Frontend\n\nReact + Vite. ดู Board Spec และ Design System",
             MINT, day(2, "11:00"), day(2, "11:00")),
        page("board_spec", "frontend", "Board Spec",
             "# Board Spec\n\nคอลัมน์: TODO / IN_PROGRESS / IN_REVIEW / DONE\n\nงานหลักอยู่ที่ TB-12, drag & drop อยู่ที่ TB-3",
             MINT, day(2, "09:00"), day(4, "12:00")),
        page("design_system", "frontend", "Design System",
             "# Design System\n\nสี / ตัวอักษร / spacing — ติดตามใน TB-4",
             MINT, day(3, "14:00"), day(5, "09:00")),
        page("onboarding", None, "Onboarding",
             "# Onboarding\n\nเริ่มต้นสำหรับคนใหม่",
             PLOY, day(2, "15:00"), day(2, "15:00")),
        page("local_setup", "onboarding", "Local Setup",
             "# Local Setup\n\n```bash\nmake up\n```\n\nกำลังรีวิวใน TB-9",
             PLOY, day(3, "15:00"), day(6, "15:00")),
        page("roadmap", None, "Roadmap Q4",
             "# Roadmap Q4\n\n- MVP: board + docs\n- Search (TB-10)",
             DUCK, day(2, "16:00"), day(2, "16:00"), space="PM"),
    ]  # fmt: skip
    for p in pages:
        session.add(p)
        session.flush()
