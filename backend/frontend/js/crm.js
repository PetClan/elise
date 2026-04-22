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

// Pagination state
const PAGE_SIZE = 10;
let contactsPage = 1;
let callbacksPage = 1;
let bookingsPage = 1;
let allCallbacks = [];
let allBookings = [];
let filteredContacts = null;
let contactsLetter = null;

// ========================================
// ACTION DROPDOWN
// ========================================

function toggleActionDropdown(event, button) {
    event.stopPropagation();
    const dropdown = button.closest('.action-dropdown');
    const wasOpen = dropdown.classList.contains('open');
    // Close all other open dropdowns
    document.querySelectorAll('.action-dropdown.open').forEach(d => d.classList.remove('open'));
    // Toggle this one
    if (!wasOpen) {
        dropdown.classList.add('open');
    }
}

// Close any open dropdown when clicking anywhere else
document.addEventListener('click', function (e) {
    if (!e.target.closest('.action-dropdown')) {
        document.querySelectorAll('.action-dropdown.open').forEach(d => d.classList.remove('open'));
    }
});

// ========================================
// PAGINATION
// ========================================

function paginate(items, page, pageSize = PAGE_SIZE) {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
}

function renderPagination(containerId, totalItems, currentPage, onPageChange, pageSize = PAGE_SIZE) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const totalPages = Math.ceil(totalItems / pageSize);

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';

    // Previous button
    html += `<button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="${onPageChange}(${currentPage - 1})">&laquo; Prev</button>`;

    // Page numbers with ellipsis logic
    const pages = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        if (currentPage > 3) pages.push('...');
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        if (currentPage < totalPages - 2) pages.push('...');
        pages.push(totalPages);
    }

    pages.forEach(p => {
        if (p === '...') {
            html += `<span class="pagination-ellipsis">...</span>`;
        } else {
            html += `<button class="pagination-btn ${p === currentPage ? 'active' : ''}" onclick="${onPageChange}(${p})">${p}</button>`;
        }
    });

    // Next button
    html += `<button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="${onPageChange}(${currentPage + 1})">Next &raquo;</button>`;

    container.innerHTML = html;
}

function goToContactsPage(page) {
    contactsPage = page;
    renderContactsTable(filteredContacts);
}

function goToContactsLetter(letter) {
    contactsLetter = letter;
    renderContactsTable(filteredContacts);
}

function renderLetterPagination(containerId, items, currentLetter, onLetterChange) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    // Figure out which letters have entries
    const lettersWithItems = new Set(
        items
            .map(it => (it.care_home_name || '').trim().charAt(0).toUpperCase())
            .filter(l => l)
    );

    // Also catch anything starting with a number or symbol
    const hasNonAlpha = items.some(it => {
        const first = (it.care_home_name || '').trim().charAt(0).toUpperCase();
        return first && !letters.includes(first);
    });

    let html = letters.map(letter => {
        const hasItems = lettersWithItems.has(letter);
        const isActive = letter === currentLetter;
        return `<button class="pagination-btn ${isActive ? 'active' : ''}" ${hasItems ? '' : 'disabled'} onclick="${onLetterChange}('${letter}')">${letter}</button>`;
    }).join('');

    if (hasNonAlpha) {
        const isActive = currentLetter === '#';
        html += `<button class="pagination-btn ${isActive ? 'active' : ''}" onclick="${onLetterChange}('#')">#</button>`;
    }

    container.innerHTML = html;
}

function goToCallbacksPage(page) {
    callbacksPage = page;
    renderCallbacksTable(allCallbacks);
}

function goToBookingsPage(page) {
    bookingsPage = page;
    renderBookingsTable(allBookings);
}
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
            callbacksPage = 1;
            loadCallbacks();
        });
    });

    const bookingStatusFilter = document.getElementById('bookingStatusFilter');
    if (bookingStatusFilter) bookingStatusFilter.addEventListener('change', () => {
        bookingsPage = 1;
        loadBookings();
    });

    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', confirmDelete);

    const receiptForm = document.getElementById('receiptForm');
    if (receiptForm) receiptForm.addEventListener('submit', handleReceiptSubmit);

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
    currentCallbackTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        }
    });
    navigateToSection('callbacks');
}

function navigateToBookings(status) {
    const statusFilter = document.getElementById('bookingStatusFilter');
    if (statusFilter) {
        statusFilter.value = status;
    }
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

function renderContactsTable(filtered = null) {
    const tbody = document.getElementById('contactsTable');
    filteredContacts = filtered;
    const displayContacts = (filtered || contacts)
        .slice()
        .sort((a, b) => (a.care_home_name || '').localeCompare(b.care_home_name || ''));

    if (displayContacts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <div class="empty-state-icon">ðŸ‘¥</div>
                    <p>${filtered ? 'No contacts match your search.' : 'No contacts yet. Add your first contact!'}</p>
                </td>
            </tr>
        `;
        document.getElementById('contactsPagination').innerHTML = '';
        return;
    }

    // Figure out which letters have contacts
    const lettersWithContacts = new Set(
        displayContacts
            .map(c => (c.care_home_name || '').trim().charAt(0).toUpperCase())
            .filter(l => l)
    );

    // Default to first letter that has contacts, if none selected or selected has none
    if (!contactsLetter || !lettersWithContacts.has(contactsLetter)) {
        contactsLetter = displayContacts[0].care_home_name.trim().charAt(0).toUpperCase();
    }

    // Filter to just those starting with that letter (or non-alpha for '#')
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const pageContacts = displayContacts.filter(c => {
        const first = (c.care_home_name || '').trim().charAt(0).toUpperCase();
        if (contactsLetter === '#') return first && !letters.includes(first);
        return first === contactsLetter;
    });

    tbody.innerHTML = pageContacts.map(contact => `
        <tr>
            <td data-label="Care Home">${escapeHtml(contact.care_home_name)}</td>
            <td data-label="Contact Person">${escapeHtml(contact.contact_person || '-')}</td>
            <td data-label="Telephone">${contact.telephone ? `<a href="tel:${contact.telephone}" class="phone-link">${escapeHtml(contact.telephone)}</a>` : '-'}</td>
            <td data-label="Email">${escapeHtml(contact.email || '-')}</td>
            <td class="actions">
                <div class="action-dropdown">
                    <button class="action-dropdown-toggle" onclick="toggleActionDropdown(event, this)" title="Actions">⋮</button>
                    <div class="action-dropdown-menu">
                        <button class="action-dropdown-item" onclick="viewContact(${contact.id})">View</button>
                        <button class="action-dropdown-item" onclick="editContact(${contact.id})">Edit</button>
                        <button class="action-dropdown-item danger" onclick="deleteItem('contact', ${contact.id})">Delete</button>
                    </div>
                </div>
            </td>
        </tr>
    `).join('');

    renderLetterPagination('contactsPagination', displayContacts, contactsLetter, 'goToContactsLetter');
}

function filterContacts() {
    const searchTerm = document.getElementById('contactSearch').value.toLowerCase();
    contactsPage = 1;
    contactsLetter = null;
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

        <hr style="margin: 20px 0;">

        <div class="contact-history-section">
            <h3 style="margin-bottom: 10px;">Callbacks</h3>
            <div id="contactCallbacksList">Loading...</div>
        </div>

        <hr style="margin: 20px 0;">

        <div class="contact-history-section">
            <h3 style="margin-bottom: 10px;">Bookings</h3>
            <div id="contactBookingsList">Loading...</div>
        </div>

        <hr style="margin: 20px 0;">

        <div class="contact-history-section">
            <h3 style="margin-bottom: 10px;">Call Logs</h3>
            <div id="contactCallLogsList">Loading...</div>
        </div>
    `;

    document.getElementById('editContactBtn').onclick = () => {
        closeModal('contactDetailsModal');
        editContact(id);
    };

    document.getElementById('contactDetailsModal').classList.add('active');

    loadContactCallbacks(id);
    loadContactBookings(id);
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
    allCallbacks = callbacks;

    if (callbacks.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <div class="empty-state-icon">ðŸ””</div>
                    <p>No callbacks in this category.</p>
                </td>
            </tr>
        `;
        document.getElementById('callbacksPagination').innerHTML = '';
        return;
    }

    // Ensure current page is in range
    const totalPages = Math.ceil(callbacks.length / PAGE_SIZE);
    if (callbacksPage > totalPages) callbacksPage = totalPages;
    if (callbacksPage < 1) callbacksPage = 1;

    const pageCallbacks = paginate(callbacks, callbacksPage);

    tbody.innerHTML = pageCallbacks.map(cb => `
        <tr>
            <td>${escapeHtml(cb.contact?.care_home_name || 'Unknown')}</td>
            <td>${formatDateTime(cb.original_call_datetime)}</td>
            <td>${formatDateTime(cb.callback_datetime)}</td>
            <td>${escapeHtml(cb.notes || '-')}</td>
            <td class="actions">
                <div class="action-dropdown">
                    <button class="action-dropdown-toggle" onclick="toggleActionDropdown(event, this)" title="Actions">⋮</button>
                    <div class="action-dropdown-menu">
                        <button class="action-dropdown-item" onclick="viewCallback(${cb.id})">View</button>
                        <button class="action-dropdown-item" onclick="editCallback(${cb.id})">Edit</button>
                        <button class="action-dropdown-item danger" onclick="deleteItem('callback', ${cb.id})">Delete</button>
                    </div>
                </div>
            </td>
        </tr>
    `).join('');

    renderPagination('callbacksPagination', callbacks.length, callbacksPage, 'goToCallbacksPage');
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

function viewCallback(id) {
    fetch(`${API_URL}/callbacks/${id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    })
        .then(response => response.json())
        .then(cb => {
            document.getElementById('callbackDetailsContent').innerHTML = `
                <div class="details-grid">
                    <p><strong>Contact:</strong> ${escapeHtml(cb.contact?.care_home_name || 'Unknown')}</p>
                    <p><strong>Callback Type:</strong> ${escapeHtml(cb.callback_type)}</p>
                    <p><strong>Original Call:</strong> ${formatDateTime(cb.original_call_datetime)}</p>
                    <p><strong>Callback Date:</strong> ${formatDateTime(cb.callback_datetime)}</p>
                    <p><strong>Notes:</strong> ${escapeHtml(cb.notes || '-')}</p>
                </div>
            `;
            document.getElementById('editCallbackBtn').onclick = () => {
                closeModal('callbackDetailsModal');
                editCallback(id);
            };
            document.getElementById('callbackDetailsModal').classList.add('active');
        })
        .catch(error => console.error('Error loading callback:', error));
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

async function loadContactCallbacks(contactId) {
    const container = document.getElementById('contactCallbacksList');
    if (!container) return;

    try {
        const response = await fetch(`${API_URL}/callbacks`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!response.ok) {
            container.innerHTML = '<p>Failed to load callbacks.</p>';
            return;
        }
        const allCallbacks = await response.json();
        const callbacks = allCallbacks.filter(cb => cb.contact_id === contactId);

        if (callbacks.length === 0) {
            container.innerHTML = '<p style="color: #666; font-style: italic;">No callbacks for this contact.</p>';
            return;
        }

        const awaiting = callbacks.filter(cb => cb.callback_type === 'Awaiting Callback');
        const toCallBack = callbacks.filter(cb => cb.callback_type === 'To Call Back');

        container.innerHTML = `
            ${renderCallbackSubSection('Awaiting Callback', awaiting, contactId)}
            ${renderCallbackSubSection('To Call Back', toCallBack, contactId)}
        `;
    } catch (error) {
        console.error('Error loading contact callbacks:', error);
        container.innerHTML = '<p>Failed to load callbacks.</p>';
    }
}

function renderCallbackSubSection(title, items, contactId) {
    if (items.length === 0) {
        return `
            <h4 style="margin-top: 15px; margin-bottom: 8px; font-size: 14px;">${title}</h4>
            <p style="color: #666; font-style: italic; margin-bottom: 10px;">None</p>
        `;
    }

    const rows = items.map(cb => `
        <tr>
            <td>${formatDateTime(cb.original_call_datetime)}</td>
            <td>${formatDateTime(cb.callback_datetime)}</td>
            <td>${escapeHtml(cb.notes || '-')}</td>
            <td class="actions">
                <div class="action-dropdown">
                    <button class="action-dropdown-toggle" onclick="toggleActionDropdown(event, this)" title="Actions">⋮</button>
                    <div class="action-dropdown-menu">
                        <button class="action-dropdown-item" onclick="viewCallback(${cb.id})">View</button>
                        <button class="action-dropdown-item" onclick="editCallbackFromContact(${cb.id}, ${contactId})">Edit</button>
                        <button class="action-dropdown-item danger" onclick="deleteCallbackFromContact(${cb.id}, ${contactId})">Delete</button>
                    </div>
                </div>
            </td>
        </tr>
    `).join('');

    return `
        <h4 style="margin-top: 15px; margin-bottom: 8px; font-size: 14px;">${title}</h4>
        <table class="data-table" style="margin-bottom: 10px;">
            <thead>
                <tr>
                    <th style="width: 18%;">Original Call</th>
                    <th style="width: 18%;">Callback Date</th>
                    <th>Notes</th>
                    <th style="width: 110px;">Actions</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

function editCallbackFromContact(callbackId, contactId) {
    closeModal('contactDetailsModal');
    editCallback(callbackId);
}

function deleteCallbackFromContact(callbackId, contactId) {
    deleteTarget = { type: 'callback', id: callbackId, returnToContact: contactId };
    document.getElementById('deleteModal').classList.add('active');
}

// ========================================
// BOOKINGS
// ========================================

async function loadContactBookings(contactId) {
    const container = document.getElementById('contactBookingsList');
    if (!container) return;

    try {
        const response = await fetch(`${API_URL}/bookings`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!response.ok) {
            container.innerHTML = '<p>Failed to load bookings.</p>';
            return;
        }
        const allBookings = await response.json();
        const bookings = allBookings.filter(b => b.contact_id === contactId);

        if (bookings.length === 0) {
            container.innerHTML = '<p style="color: #666; font-style: italic;">No bookings for this contact.</p>';
            return;
        }

        const now = new Date();
        const upcoming = bookings
            .filter(b => new Date(b.booking_from) >= now)
            .sort((a, b) => new Date(a.booking_from) - new Date(b.booking_from));
        const past = bookings
            .filter(b => new Date(b.booking_from) < now)
            .sort((a, b) => new Date(b.booking_from) - new Date(a.booking_from));

        // Store past bookings on the container so the filter can re-render
        container._pastBookings = past;
        container._contactId = contactId;

        container.innerHTML = `
            ${renderBookingSubSection('Upcoming', upcoming, contactId)}
            ${renderPastBookingsSection(past, contactId)}
        `;
    } catch (error) {
        console.error('Error loading contact bookings:', error);
        container.innerHTML = '<p>Failed to load bookings.</p>';
    }
}

function renderBookingSubSection(title, items, contactId) {
    if (items.length === 0) {
        return `
            <h4 style="margin-top: 15px; margin-bottom: 8px; font-size: 14px;">${title}</h4>
            <p style="color: #666; font-style: italic; margin-bottom: 10px;">None</p>
        `;
    }

    const rows = items.map(b => `
        <tr>
            <td>${formatDateTime(b.booking_from)}</td>
            <td>${escapeHtml(b.booking_type || '-')}</td>
            <td>£${b.fee_agreed ? parseFloat(b.fee_agreed).toFixed(2) : '0.00'}</td>
            <td><span class="status-badge status-${b.fee_status.toLowerCase()}">${b.fee_status}</span></td>
            <td class="actions">
                <div class="action-dropdown">
                    <button class="action-dropdown-toggle" onclick="toggleActionDropdown(event, this)" title="Actions">⋮</button>
                    <div class="action-dropdown-menu">
                        <button class="action-dropdown-item" onclick="generateInvoice(${b.id})">Invoice</button>
                        <button class="action-dropdown-item" onclick="generateOverdueInvoice(${b.id})">Overdue</button>
                        <button class="action-dropdown-item" onclick="openReceiptModal(${b.id})">Receipt</button>
                        <button class="action-dropdown-item" onclick="editBookingFromContact(${b.id}, ${contactId})">Edit</button>
                        <button class="action-dropdown-item danger" onclick="deleteBookingFromContact(${b.id}, ${contactId})">Delete</button>
                    </div>
                </div>
            </td>
        </tr>
    `).join('');

    return `
        <h4 style="margin-top: 15px; margin-bottom: 8px; font-size: 14px;">${title}</h4>
        <table class="data-table" style="margin-bottom: 10px;">
            <thead>
                <tr>
                    <th style="width: 140px;">Date/Time</th>
                    <th>Type</th>
                    <th style="width: 80px;">Fee</th>
                    <th style="width: 90px;">Status</th>
                    <th style="width: 90px;">Actions</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

function renderPastBookingsSection(past, contactId) {
    return `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 20px; margin-bottom: 8px;">
            <h4 style="margin: 0; font-size: 14px;">Past</h4>
            <select id="pastBookingsFilter" onchange="filterPastBookings(${contactId})" style="padding: 4px 8px; font-size: 0.85rem;">
                <option value="">All</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Invoiced">Invoiced</option>
                <option value="Paid">Paid</option>
            </select>
        </div>
        <div id="pastBookingsContainer">
            ${renderPastBookingsTable(past, contactId)}
        </div>
    `;
}

function renderPastBookingsTable(past, contactId) {
    if (past.length === 0) {
        return '<p style="color: #666; font-style: italic; margin-bottom: 10px;">None</p>';
    }

    const rows = past.map(b => `
        <tr>
            <td>${formatDateTime(b.booking_from)}</td>
            <td>${escapeHtml(b.booking_type || '-')}</td>
            <td>£${b.fee_agreed ? parseFloat(b.fee_agreed).toFixed(2) : '0.00'}</td>
            <td><span class="status-badge status-${b.fee_status.toLowerCase()}">${b.fee_status}</span></td>
            <td class="actions">
                <div class="action-dropdown">
                    <button class="action-dropdown-toggle" onclick="toggleActionDropdown(event, this)" title="Actions">⋮</button>
                    <div class="action-dropdown-menu">
                        <button class="action-dropdown-item" onclick="generateInvoice(${b.id})">Invoice</button>
                        <button class="action-dropdown-item" onclick="generateOverdueInvoice(${b.id})">Overdue</button>
                        <button class="action-dropdown-item" onclick="openReceiptModal(${b.id})">Receipt</button>
                        <button class="action-dropdown-item" onclick="editBookingFromContact(${b.id}, ${contactId})">Edit</button>
                        <button class="action-dropdown-item danger" onclick="deleteBookingFromContact(${b.id}, ${contactId})">Delete</button>
                    </div>
                </div>
            </td>
        </tr>
    `).join('');

    return `
        <table class="data-table" style="margin-bottom: 10px;">
            <thead>
                <tr>
                    <th style="width: 140px;">Date/Time</th>
                    <th>Type</th>
                    <th style="width: 80px;">Fee</th>
                    <th style="width: 90px;">Status</th>
                    <th style="width: 90px;">Actions</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

function filterPastBookings(contactId) {
    const container = document.getElementById('contactBookingsList');
    const filterValue = document.getElementById('pastBookingsFilter').value;
    const past = container._pastBookings || [];

    const filtered = filterValue
        ? past.filter(b => b.fee_status === filterValue)
        : past;

    document.getElementById('pastBookingsContainer').innerHTML =
        renderPastBookingsTable(filtered, contactId);
}

function editBookingFromContact(bookingId, contactId) {
    closeModal('contactDetailsModal');
    editBooking(bookingId);
}

function deleteBookingFromContact(bookingId, contactId) {
    deleteTarget = { type: 'booking', id: bookingId, returnToContact: contactId };
    document.getElementById('deleteModal').classList.add('active');
}

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
    allBookings = bookings;

    if (bookings.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <div class="empty-state-icon">ðŸ“…</div>
                    <p>No bookings found.</p>
                </td>
            </tr>
        `;
        document.getElementById('bookingsPagination').innerHTML = '';
        return;
    }

    // Ensure current page is in range
    const totalPages = Math.ceil(bookings.length / PAGE_SIZE);
    if (bookingsPage > totalPages) bookingsPage = totalPages;
    if (bookingsPage < 1) bookingsPage = 1;

    const pageBookings = paginate(bookings, bookingsPage);

    tbody.innerHTML = pageBookings.map(booking => `
        <tr>
            <td>${formatDateTime(booking.booking_from)} - ${formatDateTime(booking.booking_to)}</td>
            <td>${escapeHtml(booking.contact?.care_home_name || 'Unknown')}</td>
            <td>${escapeHtml(booking.booking_type || '-')}</td>
            <td>Â£${booking.fee_agreed ? parseFloat(booking.fee_agreed).toFixed(2) : '0.00'}</td>
            <td><span class="status-badge status-${booking.fee_status.toLowerCase()}">${booking.fee_status}</span></td>
            <td class="actions">
                <div class="action-dropdown">
                    <button class="action-dropdown-toggle" onclick="toggleActionDropdown(event, this)" title="Actions">⋮</button>
                    <div class="action-dropdown-menu">
                        <button class="action-dropdown-item" onclick="generateInvoice(${booking.id})">Invoice</button>
                        <button class="action-dropdown-item" onclick="generateOverdueInvoice(${booking.id})">Overdue</button>
                        <button class="action-dropdown-item" onclick="openReceiptModal(${booking.id})">Receipt</button>
                        <button class="action-dropdown-item" onclick="editBooking(${booking.id})">Edit</button>
                        <button class="action-dropdown-item danger" onclick="deleteItem('booking', ${booking.id})">Delete</button>
                    </div>
                </div>
            </td>
        </tr>
    `).join('');

    renderPagination('bookingsPagination', bookings.length, bookingsPage, 'goToBookingsPage');
}

async function handleBookingSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('bookingId').value;

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
            const fromDate = new Date(booking.booking_from);
            const toDate = new Date(booking.booking_to);

            const dateStr = fromDate.toISOString().slice(0, 10);

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
    const { type, id, returnToContact } = deleteTarget;
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

            if (returnToContact) {
                viewContact(returnToContact);
            }
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
        const bookingForm = document.getElementById('bookingForm');
        if (bookingForm) bookingForm.reset();

        document.getElementById('bookingModalTitle').textContent = 'Add Booking';
        document.getElementById('bookingId').value = '';
        document.getElementById('bookingContact').value = '';
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
            b.fee_agreed ? `Â£${parseFloat(b.fee_agreed).toFixed(2)}` : '',
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
                <td class="amount">Â£${fee}</td>
            </tr>
        </tbody>
    </table>
    
    <div class="totals">
        <div class="row">
            <span>Subtotal:</span>
            <span>Â£${fee}</span>
        </div>
        <div class="row total">
            <span>Total Due:</span>
            <span>Â£${fee}</span>
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
        <p>Elise Care Home Entertainment | 07513 049520 | elisethecarehomesinger.co.uk</p>
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

// ========================================
// OVERDUE INVOICE GENERATION
// ========================================

async function generateOverdueInvoice(bookingId) {
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

        const bookingDate = new Date(booking.booking_from).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
        const bookingTimeFrom = new Date(booking.booking_from).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const bookingTimeTo = new Date(booking.booking_to).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

        const fee = booking.fee_agreed ? parseFloat(booking.fee_agreed).toFixed(2) : '0.00';

        const overdueHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OVERDUE Invoice ${invoiceNumber}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333; padding: 40px; max-width: 800px; margin: 0 auto; position: relative; }
        .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80px; font-weight: bold; color: rgba(244, 67, 54, 0.25); white-space: nowrap; pointer-events: none; z-index: 1000; }
        .urgent-notice { background: #f44336; color: white; padding: 15px; text-align: center; margin-bottom: 30px; border-radius: 5px; font-weight: bold; font-size: 16px; }
        .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #f44336; }
        .business-info h1 { font-size: 24px; color: #f44336; margin-bottom: 5px; }
        .business-info p { color: #666; font-size: 13px; }
        .invoice-title { text-align: right; }
        .invoice-title h2 { font-size: 32px; color: #333; margin-bottom: 5px; }
        .invoice-title p { color: #666; }
        .overdue-stamp { background: #f44336; color: white; padding: 8px 20px; font-size: 18px; font-weight: bold; border-radius: 5px; display: inline-block; margin-top: 10px; }
        .invoice-details { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .bill-to, .invoice-info { width: 48%; }
        .bill-to h3, .invoice-info h3 { font-size: 12px; text-transform: uppercase; color: #999; margin-bottom: 10px; letter-spacing: 1px; }
        .bill-to p, .invoice-info p { margin-bottom: 3px; }
        .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .invoice-table th { background: #ffebee; padding: 12px 15px; text-align: left; font-weight: 600; border-bottom: 2px solid #f44336; }
        .invoice-table td { padding: 15px; border-bottom: 1px solid #eee; }
        .invoice-table .amount { text-align: right; }
        .totals { margin-left: auto; width: 300px; }
        .totals .row { display: flex; justify-content: space-between; padding: 8px 0; }
        .totals .total { font-size: 18px; font-weight: 700; border-top: 2px solid #f44336; padding-top: 10px; margin-top: 5px; color: #f44336; }
        .payment-info { margin-top: 40px; padding: 20px; background: #ffebee; border-radius: 8px; border: 2px solid #f44336; }
        .payment-info h3 { font-size: 14px; margin-bottom: 15px; color: #c62828; }
        .payment-info p { margin-bottom: 5px; font-size: 13px; }
        .payment-info .bank-details { margin-top: 10px; }
        .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
        .btn-container { margin-bottom: 20px; text-align: center; }
        .btn { padding: 10px 25px; font-size: 14px; cursor: pointer; border: none; border-radius: 5px; margin: 0 5px; }
        .btn-print { background: #f44336; color: white; }
        .btn-download { background: #333; color: white; }
        @media print { .btn-container { display: none; } body { padding: 20px; } .watermark { position: fixed; } }
    </style>
</head>
<body>
    <div class="watermark">OVERDUE FOR PAYMENT</div>
    
    <div class="btn-container">
        <button class="btn btn-print" onclick="window.print()">Print Invoice</button>
        <button class="btn btn-download" onclick="window.print()">Save as PDF</button>
    </div>
    
    <div class="urgent-notice">⚠️ URGENT: This invoice is now overdue for payment. Please remit immediately.</div>
    
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
            <div class="overdue-stamp">OVERDUE</div>
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
            <p><strong>Status:</strong> <span style="color: #f44336; font-weight: bold;">OVERDUE</span></p>
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
            <span>TOTAL OVERDUE:</span>
            <span>£${fee}</span>
        </div>
    </div>
    
    <div class="payment-info">
        <h3>⚠️ Immediate Payment Required</h3>
        <p>This invoice is now overdue. Please arrange payment immediately to avoid any further action.</p>
        <div class="bank-details">
            <p><strong>Bank:</strong> Bank of Scotland</p>
            <p><strong>Account Name:</strong> Elise Fitzsimons</p>
            <p><strong>Sort Code:</strong> 80-45-87</p>
            <p><strong>Account Number:</strong> 13889463</p>
        </div>
    </div>
    
    <div class="footer">
        <p>Elise Care Home Entertainment | 07513 049520 | elisethecarehomesinger.co.uk</p>
    </div>
</body>
</html>
        `;

        const overdueWindow = window.open('', '_blank');
        overdueWindow.document.write(overdueHTML);
        overdueWindow.document.close();

    } catch (error) {
        console.error('Overdue invoice generation failed:', error);
        showToast('Failed to generate overdue invoice', 'error');
    }
}

// ========================================
// RECEIPT GENERATION
// ========================================

function openReceiptModal(bookingId) {
    document.getElementById('receiptBookingId').value = bookingId;
    document.getElementById('receiptDate').value = new Date().toISOString().slice(0, 10);
    document.getElementById('paymentMethod').value = 'Cash';
    document.getElementById('chequeNumber').value = '';
    document.getElementById('chequeNumberGroup').style.display = 'none';
    document.getElementById('receiptModal').classList.add('active');
}

function toggleChequeNumber() {
    const paymentMethod = document.getElementById('paymentMethod').value;
    const chequeNumberGroup = document.getElementById('chequeNumberGroup');
    if (paymentMethod === 'Cheque') {
        chequeNumberGroup.style.display = 'block';
    } else {
        chequeNumberGroup.style.display = 'none';
        document.getElementById('chequeNumber').value = '';
    }
}

async function handleReceiptSubmit(e) {
    e.preventDefault();
    const bookingId = document.getElementById('receiptBookingId').value;
    const receiptDate = document.getElementById('receiptDate').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    const chequeNumber = document.getElementById('chequeNumber').value;

    closeModal('receiptModal');
    await generateReceipt(bookingId, receiptDate, paymentMethod, chequeNumber);
}

async function generateReceipt(bookingId, receiptDate, paymentMethod, chequeNumber) {
    try {
        const response = await fetch(`${API_URL}/bookings/${bookingId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!response.ok) {
            showToast('Failed to load booking details', 'error');
            return;
        }
        const booking = await response.json();

        const receiptNumber = `REC-${new Date().getFullYear()}-${String(bookingId).padStart(4, '0')}`;
        const receiptDateFormatted = new Date(receiptDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

        const bookingDate = new Date(booking.booking_from).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
        const bookingTimeFrom = new Date(booking.booking_from).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const bookingTimeTo = new Date(booking.booking_to).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

        const fee = booking.fee_agreed ? parseFloat(booking.fee_agreed).toFixed(2) : '0.00';

        const chequeInfo = paymentMethod === 'Cheque' && chequeNumber ? `<p><strong>Cheque Number:</strong> ${chequeNumber}</p>` : '';

        const receiptHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt ${receiptNumber}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333; padding: 40px; max-width: 800px; margin: 0 auto; }
        .receipt-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #4caf50; }
        .business-info h1 { font-size: 24px; color: #4caf50; margin-bottom: 5px; }
        .business-info p { color: #666; font-size: 13px; }
        .receipt-title { text-align: right; }
        .receipt-title h2 { font-size: 32px; color: #333; margin-bottom: 5px; }
        .receipt-title p { color: #666; }
        .paid-stamp { background: #4caf50; color: white; padding: 8px 20px; font-size: 18px; font-weight: bold; border-radius: 5px; display: inline-block; margin-top: 10px; }
        .receipt-details { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .received-from, .receipt-info { width: 48%; }
        .received-from h3, .receipt-info h3 { font-size: 12px; text-transform: uppercase; color: #999; margin-bottom: 10px; letter-spacing: 1px; }
        .received-from p, .receipt-info p { margin-bottom: 3px; }
        .receipt-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .receipt-table th { background: #f8f8f8; padding: 12px 15px; text-align: left; font-weight: 600; border-bottom: 2px solid #4caf50; }
        .receipt-table td { padding: 15px; border-bottom: 1px solid #eee; }
        .receipt-table .amount { text-align: right; }
        .totals { margin-left: auto; width: 300px; }
        .totals .row { display: flex; justify-content: space-between; padding: 8px 0; }
        .totals .total { font-size: 18px; font-weight: 700; border-top: 2px solid #333; padding-top: 10px; margin-top: 5px; }
        .payment-info { margin-top: 40px; padding: 20px; background: #e8f5e9; border-radius: 8px; }
        .payment-info h3 { font-size: 14px; margin-bottom: 15px; color: #333; }
        .payment-info p { margin-bottom: 5px; font-size: 13px; }
        .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
        .btn-container { margin-bottom: 20px; text-align: center; }
        .btn { padding: 10px 25px; font-size: 14px; cursor: pointer; border: none; border-radius: 5px; margin: 0 5px; }
        .btn-print { background: #4caf50; color: white; }
        .btn-download { background: #333; color: white; }
        @media print { .btn-container { display: none; } body { padding: 20px; } }
    </style>
</head>
<body>
    <div class="btn-container">
        <button class="btn btn-print" onclick="window.print()">Print Receipt</button>
        <button class="btn btn-download" onclick="window.print()">Save as PDF</button>
    </div>
    
    <div class="receipt-header">
        <div class="business-info">
            <h1>Elise Care Home Entertainment</h1>
            <p>Mosswater Wynd, Cumbernauld</p>
            <p>07513 049520</p>
            <p>elisethecarehomesinger@gmail.com</p>
        </div>
        <div class="receipt-title">
            <h2>RECEIPT</h2>
            <p>${receiptNumber}</p>
            <div class="paid-stamp">PAID</div>
        </div>
    </div>
    
    <div class="receipt-details">
        <div class="received-from">
            <h3>Received From</h3>
            <p><strong>${booking.contact?.care_home_name || 'Unknown'}</strong></p>
            <p>${booking.contact?.address || ''}</p>
            <p>${booking.contact?.postcode || ''}</p>
            <p>${booking.contact?.email || ''}</p>
            <p>${booking.contact?.telephone || ''}</p>
        </div>
        <div class="receipt-info">
            <h3>Receipt Details</h3>
            <p><strong>Receipt Date:</strong> ${receiptDateFormatted}</p>
            <p><strong>Payment Method:</strong> ${paymentMethod}</p>
            ${chequeInfo}
            <p><strong>Performance Date:</strong> ${bookingDate}</p>
        </div>
    </div>
    
    <table class="receipt-table">
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
                <td class="amount">Â£${fee}</td>
            </tr>
        </tbody>
    </table>
    
    <div class="totals">
        <div class="row">
            <span>Subtotal:</span>
            <span>Â£${fee}</span>
        </div>
        <div class="row total">
            <span>Total Paid:</span>
            <span>Â£${fee}</span>
        </div>
    </div>
    
    <div class="payment-info">
        <h3>Payment Confirmation</h3>
        <p>Thank you for your payment. This receipt confirms that payment has been received in full.</p>
        <p><strong>Amount Received:</strong> Â£${fee}</p>
        <p><strong>Payment Method:</strong> ${paymentMethod}</p>
        ${chequeInfo}
    </div>
    
    <div class="footer">
        <p>Thank you for your business!</p>
        <p>Elise Care Home Entertainment | 07513 049520 | elisethecarehomesinger.co.uk</p>
    </div>
</body>
</html>
        `;

        const receiptWindow = window.open('', '_blank');
        receiptWindow.document.write(receiptHTML);
        receiptWindow.document.close();

    } catch (error) {
        console.error('Receipt generation failed:', error);
        showToast('Failed to generate receipt', 'error');
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
                <p><strong>Fee Agreed:</strong> Â£${booking.fee_agreed ? parseFloat(booking.fee_agreed).toFixed(2) : '0.00'}</p>
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

            document.getElementById('overdueBookingBtn').onclick = () => {
                closeModal('bookingDetailsModal');
                generateOverdueInvoice(bookingId);
            };

            document.getElementById('receiptBookingBtn').onclick = () => {
                closeModal('bookingDetailsModal');
                openReceiptModal(bookingId);
            };

            document.getElementById('bookingDetailsModal').classList.add('active');
        })
        .catch(error => console.error('Error loading booking details:', error));
}
