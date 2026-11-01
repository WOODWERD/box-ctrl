// Box Ctrl rules. No page code here: everything in this file is tested by BX-A ID.
import { ICONS } from './icons.js';

export const PHI = 1.6180339887;
export const PT = 0.3528;
export const SHEET = { W: 90, H: 170 };
export const PAPER = { letter: { W: 215.9, H: 279.4, name: 'Letter' }, a4: { W: 210, H: 297, name: 'A4' } };
export const OFFICE = { margin: 6.35, gutter: 3 };
export const MAX_BOXES = 500;
export const MAX_FILE = 5 * 1024 * 1024;
export const NAME_FLOOR_PT = 9, TEXT_FLOOR_PT = 4.5; // provisional (BX-R22, Q7)
export const LOGO_EDGE = 640; // stored size (BX-R42)
export const LIMITS = { id: 12, name: 20, kind: 28, c: 40, owner: 32, prefix: 8, group: 16, textMark: 16 };

// ---------- profiles (BX-R01 to BX-R03) ----------
export const PROFILES = [
  { id: 'sys-standard', name: 'Systainer standard card', fits: 'Fits Systainer standard card', sticker: [84, 54], card: [85.72, 54.03], status: 'Sticker measured, card published' },
  { id: 'sys-s', name: 'Systainer³ S card', fits: 'Fits Systainer³ S card', sticker: [54, 35], card: [54, 35], status: 'Published, not test printed' },
];
export const CUSTOM = { W: { min: 30, max: 166, name: 'Width' }, H: { min: 12, max: 86, name: 'Height' } };
export const INPUTS = { B: { min: 0, max: 3, name: 'Cut border' }, G: { min: 1.5, max: 12, name: 'Space between cuts' } };
export const DEFAULTS = { B: 1.5, G: 1.9 };

export function profileSize(s) {
  const p = PROFILES.find((x) => x.id === s.profile);
  if (p) return { sticker: p.sticker, card: p.card, fits: p.fits, status: p.status };
  const v = [s.custom.W, s.custom.H];
  return { sticker: v, card: v, fits: 'Custom size', status: 'Custom' };
}

export function rangeError(r, raw) {
  const v = parseFloat(raw);
  if (!isFinite(v) || v < r.min || v > r.max) return `${r.name} can't be ${String(raw).trim() || 'empty'}. Enter ${r.min} to ${r.max} mm.`;
  return '';
}

// ---------- colour (BX-R23 to BX-R25) ----------
export const PALETTE = [
  { name: 'Green', hex: '#6CB33F' }, { name: 'Red', hex: '#DB011C' }, { name: 'Gold', hex: '#E3AE00' }, { name: 'Blue', hex: '#3A93C9' },
  { name: 'Forest', hex: '#1F6B3F' }, { name: 'Purple', hex: '#7A4FA0' }, { name: 'Charcoal', hex: '#2B2D31' }, { name: 'Black', hex: '#000000' },
  { name: 'Steel', hex: '#9AA3AB' }, { name: 'Sand', hex: '#D8C59A' }, { name: 'Clay', hex: '#C8A58C' }, { name: 'Stone', hex: '#D6D2C8' },
];
const hex = (n) => PALETTE.find((p) => p.name === n).hex;
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export function luminance(h) {
  const c = rgb(h).map((v) => v / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrast(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export const autoText = (band) => (contrast(band, '#000000') >= contrast(band, '#FFFFFF') ? '#000000' : '#FFFFFF');
export const bandText = (g) => g.text || autoText(g.color);
const mix = (fg, bg, t) => '#' + rgb(fg).map((v, i) => Math.round(v * t + rgb(bg)[i] * (1 - t)).toString(16).padStart(2, '0')).join('');
export const contentsColour = (ink, band) => { const m = mix(ink, band, 0.85); return contrast(m, band) >= 4.5 ? m : ink; };

export const OTHER = 'other';
export const startGroups = () => [
  { id: 'power', name: 'Power tools', color: hex('Green') }, { id: 'hand', name: 'Hand tools', color: hex('Black') },
  { id: 'consumable', name: 'Consumables', color: hex('Sand') }, { id: 'kit', name: 'Kits', color: hex('Charcoal') },
  { id: OTHER, name: 'Other', color: hex('Stone') },
];

export const slug = () => 'g' + Math.random().toString(36).slice(2, 9);
export function nextColour(groups) {
  const used = new Set(groups.map((g) => g.color.toUpperCase()));
  return (PALETTE.find((p) => !used.has(p.hex)) || PALETTE[6]).hex;
}
export function removeGroup(state, id) {
  if (id === OTHER) return 0;
  let moved = 0;
  state.boxes.forEach((b) => { if (b.groupId === id) { b.groupId = OTHER; moved++; } });
  state.groups = state.groups.filter((g) => g.id !== id);
  return moved;
}
export const groupNameError = (groups, name, id) => {
  const n = String(name).trim();
  if (!n) return 'A group needs a name.';
  if (n.length > LIMITS.group) return `A group name holds up to ${LIMITS.group} characters.`;
  if (groups.some((g) => g.id !== id && g.name.toLowerCase() === n.toLowerCase())) return `There's already a group called ${n}.`;
  return '';
};

// Generic on purpose: the repo is public (BX-R65)
export const exampleBoxes = () => [
  { id: 'BOX-001', name: 'TRIM ROUTER', kind: 'Router', c1: 'Router · edge guide', c2: 'Collets', groupId: 'power', icon: 'router', qty: 1 },
  { id: 'BOX-002', name: 'ORBITAL SANDER', kind: 'Random orbital sander', c1: 'Sander · pad', c2: 'Dust bag', groupId: 'power', icon: 'sander', qty: 1 },
  { id: 'BOX-003', name: 'TRACK SAW', kind: 'Plunge saw', c1: 'Saw · blade', c2: 'Splinter guard', groupId: 'power', icon: 'track-saw', qty: 1 },
  { id: 'BOX-004', name: 'DRIVER SET', kind: 'Screwdrivers', c1: 'Slotted · Phillips', c2: 'Bit holder', groupId: 'hand', icon: 'screwdriver', qty: 1 },
  { id: 'BOX-005', name: 'SANDING DISCS', kind: 'Abrasives', c1: 'Discs 150 mm', c2: 'P80 – P400', groupId: 'consumable', icon: 'abrasive', qty: 1 },
  { id: 'BOX-006', name: 'INSTALL KIT', kind: 'Site kit', c1: 'Levels · shims', c2: 'Fixings', groupId: 'kit', icon: 'kit', qty: 1 },
];

// The tutorial's sample list (BX-R122)
export const SAMPLE_LOGO = { kind: 'img', src: 'woodwerd-sample-logo.png', file: 'woodwerd-sample-logo.png', w: 640, h: 296, sample: true };
export const sampleState = () => ({
  profile: 'sys-standard', custom: { W: 120, H: 25 }, mark: { ...SAMPLE_LOGO }, owner: 'Property of WOODWERD', prefix: 'BOX-',
  groups: startGroups(), boxes: exampleBoxes().filter((b) => ['BOX-001', 'BOX-002', 'BOX-005'].includes(b.id)), inputs: { ...DEFAULTS }, route: 'liene', paper: 'letter', sel: 0,
});

// ---------- boxes (BX-R30 to BX-R37) ----------
export const clampQty = (q) => Math.max(0, Math.min(99, Math.round(+q || 0)));
export function nextId(boxes, prefix) {
  const p = prefix.toUpperCase(); let top = 0;
  boxes.forEach((b) => {
    const t = String(b.id || '').toUpperCase();
    if (t.startsWith(p)) { const m = t.slice(p.length).match(/^\d+$/); if (m) top = Math.max(top, +m[0]); }
  });
  return `${prefix}${String(top + 1).padStart(3, '0')}`;
}
export const blankBox = (id, groupId = OTHER, icon = '') => ({ id, name: '', kind: '', c1: '', c2: '', groupId, icon, qty: 1 });
export const printable = (b) => String(b.name || '').trim() !== '' && clampQty(b.qty) > 0;
export function labelList(boxes) {
  const out = [];
  boxes.filter(printable).forEach((b) => { for (let i = 0; i < clampQty(b.qty); i++) out.push(b); });
  return out;
}
export function duplicateIds(boxes) {
  const seen = new Map();
  boxes.forEach((b) => { const k = String(b.id || '').trim().toUpperCase(); if (k) seen.set(k, (seen.get(k) || 0) + 1); });
  return new Set([...seen].filter(([, n]) => n > 1).map(([k]) => k));
}
const SHORT = [[/<->/g, '↔'], [/->/g, '→'], [/<-/g, '←'], [/\*/g, '·']];
export const fixSymbols = (t) => SHORT.reduce((s, [re, ch]) => s.replace(re, ch), String(t));

// ---------- label layout, all mm (BX-R10 to BX-R22) ----------
// measure(text, weight) gives width in ems, using the real font.
export function layout(box, stickerW, stickerH, B, measure, hasMark = false, owner = '') {
  const A = stickerW - 2 * B, C = stickerH - 2 * B, s = Math.min(1, C / 51), inset = Math.max(1.5, 4 * s), strip = A / C >= 2.2;
  const x0 = B, y0 = B, name = String(box.name || '').toUpperCase(), kind = String(box.kind || '').toUpperCase();
  const widthAt = (t, w, ls) => measure(t, w) + ls * t.length;
  const fit = (t, w, max, room, ls = 0) => Math.min(max, room / (widthAt(t, w, ls) || 1));
  const iconKey = box.icon && ICONS[box.icon] ? box.icon : '';
  const out = { A, C, s, inset, strip, x0, y0, name, kind, contents: [], dropped: [], small: [] };
  const own = String(owner || '').toUpperCase();

  if (!strip) {
    const bh = C / PHI, fh = C - bh, iconCol = A / (PHI * PHI), room = (iconKey ? A - iconCol : A) - 1.5 * inset;
    const s1 = fit(name, 700, 19 * PT * s, room, 0.02), s2 = fit(kind, 700, 7.5 * PT * s, room, 0.06), maxC = 6.5 * PT * s;
    const lines = [box.c1, box.c2].map((t) => String(t || '').trim());
    const s3 = Math.max(TEXT_FLOOR_PT * PT, Math.min(maxC, ...lines.filter(Boolean).map((t) => room / (measure(t, 400) || 1)), maxC));
    const lead = s3 * 1.4, gap = 1.7 * s, cap = 0.73;
    let [c1, c2] = lines;
    const block = () => s1 * cap + (kind ? gap + s2 * cap : 0) + (c1 || c2 ? gap * 0.8 + s3 * cap : 0) + (c1 && c2 ? lead : 0);
    if (block() > bh - 2 * inset) { if (c2) { c2 = ''; out.dropped.push('contents line 2'); } }
    if (block() > bh - 2 * inset) { if (c1) { c1 = ''; out.dropped.push('contents line 1'); } }
    const top = y0 + (bh - block()) / 2, y1 = top + s1 * cap, y2 = y1 + (kind ? gap + s2 * cap : 0);
    let y = y2 + gap * 0.8 + s3 * cap;
    [c1, c2].filter(Boolean).forEach((t) => { out.contents.push({ t, y }); y += lead; });
    const ib = 22.7 * s, s4 = 5.5 * PT * s, mid = y0 + bh + fh / 2, slotH = fh / PHI, slotW = 27 * s;
    Object.assign(out, {
      band: { x: x0, y: y0, w: A, h: bh }, foot: { x: x0, y: y0 + bh, w: A, h: fh }, tx: x0 + inset, s1, s2, s3, y1, y2,
      icon: iconKey ? { key: iconKey, x: x0 + A - iconCol + (iconCol - ib) / 2, y: y0 + (bh - ib) / 2, size: ib } : null,
      s4, fx: x0 + inset, y5: own ? mid - s4 * 0.25 : 0, y6: own ? mid + s4 * 1.25 : mid + s4 * 0.36, owner: own,
      slot: { x: x0 + A - inset - slotW, y: y0 + bh + (fh - slotH) / 2, w: slotW, h: slotH },
    });
  } else {
    const bw = A / PHI, ib = C - 2 * inset, showIcon = !!iconKey && bw >= 3 * C, room = (showIcon ? bw - ib - inset : bw) - 2 * inset;
    const s1 = fit(name, 700, C * 0.36, room, 0.02), s2 = fit(kind, 700, C * 0.13, room, 0.06), gap = C * 0.09, cap = 0.73;
    const blk = s1 * cap + (kind ? gap + s2 * cap : 0), top = y0 + (C - blk) / 2, y1 = top + s1 * cap, y2 = y1 + gap + s2 * cap;
    const s4 = Math.max(1.6, C * 0.1), fx = x0 + bw + inset, slotH = C - 2 * inset - s4 * 1.6;
    if (box.c1 || box.c2) out.dropped.push('contents');
    if (own) out.dropped.push('owner line');
    if (iconKey && !showIcon) out.dropped.push('icon');
    Object.assign(out, {
      band: { x: x0, y: y0, w: bw, h: C }, foot: { x: x0 + bw, y: y0, w: A - bw, h: C }, tx: x0 + inset, s1, s2, s3: 0, y1, y2,
      icon: showIcon ? { key: iconKey, x: x0 + bw - inset - ib, y: y0 + inset, size: ib } : null,
      s4, fx, y5: 0, y6: y0 + C - inset, owner: '', slot: { x: fx, y: y0 + inset, w: A - bw - 2 * inset, h: slotH },
    });
  }
  if (name && out.s1 / PT < Math.min(NAME_FLOOR_PT, 19 * s)) out.small.push('name');
  if (kind && out.s2 / PT < TEXT_FLOOR_PT) out.small.push('kind');
  return out;
}

// Where a mark sits in its slot, with its proportions kept (BX-R18)
export function fitMark(slot, w, h) {
  const k = Math.min(slot.w / w, slot.h / h), mw = w * k, mh = h * k;
  return { x: slot.x + slot.w - mw, y: slot.y + (slot.h - mh) / 2, w: mw, h: mh };
}

// ---------- sheets (BX-R70 to BX-R75, BX-R81 to BX-R82) ----------
export const margin = (B) => Math.max(2, B);
export function fitGrid(W, H, w, h, m, G) {
  const one = (cw, ch) => {
    const cols = Math.max(0, Math.floor((W - 2 * m + G + 1e-9) / (cw + G))), rows = Math.max(0, Math.floor((H - 2 * m + G + 1e-9) / (ch + G)));
    return { cols, rows, n: cols * rows, w: cw, h: ch };
  };
  const flat = one(w, h), up = one(h, w);
  return up.n > flat.n ? { ...up, rot: true } : { ...flat, rot: false };
}
export const lieneCapacity = (w, h, { B, G }) => fitGrid(SHEET.W, SHEET.H, w, h, margin(B), G);
export const officeCapacity = (w, h, paper) => fitGrid(PAPER[paper].W, PAPER[paper].H, w, h, OFFICE.margin, OFFICE.gutter);
export function gridOrigin(W, H, cap, G) {
  return { x: (W - cap.cols * cap.w - (cap.cols - 1) * G) / 2, y: (H - cap.rows * cap.h - (cap.rows - 1) * G) / 2 };
}
export const pages = (labels, per) => { const out = []; for (let i = 0; per && i < labels.length; i += per) out.push(labels.slice(i, i + per)); return out; };

export function verdict(total, sheets, notes, unit) {
  if (!total) return 'Nothing to print';
  if (notes) return `Ready · ${notes} note${notes === 1 ? '' : 's'}`;
  return `Ready · ${total} label${total === 1 ? '' : 's'} · ${sheets} ${unit}${sheets === 1 ? '' : 's'}`;
}

// ---------- spreadsheets (BX-R96 to BX-R100) ----------
export function parseCsv(text) {
  const t = String(text).replace(/^﻿/, ''), rows = []; let row = [], cell = '', q = false;
  const first = t.split('\n')[0], delim = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export const BAD_COLUMNS = 'That file has no Name column.';
const KNOWN = ['id', 'name', 'kind', 'contents', 'contents 1', 'contents 2', 'group', 'palette', 'icon', 'quantity'];

export function readTable(table) {
  const head = (table[0] || []).map((h) => String(h).trim().toLowerCase()), col = (n) => head.indexOf(n);
  const cn = col('name'), ck = col('kind'), cid = col('id'), cc = col('contents'), c1 = col('contents 1'), c2 = col('contents 2'), ci = col('icon'), cq = col('quantity');
  const cg = col('group') >= 0 ? col('group') : col('palette');
  if (cn < 0) return { error: BAD_COLUMNS, rows: [], skipped: [], unused: [], iconNotes: [] };
  const rows = [], skipped = [], iconNotes = [], unused = head.filter((h) => h && !KNOWN.includes(h));
  table.slice(1).forEach((r, i) => {
    const n = i + 2, get = (k) => (k < 0 ? '' : String(r[k] ?? '').trim());
    if (!r.some((v) => String(v ?? '').trim())) return;
    const name = fixSymbols(get(cn)), kind = fixSymbols(get(ck)), id = get(cid), group = get(cg), q = get(cq);
    let lines = cc >= 0 ? get(cc).split('|').map((t) => t.trim()) : [get(c1), get(c2)];
    lines = lines.map(fixSymbols);
    if (!name) return skipped.push(`Row ${n}: Name is empty.`);
    if (name.length > LIMITS.name) return skipped.push(`Row ${n}: Name is over ${LIMITS.name} characters.`);
    if (kind.length > LIMITS.kind) return skipped.push(`Row ${n}: Kind is over ${LIMITS.kind} characters.`);
    if (id.length > LIMITS.id) return skipped.push(`Row ${n}: ID is over ${LIMITS.id} characters.`);
    if (lines.length > 2) return skipped.push(`Row ${n}: Contents has more than 2 lines.`);
    if (lines.some((t) => t.length > LIMITS.c)) return skipped.push(`Row ${n}: A contents line is over ${LIMITS.c} characters.`);
    if (group.length > LIMITS.group) return skipped.push(`Row ${n}: Group is over ${LIMITS.group} characters.`);
    const qty = q === '' ? 1 : Number(q);
    if (!Number.isInteger(qty) || qty < 0 || qty > 99) return skipped.push(`Row ${n}: Quantity must be a whole number from 0 to 99.`);
    let icon = get(ci).toLowerCase();
    if (icon && !ICONS[icon]) { iconNotes.push(`Row ${n}: no icon called ${icon}, so it has none.`); icon = ''; }
    rows.push({ id, name, kind, c1: lines[0] || '', c2: lines[1] || '', group, icon, qty });
  });
  return { rows, skipped, unused, iconNotes };
}

// Works out the boxes and any new groups. Nothing changes until the result is applied.
export function planImport(state, read, base = state.boxes) {
  const groups = state.groups.map((g) => ({ ...g })), added = [], made = [...base];
  const boxes = read.rows.map((r) => {
    let g = r.group ? groups.find((x) => x.name.toLowerCase() === r.group.toLowerCase()) : groups.find((x) => x.id === OTHER);
    if (!g) { g = { id: slug(), name: r.group, color: nextColour(groups) }; groups.push(g); added.push(g.name); }
    const b = { id: r.id || nextId(made, state.prefix), name: r.name, kind: r.kind, c1: r.c1, c2: r.c2, groupId: g.id, icon: r.icon, qty: r.qty };
    made.push(b);
    return b;
  });
  return { boxes, groups, added, skipped: read.skipped, unused: read.unused, iconNotes: read.iconNotes };
}

// ---------- .xlsx, read locally with no library ----------
const decode = (s) => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

async function inflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function unzip(buf) {
  const v = new DataView(buf), u8 = new Uint8Array(buf); let e = buf.byteLength - 22;
  while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('not a zip');
  const count = v.getUint16(e + 10, true); let p = v.getUint32(e + 16, true);
  const files = new Map(), td = new TextDecoder();
  for (let i = 0; i < count; i++) {
    const method = v.getUint16(p + 10, true), size = v.getUint32(p + 20, true), nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), off = v.getUint32(p + 42, true);
    const name = td.decode(u8.subarray(p + 46, p + 46 + nl));
    const start = off + 30 + v.getUint16(off + 26, true) + v.getUint16(off + 28, true);
    files.set(name, { method, data: u8.subarray(start, start + size) });
    p += 46 + nl + xl + cl;
  }
  return async (name) => { const f = files.get(name); if (!f) return ''; return td.decode(f.method ? await inflate(f.data) : f.data); };
}
export const OLD_XLS = "That's an older or protected Excel file. Save it as .xlsx or .csv, then open it again.";
export async function readXlsx(buf) {
  const u8 = new Uint8Array(buf);
  if (u8[0] === 0xd0 && u8[1] === 0xcf) throw new Error(OLD_XLS);
  const get = await unzip(buf);
  const shared = [...(await get('xl/sharedStrings.xml')).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => decode([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join('')));
  const book = await get('xl/workbook.xml'), rels = await get('xl/_rels/workbook.xml.rels');
  const rid = (book.match(/<sheet\b[^>]*r:id="([^"]+)"/) || [])[1];
  const rel = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => m[0]).find((r) => r.includes(`Id="${rid}"`)) || '';
  const target = (rel.match(/Target="([^"]+)"/) || [, 'worksheets/sheet1.xml'])[1].replace(/^\/?(xl\/)?/, '');
  const xml = await get('xl/' + target);
  const colIndex = (ref) => [...ref.replace(/\d/g, '')].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
  const table = [];
  for (const row of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const r = [];
    for (const c of row[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = (c[1].match(/r="([A-Z]+\d+)"/) || [])[1], t = (c[1].match(/t="(\w+)"/) || [])[1], body = c[2] || '';
      if (!ref) continue;
      const v = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1], is = [...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join('');
      r[colIndex(ref)] = t === 's' ? shared[+v] ?? '' : t === 'inlineStr' ? decode(is) : decode(v ?? '');
    }
    table.push(Array.from(r, (x) => x ?? ''));
  }
  return table;
}

// ---------- saved lists (BX-R93 to BX-R95) ----------
const text = (v, n) => String(v ?? '').slice(0, n);
const readMark = (m) => {
  if (!m || typeof m !== 'object') return { kind: 'none' };
  if (m.kind === 'img' && /^data:image\/png;base64,/.test(m.src || '')) return { kind: 'img', src: m.src, file: text(m.file, 120), w: +m.w || 1, h: +m.h || 1, origW: +m.origW || +m.w || 1 };
  if (m.kind === 'text') return { kind: 'text', text: text(m.text, LIMITS.textMark), frame: ['none', 'rule', 'box'].includes(m.frame) ? m.frame : 'none' };
  if (m.kind === 'icon' && ICONS[m.icon]) return { kind: 'icon', icon: m.icon };
  return { kind: 'none' };
};
const num = (v, r, d) => { const f = parseFloat(v); return isFinite(f) && f >= r.min && f <= r.max ? f : d; };

export function readList(o) {
  if (!o || typeof o !== 'object' || !Array.isArray(o.boxes)) throw new Error('not a list');
  const groups = (Array.isArray(o.groups) ? o.groups : []).map((g) => {
    const out = { id: text(g.id, 40) || slug(), name: text(g.name, LIMITS.group), color: /^#[0-9a-f]{6}$/i.test(g.color) ? g.color : hex('Stone') };
    if (/^#[0-9a-f]{6}$/i.test(g.text || '')) out.text = g.text;
    return out;
  });
  if (!groups.some((g) => g.id === OTHER)) groups.push(startGroups()[4]);
  const ids = new Set(groups.map((g) => g.id)), i = o.inputs || {};
  return {
    profile: PROFILES.some((p) => p.id === o.profile) || o.profile === 'custom' ? o.profile : PROFILES[0].id,
    custom: { W: num(o.custom?.W, CUSTOM.W, 120), H: num(o.custom?.H, CUSTOM.H, 25) },
    mark: readMark(o.mark), owner: text(o.owner, LIMITS.owner), prefix: text(o.prefix, LIMITS.prefix) || 'BOX-', groups,
    inputs: { B: num(i.B, INPUTS.B, DEFAULTS.B), G: num(i.G, INPUTS.G, DEFAULTS.G) },
    route: o.route === 'office' ? 'office' : 'liene', paper: o.paper === 'a4' ? 'a4' : 'letter',
    boxes: o.boxes.map((b) => ({
      id: text(b.id, LIMITS.id), name: text(b.name, LIMITS.name), kind: text(b.kind, LIMITS.kind), c1: text(b.c1, LIMITS.c), c2: text(b.c2, LIMITS.c),
      groupId: ids.has(b.groupId) ? b.groupId : OTHER, icon: ICONS[b.icon] ? b.icon : '', qty: clampQty(b.qty),
    })),
  };
}
export const writeList = (s) => ({ version: 1, profile: s.profile, custom: s.custom, mark: s.mark, owner: s.owner, prefix: s.prefix, groups: s.groups, inputs: s.inputs, route: s.route, paper: s.paper, boxes: s.boxes });

// A list file needs the acknowledgement only when it brings a logo not already here (BX-R110)
export const newLogo = (current, incoming) => incoming.kind === 'img' && !(current.kind === 'img' && current.src === incoming.src);

// ---------- file names and zip (BX-R75, BX-R94) ----------
export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const sheetName = (i, n, d) => `box-labels-90x170-${localDate(d)}-sheet-${i + 1}-of-${n}.png`;
export const zipName = (d) => `box-labels-90x170-${localDate(d)}.zip`;
export const listName = (d) => `box-list-${localDate(d)}.json`;

const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (u8) => { let c = 0xffffffff; for (const b of u8) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
export function makeZip(files) {
  const te = new TextEncoder(), parts = [], central = []; let off = 0;
  const w = (n, ...vals) => { const b = new DataView(new ArrayBuffer(n)); let p = 0; for (const [v, s] of vals) { s === 2 ? b.setUint16(p, v, true) : b.setUint32(p, v, true); p += s; } return new Uint8Array(b.buffer); };
  for (const f of files) {
    const name = te.encode(f.name), crc = crc32(f.data), n = f.data.length;
    const head = w(30, [0x04034b50, 4], [20, 2], [0x0800, 2], [0, 2], [0, 2], [0x21, 2], [crc, 4], [n, 4], [n, 4], [name.length, 2], [0, 2]);
    parts.push(head, name, f.data);
    central.push(w(46, [0x02014b50, 4], [20, 2], [20, 2], [0x0800, 2], [0, 2], [0, 2], [0x21, 2], [crc, 4], [n, 4], [n, 4], [name.length, 2], [0, 2], [0, 2], [0, 2], [0, 2], [0, 4], [off, 4]), name);
    off += head.length + name.length + n;
  }
  const cdSize = central.reduce((a, b) => a + b.length, 0);
  const end = w(22, [0x06054b50, 4], [0, 2], [0, 2], [files.length, 2], [files.length, 2], [cdSize, 4], [off, 4], [0, 2]);
  return new Blob([...parts, ...central, end], { type: 'application/zip' });
}
