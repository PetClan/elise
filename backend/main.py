from fastapi import FastAPI, Depends, HTTPException, Header, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os

from database import get_db, init_db, SessionLocal
from models import Contact, CallLog, Callback, Booking, CallbackType, FeeStatus
from schemas import (
    ContactCreate, ContactUpdate, ContactResponse,
    CallLogCreate, CallLogUpdate, CallLogResponse,
    CallbackCreate, CallbackUpdate, CallbackResponse,
    BookingCreate, BookingUpdate, BookingResponse,
    PasswordCheck
)
from auth import verify_password, create_session, validate_session, invalidate_session

app = FastAPI(title="Elise CRM", version="1.0.0")

# Initialize database on startup
@app.on_event("startup")
def startup():
    from sqlalchemy import text
    
    # Add missing columns to existing tables
    db = SessionLocal()
    try:
        # Add address column to contacts if it doesn't exist
        db.execute(text("ALTER TABLE contacts ADD COLUMN IF NOT EXISTS address TEXT"))
        # Add postcode column to contacts if it doesn't exist
        db.execute(text("ALTER TABLE contacts ADD COLUMN IF NOT EXISTS postcode VARCHAR(20)"))
        # Add contact_id column to bookings if it doesn't exist
        db.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS contact_id INTEGER REFERENCES contacts(id)"))
        # Add booking_from column to bookings if it doesn't exist
        db.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_from TIMESTAMP"))
        # Add booking_to column to bookings if it doesn't exist
        db.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_to TIMESTAMP"))
        # Drop old booking_date column if it exists
        db.execute(text("ALTER TABLE bookings DROP COLUMN IF EXISTS booking_date"))
        # Drop old venue column if it exists
        db.execute(text("ALTER TABLE bookings DROP COLUMN IF EXISTS venue"))
        # Delete old bookings with NULL values in required fields
        db.execute(text("DELETE FROM bookings WHERE contact_id IS NULL OR booking_from IS NULL OR booking_to IS NULL"))
        db.commit()
        print("Database columns updated successfully")
    except Exception as e:
        print(f"Column update error: {e}")
        db.rollback()
    finally:
        db.close()
    
    # Ensure all tables exist
    init_db()


# ============== Authentication ==============

def get_current_session(authorization: Optional[str] = Header(None)):
    """Dependency to check if user is authenticated"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    token = authorization.replace("Bearer ", "")
    if not validate_session(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session"
        )
    return token


@app.post("/api/auth/login")
def login(data: PasswordCheck):
    """Login with password and get session token"""
    if verify_password(data.password):
        token = create_session()
        return {"success": True, "token": token}
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect password"
    )


@app.post("/api/auth/logout")
def logout(token: str = Depends(get_current_session)):
    """Logout and invalidate session"""
    invalidate_session(token)
    return {"success": True, "message": "Logged out"}


@app.get("/api/auth/check")
def check_auth(token: str = Depends(get_current_session)):
    """Check if current session is valid"""
    return {"authenticated": True}


# ============== Contacts ==============

@app.get("/api/contacts", response_model=List[ContactResponse])
def get_contacts(
    db: Session = Depends(get_db),
    token: str = Depends(get_current_session)
):
    """Get all contacts"""
    return db.query(Contact).order_by(Contact.care_home_name).all()


@app.get("/api/contacts/{contact_id}", response_model=ContactResponse)
def get_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    token: str = Depends(get_current_session)
):
    """Get a single contact by ID"""
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@app.post("/api/contacts", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def create_contact(
    contact: ContactCreate,
    db: Session = Depends(get_db),
    token: str = Depends(get_current_session)
):
    """Create a new contact"""
    db_contact = Contact(**contact.model_dump())
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact


@app.put("/api/contacts/{contact_id}", response_model=ContactResponse)
def update_contact(
    contact_id: int,
    contact: ContactUpdate,
    db: Session = Depends(get_db),
    token: str = Depends(get_current_session)
):
    """Update a contact"""
    db_contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not db_contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    update_data = contact.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_contact, field, value)
    
    db.commit()
    db.refresh(db_contact)
    return db_contact


@app.delete("/api/contacts/{contact_id}")
def delete_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    token: str = Depends(get_current_session)
):
    """Delete a contact"""
    db_contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not db_contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    db.delete(db_contact)
    db.commit()
    return {"success": True, "message": "Contact deleted"}


# ============== Call Logs ==============

@app.get("/api/call-logs", response_model=List[CallLogResponse])
def get_call_logs(
    db: Session = Depends(get_db),
    token: str = Depends(get_current_session)
):
    """Get all call logs"""
    return db.query(CallLog).order_by(CallLog.call_datetime.desc()).all()


@app.get("/api/call-logs/{log_id}", response_model=CallLogResponse)
def get_call_log(
    log_id: int,
    db: Session = Depends(get_db),
    token: str = Depends(get_current_session)
):
    """Get a single call log by ID"""
    log = db.query(CallLog).filter(CallLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Call log not found")
    return log


@app.post("/api/call-logs", response_model=CallLogResponse, status_code=status.HTTP_201_CREATED)
def create_call_log(
    log: CallLogCreate,
    db: Session = Depends(get_db),
    token: str = Depends(get_current_session)
):
    """Create a new call log"""
    # Verify contact exists
    contact = db.query(Contact).filter(Contact.id == log.contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    db_log = CallLog(**log.model_dump())
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log


@app.put("/api/call-logs/{log_id}", response_model=CallLogResponse)
def update_call_log(
    log_id: int,
    log: CallLogUpdate,
    db: Session = Depends(get_db),
    token: str = Depends(get_current_session)
):
    """Update a call log"""
    db_log = db.query(CallLog).filter(CallLog.id == log_id).first()
    if not db_log:
        raise HTTPException(status_code=404, detail="Call log not found")
    
    update_data = log.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_log, field, value)
    
    db.commit()
    db.refresh(db_log)
    return db_log


@app.delete("/api/call-logs/{log_id}")
def delete_call_log(
    log_id: int,
    db: Session = Depends(get_db),
    token: str = Depends(get_current_session)
):
    """Delete a call log"""
    db_log = db.query(CallLog).filter(CallLog.id == log_id).first()
    if not db_log:
        raise HTTPException(status_code=404, detail="Call log not found")
    
    db.delete(db_log)
    db.commit()
    return {"success": True, "message": "Call log deleted"}


# ============== Callbacks ==============

@app.get("/api/callbacks", response_model=List[CallbackResponse])
def get_callbacks(
    callback_type: Optional[str] = None,
    db: Session = Depends(get_db),
    token: str = Depends(get_current_session)
):
    """Get all callbacks, optionally filtered by type"""
    query = db.query(Callback)
    
    if callback_type:
        if callback_type == "Awaiting Callback":
            query = query.filter(Callback.callback_type == CallbackType.AWAITING_CALLBACK)
        elif callback_type == "To Call Back":
            query = query.filter(Callback.callback_type == CallbackType.TO_CALL_BACK)
    
    return query.order_by(Callback.callback_datetime).all()


@app.get("/api/callbacks/{callback_id}", response_model=CallbackResponse)
def get_callback(
    callback_id: int,
    db: Session = Depends(get_db),
    token: str = Depends(get_current_session)
):
    """Get a single callback by ID"""
    callback = db.query(Callback).filter(Callback.id == callback_id).first()
    if not callback:
        raise HTTPException(status_code=404, detail="Callback not found")
    return callback


@app.post("/api/callbacks", response_model=CallbackResponse, status_code=status.HTTP_201_CREATED)
def create_callback(
    callback: CallbackCreate,
    db: Session = Depends(get_db),
    token: str = Depends(get_current_session)
):
    """Create a new callback"""
    # Verify contact exists
    contact = db.query(Contact).filter(Contact.id == callback.contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    callback_data = callback.model_dump()
    # Convert enum string to enum value
    callback_data['callback_type'] = CallbackType(callback_data['callback_type'])
    
    db_callback = Callback(**callback_data)
    db.add(db_callback)
    db.commit()
    db.refresh(db_callback)
    return db_callback


@app.put("/api/callbacks/{callback_id}", response_model=CallbackResponse)
def update_callback(
    callback_id: int,
    callback: CallbackUpdate,
    db: Session = Depends(get_db),
    token: str = Depends(get_current_session)
):
    """Update a callback"""
    db_callback = db.query(Callback).filter(Callback.id == callback_id).first()
    if not db_callback:
        raise HTTPException(status_code=404, detail="Callback not found")
    
    update_data = callback.model_dump(exclude_unset=True)
    if 'callback_type' in update_data and update_data['callback_type']:
        update_data['callback_type'] = CallbackType(update_data['callback_type'])
    
    for field, value in update_data.items():
        setattr(db_callback, field, value)
    
    db.commit()
    db.refresh(db_callback)
    return db_callback


@app.delete("/api/callbacks/{callback_id}")
def delete_callback(
    callback_id: int,
    db: Session = Depends(get_db),
    token: str = Depends(get_current_session)
):
    """Delete a callback"""
    db_callback = db.query(Callback).filter(Callback.id == callback_id).first()
    if not db_callback:
        raise HTTPException(status_code=404, detail="Callback not found")
    
    db.delete(db_callback)
    db.commit()
    return {"success": True, "message": "Callback deleted"}


# ============== Bookings ==============

@app.get("/api/bookings", response_model=List[BookingResponse])
def get_bookings(
    fee_status: Optional[str] = None,
    db: Session = Depends(get_db),
    token: str = Depends(get_current_session)
):
    """Get all bookings, optionally filtered by fee status"""
    query = db.query(Booking)
    
    if fee_status:
        query = query.filter(Booking.fee_status == FeeStatus(fee_status))
    
    return query.order_by(Booking.booking_from).all()

@app.get("/api/bookings/{booking_id}", response_model=BookingResponse)
def get_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    token: str = Depends(get_current_session)
):
    """Get a single booking by ID"""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@app.post("/api/bookings", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(
    booking: BookingCreate,
    db: Session = Depends(get_db),
    token: str = Depends(get_current_session)
):
    """Create a new booking"""
    booking_data = booking.model_dump()
    booking_data['fee_status'] = FeeStatus(booking_data['fee_status'])
    
    db_booking = Booking(**booking_data)
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    return db_booking


@app.put("/api/bookings/{booking_id}", response_model=BookingResponse)
def update_booking(
    booking_id: int,
    booking: BookingUpdate,
    db: Session = Depends(get_db),
    token: str = Depends(get_current_session)
):
    """Update a booking"""
    db_booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not db_booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    update_data = booking.model_dump(exclude_unset=True)
    if 'fee_status' in update_data and update_data['fee_status']:
        update_data['fee_status'] = FeeStatus(update_data['fee_status'])
    
    for field, value in update_data.items():
        setattr(db_booking, field, value)
    
    db.commit()
    db.refresh(db_booking)
    return db_booking


@app.delete("/api/bookings/{booking_id}")
def delete_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    token: str = Depends(get_current_session)
):
    """Delete a booking"""
    db_booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not db_booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    db.delete(db_booking)
    db.commit()
    return {"success": True, "message": "Booking deleted"}


# ============== Dashboard Stats ==============

@app.get("/api/dashboard/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    token: str = Depends(get_current_session)
):
    """Get dashboard statistics"""
    from datetime import datetime, timedelta
    
    today = datetime.now().date()
    
    total_contacts = db.query(Contact).count()
    total_bookings = db.query(Booking).count()
    upcoming_bookings = db.query(Booking).filter(
    Booking.booking_from >= datetime.now()
).count()
    
    awaiting_callbacks = db.query(Callback).filter(
        Callback.callback_type == CallbackType.AWAITING_CALLBACK
    ).count()
    
    to_call_back = db.query(Callback).filter(
        Callback.callback_type == CallbackType.TO_CALL_BACK
    ).count()
    
    unpaid_bookings = db.query(Booking).filter(
        Booking.fee_status == FeeStatus.UNPAID
    ).count()
    
    invoiced_bookings = db.query(Booking).filter(
        Booking.fee_status == FeeStatus.INVOICED
    ).count()
    
    return {
        "total_contacts": total_contacts,
        "total_bookings": total_bookings,
        "upcoming_bookings": upcoming_bookings,
        "awaiting_callbacks": awaiting_callbacks,
        "to_call_back": to_call_back,
        "unpaid_bookings": unpaid_bookings,
        "invoiced_bookings": invoiced_bookings
    }


# ============== Static Files & Page ===============

# Get the directory where main.py is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")


@app.get("/")
def serve_homepage():
    """Serve the public homepage"""
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


@app.get("/crm")
def serve_crm():
    """Serve the CRM page"""
    return FileResponse(os.path.join(FRONTEND_DIR, "crm.html"))


# Mount static files (CSS, JS, Images)
app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(FRONTEND_DIR, "js")), name="js")
app.mount("/images", StaticFiles(directory=os.path.join(FRONTEND_DIR, "images")), name="images")
