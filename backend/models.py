from sqlalchemy import Column, Integer, String, Text, DateTime, Numeric, ForeignKey, Enum
from sqlalchemy.orm import relationship
from database import Base
import enum


class CallbackType(enum.Enum):
    AWAITING_CALLBACK = "Awaiting Callback"
    TO_CALL_BACK = "To Call Back"


class FeeStatus(enum.Enum):
    UNPAID = "Unpaid"
    INVOICED = "Invoiced"
    PAID = "Paid"


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    care_home_name = Column(String(255), nullable=False)
    telephone = Column(String(50), nullable=True)
    contact_person = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    postcode = Column(String(20), nullable=True)
    website = Column(String(255), nullable=True)

    # Relationships
    call_logs = relationship("CallLog", back_populates="contact", cascade="all, delete-orphan")
    callbacks = relationship("Callback", back_populates="contact", cascade="all, delete-orphan")


class CallLog(Base):
    __tablename__ = "call_logs"

    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    call_datetime = Column(DateTime, nullable=False)
    notes = Column(Text, nullable=True)

    # Relationships
    contact = relationship("Contact", back_populates="call_logs")


class Callback(Base):
    __tablename__ = "callbacks"

    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    original_call_datetime = Column(DateTime, nullable=False)
    notes = Column(Text, nullable=True)
    callback_datetime = Column(DateTime, nullable=False)
    callback_type = Column(Enum(CallbackType), nullable=False)

    # Relationships
    contact = relationship("Contact", back_populates="callbacks")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    booking_from = Column(DateTime, nullable=False)
    booking_to = Column(DateTime, nullable=False)
    booking_type = Column(Text, nullable=True)
    more_info = Column(Text, nullable=True)
    fee_agreed = Column(Numeric(10, 2), nullable=True)
    fee_status = Column(Enum(FeeStatus), default=FeeStatus.UNPAID, nullable=False)

    # Relationships
    contact = relationship("Contact")
