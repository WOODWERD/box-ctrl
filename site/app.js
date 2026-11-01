// Box Ctrl page. Rules live in core.js; this file draws them and handles input.
import * as c from './core.js';
import { ICONS, ICON_GROUPS, searchIcons } from './icons.js';
import { searchCatalog, CATALOG_DATE, BRANDS } from './catalog.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const KEY = 'boxctrl.v1', SEEN = 'boxctrl.tourSeen';
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
function changed() { S.examples = false; S.fileNote = ''; S.undoIds = null; save(); refresh(); }

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
  if (l.owner) text(ctx, l.owner, X(l.fx), Y(l.y5), l.s4 * k, 400, '#4A4A4A', 0.08);
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
    const lab = el('label', `swc${custom ? ' on' : ''}`); lab.title = 'Custom colour'; lab.innerHTML = PLUS_ICON;
    const inp = el('input'); inp.type = 'color'; inp.value = g.color; inp.setAttribute('aria-label', `Custom colour for ${g.name}`);
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
    syncInputs(); renderPanel(); buildList(); changed();
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
function logoError(msg) { S.logoNote = msg; S.pending = null; refresh(); }
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
      S.logoNote = ''; S.panel === 'icons' && closePanel(); refresh();
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
  tools.append(button('key go', 'I own it or have permission', () => { S.logo = S.pending; S.markTab = 'up'; S.pending = null; changed(); }), button('key', 'Cancel', () => { S.pending = null; refresh(); }));
  d.append(el('h3', '', 'Before you add this logo'), el('p', 'small mono', `${f.file} · ${f.w} × ${f.h} px`),
    el('p', 'note', "Only add a logo you own or have permission to use. You're responsible for how you use it, including any trademark or copyright in it. Box Ctrl doesn't check logos, doesn't keep a copy, and takes no responsibility for your use of one."), tools);
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
  if (S.logoNote) a1.append(strip('bad', 'Logo not added', S.logoNote));
  if (S.pending) logoPanel(a1);
  if (notes.dropped.length) a1.append(strip('warn', 'Left off at this size', `A ${W} × ${H} label has no room for ${notes.dropped.join(', ')}, so ${notes.dropped.length === 1 ? 'it doesn\'t' : 'they don\'t'} print. The name, kind, mark and ID stay.`));
  if (S.markTab === 'up' && S.logo && !S.logo.sample) {
    if (S.logo.origW < 160 * s) a1.append(strip('warn', 'Logo may print soft', `This logo is ${S.logo.origW} px wide. Sharp print needs about ${Math.round(319 * s)} px.`));
    if (S.logo.white) a1.append(strip('warn', 'Logo is nearly white', "It will vanish on the white footer. Use a darker version."));
  }
  state('a1State', inputBad.length ? `${inputBad.length} field${inputBad.length === 1 ? '' : 's'} to fix` : S.pending ? 'Waiting on you' : S.logoNote ? 'Logo not added' : size.fits, inputBad.length || S.logoNote ? 'bad' : S.pending || notes.dropped.length ? 'warn' : 'ok');
  $('customFields').hidden = S.profile !== 'custom';
  $('profile').value = S.profile;
  document.querySelectorAll('#markSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mark === S.markTab)));
  document.querySelectorAll('#frameSeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.frame === S.textMark.frame)));
  $('dropWrap').hidden = S.markTab !== 'up' || !!S.logo;
  $('fileRow').hidden = S.markTab !== 'up' || !S.logo;
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
  if (!S.stored && !S.tour) a2.append(strip('warn', 'Not saving', "This browser isn't keeping your list. Export it before you close.", { label: 'Export backup', run: exportList }));
  if (S.fileNote) a2.append(strip('bad', 'File', S.fileNote));
  $('examples').hidden = !S.examples;
  $('catalogHint').hidden = !S.examples || S.panel === 'tools';
  $('exportList').disabled = $('exportCsv').disabled = $('openFile').disabled = !!S.tour;
  $('addCatalog').classList.toggle('hl', !!S.tour && !S.tour.done && TOUR[S.tour.step].target === 'addCatalog');
  state('a2State', !S.stored ? 'Not saving' : notes.flagged ? `${notes.flagged} box${notes.flagged === 1 ? '' : 'es'} to check` : total ? `${S.boxes.length} box${S.boxes.length === 1 ? '' : 'es'}` : '0 labels', !S.stored || notes.flagged ? 'warn' : total ? 'ok' : 'idle');
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

// ---------- wiring ----------
c.PROFILES.forEach((p) => { const o = el('option', '', `${p.fits} · ${p.status}`); o.value = p.id; $('profile').append(o); });
{ const o = el('option', '', 'Custom size'); o.value = 'custom'; $('profile').append(o); }
$('profile').onchange = () => { S.profile = $('profile').value; if (S.profile !== 'custom') { bad.Width = ''; bad.Height = ''; } changed(); };

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
$('owner').oninput = () => { S.owner = $('owner').value; changed(); };
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
Promise.all(['400 16px Inter', '700 16px Inter'].map((f) => document.fonts.load(f, 'A→↔·'))).then(() => refresh(true)).catch(() => {});
if (location.hash === '#tutorial') { history.replaceState(null, '', location.pathname); startTour(); }
