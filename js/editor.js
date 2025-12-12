let currentAct = 'act1';
let userData = { sections: [], links: [] };
let currentSection = null;
let isDirty = false;
let bulkSelectMode = false;
let selectedSections = new Set();
let linkMode = false;
let linkChain = [];
let selectedLinkColor = null;

const LINK_COLORS = [
    { name: 'Red', color: '#e74c3c' },
    { name: 'Orange', color: '#e67e22' },
    { name: 'Yellow', color: '#f1c40f' },
    { name: 'Green', color: '#2ecc71' },
    { name: 'Cyan', color: '#00bcd4' },
    { name: 'Blue', color: '#3498db' },
    { name: 'Purple', color: '#9b59b6' },
    { name: 'Pink', color: '#e91e63' }
];

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
        // Ensure links array exists
        if (!userData.links) {
            userData.links = [];
        }
    } catch (error) {
        console.error('Failed to load user data:', error);
        userData = { sections: [], links: [] };
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
        renderExistingLinks();
        return;
    }

    list.innerHTML = sections.map(section => {
        const isSelected = selectedSections.has(section.id);
        const isActive = currentSection?.id === section.id && !bulkSelectMode && !linkMode;
        const isInLinkChain = linkChain.includes(section.id);
        const linkIndex = linkChain.indexOf(section.id);
        const sectionLink = getSectionLink(section.id);
        
        let prefix = '';
        if (linkMode) {
            prefix = `<span class="section-link-number" style="background: ${selectedLinkColor || '#666'}">${isInLinkChain ? linkIndex + 1 : ''}</span>`;
        } else if (bulkSelectMode) {
            prefix = `<span class="section-checkbox">${isSelected ? '☑' : '☐'}</span>`;
        } else {
            prefix = '<span class="section-drag-handle" title="Drag to reorder">⋮⋮</span>';
        }

        const linkIndicator = sectionLink && !linkMode ? `<span class="section-link-dot" style="background: ${sectionLink.color}" title="Part of linked chain"></span>` : '';

        return `
            <div class="section-item ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''} ${isInLinkChain ? 'in-link-chain' : ''} ${bulkSelectMode || linkMode ? 'select-mode' : ''}" data-id="${section.id}" draggable="${!bulkSelectMode && !linkMode}">
                ${prefix}
                ${linkIndicator}
                <span class="section-item-title">${escapeHtml(section.title || 'Untitled')}</span>
            </div>
        `;
    }).join('');

    // Add click handlers
    list.querySelectorAll('.section-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (linkMode) {
                // Toggle in link chain
                const sectionId = item.dataset.id;
                const idx = linkChain.indexOf(sectionId);
                if (idx >= 0) {
                    linkChain.splice(idx, 1);
                } else {
                    linkChain.push(sectionId);
                }
                updateLinkCount();
                renderSectionList();
                return;
            }

            if (bulkSelectMode) {
                // Toggle selection
                const sectionId = item.dataset.id;
                if (selectedSections.has(sectionId)) {
                    selectedSections.delete(sectionId);
                } else {
                    selectedSections.add(sectionId);
                }
                updateBulkCount();
                renderSectionList();
                return;
            }

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

    // Setup drag and drop (only when not in select/link mode)
    if (!bulkSelectMode && !linkMode) {
        setupSectionDragDrop();
    }

    renderExistingLinks();
}

function getSectionLink(sectionId) {
    return userData.links?.find(link => link.sectionIds.includes(sectionId));
}

function renderExistingLinks() {
    const container = document.getElementById('existingLinks');
    const list = document.getElementById('existingLinksList');
    
    // Filter links that have sections in current act
    const relevantLinks = (userData.links || []).filter(link => {
        return link.sectionIds.some(id => {
            const section = userData.sections.find(s => s.id === id);
            return section && section.act === currentAct;
        });
    });

    if (relevantLinks.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    list.innerHTML = relevantLinks.map(link => {
        const sectionNames = link.sectionIds
            .map(id => userData.sections.find(s => s.id === id))
            .filter(Boolean)
            .map(s => s.title || 'Untitled');
        
        return `
            <div class="existing-link-item" data-link-id="${link.id}">
                <span class="link-color-indicator" style="background: ${link.color}"></span>
                <span class="link-sections-preview">${sectionNames.join(' → ')}</span>
                <button class="link-delete-btn" title="Delete link">✕</button>
            </div>
        `;
    }).join('');

    // Add delete handlers
    list.querySelectorAll('.link-delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const linkItem = btn.closest('.existing-link-item');
            const linkId = linkItem.dataset.linkId;
            
            if (confirm('Delete this link chain?')) {
                userData.links = userData.links.filter(l => l.id !== linkId);
                await saveAllData();
                renderSectionList();
            }
        });
    });
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

    // Bulk select mode
    document.getElementById('bulkSelectBtn').addEventListener('click', enterBulkSelectMode);
    document.getElementById('bulkCancelBtn').addEventListener('click', exitBulkSelectMode);
    document.getElementById('bulkCopyBtn').addEventListener('click', openBulkCopyModal);

    // Bulk copy modal
    document.getElementById('cancelBulkCopy').addEventListener('click', () => {
        document.getElementById('bulkCopyModal').style.display = 'none';
    });
    document.getElementById('confirmBulkCopy').addEventListener('click', confirmBulkCopy);
    document.getElementById('bulkCopyModal').addEventListener('click', (e) => {
        if (e.target.id === 'bulkCopyModal') {
            document.getElementById('bulkCopyModal').style.display = 'none';
        }
    });

    // Link sections mode
    document.getElementById('linkSectionsBtn').addEventListener('click', enterLinkMode);
    document.getElementById('cancelLinkBtn').addEventListener('click', exitLinkMode);
    document.getElementById('saveLinkBtn').addEventListener('click', saveLink);

    // Initialize color picker
    initLinkColorPicker();

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

// Bulk selection functions
function enterBulkSelectMode() {
    bulkSelectMode = true;
    selectedSections.clear();
    document.getElementById('bulkSelectBtn').style.display = 'none';
    document.getElementById('bulkActionsActive').style.display = 'flex';
    updateBulkCount();
    renderSectionList();
}

function exitBulkSelectMode() {
    bulkSelectMode = false;
    selectedSections.clear();
    document.getElementById('bulkSelectBtn').style.display = 'block';
    document.getElementById('bulkActionsActive').style.display = 'none';
    renderSectionList();
}

function updateBulkCount() {
    const count = selectedSections.size;
    document.getElementById('bulkCount').textContent = `${count} selected`;
    document.getElementById('bulkCopyBtn').disabled = count === 0;
}

function openBulkCopyModal() {
    if (selectedSections.size === 0) {
        alert('Please select at least one section');
        return;
    }

    // Set default to a different act
    const select = document.getElementById('bulkCopyTargetAct');
    const options = Array.from(select.options);
    const differentAct = options.find(opt => opt.value !== currentAct);
    if (differentAct) {
        select.value = differentAct.value;
    }

    document.getElementById('bulkCopyCount').textContent = `${selectedSections.size} section${selectedSections.size > 1 ? 's' : ''} selected`;
    document.getElementById('bulkCopyModal').style.display = 'flex';
}

async function confirmBulkCopy() {
    const targetAct = document.getElementById('bulkCopyTargetAct').value;
    const targetActSections = userData.sections.filter(s => s.act === targetAct);
    let startOrder = targetActSections.length;

    // Copy each selected section
    for (const sectionId of selectedSections) {
        const originalSection = userData.sections.find(s => s.id === sectionId);
        if (originalSection) {
            const copiedSection = {
                id: generateId(),
                act: targetAct,
                title: originalSection.title,
                content: originalSection.content,
                order: startOrder++
            };

            // Copy size properties if they exist
            if (originalSection.width) copiedSection.width = originalSection.width;
            if (originalSection.height) copiedSection.height = originalSection.height;

            userData.sections.push(copiedSection);
        }
    }

    await saveAllData();

    document.getElementById('bulkCopyModal').style.display = 'none';
    alert(`${selectedSections.size} section${selectedSections.size > 1 ? 's' : ''} copied to ${getActName(targetAct)}`);
    exitBulkSelectMode();
}

// Link mode functions
function initLinkColorPicker() {
    const picker = document.getElementById('linkColorPicker');
    picker.innerHTML = LINK_COLORS.map((c, i) => `
        <div class="link-color-option ${i === 0 ? 'selected' : ''}" data-color="${c.color}" style="background: ${c.color}" title="${c.name}"></div>
    `).join('');

    selectedLinkColor = LINK_COLORS[0].color;

    picker.querySelectorAll('.link-color-option').forEach(opt => {
        opt.addEventListener('click', () => {
            picker.querySelectorAll('.link-color-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            selectedLinkColor = opt.dataset.color;
            renderSectionList();
        });
    });
}

function enterLinkMode() {
    linkMode = true;
    linkChain = [];
    document.getElementById('bulkSelectBtn').style.display = 'none';
    document.getElementById('linkSectionsBtn').style.display = 'none';
    document.getElementById('linkModeActive').style.display = 'flex';
    updateLinkCount();
    renderSectionList();
}

function exitLinkMode() {
    linkMode = false;
    linkChain = [];
    selectedLinkColor = LINK_COLORS[0].color;
    document.getElementById('bulkSelectBtn').style.display = 'block';
    document.getElementById('linkSectionsBtn').style.display = 'block';
    document.getElementById('linkModeActive').style.display = 'none';
    
    // Reset color picker selection
    const picker = document.getElementById('linkColorPicker');
    picker.querySelectorAll('.link-color-option').forEach((o, i) => {
        o.classList.toggle('selected', i === 0);
    });
    
    renderSectionList();
}

function updateLinkCount() {
    document.getElementById('linkCount').textContent = `${linkChain.length} in chain`;
    document.getElementById('saveLinkBtn').disabled = linkChain.length < 2;
}

async function saveLink() {
    if (linkChain.length < 2) {
        alert('Please select at least 2 sections to link');
        return;
    }

    // Check if any section is already in another link
    for (const sectionId of linkChain) {
        const existingLink = getSectionLink(sectionId);
        if (existingLink) {
            const section = userData.sections.find(s => s.id === sectionId);
            if (!confirm(`"${section?.title || 'Untitled'}" is already in a link chain. Remove it from the existing chain and add to this one?`)) {
                return;
            }
            // Remove from existing link
            existingLink.sectionIds = existingLink.sectionIds.filter(id => id !== sectionId);
            // Clean up empty links
            if (existingLink.sectionIds.length < 2) {
                userData.links = userData.links.filter(l => l.id !== existingLink.id);
            }
        }
    }

    const newLink = {
        id: generateId(),
        color: selectedLinkColor,
        sectionIds: [...linkChain]
    };

    userData.links.push(newLink);
    await saveAllData();

    alert(`Linked ${linkChain.length} sections together!`);
    exitLinkMode();
}
