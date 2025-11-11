from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable, Optional

from sqlalchemy import Column, Integer, BigInteger, String, DateTime, ForeignKey, create_engine, Index
from sqlalchemy.orm import declarative_base, relationship, Session

from .config import DB_PATH

Base = declarative_base()


class Interface(Base):
    __tablename__ = "interfaces"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    is_default = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class App(Base):
    __tablename__ = "apps"

    id = Column(Integer, primary_key=True)
    process_name = Column(String, nullable=False)
    exe_path = Column(String, nullable=True)
    first_seen = Column(DateTime, default=datetime.utcnow)


class UsageAppMinute(Base):
    __tablename__ = "usage_app_minute"

    id = Column(Integer, primary_key=True)
    app_id = Column(Integer, ForeignKey("apps.id"), nullable=False)
    interface_id = Column(Integer, ForeignKey("interfaces.id"), nullable=True)
    ts_minute = Column(DateTime, index=True, nullable=False)
    rx_bytes = Column(BigInteger, default=0)
    tx_bytes = Column(BigInteger, default=0)

    __table_args__ = (
        Index("idx_app_ts", "app_id", "ts_minute"),
        Index("idx_iface_ts", "interface_id", "ts_minute"),
    )

    app = relationship(App)
    interface = relationship(Interface)


class UsageIfaceMinute(Base):
    __tablename__ = "usage_iface_minute"

    id = Column(Integer, primary_key=True)
    interface_id = Column(Integer, ForeignKey("interfaces.id"), nullable=True)
    ts_minute = Column(DateTime, index=True, nullable=False)
    rx_bytes = Column(BigInteger, default=0)
    tx_bytes = Column(BigInteger, default=0)

    __table_args__ = (Index("idx_iface_only_ts", "interface_id", "ts_minute"),)

    interface = relationship(Interface)


_engine = None


def get_engine():
    global _engine
    if _engine is None:
        Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
        _engine = create_engine(f"sqlite:///{DB_PATH}", future=True)
    return _engine


def init_db():
    engine = get_engine()
    Base.metadata.create_all(engine)


def get_session() -> Session:
    return Session(get_engine())


def upsert_interface(session: Session, name: str, is_default: bool = False) -> Interface:
    iface = session.query(Interface).filter_by(name=name).one_or_none()
    if iface is None:
        iface = Interface(name=name, is_default=1 if is_default else 0)
        session.add(iface)
        session.flush()
    return iface


def upsert_app(session: Session, process_name: str, exe_path: Optional[str]) -> App:
    app = (
        session.query(App)
        .filter_by(process_name=process_name, exe_path=exe_path)
        .one_or_none()
    )
    if app is None:
        app = App(process_name=process_name, exe_path=exe_path)
        session.add(app)
        session.flush()
    return app






