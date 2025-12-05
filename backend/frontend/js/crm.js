// ========================================
// CRM APPLICATION - CRM.JS
// ========================================

// API Base URL
const API_URL = '/api';

// State
let authToken = localStorage.getItem('crm_token');
let contacts = [];
let currentCallbackTab = 'awaiting';
let deleteTarget = { type: null, id: null };

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    // Check if already logged in
    if (authToken) {
        checkAuth();
    } else {
        showLoginScreen();
    }

    // Setup event listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Initialize calendar
    initCalendar();

    // Logout buttons
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('mobileLogout').addEventListener('click', handleLogout);

    // Navigation
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            navigateToSection(section);
        });
    });

    // Mobile menu toggle
    document.getElementById('menuToggle').addEventListener('click', function() {
        document.querySelector('.sidebar').classList.toggle('active');
    });

    // Close sidebar when clicking outside on mobile
    document.querySelector('.main-content').addEventListener('click', function() {
        document.querySelector('.sidebar').classList.remove('active');
    });

    // Forms
    document.getElementById('contactForm').addEventListener('submit', handleContactSubmit);
    document.getElementById('callLogForm').addEventListener('submit', handleCallLogSubmit);
    document.getElementById('callbackForm').addEventListener('submit', handleCallbackSubmit);
    document.getElementById('bookingForm').addEventListener('submit', handleBookingSubmit);

    // Callback tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentCallbackTab = this.dataset.tab;
            loadCallbacks();
        });
    });

    // Booking status filter
    document.getElementById('bookingStatusFilter').addEventListener('change', loadBookings);

    // Delete confirmation
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
}

// ========================================
// AUTHENTICATION
// ========================================

function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('crmApp').style.display = 'none';
}

function showCRM() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('crmApp').style.display = 'flex';
    loadDashboard();
    loadContacts();
}

async function checkAuth() {
    try {
        const response = await fetch(`${API_URL}/auth/check`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (response.ok) {
            showCRM();
        } else {
            authToken = null;
            localStorage.removeItem('crm_token');
            showLoginScreen();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        showLoginScreen();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('loginError');

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        if (response.ok) {
            const data = await response.json();
            authToken = data.token;
            localStorage.setItem('crm_token', authToken);
            errorEl.textContent = '';
            showCRM();
        } else {
            errorEl.textContent = 'Incorrect password. Please try again.';
        }
    } catch (error) {
        console.error('Login failed:', error);
        errorEl.textContent = 'Login failed. Please try again.';
    }
}

async function handleLogout(e) {
    e.preventDefault();
    try {
        await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    authToken = null;
    localStorage.removeItem('crm_token');
    showLoginScreen();
    document.getElementById('password').value = '';
}

// ========================================
// NAVIGATION
// ========================================

function navigateToSection(section) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`.nav-item[data-section="${section}"]`).classList.add('active');

    // Update content
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });
    document.getElementById(section).classList.add('active');

    // Close mobile menu
    document.querySelector('.sidebar').classList.remove('active');

    // Load data for section
    switch (section) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'calendar':
            loadCalendar();
            break;
        case 'contacts':
            loadContacts();
            break;
        case 'call-log':
            loadCallLogs();
            break;
        case 'callbacks':
            loadCallbacks();
            break;
        case 'bookings':
            loadBookings();
            break;
    }
}

// ========================================
// DASHBOARD
// ========================================

async function loadDashboard() {
    try {
        const response = await fetch(`${API_URL}/dashboard/stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const stats = await response.json();
            document.getElementById('statContacts').textContent = stats.total_contacts;
            document.getElementById('statUpcoming').textContent = stats.upcoming_bookings;
            document.getElementById('statAwaitingCallback').textContent = stats.awaiting_callbacks;
            document.getElementById('statToCallBack').textContent = stats.to_call_back;
            document.getElementById('statUnpaid').textContent = stats.unpaid_bookings;
            document.getElementById('statInvoiced').textContent = stats.invoiced_bookings;
        }
    } catch (error) {
        console.error('Failed to load dashboard:', error);
    }
}

// ========================================
// CONTACTS
// ========================================

async function loadContacts() {
    try {
        const response = await fetch(`${API_URL}/contacts`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            contacts = await response.json();
            renderContactsTable();
            populateContactDropdowns();
        }
    } catch (error) {
        console.error('Failed to load contacts:', error);
    }
}

function renderContactsTable() {
    const tbody = document.getElementById('contactsTable');
    
    if (contacts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <p>No contacts yet. Add your first contact!</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = contacts.map(contact => `
        <tr>
            <td>${escapeHtml(contact.care_home_name)}</td>
            <td>${escapeHtml(contact.contact_person || '-')}</td>
            <td>${escapeHtml(contact.telephone || '-')}</td>
            <td>${escapeHtml(contact.email || '-')}</td>
            <td class="actions">
                <button class="btn btn-small btn-edit" onclick="editContact(${contact.id})">Edit</button>
                <button class="btn btn-small btn-delete" onclick="deleteItem('contact', ${contact.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function populateContactDropdowns() {
    const dropdowns = ['callContact', 'callbackContact'];
    const optionsHtml = `
        <option value="">Select a contact</option>
        ${contacts.map(c => `<option value="${c.id}">${escapeHtml(c.care_home_name)}</option>`).join('')}
    `;
    
    dropdowns.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = optionsHtml;
    });
}

async function handleContactSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('contactId').value;
    const data = {
        care_home_name: document.getElementById('careHomeName').value,
        contact_person: document.getElementById('contactPerson').value,
        telephone: document.getElementById('telephone').value,
        email: document.getElementById('contactEmail').value
    };

    try {
        const url = id ? `${API_URL}/contacts/${id}` : `${API_URL}/contacts`;
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeModal('contactModal');
            loadContacts();
            loadDashboard();
            showToast(id ? 'Contact updated!' : 'Contact added!', 'success');
        } else {
            showToast('Failed to save contact', 'error');
        }
    } catch (error) {
        console.error('Error saving contact:', error);
        showToast('Failed to save contact', 'error');
    }
}

function editContact(id) {
    const contact = contacts.find(c => c.id === id);
    if (!contact) return;

    document.getElementById('contactModalTitle').textContent = 'Edit Contact';
    document.getElementById('contactId').value = contact.id;
    document.getElementById('careHomeName').value = contact.care_home_name;
    document.getElementById('contactPerson').value = contact.contact_person || '';
    document.getElementById('telephone').value = contact.telephone || '';
    document.getElementById('contactEmail').value = contact.email || '';

    openModal('contactModal');
}

// ========================================
// CALL LOGS
// ========================================

async function loadCallLogs() {
    try {
        const response = await fetch(`${API_URL}/call-logs`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const logs = await response.json();
            renderCallLogsTable(logs);
        }
    } catch (error) {
        console.error('Failed to load call logs:', error);
    }
}

function renderCallLogsTable(logs) {
    const tbody = document.getElementById('callLogTable');
    
    if (logs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    <div class="empty-state-icon">📞</div>
                    <p>No calls logged yet.</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = logs.map(log => `
        <tr>
            <td>${formatDateTime(log.call_datetime)}</td>
            <td>${escapeHtml(log.contact?.care_home_name || 'Unknown')}</td>
            <td>${escapeHtml(log.notes || '-')}</td>
            <td class="actions">
                <button class="btn btn-small btn-edit" onclick="editCallLog(${log.id})">Edit</button>
                <button class="btn btn-small btn-delete" onclick="deleteItem('call-log', ${log.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function handleCallLogSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('callLogId').value;
    const data = {
        contact_id: parseInt(document.getElementById('callContact').value),
        call_datetime: document.getElementById('callDateTime').value,
        notes: document.getElementById('callNotes').value
    };

    try {
        const url = id ? `${API_URL}/call-logs/${id}` : `${API_URL}/call-logs`;
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeModal('callLogModal');
            loadCallLogs();
            showToast(id ? 'Call log updated!' : 'Call logged!', 'success');
        } else {
            showToast('Failed to save call log', 'error');
        }
    } catch (error) {
        console.error('Error saving call log:', error);
        showToast('Failed to save call log', 'error');
    }
}

async function editCallLog(id) {
    try {
        const response = await fetch(`${API_URL}/call-logs/${id}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const log = await response.json();
            document.getElementById('callLogModalTitle').textContent = 'Edit Call';
            document.getElementById('callLogId').value = log.id;
            document.getElementById('callContact').value = log.contact_id;
            document.getElementById('callDateTime').value = formatDateTimeForInput(log.call_datetime);
            document.getElementById('callNotes').value = log.notes || '';
            openModal('callLogModal');
        }
    } catch (error) {
        console.error('Error loading call log:', error);
    }
}

// ========================================
// CALLBACKS
// ========================================

async function loadCallbacks() {
    const type = currentCallbackTab === 'awaiting' ? 'Awaiting Callback' : 'To Call Back';
    
    try {
        const response = await fetch(`${API_URL}/callbacks?callback_type=${encodeURIComponent(type)}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const callbacks = await response.json();
            renderCallbacksTable(callbacks);
        }
    } catch (error) {
        console.error('Failed to load callbacks:', error);
    }
}

function renderCallbacksTable(callbacks) {
    const tbody = document.getElementById('callbacksTable');
    
    if (callbacks.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <div class="empty-state-icon">🔔</div>
                    <p>No callbacks in this category.</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = callbacks.map(cb => `
        <tr>
            <td>${escapeHtml(cb.contact?.care_home_name || 'Unknown')}</td>
            <td>${formatDateTime(cb.original_call_datetime)}</td>
            <td>${formatDateTime(cb.callback_datetime)}</td>
            <td>${escapeHtml(cb.notes || '-')}</td>
            <td class="actions">
                <button class="btn btn-small btn-edit" onclick="editCallback(${cb.id})">Edit</button>
                <button class="btn btn-small btn-delete" onclick="deleteItem('callback', ${cb.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function handleCallbackSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('callbackId').value;
    const data = {
        contact_id: parseInt(document.getElementById('callbackContact').value),
        callback_type: document.getElementById('callbackType').value,
        original_call_datetime: document.getElementById('originalCallDateTime').value,
        callback_datetime: document.getElementById('callbackDateTime').value,
        notes: document.getElementById('callbackNotes').value
    };

    try {
        const url = id ? `${API_URL}/callbacks/${id}` : `${API_URL}/callbacks`;
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeModal('callbackModal');
            loadCallbacks();
            loadDashboard();
            showToast(id ? 'Callback updated!' : 'Callback added!', 'success');
        } else {
            showToast('Failed to save callback', 'error');
        }
    } catch (error) {
        console.error('Error saving callback:', error);
        showToast('Failed to save callback', 'error');
    }
}

async function editCallback(id) {
    try {
        const response = await fetch(`${API_URL}/callbacks/${id}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const cb = await response.json();
            document.getElementById('callbackModalTitle').textContent = 'Edit Callback';
            document.getElementById('callbackId').value = cb.id;
            document.getElementById('callbackContact').value = cb.contact_id;
            document.getElementById('callbackType').value = cb.callback_type;
            document.getElementById('originalCallDateTime').value = formatDateTimeForInput(cb.original_call_datetime);
            document.getElementById('callbackDateTime').value = formatDateTimeForInput(cb.callback_datetime);
            document.getElementById('callbackNotes').value = cb.notes || '';
            openModal('callbackModal');
        }
    } catch (error) {
        console.error('Error loading callback:', error);
    }
}

// ========================================
// BOOKINGS
// ========================================

async function loadBookings() {
    const status = document.getElementById('bookingStatusFilter').value;
    const url = status ? `${API_URL}/bookings?fee_status=${encodeURIComponent(status)}` : `${API_URL}/bookings`;
    
    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const bookings = await response.json();
            renderBookingsTable(bookings);
        }
    } catch (error) {
        console.error('Failed to load bookings:', error);
    }
}

function renderBookingsTable(bookings) {
    const tbody = document.getElementById('bookingsTable');
    
    if (bookings.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <div class="empty-state-icon">📅</div>
                    <p>No bookings found.</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = bookings.map(booking => `
        <tr>
            <td>${formatDateTime(booking.booking_date)}</td>
            <td>${escapeHtml(booking.venue)}</td>
            <td>${escapeHtml(booking.booking_type || '-')}</td>
            <td>£${booking.fee_agreed ? parseFloat(booking.fee_agreed).toFixed(2) : '0.00'}</td>
            <td><span class="status-badge status-${booking.fee_status.toLowerCase()}">${booking.fee_status}</span></td>
            <td class="actions">
                <button class="btn btn-small btn-edit" onclick="editBooking(${booking.id})">Edit</button>
                <button class="btn btn-small btn-delete" onclick="deleteItem('booking', ${booking.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function handleBookingSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('bookingId').value;
    const data = {
        booking_date: document.getElementById('bookingDateTime').value,
        venue: document.getElementById('bookingVenue').value,
        booking_type: document.getElementById('bookingType').value,
        fee_agreed: parseFloat(document.getElementById('feeAgreed').value) || 0,
        fee_status: document.getElementById('feeStatus').value
    };

    try {
        const url = id ? `${API_URL}/bookings/${id}` : `${API_URL}/bookings`;
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeModal('bookingModal');
            loadBookings();
            loadDashboard();
            showToast(id ? 'Booking updated!' : 'Booking added!', 'success');
        } else {
            showToast('Failed to save booking', 'error');
        }
    } catch (error) {
        console.error('Error saving booking:', error);
        showToast('Failed to save booking', 'error');
    }
}

async function editBooking(id) {
    try {
        const response = await fetch(`${API_URL}/bookings/${id}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const booking = await response.json();
            document.getElementById('bookingModalTitle').textContent = 'Edit Booking';
            document.getElementById('bookingId').value = booking.id;
            document.getElementById('bookingDateTime').value = formatDateTimeForInput(booking.booking_date);
            document.getElementById('bookingVenue').value = booking.venue;
            document.getElementById('bookingType').value = booking.booking_type || '';
            document.getElementById('feeAgreed').value = booking.fee_agreed || '';
            document.getElementById('feeStatus').value = booking.fee_status;
            openModal('bookingModal');
        }
    } catch (error) {
        console.error('Error loading booking:', error);
    }
}

// ========================================
// DELETE FUNCTIONALITY
// ========================================

function deleteItem(type, id) {
    deleteTarget = { type, id };
    openModal('deleteModal');
}

async function confirmDelete() {
    const { type, id } = deleteTarget;
    let endpoint;

    switch(type) {
        case 'contact':
            endpoint = `${API_URL}/contacts/${id}`;
            break;
        case 'call-log':
            endpoint = `${API_URL}/call-logs/${id}`;
            break;
        case 'callback':
            endpoint = `${API_URL}/callbacks/${id}`;
            break;
        case 'booking':
            endpoint = `${API_URL}/bookings/${id}`;
            break;
    }

    try {
        const response = await fetch(endpoint, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            closeModal('deleteModal');
            showToast('Item deleted!', 'success');
            
            // Reload the appropriate data
            switch(type) {
                case 'contact':
                    loadContacts();
                    break;
                case 'call-log':
                    loadCallLogs();
                    break;
                case 'callback':
                    loadCallbacks();
                    break;
                case 'booking':
                    loadBookings();
                    break;
            }
            loadDashboard();
        } else {
            showToast('Failed to delete item', 'error');
        }
    } catch (error) {
        console.error('Error deleting item:', error);
        showToast('Failed to delete item', 'error');
    }

    deleteTarget = { type: null, id: null };
}

// ========================================
// MODAL FUNCTIONS
// ========================================

function openModal(modalId) {
    // Reset form if opening a new item modal
    if (modalId === 'contactModal') {
        document.getElementById('contactModalTitle').textContent = 'Add Contact';
        document.getElementById('contactForm').reset();
        document.getElementById('contactId').value = '';
    } else if (modalId === 'callLogModal') {
        document.getElementById('callLogModalTitle').textContent = 'Add Call';
        document.getElementById('callLogForm').reset();
        document.getElementById('callLogId').value = '';
        // Set default datetime to now
        document.getElementById('callDateTime').value = formatDateTimeForInput(new Date().toISOString());
    } else if (modalId === 'callbackModal') {
        document.getElementById('callbackModalTitle').textContent = 'Add Callback';
        document.getElementById('callbackForm').reset();
        document.getElementById('callbackId').value = '';
        document.getElementById('originalCallDateTime').value = formatDateTimeForInput(new Date().toISOString());
    } else if (modalId === 'bookingModal') {
        document.getElementById('bookingModalTitle').textContent = 'Add Booking';
        document.getElementById('bookingForm').reset();
        document.getElementById('bookingId').value = '';
    }

    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// ========================================
// UTILITY FUNCTIONS
// ========================================

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateTimeForInput(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toISOString().slice(0, 16);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}
// ========================================
// CALENDAR
// ========================================

let currentCalendarDate = new Date();
let calendarBookings = [];

function initCalendar() {
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });
}

async function loadCalendar() {
    // Fetch bookings first
    try {
        const response = await fetch(`${API_URL}/bookings`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            calendarBookings = await response.json();
        }
    } catch (error) {
        console.error('Failed to load bookings for calendar:', error);
    }

    renderCalendar();
}

function renderCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    // Update header
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;

    // Calculate calendar days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    // Build calendar rows
    const calendarBody = document.getElementById('calendarBody');
    let html = '';
    let day = 1;

    // Create 6 rows to cover all possible month layouts
    for (let row = 0; row < 6; row++) {
        html += '<tr>';

        for (let col = 0; col < 7; col++) {
            if (row === 0 && col < startingDay) {
                // Empty cells before first day
                html += '<td class="calendar-day empty"></td>';
            } else if (day > totalDays) {
                // Empty cells after last day
                html += '<td class="calendar-day empty"></td>';
            } else {
                // Actual day
                const date = new Date(year, month, day);
                const isToday = isSameDay(date, new Date());

                // Find bookings for this day
                const dayBookings = calendarBookings.filter(b => {
                    const bookingDate = new Date(b.booking_date);
                    return isSameDay(bookingDate, date);
                });

                const hasBooking = dayBookings.length > 0;

                html += `<td class="calendar-day${isToday ? ' today' : ''}${hasBooking ? ' has-booking' : ''}">`;
                html += `<span class="day-number">${day}</span>`;

                if (hasBooking) {
                    html += '<div class="day-bookings">';
                    dayBookings.forEach(booking => {
                        const time = new Date(booking.booking_date).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        html += `<div class="calendar-booking" onclick="showBookingDetails(${booking.id})">
                            <span class="booking-time">${time}</span>
                            <span class="booking-venue">${escapeHtml(booking.venue)}</span>
                        </div>`;
                    });
                    html += '</div>';
                }

                html += '</td>';
                day++;
            }
        }

        html += '</tr>';

        // Stop if we've placed all days
        if (day > totalDays) break;
    }

    calendarBody.innerHTML = html;
}

function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate();
}

async function showBookingDetails(bookingId) {
    try {
        const response = await fetch(`${API_URL}/bookings/${bookingId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const booking = await response.json();
            const content = document.getElementById('bookingDetailsContent');

            content.innerHTML = `
                <div class="booking-details">
                    <p><strong>Date/Time:</strong> ${formatDateTime(booking.booking_date)}</p>
                    <p><strong>Venue:</strong> ${escapeHtml(booking.venue)}</p>
                    <p><strong>Type:</strong> ${escapeHtml(booking.booking_type || 'Not specified')}</p>
                    <p><strong>Fee Agreed:</strong> £${booking.fee_agreed ? parseFloat(booking.fee_agreed).toFixed(2) : '0.00'}</p>
                    <p><strong>Status:</strong> <span class="status-badge status-${booking.fee_status.toLowerCase()}">${booking.fee_status}</span></p>
                </div>
            `;

            document.getElementById('editBookingBtn').onclick = () => {
                closeModal('bookingDetailsModal');
                editBooking(bookingId);
            };

            openModal('bookingDetailsModal');
        }
    } catch (error) {
        console.error('Error loading booking details:', error);
    }
}
