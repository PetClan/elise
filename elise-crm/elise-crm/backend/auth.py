import os
import hashlib
import secrets

# Get password from environment variable (set this in Railway)
# Default is "elise123" for development - CHANGE THIS IN PRODUCTION
CRM_PASSWORD = os.getenv("CRM_PASSWORD", "elise123")


def verify_password(password: str) -> bool:
    """
    Verify if the provided password matches the CRM password.
    Uses constant-time comparison to prevent timing attacks.
    """
    return secrets.compare_digest(password, CRM_PASSWORD)


def generate_session_token() -> str:
    """
    Generate a secure random session token.
    """
    return secrets.token_urlsafe(32)


# Simple in-memory session storage
# In production, you might want to use Redis or database storage
active_sessions: set = set()


def create_session() -> str:
    """Create a new session and return the token"""
    token = generate_session_token()
    active_sessions.add(token)
    return token


def validate_session(token: str) -> bool:
    """Check if a session token is valid"""
    return token in active_sessions


def invalidate_session(token: str) -> bool:
    """Remove a session token (logout)"""
    if token in active_sessions:
        active_sessions.remove(token)
        return True
    return False
