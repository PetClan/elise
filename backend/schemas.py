from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional
from enum import Enum


# Enums
class CallbackTypeEnum(str, Enum):
    AWAITING_CALLBACK = "Awaiting Callback"
    TO_CALL_BACK = "To Call Back"


class FeeStatusEnum(str, Enum):
    UNPAID = "Unpaid"
    INVOICED = "Invoiced"
    PAID = "Paid"


# Contact Schemas
class ContactBase(BaseModel):
    care_home_name: str
    telephone: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    postcode: Optional[str] = None
    website: Optional[str] = None


class ContactCreate(ContactBase):
    pass


class ContactUpdate(BaseModel):
    care_home_name: Optional[str] = None
    telephone: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    postcode: Optional[str] = None
    website: Optional[str] = None


class ContactResponse(ContactBase):
    id: int

    class Config:
        from_attributes = True


# Call Log Schemas
class CallLogBase(BaseModel):
    contact_id: int
    call_datetime: datetime
    notes: Optional[str] = None


class CallLogCreate(CallLogBase):
    pass


class CallLogUpdate(BaseModel):
    contact_id: Optional[int] = None
    call_datetime: Optional[datetime] = None
    notes: Optional[str] = None


class CallLogResponse(CallLogBase):
    id: int
    contact: Optional[ContactResponse] = None

    class Config:
        from_attributes = True


# Callback Schemas
class CallbackBase(BaseModel):
    contact_id: int
    original_call_datetime: datetime
    notes: Optional[str] = None
    callback_datetime: datetime
    callback_type: CallbackTypeEnum


class CallbackCreate(CallbackBase):
    pass


class CallbackUpdate(BaseModel):
    contact_id: Optional[int] = None
    original_call_datetime: Optional[datetime] = None
    notes: Optional[str] = None
    callback_datetime: Optional[datetime] = None
    callback_type: Optional[CallbackTypeEnum] = None


class CallbackResponse(CallbackBase):
    id: int
    contact: Optional[ContactResponse] = None

    class Config:
        from_attributes = True


# Booking Schemas
class BookingBase(BaseModel):
    contact_id: int
    booking_from: datetime
    booking_to: datetime
    booking_type: Optional[str] = None
    more_info: Optional[str] = None
    fee_agreed: Optional[float] = None
    fee_status: FeeStatusEnum = FeeStatusEnum.UNPAID


class BookingCreate(BookingBase):
    pass


class BookingUpdate(BaseModel):
    contact_id: Optional[int] = None
    booking_from: Optional[datetime] = None
    booking_to: Optional[datetime] = None
    booking_type: Optional[str] = None
    more_info: Optional[str] = None
    fee_agreed: Optional[float] = None
    fee_status: Optional[FeeStatusEnum] = None


class BookingResponse(BookingBase):
    id: int
    contact: Optional[ContactResponse] = None

    class Config:
        from_attributes = True


# Auth Schema
class PasswordCheck(BaseModel):
    password: str
