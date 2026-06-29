import uuid
from datetime import date, datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, Boolean, Integer, Date, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Obligation(Base):
    __tablename__ = "obligations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    owner: Mapped[str] = mapped_column(String(255), nullable=False)
    requires_document: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    document_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    company_tax_id: Mapped[str] = mapped_column(String(255), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    audit_logs: Mapped[list["ObligationAuditLog"]] = relationship(
        "ObligationAuditLog", back_populates="obligation", order_by="ObligationAuditLog.changed_at"
    )


class ObligationAuditLog(Base):
    __tablename__ = "obligation_audit_log"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    obligation_id: Mapped[str] = mapped_column(String(36), ForeignKey("obligations.id", ondelete="CASCADE"), nullable=False)
    from_status: Mapped[str] = mapped_column(String(20), nullable=False)
    to_status: Mapped[str] = mapped_column(String(20), nullable=False)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    obligation: Mapped["Obligation"] = relationship("Obligation", back_populates="audit_logs")
