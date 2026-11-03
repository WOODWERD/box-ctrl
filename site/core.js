// Box Ctrl rules. No page code here: everything in this file is tested by BX-A ID.
import { ICONS } from './icons.js';
import { qrcode } from './vendor/qrcode.mjs';

export const PHI = 1.6180339887;
export const PT = 0.3528;
export const SHEET = { W: 90, H: 170 };
export const PAPER = { letter: { W: 215.9, H: 279.4, name: 'Letter' }, a4: { W: 210, H: 297, name: 'A4' } };
export const OFFICE = { margin: 6.35, gutter: 3 };
export const MAX_BOXES = 500;
export const MAX_FILE = 5 * 1024 * 1024;
export const NAME_FLOOR_PT = 9, TEXT_FLOOR_PT = 4.5; // provisional (BX-R22, Q7)
export const LOGO_EDGE = 640; // stored size (BX-R42)
export const OWNER_LINES = 3;
export const LIMITS = { id: 12, name: 20, kind: 28, c: 40, owner: 32, prefix: 8, group: 16, textMark: 16 };

// ---------- profiles (BX-R01 to BX-R03) ----------
export const PROFILES = [
  { id: 'sys-standard', name: 'Systainer standard card', fits: 'Fits Systainer standard card', sticker: [80, 52], card: [80, 52], status: 'Measured' },
  { id: 'sys-s', name: 'Systainer³ S card', fits: 'Fits Systainer³ S card', sticker: [54, 35], card: [54, 35], status: 'Published, not test printed' },
  ...[['tstak', 'DEWALT TSTAK plate', 97, 19], ['packout-s', 'Milwaukee PACKOUT handle, short', 101.5, 18], ['packout-m', 'Milwaukee PACKOUT handle, medium', 117, 18], ['packout-l', 'Milwaukee PACKOUT handle, long', 150, 18]]
    .map(([id, name, w, h]) => ({ id, name, fits: `Fits ${name}, ${w} × ${h}`, sticker: [w, h], card: [w, h], status: 'Untested', untested: true })),
];
export const CUSTOM = { W: { min: 30, max: 166, name: 'Width' }, H: { min: 12, max: 86, name: 'Height' } };
export const INPUTS = { B: { min: 0, max: 3, name: 'Cut border' }, G: { min: 1.5, max: 12, name: 'Space between cuts' } };
export const DEFAULTS = { B: 1.5, G: 1.9 };

export function profileSize(s) {
  const p = PROFILES.find((x) => x.id === s.profile);
  if (p) return { sticker: p.sticker, card: p.card, fits: p.fits, status: p.status, untested: !!p.untested };
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
  { name: 'Green', hex: '#6CB33F' }, { name: 'Red', hex: '#DB011C' }, { name: 'Gold', hex: '#FEBD17' }, { name: 'Blue', hex: '#3A93C9' }, { name: 'Teal', hex: '#00909E' },
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
// Spelled as each maker writes its name online (BX-R39)
export const MAKERS = [['festool', 'Festool', 'Green', '#002B49'], ['milwaukee', 'Milwaukee', 'Red'], ['dewalt', 'DEWALT', 'Gold'], ['bosch', 'Bosch', 'Blue'], ['makita', 'Makita', 'Teal']];
const HAND_MAKERS = [{ id: 'wera', name: 'Wera', color: hex('Black'), text: '#00A884' }, { id: 'knipex', name: 'Knipex', color: '#E2001A' }];
const makerGroup = ([id, name, colour, text]) => ({ id, name, color: hex(colour), ...(text ? { text } : {}) });
export const startGroups = () => [
  ...MAKERS.map(makerGroup), ...HAND_MAKERS.map((g) => ({ ...g })),
  { id: 'power', name: 'Power tools', color: hex('Steel') }, { id: 'hand', name: 'Hand tools', color: hex('Black') },
  { id: 'consumable', name: 'Consumables', color: hex('Sand') }, { id: 'kit', name: 'Kits', color: hex('Charcoal') },
  { id: OTHER, name: 'Other', color: hex('Stone') },
];

// The group for a catalog entry, added if this list doesn't have one (BX-R103)
export function groupForEntry(groups, e) {
  if (e.tier === 'consumable') { const g = groups.find((x) => x.id === 'consumable'); if (g) return g.id; }
  const m = MAKERS.find((x) => x[1] === e.brand);
  const have = groups.find((x) => x.name.toLowerCase() === e.brand.toLowerCase());
  if (have) return have.id;
  const g = makerGroup(m); groups.splice(Math.max(0, groups.length - 1), 0, g);
  return g.id;
}

export const slug = () => 'g' + Math.random().toString(36).slice(2, 9);
export function nextColour(groups) {
  const used = new Set(groups.map((g) => g.color.toUpperCase()));
  return (PALETTE.find((p) => !used.has(p.hex)) || PALETTE[7]).hex;
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
  profile: 'sys-standard', custom: { W: 120, H: 25 }, mark: { ...SAMPLE_LOGO }, owner: 'Property of WOODWERD', qr: true, prefix: 'BOX-', startNo: 1, extraCols: [],
  groups: startGroups(), boxes: exampleBoxes().filter((b) => ['BOX-001', 'BOX-002', 'BOX-005'].includes(b.id)), inputs: { ...DEFAULTS }, route: 'liene', paper: 'letter', sel: 0,
});

// ---------- boxes (BX-R30 to BX-R37) ----------
export const clampQty = (q) => Math.max(0, Math.min(99, Math.round(+q || 0)));
export const clampStart = (v) => { const n = Math.floor(+v); return n >= 1 && n <= 99999 ? n : 0; };
export function nextId(boxes, prefix, start = 1) {
  const p = prefix.toUpperCase(); let top = 0;
  boxes.forEach((b) => {
    const t = String(b.id || '').toUpperCase();
    if (t.startsWith(p)) { const m = t.slice(p.length).match(/^\d+$/); if (m) top = Math.max(top, +m[0]); }
  });
  return `${prefix}${String(Math.max(top + 1, start)).padStart(3, '0')}`;
}
// Every box in list order from the start number (BX-R131)
export const renumber = (boxes, prefix, start) => boxes.map((b, i) => ({ ...b, id: `${prefix}${String(start + i).padStart(3, '0')}` }));
// Swaps the prefix and keeps each number. Boxes with no number take the next free one (BX-R32).
export function applyPrefix(boxes, prefix) {
  const out = boxes.map((b) => { const m = String(b.id || '').match(/(\d+)$/); return { ...b, id: m ? `${prefix}${m[1]}` : '' }; });
  out.forEach((b) => { if (!b.id) b.id = nextId(out, prefix); });
  return out;
}
export const offPrefix = (boxes, prefix) => (prefix ? boxes.filter((b) => !String(b.id || '').toUpperCase().startsWith(prefix.toUpperCase())).length : 0);
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
// Up to three lines of up to 32 characters. Keeps blank lines, so Return works while typing (BX-R49)
export const clipOwner = (v) => String(v ?? '').split(/\r?\n/).slice(0, OWNER_LINES).map((t) => t.slice(0, LIMITS.owner)).join('\n');
export const ownerLines = (v) => clipOwner(v).split('\n').map((t) => t.trim()).filter(Boolean);

// ---------- QR codes (BX-R168 to BX-R176) ----------
// The code holds only the link to the box in Tool Ctrl, error correction M, the smallest version that holds it.
// Each module is 4 print pixels at 300 dpi, with a 2-module quiet zone.
export const QR_BASE = 'https://woodwerd.github.io/tool-ctrl/#';
export const QR_MOD = 4 / 300 * 25.4, QR_QUIET = 2;
export const qrLink = (id) => QR_BASE + encodeURIComponent(String(id || '').trim());
const qrCache = new Map();
export function qrMatrix(id) {
  const link = qrLink(id);
  if (!qrCache.has(link)) {
    const q = qrcode(0, 'M'); q.addData(link); q.make();
    const n = q.getModuleCount(), rows = [];
    for (let r = 0; r < n; r++) { const row = []; for (let col = 0; col < n; col++) row.push(q.isDark(r, col)); rows.push(row); }
    if (qrCache.size > 600) qrCache.clear();
    qrCache.set(link, { link, n, rows });
  }
  return qrCache.get(link);
}

export function layout(box, stickerW, stickerH, B, measure, hasMark = false, owner = '', qrOn = false) {
  const A = stickerW - 2 * B, C = stickerH - 2 * B, s = Math.min(1, C / 49), inset = Math.max(1.5, 4 * s), strip = A / C >= 2.2;
  const x0 = B, y0 = B, name = String(box.name || '').toUpperCase(), kind = String(box.kind || '').toUpperCase();
  const widthAt = (t, w, ls) => measure(t, w) + ls * t.length;
  const fit = (t, w, max, room, ls = 0) => Math.min(max, room / (widthAt(t, w, ls) || 1));
  const iconKey = box.icon && ICONS[box.icon] ? box.icon : '';
  const out = { A, C, s, inset, strip, x0, y0, name, kind, contents: [], dropped: [], small: [], qr: null };
  const own = ownerLines(owner).map((t) => t.toUpperCase());
  const id = String(box.id || '').trim(), code = qrOn && id ? qrMatrix(id) : null, side = code ? (code.n + 2 * QR_QUIET) * QR_MOD : 0;

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
    const ib = 22.7 * s, slotH = fh / PHI, slotW = 27 * s, foot = { x: x0, y: y0 + bh, w: A, h: fh };
    const slot = { x: x0 + A - inset - slotW, y: y0 + bh + (fh - slotH) / 2, w: slotW, h: slotH };
    // The code sits at the footer's left on the bottom inset, at least 1.5 under the band (BX-R172), or drops (BX-R174)
    if (code && side <= fh - inset - 1.5) out.qr = { x: x0 + inset, y: y0 + C - inset - side, side, mod: QR_MOD, n: code.n, rows: code.rows, link: code.link };
    else if (code) out.dropped.push('QR code');
    const fx = out.qr ? out.qr.x + side + inset : x0 + inset, right = hasMark ? slot.x - inset / 2 : x0 + A - inset;
    Object.assign(out, footerText(own, id, fx, right - fx, foot, s, inset, measure));
    Object.assign(out, {
      band: { x: x0, y: y0, w: A, h: bh }, foot, tx: x0 + inset, s1, s2, s3, y1, y2,
      icon: iconKey ? { key: iconKey, x: x0 + A - iconCol + (iconCol - ib) / 2, y: y0 + (bh - ib) / 2, size: ib } : null, fx, slot,
    });
  } else {
    // A long strip leads with the code on its own white square, full height, before the band (BX-R173).
    // The quiet zone is white, so it may share the inset; the dark modules stay inside it.
    const pad = Math.max(inset, QR_QUIET * QR_MOD), dark = code ? code.n * QR_MOD : 0, fits = code && dark + 2 * pad <= C, tile = fits ? dark + 2 * pad : 0;
    const A2 = A - tile, bx = x0 + tile;
    const bw = A2 / PHI, ib = C - 2 * inset, showIcon = !!iconKey && bw >= 3 * C, room = (showIcon ? bw - ib - inset : bw) - 2 * inset;
    const s1 = fit(name, 700, C * 0.36, room, 0.02), s2 = fit(kind, 700, C * 0.13, room, 0.06), gap = C * 0.09, cap = 0.73;
    const blk = s1 * cap + (kind ? gap + s2 * cap : 0), top = y0 + (C - blk) / 2, y1 = top + s1 * cap, y2 = y1 + gap + s2 * cap;
    const s4 = Math.max(1.6, C * 0.1), fx = bx + bw + inset, slotH = C - 2 * inset - s4 * 1.6;
    if (box.c1 || box.c2) out.dropped.push('contents');
    if (fits) out.qr = { x: x0 + pad - QR_QUIET * QR_MOD, y: y0 + (C - dark) / 2 - QR_QUIET * QR_MOD, side: dark + 2 * QR_QUIET * QR_MOD, mod: QR_MOD, n: code.n, rows: code.rows, link: code.link };
    else if (code) out.dropped.push('QR code');
    if (own.length) out.dropped.push('owner line');
    if (iconKey && !showIcon) out.dropped.push('icon');
    const idSize = id ? Math.min(s4, (x0 + A - inset - fx) / ((measure(id, 700) + 0.06 * id.length) || 1)) : s4;
    Object.assign(out, {
      band: { x: bx, y: y0, w: bw, h: C }, foot: { x: bx + bw, y: y0, w: A2 - bw, h: C }, tx: bx + inset, s1, s2, s3: 0, y1, y2,
      icon: showIcon ? { key: iconKey, x: bx + bw - inset - ib, y: y0 + inset, size: ib } : null,
      s4: idSize, fx, y6: y0 + C - inset, owner: [], ownSize: 0, slot: { x: fx, y: y0 + inset, w: A2 - bw - 2 * inset, h: slotH },
    });
    if (id && idSize / PT < TEXT_FLOOR_PT) out.small.push('ID');
  }
  if (name && out.s1 / PT < Math.min(NAME_FLOOR_PT, 19 * s)) out.small.push('name');
  if (kind && out.s2 / PT < TEXT_FLOOR_PT) out.small.push('kind');
  if (out.footSmall) { out.small.push(...out.footSmall); delete out.footSmall; }
  return out;
}

// Card footer text (BX-R177, BX-R178): the owner line 6.5 pt 600 caps, the ID 9 pt 700 under it, both black.
// An owner line first shrinks, no lower than 5.5 pt, to stay on its line; past that it wraps by word at 6.5 pt.
// Three printed lines at most. A line that still won't fit shrinks to fit and is flagged when under the floor.
export function footerText(own, id, fx, col, foot, s, inset, measure) {
  const full = 6.5 * PT * s, least = 5.5 * PT * s, idFull = 9 * PT * s, lsO = 0.08, lsI = 0.06, small = [];
  const wide = (t, w, ls) => measure(t, w) + ls * t.length;
  const longest = (lines) => Math.max(0, ...lines.map((t) => wide(t, 600, lsO)));
  let lines = own, size = full;
  if (own.length && longest(own) * full > col) {
    if (longest(own) * least <= col) size = col / longest(own);
    else {
      const wrapped = [];
      for (const line of own) {
        let cur = '';
        for (const w of line.split(/\s+/).filter(Boolean)) { const t = cur ? cur + ' ' + w : w; if (!cur || wide(t, 600, lsO) * full <= col) cur = t; else { wrapped.push(cur); cur = w; } }
        if (cur) wrapped.push(cur);
      }
      if (wrapped.length <= OWNER_LINES && longest(wrapped) * full <= col) lines = wrapped;
      else size = Math.max(0, col / (longest(own) || 1));
    }
  }
  if (own.length && size / PT < TEXT_FLOOR_PT) small.push('owner line');
  const idSize = id ? Math.min(idFull, col / (wide(id, 700, lsI) || 1)) : idFull;
  if (id && idSize / PT < TEXT_FLOOR_PT) small.push('ID');
  const cap = 0.73, lead = size * 1.2, gap = 1.2 * s, n = lines.length;
  const h = (n ? size * cap + (n - 1) * lead + gap : 0) + idSize * cap, top = foot.y + (foot.h - h) / 2;
  const owner = lines.map((t, i) => ({ t, y: top + size * cap + i * lead }));
  return { owner, ownSize: size, s4: idSize, y6: top + h, col, footSmall: small };
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
  if (cn < 0) return { error: BAD_COLUMNS, rows: [], skipped: [], kept: [], iconNotes: [] };
  const raw = (table[0] || []).map((h) => String(h).trim()), keptAt = head.map((h, i) => (h && !KNOWN.includes(h) && head.indexOf(h) === i ? i : -1)).filter((i) => i >= 0);
  const rows = [], skipped = [], iconNotes = [], kept = keptAt.map((i) => raw[i]);
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
    const extra = {};
    keptAt.forEach((k) => { const v = String(r[k] ?? ''); if (v !== '') extra[raw[k]] = v; });
    rows.push({ id, name, kind, c1: lines[0] || '', c2: lines[1] || '', group, icon, qty, extra });
  });
  return { rows, skipped, kept, iconNotes };
}

// Works out the boxes and any new groups. Nothing changes until the result is applied.
export function planImport(state, read, base = state.boxes) {
  const groups = state.groups.map((g) => ({ ...g })), added = [], made = [...base];
  const boxes = read.rows.map((r) => {
    let g = r.group ? groups.find((x) => x.name.toLowerCase() === r.group.toLowerCase()) : groups.find((x) => x.id === OTHER);
    if (!g) { g = { id: slug(), name: r.group, color: nextColour(groups) }; groups.push(g); added.push(g.name); }
    const b = { id: r.id || nextId(made, state.prefix, state.startNo || 1), name: r.name, kind: r.kind, c1: r.c1, c2: r.c2, groupId: g.id, icon: r.icon, qty: r.qty, extra: r.extra };
    made.push(b);
    return b;
  });
  return { boxes, groups, added, skipped: read.skipped, kept: read.kept, iconNotes: read.iconNotes };
}

// The everyday list: opens in any spreadsheet and opens back in here (BX-R134).
// The byte order mark tells Excel it's UTF-8, so · and → survive.
const cell = (v) => { const t = String(v ?? ''); return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
export function writeCsv(s) {
  const cols = s.extraCols || [], name = (id) => (s.groups.find((g) => g.id === id) || {}).name || '';
  const rows = [['ID', 'Name', 'Kind', 'Contents', 'Group', 'Icon', 'Quantity', ...cols]];
  s.boxes.forEach((b) => rows.push([b.id, b.name, b.kind, [b.c1, b.c2].filter(Boolean).join('|'), name(b.groupId), b.icon, b.qty, ...cols.map((h) => (b.extra || {})[h] ?? '')]));
  return '\uFEFF' + rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
export const mergeCols = (a, b) => [...a, ...b.filter((h) => !a.some((x) => x.toLowerCase() === h.toLowerCase()))];

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

const readExtra = (e) => Object.fromEntries(Object.entries(e && typeof e === 'object' ? e : {}).slice(0, 200).map(([k, v]) => [text(k, 200), text(v, 5000)]));

export function readList(o) {
  if (!o || typeof o !== 'object' || !Array.isArray(o.boxes)) throw new Error('not a list');
  const groups = (Array.isArray(o.groups) ? o.groups : []).map((g) => {
    const out = { id: text(g.id, 40) || slug(), name: text(g.name, LIMITS.group), color: /^#[0-9a-f]{6}$/i.test(g.color) ? g.color : hex('Stone') };
    if (/^#[0-9a-f]{6}$/i.test(g.text || '')) out.text = g.text;
    return out;
  });
  if (!groups.some((g) => g.id === OTHER)) groups.push(startGroups().find((g) => g.id === OTHER));
  const ids = new Set(groups.map((g) => g.id)), i = o.inputs || {};
  return {
    profile: PROFILES.some((p) => p.id === o.profile) || o.profile === 'custom' ? o.profile : PROFILES[0].id,
    custom: { W: num(o.custom?.W, CUSTOM.W, 120), H: num(o.custom?.H, CUSTOM.H, 25) },
    extraCols: Array.isArray(o.extraCols) ? o.extraCols.map((h) => text(h, 200)).filter(Boolean).slice(0, 200) : [],
    mark: readMark(o.mark), owner: clipOwner(o.owner), qr: o.qr !== false, prefix: text(o.prefix, LIMITS.prefix) || 'BOX-', startNo: clampStart(o.startNo) || 1, groups,
    inputs: { B: num(i.B, INPUTS.B, DEFAULTS.B), G: num(i.G, INPUTS.G, DEFAULTS.G) },
    route: o.route === 'office' ? 'office' : 'liene', paper: o.paper === 'a4' ? 'a4' : 'letter',
    boxes: o.boxes.map((b) => ({
      id: text(b.id, LIMITS.id), name: text(b.name, LIMITS.name), kind: text(b.kind, LIMITS.kind), c1: text(b.c1, LIMITS.c), c2: text(b.c2, LIMITS.c),
      groupId: ids.has(b.groupId) ? b.groupId : OTHER, icon: ICONS[b.icon] ? b.icon : '', qty: clampQty(b.qty), extra: readExtra(b.extra),
      k: /^[a-z0-9]{4,24}$/.test(b.k || '') ? b.k : boxKey(),
    })),
  };
}
export const writeList = (s) => ({ version: 1, extraCols: s.extraCols || [], profile: s.profile, custom: s.custom, mark: s.mark, owner: s.owner, qr: s.qr !== false, prefix: s.prefix, startNo: s.startNo || 1, groups: s.groups, inputs: s.inputs, route: s.route, paper: s.paper, boxes: s.boxes });

// A list file needs the acknowledgement only when it brings a logo not already here (BX-R110)
export const newLogo = (current, incoming) => incoming.kind === 'img' && !(current.kind === 'img' && current.src === incoming.src);

// ---------- GitHub storage (BX-R145 to BX-R157) ----------
// BX-R153: a hidden key on each box, never printed or in a spreadsheet, so boxes match across devices
export const boxKey = () => 'b' + Math.random().toString(36).slice(2, 12).padEnd(10, '0');
export function withKeys(boxes) { for (const b of boxes) if (!b.k) b.k = boxKey(); return boxes; }

// A short fingerprint of the stored logo, so a sync knows when it changed
export function logoHash(src) {
  let h = 0x811c9dc5; const s = String(src || '');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0') + s.length.toString(16);
}
export const LOGO_FILE = 'box-ctrl-logo.png';
// BX-R146: box-ctrl.json is the backup format with the logo image left out and pointed to
export function docMark(m) {
  if (m?.kind === 'img' && m.sample) return { kind: 'none' }; // the WOODWERD sample never goes up (BX-R150)
  if (m?.kind === 'img') return { kind: 'img', path: LOGO_FILE, hash: m.hash || logoHash(m.src), file: m.file, w: m.w, h: m.h, origW: m.origW };
  return m || { kind: 'none' };
}
export const listDoc = (s) => ({ ...writeList(s), mark: docMark(s.mark), boxes: s.boxes.map((b) => ({ ...b })) });
// Reads box-ctrl.json from the repo. The logo stays a pointer until its file is fetched.
export function readDoc(o) {
  const r = readList({ ...o, mark: o?.mark?.kind === 'img' ? { kind: 'none' } : o?.mark });
  const m = o.mark;
  if (m?.kind === 'img' && /^[0-9a-f]{8,20}$/.test(m.hash || '')) r.mark = { kind: 'img', path: LOGO_FILE, hash: m.hash, file: text(m.file, 120), w: +m.w || 1, h: +m.h || 1, origW: +m.origW || +m.w || 1 };
  return { version: 1, ...writeList(r), mark: r.mark };
}

const stable = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((y) => [y, x[y]])) : x));
export const same = (a, b) => stable(a) === stable(b);
const clone = (v) => JSON.parse(JSON.stringify(v));
const byKey = (list, key) => new Map((list || []).map((x) => [x[key], x]));
const SETTINGS = ['profile', 'custom', 'owner', 'qr', 'prefix', 'startNo', 'inputs', 'route', 'paper', 'mark', 'extraCols'];
const SETTING_NAMES = { profile: 'Box size', custom: 'Custom size', owner: 'Owner line', qr: 'QR codes', prefix: 'ID prefix', startNo: 'Start numbering at', inputs: 'Print settings', route: 'Print route', paper: 'Paper', mark: 'Your mark', extraCols: 'Kept columns' };
const FIELD_NAMES = { id: 'ID', name: 'Name', kind: 'Kind', c1: 'Contents line 1', c2: 'Contents line 2', groupId: 'Group', icon: 'Icon', qty: 'Quantity', extra: 'Kept columns', color: 'Colour', text: 'Text colour' };
const LISTS = [['boxes', 'k'], ['groups', 'id']];

// What changed between two copies, for the commit message and the waiting count (BX-R149, BX-R155)
export function diffLists(base, cur) {
  const d = { added: [], changed: [], removed: [], groups: 0, settings: 0 };
  const B = byKey(base?.boxes, 'k'), C = byKey(cur?.boxes, 'k');
  for (const [k, x] of C) { if (!B.has(k)) d.added.push(x.id || x.name); else if (!same(B.get(k), x)) d.changed.push(x.id || x.name); }
  for (const [k, x] of B) if (!C.has(k)) d.removed.push(x.id || x.name);
  if (!same(base?.groups, cur?.groups)) d.groups = 1;
  d.settings = SETTINGS.filter((f) => !same(base?.[f], cur?.[f])).length;
  d.total = d.added.length + d.changed.length + d.removed.length + d.groups + d.settings;
  return d;
}
export function listCommitMessage(base, cur) {
  if (!base) return 'Box Ctrl: first list';
  const d = diffLists(base, cur), parts = [], n = (a, w) => `${a.length === 1 && a[0] ? a[0] : `${a.length} boxes`} ${w}`;
  if (d.added.length) parts.push(n(d.added, 'added'));
  if (d.changed.length) parts.push(n(d.changed, 'changed'));
  if (d.removed.length) parts.push(n(d.removed, 'removed'));
  if (d.groups) parts.push('groups changed');
  if (d.settings) parts.push(!same(base.mark, cur.mark) ? 'mark changed' : 'settings changed');
  return `Box Ctrl: ${parts.join(', ') || 'no changes'}`;
}

// BX-R154: three-way merge, field by field. Where both changed the same field, this device's value stays
// for now and the field is listed for the person to choose (BX-S22).
export function mergeLists(base, local, remote) {
  base = base || { boxes: [], groups: [] };
  const out = {}, conflicts = [];
  for (const [kind, key] of LISTS) {
    const B = byKey(base[kind], key), L = byKey(local[kind], key), R = byKey(remote[kind], key), list = [];
    const order = [...(remote[kind] || []).map((x) => x[key]), ...(local[kind] || []).map((x) => x[key]).filter((k) => !R.has(k))];
    for (const k of order) {
      const b = B.get(k), l = L.get(k), r = R.get(k);
      if (l && !r) { if (!b || !same(l, b)) list.push(l); continue; } // removed there: kept only if changed here
      if (r && !l) { if (!b || !same(r, b)) list.push(r); continue; }
      if (same(l, r) || same(r, b)) { list.push(l); continue; }
      if (same(l, b)) { list.push(r); continue; }
      const m = {};
      for (const f of new Set([...Object.keys(l), ...Object.keys(r)])) {
        const lv = l[f], rv = r[f], bv = b?.[f];
        if (same(lv, rv) || same(rv, bv)) m[f] = lv;
        else if (same(lv, bv)) m[f] = rv;
        else { m[f] = lv; conflicts.push({ kind, key: k, field: f, local: lv, remote: rv, label: `${kind === 'boxes' ? l.id || l.name || 'A box' : `${l.name} group`} · ${FIELD_NAMES[f] || f}` }); }
      }
      list.push(m);
    }
    out[kind] = clone(list);
  }
  for (const f of SETTINGS) {
    const lv = local[f], rv = remote[f], bv = base[f];
    if (same(lv, rv) || same(rv, bv)) out[f] = clone(lv);
    else if (same(lv, bv)) out[f] = clone(rv);
    else if (f === 'extraCols') out[f] = mergeCols(lv || [], rv || []);
    else { out[f] = clone(lv); conflicts.push({ kind: 'settings', key: f, field: f, local: lv, remote: rv, label: SETTING_NAMES[f] }); }
  }
  if (!out.groups.some((g) => g.id === OTHER)) out.groups.push(startGroups().find((g) => g.id === OTHER));
  const gids = new Set(out.groups.map((g) => g.id));
  for (const b of out.boxes) if (!gids.has(b.groupId)) b.groupId = OTHER; // a group removed on one side
  return { list: { version: 1, ...out }, conflicts };
}
// BX-S22: apply the person's choice for one field
export function resolveListConflict(list, cf, keep) {
  const v = clone(keep === 'remote' ? cf.remote : cf.local) ?? null;
  if (cf.kind === 'settings') { list[cf.field] = v; return; }
  const key = cf.kind === 'boxes' ? 'k' : 'id', x = list[cf.kind].find((y) => y[key] === cf.key);
  if (x) x[cf.field] = v;
}

// ---------- file names and zip (BX-R75, BX-R94) ----------
export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const sheetName = (i, n, d) => `box-labels-90x170-${localDate(d)}-sheet-${i + 1}-of-${n}.png`;
export const zipName = (d) => `box-labels-90x170-${localDate(d)}.zip`;
export const listName = (d) => `box-list-${localDate(d)}.json`;
export const csvName = (d) => `box-list-${localDate(d)}.csv`;

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
