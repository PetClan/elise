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

document.addEventListener('DOMContentLoaded', function () {
    if (authToken) {
        checkAuth();
    } else {
        showLoginScreen();
    }
    setupEventListeners();
});

function setupEventListeners() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    const logoutBtn = document.getElementById('logoutBtn');
    const mobileLogout = document.getElementById('mobileLogout');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (mobileLogout) mobileLogout.addEventListener('click', handleLogout);

    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            navigateToSection(this.dataset.section);
        });
    });

    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function () {
            document.querySelector('.sidebar').classList.toggle('active');
        });
    }

    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.addEventListener('click', function () {
            document.querySelector('.sidebar').classList.remove('active');
        });
    }

    const contactForm = document.getElementById('contactForm');
    const callbackForm = document.getElementById('callbackForm');
    const bookingForm = document.getElementById('bookingForm');

    if (contactForm) contactForm.addEventListener('submit', handleContactSubmit);
    if (callbackForm) callbackForm.addEventListener('submit', handleCallbackSubmit);
    if (bookingForm) bookingForm.addEventListener('submit', handleBookingSubmit);

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentCallbackTab = this.dataset.tab;
            loadCallbacks();
        });
    });

    const bookingStatusFilter = document.getElementById('bookingStatusFilter');
    if (bookingStatusFilter) bookingStatusFilter.addEventListener('change', loadBookings);

    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', confirmDelete);

    initCalendar();
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
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const navItem = document.querySelector(`.nav-item[data-section="${section}"]`);
    if (navItem) navItem.classList.add('active');

    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    const sectionEl = document.getElementById(section);
    if (sectionEl) sectionEl.classList.add('active');

    document.querySelector('.sidebar').classList.remove('active');

    switch (section) {
        case 'dashboard': loadDashboard(); break;
        case 'calendar': loadCalendar(); break;
        case 'contacts': loadContacts(); break;
        case 'callbacks': loadCallbacks(); break;
        case 'bookings': loadBookings(); break;
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

function renderContactsTable(filteredContacts = null) {
    const tbody = document.getElementById('contactsTable');
    const displayContacts = filteredContacts || contacts;

    if (displayContacts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <p>${filteredContacts ? 'No contacts match your search.' : 'No contacts yet. Add your first contact!'}</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = displayContacts.map(contact => `
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

function filterContacts() {
    const searchTerm = document.getElementById('contactSearch').value.toLowerCase();
    if (!searchTerm) {
        renderContactsTable();
        return;
    }
    const filtered = contacts.filter(contact =>
        contact.care_home_name.toLowerCase().includes(searchTerm) ||
        (contact.contact_person && contact.contact_person.toLowerCase().includes(searchTerm)) ||
        (contact.telephone && contact.telephone.includes(searchTerm)) ||
        (contact.email && contact.email.toLowerCase().includes(searchTerm))
    );
    renderContactsTable(filtered);
}

function populateContactDropdowns() {
    const dropdowns = ['callbackContact', 'bookingContact'];
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
        email: document.getElementById('contactEmail').value,
        address: document.getElementById('contactAddress').value,
        postcode: document.getElementById('contactPostcode').value
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
    document.getElementById('contactAddress').value = contact.address || '';
    document.getElementById('contactPostcode').value = contact.postcode || '';

    document.getElementById('contactModal').classList.add('active');
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

function editCallback(id) {
    fetch(`${API_URL}/callbacks/${id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    })
        .then(response => response.json())
        .then(cb => {
            document.getElementById('callbackModalTitle').textContent = 'Edit Callback';
            document.getElementById('callbackId').value = cb.id;
            document.getElementById('callbackContact').value = cb.contact_id;
            document.getElementById('callbackType').value = cb.callback_type;
            document.getElementById('originalCallDateTime').value = formatDateTimeForInput(cb.original_call_datetime);
            document.getElementById('callbackDateTime').value = formatDateTimeForInput(cb.callback_datetime);
            document.getElementById('callbackNotes').value = cb.notes || '';
            document.getElementById('callbackModal').classList.add('active');
        })
        .catch(error => console.error('Error loading callback:', error));
}

// ========================================
// BOOKINGS
// ========================================

async function loadBookings() {
    const statusFilter = document.getElementById('bookingStatusFilter');
    const status = statusFilter ? statusFilter.value : '';
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
            <td>${formatDateTime(booking.booking_from)} - ${formatDateTime(booking.booking_to)}</td>
            <td>${escapeHtml(booking.contact?.care_home_name || 'Unknown')}</td>
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
        contact_id: parseInt(document.getElementById('bookingContact').value),
        booking_from: document.getElementById('bookingFrom').value,
        booking_to: document.getElementById('bookingTo').value,
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
            loadCalendar();
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

function editBooking(id) {
    fetch(`${API_URL}/bookings/${id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    })
        .then(response => response.json())
        .then(booking => {
            document.getElementById('bookingModalTitle').textContent = 'Edit Booking';
            document.getElementById('bookingId').value = booking.id;
            document.getElementById('bookingContact').value = booking.contact_id;
            document.getElementById('bookingFrom').value = formatDateTimeForInput(booking.booking_from);
            document.getElementById('bookingTo').value = formatDateTimeForInput(booking.booking_to);
            document.getElementById('bookingType').value = booking.booking_type || '';
            document.getElementById('feeAgreed').value = booking.fee_agreed || '';
            document.getElementById('feeStatus').value = booking.fee_status;
            document.getElementById('bookingModal').classList.add('active');
        })
        .catch(error => console.error('Error loading booking:', error));
}

// ========================================
// DELETE FUNCTIONALITY
// ========================================

function deleteItem(type, id) {
    deleteTarget = { type, id };
    document.getElementById('deleteModal').classList.add('active');
}

async function confirmDelete() {
    const { type, id } = deleteTarget;
    let endpoint;

    switch (type) {
        case 'contact': endpoint = `${API_URL}/contacts/${id}`; break;
        case 'callback': endpoint = `${API_URL}/callbacks/${id}`; break;
        case 'booking': endpoint = `${API_URL}/bookings/${id}`; break;
    }

    try {
        const response = await fetch(endpoint, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            closeModal('deleteModal');
            showToast('Item deleted!', 'success');
            switch (type) {
                case 'contact': loadContacts(); break;
                case 'callback': loadCallbacks(); break;
                case 'booking': loadBookings(); loadCalendar(); break;
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
    if (modalId === 'contactModal') {
        document.getElementById('contactModalTitle').textContent = 'Add Contact';
        document.getElementById('contactId').value = '';
        document.getElementById('careHomeName').value = '';
        document.getElementById('contactPerson').value = '';
        document.getElementById('telephone').value = '';
        document.getElementById('contactEmail').value = '';
        document.getElementById('contactAddress').value = '';
        document.getElementById('contactPostcode').value = '';
    } else if (modalId === 'callbackModal') {
        document.getElementById('callbackModalTitle').textContent = 'Add Callback';
        document.getElementById('callbackId').value = '';
        document.getElementById('callbackContact').value = '';
        document.getElementById('callbackType').value = 'Awaiting Callback';
        document.getElementById('originalCallDateTime').value = formatDateTimeForInput(new Date().toISOString());
        document.getElementById('callbackDateTime').value = formatDateTimeForInput(new Date().toISOString());
        document.getElementById('callbackNotes').value = '';
    } else if (modalId === 'bookingModal') {
        document.getElementById('bookingModalTitle').textContent = 'Add Booking';
        document.getElementById('bookingId').value = '';
        document.getElementById('bookingContact').value = '';
        document.getElementById('bookingFrom').value = formatDateTimeForInput(new Date().toISOString());
        document.getElementById('bookingTo').value = formatDateTimeForInput(new Date().toISOString());
        document.getElementById('bookingType').value = '';
        document.getElementById('feeAgreed').value = '';
        document.getElementById('feeStatus').value = 'Unpaid';
    }
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

document.addEventListener('click', function (e) {
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
    setTimeout(() => toast.remove(), 3000);
}

// ========================================
// CALENDAR
// ========================================

let currentCalendarDate = new Date();
let calendarBookings = [];

function initCalendar() {
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
            renderCalendar();
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
            renderCalendar();
        });
    }
}

async function loadCalendar() {
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

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    const currentMonthEl = document.getElementById('currentMonth');
    if (currentMonthEl) {
        currentMonthEl.textContent = `${monthNames[month]} ${year}`;
    }

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const calendarBody = document.getElementById('calendarBody');
    if (!calendarBody) return;

    let html = '';
    let day = 1;

    for (let row = 0; row < 6; row++) {
        html += '<tr>';
        for (let col = 0; col < 7; col++) {
            if (row === 0 && col < startingDay) {
                html += '<td class="calendar-day empty"></td>';
            } else if (day > totalDays) {
                html += '<td class="calendar-day empty"></td>';
            } else {
                const date = new Date(year, month, day);
                const isToday = isSameDay(date, new Date());
                const dayBookings = calendarBookings.filter(b => {
                    const bookingDate = new Date(b.booking_from);
                    return isSameDay(bookingDate, date);
                });
                const hasBooking = dayBookings.length > 0;

                html += `<td class="calendar-day${isToday ? ' today' : ''}${hasBooking ? ' has-booking' : ''}">`;
                html += `<span class="day-number">${day}</span>`;

                if (hasBooking) {
                    html += '<div class="day-bookings">';
                    dayBookings.forEach(booking => {
                        const time = new Date(booking.booking_from).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        html += `<div class="calendar-booking" onclick="showBookingDetails(${booking.id})">
                            <span class="booking-time">${time}</span>
                            <span class="booking-venue">${escapeHtml(booking.contact?.care_home_name || '')}</span>
                        </div>`;
                    });
                    html += '</div>';
                }
                html += '</td>';
                day++;
            }
        }
        html += '</tr>';
        if (day > totalDays) break;
    }
    calendarBody.innerHTML = html;
}

function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate();
}

function showBookingDetails(bookingId) {
    fetch(`${API_URL}/bookings/${bookingId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    })
        .then(response => response.json())
        .then(booking => {
            const content = document.getElementById('bookingDetailsContent');
            content.innerHTML = `
            <div class="booking-details">
                <p><strong>Care Home:</strong> ${escapeHtml(booking.contact?.care_home_name || 'Unknown')}</p>
                <p><strong>From:</strong> ${formatDateTime(booking.booking_from)}</p>
                <p><strong>To:</strong> ${formatDateTime(booking.booking_to)}</p>
                <p><strong>Type:</strong> ${escapeHtml(booking.booking_type || 'Not specified')}</p>
                <p><strong>Fee Agreed:</strong> £${booking.fee_agreed ? parseFloat(booking.fee_agreed).toFixed(2) : '0.00'}</p>
                <p><strong>Status:</strong> <span class="status-badge status-${booking.fee_status.toLowerCase()}">${booking.fee_status}</span></p>
            </div>
        `;

            document.getElementById('editBookingBtn').onclick = () => {
                closeModal('bookingDetailsModal');
                editBooking(bookingId);
            };

            document.getElementById('bookingDetailsModal').classList.add('active');
        })
        .catch(error => console.error('Error loading booking details:', error));
}