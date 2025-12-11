const API_BASE = '';

async function getUsers() {
    const response = await fetch(`${API_BASE}/api/users`);
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
}

async function createUser(username) {
    const response = await fetch(`${API_BASE}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
    });
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create user');
    }
    return response.json();
}

async function getUserData(username) {
    const response = await fetch(`${API_BASE}/api/users/${encodeURIComponent(username)}/data`);
    if (!response.ok) {
        if (response.status === 404) return { sections: [] };
        throw new Error('Failed to fetch user data');
    }
    return response.json();
}

async function saveUserData(username, data) {
    const response = await fetch(`${API_BASE}/api/users/${encodeURIComponent(username)}/data`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to save user data');
    return response.json();
}

async function uploadImage(username, file) {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE}/api/users/${encodeURIComponent(username)}/images`, {
        method: 'POST',
        body: formData
    });
    if (!response.ok) throw new Error('Failed to upload image');
    return response.json();
}

// Local storage helpers for theme and current user
function getCurrentUser() {
    return localStorage.getItem('poe2_current_user');
}

function setCurrentUser(username) {
    localStorage.setItem('poe2_current_user', username);
}

function getTheme() {
    return localStorage.getItem('poe2_theme') || 'dark';
}

function setTheme(theme) {
    localStorage.setItem('poe2_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
}

function initTheme() {
    const theme = getTheme();
    document.documentElement.setAttribute('data-theme', theme);
    return theme;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
