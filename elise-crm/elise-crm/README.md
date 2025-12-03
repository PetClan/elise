# Elise Care Home Entertainment - CRM

A simple CRM system for managing care home contacts, calls, callbacks, and bookings.

## Features

- **Public Website**: Beautiful landing page for care home owners to learn about Elise's services
- **Password-Protected CRM**: Secure area for managing:
  - **Contacts**: Care home database with contact details
  - **Call Log**: Record of all calls made
  - **Callbacks**: Track "Awaiting Callback" and "To Call Back" items
  - **Bookings**: Manage gigs with venue, type, fees, and payment status
  - **Dashboard**: Overview of key stats and upcoming items

## Tech Stack

- **Backend**: Python 3.11+ with FastAPI
- **Database**: PostgreSQL
- **Frontend**: HTML, CSS, JavaScript
- **Hosting**: Railway

## Project Structure

```
elise-crm/
├── backend/
│   ├── main.py           # FastAPI app & API endpoints
│   ├── database.py       # Database connection
│   ├── models.py         # SQLAlchemy models
│   ├── schemas.py        # Pydantic validation schemas
│   ├── auth.py           # Simple password authentication
│   └── requirements.txt  # Python dependencies
├── frontend/
│   ├── index.html        # Public homepage
│   ├── crm.html          # CRM dashboard
│   ├── css/
│   │   └── styles.css    # All styling
│   └── js/
│       ├── main.js       # Homepage JavaScript
│       └── crm.js        # CRM JavaScript
└── README.md
```

## Local Development Setup

### 1. Prerequisites

- Python 3.11+
- PostgreSQL database
- pip (Python package manager)

### 2. Clone and Setup

```bash
# Navigate to backend folder
cd backend

# Install dependencies
pip install -r requirements.txt
```

### 3. Environment Variables

Create a `.env` file in the backend folder or set these environment variables:

```
DATABASE_URL=postgresql://username:password@localhost:5432/elise_crm
CRM_PASSWORD=your_secure_password_here
```

### 4. Create Database

Create a PostgreSQL database called `elise_crm` (or use your own name and update DATABASE_URL).

### 5. Run the Application

```bash
cd backend
uvicorn main:app --reload
```

The app will be available at `http://localhost:8000`

- Homepage: `http://localhost:8000/`
- CRM: `http://localhost:8000/crm`
- API Docs: `http://localhost:8000/docs`

## Deployment on Railway

### 1. Create Railway Project

1. Go to [Railway](https://railway.app)
2. Create a new project
3. Add a PostgreSQL database to your project

### 2. Configure Environment Variables

In Railway, set these variables:

- `DATABASE_URL`: Railway will auto-populate this when you add PostgreSQL
- `CRM_PASSWORD`: Set a secure password for CRM access

### 3. Deploy

1. Connect your GitHub repository or use Railway CLI
2. Set the root directory to `backend`
3. Railway will auto-detect Python and install dependencies

### 4. Configure Start Command

Set the start command to:
```
uvicorn main:app --host 0.0.0.0 --port $PORT
```

### 5. Update Frontend Paths (if needed)

If you deploy frontend and backend separately, update the `API_URL` in `frontend/js/crm.js` to point to your backend URL.

## Usage

### Public Website

The homepage showcases Elise's services with:
- Hero section
- About section
- Services offered
- Photo gallery (placeholders)
- Testimonials
- Contact information & form

### CRM System

Access the CRM at `/crm` and enter the password.

**Dashboard**: View quick stats including:
- Total contacts
- Upcoming bookings
- Callbacks pending
- Unpaid bookings

**Contacts**: Add/edit/delete care homes with:
- Care home name
- Contact person
- Telephone
- Email

**Call Log**: Record calls with:
- Date/time
- Contact (from contacts list)
- Notes

**Callbacks**: Track callbacks with:
- Contact
- Original call date
- Scheduled callback date
- Type (Awaiting Callback / To Call Back)
- Notes

**Bookings**: Manage gigs with:
- Date/time
- Venue (free text)
- Type of booking (e.g., "Christmas songs", "ABBA night")
- Fee agreed
- Fee status (Unpaid / Invoiced / Paid)

## Customization

### Changing the Password

Update the `CRM_PASSWORD` environment variable. The default for development is `elise123` - **always change this in production!**

### Updating Public Site Content

Edit `frontend/index.html` to update:
- Business name and logo
- About text
- Services
- Testimonials
- Contact information
- Placeholder images (replace with real photos)

### Styling

Modify `frontend/css/styles.css` to change:
- Colors (CSS variables at the top)
- Fonts
- Spacing
- Layout

## API Endpoints

All CRM API endpoints require authentication (Bearer token in Authorization header).

### Authentication
- `POST /api/auth/login` - Login with password
- `POST /api/auth/logout` - Logout
- `GET /api/auth/check` - Check if authenticated

### Contacts
- `GET /api/contacts` - List all contacts
- `GET /api/contacts/{id}` - Get single contact
- `POST /api/contacts` - Create contact
- `PUT /api/contacts/{id}` - Update contact
- `DELETE /api/contacts/{id}` - Delete contact

### Call Logs
- `GET /api/call-logs` - List all call logs
- `GET /api/call-logs/{id}` - Get single call log
- `POST /api/call-logs` - Create call log
- `PUT /api/call-logs/{id}` - Update call log
- `DELETE /api/call-logs/{id}` - Delete call log

### Callbacks
- `GET /api/callbacks` - List callbacks (optional `?callback_type=` filter)
- `GET /api/callbacks/{id}` - Get single callback
- `POST /api/callbacks` - Create callback
- `PUT /api/callbacks/{id}` - Update callback
- `DELETE /api/callbacks/{id}` - Delete callback

### Bookings
- `GET /api/bookings` - List bookings (optional `?fee_status=` filter)
- `GET /api/bookings/{id}` - Get single booking
- `POST /api/bookings` - Create booking
- `PUT /api/bookings/{id}` - Update booking
- `DELETE /api/bookings/{id}` - Delete booking

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## Security Notes

1. **Change the default password** before deploying to production
2. **Use HTTPS** in production (Railway provides this automatically)
3. The simple session-based auth is suitable for single-user; for multi-user, consider JWT tokens
4. Database credentials should never be committed to version control

## Support

For issues or questions, please contact the developer.
