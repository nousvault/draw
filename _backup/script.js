const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const tools = [...document.querySelectorAll('[data-tool]')];
const actionButtons = [...document.querySelectorAll('[data-action]')];
const importInput = document.querySelector('[data-import]');
const shell = document.querySelector('.board-shell');

const STORAGE_KEY = 'nous-draw-state-v1';

const state = {
  tool: 'select',
  zoom: 1,
  panX: 0,
  panY: 0,
  isPanning: false,
  isDragging: false,
  dragObj: null,
  dragOffX: 0,
  dragOffY: 0,
  spaceDown: false,
  isDrawing: false,
  startX: 0,
  startY: 0,
  pointerId: null,
  temp: null,
  selectedId: null,
  history: [],
  future: [],
  objects: [],
};

const colors = {
  ink: '#1f1a17',
  accent: '#8a5b3b',
  blue: '#365c7d',
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Text size in world units — stays proportional to shapes at any zoom level
const TEXT_SIZE_WORLD = 15;   // px at zoom=1
const LABEL_SIZE_WORLD = 13;  // px at zoom=1 for shape labels

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function resize() {
  const rect = shell.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    objects: state.objects,
    panX: state.panX,
    panY: state.panY,
    zoom: state.zoom,
  }));
}

function snapshot() {
  state.history.push(JSON.stringify(state.objects));
  if (state.history.length > 50) state.history.shift();
  state.future.length = 0;
}

function undo() {
  if (!state.history.length) return;
  state.future.push(JSON.stringify(state.objects));
  state.objects = JSON.parse(state.history.pop());
  save(); draw();
}

function redo() {
  if (!state.future.length) return;
  state.history.push(JSON.stringify(state.objects));
  state.objects = JSON.parse(state.future.pop());
  save(); draw();
}

function screenToWorld(x, y) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (x - rect.left - state.panX) / state.zoom,
    y: (y - rect.top - state.panY) / state.zoom,
  };
}

function setTool(tool) {
  state.tool = tool;
  tools.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.tool === tool));
  updateCursor();
}

// ── Cursor logic ──
// In select mode: grab when hovering object, default otherwise
// Space held: grabbing
function updateCursor(hovering = false) {
  if (state.isPanning || state.spaceDown) {
    canvas.style.cursor = state.isPanning ? 'grabbing' : 'grab';
  } else if (state.tool === 'select') {
    canvas.style.cursor = hovering ? 'grab' : 'default';
  } else if (state.tool === 'erase') {
    canvas.style.cursor = 'cell';
  } else {
    canvas.style.cursor = 'crosshair';
  }
}

function hitTest(x, y) {
  for (let i = state.objects.length - 1; i >= 0; i--) {
    const o = state.objects[i];
    if (o.type === 'rect' || o.type === 'ellipse' || o.type === 'text') {
      const minX = Math.min(o.x, o.x + o.w), maxX = Math.max(o.x, o.x + o.w);
      const minY = Math.min(o.y, o.y + o.h), maxY = Math.max(o.y, o.y + o.h);
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) return o;
    }
    if (o.type === 'pen') {
      for (const p of o.points) if (Math.hypot(p.x - x, p.y - y) < 8 / state.zoom) return o;
    }
    if (o.type === 'arrow') {
      const d = pointToSegmentDistance(x, y, o.x1, o.y1, o.x2, o.y2);
      if (d < 8 / state.zoom) return o;
    }
  }
  return null;
}

function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function drawGrid() {
  const rect = canvas.getBoundingClientRect();
  ctx.save();
  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.fillStyle = '#fffaf1';
  ctx.fillRect(0, 0, rect.width, rect.height);
  ctx.translate(state.panX, state.panY);
  ctx.scale(state.zoom, state.zoom);
  const step = 24;
  const offsetX = ((-state.panX / state.zoom) % step + step) % step;
  const offsetY = ((-state.panY / state.zoom) % step + step) % step;
  ctx.fillStyle = 'rgba(31,26,23,0.12)';
  for (let x = -step + offsetX; x < rect.width / state.zoom + step; x += step) {
    for (let y = -step + offsetY; y < rect.height / state.zoom + step; y += step) {
      ctx.beginPath();
      ctx.arc(x, y, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawObject(o) {
  ctx.save();
  ctx.strokeStyle = o.color || colors.ink;
  ctx.fillStyle = o.color || colors.ink;
  // line width is always 2px on screen regardless of zoom
  ctx.lineWidth = 2 / state.zoom;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (o.type === 'pen') {
    ctx.beginPath();
    o.points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.stroke();

  } else if (o.type === 'rect') {
    ctx.strokeRect(o.x, o.y, o.w, o.h);
    if (o.label) drawLabel(o.label, o.x + o.w / 2, o.y + o.h / 2, o.color);

  } else if (o.type === 'ellipse') {
    ctx.beginPath();
    ctx.ellipse(o.x + o.w / 2, o.y + o.h / 2, Math.abs(o.w / 2), Math.abs(o.h / 2), 0, 0, Math.PI * 2);
    ctx.stroke();
    if (o.label) drawLabel(o.label, o.x + o.w / 2, o.y + o.h / 2, o.color);

  } else if (o.type === 'arrow') {
    ctx.beginPath(); ctx.moveTo(o.x1, o.y1); ctx.lineTo(o.x2, o.y2); ctx.stroke();
    const angle = Math.atan2(o.y2 - o.y1, o.x2 - o.x1);
    // arrowhead stays proportional in world units
    const len = 12 / state.zoom;
    ctx.beginPath();
    ctx.moveTo(o.x2, o.y2);
    ctx.lineTo(o.x2 - len * Math.cos(angle - Math.PI / 6), o.y2 - len * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(o.x2 - len * Math.cos(angle + Math.PI / 6), o.y2 - len * Math.sin(angle + Math.PI / 6));
    ctx.closePath(); ctx.fill();

  } else if (o.type === 'text') {
    // font in world units — scales with zoom so text stays same size relative to canvas objects
    ctx.font = `${TEXT_SIZE_WORLD}px 'IBM Plex Mono', monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(o.text, o.x, o.y);
  }

  // selection highlight
  if (state.selectedId === o.id) {
    ctx.strokeStyle = '#4a90d9';
    ctx.lineWidth = 1.5 / state.zoom;
    ctx.setLineDash([4 / state.zoom, 3 / state.zoom]);
    const pad = 6 / state.zoom;
    if (o.type === 'rect' || o.type === 'ellipse' || o.type === 'text') {
      ctx.strokeRect(
        Math.min(o.x, o.x + o.w) - pad,
        Math.min(o.y, o.y + o.h) - pad,
        Math.abs(o.w) + pad * 2,
        Math.abs(o.h) + pad * 2
      );
    }
    ctx.setLineDash([]);
  }

  ctx.restore();
}

function drawLabel(text, cx, cy, color) {
  // label font in world units — stays proportional to its parent shape
  ctx.font = `${LABEL_SIZE_WORLD}px 'IBM Plex Mono', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color || colors.ink;
  ctx.fillText(text, cx, cy);
}

function draw() {
  drawGrid();
  ctx.save();
  ctx.translate(state.panX, state.panY);
  ctx.scale(state.zoom, state.zoom);
  state.objects.forEach(drawObject);
  if (state.temp) drawObject(state.temp);
  ctx.restore();
}

function persistAndRedraw() { save(); draw(); }

// ── Inline text editing overlay ──
function startLabelEdit(obj) {
  const cx = obj.type === 'arrow'
    ? (obj.x1 + obj.x2) / 2
    : obj.x + obj.w / 2;
  const cy = obj.type === 'arrow'
    ? (obj.y1 + obj.y2) / 2
    : obj.y + obj.h / 2;

  const sx = cx * state.zoom + state.panX;
  const sy = cy * state.zoom + state.panY;
  const rect = canvas.getBoundingClientRect();

  const input = document.createElement('input');
  input.type = 'text';
  input.value = obj.label || obj.text || '';
  input.className = 'inline-text-input';
  input.style.left = (rect.left + sx) + 'px';
  input.style.top  = (rect.top  + sy) + 'px';
  // match world-unit font size scaled to screen
  input.style.fontSize = `${Math.round((obj.type === 'text' ? TEXT_SIZE_WORLD : LABEL_SIZE_WORLD) * state.zoom)}px`;
  document.body.appendChild(input);
  input.focus();
  input.select();

  function commit() {
    const val = input.value.trim();
    snapshot();
    if (obj.type === 'text') {
      obj.text = val;
      obj.w = Math.max(40, val.length * (TEXT_SIZE_WORLD * 0.62));
      obj.h = TEXT_SIZE_WORLD * 1.4;
    } else {
      obj.label = val;
    }
    input.remove();
    persistAndRedraw();
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { input.remove(); draw(); }
    e.stopPropagation();
  });
  input.addEventListener('blur', commit);
}

// ── Pointer events ──
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  const p = screenToWorld(e.clientX, e.clientY);
  state.pointerId = e.pointerId;
  state.startX = p.x;
  state.startY = p.y;

  if (state.spaceDown || e.button === 1) {
    state.isPanning = true;
    updateCursor();
    return;
  }

  if (state.tool === 'select') {
    const hit = hitTest(p.x, p.y);
    state.selectedId = hit?.id || null;
    if (hit) {
      // drag the object
      state.isDragging = true;
      state.dragObj = hit;
      // offset from object origin to click point
      if (hit.type === 'pen') {
        state.dragOffX = p.x - hit.points[0].x;
        state.dragOffY = p.y - hit.points[0].y;
      } else if (hit.type === 'arrow') {
        state.dragOffX = p.x - hit.x1;
        state.dragOffY = p.y - hit.y1;
      } else {
        state.dragOffX = p.x - hit.x;
        state.dragOffY = p.y - hit.y;
      }
      snapshot();
    } else {
      state.isPanning = true;
    }
    updateCursor(!!hit);
    draw();
    return;
  }

  if (state.tool === 'erase') {
    const hit = hitTest(p.x, p.y);
    if (hit) {
      snapshot();
      state.objects = state.objects.filter((o) => o.id !== hit.id);
      persistAndRedraw();
    }
    return;
  }

  snapshot();
  state.isDrawing = true;

  if (state.tool === 'pen')     state.temp = { id: uid(), type: 'pen',     color: colors.ink,    points: [{ x: p.x, y: p.y }] };
  if (state.tool === 'rect')    state.temp = { id: uid(), type: 'rect',    color: colors.ink,    x: p.x, y: p.y, w: 0, h: 0, label: '' };
  if (state.tool === 'ellipse') state.temp = { id: uid(), type: 'ellipse', color: colors.accent, x: p.x, y: p.y, w: 0, h: 0, label: '' };
  if (state.tool === 'arrow')   state.temp = { id: uid(), type: 'arrow',   color: colors.blue,   x1: p.x, y1: p.y, x2: p.x, y2: p.y };

  if (state.tool === 'text') {
    const obj = { id: uid(), type: 'text', color: colors.ink, x: p.x, y: p.y, w: 100, h: TEXT_SIZE_WORLD * 1.4, text: '' };
    state.objects.push(obj);
    state.temp = null;
    state.isDrawing = false;
    persistAndRedraw();
    startLabelEdit(obj);
  }
});

canvas.addEventListener('pointermove', (e) => {
  const p = screenToWorld(e.clientX, e.clientY);

  if (state.isPanning) {
    state.panX += e.movementX;
    state.panY += e.movementY;
    draw();
    return;
  }

  // drag selected object
  if (state.isDragging && state.dragObj) {
    const o = state.dragObj;
    const nx = p.x - state.dragOffX;
    const ny = p.y - state.dragOffY;
    if (o.type === 'pen') {
      const dx = nx - o.points[0].x;
      const dy = ny - o.points[0].y;
      o.points = o.points.map((pt) => ({ x: pt.x + dx, y: pt.y + dy }));
    } else if (o.type === 'arrow') {
      const dx = nx - o.x1;
      const dy = ny - o.y1;
      o.x1 += dx; o.y1 += dy;
      o.x2 += dx; o.y2 += dy;
    } else {
      o.x = nx; o.y = ny;
    }
    draw();
    return;
  }

  // hover cursor update in select mode
  if (state.tool === 'select' && !state.isDrawing) {
    const hit = hitTest(p.x, p.y);
    updateCursor(!!hit);
  }

  if (!state.isDrawing || !state.temp) return;
  if (state.temp.type === 'pen') state.temp.points.push({ x: p.x, y: p.y });
  if (state.temp.type === 'rect' || state.temp.type === 'ellipse') {
    state.temp.w = p.x - state.startX;
    state.temp.h = p.y - state.startY;
  }
  if (state.temp.type === 'arrow') { state.temp.x2 = p.x; state.temp.y2 = p.y; }
  draw();
});

canvas.addEventListener('pointerup', () => {
  if (state.isPanning) {
    state.isPanning = false;
    updateCursor();
    persistAndRedraw();
    return;
  }
  if (state.isDragging) {
    state.isDragging = false;
    state.dragObj = null;
    persistAndRedraw();
    return;
  }
  if (state.isDrawing && state.temp) {
    state.objects.push(state.temp);
    state.temp = null;
    persistAndRedraw();
  }
  state.isDrawing = false;
});

// double-click: edit label on shape, or edit text object
canvas.addEventListener('dblclick', (e) => {
  const p = screenToWorld(e.clientX, e.clientY);
  const hit = hitTest(p.x, p.y);
  if (!hit) return;
  if (hit.type === 'rect' || hit.type === 'ellipse' || hit.type === 'text' || hit.type === 'arrow') {
    startLabelEdit(hit);
  }
});

// ── Keyboard shortcuts ──
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if (e.code === 'Space') { e.preventDefault(); state.spaceDown = true; updateCursor(); }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    e.shiftKey ? redo() : undo();
    return;
  }

  const map = { s: 'select', r: 'rect', t: 'text', a: 'arrow', e: 'erase', p: 'pen', o: 'ellipse' };
  if (!e.metaKey && !e.ctrlKey && map[e.key.toLowerCase()]) {
    setTool(map[e.key.toLowerCase()]);
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') {
    state.spaceDown = false;
    updateCursor();
  }
});

// ── Zoom toward cursor, higher sensitivity ──
window.addEventListener('wheel', (e) => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  const raw = e.deltaMode === 0 ? e.deltaY * 0.008 : e.deltaY * 0.12;
  const factor = 1 + Math.max(-0.3, Math.min(0.3, -raw));
  const rect = canvas.getBoundingClientRect();
  applyZoom(factor, e.clientX - rect.left, e.clientY - rect.top);
}, { passive: false });

window.addEventListener('resize', resize);

// ── Toolbar buttons ──
tools.forEach((btn) => btn.addEventListener('click', () => setTool(btn.dataset.tool)));

const zoomLabel = document.querySelector('[data-zoom-label]');
const exportMenu = document.querySelector('.export-menu');

function updateZoomLabel() {
  if (zoomLabel) zoomLabel.textContent = Math.round(state.zoom * 100) + '%';
}

function applyZoom(factor, cx, cy) {
  const rect = canvas.getBoundingClientRect();
  const mx = (cx !== undefined ? cx : rect.width / 2);
  const my = (cy !== undefined ? cy : rect.height / 2);
  const newZoom = Math.min(8, Math.max(0.05, state.zoom * factor));
  state.panX = mx - (mx - state.panX) * (newZoom / state.zoom);
  state.panY = my - (my - state.panY) * (newZoom / state.zoom);
  state.zoom = newZoom;
  updateZoomLabel();
  persistAndRedraw();
}

function exportPNG() {
  const link = document.createElement('a');
  link.download = 'draw-board.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

async function exportCopy() {
  canvas.toBlob(async (blob) => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    } catch (err) {
      alert('Clipboard copy not supported in this browser.');
    }
  }, 'image/png');
}

// close export menu when clicking outside
document.addEventListener('click', (e) => {
  if (exportMenu && !e.target.closest('.export-wrap')) {
    exportMenu.hidden = true;
  }
});

actionButtons.forEach((btn) => btn.addEventListener('click', () => {
  const action = btn.dataset.action;
  if (action === 'undo') undo();
  if (action === 'redo') redo();
  if (action === 'clear') { snapshot(); state.objects = []; persistAndRedraw(); }
  if (action === 'export-toggle') { exportMenu.hidden = !exportMenu.hidden; }
  if (action === 'export-png') { exportPNG(); exportMenu.hidden = true; }
  if (action === 'export-copy') { exportCopy(); exportMenu.hidden = true; }
  if (action === 'zoom-in')  applyZoom(1.25);
  if (action === 'zoom-out') applyZoom(0.8);
  if (action === 'recenter') {
    state.panX = 0; state.panY = 0; state.zoom = 1;
    updateZoomLabel();
    persistAndRedraw();
  }
  if (action === 'about') {
    document.getElementById('aboutModal').hidden = false;
    document.getElementById('aboutBackdrop').hidden = false;
  }
}));

importInput.addEventListener('change', async () => {
  const file = importInput.files?.[0];
  if (!file) return;
  const text = await file.text();
  const data = JSON.parse(text);
  if (Array.isArray(data.objects)) {
    snapshot();
    state.objects = data.objects;
    state.zoom  = data.zoom  || 1;
    state.panX  = data.panX  || 0;
    state.panY  = data.panY  || 0;
    persistAndRedraw();
  }
});

// ── Boot ──
const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
if (stored) {
  state.objects = stored.objects || [];
  state.zoom    = stored.zoom    || 1;
  state.panX    = stored.panX    || 0;
  state.panY    = stored.panY    || 0;
}

setTool('select');
updateZoomLabel();
resize();
draw();

// ── About modal ──
function closeAbout() {
  document.getElementById('aboutModal').hidden = true;
  document.getElementById('aboutBackdrop').hidden = true;
}
document.querySelector('.about-modal-close').addEventListener('click', closeAbout);
document.getElementById('aboutBackdrop').addEventListener('click', closeAbout);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAbout();
});
