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
                <div class="card-drag-handle" title="Drag to reorder">⋮⋮</div>
                <div class="card-title">${escapeHtml(section.title)}</div>
                <div class="card-content">${section.content}</div>
                <canvas class="doodle-canvas" style="display: none;"></canvas>
                ${section.doodle ? `<img class="doodle-overlay" src="${section.doodle}" alt="">` : ''}
                <div class="doodle-btn" title="Draw on card">✏️</div>
                <div class="doodle-controls" style="display: none;">
                    <button class="doodle-clear-btn" title="Clear drawing">Clear</button>
                    <span class="doodle-hint">ESC to save</span>
                </div>
                <div class="resize-handle"></div>
            </div>
        `;
    }).join('');

    // Attach resize, drag, and doodle handlers
    container.querySelectorAll('.card').forEach(card => {
        setupCardResize(card);
        setupCardDrag(card);
        setupCardDoodle(card);
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
        // Don't open lightbox if in doodle mode
        const card = e.target.closest('.card');
        if (card && card.classList.contains('doodle-mode')) return;

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

let dragState = {
    card: null,
    offsetX: 0,
    offsetY: 0,
    placeholder: null
};

function setupCardDrag(card) {
    const handle = card.querySelector('.card-drag-handle');
    if (!handle) return;

    handle.addEventListener('mousedown', (e) => {
        e.preventDefault();

        const rect = card.getBoundingClientRect();
        dragState.card = card;
        dragState.offsetX = e.clientX - rect.left;
        dragState.offsetY = e.clientY - rect.top;

        // Create placeholder
        dragState.placeholder = document.createElement('div');
        dragState.placeholder.className = 'card-placeholder';
        dragState.placeholder.style.width = rect.width + 'px';
        dragState.placeholder.style.height = rect.height + 'px';
        card.parentNode.insertBefore(dragState.placeholder, card);

        // Make card follow cursor
        card.classList.add('dragging');
        card.style.position = 'fixed';
        card.style.left = rect.left + 'px';
        card.style.top = rect.top + 'px';
        card.style.width = rect.width + 'px';
        card.style.zIndex = '1000';

        document.body.style.userSelect = 'none';
    });
}

document.addEventListener('mousemove', (e) => {
    if (!dragState.card) return;

    const card = dragState.card;
    card.style.left = (e.clientX - dragState.offsetX) + 'px';
    card.style.top = (e.clientY - dragState.offsetY) + 'px';

    // Find drop position
    const container = document.getElementById('cardsContainer');
    const cards = Array.from(container.querySelectorAll('.card:not(.dragging)'));
    const afterElement = getDragAfterElement(cards, e.clientX, e.clientY);

    if (afterElement) {
        container.insertBefore(dragState.placeholder, afterElement);
    } else {
        container.appendChild(dragState.placeholder);
    }
});

document.addEventListener('mouseup', async () => {
    if (!dragState.card) return;

    const card = dragState.card;
    const container = document.getElementById('cardsContainer');

    // Insert card at placeholder position
    container.insertBefore(card, dragState.placeholder);
    dragState.placeholder.remove();

    // Reset card styles
    card.classList.remove('dragging');
    card.style.position = '';
    card.style.left = '';
    card.style.top = '';
    card.style.zIndex = '';
    document.body.style.userSelect = '';

    // Update order based on DOM positions
    const cards = Array.from(container.querySelectorAll('.card'));
    cards.forEach((c, index) => {
        const sectionId = c.dataset.sectionId;
        const section = userData.sections.find(s => s.id === sectionId);
        if (section) {
            section.order = index;
        }
    });

    const username = getCurrentUser();
    if (username) {
        await saveUserData(username, userData);
    }

    dragState.card = null;
    dragState.placeholder = null;
});

function getDragAfterElement(cards, x, y) {
    return cards.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offsetX = x - box.left - box.width / 2;
        const offsetY = y - box.top - box.height / 2;
        const offset = Math.sqrt(offsetX * offsetX + offsetY * offsetY);

        if (offset < closest.offset) {
            return { offset, element: child };
        }
        return closest;
    }, { offset: Number.POSITIVE_INFINITY }).element;
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

let activeDoodleCard = null;

function setupCardDoodle(card) {
    const canvas = card.querySelector('.doodle-canvas');
    const doodleBtn = card.querySelector('.doodle-btn');
    const doodleControls = card.querySelector('.doodle-controls');
    const clearBtn = card.querySelector('.doodle-clear-btn');
    const overlay = card.querySelector('.doodle-overlay');
    const ctx = canvas.getContext('2d');

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    doodleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        enterDoodleMode(card, canvas, doodleControls, overlay);
    });

    clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    canvas.addEventListener('mousedown', (e) => {
        if (!card.classList.contains('doodle-mode')) return;
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        lastX = e.clientX - rect.left;
        lastY = e.clientY - rect.top;
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();

        lastX = x;
        lastY = y;
    });

    canvas.addEventListener('mouseup', () => {
        isDrawing = false;
    });

    canvas.addEventListener('mouseleave', () => {
        isDrawing = false;
    });

    // Prevent clicks from propagating when in doodle mode
    canvas.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
    });
}

function enterDoodleMode(card, canvas, controls, overlay) {
    // Exit any other active doodle mode
    if (activeDoodleCard && activeDoodleCard !== card) {
        exitDoodleMode(activeDoodleCard);
    }

    activeDoodleCard = card;
    card.classList.add('doodle-mode');

    // Size canvas to card
    const rect = card.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    canvas.style.display = 'block';
    controls.style.display = 'flex';

    // Load existing doodle if any
    if (overlay && overlay.src) {
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
        };
        img.src = overlay.src;
        overlay.style.display = 'none';
    }

    // Add ESC listener
    document.addEventListener('keydown', handleDoodleEsc);
}

async function exitDoodleMode(card) {
    if (!card) return;

    const canvas = card.querySelector('.doodle-canvas');
    const controls = card.querySelector('.doodle-controls');
    let overlay = card.querySelector('.doodle-overlay');

    card.classList.remove('doodle-mode');
    canvas.style.display = 'none';
    controls.style.display = 'none';

    // Save the doodle
    const doodleData = canvas.toDataURL('image/png');
    const sectionId = card.dataset.sectionId;
    const section = userData.sections.find(s => s.id === sectionId);

    if (section) {
        // Check if canvas is empty
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const isEmpty = !imageData.data.some((channel, index) => index % 4 === 3 && channel !== 0);

        if (isEmpty) {
            section.doodle = null;
            if (overlay) overlay.remove();
        } else {
            section.doodle = doodleData;

            // Update or create overlay
            if (!overlay) {
                overlay = document.createElement('img');
                overlay.className = 'doodle-overlay';
                card.insertBefore(overlay, card.querySelector('.doodle-btn'));
            }
            overlay.src = doodleData;
            overlay.style.display = 'block';
        }

        const username = getCurrentUser();
        if (username) {
            await saveUserData(username, userData);
        }
    }

    document.removeEventListener('keydown', handleDoodleEsc);
    activeDoodleCard = null;
}

function handleDoodleEsc(e) {
    if (e.key === 'Escape' && activeDoodleCard) {
        exitDoodleMode(activeDoodleCard);
    }
}
