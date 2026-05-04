(function () {
  'use strict';

  const TOUR_KEY = 'todolist_tour_completed';
  const GAP = 14;
  const TIP_W = 320;
  const PAD = 6;

  const steps = [
    {
      target: '#taskInput',
      title: '✏️ Criar tarefas',
      text: 'Digite o nome da tarefa e pressione <b>Enter</b> para adicionar.',
      position: 'bottom'
    },
    {
      target: '.project-tabs',
      title: '📂 Projetos',
      text: 'Organize tarefas por contexto. Clique em <b>+</b> para criar até 5 projetos e alterne pelas abas.',
      position: 'bottom'
    },
    {
      target: '.counters',
      title: '🔍 Filtros rápidos',
      text: 'Clique nos contadores para filtrar por prioridade ou status. O filtro ativo fica destacado em roxo.',
      position: 'bottom'
    },
    {
      target: '.task-priority-btn',
      title: '⚡ Prioridades',
      text: 'Defina a prioridade de cada tarefa: <b>C</b>rítica, <b>A</b>lta, <b>M</b>édia, <b>B</b>aixa. A ordenação na lista é automática.',
      position: 'left',
      fallback: true
    },
    {
      target: '.drag-handle',
      title: '↕️ Reordenar',
      text: 'Arraste o ícone <b>⋮⋮</b> para reordenar tarefas de <b>mesma prioridade</b>.',
      position: 'right',
      fallback: true
    },
    {
      target: '.btn-copy',
      title: '📋 Copiar texto',
      text: 'Clique em <b>📋</b> para copiar o texto da tarefa. O ícone muda para ✅ como feedback.',
      position: 'left',
      fallback: true
    },
    {
      target: '.footer',
      title: '⚙️ Ações do sistema',
      text: 'Exportar, importar, excluir tudo, dicas e som. Use <b>🎓 Tour</b> para rever este guia a qualquer momento.',
      position: 'top'
    }
  ];

  let currentStep = 0;
  let overlay, tooltip, highlight;
  let firstShow = true;

  function setup() {
    overlay = document.createElement('div');
    overlay.className = 'tour-overlay';
    overlay.addEventListener('click', end);

    highlight = document.createElement('div');
    highlight.className = 'tour-highlight';
    highlight.style.display = 'none';

    tooltip = document.createElement('div');
    tooltip.className = 'tour-tooltip';
    tooltip.style.display = 'none';
    tooltip.addEventListener('click', function (e) {
      e.stopPropagation();
      const action = e.target.dataset.tour;
      if (!action) return;
      if (action === 'next') goTo(currentStep + 1);
      else if (action === 'prev') goTo(currentStep - 1);
      else end();
    });

    overlay.style.display = 'none';
    document.body.append(overlay, highlight, tooltip);
  }

  function getRect(selector) {
    const el = document.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return (r.width > 0 && r.height > 0) ? r : null;
  }

  function renderTooltip(index) {
    const step = steps[index];
    const isLast = index === steps.length - 1;
    const dots = steps.map((_, i) =>
      `<span class="tour-dot${i === index ? ' active' : ''}"></span>`
    ).join('');
    return `
      <div class="tour-counter">${index + 1} / ${steps.length}</div>
      <h3>${step.title}</h3>
      <p>${step.text}</p>
      <div class="tour-actions">
        <button class="tour-skip" data-tour="skip">Pular tour</button>
        <div class="tour-dots">${dots}</div>
        <div class="tour-btn-group">
          ${index > 0 ? '<button class="tour-btn tour-btn-secondary" data-tour="prev">← Voltar</button>' : ''}
          <button class="tour-btn tour-btn-primary" data-tour="${isLast ? 'finish' : 'next'}">${isLast ? '✓ Concluir' : 'Próximo →'}</button>
        </div>
      </div>`;
  }

  function positionTooltip(rect, preferred) {
    const tipH = tooltip.offsetHeight || 180;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const variants = {
      bottom: { x: rect.left + rect.width / 2 - TIP_W / 2, y: rect.bottom + GAP },
      top:    { x: rect.left + rect.width / 2 - TIP_W / 2, y: rect.top - tipH - GAP },
      right:  { x: rect.right + GAP,                        y: rect.top + rect.height / 2 - tipH / 2 },
      left:   { x: rect.left - TIP_W - GAP,                 y: rect.top + rect.height / 2 - tipH / 2 }
    };

    const order = [preferred, 'bottom', 'top', 'right', 'left'].filter((v, i, a) => a.indexOf(v) === i);

    for (const pos of order) {
      const { x, y } = variants[pos];
      if (x >= 8 && x + TIP_W <= vw - 8 && y >= 8 && y + tipH <= vh - 8) {
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
        return;
      }
    }

    const fb = variants[preferred] || variants.bottom;
    tooltip.style.left = Math.max(8, Math.min(fb.x, vw - TIP_W - 8)) + 'px';
    tooltip.style.top = Math.max(8, Math.min(fb.y, vh - tipH - 8)) + 'px';
  }

  function showStep(index) {
    const step = steps[index];
    tooltip.innerHTML = renderTooltip(index);

    const rect = getRect(step.target);

    if (rect) {
      if (firstShow) {
        highlight.className = 'tour-highlight';
        firstShow = false;
      } else {
        highlight.className = 'tour-highlight animated';
      }
      highlight.style.display = 'block';
      highlight.style.left = (rect.left - PAD) + 'px';
      highlight.style.top = (rect.top - PAD) + 'px';
      highlight.style.width = (rect.width + PAD * 2) + 'px';
      highlight.style.height = (rect.height + PAD * 2) + 'px';

      const el = document.querySelector(step.target);
      const r = el.getBoundingClientRect();
      if (r.top < 60 || r.bottom > window.innerHeight - 50) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      positionTooltip(rect, step.position);
    } else {
      highlight.style.display = 'none';
      tooltip.style.left = Math.max(8, (window.innerWidth - TIP_W) / 2) + 'px';
      tooltip.style.top = Math.max(8, (window.innerHeight - (tooltip.offsetHeight || 200)) / 2) + 'px';
    }
  }

  function goTo(index) {
    if (index < 0 || index >= steps.length) return;
    currentStep = index;
    showStep(currentStep);
  }

  function onKeydown(e) {
    if (e.key === 'Escape') end();
    else if (e.key === 'ArrowRight') goTo(currentStep + 1);
    else if (e.key === 'ArrowLeft') goTo(currentStep - 1);
  }

  function onResize() {
    showStep(currentStep);
  }

  function start() {
    if (!overlay) setup();
    firstShow = true;
    currentStep = 0;
    overlay.style.display = 'block';
    highlight.style.display = 'block';
    tooltip.style.display = 'block';
    showStep(0);
    document.addEventListener('keydown', onKeydown);
    window.addEventListener('resize', onResize);
  }

  function end() {
    if (!overlay) return;
    overlay.style.display = 'none';
    highlight.style.display = 'none';
    tooltip.style.display = 'none';
    localStorage.setItem(TOUR_KEY, '1');
    document.removeEventListener('keydown', onKeydown);
    window.removeEventListener('resize', onResize);
  }

  window.Tour = {
    start: start,
    end: end,
    isFirstVisit: function () { return !localStorage.getItem(TOUR_KEY); }
  };
})();
