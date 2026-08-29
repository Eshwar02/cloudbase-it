from sqlmodel import Session, select

from app.core.db import engine
from app.models.tables import User


def test_can_insert_and_read_user():
    with Session(engine) as s:
        u = User(email="t1@example.com", password_hash="x", display_name="T1")
        s.add(u)
        s.commit()
        s.refresh(u)
        got = s.exec(select(User).where(User.id == u.id)).one()
        assert got.email == "t1@example.com"
        s.delete(got)
        s.commit()
