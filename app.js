(function() {
  'use strict';

  const STORAGE_KEY = 'todolist_data';
  const MAX_IMAGE_SIZE = 500;
  const IMAGE_QUALITY = 0.6;
  const IMAGE_PLACEHOLDER = 'Detalhe a tarefa relacionada a esta imagem...';
  const MAX_IMAGES_PER_TASK = 5;
  const MAX_STORAGE_SIZE = 4 * 1024 * 1024;
  const MAX_PROJECTS = 10;
  const DEFAULT_PROJECT = { id: 'geral', name: 'Geral', color: '#bb86fc', icon: '📋' };
  const PRESET_COLORS = ['#bb86fc', '#ff9800', '#4caf50', '#2196f3', '#f44336', '#9c27b0', '#00bcd4', '#ffeb3b'];
  const PRESET_ICONS = ['📋', '💼', '🏠', '🎮', '📚', '🎨', '🏋️', '✈️', '💻', '🎵', '📝', '🔧'];

  let tasks = [];
  let projects = [];
  let activeProjectId = 'geral';
  let selectedId = null;
  let editingId = null;
  let currentFilter = null;
  let idCounter = 0;
  let saveDebounceTimer = null;
  let searchResults = [];
  let searchBarVisible = false;
  let sortedTaskIds = [];
  let currentTheme = 'dark';

const elements = {
    taskInput: document.getElementById('taskInput'),
    taskList: document.getElementById('taskList'),
    emptyState: document.getElementById('emptyState'),
    emptyTitle: document.getElementById('emptyTitle'),
    toast: document.getElementById('toast'),
    toastText: document.getElementById('toastText'),
    toastUndo: document.getElementById('toastUndo'),
    imageModal: document.getElementById('imageModal'),
    modalImage: document.getElementById('modalImage'),
    modalClose: document.getElementById('modalClose'),
    btnExport: document.getElementById('btnExport'),
    btnImport: document.getElementById('btnImport'),
    btnDeleteAll: document.getElementById('btnDeleteAll'),
    confirmDeleteAllModal: document.getElementById('confirmDeleteAllModal'),
    confirmDeleteAllMessage: document.getElementById('confirmDeleteAllMessage'),
    confirmDeleteAllInput: document.getElementById('confirmDeleteAllInput'),
    confirmDeleteAllBtn: document.getElementById('confirmDeleteAllBtn'),
    confirmDeleteAllCancel: document.getElementById('confirmDeleteAllCancel'),
    confirmCountdown: document.getElementById('confirmCountdown'),
    fileImport: document.getElementById('fileImport'),
    confirmModal: document.getElementById('confirmModal'),
    confirmCancel: document.getElementById('confirmCancel'),
    confirmDelete: document.getElementById('confirmDelete'),
    confirmMessage: document.getElementById('confirmMessage'),
    counterTotal: document.getElementById('counterTotal'),
    counterPending: document.getElementById('counterPending'),
    counterCompleted: document.getElementById('counterCompleted'),
    counterNone: document.getElementById('counterNone'),
    counterCritical: document.getElementById('counterCritical'),
    counterHigh: document.getElementById('counterHigh'),
    counterMedium: document.getElementById('counterMedium'),
    counterLow: document.getElementById('counterLow'),
    btnClearFilter: document.getElementById('btnClearFilter'),
    searchBar: document.getElementById('searchBar'),
    searchInput: document.getElementById('searchInput'),
    searchClose: document.getElementById('searchClose'),
    searchCount: document.getElementById('searchCount'),
    themeToggle: document.getElementById('themeToggle'),
    progressBar: document.getElementById('progressBar'),
    progressFill: document.getElementById('progressFill'),
    progressText: document.getElementById('progressText'),
    saveIndicator: document.getElementById('saveIndicator'),
  };

  let pendingDeleteId = null;
  let previousCounts = { total: 0, pending: 0, completed: 0 };
  let toastUndoCallback = null;
  let toastUndoTimer = null;
  let isSoundEnabled = true;
  let deleteAllCountdownTimer = null;
  let hasShownPriorityToast = false;

  function loadTasks() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        tasks = Array.isArray(parsed.tasks) ? parsed.tasks.map(t => ({
          ...t,
          priority: t.priority || 'none',
          images: t.image ? [t.image] : (t.images || []),
          projectId: t.projectId || 'geral'
        })) : [];
        projects = Array.isArray(parsed.projects) ? parsed.projects : [{ ...DEFAULT_PROJECT, createdAt: Date.now() }];
        activeProjectId = parsed.activeProjectId || 'geral';
        selectedId = parsed.selectedId || null;
        currentFilter = parsed.currentFilter || null;
        idCounter = parsed.idCounter || 0;
      } else {
        tasks = [];
        projects = [{ ...DEFAULT_PROJECT, createdAt: Date.now() }];
        activeProjectId = 'geral';
      }
    } catch (e) {
      console.error('Erro ao carregar tarefas:', e);
      tasks = [];
      projects = [{ ...DEFAULT_PROJECT, createdAt: Date.now() }];
      activeProjectId = 'geral';
    }
  }

  function getActiveProject() {
    return projects.find(p => p.id === activeProjectId) || projects[0];
  }

  function getProjectTasks() {
    return tasks.filter(t => t.projectId === activeProjectId);
  }

  function saveTasks() {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(() => {
      try {
        const data = { tasks, projects, activeProjectId, selectedId, currentFilter, idCounter };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        showSaveIndicator();
      } catch (e) {
        console.error('Erro ao salvar tarefas:', e);
        showToast('Erro ao salvar. Limite de armazenamento excedido.');
      }
    }, 300);
  }

  function saveTasksSync() {
    clearTimeout(saveDebounceTimer);
    try {
      const data = { tasks, projects, activeProjectId, selectedId, currentFilter, idCounter };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      showSaveIndicator();
      return true;
    } catch (e) {
      console.error('Erro ao salvar tarefas:', e);
      return false;
    }
  }

  function generateId() {
    return Date.now().toString() + '-' + (++idCounter);
  }

  function animateCounter(element) {
    element.classList.remove('flash');
    void element.offsetWidth;
    element.classList.add('flash');
    setTimeout(() => {
      element.classList.remove('flash');
    }, 500);
  }

  function createRipple(event) {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = event.clientX - rect.left - size / 2 + 'px';
    ripple.style.top = event.clientY - rect.top - size / 2 + 'px';
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }

  function showToast(message, type = '', undoCallback = null) {
    clearTimeout(toastUndoTimer);
    elements.toastText.textContent = message;
    elements.toast.className = 'toast visible ' + type;
    elements.toast.classList.toggle('undo-visible', !!undoCallback);
    toastUndoCallback = undoCallback;

    if (undoCallback) {
      elements.toastUndo.style.display = 'inline-block';
    } else {
      elements.toastUndo.style.display = 'none';
    }

    toastUndoTimer = setTimeout(() => {
      elements.toast.classList.add('hide');
      toastUndoCallback = null;
      setTimeout(() => {
        elements.toast.className = 'toast';
        elements.toastUndo.style.display = 'none';
      }, 300);
    }, undoCallback ? 4000 : 3000);
  }

  function showSaveIndicator() {
    elements.saveIndicator.classList.add('visible');
    clearTimeout(elements.saveIndicator._hideTimer);
    elements.saveIndicator._hideTimer = setTimeout(() => {
      elements.saveIndicator.classList.remove('visible');
    }, 1500);
  }

  function updateProgressBar() {
    const projectTasks = getProjectTasks();
    const total = projectTasks.length;
    const completed = projectTasks.filter(t => t.completed).length;
    const pct = total === 0 ? 0 : Math.round(completed / total * 100);
    elements.progressFill.style.width = pct + '%';
    elements.progressText.textContent = total === 0 ? '' : `${completed}/${total}`;
  }

  function updateEmptyStateMessage(filterActive) {
    if (!elements.emptyTitle) return;
    if (filterActive && tasks.length > 0) {
      elements.emptyTitle.textContent = 'Nenhuma tarefa com este filtro';
      elements.emptyTitle.nextElementSibling.textContent = 'Tente alterar ou limpar o filtro';
    } else if (searchResults.length === 0 && document.querySelector('.search-bar.visible')) {
      elements.emptyTitle.textContent = 'Nenhum resultado encontrado';
      elements.emptyTitle.nextElementSibling.textContent = 'Tente termos diferentes';
    } else {
      elements.emptyTitle.textContent = 'Nenhuma tarefa ainda';
      elements.emptyTitle.nextElementSibling.textContent = 'Digite uma tarefa acima ou cole uma imagem (Ctrl+V)';
    }
  }

  function playSound(type) {
    if (!isSoundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.value = 0.1;

      if (type === 'complete') {
        osc.frequency.value = 800;
        osc.start(0);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'create') {
        osc.frequency.value = 600;
        osc.start(0);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'delete') {
        osc.frequency.value = 300;
        osc.start(0);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch (e) {}
  }

  function renderTasks() {
    const projectTasks = getProjectTasks();
    const totalCount = projectTasks.length;
    const pendingCount = projectTasks.filter(t => !t.completed).length;
    const completedCount = projectTasks.filter(t => t.completed).length;
    const noneCount = projectTasks.filter(t => t.priority === 'none' && !t.completed).length;
    const criticalCount = projectTasks.filter(t => t.priority === 'critical' && !t.completed).length;
    const highCount = projectTasks.filter(t => t.priority === 'high' && !t.completed).length;
    const mediumCount = projectTasks.filter(t => t.priority === 'medium' && !t.completed).length;
    const lowCount = projectTasks.filter(t => t.priority === 'low' && !t.completed).length;

    elements.counterTotal.textContent = `${totalCount} tarefa${totalCount !== 1 ? 's' : ''}`;
    elements.counterPending.textContent = `${pendingCount} pendente${pendingCount !== 1 ? 's' : ''}`;
    elements.counterCompleted.textContent = `${completedCount} concluída${completedCount !== 1 ? 's' : ''}`;
    elements.counterNone.textContent = `${noneCount} sem priori.`;
    elements.counterCritical.textContent = `${criticalCount} crítica`;
    elements.counterHigh.textContent = `${highCount} alta`;
    elements.counterMedium.textContent = `${mediumCount} média`;
    elements.counterLow.textContent = `${lowCount} baixa`;

    // Animar contadores que mudaram
    if (previousCounts.total !== totalCount) {
      animateCounter(elements.counterTotal);
    }
    if (previousCounts.pending !== pendingCount) {
      animateCounter(elements.counterPending);
    }
    if (previousCounts.completed !== completedCount) {
      animateCounter(elements.counterCompleted);
    }
    previousCounts = { total: totalCount, pending: pendingCount, completed: completedCount };

    elements.btnClearFilter.style.display = currentFilter ? 'inline-block' : 'none';

    let filteredTasks = projectTasks;
    if (currentFilter) {
      if (currentFilter === 'none') {
        filteredTasks = projectTasks.filter(t => t.priority === 'none');
      } else if (currentFilter === 'pending') {
        filteredTasks = projectTasks.filter(t => !t.completed);
      } else if (currentFilter === 'completed') {
        filteredTasks = projectTasks.filter(t => t.completed);
      } else {
        filteredTasks = projectTasks.filter(t => t.priority === currentFilter);
      }
    }

    if (filteredTasks.length === 0) {
      elements.taskList.innerHTML = '';
      elements.emptyState.classList.add('visible');
      return;
    }

    elements.emptyState.classList.remove('visible');
    updateEmptyStateMessage(!!currentFilter);

    const sortedTasks = sortTasksByPriority(filteredTasks);
    sortedTaskIds = sortedTasks.map(t => t.id);

    // Renderizar com seções Pendentes e Concluídas
    const pendingTasks = sortedTasks.filter(t => !t.completed);
    const completedTasks = sortedTasks.filter(t => t.completed);

    let html = '';
    if (pendingTasks.length > 0) {
      html += renderTaskSection('Pendentes', pendingTasks, false);
    }
    if (completedTasks.length > 0) {
      html += renderTaskSection('Concluídas', completedTasks, true);
    }

    elements.taskList.innerHTML = html;
    renderProjectTabs();
    attachTaskEvents();
    attachSectionEvents();
    updateProgressBar();
  }

  function renderProjectTabs() {
    const tabsContainer = document.getElementById('projectTabs');
    if (!tabsContainer) return;
    const active = getActiveProject();
    const btnHtml = projects.length < MAX_PROJECTS ? '<button class="btn-add-project" id="btnAddProject" title="Novo projeto">+</button>' : '';
    tabsContainer.innerHTML = projects.map(p => {
      const isActive = p.id === activeProjectId;
      const count = tasks.filter(t => t.projectId === p.id && !t.completed).length;
      return `<div class="project-tab ${isActive ? 'active' : ''}" data-project-id="${p.id}" title="${p.name}">
        <span>${p.icon}</span>
        <span>${p.name}</span>
        <span class="tab-count">${count}</span>
      </div>`;
    }).join('') + btnHtml;

    // Remove old event listeners by replacing the container
    const newTabs = tabsContainer.cloneNode(true);
    tabsContainer.parentNode.replaceChild(newTabs, tabsContainer);

    // Re-attach events
    const activeTabs = document.getElementById('projectTabs');
    document.querySelectorAll('.project-tab').forEach(tab => {
      tab.addEventListener('click', () => switchProject(tab.dataset.projectId));
      tab.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        openProjectMenu(e, tab.dataset.projectId);
      });
    });
    const addBtn = document.getElementById('btnAddProject');
    if (addBtn) addBtn.addEventListener('click', () => openProjectModal('create'));
  }

  function switchProject(projectId) {
    if (projectId === activeProjectId) return;
    activeProjectId = projectId;
    selectedId = null;
    editingId = null;
    currentFilter = null;
    saveTasksSync();
    renderTasks();
    const project = projects.find(p => p.id === projectId);
    if (project) showToast(`${project.icon} ${project.name}`, 'info');
  }

  function createProject(name, color, icon) {
    if (projects.length >= MAX_PROJECTS) {
      showToast(`Máximo de ${MAX_PROJECTS} projetos`, 'warning');
      return null;
    }
    const nameCmp = name.toLowerCase().trim();
    if (projects.some(p => p.name.toLowerCase().trim() === nameCmp)) {
      showToast('Já existe um projeto com este nome', 'warning');
      return null;
    }
    const project = {
      id: 'proj-' + Date.now(),
      name: name.trim().substring(0, 20),
      color: color || '#bb86fc',
      icon: icon || '📋',
      createdAt: Date.now()
    };
    projects.push(project);
    activeProjectId = project.id;
    saveTasksSync();
    renderTasks();
    showToast(`Projeto "${project.name}" criado!`, 'success');
    return project;
  }

  function updateProject(projectId, updates) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    if (updates.name) {
      const nameCmp = updates.name.toLowerCase().trim();
      const name = updates.name.trim().substring(0, 20);
      if (projects.some(p => p.id !== projectId && p.name.toLowerCase().trim() === nameCmp)) {
        showToast('Já existe um projeto com este nome', 'warning');
        return;
      }
      project.name = name;
    }
    if (updates.color) project.color = updates.color;
    if (updates.icon) project.icon = updates.icon;
    saveTasksSync();
    renderTasks();
  }

  function deleteProject(projectId) {
    if (projectId === 'geral') {
      showToast('O projeto "Geral" não pode ser excluído', 'warning');
      return;
    }
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const taskCount = tasks.filter(t => t.projectId === projectId).length;
    if (taskCount > 0) {
      tasks.forEach(t => { if (t.projectId === projectId) t.projectId = 'geral'; });
    }
    projects = projects.filter(p => p.id !== projectId);
    if (activeProjectId === projectId) {
      activeProjectId = 'geral';
      selectedId = null;
      currentFilter = null;
    }
    saveTasksSync();
    renderTasks();
    showToast(`Projeto "${project.name}" excluído. ${taskCount > 0 ? taskCount + ' tarefas movidas para Geral.' : ''}`, 'warning');
  }

  function openProjectModal(mode, projectId) {
    const modal = document.getElementById('projectModal');
    const title = document.getElementById('projectModalTitle');
    const input = document.getElementById('projectNameInput');
    const confirmBtn = document.getElementById('projectModalConfirm');
    if (!modal || !title || !input || !confirmBtn) return;
    let selectedColor = '#bb86fc';
    let selectedIcon = '📋';
    if (mode === 'edit' && projectId) {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        input.value = project.name;
        selectedColor = project.color;
        selectedIcon = project.icon;
      }
      title.textContent = 'Editar Projeto';
      confirmBtn.textContent = 'Salvar';
      confirmBtn.dataset.mode = 'edit';
      confirmBtn.dataset.projectId = projectId;
    } else {
      input.value = '';
      title.textContent = 'Novo Projeto';
      confirmBtn.textContent = 'Criar';
      confirmBtn.dataset.mode = 'create';
      delete confirmBtn.dataset.projectId;
    }
    renderColorPicker(selectedColor);
    renderIconPicker(selectedIcon);
    modal.classList.add('visible');
    setTimeout(() => input.focus(), 100);
  }

  function closeProjectModal() {
    document.getElementById('projectModal').classList.remove('visible');
  }

  function renderColorPicker(selected) {
    const picker = document.getElementById('colorPicker');
    if (!picker) return;
    picker.innerHTML = PRESET_COLORS.map(c =>
      `<div class="color-option ${c === selected ? 'selected' : ''}" style="background:${c}" data-color="${c}"></div>`
    ).join('');
    picker.querySelectorAll('.color-option').forEach(el => {
      el.addEventListener('click', () => {
        picker.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
      });
    });
  }

  function renderIconPicker(selected) {
    const picker = document.getElementById('iconPicker');
    if (!picker) return;
    picker.innerHTML = PRESET_ICONS.map(i =>
      `<div class="icon-option ${i === selected ? 'selected' : ''}" data-icon="${i}">${i}</div>`
    ).join('');
    picker.querySelectorAll('.icon-option').forEach(el => {
      el.addEventListener('click', () => {
        picker.querySelectorAll('.icon-option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
      });
    });
  }

  function getSelectedColor() {
    const sel = document.querySelector('#colorPicker .color-option.selected');
    return sel ? sel.dataset.color : '#bb86fc';
  }

  function getSelectedIcon() {
    const sel = document.querySelector('#iconPicker .icon-option.selected');
    return sel ? sel.dataset.icon : '📋';
  }

  function openProjectMenu(e, projectId) {
    if (projectId === 'geral') {
      showToast('O projeto "Geral" não pode ser editado', 'info');
      return;
    }
    const menu = document.getElementById('projectMenu');
    if (!menu) return;
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    menu.dataset.projectId = projectId;
    menu.classList.add('visible');
    document.addEventListener('click', closeProjectMenu, { once: true });
    document.addEventListener('contextmenu', closeProjectMenu, { once: true });
    e.stopPropagation();
  }

  function closeProjectMenu() {
    const menu = document.getElementById('projectMenu');
    if (menu) menu.classList.remove('visible');
  }

  function sortTasksByPriority(taskList) {
    const priorityOrder = { critical: 1, high: 2, medium: 3, low: 4, none: 5 };
    return [...taskList].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (priorityOrder[a.priority] || 5) - (priorityOrder[b.priority] || 5);
    });
  }

  function renderTaskItem(task) {
    const isEditing = editingId === task.id;
    const isImageOnlyTask = task.images && task.images.length > 0 && (!task.text || task.text === IMAGE_PLACEHOLDER);
    const rawText = isImageOnlyTask ? IMAGE_PLACEHOLDER : task.text;
    const escapedText = escapeHtml(rawText);
    let linkedText = linkify(escapedText);

    // Highlight das palavras buscadas
    if (searchResults.includes(task.id) && elements.searchInput.value.trim()) {
      const searchTerms = elements.searchInput.value.toLowerCase().trim().split(/\s+/);
      searchTerms.forEach(term => {
        const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
        linkedText = linkedText.replace(regex, '<mark>$1</mark>');
      });
    }

    const displayText = isImageOnlyTask ? IMAGE_PLACEHOLDER : linkedText;
    const maxLen = window.innerWidth <= 480 ? 160 : 300;
    const isLongText = !isImageOnlyTask && task.text.length > maxLen;
    const shortText = isLongText ? linkedText.substring(0, maxLen) + '...' : linkedText;
    const textToRender = isLongText ? shortText : linkedText;
    const longTextId = 'long-' + task.id;
    const placeholderClass = isImageOnlyTask && !isEditing ? 'is-placeholder' : '';

    if (isEditing) {
      return `
        <div class="task-item ${task.id === selectedId ? 'selected' : ''} ${task.completed ? 'completed' : ''}" data-task-id="${task.id}" draggable="true">
          <span class="drag-handle">⋮⋮</span>
          <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} data-task-id="${task.id}">
          <div class="task-content">
            <textarea class="task-text-input" data-task-id="${task.id}">${escapeHtml(task.text)}</textarea>
            ${imageHtml}
          </div>
          ${priorityButtons}
          <div class="task-actions">
            <button class="btn btn-copy" data-task-id="${task.id}" title="Copiar texto" aria-label="Copiar texto">📋</button>
            <button class="btn btn-delete" data-task-id="${task.id}" title="Excluir" aria-label="Excluir tarefa">&times;</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="task-item ${task.id === selectedId ? 'selected' : ''} ${task.completed ? 'completed' : ''}" data-task-id="${task.id}" draggable="true">
        <span class="drag-handle">⋮⋮</span>
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} data-task-id="${task.id}">
        <div class="task-content">
          <div class="task-text ${placeholderClass}" data-task-id="${task.id}">${isLongText ? `<span class="task-text-short" id="${longTextId}">${textToRender}</span><span class="task-text-full" id="${longTextId}-full" style="display:none">${linkedText}</span>` : textToRender}${isLongText ? '<button class="btn-expand" data-task-id="' + task.id + '">Ver mais</button>' : ''}</div>
          ${imageHtml}
        </div>
        ${priorityButtons}
        <div class="task-actions">
          <button class="btn btn-copy" data-task-id="${task.id}" title="Copiar texto" aria-label="Copiar texto">📋</button>
          <button class="btn btn-delete" data-task-id="${task.id}" title="Excluir" aria-label="Excluir tarefa">&times;</button>
        </div>
      </div>
    `;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function linkify(text) {
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(com|net|org|br|io|dev|app|live)[^\s]*)/gi;
    return text.replace(urlRegex, (match) => {
      let url = match;
      if (!url.startsWith('http') && !url.startsWith('www')) {
        url = 'https://' + url;
      }
      return `<a href="${url}" target="_blank" rel="noopener" class="task-link">${match}</a>`;
    });
  }

  function renderTaskSection(title, sectionTasks, isCompleted) {
    const itemsHtml = sectionTasks.map(task => renderTaskItem(task)).join('');
    const collapsed = isCompleted ? 'collapsed' : '';
    const infoIcon = !isCompleted ? '<span class="section-info" data-tip="📌 Tarefas com prioridade s\u00e3o ordenadas automaticamente.\n\u2195 Arraste para reordenar entre tarefas de mesma prioridade." title="Ordena\u00e7\u00e3o">i</span>' : '';
    return `
      <div class="task-section ${collapsed}" data-completed="${isCompleted}">
        <div class="task-section-header">
          <span class="section-arrow ${collapsed}">▼</span>
          <span class="section-title">${title}</span>
          <span class="section-count">${sectionTasks.length}</span>
          ${infoIcon}
        </div>
        <div class="task-items">
          ${itemsHtml}
        </div>
      </div>
    `;
  }

  function attachSectionEvents() {
    document.querySelectorAll('.task-section-header').forEach(header => {
      header.addEventListener('click', () => {
        const section = header.closest('.task-section');
        section.classList.toggle('collapsed');
        const arrow = header.querySelector('.section-arrow');
        arrow.classList.toggle('collapsed');
      });
    });
  }

  function attachTaskEvents() {
    document.querySelectorAll('.task-item').forEach(item => {
      const taskId = item.dataset.taskId;

      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('drag-handle')) return;
        if (e.target.classList.contains('task-checkbox')) return;
        if (e.target.classList.contains('btn') || e.target.closest('.btn')) return;
        if (e.target.classList.contains('task-image')) return;
        if (e.target.classList.contains('task-priority-btn')) return;
        if (e.target.closest('.task-priority')) return;
        if (e.dataTransfer?.getData('text/plain')) return;
        if (editingId === taskId) return;
        selectTask(taskId);
      });

      const checkbox = item.querySelector('.task-checkbox');
      if (checkbox) {
        checkbox.addEventListener('change', () => toggleComplete(taskId));
      }

      const textEl = item.querySelector('.task-text');
      if (textEl) {
        textEl.addEventListener('dblclick', () => startEditing(taskId));
      }

      const textInput = item.querySelector('.task-text-input');
      if (textInput) {
        textInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            saveEditing(taskId);
          }
          if (e.key === 'Escape') {
            cancelEditing();
          }
        });
        textInput.addEventListener('blur', () => {
          if (editingId === taskId) {
            saveEditing(taskId);
          }
        });
      }

      const deleteBtn = item.querySelector('.btn-delete');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          confirmDeleteTask(taskId);
        });
      }

      const copyBtn = item.querySelector('.btn-copy');
      if (copyBtn) {
        copyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const task = tasks.find(t => t.id === taskId);
          if (task) {
            navigator.clipboard.writeText(task.text).then(() => {
              copyBtn.textContent = '✅';
              showToast('Texto copiado!', 'success');
              setTimeout(() => { copyBtn.textContent = '📋'; }, 1000);
            }).catch(() => showToast('Erro ao copiar', 'error'));
          }
        });
      }

      const expandBtn = item.querySelector('.btn-expand');
      if (expandBtn) {
        expandBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const shortEl = item.querySelector('.task-text-short');
          const fullEl = item.querySelector('.task-text-full');
          if (shortEl && fullEl) {
            const isExpanded = fullEl.style.display !== 'none';
            shortEl.style.display = isExpanded ? '' : 'none';
            fullEl.style.display = isExpanded ? 'none' : '';
            expandBtn.textContent = isExpanded ? 'Ver mais' : 'Ver menos';
          }
        });
      }

      const imageContainer = item.querySelector('.task-images-container');
      if (imageContainer) {
        imageContainer.addEventListener('click', (e) => {
          const target = e.target;
          if (target.tagName === 'IMG' && target.classList.contains('task-image')) {
            e.stopPropagation();
            openModal(target.src);
          } else if (target.classList.contains('btn-delete-image')) {
            e.stopPropagation();
            const index = parseInt(target.dataset.imageIndex, 10);
            deleteTaskImage(taskId, isNaN(index) ? null : index);
          } else if (target.classList.contains('btn-add-image')) {
            e.stopPropagation();
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            input.onchange = async (evt) => {
              for (const file of evt.target.files) {
                if (file.type.startsWith('image/')) {
                  const base64 = await compressImage(file);
                  addImageToTask(taskId, base64);
                }
              }
            };
            input.click();
          }
        });
      }

      const priorityBtns = item.querySelectorAll('.task-priority-btn');
      priorityBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          setPriority(taskId, btn.dataset.priority);
        });
      });

      item.addEventListener('dragstart', (e) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        item.classList.add('dragging');
        e.dataTransfer.setData('text/plain', taskId);
        e.dataTransfer.effectAllowed = 'move';
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        document.querySelectorAll('.task-item').forEach(el => el.classList.remove('drag-over'));
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        item.classList.add('drag-over');
      });

      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        const draggedId = e.dataTransfer.getData('text/plain');
        const fromIndex = tasks.findIndex(t => t.id === draggedId);
        const toIndex = tasks.findIndex(t => t.id === taskId);
        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
        const sourceTask = tasks[fromIndex];
        const targetTask = tasks[toIndex];
        if (sourceTask.priority !== targetTask.priority) {
          showToast('Só é possível reordenar entre tarefas de mesma prioridade', 'warning');
          return;
        }
        reorderTasks(fromIndex, toIndex);
      });
    });
  }

  function createTask(text, image = null) {
    const task = {
      id: generateId(),
      text: text || IMAGE_PLACEHOLDER,
      completed: false,
      images: image ? [image] : [],
      priority: 'none',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      projectId: activeProjectId
    };
    tasks.unshift(task);

    if (!saveTasksSync()) {
      tasks.shift();
      showToast('Limite de armazenamento excedido. Não é possível adicionar mais tarefas com imagens.', 'error');
      return null;
    }

    renderTasks();
    selectTask(task.id);

    // Scroll até a tarefa criada com animação
    const taskEl = document.querySelector(`[data-task-id="${task.id}"]`);
    if (taskEl) {
      taskEl.classList.add('task-item-enter');
      taskEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (image && !text) {
      setTimeout(() => {
        startEditing(task.id);
      }, 150);
    }
    return task;
  }

  function addTask() {
    const text = elements.taskInput.value.trim();
    if (!text) return;
    createTask(text);
    elements.taskInput.value = '';
    playSound('create');
    showToast('Tarefa cadastrada!', 'success');
  }

  function selectTask(taskId) {
    selectedId = taskId;
    saveTasks();
    renderTasks();
  }

  function clearSelection() {
    if (editingId) {
      saveEditing(editingId);
    }
    if (selectedId) {
      selectedId = null;
      saveTasks();
      renderTasks();
    }
  }

  function exportTasksToTxt() {
    if (tasks.length === 0) {
      showToast('Nenhuma tarefa para exportar');
      return;
    }

    elements.btnExport.disabled = true;
    elements.btnExport.textContent = 'Exportando...';

    const priorityLabels = { critical: 'CRÍTICA', high: 'ALTA', medium: 'MÉDIA', low: 'BAIXA', none: '-' };
    const priorityOrder = { critical: 1, high: 2, medium: 3, low: 4, none: 5 };
    const statusLabels = { false: 'Pendente', true: 'Concluída' };

    const sortedTasks = [...tasks].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (priorityOrder[a.priority] || 5) - (priorityOrder[b.priority] || 5);
    });

    let pendingCount = 0;
    let completedCount = 0;

    let txt = '#|Status|Descrição|Prioridade\n';
    txt += '---|------|----------|----------\n';

    sortedTasks.forEach((task, index) => {
      const num = String(index + 1);
      const status = statusLabels[task.completed];
      const priority = priorityLabels[task.priority] || '-';
      const desc = task.text.replace(/\|/g, ' ').replace(/\n/g, ' ');

      txt += `${num}|${status}|${desc}|${priority}\n`;

      if (task.completed) {
        completedCount++;
      } else {
        pendingCount++;
      }
    });

    txt += '\n';
    txt += `Total: ${tasks.length} tarefas | Pendentes: ${pendingCount} | Concluídas: ${completedCount}\n`;

    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tarefas_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    elements.btnExport.disabled = false;
    elements.btnExport.textContent = 'Exportar Tarefas (TXT)';
    showToast('Tarefas exportadas com sucesso!');
  }

  function toggleComplete(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      task.updatedAt = Date.now();
      saveTasks();
      renderTasks();
      if (task.completed) playSound('complete');
      showToast(task.completed ? 'Tarefa concluída!' : 'Tarefa marcada como pendente', task.completed ? 'success' : '');
    }
  }

  function setPriority(taskId, priority) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const wasNone = task.priority === 'none';
      task.priority = task.priority === priority ? 'none' : priority;
      task.updatedAt = Date.now();
      saveTasks();
      renderTasks();
      const labels = { critical: 'Crítica', high: 'Alta', medium: 'Média', low: 'Baixa' };
      const types = { critical: 'error', high: 'warning', medium: 'info', low: 'success', none: 'info' };
      showToast(task.priority !== 'none' ? `Prioridade: ${labels[task.priority]}` : 'Prioridade removida', types[task.priority] || 'info');
      if (wasNone && task.priority !== 'none' && !hasShownPriorityToast) {
        hasShownPriorityToast = true;
        setTimeout(() => {
          showToast('🔔 Tarefas com prioridade s\u00e3o ordenadas automaticamente. Arraste apenas tarefas sem prioridade.', 'info');
        }, 600);
      }
    }
  }

  function reorderTasks(fromIndex, toIndex) {
    const taskToMove = tasks[fromIndex];
    const targetTask = tasks[toIndex];
    if (taskToMove.priority !== targetTask.priority) {
      showToast('Só é possível reordenar entre tarefas de mesma prioridade', 'warning');
      return;
    }
    const [moved] = tasks.splice(fromIndex, 1);
    tasks.splice(toIndex, 0, moved);
    saveTasks();
    renderTasks();
  }

  function handleDrop(event) {
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const target = event.target;
    const isFromInput = target === elements.taskInput || target.tagName === 'TEXTAREA' || target.classList.contains('task-text-input');
    if (isFromInput) return;

    event.preventDefault();

    const file = files[0];
    if (file.type.startsWith('image/')) {
      processImage(file, !!selectedId);
    }
  }

  function startEditing(taskId) {
    editingId = taskId;
    selectedId = taskId;
    saveTasks();
    renderTasks();
    setTimeout(() => {
      const textarea = document.querySelector('.task-text-input');
      if (textarea) {
        const task = tasks.find(t => t.id === taskId);
        textarea.focus();
        if (task && task.text !== IMAGE_PLACEHOLDER) {
          textarea.select();
        }
      }
    }, 0);
  }

  function saveEditing(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const textarea = document.querySelector('.task-text-input');
    if (textarea) {
      const newText = textarea.value.trim();
      if (newText) {
        task.text = newText;
        task.updatedAt = Date.now();
        saveTasks();
        showToast('Edição salva!', 'success');
      } else if (task.images && task.images.length > 0) {
        task.text = IMAGE_PLACEHOLDER;
        task.updatedAt = Date.now();
        saveTasks();
      }
    }
    editingId = null;
    renderTasks();
  }

  function cancelEditing() {
    editingId = null;
    renderTasks();
  }

  function deleteTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const backupTask = { ...task };
    const taskEl = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskEl) {
      taskEl.classList.add('task-item-exit');
      setTimeout(() => {
        taskEl.remove();
        tasks = tasks.filter(t => t.id !== taskId);
        if (selectedId === taskId) {
          selectedId = null;
        }
        saveTasks();
        renderTasks();
        playSound('delete');
        showToast('Tarefa excluída!', 'warning', () => {
          tasks.unshift(backupTask);
          saveTasks();
          renderTasks();
          showToast('Tarefa restaurada!', 'success');
        });
      }, 300);
    } else {
      tasks = tasks.filter(t => t.id !== taskId);
      if (selectedId === taskId) {
        selectedId = null;
      }
      saveTasks();
      renderTasks();
      playSound('delete');
      showToast('Tarefa excluída!', 'warning', () => {
        tasks.unshift(backupTask);
        saveTasks();
        renderTasks();
        showToast('Tarefa restaurada!', 'success');
      });
    }
  }

  function confirmDeleteTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    const taskText = task ? (task.text.length > 50 ? task.text.slice(0, 50) + '...' : task.text) : 'esta tarefa';
    pendingDeleteId = taskId;
    elements.confirmMessage.textContent = `Excluir "${taskText}"?`;
    elements.confirmModal.classList.add('visible');
  }

  function executeDelete() {
    const taskIdToDelete = pendingDeleteId;
    const task = tasks.find(t => t.id === taskIdToDelete);
    const backupTask = task ? { ...task } : null;
    if (taskIdToDelete) {
      const taskEl = document.querySelector(`[data-task-id="${taskIdToDelete}"]`);
      if (taskEl) {
        taskEl.classList.add('task-item-exit');
        setTimeout(() => {
          taskEl.remove();
          tasks = tasks.filter(t => t.id !== taskIdToDelete);
          if (selectedId === taskIdToDelete) {
            selectedId = null;
          }
          saveTasks();
          renderTasks();
          playSound('delete');
          showToast('Tarefa excluída!', 'warning', () => {
            if (backupTask) {
              tasks.unshift(backupTask);
              saveTasks();
              renderTasks();
              showToast('Tarefa restaurada!', 'success');
            }
          });
          pendingDeleteId = null;
        }, 300);
      } else {
        tasks = tasks.filter(t => t.id !== taskIdToDelete);
        if (selectedId === taskIdToDelete) {
          selectedId = null;
        }
        saveTasks();
        renderTasks();
        playSound('delete');
        showToast('Tarefa excluída!', 'warning', () => {
          if (backupTask) {
            tasks.unshift(backupTask);
            saveTasks();
            renderTasks();
            showToast('Tarefa restaurada!', 'success');
          }
        });
        pendingDeleteId = null;
      }
    }
    closeConfirmModal();
  }

  function closeConfirmModal() {
    elements.confirmModal.classList.remove('visible');
    pendingDeleteId = null;
  }

  function importTasksFromTxt(event) {
    const file = event.target.files[0];
    if (!file) return;

    elements.btnImport.disabled = true;
    elements.btnImport.textContent = 'Importando...';

    const reader = new FileReader();
    reader.onload = function(e) {
      importFromContent(e.target.result, false);
      elements.btnImport.disabled = false;
      elements.btnImport.textContent = 'Importar Tarefas (TXT)';
    };
    reader.onerror = function() {
      showToast('Erro ao ler arquivo', 'error');
      elements.btnImport.disabled = false;
      elements.btnImport.textContent = 'Importar Tarefas (TXT)';
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  function importFromContent(content, isRestore = false) {
    const lines = content.split('\n');
    const priorityMap = { 'CRÍTICA': 'critical', 'ALTA': 'high', 'MÉDIA': 'medium', 'BAIXA': 'low', '-': 'none' };
    const statusMap = { 'Pendente': false, 'Concluída': true, 'Pendentes': false, 'Concluídas': true };
    const importedTasks = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('═') || trimmed.startsWith('─') || trimmed.startsWith('Total:')) continue;
      if (trimmed.startsWith('#') || trimmed.startsWith('---')) continue;

      let parts = trimmed.split('|');
      if (parts.length >= 4) {
        const num = parts[0].trim();
        const statusStr = parts[1].trim();
        let desc = parts.slice(2, parts.length - 1).join('|').trim();
        const priorStr = parts[parts.length - 1].trim();

        if (num && !isNaN(parseInt(num))) {
          importedTasks.push({
            id: generateId(),
            text: desc,
            completed: statusMap[statusStr] || false,
            images: [],
            priority: priorityMap[priorStr] || 'none',
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        }
      }
    }

    if (importedTasks.length === 0) {
      if (!isRestore) {
        showToast('Nenhuma tarefa encontrada', 'error');
      }
      return;
    }

    tasks = importedTasks.reverse();
    saveTasksSync();
    renderTasks();
    showToast(isRestore ? `${tasks.length} tarefas restauradas do backup!` : `${tasks.length} tarefas importadas!`, 'success');
  }

  async function handlePaste(event) {
    const target = event.target;
    const isFromInput = target === elements.taskInput || target.tagName === 'TEXTAREA' || target.classList.contains('task-text-input');
    if (isFromInput) return;

    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        const blob = item.getAsFile();
        if (blob) {
          await processImage(blob, true);
        }
        return;
      }
    }

    const text = event.clipboardData?.getData('text');
    if (text && text.trim()) {
      event.preventDefault();
      createTask(text.trim());
    }
  }

  async function processImage(blob, attachToSelected = false) {
    if (blob.size > 500 * 1024) {
      showToast('Imagem muito grande (máx 500KB)');
      return;
    }

    try {
      const base64 = await compressImage(blob);

      if (attachToSelected && selectedId) {
        const task = tasks.find(t => t.id === selectedId);
        if (task) {
          if (!task.images) task.images = [];
          if (task.images.length >= MAX_IMAGES_PER_TASK) {
            showToast(`Máximo de ${MAX_IMAGES_PER_TASK} imagens por tarefa`, 'warning');
            return;
          }
          task.images.push(base64);
          task.updatedAt = Date.now();
          if (!saveTasksSync()) {
            task.images.pop();
            showToast('Limite de armazenamento excedido.', 'error');
            return;
          }
          renderTasks();
          showToast('Imagem anexada à tarefa');
          return;
        }
      }

      createTask('', base64);
    } catch (e) {
      console.error('Erro ao processar imagem:', e);
      showToast('Erro ao processar imagem');
    }
  }

  function compressImage(blob) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
          if (width > height) {
            height = (height / width) * MAX_IMAGE_SIZE;
            width = MAX_IMAGE_SIZE;
          } else {
            width = (width / height) * MAX_IMAGE_SIZE;
            height = MAX_IMAGE_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', IMAGE_QUALITY));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  }

  function openModal(src) {
    elements.modalImage.src = src;
    elements.imageModal.classList.add('visible');
  }

  function closeModal() {
    elements.imageModal.classList.remove('visible');
    elements.modalImage.src = '';
  }

  function deleteTaskImage(taskId, imageIndex) {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.images && task.images.length > 0) {
      const idx = typeof imageIndex === 'number' ? imageIndex : task.images.length - 1;
      if (idx >= 0 && idx < task.images.length) {
        task.images.splice(idx, 1);
        task.updatedAt = Date.now();
        saveTasks();
        renderTasks();
        showToast('Imagem removida!', 'info');
      }
    }
  }

  function addImageToTask(taskId, base64) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      if (!task.images) task.images = [];
      if (task.images.length >= MAX_IMAGES_PER_TASK) {
        showToast(`Máximo de ${MAX_IMAGES_PER_TASK} imagens por tarefa`, 'warning');
        return;
      }
      task.images.push(base64);
      task.updatedAt = Date.now();
      if (!saveTasksSync()) {
        task.images.pop();
        showToast('Limite de armazenamento excedido.', 'error');
        return;
      }
      renderTasks();
      showToast('Imagem adicionada!', 'success');
    }
  }

  function addTaskByEnter(event) {
    if (event.key === 'Enter' && !event.isComposing) {
      event.preventDefault();
      const text = elements.taskInput.value.trim();
      if (text) {
        addTask();
      }
    }
  }

  function init() {
    elements.taskInput.addEventListener('keydown', addTaskByEnter);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('dragover', (e) => e.preventDefault());
    document.addEventListener('drop', handleDrop);
    elements.searchBar.style.display = 'none';
    elements.searchBar.classList.remove('visible');
    loadTasks();
    renderTasks();

    // Toast undo
    elements.toastUndo.addEventListener('click', () => {
      if (toastUndoCallback) {
        toastUndoCallback();
        toastUndoCallback = null;
        clearTimeout(toastUndoTimer);
        elements.toast.classList.add('hide');
        setTimeout(() => {
          elements.toast.className = 'toast';
          elements.toastUndo.style.display = 'none';
        }, 300);
      }
    });

    // Auto focus no campo de entrada
    elements.taskInput.focus();

    // Som toggle no footer
    const soundBtn = document.createElement('span');
    soundBtn.className = 'sound-indicator';
    soundBtn.innerHTML = '🔊 Som';
    soundBtn.title = 'Alternar som';
    soundBtn.addEventListener('click', () => {
      isSoundEnabled = !isSoundEnabled;
      soundBtn.classList.toggle('muted');
      soundBtn.innerHTML = isSoundEnabled ? '🔊 Som' : '🔇 Som';
    });
    document.querySelector('.footer .shortcuts')?.appendChild(soundBtn);

    // Help modal
    const helpBtn = document.getElementById('helpBtn');
    const helpModal = document.getElementById('helpModal');
    const helpClose = document.getElementById('helpClose');
    if (helpBtn && helpModal && helpClose) {
      helpBtn.addEventListener('click', () => helpModal.classList.add('visible'));
      helpClose.addEventListener('click', () => helpModal.classList.remove('visible'));
      helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) helpModal.classList.remove('visible');
      });
    }

    // Project modal
    const projectModalCancel = document.getElementById('projectModalCancel');
    const projectModalConfirm = document.getElementById('projectModalConfirm');
    const projectModalName = document.getElementById('projectNameInput');
    if (projectModalCancel) projectModalCancel.addEventListener('click', closeProjectModal);
    if (projectModalConfirm) {
      projectModalConfirm.addEventListener('click', () => {
        const name = (projectModalName || {}).value?.trim();
        if (!name) { showToast('Digite um nome para o projeto', 'warning'); return; }
        const mode = projectModalConfirm.dataset.mode;
        if (mode === 'edit' && projectModalConfirm.dataset.projectId) {
          updateProject(projectModalConfirm.dataset.projectId, { 
            name, color: getSelectedColor(), icon: getSelectedIcon() 
          });
        } else {
          createProject(name, getSelectedColor(), getSelectedIcon());
        }
        closeProjectModal();
      });
    }
    document.getElementById('projectModal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeProjectModal();
    });

    // Project context menu
    const projectMenu = document.getElementById('projectMenu');
    if (projectMenu) {
      projectMenu.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        const projectId = projectMenu.dataset.projectId;
        if (!projectId) return;
        if (action === 'rename') {
          closeProjectMenu();
          openProjectModal('edit', projectId);
        } else if (action === 'color') {
          closeProjectMenu();
          const c = PRESET_COLORS[(PRESET_COLORS.indexOf(getActiveProject().color) + 1) % PRESET_COLORS.length];
          updateProject(projectId, { color: c });
        } else if (action === 'icon') {
          closeProjectMenu();
          const i = PRESET_ICONS[(PRESET_ICONS.indexOf(getActiveProject().icon) + 1) % PRESET_ICONS.length];
          updateProject(projectId, { icon: i });
        } else if (action === 'delete') {
          closeProjectMenu();
          deleteProject(projectId);
        }
      });
    }

    // Swipe to delete (mobile)
    let touchStartX = 0;
    let touchStartY = 0;
    let swipingEl = null;

    document.addEventListener('touchstart', (e) => {
      const item = e.target.closest('.task-item');
      if (!item || e.target.closest('.btn') || e.target.closest('.task-checkbox')) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      swipingEl = item;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!swipingEl) return;
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      if (Math.abs(dy) > Math.abs(dx) || dx > 0) return;
      if (Math.abs(dx) < 30) return;
      e.preventDefault();
      swipingEl.style.transform = `translateX(${dx}px)`;
      swipingEl.style.opacity = 1 + dx / 200;
    }, { passive: false });

    document.addEventListener('touchend', () => {
      if (!swipingEl) return;
      const dx = parseInt(swipingEl.style.transform?.replace('translateX(', '') || '0');
      if (dx < -80) {
        const taskId = swipingEl.dataset.taskId;
        swipingEl.classList.add('swiped');
        setTimeout(() => {
          if (taskId) deleteTask(taskId);
        }, 300);
      } else {
        swipingEl.style.transform = '';
        swipingEl.style.opacity = '';
      }
      swipingEl = null;
    }, { passive: true });
    document.addEventListener('click', (e) => {
      const clickedOnTask = e.target.closest('.task-item');
      const clickedOnInput = e.target === elements.taskInput;
      const clickedOnEditing = e.target.closest('.task-text-input');
      const modalVisible = elements.confirmModal.classList.contains('visible') || elements.imageModal.classList.contains('visible');

      if (modalVisible) return;
      if (editingId && clickedOnEditing) return;
      if (editingId) {
        if (!clickedOnTask && !clickedOnInput && !clickedOnEditing) {
          saveEditing(editingId);
        }
      }
      if (selectedId && !clickedOnTask && !clickedOnInput && !clickedOnEditing) {
        clearSelection();
      }
    });
    elements.taskList.addEventListener('click', (e) => {
      if (e.target === elements.taskList) {
        clearSelection();
      }
    });
    elements.modalClose.addEventListener('click', closeModal);
    elements.imageModal.addEventListener('click', (e) => {
      if (e.target === elements.imageModal) {
        closeModal();
      }
    });
    elements.confirmCancel.addEventListener('click', closeConfirmModal);
    elements.confirmDelete.addEventListener('click', executeDelete);
    elements.confirmModal.addEventListener('click', (e) => {
      if (e.target === elements.confirmModal) {
        closeConfirmModal();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (elements.imageModal.classList.contains('visible')) {
          closeModal();
        }
        if (elements.confirmModal.classList.contains('visible')) {
          closeConfirmModal();
        }
      }
    });
    elements.btnExport.addEventListener('click', exportTasksToTxt);
    elements.btnImport.addEventListener('click', () => elements.fileImport.click());
    elements.fileImport.addEventListener('change', importTasksFromTxt);
    elements.btnDeleteAll.addEventListener('click', () => {
      elements.confirmDeleteAllModal.classList.add('visible');
      elements.confirmDeleteAllInput.value = '';
      elements.confirmDeleteAllBtn.disabled = true;
      elements.confirmCountdown.classList.remove('visible');
      elements.confirmCountdown.textContent = '';
    });

    // Ripple effect nos botões de exportar/importar
    document.querySelectorAll('.btn-export, .btn-confirm').forEach(btn => {
      btn.addEventListener('click', createRipple);
    });
    elements.confirmDeleteAllInput.addEventListener('input', (e) => {
      const value = e.target.value.trim().toLowerCase();
      elements.confirmDeleteAllBtn.disabled = value !== 'tenho certeza';
    });
    elements.confirmDeleteAllBtn.addEventListener('click', () => {
      elements.confirmDeleteAllBtn.disabled = true;
      let countdown = 5;
      elements.confirmCountdown.classList.add('visible');
      elements.confirmCountdown.textContent = `Excluindo em ${countdown}s (clique em Cancelar para desistir)`;
      elements.confirmDeleteAllCancel.textContent = 'Cancelar';
      clearInterval(deleteAllCountdownTimer);
      deleteAllCountdownTimer = setInterval(() => {
        countdown--;
        elements.confirmCountdown.textContent = `Excluindo em ${countdown}s (clique em Cancelar para desistir)`;
        if (countdown <= 0) {
          clearInterval(deleteAllCountdownTimer);
          elements.confirmCountdown.classList.remove('visible');
          elements.confirmDeleteAllCancel.textContent = 'Cancelar';
          tasks = tasks.filter(t => t.projectId !== activeProjectId);
          selectedId = null;
          editingId = null;
          currentFilter = null;
          searchResults = [];
          searchBarVisible = false;
          elements.searchBar.classList.remove('visible');
          elements.searchBar.style.display = 'none';
          elements.searchInput.value = '';
          elements.searchInput.blur();
          elements.searchCount.textContent = '';
          elements.btnClearFilter.style.display = 'none';
          saveTasksSync();
          renderTasks();
          elements.confirmDeleteAllModal.classList.remove('visible');
          showToast('Todas as tarefas foram excluídas!', 'warning');
        }
      }, 1000);
    });
    elements.confirmDeleteAllCancel.addEventListener('click', () => {
      clearInterval(deleteAllCountdownTimer);
      elements.confirmCountdown.classList.remove('visible');
      elements.confirmDeleteAllCancel.textContent = 'Cancelar';
      elements.confirmDeleteAllModal.classList.remove('visible');
    });
    elements.confirmDeleteAllModal.addEventListener('click', (e) => {
      if (e.target === elements.confirmDeleteAllModal) {
        clearInterval(deleteAllCountdownTimer);
        elements.confirmCountdown.classList.remove('visible');
        elements.confirmDeleteAllCancel.textContent = 'Cancelar';
        elements.confirmDeleteAllModal.classList.remove('visible');
      }
    });
    elements.btnClearFilter.addEventListener('click', () => {
      currentFilter = null;
      document.querySelectorAll('.counter').forEach(c => c.classList.remove('filter-active'));
      saveTasksSync();
      renderTasks();
      showToast('Filtro removido', 'info');
    });
    elements.counterNone.addEventListener('click', () => setFilter('none'));
    elements.counterCritical.addEventListener('click', () => setFilter('critical'));
    elements.counterHigh.addEventListener('click', () => setFilter('high'));
    elements.counterMedium.addEventListener('click', () => setFilter('medium'));
    elements.counterLow.addEventListener('click', () => setFilter('low'));
    elements.counterPending.addEventListener('click', () => setFilter('pending'));
    elements.counterCompleted.addEventListener('click', () => setFilter('completed'));

    // Theme toggle com animação
    elements.themeToggle.addEventListener('click', () => {
      elements.themeToggle.style.transform = 'translateY(-50%) rotate(360deg)';
      setTimeout(() => {
        elements.themeToggle.style.transform = 'translateY(-50%)';
      }, 300);

      // Trocar tema
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', currentTheme);
      elements.themeToggle.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
    });

    // Search bar
    elements.searchInput.addEventListener('input', (e) => performSearch(e.target.value));
    elements.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSearchBar();
      if (e.key === 'ArrowDown') { e.preventDefault(); navigateSearchResults('down'); }
      if (e.key === 'ArrowUp') { e.preventDefault(); navigateSearchResults('up'); }
      if (e.key === 'Enter' && searchResults.length > 0) {
        e.preventDefault();
        navigateSearchResults('down');
      }
    });
    elements.searchClose.addEventListener('click', closeSearchBar);
document.addEventListener('click', (e) => {
      if (searchBarVisible && !e.target.closest('.search-bar') && e.target !== elements.searchInput) {
        closeSearchBar();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && (e.key === 'b' || e.key === 'B') && window.innerWidth > 480) {
        e.preventDefault();
        toggleSearchBar();
      }
      if (e.key === 'Delete' && selectedId && !searchBarVisible) {
        e.preventDefault();
        confirmDeleteTask(selectedId);
      }
      // E para confirmar exclusão quando modal aberto
      if (e.key === 'e' || e.key === 'E') {
        if (elements.confirmModal.classList.contains('visible')) {
          e.preventDefault();
          executeDelete();
        }
      }
      if (e.key === 'Escape') {
        if (searchBarVisible) closeSearchBar();
        if (elements.confirmModal.classList.contains('visible')) closeConfirmModal();
        if (elements.imageModal.classList.contains('visible')) closeModal();
      }
      // Insert foca no campo de nova tarefa
      if (e.key === 'Insert') {
        e.preventDefault();
        elements.taskInput.focus();
      }
      // Setas para navegar entre tarefas (quando busca não está ativa)
      if (!searchBarVisible && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        navigateTasks(e.key === 'ArrowDown' ? 1 : -1);
      }
    });
  }

  function setFilter(filter) {
    currentFilter = filter;
    renderTasks();
    saveTasksSync();
    // Destacar filtro ativo
    document.querySelectorAll('.counter').forEach(c => c.classList.remove('filter-active'));
    const labels = { none: 'sem prioridade', pending: 'pendentes', completed: 'concluídas', critical: 'crítica', high: 'alta', medium: 'média', low: 'baixa' };
    const filterMap = { none: 'counterNone', pending: 'counterPending', completed: 'counterCompleted', critical: 'counterCritical', high: 'counterHigh', medium: 'counterMedium', low: 'counterLow' };
    const el = elements[filterMap[filter]];
    if (el) el.classList.add('filter-active');
    showToast(`Filtrando: ${labels[filter] || filter}`, 'info');
  }

function toggleSearchBar() {
    if (searchBarVisible) {
      closeSearchBar();
    } else {
      openSearchBar();
    }
  }

  function openSearchBar() {
    currentFilter = null;
    searchBarVisible = true;
    elements.searchBar.classList.add('visible');
    elements.searchInput.value = '';
    setTimeout(() => elements.searchInput.focus(), 50);
    renderTasks();
  }

  function closeSearchBar() {
    searchBarVisible = false;
    elements.searchBar.classList.remove('visible');
    elements.searchInput.value = '';
    currentFilter = null;
    renderTasks();
  }

  function performSearch(query) {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) {
      elements.searchCount.textContent = '';
      renderTasks();
      return;
    }

    const projectTasks = getProjectTasks();
    const words = normalizedQuery.split(/\s+/);
    const filtered = projectTasks.filter(task => {
      const text = task.text.toLowerCase();
      return words.every(word => text.includes(word));
    });

    searchResults = filtered.map(t => t.id);
    renderTasks();

    // Atualizar contador
    if (searchResults.length > 0) {
      elements.searchCount.textContent = `1 de ${searchResults.length}`;
      // Selecionar primeiro resultado
      selectTask(searchResults[0]);
    } else {
      elements.searchCount.textContent = 'Nenhum';
    }
  }

  function navigateTasks(direction) {
    if (sortedTaskIds.length === 0) return;

    const currentIndex = selectedId ? sortedTaskIds.indexOf(selectedId) : -1;
    let newIndex;

    if (direction === 1) {
      newIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % sortedTaskIds.length;
    } else {
      newIndex = currentIndex <= 0 ? sortedTaskIds.length - 1 : currentIndex - 1;
    }

    const newId = sortedTaskIds[newIndex];
    if (newId && newId !== selectedId) {
      selectedId = newId;
      saveTasksSync();
      renderTasks();
      const el = document.querySelector(`[data-task-id="${newId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  function navigateSearchResults(direction) {
    if (searchResults.length === 0) return;

    const currentIndex = selectedId ? searchResults.indexOf(selectedId) : -1;
    let newIndex;

    if (direction === 'down') {
      newIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % searchResults.length;
    } else {
      newIndex = currentIndex <= 0 ? searchResults.length - 1 : currentIndex - 1;
    }

    const newId = searchResults[newIndex];
    if (newId) {
      selectTask(newId);
      const el = document.querySelector(`[data-task-id="${newId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      // Atualizar contador
      elements.searchCount.textContent = `${newIndex + 1} de ${searchResults.length}`;
    }
  }

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();