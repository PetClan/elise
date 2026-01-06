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

function navigateToCallbacks(tab) {
    // Set the tab before navigating
    currentCallbackTab = tab;

    // Update tab button states
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        }
    });

    // Navigate to callbacks section
    navigateToSection('callbacks');
}

function navigateToBookings(status) {
    // Set the filter before navigating
    const statusFilter = document.getElementById('bookingStatusFilter');
    if (statusFilter) {
        statusFilter.value = status;
    }

    // Navigate to bookings section
    navigateToSection('bookings');
}

function navigateToCallbacks(tab) {
    // Set the tab before navigating
    currentCallbackTab = tab;

    // Update tab button states
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        }
    });

    // Navigate to callbacks section
    navigateToSection('callbacks');
}

function navigateToBookings(status) {
    // Set the filter before navigating
    const statusFilter = document.getElementById('bookingStatusFilter');
    if (statusFilter) {
        statusFilter.value = status;
    }

    // Navigate to bookings section
    navigateToSection('bookings');
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
            <td data-label="Care Home">${escapeHtml(contact.care_home_name)}</td>
            <td data-label="Contact Person">${escapeHtml(contact.contact_person || '-')}</td>
            <td data-label="Telephone">${contact.telephone ? `<a href="tel:${contact.telephone}" class="phone-link">${escapeHtml(contact.telephone)}</a>` : '-'}</td>
            <td data-label="Email">${escapeHtml(contact.email || '-')}</td>
            <td class="actions">
                <button class="btn btn-small btn-view" onclick="viewContact(${contact.id})">View</button>
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
        postcode: document.getElementById('contactPostcode').value,
        website: document.getElementById('contactWebsite').value
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
function viewContact(id) {
    const contact = contacts.find(c => c.id === id);
    if (!contact) return;

    const content = document.getElementById('contactDetailsContent');
    content.innerHTML = `
        <div class="contact-details">
            <p><strong>Care Home:</strong> ${escapeHtml(contact.care_home_name)}</p>
            <p><strong>Contact Person:</strong> ${escapeHtml(contact.contact_person || '-')}</p>
            <p><strong>Telephone:</strong> ${contact.telephone ? `<a href="tel:${contact.telephone}" class="phone-link">${escapeHtml(contact.telephone)}</a>` : '-'}</p>
            <p><strong>Email:</strong> ${contact.email ? `<a href="mailto:${contact.email}">${escapeHtml(contact.email)}</a>` : '-'}</p>
            <p><strong>Address:</strong> ${escapeHtml(contact.address || '-')}</p>
            <p><strong>Postcode:</strong> ${escapeHtml(contact.postcode || '-')}</p>
            <p><strong>Website:</strong> ${contact.website ? `<a href="${contact.website}" target="_blank">${escapeHtml(contact.website)}</a>` : '-'}</p>
        </div>
    `;

    document.getElementById('editContactBtn').onclick = () => {
        closeModal('contactDetailsModal');
        editContact(id);
    };

    document.getElementById('contactDetailsModal').classList.add('active');
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
    document.getElementById('contactWebsite').value = contact.website || '';

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
                <button class="btn btn-small btn-invoice" onclick="generateInvoice(${booking.id})">Invoice</button>
                <button class="btn btn-small btn-edit" onclick="editBooking(${booking.id})">Edit</button>
                <button class="btn btn-small btn-delete" onclick="deleteItem('booking', ${booking.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function handleBookingSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('bookingId').value;

    // Combine date and time fields
    const bookingDate = document.getElementById('bookingDate').value;
    const fromHour = document.getElementById('bookingFromHour').value;
    const fromMinute = document.getElementById('bookingFromMinute').value;
    const toHour = document.getElementById('bookingToHour').value;
    const toMinute = document.getElementById('bookingToMinute').value;

    const booking_from = `${bookingDate}T${fromHour}:${fromMinute}`;
    const booking_to = `${bookingDate}T${toHour}:${toMinute}`;

    const data = {
        contact_id: parseInt(document.getElementById('bookingContact').value),
        booking_from: booking_from,
        booking_to: booking_to,
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
            // Parse the datetime values
            const fromDate = new Date(booking.booking_from);
            const toDate = new Date(booking.booking_to);

            // Format date as YYYY-MM-DD
            const dateStr = fromDate.toISOString().slice(0, 10);

            // Get hours and minutes with leading zeros
            const fromHour = String(fromDate.getHours()).padStart(2, '0');
            const fromMinute = String(fromDate.getMinutes()).padStart(2, '0');
            const toHour = String(toDate.getHours()).padStart(2, '0');
            const toMinute = String(toDate.getMinutes()).padStart(2, '0');

            document.getElementById('bookingModalTitle').textContent = 'Edit Booking';
            document.getElementById('bookingId').value = booking.id;
            document.getElementById('bookingContact').value = booking.contact_id;
            document.getElementById('bookingDate').value = dateStr;
            document.getElementById('bookingFromHour').value = fromHour;
            document.getElementById('bookingFromMinute').value = fromMinute;
            document.getElementById('bookingToHour').value = toHour;
            document.getElementById('bookingToMinute').value = toMinute;
            document.getElementById('bookingType').value = booking.booking_type || '';
            document.getElementById('bookingMoreInfo').value = booking.more_info || '';
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
        document.getElementById('contactWebsite').value = '';
    } else if (modalId === 'callbackModal') {
        document.getElementById('callbackModalTitle').textContent = 'Add Callback';
        document.getElementById('callbackId').value = '';
        document.getElementById('callbackContact').value = '';
        document.getElementById('callbackType').value = 'Awaiting Callback';
        document.getElementById('originalCallDateTime').value = formatDateTimeForInput(new Date().toISOString());
        document.getElementById('callbackDateTime').value = formatDateTimeForInput(new Date().toISOString());
        document.getElementById('callbackNotes').value = '';
    } else if (modalId === 'bookingModal') {
        // Hard-reset the form so no old data stays behind
        const bookingForm = document.getElementById('bookingForm');
        if (bookingForm) bookingForm.reset();

        // Set correct defaults for a NEW booking
        document.getElementById('bookingModalTitle').textContent = 'Add Booking';
        document.getElementById('bookingId').value = '';
        document.getElementById('bookingContact').value = '';
        // Set default date to today
        const today = new Date().toISOString().slice(0, 10);
        document.getElementById('bookingDate').value = today;
        document.getElementById('bookingFromHour').value = '14';
        document.getElementById('bookingFromMinute').value = '00';
        document.getElementById('bookingToHour').value = '15';
        document.getElementById('bookingToMinute').value = '00';
        document.getElementById('bookingType').value = '';
        document.getElementById('bookingMoreInfo').value = '';
        document.getElementById('feeAgreed').value = '';
        document.getElementById('feeStatus').value = 'Unpaid';
    }

    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Close modal when clicking outside
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

// ========================================
// CSV EXPORT FUNCTIONS
// ========================================

function exportContactsCSV() {
    if (contacts.length === 0) {
        showToast('No contacts to export', 'error');
        return;
    }

    const headers = ['Care Home', 'Contact Person', 'Telephone', 'Email', 'Address', 'Postcode', 'Website'];
    const rows = contacts.map(c => [
        c.care_home_name || '',
        c.contact_person || '',
        c.telephone || '',
        c.email || '',
        c.address || '',
        c.postcode || '',
        c.website || ''
    ]);

    downloadCSV(headers, rows, 'contacts_export.csv');
    showToast('Contacts exported successfully!', 'success');
}

async function exportBookingsCSV() {
    try {
        const response = await fetch(`${API_URL}/bookings`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!response.ok) {
            showToast('Failed to load bookings', 'error');
            return;
        }
        const bookings = await response.json();

        if (bookings.length === 0) {
            showToast('No bookings to export', 'error');
            return;
        }

        const headers = ['Date From', 'Date To', 'Care Home', 'Type', 'Fee Agreed', 'Fee Status'];
        const rows = bookings.map(b => [
            formatDateTime(b.booking_from),
            formatDateTime(b.booking_to),
            b.contact?.care_home_name || '',
            b.booking_type || '',
            b.fee_agreed ? `£${parseFloat(b.fee_agreed).toFixed(2)}` : '',
            b.fee_status || ''
        ]);

        downloadCSV(headers, rows, 'bookings_export.csv');
        showToast('Bookings exported successfully!', 'success');
    } catch (error) {
        console.error('Export failed:', error);
        showToast('Failed to export bookings', 'error');
    }
}

function downloadCSV(headers, rows, filename) {
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}

// ========================================
// INVOICE GENERATION
// ========================================

async function generateInvoice(bookingId) {
    try {
        const response = await fetch(`${API_URL}/bookings/${bookingId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!response.ok) {
            showToast('Failed to load booking details', 'error');
            return;
        }
        const booking = await response.json();

        const invoiceNumber = `INV-${new Date().getFullYear()}-${String(bookingId).padStart(4, '0')}`;
        const invoiceDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
        const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

        const bookingDate = new Date(booking.booking_from).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
        const bookingTimeFrom = new Date(booking.booking_from).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const bookingTimeTo = new Date(booking.booking_to).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

        const fee = booking.fee_agreed ? parseFloat(booking.fee_agreed).toFixed(2) : '0.00';

        const invoiceHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoiceNumber}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333; padding: 40px; max-width: 800px; margin: 0 auto; }
        .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #e91e63; }
        .business-info h1 { font-size: 24px; color: #e91e63; margin-bottom: 5px; }
        .business-info p { color: #666; font-size: 13px; }
        .invoice-title { text-align: right; }
        .invoice-title h2 { font-size: 32px; color: #333; margin-bottom: 5px; }
        .invoice-title p { color: #666; }
        .invoice-details { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .bill-to, .invoice-info { width: 48%; }
        .bill-to h3, .invoice-info h3 { font-size: 12px; text-transform: uppercase; color: #999; margin-bottom: 10px; letter-spacing: 1px; }
        .bill-to p, .invoice-info p { margin-bottom: 3px; }
        .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .invoice-table th { background: #f8f8f8; padding: 12px 15px; text-align: left; font-weight: 600; border-bottom: 2px solid #e91e63; }
        .invoice-table td { padding: 15px; border-bottom: 1px solid #eee; }
        .invoice-table .amount { text-align: right; }
        .totals { margin-left: auto; width: 300px; }
        .totals .row { display: flex; justify-content: space-between; padding: 8px 0; }
        .totals .total { font-size: 18px; font-weight: 700; border-top: 2px solid #333; padding-top: 10px; margin-top: 5px; }
        .payment-info { margin-top: 40px; padding: 20px; background: #f9f9f9; border-radius: 8px; }
        .payment-info h3 { font-size: 14px; margin-bottom: 15px; color: #333; }
        .payment-info p { margin-bottom: 5px; font-size: 13px; }
        .payment-info .bank-details { margin-top: 10px; }
        .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
        .btn-container { margin-bottom: 20px; text-align: center; }
        .btn { padding: 10px 25px; font-size: 14px; cursor: pointer; border: none; border-radius: 5px; margin: 0 5px; }
        .btn-print { background: #e91e63; color: white; }
        .btn-download { background: #333; color: white; }
        @media print { .btn-container { display: none; } body { padding: 20px; } }
    </style>
</head>
<body>
    <div class="btn-container">
        <button class="btn btn-print" onclick="window.print()">Print Invoice</button>
        <button class="btn btn-download" onclick="window.print()">Save as PDF</button>
    </div>
    
    <div class="invoice-header">
        <div class="business-info">
            <h1>Elise Care Home Entertainment</h1>
            <p>Mosswater Wynd, Cumbernauld</p>
            <p>07513 049520</p>
            <p>elisethecarehomesinger@gmail.com</p>
        </div>
        <div class="invoice-title">
            <h2>INVOICE</h2>
            <p>${invoiceNumber}</p>
        </div>
    </div>
    
    <div class="invoice-details">
        <div class="bill-to">
            <h3>Bill To</h3>
            <p><strong>${booking.contact?.care_home_name || 'Unknown'}</strong></p>
            <p>${booking.contact?.address || ''}</p>
            <p>${booking.contact?.postcode || ''}</p>
            <p>${booking.contact?.email || ''}</p>
            <p>${booking.contact?.telephone || ''}</p>
        </div>
        <div class="invoice-info">
            <h3>Invoice Details</h3>
            <p><strong>Invoice Date:</strong> ${invoiceDate}</p>
            <p><strong>Due Date:</strong> ${dueDate}</p>
            <p><strong>Performance Date:</strong> ${bookingDate}</p>
        </div>
    </div>
    
    <table class="invoice-table">
        <thead>
            <tr>
                <th>Description</th>
                <th>Date</th>
                <th>Time</th>
                <th class="amount">Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>
                    <strong>Live Entertainment Performance</strong><br>
                    ${booking.booking_type || 'Musical Entertainment'}
                </td>
                <td>${bookingDate}</td>
                <td>${bookingTimeFrom} - ${bookingTimeTo}</td>
                <td class="amount">£${fee}</td>
            </tr>
        </tbody>
    </table>
    
    <div class="totals">
        <div class="row">
            <span>Subtotal:</span>
            <span>£${fee}</span>
        </div>
        <div class="row total">
            <span>Total Due:</span>
            <span>£${fee}</span>
        </div>
    </div>
    
    <div class="payment-info">
        <h3>Payment Information</h3>
        <p><strong>Payment Terms:</strong> 7 days from date of invoice</p>
        <div class="bank-details">
            <p><strong>Bank:</strong> Bank of Scotland</p>
            <p><strong>Account Name:</strong> Elise Fitzsimons</p>
            <p><strong>Sort Code:</strong> 80-45-87</p>
            <p><strong>Account Number:</strong> 13889463</p>
        </div>
    </div>
    
    <div class="footer">
        <p>Thank you for your business!</p>
        <p>Elise Care Home Entertainment | 07516 049520 | elisethecarehomesinger@gmail.com</p>
    </div>
</body>
</html>
        `;

        const invoiceWindow = window.open('', '_blank');
        invoiceWindow.document.write(invoiceHTML);
        invoiceWindow.document.close();

    } catch (error) {
        console.error('Invoice generation failed:', error);
        showToast('Failed to generate invoice', 'error');
    }
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

            document.getElementById('invoiceBookingBtn').onclick = () => {
                closeModal('bookingDetailsModal');
                generateInvoice(bookingId);
            };

            document.getElementById('bookingDetailsModal').classList.add('active');
        })
        .catch(error => console.error('Error loading booking details:', error));
}
