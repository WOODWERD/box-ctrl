// Get boxes from Tool Ctrl (BX-R160 to BX-R167). Box Ctrl only reads tool-ctrl.json and never writes it.
import { readTable, planImport, groupForEntry, MAKERS, same } from './core.js';

// ---- copied from Tool Ctrl's core.js (packContents, groupFor, exportBoxCtrl), so the rows match its
// Export for Box Ctrl exactly (BX-R161). Change both together; a test compares them when Tool Ctrl is beside this repo.
const LIMITS = { name: 20, kind: 28 };
const BOX_LINE = 40;
const BOX_MAKERS = ['Festool', 'Milwaukee', 'DEWALT', 'Bosch', 'Makita', 'Wera', 'Knipex'];
const compsOf = (rec, cid) => rec.compartments.filter((c) => c.containerId === cid).sort((a, b) => a.type.localeCompare(b.type) || a.n - b.n);
function itemsIn(rec, place, deep = false) {
  const places = new Set([place]);
  if (deep) for (const k of rec.compartments) if (k.containerId === place) places.add(k.id);
  return rec.items.filter((i) => i.status === 'active' && places.has(i.place));
}
function packContents(names, width = BOX_LINE) {
  const lines = ['', '']; let li = 0; const left = [];
  for (const n of names) {
    if (n.length > width) { left.push(n); continue; }
    while (li < 2) {
      const next = lines[li] ? `${lines[li]} · ${n}` : n;
      if (next.length <= width) { lines[li] = next; break; }
      li += 1;
    }
    if (li > 1) left.push(n);
  }
  return { c1: lines[0], c2: lines[1], left };
}
function groupFor(items) {
  const maker = items.find((i) => BOX_MAKERS.includes(i.brand));
  if (maker) return maker.brand;
  const t = items[0]?.tier;
  return t === 'Hand' ? 'Hand tools' : t === 'Consumable' ? 'Consumables' : t === 'Power' ? 'Power tools' : 'Other';
}
export function toolCtrlRows(rec, { compartments = false } = {}) {
  const rows = [['ID', 'Name', 'Kind', 'Contents', 'Group', 'Icon', 'Quantity']], over = [];
  const one = (id, name, kind, items, icon) => {
    const pk = packContents(items.map((i) => i.name));
    if (pk.left.length) over.push({ id, name, total: items.length, left: pk.left.length });
    rows.push([id, name.slice(0, LIMITS.name), kind.slice(0, LIMITS.kind), [pk.c1, pk.c2].filter(Boolean).join('|'), groupFor(items), icon || '', 1]);
  };
  for (const c of rec.containers.filter((x) => x.status === 'active').sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))) {
    const ks = compsOf(rec, c.id);
    if (compartments && ks.length) {
      for (const k of ks) one(k.id, k.name || `${c.name} ${k.type}${k.n}`, c.name, itemsIn(rec, k.id), c.kept?.icon);
    } else one(c.id, c.name, c.kind || c.kindOfBox, itemsIn(rec, c.id, true), c.kept?.icon);
  }
  return { rows, overruns: over };
}
// ---- end of the copy

// BX-R166: a record Box Ctrl knows, or a plain reason it can't read it
export function readToolCtrl(text, repo) {
  let o; try { o = JSON.parse(text); } catch { o = null; }
  if (!o || o.kind !== 'tool-ctrl-record' || !o.record || !Array.isArray(o.record.containers)) return { error: `tool-ctrl.json in ${repo} isn't a Tool Ctrl record Box Ctrl can read. Nothing here changed.` };
  if (o.version > 1) return { error: 'Tool Ctrl\'s record is newer than this Box Ctrl knows. Reload Box Ctrl to get the latest version, then try again.' };
  const r = o.record;
  return { record: { containers: r.containers, compartments: r.compartments || [], items: r.items || [] } };
}

const KEYS = ['name', 'kind', 'c1', 'c2'];
const up = (s) => String(s || '').trim().toUpperCase();
// BX-R162: what would change, before anything does. base is the list as it stands ([] while the examples show).
export function planToolCtrl(state, rec, { compartments = false, base = state.boxes } = {}) {
  const { rows, overruns } = toolCtrlRows(rec, { compartments });
  const read = readTable(rows);
  const groups = state.groups.map((g) => ({ ...g }));
  // BX-R163: a maker's group is added in its own colour (BX-R103); other new groups take the next colour (BX-R99)
  for (const r of read.rows) if (MAKERS.some((m) => m[1] === r.group) && !groups.some((g) => g.name.toLowerCase() === r.group.toLowerCase())) groupForEntry(groups, { brand: r.group, tier: 'power' });
  const plan = planImport({ ...state, groups }, read, []);
  const have = new Map(base.map((b, i) => [up(b.id), i]));
  const tc = new Set(plan.boxes.map((b) => up(b.id)));
  const out = { added: [], changed: [], same: 0, notIn: base.filter((b) => b.id && !tc.has(up(b.id))).map((b) => b.id), overruns, skipped: read.skipped, groups: plan.groups, newGroups: plan.added };
  for (const b of plan.boxes) {
    const i = have.get(up(b.id));
    if (i == null) out.added.push(b);
    else {
      const was = base[i], diff = KEYS.filter((k) => String(was[k] || '') !== String(b[k] || ''));
      if (diff.length) out.changed.push({ index: i, id: was.id, fields: diff, box: b }); else out.same++;
    }
  }
  out.added.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  return out;
}
// BX-R163, BX-R164: the new list and groups. Nothing is removed.
export function applyToolCtrl(boxes, plan, { onlyChanged = false } = {}) {
  const next = boxes.map((b) => ({ ...b }));
  const touched = new Set();
  for (const c of plan.changed) { for (const k of KEYS) next[c.index][k] = c.box[k]; touched.add(c.index); }
  if (onlyChanged) next.forEach((b, i) => { b.qty = touched.has(i) ? 1 : 0; });
  for (const b of plan.added) next.push({ ...b, qty: 1 });
  return { boxes: next, groups: plan.groups, unchanged: same(next, boxes) };
}
