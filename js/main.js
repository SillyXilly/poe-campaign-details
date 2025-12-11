let currentAct = 'act1';
let userData = { sections: [] };

const ACTS = [
    { id: 'act1', name: 'Act 1' },
    { id: 'act2', name: 'Act 2' },
    { id: 'act3', name: 'Act 3' },
    { id: 'interlude1', name: 'Interlude I' },
    { id: 'act4', name: 'Act 4' },
    { id: 'interlude2', name: 'Interlude II' },
    { id: 'interlude3', name: 'Interlude III' }
];

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize theme
    const theme = initTheme();
    updateThemeButton(theme);

    // Load users
    await loadUsers();

    // Set up event listeners
    setupEventListeners();

    // Load current user's data
    const currentUser = getCurrentUser();
    if (currentUser) {
        document.getElementById('userSelect').value = currentUser;
        await loadUserData(currentUser);
    }
});

async function loadUsers() {
    try {
        const data = await getUsers();
        const select = document.getElementById('userSelect');
        select.innerHTML = '<option value="">Select User</option>';

        data.users.forEach(user => {
            const option = document.createElement('option');
            option.value = user;
            option.textContent = user;
            select.appendChild(option);
        });

        const currentUser = getCurrentUser();
        if (currentUser && data.users.includes(currentUser)) {
            select.value = currentUser;
            updateUserIcon(currentUser);
        }
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

async function loadUserData(username) {
    if (!username) {
        userData = { sections: [] };
        renderCards();
        return;
    }

    try {
        userData = await getUserData(username);
        renderCards();
    } catch (error) {
        console.error('Failed to load user data:', error);
        userData = { sections: [] };
        renderCards();
    }
}

function renderCards() {
    const container = document.getElementById('cardsContainer');

    // Filter sections by current act
    const sections = userData.sections
        .filter(s => s.act === currentAct)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    if (sections.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No sections yet</h3>
                <p>Select a user and click "Edit Guide" to add content.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = sections.map(section => {
        const style = buildCardStyle(section);
        return `
            <div class="card" data-section-id="${section.id}" style="${style}">
                <div class="card-title">${escapeHtml(section.title)}</div>
                <div class="card-content">${section.content}</div>
                <div class="resize-handle"></div>
            </div>
        `;
    }).join('');

    // Attach resize handlers
    container.querySelectorAll('.card').forEach(card => {
        setupCardResize(card);
    });
}

function setupEventListeners() {
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
        const currentTheme = getTheme();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        updateThemeButton(newTheme);
    });

    // User selection
    document.getElementById('userSelect').addEventListener('change', async (e) => {
        const username = e.target.value;
        setCurrentUser(username);
        updateUserIcon(username);
        await loadUserData(username);
    });

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentAct = item.dataset.act;
            renderCards();
        });
    });

    // New user modal
    document.getElementById('newUserBtn').addEventListener('click', () => {
        document.getElementById('newUserModal').style.display = 'flex';
        document.getElementById('newUsername').value = '';
        document.getElementById('newUsername').focus();
    });

    document.getElementById('cancelNewUser').addEventListener('click', () => {
        document.getElementById('newUserModal').style.display = 'none';
    });

    document.getElementById('confirmNewUser').addEventListener('click', createNewUser);

    document.getElementById('newUsername').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createNewUser();
    });

    // Close modal on overlay click
    document.getElementById('newUserModal').addEventListener('click', (e) => {
        if (e.target.id === 'newUserModal') {
            document.getElementById('newUserModal').style.display = 'none';
        }
    });

    // Image lightbox
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightboxImage');

    document.getElementById('cardsContainer').addEventListener('click', (e) => {
        if (e.target.tagName === 'IMG' && e.target.closest('.card-content')) {
            lightboxImage.src = e.target.src;
            lightbox.style.display = 'flex';
        }
    });

    lightbox.addEventListener('click', () => {
        lightbox.style.display = 'none';
    });
}

async function createNewUser() {
    const input = document.getElementById('newUsername');
    const username = input.value.trim();

    if (!username) {
        alert('Please enter a username');
        return;
    }

    try {
        await createUser(username);
        document.getElementById('newUserModal').style.display = 'none';
        await loadUsers();
        document.getElementById('userSelect').value = username;
        setCurrentUser(username);
        updateUserIcon(username);
        await loadUserData(username);
    } catch (error) {
        alert(error.message);
    }
}

function updateUserIcon(username) {
    const icon = document.getElementById('userIcon');
    icon.textContent = username ? username.charAt(0).toUpperCase() : '?';
}

function updateThemeButton(theme) {
    document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function buildCardStyle(section) {
    const styles = [];
    if (section.width) styles.push(`width: ${section.width}px`);
    if (section.height) styles.push(`height: ${section.height}px`);
    return styles.join('; ');
}

function setupCardResize(card) {
    const handle = card.querySelector('.resize-handle');
    if (!handle) return;

    let isResizing = false;
    let startX, startY, startWidth, startHeight;

    handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = card.offsetWidth;
        startHeight = card.offsetHeight;
        document.body.style.cursor = 'se-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const newWidth = startWidth + (e.clientX - startX);
        const newHeight = startHeight + (e.clientY - startY);
        card.style.width = Math.max(200, newWidth) + 'px';
        card.style.height = Math.max(100, newHeight) + 'px';
    });

    document.addEventListener('mouseup', async () => {
        if (!isResizing) return;
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        // Save the new size
        const sectionId = card.dataset.sectionId;
        const section = userData.sections.find(s => s.id === sectionId);
        if (section) {
            section.width = card.offsetWidth;
            section.height = card.offsetHeight;
            const username = getCurrentUser();
            if (username) {
                await saveUserData(username, userData);
            }
        }
    });
}
