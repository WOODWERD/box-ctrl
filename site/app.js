// Box Ctrl page. Rules live in core.js; this file draws them and handles input.
import * as c from './core.js';
import { ICONS, ICON_GROUPS, searchIcons } from './icons.js';
import { searchCatalog, CATALOG_DATE, BRANDS } from './catalog.js';
import { client, repoError, LOGO_PATH, TOOL_CTRL_PATH } from './github.js';
import { syncOnce, waiting, readRemote } from './sync.js';
import { readToolCtrl, planToolCtrl, applyToolCtrl } from './toolctrl.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const KEY = 'boxctrl.v1', SEEN = 'boxctrl.tourSeen', READ = 'boxctrl.noticesRead', NOTICE_VERSION = '1';
const X_ICON = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
const PLUS_ICON = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
const POINTER = '<svg class="ic solid" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l10 7-10 7Z"/></svg>';
const SEARCH_ICON = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.500" cy="10.500" r="6"/><path d="M15 15l5 5"/></svg>';
const iconSvg = (key) => { const i = ICONS[key]; return i ? `<svg class="lic" viewBox="0 0 24 24" aria-hidden="true"><path d="${i.d}"${i.rot ? ` transform="rotate(${i.rot} 12 12)"` : ''}/></svg>` : '<svg class="lic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14"/></svg>'; };

const start = () => ({
  profile: c.PROFILES[0].id, custom: { W: 120, H: 25 }, owner: '', prefix: 'BOX-', startNo: 1, extraCols: [], groups: c.startGroups(), boxes: c.exampleBoxes(), inputs: { ...c.DEFAULTS }, route: 'liene', paper: 'letter', sel: 0,
  markTab: 'up', logo: null, textMark: { text: '', frame: 'none' }, iconMark: '',
});
const S = { ...start(), examples: true, panel: null, plan: null, fileNote: '', logoNote: '', pending: null, pendingList: null, stored: true, saving: false, tour: null, tourSeen: false, catBrand: 'All' };
const bad = {};

// The one mark in use, from the tab that's selected (BX-R40)
function mark() {
  if (S.markTab === 'up') return S.logo || { kind: 'none' };
  if (S.markTab === 'text') return S.textMark.text ? { kind: 'text', ...S.textMark } : { kind: 'none' };
  if (S.markTab === 'icon') return S.iconMark ? { kind: 'icon', icon: S.iconMark } : { kind: 'none' };
  return { kind: 'none' };
}
const listOf = () => ({ ...S, mark: mark() });

// ---------- storage (BX-R93). The tutorial never saves (BX-R122) ----------
function save() {
  if (S.tour) return;
  c.withKeys(S.boxes);
  later(); // BX-R149: changes go to GitHub a few seconds after the last edit
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...c.writeList(listOf()), examples: S.examples, ui: { markTab: S.markTab, logo: S.logo, textMark: S.textMark, iconMark: S.iconMark } }));
    S.stored = true;
  } catch { S.stored = false; }
}
function applyMark(m) {
  S.markTab = m.kind === 'img' ? 'up' : m.kind === 'text' ? 'text' : m.kind === 'icon' ? 'icon' : 'none';
  S.logo = m.kind === 'img' ? m : null;
  if (m.kind === 'text') S.textMark = { text: m.text, frame: m.frame };
  if (m.kind === 'icon') S.iconMark = m.icon;
}
function restore() {
  try {
    S.tourSeen = localStorage.getItem(SEEN) === '1';
    const t = localStorage.getItem(KEY);
    if (!t) { localStorage.setItem(KEY + '.probe', '1'); localStorage.removeItem(KEY + '.probe'); return; }
    const o = JSON.parse(t), r = c.readList(o);
    Object.assign(S, r, { examples: !!o.examples });
    applyMark(r.mark);
    if (o.ui) {
      if (['up', 'text', 'icon', 'none'].includes(o.ui.markTab)) S.markTab = o.ui.markTab;
      const lg = c.readList({ boxes: [], mark: o.ui.logo }).mark; S.logo = lg.kind === 'img' ? lg : null;
      const tm = c.readList({ boxes: [], mark: { kind: 'text', ...o.ui.textMark } }).mark; S.textMark = { text: tm.text || '', frame: tm.frame || 'none' };
      S.iconMark = ICONS[o.ui.iconMark] ? o.ui.iconMark : '';
    }
    if (!S.boxes.length) S.boxes = [c.blankBox(c.nextId([], S.prefix))];
  } catch { S.stored = false; }
}
const groupOf = (id) => S.groups.find((g) => g.id === id) || S.groups.find((g) => g.id === c.OTHER);
function changed() { S.examples = false; S.fileNote = ''; S.undoIds = null; S.tcUndo = null; save(); refresh(); }

// ---------- text and images ----------
const mctx = document.createElement('canvas').getContext('2d');
const measure = (t, w) => { mctx.font = `${w} 100px Inter`; return mctx.measureText(t).width / 100; };
const images = new Map();
function image(src) {
  if (images.has(src)) return images.get(src);
  const i = new Image(); i.onload = () => refresh(true); i.src = src; images.set(src, i); return i;
}

function text(ctx, t, x, y, size, weight, colour, spacing = 0, align = 'left') {
  ctx.font = `${weight} ${size}px Inter`; ctx.fillStyle = colour; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  const gaps = t.length * spacing * size;
  if (!spacing) { const w = ctx.measureText(t).width; ctx.fillText(t, align === 'right' ? x - w : x, y); return; }
  let px = align === 'right' ? x - ctx.measureText(t).width - gaps : x;
  for (const ch of t) { ctx.fillText(ch, px, y); px += ctx.measureText(ch).width + spacing * size; }
}

function drawIcon(ctx, key, x, y, size, colour) {
  const i = ICONS[key]; if (!i) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(size / 24, size / 24);
  if (i.rot) { ctx.translate(12, 12); ctx.rotate(i.rot * Math.PI / 180); ctx.translate(-12, -12); }
  ctx.lineWidth = 1; ctx.lineCap = 'square'; ctx.lineJoin = 'miter'; ctx.miterLimit = 4; ctx.strokeStyle = colour; ctx.stroke(new Path2D(i.d)); ctx.restore();
}

function drawMark(ctx, m, l, ox, oy, k) {
  const X = (v) => ox + v * k, Y = (v) => oy + v * k, s = l.slot;
  if (m.kind === 'img') {
    const i = image(m.src); if (!i.complete || !i.naturalWidth) return;
    const f = c.fitMark(s, i.naturalWidth, i.naturalHeight); ctx.drawImage(i, X(f.x), Y(f.y), f.w * k, f.h * k);
  } else if (m.kind === 'icon') {
    const size = Math.min(s.w, s.h); drawIcon(ctx, m.icon, X(s.x + s.w - size), Y(s.y + (s.h - size) / 2), size * k, '#000000');
  } else if (m.kind === 'text') {
    const size = Math.min(s.h * 0.5, s.w * 0.86 / (measure(m.text, 700) + 0.04 * m.text.length || 1)), w = size * (measure(m.text, 700) + 0.04 * m.text.length), pad = size * 0.8;
    const framed = m.frame === 'box', right = s.x + s.w - (framed ? pad : 0), cy = s.y + s.h / 2;
    text(ctx, m.text, X(right), Y(cy + size * 0.36), size * k, 700, '#000000', 0.04, 'right');
    ctx.strokeStyle = '#000000'; ctx.lineWidth = Math.max(0.3, size * 0.09) * k;
    if (framed) ctx.strokeRect(X(right - w - pad), Y(cy - size * 0.36 - pad), (w + 2 * pad) * k, (size * 0.73 + 2 * pad) * k);
    if (m.frame === 'rule') { ctx.beginPath(); ctx.moveTo(X(right - w), Y(cy + size * 0.75)); ctx.lineTo(X(right), Y(cy + size * 0.75)); ctx.stroke(); }
  }
}

// Draws one label with its top-left at ox, oy. The artwork stops B short of the cut (BX-R10, BX-R70).
function drawLabel(ctx, box, ox, oy, k) {
  const size = c.profileSize(S), [W, H] = size.sticker, B = S.inputs.B, m = mark(), l = c.layout(box, W, H, B, measure, m.kind !== 'none', S.owner);
  const g = groupOf(box.groupId), ink = c.bandText(g), X = (v) => ox + v * k, Y = (v) => oy + v * k;
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(X(l.x0), Y(l.y0), l.A * k, l.C * k);
  ctx.fillStyle = g.color; ctx.fillRect(X(l.band.x), Y(l.band.y), l.band.w * k, l.band.h * k);
  if (l.icon) drawIcon(ctx, l.icon.key, X(l.icon.x), Y(l.icon.y), l.icon.size * k, ink);
  text(ctx, l.name, X(l.tx), Y(l.y1), l.s1 * k, 700, ink, 0.02);
  if (l.kind) text(ctx, l.kind, X(l.tx), Y(l.y2), l.s2 * k, 700, ink, 0.06);
  const cc = c.contentsColour(ink, g.color);
  l.contents.forEach((t) => text(ctx, t.t, X(l.tx), Y(t.y), l.s3 * k, 400, cc));
  l.owner.forEach((t) => text(ctx, t.t, X(l.fx), Y(t.y), l.ownSize * k, 400, '#4A4A4A', 0.08));
  if (box.id) text(ctx, box.id, X(l.fx), Y(l.y6), l.s4 * k, 700, '#4A4A4A', 0.08);
  drawMark(ctx, m, l, ox, oy, k);
  return l;
}

function drawPreview(canvas, width, cut) {
  const size = c.profileSize(S), [W, H] = size.sticker, dpr = window.devicePixelRatio || 1, cssW = Math.max(200, width), k = cssW * dpr / W;
  canvas.width = Math.round(W * k); canvas.height = Math.round(H * k); canvas.style.aspectRatio = `${W} / ${H}`;
  const ctx = canvas.getContext('2d'), l = drawLabel(ctx, S.boxes[S.sel] || c.blankBox(''), 0, 0, k);
  if (cut) {
    const st = getComputedStyle(document.body);
    ctx.save(); ctx.strokeStyle = st.getPropertyValue('--accent'); ctx.lineWidth = 2 * dpr;
    ctx.strokeRect(l.foot.x * k, l.foot.y * k, l.foot.w * k, l.foot.h * k);
    ctx.setLineDash([W / 120 * k, W / 170 * k]); ctx.strokeStyle = st.getPropertyValue('--soft'); ctx.lineWidth = 1 * dpr;
    ctx.strokeRect(.5, .5, W * k - 1, H * k - 1); ctx.restore();
  }
}

function placeLabels(ctx, labels, cap, W, H, G, originX, originY, cell, k) {
  labels.forEach((b, i) => {
    const q = i % cap.cols, r = Math.floor(i / cap.cols), x = originX + q * (cap.w + G), y = originY + r * (cap.h + G);
    ctx.save(); ctx.translate((x + cap.w / 2) * k, (y + cap.h / 2) * k);
    if (cap.rot) ctx.rotate(-Math.PI / 2);
    cell(b, -W / 2 * k, -H / 2 * k); ctx.restore();
  });
}

function drawSheet(canvas, labels, cap, k) {
  const [W, H] = c.profileSize(S).sticker, G = S.inputs.G, o = c.gridOrigin(c.SHEET.W, c.SHEET.H, cap, G), ctx = canvas.getContext('2d');
  canvas.width = Math.round(c.SHEET.W * k); canvas.height = Math.round(c.SHEET.H * k);
  placeLabels(ctx, labels, cap, W, H, G, o.x, o.y, (b, x, y) => drawLabel(ctx, b, x, y, k), k);
}

function drawOfficePage(canvas, labels, cap, k) {
  const size = c.profileSize(S), [cw, ch] = size.card, [W, H] = size.sticker, P = c.PAPER[S.paper], G = c.OFFICE.gutter, o = c.gridOrigin(P.W, P.H, cap, G), ctx = canvas.getContext('2d');
  canvas.width = Math.round(P.W * k); canvas.height = Math.round(P.H * k);
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  placeLabels(ctx, labels, { ...cap }, cw, ch, G, o.x, o.y, (b, x, y) => { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y, cw * k, ch * k); drawLabel(ctx, b, x + (cw - W) / 2 * k, y + (ch - H) / 2 * k, k); }, k);
  // Crop marks stop short of the label (BX-R83), then the scale check (BX-R84)
  ctx.strokeStyle = '#0C0B09'; ctx.lineWidth = Math.max(0.25 * k, 1); ctx.beginPath();
  const t = 2.5, g = 0.4, line = (a, b, d, e) => { ctx.moveTo(a * k, b * k); ctx.lineTo(d * k, e * k); };
  labels.forEach((_, i) => {
    const x = o.x + (i % cap.cols) * (cap.w + G), y = o.y + Math.floor(i / cap.cols) * (cap.h + G), xs = [x, x + cap.w], ys = [y, y + cap.h];
    xs.forEach((a, ai) => ys.forEach((b, bi) => {
      const sx = ai ? 1 : -1, sy = bi ? 1 : -1;
      line(a + sx * g, b, a + sx * (t + g), b); line(a, b + sy * g, a, b + sy * (t + g));
    }));
  });
  const yb = P.H - 3.5, x0 = (P.W - 50) / 2; line(x0, yb, x0 + 50, yb); line(x0, yb - 1, x0, yb + 1); line(x0 + 50, yb - 1, x0 + 50, yb + 1); ctx.stroke();
  text(ctx, 'This line should measure 50 mm.', (x0 + 52) * k, (yb + 0.8) * k, 2.2 * k, 400, '#0C0B09');
}

// ---------- status ----------
function strip(kind, title, words, ...actions) {
  const d = el('div', `health ${kind}`); d.setAttribute('role', kind === 'bad' ? 'alert' : 'status');
  d.append(el('b', '', title), el('span', '', words));
  actions.forEach((a) => d.append(button('key', a.label, a.run)));
  return d;
}
function state(id, words, tone) { const e = $(id); e.textContent = words; e.className = `tier-s ${tone}`; }
function led(id, tone) { $(id).className = `led${tone ? ` on-${tone}` : ''}`; }
function button(cls, words, run, html) {
  const b = el('button', cls, html ? null : words); b.type = 'button'; if (html) b.innerHTML = html + words; b.onclick = run; return b;
}

// ---------- the list (BX-R30 to BX-R38, BX-U06) ----------
function select(i) {
  if (S.sel === i) return;
  S.sel = i;
  [...$('boxes').querySelectorAll('.rowwrap')].forEach((r, j) => { r.classList.toggle('sel', j === i); r.querySelector('.pick').setAttribute('aria-current', String(j === i)); });
  refresh();
}
function groupSelect(value, onchange, label) {
  const wrap = el('span', 'tm gp'), sw = el('i', 'sw'), sel = el('select');
  sel.setAttribute('aria-label', label);
  const paint = () => { sw.style.background = groupOf(sel.value).color; };
  S.groups.forEach((g) => { const o = el('option', '', g.name); o.value = g.id; sel.append(o); });
  sel.value = value; paint();
  sel.onchange = () => { paint(); onchange(sel.value); };
  wrap.append(sw, sel);
  return wrap;
}
function field(obj, key, max, hint, cls, n) {
  const f = el('input', `in ${cls}`); f.value = obj[key]; f.maxLength = max; f.placeholder = hint; f.setAttribute('aria-label', `Box ${n} ${hint}`);
  f.oninput = () => {
    const pos = f.selectionStart, before = f.value.slice(0, pos), after = f.value.slice(pos), nb = c.fixSymbols(before), na = c.fixSymbols(after);
    if (nb + na !== f.value) { f.value = (nb + na).slice(0, max); f.setSelectionRange(nb.length, nb.length); }
    obj[key] = f.value; changed();
  };
  return f;
}
function buildList() {
  if (!S.boxes.length) S.boxes.push(c.blankBox(c.nextId([], S.prefix)));
  S.sel = Math.min(S.sel, S.boxes.length - 1);
  const list = $('boxes'); list.textContent = '';
  S.boxes.forEach((b, i) => {
    const n = i + 1, row = el('div', `rowwrap${i === S.sel ? ' sel' : ''}`), pick = el('button', 'pick'), rowc = el('div', 'rowc'), one = el('div', 'row1'), two = el('div', 'row2'), notes = el('div', 'strips');
    pick.type = 'button'; pick.innerHTML = POINTER; pick.setAttribute('aria-current', String(i === S.sel)); pick.setAttribute('aria-label', `Preview box ${n}`); pick.onclick = () => select(i);
    const tool = button('key sq', '', () => { S.sel = i; openPanel('tools', { index: i }); }, SEARCH_ICON); tool.setAttribute('aria-label', `Choose a standard tool for box ${n}`); tool.title = 'Choose a standard tool';
    const ic = el('button', 'key sq'); ic.type = 'button'; ic.innerHTML = iconSvg(b.icon); ic.title = ICONS[b.icon]?.name || 'No icon'; ic.setAttribute('aria-label', `Icon for box ${n}: ${ic.title}`);
    ic.onclick = () => { S.sel = i; openPanel('icons', { target: 'box', index: i }); };
    const q = el('input', 'in m'); q.value = b.qty; q.type = 'number'; q.min = 0; q.max = 99; q.setAttribute('aria-label', `How many of box ${n}`);
    q.oninput = () => { b.qty = c.clampQty(q.value); changed(); };
    const x = el('button', 'key sq'); x.type = 'button'; x.innerHTML = X_ICON; x.setAttribute('aria-label', `Remove box ${n}`);
    x.onclick = () => { S.boxes.splice(i, 1); if (S.sel > i) S.sel--; buildList(); changed(); };
    one.append(groupSelect(b.groupId, (v) => { b.groupId = v; changed(); }, `Box ${n} group`), tool, ic, field(b, 'id', c.LIMITS.id, 'ID', 'm', n), field(b, 'name', c.LIMITS.name, 'Name', 'nm', n), q, x);
    two.append(field(b, 'kind', c.LIMITS.kind, 'Kind', '', n), field(b, 'c1', c.LIMITS.c, 'Contents line 1', '', n), field(b, 'c2', c.LIMITS.c, 'Contents line 2', '', n));
    rowc.append(one, two, notes); row.append(pick, rowc);
    row.addEventListener('focusin', () => select(i)); row.addEventListener('click', () => select(i));
    list.append(row);
  });
}

// One line per box that needs attention (BX-S04, BX-R33, BX-R37)
function boxNotes() {
  const [W, H] = c.profileSize(S).sticker, m = mark(), dup = c.duplicateIds(S.boxes), dropped = new Set(); let flagged = 0;
  const rows = [...$('boxes').querySelectorAll('.rowwrap')];
  S.boxes.forEach((b, i) => {
    const notes = rows[i]?.querySelector('.strips'); if (!notes) return;
    notes.textContent = '';
    const l = c.layout(b, W, H, S.inputs.B, measure, m.kind !== 'none', S.owner), id = b.id || `Box ${i + 1}`;
    l.dropped.forEach((d) => dropped.add(d));
    if (!String(b.name).trim()) notes.append(el('span', 'small', 'No name, so this box makes no label.'));
    if (l.small.length && b.name) { flagged++; notes.append(strip('warn', 'Text too small', `${id}: the ${l.small[0]} is small at this label size. Shorten it.`)); }
    if (dup.has(String(b.id).trim().toUpperCase())) { flagged++; notes.append(strip('warn', 'ID used twice', `${id} is on more than one box. Give one a new ID.`)); }
  });
  return { flagged, dropped: [...dropped] };
}

// ---------- panels: one open at a time, and its action is the one filled action (BX-U09) ----------
function openPanel(name, data) { S.panel = name; S.plan = data || null; renderPanel(); refresh(); }
function closePanel() { S.panel = null; S.plan = null; renderPanel(); refresh(); }
function renderPanel() {
  const inArea1 = S.panel === 'icons' && S.plan?.target === 'mark', p = $(inArea1 ? 'panel1' : 'panel'), other = $(inArea1 ? 'panel' : 'panel1');
  other.textContent = ''; other.hidden = true; other.className = '';
  p.textContent = ''; p.hidden = !S.panel; p.className = S.panel ? 'panel' : ''; p.removeAttribute('role');
  if (S.panel === 'groups') groupsPanel(p);
  if (S.panel === 'icons') iconsPanel(p);
  if (S.panel === 'tools') toolsPanel(p);
  if (S.panel === 'list') listPanel(p);
  if (S.panel === 'sheet') sheetPanel(p);
  if (S.panel === 'connect') connectPanel(p);
  if (S.panel === 'choice') choicePanel(p);
  if (S.panel === 'conflict') conflictPanel(p);
  if (S.panel === 'tc') toolCtrlPanel(p);
}

function groupsPanel(p) {
  p.setAttribute('aria-label', 'Groups');
  p.append(el('h3', '', 'Groups'));
  const counts = (id) => S.boxes.filter((b) => b.groupId === id).length, msg = el('div', 'strips');
  S.groups.forEach((g) => {
    const row = el('div', 'tt'), name = el('input', 'in'), sws = el('div', 'sws'), n = counts(g.id);
    name.value = g.name; name.maxLength = c.LIMITS.group; name.setAttribute('aria-label', 'Group name');
    name.onchange = () => {
      const e = c.groupNameError(S.groups, name.value, g.id);
      msg.textContent = ''; if (e) { msg.append(strip('bad', 'Group name', e)); name.value = g.name; return; }
      g.name = name.value.trim(); buildList(); changed();
    };
    sws.setAttribute('role', 'group'); sws.setAttribute('aria-label', 'Band colour');
    c.PALETTE.forEach((k) => {
      const b = el('button', 'swb'), s = el('span'); b.type = 'button'; s.style.background = k.hex; b.append(s);
      b.title = k.name; b.setAttribute('aria-label', k.name); b.setAttribute('aria-pressed', String(k.hex.toUpperCase() === g.color.toUpperCase()));
      b.onclick = () => { g.color = k.hex; renderPanel(); buildList(); changed(); };
      sws.append(b);
    });
    const custom = !c.PALETTE.some((k) => k.hex.toUpperCase() === g.color.toUpperCase());
    const lab = el('label', `swc${custom ? ' on' : ''}`), chip = el('span'); lab.title = 'Custom colour'; lab.innerHTML = PLUS_ICON;
    const inp = el('input'); inp.type = 'color'; inp.value = g.color; inp.setAttribute('aria-label', `Custom colour for ${g.name}`);
    const showCustom = () => { lab.querySelector('svg')?.remove(); lab.classList.add('on'); chip.style.background = g.color; if (!chip.isConnected) lab.prepend(chip); };
    if (custom) showCustom();
    // input fires while the picker is open, so the list and label follow it. Rebuilding the panel here would close the picker.
    inp.oninput = () => {
      g.color = inp.value.toUpperCase(); sws.querySelectorAll('.swb').forEach((b) => b.setAttribute('aria-pressed', 'false')); showCustom();
      buildList(); changed();
    };
    inp.onchange = () => { g.color = inp.value.toUpperCase(); renderPanel(); buildList(); changed(); };
    lab.append(inp); sws.append(lab);
    // Band text is automatic, unless a group sets its own (BX-R23)
    const tc = el('label', 'textcol'), ti = el('input'); ti.type = 'color'; ti.value = c.bandText(g); ti.setAttribute('aria-label', `Band text colour for ${g.name}`);
    ti.onchange = () => { g.text = ti.value.toUpperCase(); renderPanel(); changed(); };
    tc.append('Text', ti); sws.append(tc);
    if (g.text) sws.append(button('key', 'Auto', () => { delete g.text; renderPanel(); changed(); }));
    row.append(name, sws, el('span', 'small mono count', `${n} box${n === 1 ? '' : 'es'}`));
    if (g.id !== c.OTHER) {
      const x = el('button', 'key sq'); x.type = 'button'; x.innerHTML = X_ICON; x.setAttribute('aria-label', `Remove ${g.name}`);
      x.onclick = () => {
        const moved = c.removeGroup(S, g.id); renderPanel(); buildList(); changed();
        $('panel').querySelector('.strips').append(strip('ok', 'Group removed', `${moved} box${moved === 1 ? '' : 'es'} moved to Other.`));
      };
      row.append(x);
    } else row.append(el('span'));
    p.append(row);
    if (g.text && c.contrast(g.color, g.text) < 4.5) p.append(strip('warn', 'Low contrast', `${g.name} text may be hard to read on this band. Use Auto, or print one label to check.`));
  });
  const note = el('p', 'small', 'Band text picks black or white for you. Custom colours can shift in print. Print one label to check.'), tools = el('div', 'tools');
  tools.append(button('key', 'Add group', () => {
    let n = 1; while (S.groups.some((g) => g.name === `Group ${n}`)) n++;
    S.groups.splice(S.groups.length - 1, 0, { id: c.slug(), name: `Group ${n}`, color: c.nextColour(S.groups) });
    renderPanel(); buildList(); changed();
  }, PLUS_ICON), el('span', 'sp'), button('key', 'Close', closePanel));
  p.append(msg, note, tools);
}

function iconsPanel(p) {
  const t = S.plan, box = t.target === 'box' ? S.boxes[t.index] : null, current = box ? box.icon : S.iconMark;
  p.setAttribute('aria-label', 'Icon library');
  p.append(el('h3', '', box ? `Choose an icon for ${box.id || `box ${t.index + 1}`}` : 'Choose an icon for your mark'));
  const q = el('input', 'in'); q.placeholder = 'Search icons, such as domino or sander'; q.setAttribute('aria-label', 'Search icons');
  const out = el('div', 'icons');
  const pick = (key) => { if (box) box.icon = key; else S.iconMark = key; S.panel = null; S.plan = null; renderPanel(); buildList(); changed(); };
  const cell = (key, label) => { const b = el('button', 'icb'); b.type = 'button'; b.innerHTML = iconSvg(key); b.append(el('span', '', label)); b.setAttribute('aria-pressed', String(key === current)); b.onclick = () => pick(key); return b; };
  const draw = () => {
    out.textContent = '';
    if (q.value.trim()) {
      const hits = searchIcons(q.value), g = el('div', 'icongrid'); hits.forEach((i) => g.append(cell(i.key, i.name)));
      out.append(hits.length ? g : el('p', 'small note', 'No icons match. Try a plainer word, such as saw.'));
      return;
    }
    const none = el('div', 'icongrid'); none.append(cell('', 'None')); out.append(none);
    ICON_GROUPS.forEach((g) => { const grid = el('div', 'icongrid'); g.keys.forEach((k) => grid.append(cell(k, ICONS[k].name))); out.append(el('span', 'micro', g.group), grid); });
  };
  q.oninput = draw; draw();
  const tools = el('div', 'tools'); tools.append(el('span', 'sp'), button('key', 'Close', closePanel));
  p.append(q, out, tools); q.focus();
}

function toolsPanel(p) {
  const adding = !!S.plan.add, i = S.plan.index, box = adding ? null : S.boxes[i];
  p.setAttribute('aria-label', 'Standard tools from manufacturers');
  p.append(el('h3', '', adding ? 'Standard tools from manufacturers' : `Choose a standard tool for ${box.id || `box ${i + 1}`}`), el('p', 'small', adding ? `Already loaded. Pick a maker, then pick your tools. Each one adds a box in that maker's group.` : `Already loaded. Pick a maker, then your tool.`));
  const tabs = el('div', 'segc wrap'); tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', 'Brand');
  ['All', ...BRANDS].forEach((b) => {
    const t = el('button', '', b); t.type = 'button'; t.setAttribute('aria-pressed', String(b === S.catBrand));
    t.onclick = () => { S.catBrand = b; tabs.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === t))); draw(); };
    tabs.append(t);
  });
  const q = el('input', 'in'); q.placeholder = 'Search by brand, name or kind'; q.setAttribute('aria-label', 'Search tools');
  const out = el('div', 'tlist'), msg = el('div', 'strips');
  const fill = (b, e) => {
    Object.assign(b, { name: e.name, kind: e.kind, c1: e.c1, c2: e.c2, icon: e.icon, groupId: c.groupForEntry(S.groups, e) });
  };
  const apply = (e) => { fill(box, e); S.panel = null; S.plan = null; renderPanel(); buildList(); changed(); };
  const addOne = (e) => {
    if (S.boxes.length >= c.MAX_BOXES && !S.examples) { msg.textContent = ''; msg.append(strip('bad', 'Too many boxes', `The list holds up to ${c.MAX_BOXES}.`)); return; }
    if (S.examples) S.boxes = [];
    const b = c.blankBox(c.nextId(S.boxes, S.prefix, S.startNo), 'other', e.icon); fill(b, e);
    S.boxes.push(b); S.sel = S.boxes.length - 1; buildList(); changed();
    msg.textContent = ''; msg.append(strip('ok', 'Added', `${b.name} is ${b.id}. Pick another, or press Close.`));
  };
  const choose = (e) => {
    if (adding) return addOne(e);
    if (!(box.name || box.kind || box.c1 || box.c2)) return apply(e);
    msg.textContent = '';
    msg.append(strip('warn', 'Replace this box?', `${box.name || box.id} already has text. ${e.name} would replace it.`, { label: 'Replace', run: () => apply(e) }, { label: 'Keep mine', run: () => { msg.textContent = ''; } }));
  };
  const draw = () => {
    out.textContent = '';
    const hits = searchCatalog(q.value, S.catBrand);
    hits.forEach((e) => { const b = el('button', 'tl'); b.type = 'button'; b.innerHTML = iconSvg(e.icon); const s = el('span'); s.append(el('b', '', e.name)); b.append(s, el('em', '', `${e.brand} · ${e.kind}`)); b.onclick = () => choose(e); out.append(b); });
    if (!hits.length) out.append(el('p', 'small note', 'No tools match. Type your own in the box row.'));
  };
  q.oninput = draw; draw();
  const small = el('p', 'small', 'Tool names belong to their makers. Check the name against your tool. '); small.append(el('span', 'mono', `Catalog ${CATALOG_DATE}`));
  const tools = el('div', 'tools'); if (!adding) tools.append(button('key', 'Type my own', closePanel)); tools.append(el('span', 'sp'), button('key', 'Close', closePanel));
  p.append(tabs, q, msg, out, small, tools); q.focus();
}

function listPanel(p) {
  const r = S.plan, n = r.boxes.length;
  p.setAttribute('role', 'alertdialog'); p.setAttribute('aria-label', 'Replace your list');
  const tools = el('div', 'tools');
  tools.append(button('key go', 'Replace list', () => {
    const logo = c.newLogo(mark(), r.mark) ? r.mark : null, m = logo ? { kind: 'none' } : r.mark;
    Object.assign(S, { profile: r.profile, custom: r.custom, owner: r.owner, prefix: r.prefix, startNo: r.startNo, extraCols: r.extraCols, groups: r.groups, inputs: r.inputs, route: r.route, paper: r.paper, boxes: r.boxes.length ? r.boxes : [c.blankBox(c.nextId([], r.prefix))], sel: 0, examples: false, panel: null, plan: null });
    if (!logo) applyMark(m); else { S.markTab = 'up'; S.logo = null; S.pending = { ...logo, white: false }; }
    syncInputs(); renderPanel(); buildList(); changed(); showLogoSpot();
  }), button('key', 'Cancel', closePanel));
  p.append(el('h3', '', `Replace your list with ${n} box${n === 1 ? '' : 'es'}?`), el('p', 'small', `From ${r.file}. The ${S.boxes.length} box${S.boxes.length === 1 ? '' : 'es'} here now will be gone unless you export them first.`), tools);
}

function sheetPanel(p) {
  const r = S.plan, n = r.boxes.length, base = S.examples ? 0 : S.boxes.length, parts = [`${n} box${n === 1 ? '' : 'es'}`];
  p.setAttribute('aria-label', 'Spreadsheet import');
  if (r.added.length) parts.push(`${r.added.length} new group${r.added.length === 1 ? '' : 's'}`);
  if (r.skipped.length) parts.push(`${r.skipped.length} row${r.skipped.length === 1 ? '' : 's'} skipped`);
  if (r.kept.length) parts.push(`${r.kept.length} column${r.kept.length === 1 ? '' : 's'} kept`);
  const detail = [`From ${r.file}.`];
  if (r.added.length) detail.push(`New groups: ${r.added.join(', ')}.`);
  if (r.kept.length) detail.push(`Kept with each box, never printed: ${r.kept.join(', ')}.`);
  p.append(el('h3', '', parts.join(', ')), el('p', 'small', detail.join(' ')));
  r.skipped.slice(0, 8).forEach((s) => { const [a, b] = s.split(': '); p.append(strip('warn', a, `${b} It wasn't added.`)); });
  if (r.skipped.length > 8) p.append(el('p', 'small', `And ${r.skipped.length - 8} more rows.`));
  r.iconNotes.slice(0, 4).forEach((s) => { const [a, b] = s.split(': '); p.append(strip('warn', a, b)); });
  const apply = (boxes, cols) => { Object.assign(S, { boxes, extraCols: cols, groups: r.groups, sel: 0, examples: false, panel: null, plan: null }); renderPanel(); buildList(); changed(); };
  const tools = el('div', 'tools'), add = button('key go', 'Add to list', () => (S.examples ? apply(r.boxes, r.kept) : apply(S.boxes.concat(r.boxes), c.mergeCols(S.extraCols, r.kept)))), rep = button('key', 'Replace list', () => apply(r.boxes, r.kept));
  add.disabled = !n || base + n > c.MAX_BOXES; rep.disabled = !n || n > c.MAX_BOXES;
  tools.append(add, rep, button('key', 'Cancel', closePanel));
  if (base + n > c.MAX_BOXES) p.append(strip('bad', 'Too many boxes', `The list holds up to ${c.MAX_BOXES}. This would make ${base + n}.`));
  p.append(tools);
}

// ---------- files ----------
function fileError(msg) { S.fileNote = msg; refresh(); }
async function openFile(file) {
  S.fileNote = '';
  if (!file) return;
  if (file.size > c.MAX_FILE) return fileError('That file is over 5 MB.');
  const name = file.name, lower = name.toLowerCase();
  try {
    if (lower.endsWith('.json')) {
      let r; try { r = c.readList(JSON.parse(await file.text())); } catch { return fileError("That file isn't a box list."); }
      if (r.boxes.length > c.MAX_BOXES) return fileError(`The list holds up to ${c.MAX_BOXES}. That file has ${r.boxes.length}.`);
      return openPanel('list', { ...r, file: name });
    }
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.csv') && !lower.endsWith('.xls')) return fileError('Open a .json list, an .xlsx file or a .csv file.');
    const table = lower.endsWith('.csv') ? c.parseCsv(await file.text()) : await c.readXlsx(await file.arrayBuffer());
    const read = c.readTable(table);
    if (read.error) return fileError(read.error);
    openPanel('sheet', { ...c.planImport(S, read, S.examples ? [] : S.boxes), file: name });
  } catch (e) { fileError(e.message === c.OLD_XLS ? c.OLD_XLS : "That file couldn't be read. Save it again as .xlsx or .csv."); }
}

// A logo is checked, then waits on the acknowledgement. Nothing is stored or drawn before that (BX-R110).
function logoError(msg) { S.logoNote = msg; S.pending = null; refresh(); showLogoSpot(); }
// Logo messages sit where the file was chosen, so show that spot if it's off screen (BX-R114)
function showLogoSpot() {
  const first = $('logoSpot').firstElementChild; if (!first) return;
  first.scrollIntoView({ block: 'nearest' });
  if (S.pending) first.focus({ preventScroll: true });
}
const backToLogo = () => (S.logo ? $('replaceLogo') : $('chooseLogo')).focus({ preventScroll: true });
function openLogo(file) {
  S.logoNote = '';
  if (!file) return;
  const lower = file.name.toLowerCase();
  if (!/\.(png|jpe?g|webp|svg)$/.test(lower)) return logoError(`${file.name} isn't a file Box Ctrl can open. Use PNG, JPEG, WebP or SVG, up to 5 MB.`);
  if (file.size > c.MAX_FILE) return logoError(`${file.name} is over 5 MB. Use a smaller file.`);
  // Drawn only as an image, so scripts and links in an SVG can't run or load (BX-R42)
  const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => {
    const w = img.naturalWidth || 640, h = img.naturalHeight || 640, k = c.LOGO_EDGE / Math.max(w, h), cv = el('canvas');
    cv.width = Math.round(w * k); cv.height = Math.round(h * k);
    const ctx = cv.getContext('2d');
    try {
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      const d = ctx.getImageData(0, 0, cv.width, cv.height).data; let seen = 0, light = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 40) { seen++; if (d[i] > 235 && d[i + 1] > 235 && d[i + 2] > 235) light++; }
      S.pending = { kind: 'img', src: cv.toDataURL('image/png'), file: file.name, w: cv.width, h: cv.height, origW: w, white: seen > 0 && light / seen > 0.95 };
      S.logoNote = ''; S.panel === 'icons' && closePanel(); refresh(); showLogoSpot();
    } catch { logoError(`${file.name} wouldn't draw. Try a PNG.`); }
    URL.revokeObjectURL(url);
  };
  img.onerror = () => { URL.revokeObjectURL(url); logoError(`${file.name} wouldn't draw. Try a PNG.`); };
  img.src = url;
}
function logoPanel(host) {
  const f = S.pending, d = el('div', 'panel');
  d.setAttribute('role', 'alertdialog'); d.setAttribute('aria-label', 'Before you add this logo');
  const tools = el('div', 'tools');
  tools.append(button('key go', 'I own it or have permission', () => {
    const fromRepo = S.pending.fromRepo; delete S.pending.fromRepo;
    S.logo = S.pending; S.markTab = 'up'; S.pending = null; acceptLogo(S.logo);
    if (fromRepo) { S.repoLogo = null; S.syncState = 'ok'; save(); refresh(); syncNow(); } else changed();
    backToLogo();
  }), button('key', 'Cancel', () => { S.pending = null; refresh(); backToLogo(); }));
  d.tabIndex = -1;
  const head = el('div', 'logohead'), name = el('div'), thumb = el('img', 'logothumb');
  thumb.src = f.src; thumb.alt = '';
  name.append(el('h3', '', 'Before you add this logo'), el('p', 'small mono', `${f.file} · ${f.w} × ${f.h} px`));
  head.append(thumb, name);
  d.append(head,
    el('p', 'note', "Only add a logo you own or have permission to use. You're responsible for how you use it, including any trademark or copyright in it. Box Ctrl doesn't check logos. It keeps the logo in this browser, and in your own GitHub repo if you connect one, and takes no responsibility for your use of it."), tools);
  d.querySelector('.note').style.fontSize = 'var(--t-cap)';
  host.append(d);
}

function download(blob, name) {
  const a = el('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// ---------- saving and printing ----------
const PX = 300 / 25.4;
function lieneCap() { const [W, H] = c.profileSize(S).sticker; return c.lieneCapacity(W, H, S.inputs); }
function officeCap() { const [w, h] = c.profileSize(S).card; return c.officeCapacity(w, h, S.paper); }
const blobOf = (canvas) => new Promise((r) => canvas.toBlob(r, 'image/png'));

async function saveSheets(which) {
  const cap = lieneCap(), groups = c.pages(c.labelList(S.boxes), cap.n), n = groups.length, list = which ?? groups.map((_, i) => i), note = $('saveNote');
  if (!n || S.saving) return;
  S.saving = true; refresh();
  try {
    const files = [];
    for (const i of list) {
      note.textContent = `Saving sheet ${i + 1} of ${n}…`;
      await new Promise((r) => setTimeout(r));
      const canvas = el('canvas'); drawSheet(canvas, groups[i], cap, PX);
      files.push({ name: c.sheetName(i, n), blob: await blobOf(canvas) });
    }
    const phone = matchMedia('(pointer:coarse)').matches;
    if (phone && navigator.canShare) {
      const shared = files.map((f) => new File([f.blob], f.name, { type: 'image/png' }));
      if (navigator.canShare({ files: shared })) {
        try { await navigator.share({ files: shared }); note.textContent = `Saved ${files.length} sheet${files.length === 1 ? '' : 's'}.`; }
        catch (e) { note.textContent = e.name === 'AbortError' ? 'Not saved.' : "Couldn't share the sheets. Try again."; }
        return;
      }
    }
    if (files.length === 1) download(files[0].blob, files[0].name);
    else download(c.makeZip(await Promise.all(files.map(async (f) => ({ name: f.name, data: new Uint8Array(await f.blob.arrayBuffer()) })))), c.zipName());
    note.textContent = `Saved ${files.length} sheet${files.length === 1 ? '' : 's'}.`;
  } finally { S.saving = false; refresh(true); }
}

// One image per page at true size, through the browser's print dialog (BX-R85)
async function printOffice() {
  const cap = officeCap(), groups = c.pages(c.labelList(S.boxes), cap.n), P = c.PAPER[S.paper], area = $('printArea');
  if (!groups.length) return;
  $('pageSize').textContent = `@page{size:${P.W}mm ${P.H}mm;margin:0}`;
  area.textContent = '';
  const loads = [];
  for (const g of groups) {
    const canvas = el('canvas'); drawOfficePage(canvas, g, cap, PX);
    const img = el('img', 'printpage'); img.style.width = `${P.W}mm`; img.style.height = `${P.H}mm`; img.alt = '';
    loads.push(new Promise((r) => { img.onload = r; })); img.src = canvas.toDataURL('image/png'); area.append(img);
  }
  await Promise.all(loads);
  window.print();
}

// ---------- tutorial (BX-R120 to BX-R129) ----------
const TOUR = [
  { area: 'a1Strips', target: 'hlBox', title: 'Pick the box size', words: 'Everything starts with the box. Pick yours here, or choose Custom size and measure the space the label sits in. We\'ve picked the Systainer standard card, 84 × 54 mm.' },
  { area: 'a1Strips', target: 'hlMark', title: 'Add a logo', words: "This is your mark. It prints bottom right on every label. We've added a sample logo here. For your own, press Choose logo file or drop it in, and Box Ctrl asks you to confirm you own it or have permission." },
  { area: 'a1Strips', target: 'hlOwner', title: 'Add an owner line', words: 'This prints bottom left on every label, so a box finds its way home. Try your own wording, or leave it blank.' },
  { area: 'a2Strips', target: 'boxes', title: 'Fill in a box', words: 'This part changes on each label. Type the name, kind and contents, and the icon button picks an icon. Open file brings in a whole spreadsheet.' },
  { area: 'a2Strips', target: 'addCatalog', open: true, title: 'Add standard tools', words: "You don't have to type your tools. Standard tools from Festool, Milwaukee, DEWALT, Bosch and Makita are already loaded. Pick a maker, pick a tool, and it adds a box in that maker's group, ready to edit. Try one. The magnifier on a row fills in just that box." },
  { area: 'a2Strips', target: 'openGroups', title: 'Colour a group', words: "Groups colour the band, so you can read a shelf at a glance. Each maker already has one. Press Manage groups to change a colour, and every box in it follows." },
  { area: 'a2Strips', target: 'art2', title: 'Check the label', words: 'This is the selected box, as it prints. Pick another row to see it. Anything too small or left off shows up as a note, with what to do.' },
  { area: 'a3Strips', target: 'routeSeg', title: 'Print', words: 'Liene PixCut gives you sheets of three, with the exact settings to type into the Liene app. Office printer gives you pages with crop marks, to print on card stock and trim. Try both.' },
];
function startTour() {
  const keep = ['profile', 'custom', 'owner', 'prefix', 'startNo', 'extraCols', 'groups', 'boxes', 'inputs', 'route', 'paper', 'sel', 'markTab', 'logo', 'textMark', 'iconMark', 'examples'];
  const saved = JSON.parse(JSON.stringify(Object.fromEntries(keep.map((k) => [k, S[k]]))));
  const sample = c.sampleState();
  Object.assign(S, sample, { markTab: 'up', logo: sample.mark, textMark: { text: '', frame: 'none' }, iconMark: '', examples: false, panel: null, plan: null, pending: null, logoNote: '', fileNote: '' });
  delete S.mark;
  S.tour = { step: 0, done: false, saved };
  dismissOffer(); syncInputs(); renderPanel(); buildList(); refresh(); showStep();
}
function exitTour() {
  const saved = S.tour.saved;
  S.tour = null;
  Object.assign(S, saved, { panel: null, plan: null, pending: null, logoNote: '', fileNote: '' });
  document.querySelectorAll('.hl').forEach((e) => e.classList.remove('hl'));
  syncInputs(); renderPanel(); buildList(); refresh();
  $('tourBtn').focus();
}
function showStep() {
  document.querySelectorAll('.hl').forEach((e) => e.classList.remove('hl'));
  const t = S.tour; if (!t || t.done) { refresh(); return; }
  const opened = S.panel === 'tools' && S.plan?.add;
  if (TOUR[t.step].open && !opened) openPanel('tools', { add: true });
  if (!TOUR[t.step].open && opened) closePanel();
  const step = TOUR[t.step], target = step.target === 'boxes' ? $('boxes').querySelector('.rowwrap') : $(step.target);
  target.classList.add('hl'); refresh();
  const smooth = !matchMedia('(prefers-reduced-motion:reduce)').matches;
  $(step.area).scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' });
  $(step.area).querySelector('.coach .go')?.focus({ preventScroll: true });
}
function coach() {
  const t = S.tour, d = el('div', 'panel coach'); d.setAttribute('role', 'status');
  if (t.done) {
    const tools = el('div', 'tools');
    tools.append(button('key go', 'Start my own labels', exitTour), button('key', 'Save sample sheet', () => (S.route === 'office' ? printOffice() : saveSheets())));
    d.append(el('h3', '', "That's a full set of labels"), el('p', 'note', 'You picked a box size, added a logo and an owner line, filled in your boxes, saw the standard tools and set up a print. Save this sheet to try a print, or start your own. Your own list is just as you left it.'), tools);
    return d;
  }
  const step = TOUR[t.step], tools = el('div', 'tools');
  const next = button('key go', t.step === TOUR.length - 1 ? 'Finish' : 'Next', () => { if (t.step === TOUR.length - 1) { t.done = true; } else t.step++; showStep(); });
  const back = button('key', 'Back', () => { t.step--; showStep(); }); back.disabled = t.step === 0;
  tools.append(next, back, el('span', 'sp'), button('key', 'Exit tutorial', exitTour));
  d.append(el('span', 'micro', `Step ${t.step + 1} of ${TOUR.length} · ${step.title}`), el('p', 'note', step.words), tools);
  return d;
}
// The two top notices stay until someone says they've read them (BX-U22)
let noticesHidden = false;
try { noticesHidden = localStorage.getItem(READ) === NOTICE_VERSION; } catch { /* storage unavailable */ }
function showNotices() {
  ['printerNote', 'independentNote', 'noticeAck'].forEach((id) => { $(id).hidden = noticesHidden; });
  $('showNotices').hidden = !noticesHidden; $('noticesRead').checked = false;
}
function setNotices(hide) {
  noticesHidden = hide;
  try { if (hide) localStorage.setItem(READ, NOTICE_VERSION); else localStorage.removeItem(READ); } catch { /* storage unavailable */ }
  showNotices();
}

function dismissOffer() { S.tourSeen = true; try { localStorage.setItem(SEEN, '1'); } catch { /* storage unavailable */ } }

// ---------- refresh ----------
let sheetTimer = 0;
function renderSheets() {
  const box = $('sheets'), labels = c.labelList(S.boxes), office = S.route === 'office', cap = office ? officeCap() : lieneCap(), groups = c.pages(labels, cap.n);
  box.textContent = '';
  groups.slice(0, 24).forEach((g, i) => {
    const fig = el('figure', 'sheet'), canvas = el('canvas', office ? 'paper' : ''), unit = office ? 'Page' : 'Sheet';
    canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', `${unit} ${i + 1} of ${groups.length}, ${g.length} labels`);
    if (office) { drawOfficePage(canvas, g, cap, 560 / c.PAPER[S.paper].W); canvas.style.width = '233px'; canvas.style.height = `${233 * c.PAPER[S.paper].H / c.PAPER[S.paper].W}px`; }
    else { drawSheet(canvas, g, cap, 380 / 90); canvas.style.width = '189px'; canvas.style.height = '357px'; }
    fig.append(canvas, el('figcaption', 'small mono', `${unit} ${i + 1} of ${groups.length} · ${g.length} label${g.length === 1 ? '' : 's'}`));
    if (!office && groups.length > 1) fig.append(button('key', `Save sheet ${i + 1}`, () => saveSheets([i])));
    box.append(fig);
  });
  if (groups.length > 24) box.append(el('p', 'small', `And ${groups.length - 24} more. Save and Print include them all.`));
}

function refresh(keepNote) {
  const size = c.profileSize(S), [W, H] = size.sticker, office = S.route === 'office', m = mark(), a1 = $('a1Strips'), a2 = $('a2Strips'), a3 = $('a3Strips');
  const inputBad = Object.keys(bad).filter((k) => bad[k]), notes = boxNotes(), cap = office ? officeCap() : lieneCap(), labels = c.labelList(S.boxes), total = labels.length;
  const sheets = cap.n ? Math.ceil(total / cap.n) : 0, unit = office ? 'page' : 'sheet', s = Math.min(1, (H - 2 * S.inputs.B) / 51);

  // Area 1
  a1.textContent = ''; a2.textContent = ''; a3.textContent = '';
  if (S.examples && !S.tourSeen && !S.tour) a1.append(strip('', 'New here?', "The tutorial builds a sample set of labels with you, step by step. It won't touch your list.", { label: 'Start tutorial', run: startTour }, { label: 'Not now', run: () => { dismissOffer(); refresh(); } }));
  inputBad.forEach((k) => a1.append(strip('bad', k, bad[k])));
  const spot = $('logoSpot'); spot.textContent = '';
  if (S.logoNote) spot.append(strip('bad', 'Logo not added', S.logoNote));
  if (S.pending) logoPanel(spot);
  if (notes.dropped.length) a1.append(strip('warn', 'Left off at this size', `A ${W} × ${H} label has no room for ${notes.dropped.join(', ')}, so ${notes.dropped.length === 1 ? 'it doesn\'t' : 'they don\'t'} print. The name, kind, mark and ID stay.`));
  if (S.markTab === 'up' && S.logo && !S.logo.sample) {
    if (S.logo.origW < 160 * s) spot.append(strip('warn', 'Logo may print soft', `This logo is ${S.logo.origW} px wide. Sharp print needs about ${Math.round(319 * s)} px.`));
    if (S.logo.white) spot.append(strip('warn', 'Logo is nearly white', "It will vanish on the white footer. Use a darker version."));
  }
  state('a1State', inputBad.length ? `${inputBad.length} field${inputBad.length === 1 ? '' : 's'} to fix` : S.pending ? 'Waiting on you' : S.logoNote ? 'Logo not added' : size.untested ? 'Untested size' : size.fits, inputBad.length || S.logoNote ? 'bad' : S.pending || notes.dropped.length || size.untested ? 'warn' : 'ok');
  $('customFields').hidden = S.profile !== 'custom';
  $('untestedNote').hidden = !size.untested;
  $('profile').value = S.profile;
  document.querySelectorAll('#markSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mark === S.markTab)));
  document.querySelectorAll('#frameSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.frame === S.textMark.frame)));
  $('dropWrap').hidden = S.markTab !== 'up' || !!S.logo || !!S.pending;
  $('fileRow').hidden = S.markTab !== 'up' || !S.logo || !!S.pending;
  if (S.logo) $('fileName').textContent = S.logo.sample ? 'woodwerd-sample-logo.png · sample' : `${S.logo.file} · ${S.logo.w} × ${S.logo.h} px`;
  $('replaceLogo').disabled = $('removeLogo').disabled = !!S.tour;
  $('textFields').hidden = S.markTab !== 'text';
  $('iconMarkRow').hidden = S.markTab !== 'icon';
  $('chooseMarkIcon').textContent = S.iconMark ? `Icon: ${ICONS[S.iconMark].name}. Change it` : 'Choose an icon';
  drawPreview($('art1'), $('art1').parentElement.clientWidth, true);
  const box = S.boxes[S.sel], nm = String(box?.name || '').toUpperCase() || 'Blank box';
  $('art1Name').textContent = `${nm}, at true proportion`;
  const A = W - 2 * S.inputs.B, C = H - 2 * S.inputs.B;
  $('readout').innerHTML = [['Sticker size', `${W} × ${H}`], ['Artwork', `${+A.toFixed(2)} × ${+C.toFixed(2)}`], ['Shape', A / C >= 2.2 ? 'Strip' : 'Card'], ['Status', size.status]].map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');

  // Prefix: IDs change only when asked, since labels may be printed (BX-R32)
  const pn = $('prefixNote'), off = c.offPrefix(S.boxes, S.prefix);
  pn.textContent = '';
  if (S.undoIds) pn.append(strip('ok', 'Done', `${S.undoIds.length} IDs changed.`, { label: 'Undo', run: () => { S.boxes.forEach((b, i) => { b.id = S.undoIds[i]; }); S.undoIds = null; buildList(); changed(); } }));
  else if (!S.examples && (off || S.startNo > 1)) {
    const next = c.nextId(S.boxes, S.prefix, S.startNo), acts = [];
    if (off) acts.push({ label: `Change all to ${S.prefix}`, run: changeAll });
    if (S.startNo > 1) acts.push({ label: `Number all from ${S.startNo}`, run: numberAll });
    pn.append(strip('', 'New boxes only', `The next box will be ${next}. Boxes on this list keep their IDs, so printed labels still match. Printed some already? Set their Quantity to 0.`, ...acts));
  }

  // Area 2
  if (!S.stored && !S.tour) a2.append(strip('warn', 'Not saving', `This browser isn't keeping your list. Export it before you close.${S.gh ? ' Your GitHub repo has the last synced copy, and the token is kept for this visit only.' : ''}`, { label: 'Export backup', run: exportList }));
  // GitHub storage (BX-U24, BX-S23, BX-R152, BX-R165)
  const gh = !!S.gh && !S.tour;
  $('ghConnect').hidden = !!S.gh; $('ghConnect').disabled = !!S.tour;
  $('ghConnect').setAttribute('aria-expanded', String(S.panel === 'connect'));
  $('ghRow').hidden = !S.gh;
  if (S.gh) { $('ghRepo').textContent = S.gh.repo; $('ghSync').disabled = $('ghTool').disabled = !gh || S.syncState === 'busy'; $('ghTool').setAttribute('aria-expanded', String(S.panel === 'tc')); }
  if (gh && S.syncState === 'error' && S.syncErr) {
    const n = waiting(S.sync?.base, localDoc()), keep = n ? ` Your ${n === 1 ? 'change is kept in this browser and goes' : `${n} changes are kept in this browser and go`} up once it works.` : '';
    a2.append(strip('bad', S.syncErr.title || 'Sync stopped', S.syncErr.text + keep, ...(['auth', 'rights'].includes(S.syncErr.kind) ? [{ label: 'Enter a new token', run: () => openPanel('connect', { retoken: true }) }] : [{ label: 'Try again', run: syncNow }]), { label: 'Disconnect', run: disconnect }));
  }
  if (gh && S.gh.readOnly) a2.append(strip('warn', 'Read only', `This token can read ${S.gh.repo} but not write to it, so changes here don't go to the repo. Give it Contents read and write.`));
  if (gh && S.repoLogo && !S.pending) a2.append(strip('warn', 'Sync paused', "Your repo has a logo this browser hasn't accepted yet. Accept it, or choose another mark here to replace it on GitHub.", { label: 'Review the logo', run: () => { S.pending = { ...S.repoLogo.img, white: false, fromRepo: true }; refresh(); showLogoSpot(); } }));
  if (gh && S.tcChanged && S.panel !== 'tc') a2.append(strip('', "Tool Ctrl's record has changed", "It has changed since you last got boxes. Nothing changes here until you get them.", { label: 'Get boxes', run: getBoxes }));
  if (S.ghNote && S.panel !== 'connect') a2.append(strip('bad', 'Tool Ctrl', S.ghNote));
  if (S.tcUndo) a2.append(strip('ok', 'Updated from Tool Ctrl', 'The list now matches Tool Ctrl\'s record.', { label: 'Undo', run: () => { Object.assign(S, S.tcUndo); S.tcUndo = null; buildList(); save(); refresh(); } }));
  if (S.fileNote) a2.append(strip('bad', 'File', S.fileNote));
  $('examples').hidden = !S.examples;
  $('catalogHint').hidden = !S.examples || S.panel === 'tools';
  $('exportList').disabled = $('exportCsv').disabled = $('openFile').disabled = !!S.tour;
  $('addCatalog').classList.toggle('hl', !!S.tour && !S.tour.done && TOUR[S.tour.step].target === 'addCatalog');
  const sy = gh ? { ok: ['Synced', ''], busy: ['Saving', 'busy'], offline: [`Offline · ${waiting(S.sync?.base, localDoc())} unsent`, 'warn'], error: ['Needs attention', 'bad'], conflict: ['Needs attention', 'warn'], paused: ['Needs attention', 'warn'], idle: ['Nothing to sync yet', ''] }[S.syncState] : null;
  const a2Base = !S.stored ? 'Not saving' : notes.flagged ? `${notes.flagged} box${notes.flagged === 1 ? '' : 'es'} to check` : total ? `${S.boxes.length} box${S.boxes.length === 1 ? '' : 'es'}` : '0 labels';
  const a2Tone = sy?.[1] === 'bad' ? 'bad' : !S.stored || notes.flagged || sy?.[1] === 'warn' ? 'warn' : sy?.[1] === 'busy' ? 'busy' : total ? 'ok' : 'idle';
  state('a2State', sy ? `${a2Base} · ${sy[0]}` : a2Base, a2Tone);
  $('fill').textContent = total ? `${total} label${total === 1 ? '' : 's'} on ${sheets} ${unit}${sheets === 1 ? '' : 's'} · ${sheets * cap.n - total ? `${sheets * cap.n - total} open spot${sheets * cap.n - total === 1 ? '' : 's'} on ${unit} ${sheets}` : `last ${unit} is full`}` : 'No labels yet';
  drawPreview($('art2'), $('art2').parentElement.clientWidth, false);
  $('art2Name').textContent = `${nm}, as printed`;

  // Area 3
  document.querySelectorAll('#routeSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.route === S.route)));
  document.querySelectorAll('#paperSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.paper === S.paper)));
  $('lienePanel').hidden = office; $('officePanel').hidden = !office;
  $('borderOut').textContent = S.inputs.B.toFixed(1);
  const [cw, ch] = size.card;
  $('routeSize').textContent = office ? `Paper card ${cw} × ${ch}` : `Sticker ${W} × ${H} · ${cap.n} per sheet`;
  $('officeRead').innerHTML = `<dt>Card</dt><dd>${cw} × ${ch}</dd><dt>Per page</dt><dd>${cap.n}${cap.rot ? ', turned' : ''}</dd>`;
  const none = !total, sn = $('sheetNote'); sn.hidden = !none; sn.textContent = 'Set a quantity on at least one box to make a sheet.';
  const noteCount = notes.flagged + (notes.dropped.length ? 1 : 0);
  state('a3State', S.saving ? 'Saving' : c.verdict(total, sheets, noteCount, unit), S.saving ? 'busy' : none ? 'idle' : noteCount ? 'warn' : 'ok');
  const go = $('save'); go.disabled = none || S.saving || !!inputBad.length;
  const panelOpen = S.panel || S.pending || S.tour;
  go.className = panelOpen ? 'key' : 'key go';
  $('saveText').textContent = S.saving ? 'Saving…' : office ? 'Print' : sheets > 1 ? `Save ${sheets} sheets` : 'Save sheet';
  if (!keepNote && !S.saving) $('saveNote').textContent = none ? 'Set a quantity on a box first.' : office ? "Opens your browser's print dialog." : '';
  led('ledTemplate', inputBad.length || S.logoNote ? 'fault' : S.pending || notes.dropped.length ? 'busy' : 'ok');
  led('ledBoxes', !S.stored || notes.flagged ? 'busy' : total ? 'ok' : '');
  led('ledSheets', S.saving ? 'busy' : none ? '' : 'ok');

  // Tutorial
  $('tourTag').hidden = !S.tour; $('tourBtn').disabled = !!S.tour;
  if (S.tour) (S.tour.done ? a3 : $(TOUR[S.tour.step].area)).prepend(coach());

  clearTimeout(sheetTimer); sheetTimer = setTimeout(renderSheets, 120);
}

function changeAll() {
  const ids = S.boxes.map((b) => b.id), next = c.applyPrefix(S.boxes, S.prefix);
  S.boxes.forEach((b, i) => { b.id = next[i].id; });
  buildList(); changed(); S.undoIds = ids; refresh();
}

function numberAll() {
  const ids = S.boxes.map((b) => b.id), next = c.renumber(S.boxes, S.prefix, S.startNo);
  S.boxes.forEach((b, i) => { b.id = next[i].id; });
  buildList(); changed(); S.undoIds = ids; refresh();
}

function exportCsv() { download(new Blob([c.writeCsv(S)], { type: 'text/csv;charset=utf-8' }), c.csvName()); }

function exportList() { download(new Blob([JSON.stringify(c.writeList(listOf()), null, 2)], { type: 'application/json' }), c.listName()); }

function syncInputs() {
  $('customW').value = S.custom.W; $('customH').value = S.custom.H; $('owner').value = S.owner; $('prefix').value = S.prefix; $('startNo').value = S.startNo;
  $('textMark').value = S.textMark.text; $('B').value = S.inputs.B; $('G').value = S.inputs.G;
  Object.keys(bad).forEach((k) => { bad[k] = ''; });
  ['customW', 'customH', 'B', 'G'].forEach((k) => $(k).classList.remove('bad'));
}

// ---------- GitHub storage (BX-R140 to BX-R159) ----------
const GH_KEY = 'boxctrl.github', SYNC_KEY = 'boxctrl.sync', TC_KEY = 'toolctrl.github'; // the token lives here only (BX-R143)
const readJson = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const writeJson = (k, v) => { try { if (v) localStorage.setItem(k, JSON.stringify(v)); else localStorage.removeItem(k); } catch { /* storage off: this visit only (BX-E18) */ } };
const loadConn = () => { const o = readJson(GH_KEY); return o && o.repo && o.token ? o : null; };
const toolConn = () => { const o = readJson(TC_KEY); return o && o.repo && o.token ? o : null; }; // BX-R142: same address, so Tool Ctrl's key is readable here
Object.assign(S, { gh: loadConn(), sync: readJson(SYNC_KEY), syncState: 'off', syncErr: null, conflict: null, repoLogo: null, ghNote: '', tcChanged: false, tcUndo: null });
const api = () => client(S.gh.repo, S.gh.token);
const localDoc = () => { c.withKeys(S.boxes); return c.listDoc(listOf()); };
const logoB64 = () => { const m = mark(); return m.kind === 'img' && !m.sample ? m.src.split(',')[1] : null; };
const accepted = (hash) => (S.sync?.accepted || []).includes(hash);
function acceptLogo(m) { if (!S.sync || m?.kind !== 'img') return; const h = c.logoHash(m.src); S.sync.accepted = [...new Set([...(S.sync.accepted || []), h])].slice(-20); writeJson(SYNC_KEY, S.sync); }

let syncTimer = 0, syncing = false, again = false;
function later(ms = 4000) { if (!S.gh || S.tour || S.conflict) return; clearTimeout(syncTimer); syncTimer = setTimeout(syncNow, ms); }
async function syncNow() {
  if (!S.gh || S.tour || S.conflict || S.panel === 'choice') return;
  if (S.examples) { S.syncState = 'idle'; refresh(true); return; } // the examples never go up (BX-R148)
  // BX-R152: a repo logo waiting on the acknowledgement holds the sync until it's accepted or another mark is chosen
  if (S.repoLogo && c.same(c.docMark(mark()), S.repoLogo.localMark)) { S.syncState = 'paused'; refresh(true); return; }
  S.repoLogo = null;
  if (syncing) { again = true; return; }
  if (!navigator.onLine) { S.syncState = 'offline'; refresh(true); return; }
  syncing = true; S.syncState = 'busy'; refresh(true);
  const snap = localDoc();
  let res;
  if (S.gh.readOnly) {
    const rem = await readRemote(api(), S.gh.repo);
    res = rem.error ? { status: 'error', error: rem.error } : rem.missing ? { status: 'synced', list: snap, base: S.sync?.base, sha: S.sync?.sha } : { status: 'synced', list: rem.doc, base: rem.doc, sha: rem.sha };
  } else res = await syncOnce({ gh: api(), repo: S.gh.repo, local: snap, base: S.sync?.base || null, sha: S.sync?.sha || null, logoB64: logoB64() });
  syncing = false;
  await applySync(res, snap);
  if (again) { again = false; later(500); }
}
async function applySync(res, snap) {
  if (res.status === 'error') { S.syncState = res.error.kind === 'offline' ? 'offline' : 'error'; S.syncErr = res.error; refresh(true); return; }
  if (res.status === 'conflict') { S.conflict = { ...res, picks: res.conflicts.map(() => '') }; S.syncState = 'conflict'; openPanel('conflict'); return; }
  let next = res.list;
  const now = localDoc();
  if (snap && !c.same(snap, now)) next = c.mergeLists(snap, now, res.list).list; // edits made while it ran stay on top
  S.sync = { ...S.sync, repo: S.gh.repo, base: res.base, sha: res.sha, lastSync: new Date().toISOString() };
  writeJson(SYNC_KEY, S.sync);
  S.syncState = 'ok'; S.syncErr = null;
  if (!c.same(next, now)) await fromDoc(next);
  checkToolCtrl();
  refresh(true);
}
// Puts a list from GitHub into this browser. A logo this browser hasn't accepted waits on BX-S18 (BX-R152).
async function fromDoc(d) {
  const before = c.docMark(mark());
  Object.assign(S, { profile: d.profile, custom: d.custom, owner: d.owner, prefix: d.prefix, startNo: d.startNo, extraCols: d.extraCols, groups: d.groups, inputs: d.inputs, route: d.route, paper: d.paper, boxes: d.boxes.length ? d.boxes : [c.blankBox(c.nextId([], d.prefix))], examples: false });
  S.sel = Math.min(S.sel, S.boxes.length - 1);
  if (!c.same(before, d.mark)) {
    if (d.mark.kind !== 'img') applyMark(d.mark);
    else if (S.logo && c.logoHash(S.logo.src) === d.mark.hash) S.markTab = 'up';
    else {
      const f = await api().raw(LOGO_PATH);
      const img = f.b64 ? { kind: 'img', src: `data:image/png;base64,${f.b64}`, file: d.mark.file, w: d.mark.w, h: d.mark.h, origW: d.mark.origW } : null;
      if (img && accepted(c.logoHash(img.src))) { S.logo = img; S.markTab = 'up'; }
      else if (img) { S.repoLogo = { localMark: before, img }; S.pending = { ...img, white: false, fromRepo: true }; S.syncState = 'paused'; }
    }
  }
  syncInputs(); renderPanel(); buildList();
  try { localStorage.setItem(KEY, JSON.stringify({ ...c.writeList(listOf()), examples: false, ui: { markTab: S.markTab, logo: S.logo, textMark: S.textMark, iconMark: S.iconMark } })); S.stored = true; } catch { S.stored = false; }
  if (S.pending) showLogoSpot();
}

async function connect(repo, token) {
  repo = repo.trim(); token = token.trim();
  S.ghNote = repoError(repo) || (!token ? 'Paste the token from GitHub.' : '');
  if (S.ghNote) return renderPanel();
  S.connecting = true; renderPanel();
  const gh = client(repo, token), chk = await gh.check();
  const stop = (msg) => { S.connecting = false; S.ghNote = msg; renderPanel(); refresh(true); };
  if (chk.error) return stop(`${chk.error.title}. ${chk.error.text}`);
  if (!chk.private) return stop('This repo is public. Make it private on GitHub first, since it would hold your logo and owner line.'); // BX-R144
  // A new token for the same repo carries on from the last sync, keeping what waits here
  if (S.sync?.repo === repo && S.sync.base) {
    S.gh = { repo, token, readOnly: !chk.canWrite }; writeJson(GH_KEY, S.gh); S.connecting = false; S.ghNote = ''; S.syncErr = null; closePanel(); return syncNow();
  }
  const rem = await readRemote(gh, repo);
  if (rem.error) return stop(`${rem.error.title || 'That didn\'t work'}. ${rem.error.text}`);
  S.gh = { repo, token, readOnly: !chk.canWrite }; writeJson(GH_KEY, S.gh);
  S.sync = { repo, base: null, sha: null, accepted: S.logo ? [c.logoHash(S.logo.src)] : [] }; writeJson(SYNC_KEY, S.sync);
  S.connecting = false; S.ghNote = ''; S.syncErr = null;
  if (rem.missing) { closePanel(); return syncNow(); }
  // BX-R148: both have a list, so ask which to keep. A browser still on the examples just takes the repo's.
  if (!S.examples && !c.same(localDoc(), rem.doc)) return openPanel('choice', { remote: rem.doc, sha: rem.sha });
  closePanel();
  await applySync({ status: 'synced', list: rem.doc, base: rem.doc, sha: rem.sha }, null);
}
function disconnect() {
  if (!confirm(`Disconnect from GitHub in this browser? The token is deleted here. Your list stays here and in ${S.gh.repo}.`)) return;
  clearTimeout(syncTimer);
  Object.assign(S, { gh: null, sync: null, syncState: 'off', syncErr: null, conflict: null, repoLogo: null, tcChanged: false });
  if (S.pending?.fromRepo) S.pending = null;
  writeJson(GH_KEY, null); writeJson(SYNC_KEY, null);
  if (['conflict', 'choice', 'tc'].includes(S.panel)) closePanel(); else refresh();
}
addEventListener('online', () => { if (S.gh) syncNow(); });

// BX-S21
function connectPanel(p) {
  p.setAttribute('aria-label', 'Connect to GitHub');
  const tc = toolConn(), retoken = S.plan?.retoken;
  const repo = el('input', 'in m'); repo.value = retoken ? S.gh.repo : ''; repo.placeholder = 'your-name/ctrl-data'; repo.autocomplete = 'off'; repo.spellcheck = false;
  const token = el('input', 'in m'); token.type = 'password'; token.placeholder = 'github_pat_…'; token.autocomplete = 'off';
  const lab = (words, input) => { const l = el('label', 'f'); l.append(el('span', '', words), input); return l; };
  const fields = el('div', 'fields'); fields.append(lab('Data repo, as owner/name', repo), lab('Token', token));
  const guide = el('p', 'small'); guide.append('Use a private repo and a fine-grained token for that one repo, with Contents read and write and nothing else. The token stays in this browser. ');
  const a = el('a', '', 'How to make them'); a.href = 'guide.html#github'; guide.append(a);
  p.append(el('h3', '', retoken ? 'Enter a new token' : 'Connect to GitHub'),
    el('p', 'small', 'Keep your list in your own private GitHub repo, so every browser you connect has it. Box Ctrl keeps working without it, and this browser stays the working copy.'));
  if (tc && !retoken) p.append(strip('', 'Tool Ctrl is connected here', 'Use the same repo and token, so both tools keep their files side by side. Disconnecting one leaves the other connected.', { label: `Use Tool Ctrl's repo, ${tc.repo}`, run: () => connect(tc.repo, tc.token) }));
  p.append(fields, guide);
  if (S.ghNote) p.append(strip('bad', 'Not connected', S.ghNote));
  const tools = el('div', 'tools'), go = button('key go', S.connecting ? 'Connecting…' : 'Connect', () => connect(repo.value, token.value));
  go.disabled = !!S.connecting;
  tools.append(go, button('key', 'Cancel', () => { S.ghNote = ''; closePanel(); }));
  p.append(tools);
}
// BX-R148, BX-S21: the repo already has a list
function choicePanel(p) {
  const r = S.plan.remote, here = localDoc(), n = (d) => `${d.boxes.length} box${d.boxes.length === 1 ? '' : 'es'}${d.mark.kind === 'img' ? ' · logo' : ''}`;
  p.setAttribute('role', 'alertdialog'); p.setAttribute('aria-label', 'This repo already has a list');
  const pick = el('div', 'pick2'), opt = (title, words, label, run) => { const o = el('div', 'opt'); o.append(el('b', '', title), el('span', 'small', words), button('key', label, run)); return o; };
  pick.append(opt('Use the repo\'s list', n(r), 'Use the repo\'s list', async () => { const d = S.plan; closePanel(); await applySync({ status: 'synced', list: d.remote, base: d.remote, sha: d.sha }, null); }),
    opt('Replace it with this browser\'s', n(here), 'Replace with this browser\'s', () => { S.sync = { ...S.sync, base: S.plan.remote, sha: S.plan.sha }; writeJson(SYNC_KEY, S.sync); closePanel(); syncNow(); }));
  const tools = el('div', 'tools');
  tools.append(button('key', 'Export backup first', exportList), el('span', 'sp'), button('key', 'Cancel and disconnect', () => { closePanel(); Object.assign(S, { gh: null, sync: null, syncState: 'off' }); writeJson(GH_KEY, null); writeJson(SYNC_KEY, null); refresh(); }));
  const t = el('p', 'small'); t.append('Connected to '); t.append(el('span', 'mono', S.gh.repo)); t.append('. Choose which list to keep. The other is replaced, so export it first if you want a copy.');
  p.append(el('h3', '', 'This repo already has a Box Ctrl list'), t, pick, tools);
}
// BX-S22: both sides changed the same field
const PROFILE_NAME = Object.fromEntries(c.PROFILES.map((x) => [x.id, x.fits]));
function shown(cf, v, groups) {
  if (v == null || v === '') return '(empty)';
  const f = cf.field;
  if (f === 'groupId') return (groups.find((g) => g.id === v) || {}).name || v;
  if (f === 'mark') return v.kind === 'img' ? `Logo · ${v.file}` : v.kind === 'text' ? `Text mark · ${v.text}` : v.kind === 'icon' ? `Icon · ${ICONS[v.icon]?.name || v.icon}` : 'None';
  if (f === 'profile') return PROFILE_NAME[v] || 'Custom size';
  if (f === 'custom') return `${v.W} × ${v.H}`;
  if (f === 'inputs') return `Cut border ${v.B} · space ${v.G}`;
  if (f === 'owner') return String(v).split('\n').join(' / ');
  if (f === 'icon') return ICONS[v]?.name || v;
  return typeof v === 'object' ? JSON.stringify(v) : String(v);
}
function conflictPanel(p) {
  const cf = S.conflict, n = cf.conflicts.length, left = cf.picks.filter((x) => !x).length;
  p.setAttribute('aria-label', 'Sync conflict');
  p.append(el('h3', '', `${n === 1 ? 'One thing' : `${n} things`} changed on another device too`), el('p', 'small', 'Everything else synced. Choose which value to keep for each. Sync finishes once all are chosen.'));
  const list = el('div', 'cf');
  cf.conflicts.forEach((x, i) => {
    const row = el('div', 'cfr'), v = (who, val) => { const d = el('span', 'cfv'); d.append(el('span', 'small', who), el('b', '', shown(x, val, cf.merged.groups))); return d; };
    const seg = el('div', 'segc'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', `Keep for ${x.label}`);
    [['local', 'This device\'s'], ['remote', 'GitHub\'s']].forEach(([k, words]) => { const b = button('', words, () => { cf.picks[i] = k; renderPanel(); }); b.setAttribute('aria-pressed', String(cf.picks[i] === k)); seg.append(b); });
    row.append(el('span', '', x.label), v('This device', x.local), v('GitHub', x.remote), seg);
    list.append(row);
  });
  const tools = el('div', 'tools'), go = button('key go', 'Finish sync', finishConflict);
  go.disabled = left > 0;
  tools.append(go); if (left) tools.append(el('span', 'small', `${left} left to choose`));
  p.append(list, tools);
}
async function finishConflict() {
  const cf = S.conflict;
  cf.conflicts.forEach((x, i) => c.resolveListConflict(cf.merged, x, cf.picks[i]));
  S.conflict = null; closePanel();
  S.sync = { ...S.sync, base: cf.remote, sha: cf.remoteSha }; writeJson(SYNC_KEY, S.sync);
  await fromDoc(cf.merged); save(); refresh(); syncNow();
}

// ---------- Get boxes from Tool Ctrl (BX-R160 to BX-R167) ----------
async function getBoxes() {
  if (S.panel === 'tc') return closePanel();
  S.ghNote = '';
  const tc = toolConn();
  if (tc && tc.repo !== S.gh.repo) return openPanel('tc', { other: tc }); // BX-R166: never read with Tool Ctrl's token behind the scenes
  const f = await api().read(TOOL_CTRL_PATH);
  if (f.missing) { S.ghNote = `There's no Tool Ctrl record in ${S.gh.repo}.`; return refresh(); }
  if (f.error) { S.ghNote = `${f.error.title}. ${f.error.text}`; return refresh(); }
  const r = readToolCtrl(f.text, S.gh.repo);
  if (r.error) { S.ghNote = r.error; return refresh(); }
  const drawers = !!S.tcDrawers;
  openPanel('tc', { rec: r.record, sha: f.sha, drawers, onlyChanged: false, plan: planToolCtrl(S, r.record, { compartments: drawers, base: S.examples ? [] : S.boxes }) });
}
async function checkToolCtrl() {
  if (!S.sync?.tcSha || S.tour) return;
  const l = await api().list();
  const sha = l.files?.[TOOL_CTRL_PATH];
  S.tcChanged = !!sha && sha !== S.sync.tcSha; refresh(true);
}
function toolCtrlPanel(p) {
  const d = S.plan;
  p.setAttribute('aria-label', 'Boxes from Tool Ctrl');
  if (d.other) {
    const t = el('p', 'small'); t.append('Tool Ctrl in this browser uses '); t.append(el('span', 'mono', d.other.repo)); t.append('. Box Ctrl uses '); t.append(el('span', 'mono', S.gh.repo)); t.append('. Box Ctrl reads Tool Ctrl\'s record only from its own repo.');
    const tools = el('div', 'tools');
    tools.append(button('key go', `Switch to ${d.other.repo}`, () => { writeJson(GH_KEY, null); writeJson(SYNC_KEY, null); Object.assign(S, { gh: null, sync: null }); connect(d.other.repo, d.other.token); }), button('key', 'Cancel', closePanel));
    p.append(el('h3', '', 'The two tools use different repos'), t, tools);
    return;
  }
  const pl = d.plan, words = (a, w) => `${a} ${w}`;
  p.append(el('h3', '', `From Tool Ctrl: ${words(pl.added.length, 'new')}, ${words(pl.changed.length, 'changed')}, ${words(pl.same, 'unchanged')}`));
  const t = el('p', 'small'); t.append('Read from '); t.append(el('span', 'mono', TOOL_CTRL_PATH)); t.append(' in '); t.append(el('span', 'mono', S.gh.repo)); t.append('. Only IDs, names, kinds, contents, groups and icons come across. Warranty details, locations and notes never do. Nothing changes until you press Update list.');
  const seg = el('div', 'segc'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Rows');
  [[false, 'One per box'], [true, 'One per drawer']].forEach(([v, w]) => { const b = button('', w, () => { S.tcDrawers = v; d.drawers = v; d.plan = planToolCtrl(S, d.rec, { compartments: v, base: S.examples ? [] : S.boxes }); renderPanel(); }); b.setAttribute('aria-pressed', String(d.drawers === v)); seg.append(b); });
  const rows = el('div', 'f'); rows.append(el('span', '', 'Rows'), seg);
  const sum = el('div', 'sumt'), line = (title, words) => { const r = el('div', 'sr'); r.append(el('b', '', title), el('span', '', words)); sum.append(r); };
  const ids = (a) => (a.length > 8 ? `${a.slice(0, 8).join(' · ')} and ${a.length - 8} more` : a.join(' · '));
  if (pl.added.length) line('New', `${ids(pl.added.map((b) => `${b.id} ${b.name}`))}. Added at the end, Quantity 1.`);
  if (pl.changed.length) line('Changed', `${ids(pl.changed.map((x) => `${x.id} ${x.fields.map((f) => ({ c1: 'contents', c2: 'contents' }[f] || f)).filter((f, i, a) => a.indexOf(f) === i).join(' and ')}`))}. Group, icon, quantity and kept columns stay as they are here.`);
  if (pl.notIn.length && !S.examples) line('Not in Tool Ctrl', `${ids(pl.notIn)}. Kept on this list.`);
  if (pl.newGroups.length) line('New groups', pl.newGroups.join(', '));
  if (!sum.childElementCount) line('Nothing new', 'This list already matches Tool Ctrl\'s record.');
  p.append(t, rows, sum);
  pl.overruns.slice(0, 4).forEach((o) => p.append(strip('warn', o.id, `Its items run past two lines, so the first ${o.total - o.left} of ${o.total} are kept on the label.`)));
  pl.skipped.slice(0, 4).forEach((s) => p.append(strip('warn', s.split(': ')[0], s.split(': ')[1])));
  const ck = el('label', 'ck'), box = el('input'); box.type = 'checkbox'; box.checked = d.onlyChanged; box.onchange = () => { d.onlyChanged = box.checked; };
  ck.append(box, el('span', '', 'Set quantity 1 on new and changed boxes, 0 on the rest, so the next set prints only what changed'));
  const tools = el('div', 'tools'), go = button('key go', 'Update list', () => {
    const before = { boxes: JSON.parse(JSON.stringify(S.boxes)), groups: JSON.parse(JSON.stringify(S.groups)), examples: S.examples };
    const r = applyToolCtrl(S.examples ? [] : S.boxes, pl, { onlyChanged: d.onlyChanged });
    Object.assign(S, { boxes: c.withKeys(r.boxes), groups: r.groups, panel: null, plan: null, tcChanged: false, tcUndo: before });
    S.sync = { ...S.sync, tcSha: d.sha }; writeJson(SYNC_KEY, S.sync);
    renderPanel(); buildList(); changed(); S.tcUndo = before; refresh();
  });
  go.disabled = !pl.added.length && !pl.changed.length && !d.onlyChanged;
  tools.append(go, button('key', 'Cancel', closePanel));
  p.append(ck, tools);
}

// ---------- wiring ----------
c.PROFILES.forEach((p) => { const o = el('option', '', `${p.fits} · ${p.status}`); o.value = p.id; $('profile').append(o); });
{ const o = el('option', '', 'Custom size'); o.value = 'custom'; $('profile').append(o); }
$('profile').onchange = () => {
  const was = c.profileSize(S), next = $('profile').value;
  if (next === 'custom' && was.untested) { [S.custom.W, S.custom.H] = was.sticker; $('customW').value = S.custom.W; $('customH').value = S.custom.H; }
  S.profile = next; if (S.profile !== 'custom') { bad.Width = ''; bad.Height = ''; } changed();
};

const numberField = (id, range, apply) => {
  const f = $(id);
  f.oninput = () => {
    const e = c.rangeError(range, f.value); bad[range.name] = e; f.classList.toggle('bad', !!e);
    if (!e) { apply(parseFloat(f.value)); changed(); } else refresh();
  };
};
numberField('customW', c.CUSTOM.W, (v) => { S.custom.W = v; });
numberField('customH', c.CUSTOM.H, (v) => { S.custom.H = v; });
numberField('B', c.INPUTS.B, (v) => { S.inputs.B = v; });
numberField('G', c.INPUTS.G, (v) => { S.inputs.G = v; });

document.querySelectorAll('#markSeg button').forEach((b) => { b.onclick = () => { S.markTab = b.dataset.mark; S.logoNote = ''; changed(); }; });
document.querySelectorAll('#frameSeg button').forEach((b) => { b.onclick = () => { S.textMark.frame = b.dataset.frame; changed(); }; });
document.querySelectorAll('#routeSeg button').forEach((b) => { b.onclick = () => { S.route = b.dataset.route; save(); refresh(); }; });
document.querySelectorAll('#paperSeg button').forEach((b) => { b.onclick = () => { S.paper = b.dataset.paper; save(); refresh(); }; });
$('textMark').oninput = () => { S.textMark.text = $('textMark').value; changed(); };
$('owner').oninput = () => { const v = c.clipOwner($('owner').value); if (v !== $('owner').value) $('owner').value = v; S.owner = v; changed(); };
$('prefix').oninput = () => { S.prefix = $('prefix').value; S.undoIds = null; save(); refresh(); };
$('startNo').oninput = () => {
  const n = c.clampStart($('startNo').value); $('startNo').classList.toggle('bad', !n);
  bad['Start numbering at'] = n ? '' : "Start numbering at can't be that. Enter a whole number from 1 to 99999.";
  if (n) S.startNo = n;
  S.undoIds = null; save(); refresh();
};
$('addCatalog').onclick = () => (S.panel === 'tools' && S.plan?.add ? closePanel() : openPanel('tools', { add: true }));
$('chooseLogo').onclick = $('replaceLogo').onclick = () => $('logoInput').click();
$('removeLogo').onclick = () => { S.logo = null; changed(); };
$('logoInput').onchange = (e) => { openLogo(e.target.files[0]); e.target.value = ''; };
$('chooseMarkIcon').onclick = () => openPanel('icons', { target: 'mark' });
$('add').onclick = () => {
  if (S.boxes.length >= c.MAX_BOXES) return fileError(`The list holds up to ${c.MAX_BOXES} boxes.`);
  const sel = S.boxes[S.sel];
  S.boxes.push(c.blankBox(c.nextId(S.boxes, S.prefix, S.startNo), sel?.groupId ?? c.OTHER, sel?.icon ?? '')); S.sel = S.boxes.length - 1; buildList(); changed();
  $('boxes').querySelectorAll('.nm')[S.sel].focus();
};
$('openGroups').onclick = () => (S.panel === 'groups' ? closePanel() : openPanel('groups'));
$('openFile').onclick = () => $('file').click();
$('file').onchange = (e) => { openFile(e.target.files[0]); e.target.value = ''; };
$('exportList').onclick = exportList;
$('exportCsv').onclick = exportCsv;
$('ghConnect').onclick = () => (S.panel === 'connect' ? closePanel() : openPanel('connect'));
$('ghSync').onclick = () => { S.syncErr = null; syncNow(); };
$('ghTool').onclick = getBoxes;
$('ghOff').onclick = disconnect;
$('noticesRead').onchange = () => setNotices(true);
$('showNotices').onclick = () => setNotices(false);
showNotices();
$('save').onclick = () => (S.route === 'office' ? printOffice() : saveSheets());
$('tourBtn').onclick = startTour;

const drop = $('drop');
['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); e.stopPropagation(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); e.stopPropagation(); drop.classList.remove('over'); }));
drop.addEventListener('drop', (e) => openLogo(e.dataTransfer.files[0]));
const area = $('area2');
['dragenter', 'dragover'].forEach((t) => area.addEventListener(t, (e) => { e.preventDefault(); area.classList.add('over'); }));
['dragleave', 'drop'].forEach((t) => area.addEventListener(t, (e) => { e.preventDefault(); if (t === 'drop' || !area.contains(e.relatedTarget)) area.classList.remove('over'); }));
area.addEventListener('drop', (e) => openFile(e.dataTransfer.files[0]));
matchMedia('(prefers-color-scheme:dark)').addEventListener('change', () => refresh(true));
document.querySelectorAll('[data-theme-set]').forEach((b) => b.addEventListener('click', () => refresh(true)));
addEventListener('resize', () => { clearTimeout(sheetTimer); sheetTimer = setTimeout(() => refresh(true), 120); });

restore(); syncInputs(); buildList(); refresh();
if (S.gh) syncNow(); // BX-R149: sync when the app opens
Promise.all(['400 16px Inter', '700 16px Inter'].map((f) => document.fonts.load(f, 'A→↔·'))).then(() => refresh(true)).catch(() => {});
if (location.hash === '#tutorial') { history.replaceState(null, '', location.pathname); startTour(); }
