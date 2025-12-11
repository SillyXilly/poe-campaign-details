let currentAct = 'act1';
let userData = { sections: [] };
let currentSection = null;
let isDirty = false;

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize theme
    const theme = initTheme();
    updateThemeButton(theme);

    // Check if user is selected
    const currentUser = getCurrentUser();
    if (!currentUser) {
        alert('Please select a user first');
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('currentUserDisplay').textContent = `Editing: ${currentUser}`;

    // Load user data
    await loadUserData();

    // Set up event listeners
    setupEventListeners();

    // Render initial section list
    renderSectionList();
});

async function loadUserData() {
    const username = getCurrentUser();
    try {
        userData = await getUserData(username);
    } catch (error) {
        console.error('Failed to load user data:', error);
        userData = { sections: [] };
    }
}

async function saveAllData() {
    const username = getCurrentUser();
    try {
        await saveUserData(username, userData);
    } catch (error) {
        console.error('Failed to save data:', error);
        alert('Failed to save. Please try again.');
    }
}

function renderSectionList() {
    const list = document.getElementById('sectionList');
    const sections = userData.sections
        .filter(s => s.act === currentAct)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    if (sections.length === 0) {
        list.innerHTML = '<div style="color: var(--text-secondary); font-size: 14px;">No sections for this act yet.</div>';
        return;
    }

    list.innerHTML = sections.map(section => `
        <div class="section-item ${currentSection?.id === section.id ? 'active' : ''}" data-id="${section.id}" draggable="true">
            <span class="section-drag-handle" title="Drag to reorder">⋮⋮</span>
            <span class="section-item-title">${escapeHtml(section.title || 'Untitled')}</span>
        </div>
    `).join('');

    // Add click handlers
    list.querySelectorAll('.section-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Ignore clicks on drag handle
            if (e.target.classList.contains('section-drag-handle')) return;
            
            if (isDirty && !confirm('You have unsaved changes. Discard them?')) {
                return;
            }
            const section = userData.sections.find(s => s.id === item.dataset.id);
            if (section) {
                loadSection(section);
            }
        });
    });

    // Setup drag and drop
    setupSectionDragDrop();
}

function loadSection(section) {
    currentSection = section;
    document.getElementById('sectionTitle').value = section.title || '';
    document.getElementById('editorContent').innerHTML = section.content || '';
    document.getElementById('editorPanel').style.display = 'block';
    document.getElementById('editorEmptyState').style.display = 'none';
    isDirty = false;
    renderSectionList();
}

function newSection() {
    if (isDirty && !confirm('You have unsaved changes. Discard them?')) {
        return;
    }

    currentSection = {
        id: generateId(),
        act: currentAct,
        title: '',
        content: '',
        order: userData.sections.filter(s => s.act === currentAct).length
    };

    document.getElementById('sectionTitle').value = '';
    document.getElementById('editorContent').innerHTML = '';
    document.getElementById('editorPanel').style.display = 'block';
    document.getElementById('editorEmptyState').style.display = 'none';
    isDirty = false;
    document.getElementById('sectionTitle').focus();
}

async function saveSection() {
    if (!currentSection) return;

    currentSection.title = document.getElementById('sectionTitle').value.trim();
    currentSection.content = document.getElementById('editorContent').innerHTML;

    if (!currentSection.title) {
        alert('Please enter a title');
        return;
    }

    // Check if it's a new section or existing
    const existingIndex = userData.sections.findIndex(s => s.id === currentSection.id);
    if (existingIndex >= 0) {
        userData.sections[existingIndex] = currentSection;
    } else {
        userData.sections.push(currentSection);
    }

    await saveAllData();
    isDirty = false;
    renderSectionList();
}

function cancelEdit() {
    if (isDirty && !confirm('Discard unsaved changes?')) {
        return;
    }
    currentSection = null;
    document.getElementById('editorPanel').style.display = 'none';
    document.getElementById('editorEmptyState').style.display = 'block';
    isDirty = false;
    renderSectionList();
}

async function deleteSection() {
    if (!currentSection) return;

    document.getElementById('deleteModal').style.display = 'flex';
}

async function confirmDeleteSection() {
    if (!currentSection) return;

    userData.sections = userData.sections.filter(s => s.id !== currentSection.id);
    await saveAllData();

    currentSection = null;
    document.getElementById('editorPanel').style.display = 'none';
    document.getElementById('editorEmptyState').style.display = 'block';
    document.getElementById('deleteModal').style.display = 'none';
    isDirty = false;
    renderSectionList();
}

function setupEventListeners() {
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
        const currentTheme = getTheme();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        updateThemeButton(newTheme);
    });

    // Act selection (dropdown)
    document.getElementById('actSelect').addEventListener('change', (e) => {
        if (isDirty && !confirm('You have unsaved changes. Discard them?')) {
            e.target.value = currentAct;
            return;
        }
        currentAct = e.target.value;
        currentSection = null;
        document.getElementById('editorPanel').style.display = 'none';
        document.getElementById('editorEmptyState').style.display = 'block';
        isDirty = false;
        renderSectionList();
        updateNavigation();
    });

    // Sidebar navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (isDirty && !confirm('You have unsaved changes. Discard them?')) {
                return;
            }
            currentAct = item.dataset.act;
            document.getElementById('actSelect').value = currentAct;
            currentSection = null;
            document.getElementById('editorPanel').style.display = 'none';
            document.getElementById('editorEmptyState').style.display = 'block';
            isDirty = false;
            renderSectionList();
            updateNavigation();
        });
    });

    // New section
    document.getElementById('newSectionBtn').addEventListener('click', newSection);

    // Save/Cancel/Delete
    document.getElementById('saveBtn').addEventListener('click', saveSection);
    document.getElementById('cancelBtn').addEventListener('click', cancelEdit);
    document.getElementById('deleteBtn').addEventListener('click', deleteSection);

    // Delete modal
    document.getElementById('cancelDelete').addEventListener('click', () => {
        document.getElementById('deleteModal').style.display = 'none';
    });
    document.getElementById('confirmDelete').addEventListener('click', confirmDeleteSection);
    document.getElementById('deleteModal').addEventListener('click', (e) => {
        if (e.target.id === 'deleteModal') {
            document.getElementById('deleteModal').style.display = 'none';
        }
    });

    // Copy to Act modal
    document.getElementById('copyToActBtn').addEventListener('click', openCopyModal);
    document.getElementById('cancelCopy').addEventListener('click', () => {
        document.getElementById('copyModal').style.display = 'none';
    });
    document.getElementById('confirmCopy').addEventListener('click', confirmCopySection);
    document.getElementById('copyModal').addEventListener('click', (e) => {
        if (e.target.id === 'copyModal') {
            document.getElementById('copyModal').style.display = 'none';
        }
    });

    // Rich text toolbar
    document.querySelectorAll('.toolbar-btn[data-cmd]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.execCommand(btn.dataset.cmd, false, null);
            document.getElementById('editorContent').focus();
        });
    });

    // Image upload
    document.getElementById('insertImageBtn').addEventListener('click', () => {
        document.getElementById('imageInput').click();
    });

    document.getElementById('imageInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const username = getCurrentUser();
        try {
            const result = await uploadImage(username, file);
            document.execCommand('insertImage', false, result.url);
            isDirty = true;
        } catch (error) {
            alert('Failed to upload image: ' + error.message);
        }
        e.target.value = '';
    });

    // Track dirty state
    document.getElementById('sectionTitle').addEventListener('input', () => {
        isDirty = true;
    });
    document.getElementById('editorContent').addEventListener('input', () => {
        isDirty = true;
    });

    // Warn before leaving with unsaved changes
    window.addEventListener('beforeunload', (e) => {
        if (isDirty) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

function updateNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.act === currentAct);
    });
}

function updateThemeButton(theme) {
    document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function openCopyModal() {
    if (!currentSection) return;

    // Set default to a different act than current
    const select = document.getElementById('copyTargetAct');
    const options = Array.from(select.options);
    const differentAct = options.find(opt => opt.value !== currentSection.act);
    if (differentAct) {
        select.value = differentAct.value;
    }

    document.getElementById('copyModal').style.display = 'flex';
}

async function confirmCopySection() {
    if (!currentSection) return;

    const targetAct = document.getElementById('copyTargetAct').value;

    // Create a copy with new ID
    const copiedSection = {
        id: generateId(),
        act: targetAct,
        title: currentSection.title || document.getElementById('sectionTitle').value.trim(),
        content: currentSection.content || document.getElementById('editorContent').innerHTML,
        order: userData.sections.filter(s => s.act === targetAct).length
    };

    // Copy size properties if they exist
    if (currentSection.width) copiedSection.width = currentSection.width;
    if (currentSection.height) copiedSection.height = currentSection.height;

    userData.sections.push(copiedSection);
    await saveAllData();

    document.getElementById('copyModal').style.display = 'none';
    alert(`Section copied to ${getActName(targetAct)}`);
}

function getActName(actId) {
    const names = {
        act1: 'Act 1',
        act2: 'Act 2',
        act3: 'Act 3',
        act4: 'Act 4',
        interlude1: 'Interlude I',
        interlude2: 'Interlude II',
        interlude3: 'Interlude III'
    };
    return names[actId] || actId;
}

// Drag and drop for section reordering
let draggedItem = null;

function setupSectionDragDrop() {
    const list = document.getElementById('sectionList');
    const items = list.querySelectorAll('.section-item');

    items.forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('dragenter', handleDragEnter);
        item.addEventListener('dragleave', handleDragLeave);
        item.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    draggedItem = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.id);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.section-item').forEach(item => {
        item.classList.remove('drag-over');
    });
    draggedItem = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    if (this !== draggedItem) {
        this.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

async function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');

    if (this === draggedItem) return;

    const list = document.getElementById('sectionList');
    const items = Array.from(list.querySelectorAll('.section-item'));
    
    const draggedIdx = items.indexOf(draggedItem);
    const targetIdx = items.indexOf(this);

    // Reorder in DOM
    if (draggedIdx < targetIdx) {
        this.parentNode.insertBefore(draggedItem, this.nextSibling);
    } else {
        this.parentNode.insertBefore(draggedItem, this);
    }

    // Update order in data
    const reorderedItems = Array.from(list.querySelectorAll('.section-item'));
    reorderedItems.forEach((item, index) => {
        const section = userData.sections.find(s => s.id === item.dataset.id);
        if (section) {
            section.order = index;
        }
    });

    // Save changes
    const username = getCurrentUser();
    if (username) {
        await saveUserData(username, userData);
    }
}
