(function() {
  'use strict';

  const STORAGE_KEY = 'todolist_data';
  const MAX_IMAGE_SIZE = 500;
  const IMAGE_QUALITY = 0.6;
  const IMAGE_PLACEHOLDER = 'Detalhe a tarefa relacionada a esta imagem...';
  const MAX_IMAGES_PER_TASK = 5;
  const MAX_STORAGE_SIZE = 4 * 1024 * 1024; // 4MB safety limit

let tasks = [];
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
        tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
        tasks = tasks.map(t => ({
          ...t,
          priority: t.priority || 'none',
          images: t.image ? [t.image] : (t.images || [])
        }));

        // Normalizar IDs legados (sem sufixo numérico)
        tasks.forEach(t => {
          if (!t.id.includes('-')) {
            t.id = t.id + '-leg';
          }
        });

        // Restaurar idCounter do maior sufixo numérico existente
        tasks.forEach(t => {
          const match = t.id.match(/-(\d+)$/);
          if (match) {
            const n = parseInt(match[1], 10);
            if (n > idCounter) idCounter = n;
          }
        });

        selectedId = parsed.selectedId || null;
        currentFilter = parsed.currentFilter || null;
        idCounter = parsed.idCounter || 0;
      } else {
        tasks = [];
      }
    } catch (e) {
      console.error('Erro ao carregar tarefas:', e);
      tasks = [];
    }
  }

  function saveTasks() {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(() => {
      try {
        const data = { tasks, selectedId, currentFilter, idCounter };
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
      const data = { tasks, selectedId, currentFilter, idCounter };
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
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
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
    const totalCount = tasks.length;
    const pendingCount = tasks.filter(t => !t.completed).length;
    const completedCount = tasks.filter(t => t.completed).length;
    const noneCount = tasks.filter(t => t.priority === 'none' && !t.completed).length;
    const criticalCount = tasks.filter(t => t.priority === 'critical' && !t.completed).length;
    const highCount = tasks.filter(t => t.priority === 'high' && !t.completed).length;
    const mediumCount = tasks.filter(t => t.priority === 'medium' && !t.completed).length;
    const lowCount = tasks.filter(t => t.priority === 'low' && !t.completed).length;

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

    let filteredTasks = tasks;
    if (currentFilter) {
      if (currentFilter === 'none') {
        filteredTasks = tasks.filter(t => t.priority === 'none');
      } else if (currentFilter === 'pending') {
        filteredTasks = tasks.filter(t => !t.completed);
      } else if (currentFilter === 'completed') {
        filteredTasks = tasks.filter(t => t.completed);
      } else {
        filteredTasks = tasks.filter(t => t.priority === currentFilter);
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
    attachTaskEvents();
    attachSectionEvents();
    updateProgressBar();
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

    let imageHtml = '';
    const taskSelected = task.id === selectedId;
    const hasImages = task.images && task.images.length > 0;
    
    if (hasImages || taskSelected) {
      let images = '';
      if (hasImages) {
        images = task.images.map((img, idx) => `
          <div class="task-image-wrapper">
            <img class="task-image" data-task-id="${task.id}" data-image-index="${idx}" src="${img}" alt="Anexo ${idx + 1}">
            <button class="btn-delete-image" data-task-id="${task.id}" data-image-index="${idx}" title="Excluir imagem" aria-label="Excluir imagem">&times;</button>
          </div>
        `).join('');
      }
      const addBtn = `<button type="button" class="btn-add-image" data-task-id="${task.id}" title="Adicionar imagem" aria-label="Adicionar imagem">+</button>`;
      imageHtml = `<div class="task-images-container">${images}${addBtn}</div>`;
    }

    const priorityButtons = `
      <div class="task-priority" data-task-id="${task.id}" role="group" aria-label="Prioridade">
        <button class="task-priority-btn priority-critical ${task.priority === 'critical' ? 'active' : ''}" data-priority="critical" title="Crítica" aria-label="Definir prioridade crítica">C</button>
        <button class="task-priority-btn priority-high ${task.priority === 'high' ? 'active' : ''}" data-priority="high" title="Alta" aria-label="Definir prioridade alta">A</button>
        <button class="task-priority-btn priority-medium ${task.priority === 'medium' ? 'active' : ''}" data-priority="medium" title="Média" aria-label="Definir prioridade média">M</button>
        <button class="task-priority-btn priority-low ${task.priority === 'low' ? 'active' : ''}" data-priority="low" title="Baixa" aria-label="Definir prioridade baixa">B</button>
      </div>
    `;

    const hasPriority = task.priority !== 'none';
    const dragHandleClass = hasPriority ? 'drag-handle hidden' : 'drag-handle';

    if (isEditing) {
      return `
        <div class="task-item ${task.id === selectedId ? 'selected' : ''} ${task.completed ? 'completed' : ''}" data-task-id="${task.id}" draggable="true">
          <span class="${dragHandleClass}">⋮⋮</span>
          <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} data-task-id="${task.id}">
          <div class="task-content">
            <textarea class="task-text-input" data-task-id="${task.id}">${escapeHtml(task.text)}</textarea>
            ${imageHtml}
          </div>
          ${priorityButtons}
          <div class="task-actions">
            <button class="btn btn-delete" data-task-id="${task.id}" title="Excluir" aria-label="Excluir tarefa">&times;</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="task-item ${task.id === selectedId ? 'selected' : ''} ${task.completed ? 'completed' : ''}" data-task-id="${task.id}" draggable="true">
        <span class="${dragHandleClass}">⋮⋮</span>
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} data-task-id="${task.id}">
        <div class="task-content">
          <div class="task-text ${placeholderClass}" data-task-id="${task.id}">${isLongText ? `<span class="task-text-short" id="${longTextId}">${textToRender}</span><span class="task-text-full" id="${longTextId}-full" style="display:none">${linkedText}</span>` : textToRender}${isLongText ? '<button class="btn-expand" data-task-id="' + task.id + '">Ver mais</button>' : ''}</div>
          ${imageHtml}
        </div>
        ${priorityButtons}
        <div class="task-actions">
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
    const infoIcon = !isCompleted ? '<span class="section-info" data-tip="📌 Tarefas com prioridade s\u00e3o ordenadas automaticamente.\n\u2195 Apenas tarefas sem prioridade podem ser reorganizadas manualmente." title="Ordena\u00e7\u00e3o">i</span>' : '';
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
        if (task && task.priority && task.priority !== 'none') {
          e.preventDefault();
          showToast('Reorganize apenas tarefas sem prioridade definida', 'warning');
          return;
        }
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
        const targetTask = tasks[toIndex];
        if (targetTask && targetTask.priority && targetTask.priority !== 'none') {
          showToast('Não mova para posição de tarefa com prioridade', 'warning');
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
      updatedAt: Date.now()
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
    if (taskToMove && taskToMove.priority && taskToMove.priority !== 'none') {
      showToast('Reorganize apenas tarefas sem prioridade definida', 'warning');
      return;
    }
    if (targetTask && targetTask.priority && targetTask.priority !== 'none') {
      showToast('Não mova para posição de tarefa com prioridade', 'warning');
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
          tasks = [];
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

    const words = normalizedQuery.split(/\s+/);
    const filtered = tasks.filter(task => {
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