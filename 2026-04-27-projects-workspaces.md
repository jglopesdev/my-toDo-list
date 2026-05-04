# Projects/Workspaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add project/workspace support to organize tasks into separate contexts (work, personal, side projects, etc.) while keeping the feature optional for users who prefer a simple list.

**Architecture:** Projects are stored as an array in localStorage alongside tasks. Each task has a `projectId` reference. A tab bar above the task list allows switching between projects. A "Geral" project exists by default and cannot be deleted. All existing features (filters, priorities, search, images, etc.) work within the active project context.

**Tech Stack:** Vanilla HTML/CSS/JS, localStorage, no external dependencies.

---

## Data Structure Changes

### localStorage
```javascript
{
  tasks: [
    { id, text, completed, priority, images, createdAt, updatedAt, projectId: 'geral' }
  ],
  projects: [
    { id: 'geral', name: 'Geral', color: '#bb86fc', icon: '📋', createdAt: timestamp },
    { id: 'trabalho', name: 'Trabalho', color: '#ff9800', icon: '💼', createdAt: timestamp }
  ],
  activeProjectId: 'geral',
  selectedId,
  currentFilter,
  idCounter
}
```

### Constants
```javascript
const DEFAULT_PROJECT = { id: 'geral', name: 'Geral', color: '#bb86fc', icon: '📋' };
const PRESET_COLORS = ['#bb86fc', '#ff9800', '#4caf50', '#2196f3', '#f44336', '#9c27b0', '#00bcd4', '#ffeb3b'];
const PRESET_ICONS = ['📋', '💼', '🏠', '🎮', '📚', '🎨', '🏋️', '✈️', '💻', '🎵', '📝', '🔧'];
```

---

## UI Design

```
┌──────────────────────────────────────────────────┐
│  [Título]                  [☀️]     [💾 Salvo ✓] │
├──────────────────────────────────────────────────┤
│  📋 Geral  💼 Trabalho  🏠 Pessoal  [+ Novo]    │ ← Project tabs (scrollable horizontal)
├──────────────────────────────────────────────────┤
│  [Contadores]                     [Limpar filtro] │
│  [Input "Digite uma nova tarefa..."]             │
│  [Progress bar: 3/5 ■■■■□□□□□□]                 │
├──────────────────────────────────────────────────┤
│  ▼ Pendentes ℹ️                     (3)          │
│  [Tarefa 1]                                      │
│  [Tarefa 2]                                      │
│  ▼ Concluídas                      (2)           │
│  [Tarefa concluída]                              │
├──────────────────────────────────────────────────┤
│  [Footer...] [?]                                 │
└──────────────────────────────────────────────────┘
```

### Project Tabs
- Each tab shows: icon + name + task count badge
- Active tab has bottom border in project color + subtle background
- Tabs scroll horizontally on mobile (overflow-x: auto)
- "+" button at end opens a small modal to create new project
- Right-click or long-press on a tab opens context menu: Rename, Change Color, Delete

### Project CRUD Modal (small, inline)
```
┌─────────────────────┐
│  Novo Projeto       │
│                     │
│  [📋] Nome: _______ │
│                     │
│  Cor: ○ ○ ○ ○ ○ ○  │  ← Preset color circles
│  Ícone: 📋 💼 🏠 🎮 │  ← Preset icons
│                     │
│  [Cancelar] [Criar] │
└─────────────────────┘
```

---

## Files to Modify

- `index.html` — Add project tabs bar, project modals, context menu
- `styles.css` — Project tabs, modal, context menu, responsive
- `app.js` — Project CRUD, task-project association, filtering by active project

---

## Task Breakdown

### Task 1: Update Data Model

**Files:** Modify `app.js`

- Add `projects` array with default "Geral" project
- Add `activeProjectId` variable
- Add project constants (colors, icons)
- Update `loadTasks()`: migrate old data (no projects) → create default project, assign all existing tasks to 'geral'
- Update `saveTasks()` / `saveTasksSync()`: include projects and activeProjectId
- Add helper: `getActiveProject()`, `getProjectById(id)`, `getTasksByProject(projectId)`
- Add helper: `getProjectTaskCounts(projectId)` for counters

```javascript
// New data shape in save/load
const saveData = { tasks, projects, activeProjectId, selectedId, currentFilter, idCounter };

function getActiveProject() {
  return projects.find(p => p.id === activeProjectId) || projects[0];
}

function getProjectTasks() {
  return tasks.filter(t => t.projectId === activeProjectId);
}

function migrateProjects(data) {
  if (!data.projects) {
    data.projects = [{ ...DEFAULT_PROJECT, createdAt: Date.now() }];
    data.activeProjectId = 'geral';
    data.tasks.forEach(t => { if (!t.projectId) t.projectId = 'geral'; });
  }
  return data;
}
```

### Task 2: Render Project Tabs in HTML

**Files:** Modify `index.html`, Modify `styles.css`

- Add `.project-tabs` container after `title-wrapper`:
```html
<div class="project-tabs" id="projectTabs">
  <!-- tabs rendered by JS -->
  <button class="btn-add-project" id="btnAddProject" title="Novo projeto">+</button>
</div>
```

- Add project modal HTML (hidden by default):
```html
<div class="project-modal" id="projectModal">
  <div class="project-modal-content">
    <h3 id="projectModalTitle">Novo Projeto</h3>
    <input type="text" id="projectNameInput" placeholder="Nome do projeto..." maxlength="30">
    <div class="color-picker" id="colorPicker">
      <!-- circles rendered by JS -->
    </div>
    <div class="icon-picker" id="iconPicker">
      <!-- icons rendered by JS -->
    </div>
    <div class="project-modal-actions">
      <button class="btn-confirm btn-cancel" id="projectModalCancel">Cancelar</button>
      <button class="btn-confirm btn-delete-confirm" id="projectModalConfirm">Criar</button>
    </div>
  </div>
</div>
```

- Add project context menu (hidden by default):
```html
<div class="project-menu" id="projectMenu">
  <button data-action="rename">Renomear</button>
  <button data-action="color">Alterar Cor</button>
  <button data-action="icon">Alterar Ícone</button>
  <button data-action="delete" class="danger">Excluir Projeto</button>
</div>
```

### Task 3: Styles for Project UI

**Files:** Modify `styles.css`

```css
/* Project Tabs */
.project-tabs {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding: var(--spacing-sm) 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.project-tabs::-webkit-scrollbar { display: none; }

.project-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  flex-shrink: 0;
}

.project-tab:hover {
  background: var(--surface-hover);
}

.project-tab.active {
  background: rgba(187, 134, 252, 0.12);
  border-color: var(--primary);
  color: var(--text);
  font-weight: 500;
}

.project-tab .tab-count {
  font-size: 0.7rem;
  background: var(--bg);
  padding: 1px 7px;
  border-radius: 10px;
  color: var(--text-muted);
}

.project-tab.active .tab-count {
  background: var(--primary);
  color: #121212;
}

.btn-add-project {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: transparent;
  border: 2px dashed var(--border);
  color: var(--text-muted);
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}

.btn-add-project:hover {
  border-color: var(--primary);
  color: var(--primary);
}

/* Project Modal */
.project-modal {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  z-index: 1001;
  align-items: center;
  justify-content: center;
}

.project-modal.visible { display: flex; }

.project-modal-content {
  background: var(--surface);
  padding: var(--spacing-lg);
  border-radius: var(--radius);
  width: 90%;
  max-width: 380px;
  box-shadow: var(--shadow);
}

.project-name-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 1rem;
  outline: none;
  margin: var(--spacing-md) 0;
}

.project-name-input:focus {
  border-color: var(--primary);
}

.color-picker, .icon-picker {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: var(--spacing-sm) 0;
}

.color-option {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  border: 3px solid transparent;
  transition: transform 0.15s;
}

.color-option:hover { transform: scale(1.15); }
.color-option.selected { border-color: var(--text); }

.icon-option {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 1.2rem;
  background: var(--bg);
  border: 2px solid transparent;
  transition: all 0.15s;
}

.icon-option:hover { background: var(--surface-hover); }
.icon-option.selected { border-color: var(--primary); }

/* Context Menu */
.project-menu {
  display: none;
  position: fixed;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  z-index: 1002;
  overflow: hidden;
}

.project-menu.visible { display: block; }

.project-menu button {
  display: block;
  width: 100%;
  padding: 10px 16px;
  background: none;
  border: none;
  color: var(--text);
  font-size: 0.85rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;
}

.project-menu button:hover { background: var(--surface-hover); }
.project-menu button.danger { color: var(--danger); }
```

### Task 4: Project CRUD Logic (JS)

**Files:** Modify `app.js`

Add functions:
```javascript
function renderProjectTabs() { /* render tab bar */ }
function createProject(name, color, icon) { /* add to projects array, save, rerender */ }
function renameProject(id, newName) { /* update project name */ }
function deleteProject(id) { /* cannot delete 'geral'. Move tasks to 'geral' first */ }
function switchProject(id) { /* set activeProjectId, render tasks */ }
function openProjectModal(mode, projectId) { /* 'create' or 'edit' */ }
function closeProjectModal() { /* hide modal */ }
function openProjectMenu(e, projectId) { /* show context menu */ }
function closeProjectMenu() { /* hide context menu */ }
```

Key logic for `deleteProject`:
- Block deleting 'geral' with a toast warning
- Move all tasks from deleted project to 'geral'
- If active project is being deleted, switch to 'geral'
- Projects with tasks get a confirmation warning

### Task 5: Integrate with Existing Features

**Files:** Modify `app.js`

Changes required throughout:

- `renderTasks()`: filter tasks by `activeProjectId` first, then apply priority/completed filters
- `createTask()`: set `projectId: activeProjectId` on new tasks
- `updateProgressBar()`: calculate based on active project's tasks only
- Counters: show counts for active project
- `exportTasksToTxt()`: option to export current project or all projects
- `importTasksFromTxt()`: import into active project
- `deleteAllTasks()`: delete only active project's tasks (with confirmation adjusted)
- `setFilter()`: works within active project
- `performSearch()`: searches within active project

### Task 6: Migration & Edge Cases

**Files:** Modify `app.js`

- On first load with no projects: create "Geral", assign all existing tasks to it
- Deleting a project with tasks: confirm dialog showing task count, move to Geral
- Empty state per project: "Nenhuma tarefa neste projeto" + hint to switch projects or add tasks
- Max projects: limit to 10 (UI feedback)
- Project names: max 20 chars, trimmed, no duplicates allowed
- Long project list: horizontal scroll on tabs

### Task 7: Modal for New/Edit Project

**Files:** Modify `app.js`

Event handlers:
```javascript
function setupProjectModal() {
  const modal = document.getElementById('projectModal');
  const nameInput = document.getElementById('projectNameInput');
  const confirmBtn = document.getElementById('projectModalConfirm');
  const cancelBtn = document.getElementById('projectModalCancel');
  const colorPicker = document.getElementById('colorPicker');
  const iconPicker = document.getElementById('iconPicker');

  // Render preset colors and icons as clickable options
  // Track selected color/icon
  // On confirm: validate name, create/update project
  // On cancel: close modal
}
```

### Task 8: Context Menu for Project Actions

**Files:** Modify `app.js`

```javascript
function setupProjectContextMenu() {
  // Right-click / long-press on project tab shows menu
  // Menu options: Rename, Change Color, Change Icon, Delete
  // Rename: opens modal in edit mode
  // Change Color: opens color picker only
  // Change Icon: opens icon picker only
  // Delete: confirmation dialog
}
```

---

## Spark Plan Compliance Checklist

- [ ] No real-time listeners (localStorage, async-free)
- [ ] Saves only on confirmation (blur/Enter), not on every keystroke
- [ ] Saves full state in one localStorage call (batch, not per-task)
- [ ] Image compression already implemented
- [ ] No external dependencies
- [ ] No Cloud Functions / paid resources
- [ ] Projects stored locally, no cloud sync

---

## Execution

**Plan complete.** Do you want to proceed with subagent-driven development or inline execution?
