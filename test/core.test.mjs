// Run: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import * as c from '../site/core.js';
import { ICONS, searchIcons } from '../site/icons.js';
import { CATALOG, BRANDS, searchCatalog } from '../site/catalog.js';

const near = (a, b, e = 0.01) => assert.ok(Math.abs(a - b) <= e, `${a} is not near ${b}`);
const em = (t) => t.length * 0.6; // stands in for canvas text measuring
const box = (o = {}) => ({ id: 'BOX-001', name: 'ROUTER', kind: 'Router', c1: 'Router · edge guide', c2: 'Collets', groupId: 'power', icon: 'router', qty: 1, ...o });
const S = (o = {}) => ({ boxes: [], groups: c.startGroups(), prefix: 'BOX-', ...o });
const inputs = (o = {}) => ({ ...c.DEFAULTS, ...o });

test('BX-A01 artwork size', () => {
  const l = c.layout(box(), 84, 54, 1.5, em);
  near(l.A, 81); near(l.C, 51);
  assert.equal(Math.round(l.A / 25.4 * 300), 957); assert.equal(Math.round(l.C / 25.4 * 300), 602);
});

test('BX-A02 zones', () => {
  const l = c.layout(box(), 84, 54, 1.5, em);
  near(l.band.h, 31.52); near(l.foot.h, 19.48); assert.equal(l.strip, false);
  near(l.A - (l.A - l.A / (c.PHI * c.PHI)), 30.94); near(l.slot.w, 27); near(l.slot.h, 12.04);
});

test('BX-A03 long labels use the Strip shape', () => assert.equal(c.layout(box(), 150, 25, 1.5, em).strip, true));

test('BX-A04 three labels per sheet at the defaults', () => {
  const cap = c.lieneCapacity(84, 54, inputs());
  assert.equal(cap.n, 3); assert.equal(cap.rot, false);
});

test('BX-A05 two per sheet at 4 mm', () => assert.equal(c.lieneCapacity(84, 54, inputs({ G: 4 })).n, 2));

test('BX-A07 office Letter holds 9, turned', () => { const o = c.officeCapacity(85.72, 54.03, 'letter'); assert.equal(o.n, 9); assert.equal(o.rot, true); });
test('BX-A08 office A4 holds 10', () => assert.equal(c.officeCapacity(85.72, 54.03, 'a4').n, 10));

test('BX-A09 file names use the local date', () => {
  const d = new Date(2026, 10, 1, 21, 0);
  assert.equal(c.sheetName(0, 3, d), 'box-labels-90x170-2026-11-01-sheet-1-of-3.png');
  assert.equal(c.listName(d), 'box-list-2026-11-01.json');
});

test('BX-A10 palette contrast', () => {
  const want = { Green: ['#000000', 8.2], Red: ['#FFFFFF', 5.2], Gold: ['#000000', 12.5], Blue: ['#000000', 6.2], Teal: ['#000000', 5.5], Forest: ['#FFFFFF', 6.5], Purple: ['#FFFFFF', 6.1], Charcoal: ['#FFFFFF', 13.8], Black: ['#FFFFFF', 21], Steel: ['#000000', 8.2], Sand: ['#000000', 12.4], Clay: ['#000000', 9.2], Stone: ['#000000', 13.9] };
  c.PALETTE.forEach((p) => {
    const t = c.autoText(p.hex); assert.equal(t, want[p.name][0], p.name);
    near(c.contrast(p.hex, t), want[p.name][1], 0.06);
  });
});

test('BX-A11 any band colour reaches 4.5:1', () => {
  for (let i = 0; i < 4000; i++) {
    const h = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
    assert.ok(c.contrast(h, c.autoText(h)) >= 4.5, h);
  }
});

test('contents print solid where 85 % would miss 4.5:1', () => {
  const m = c.contentsColour('#FFFFFF', '#DB011C');
  assert.ok(c.contrast(m, '#DB011C') >= 4.5);
  assert.notEqual(c.contentsColour('#000000', '#6CB33F'), '#000000');
});

test('BX-A13 a group colour change reaches its boxes', () => {
  const groups = c.startGroups(), boxes = [box(), box(), box(), box()];
  groups.find((g) => g.id === 'power').color = '#DB011C';
  assert.ok(boxes.every((b) => groups.find((g) => g.id === b.groupId).color === '#DB011C'));
});

test('BX-A14 removing a group moves its boxes to Other', () => {
  const s = S({ boxes: [box(), box(), box()] });
  assert.equal(c.removeGroup(s, 'power'), 3);
  assert.ok(s.boxes.every((b) => b.groupId === 'other'));
  assert.equal(c.removeGroup(s, 'other'), 0);
});

const CSV = process.env.BOX_CTRL_CSV || '';
test('BX-A15 a full list imports whole', { skip: !existsSync(CSV) && 'set BOX_CTRL_CSV to run' }, () => {
  const read = c.readTable(c.parseCsv(readFileSync(CSV, 'utf8')));
  assert.equal(read.skipped.length, 0, read.skipped.join('; '));
  assert.equal(read.rows.length, 66); assert.equal(read.iconNotes.length, 0, read.iconNotes.join('; '));
  assert.deepEqual(read.kept, ['tier', 'model', 'systainer', 'location', 'label_status', 'notes']);
  const plan = c.planImport(S(), read);
  assert.equal(plan.boxes[0].id, 'ST-001'); assert.equal(plan.boxes[0].c2, 'Splinter guard');
  assert.ok(!plan.added.includes('festool')); assert.equal(plan.boxes[0].groupId, 'festool');
});

test('BX-A16 columns in any order', () => {
  const r = c.readTable([['Quantity', 'NAME', 'Kind'], ['2', 'SAW', 'Track saw']]);
  assert.deepEqual([r.rows[0].name, r.rows[0].kind, r.rows[0].qty], ['SAW', 'Track saw', 2]);
});

test('BX-A17 a long name skips that row only', () => {
  const r = c.readTable([['Name'], ['X'.repeat(30)], ['SAW']]);
  assert.equal(r.rows.length, 1); assert.equal(r.skipped[0], 'Row 2: Name is over 20 characters.');
});

test('BX-A18 an unknown icon is left as None and named', () => {
  const r = c.readTable([['Name', 'Icon'], ['SAW', 'spaceship']]);
  assert.equal(r.rows[0].icon, ''); assert.match(r.iconNotes[0], /spaceship/);
});

test('BX-A19 old Excel files are named', async () => {
  await assert.rejects(c.readXlsx(new Uint8Array([0xd0, 0xcf, 0, 0]).buffer), { message: c.OLD_XLS });
});

test('no Name column is refused', () => assert.equal(c.readTable([['Line 1'], ['x']]).error, c.BAD_COLUMNS));

test('blank values fill in', () => {
  const plan = c.planImport(S(), c.readTable([['Name', 'Group'], ['SAW', 'Fiber']]));
  assert.equal(plan.boxes[0].id, 'BOX-001'); assert.equal(plan.boxes[0].qty, 1); assert.deepEqual(plan.added, ['Fiber']);
});

test('BX-A20 a list round trips with its logo', () => {
  const s = { ...S({ boxes: [box()] }), profile: 'sys-s', custom: { W: 120, H: 25 }, mark: { kind: 'img', src: 'data:image/png;base64,AAAA', file: 'a.png', w: 640, h: 300, origW: 640 }, owner: 'x', inputs: inputs(), route: 'office', paper: 'a4' };
  const r = c.readList(JSON.parse(JSON.stringify(c.writeList(s))));
  assert.deepEqual([r.profile, r.mark.src, r.owner, r.route, r.paper, r.boxes[0].name], ['sys-s', s.mark.src, 'x', 'office', 'a4', 'ROUTER']);
});

test('a list file cannot smuggle a remote logo', () => {
  const r = c.readList({ boxes: [], mark: { kind: 'img', src: 'https://example.com/x.png' } });
  assert.equal(r.mark.kind, 'none');
});

test('BX-A59 a list with a new logo needs the acknowledgement', () => {
  const a = { kind: 'img', src: 'data:a' }, b = { kind: 'img', src: 'data:b' };
  assert.equal(c.newLogo(a, b), true); assert.equal(c.newLogo(a, a), false); assert.equal(c.newLogo(a, { kind: 'none' }), false);
});

test('BX-A28 the library has 52 icons drawn to the grid', () => {
  assert.equal(Object.keys(ICONS).length, 52);
  Object.values(ICONS).forEach((i) => assert.match(i.d, /^[Mm]/, i.key));
});

test('BX-A29 search by plain words', () => {
  assert.ok(searchIcons('biscuit').some((i) => i.key === 'joiner'));
  assert.ok(searchIcons('domino').some((i) => i.key === 'joiner'));
});

test('BX-A33 a short name prints at 19 pt', () => near(c.layout(box(), 84, 54, 1.5, em).s1 / c.PT, 19, 0.01));

test('BX-A34 a 20-character name fits its column', () => {
  const l = c.layout(box({ name: 'X'.repeat(20) }), 84, 54, 1.5, em);
  assert.ok(l.s1 / c.PT >= 9); assert.ok(l.tx + l.s1 * (em(l.name) + 0.4) <= l.x0 + l.A - 30.94 + 0.01);
});

test('BX-A35 the S card flags a long name', () => {
  const l = c.layout(box({ name: 'CORDLESS TRIM ROUTER' }), 54, 35, 1.5, em);
  assert.ok(l.small.includes('name'));
});

test('Strip drops contents and says so', () => {
  const l = c.layout(box(), 120, 25, 1.5, em);
  assert.ok(l.dropped.includes('contents')); assert.equal(l.contents.length, 0);
});

test('BX-A36 boxes with no quantity or name make no labels', () => {
  assert.equal(c.labelList([box({ qty: 0 }), box({ name: '' })]).length, 0);
  assert.equal(c.labelList([box({ qty: 2 })]).length, 2);
  assert.equal(c.verdict(0, 0, 0, 'sheet'), 'Nothing to print');
  assert.equal(c.verdict(66, 22, 0, 'sheet'), 'Ready · 66 labels · 22 sheets');
});

test('duplicate IDs are found', () => assert.ok(c.duplicateIds([box(), box()]).has('BOX-001')));
test('next ID pads to three digits', () => assert.equal(c.nextId([box({ id: 'BOX-009' })], 'BOX-'), 'BOX-010'));
test('BX-A69 a new prefix leaves IDs alone and counts them', () => {
  assert.equal(c.offPrefix([box({ id: 'ST-001' }), box({ id: 'ST-200' })], 'SYS-'), 2);
  assert.equal(c.offPrefix([box({ id: 'SYS-001' })], 'SYS-'), 0);
});
test('BX-A70 Change all keeps each number', () => {
  const r = c.applyPrefix([box({ id: 'ST-001' }), box({ id: 'ST-200' }), box({ id: '' })], 'SYS-');
  assert.deepEqual(r.map((b) => b.id), ['SYS-001', 'SYS-200', 'SYS-201']);
});
test('BX-A72 the start number sets the next ID', () => {
  assert.equal(c.nextId([box({ id: 'BOX-003' })], 'BOX-', 41), 'BOX-041');
});
test('BX-A73 the next free number wins when it is higher', () => {
  assert.equal(c.nextId([box({ id: 'BOX-050' })], 'BOX-', 41), 'BOX-051');
});
test('BX-A74 Number all runs in list order', () => {
  assert.deepEqual(c.renumber([box(), box(), box()], 'BOX-', 41).map((b) => b.id), ['BOX-041', 'BOX-042', 'BOX-043']);
});
test('blank spreadsheet IDs follow the start number', () => {
  const plan = c.planImport({ ...S(), startNo: 41 }, c.readTable([['Name'], ['SAW']]));
  assert.equal(plan.boxes[0].id, 'BOX-041');
});
test('BX-A75 tabs limit the search', () => {
  const hits = searchCatalog('drill', 'Bosch');
  assert.ok(hits.length > 0 && hits.every((e) => e.brand === 'Bosch'));
});
test('all five brands have a standard set', () => {
  BRANDS.forEach((b) => assert.ok(CATALOG.filter((e) => e.brand === b).length >= 15, b));
});
test('BX-A77 a catalog pick lands in its maker group', () => {
  const g = c.startGroups();
  assert.equal(c.groupForEntry(g, { brand: 'Festool', tier: 'power' }), 'festool');
  assert.equal(c.groupForEntry(g, { brand: 'Festool', tier: 'consumable' }), 'consumable');
  const old = g.filter((x) => x.id !== 'milwaukee');
  assert.equal(c.groupForEntry(old, { brand: 'Milwaukee', tier: 'power' }), 'milwaukee');
  assert.equal(old.find((x) => x.id === 'milwaukee').color, '#DB011C');
  assert.equal(old.at(-1).id, 'other');
});
test('a renamed maker group still matches', () => {
  const g = [{ id: 'g1', name: 'FESTOOL', color: '#6CB33F' }, { id: 'other', name: 'Other', color: '#D6D2C8' }];
  assert.equal(c.groupForEntry(g, { brand: 'Festool', tier: 'power' }), 'g1');
});
test('makers are spelled their own way', () => assert.deepEqual(c.startGroups().slice(0, 5).map((g) => g.name), ['Festool', 'Milwaukee', 'DEWALT', 'Bosch', 'Makita']));
const round = (s) => {
  const read = c.readTable(c.parseCsv(c.writeCsv(s)));
  return { read, plan: c.planImport({ ...s, boxes: [] }, read) };
};
test('BX-A78 Drew\'s list survives export and import', { skip: !existsSync(CSV) && 'private file not here' }, () => {
  const read = c.readTable(c.parseCsv(readFileSync(CSV, 'utf8'))), plan = c.planImport(S(), read);
  const s = { ...S(), groups: plan.groups, boxes: plan.boxes, extraCols: read.kept };
  const back = round(s);
  assert.equal(back.read.skipped.length, 0); assert.deepEqual(back.read.kept, read.kept); assert.equal(back.plan.boxes.length, 66);
  const pick = (b) => ({ id: b.id, name: b.name, kind: b.kind, c1: b.c1, c2: b.c2, icon: b.icon, qty: b.qty, extra: b.extra });
  assert.deepEqual(back.plan.boxes.map(pick), plan.boxes.map(pick));
  assert.equal(c.writeCsv({ ...s, groups: back.plan.groups, boxes: back.plan.boxes }), c.writeCsv(s));
});
test('BX-A79 awkward text round trips', () => {
  const b = box({ name: 'ZYKLOP 1/2" MM', c1: 'Saw, blade · guard', c2: 'Bits → case', extra: { Location: 'Shelf 2, "top"', Notes: 'line one\nline two' } });
  const s = { ...S(), boxes: [b], extraCols: ['Location', 'Notes'] }, r = round(s).plan.boxes[0];
  assert.deepEqual([r.name, r.c1, r.c2, r.extra], [b.name, b.c1, b.c2, b.extra]);
});
test('the spreadsheet starts with a byte order mark', () => assert.equal(c.writeCsv(S()).charCodeAt(0), 0xfeff));
test('kept columns stay out of the label', () => {
  const r = c.readTable([['Name', 'Location'], ['SAW', 'Van']]);
  assert.deepEqual(r.kept, ['Location']); assert.deepEqual(r.rows[0].extra, { Location: 'Van' });
});
test('kept columns survive a saved list', () => {
  const s = { ...S({ boxes: [box({ extra: { Location: 'Van' } })] }), extraCols: ['Location'], custom: { W: 120, H: 25 }, mark: { kind: 'none' }, owner: '', inputs: inputs(), route: 'liene', paper: 'letter', profile: 'sys-standard' };
  const r = c.readList(JSON.parse(JSON.stringify(c.writeList(s))));
  assert.deepEqual([r.extraCols, r.boxes[0].extra], [['Location'], { Location: 'Van' }]);
});
test('column lists merge without repeats', () => assert.deepEqual(c.mergeCols(['Location'], ['location', 'Notes']), ['Location', 'Notes']));
const page = (f) => readFileSync(new URL(`../site/${f}`, import.meta.url), 'utf8');
test('BX-A81 the printer notice opens both pages', () => {
  for (const f of ['index.html', 'guide.html']) {
    const p = page(f), after = p.slice(p.indexOf('</header>') + 9).trimStart();
    assert.match(after, /^<div class="health warn" id="printerNote"( hidden)?>/, f);
    const note = after.slice(0, after.indexOf('</div>'));
    assert.match(note, /Printer required/); assert.match(note, /liene-life\.com\/products\/pixcut-s1/); assert.doesNotMatch(note, /<button/);
  }
});
test('BX-A84 the independence notice follows the printer notice', () => {
  for (const f of ['index.html', 'guide.html']) {
    const p = page(f), at = p.indexOf('id="independentNote"');
    assert.ok(at > p.indexOf('id="printerNote"') && at < p.indexOf('<section', p.indexOf('</header>')), f);
    const note = p.slice(at, p.indexOf('</div>', at));
    for (const t of ['no connection', 'permission', 'condone', 'Festool', 'Milwaukee', 'DEWALT', 'Bosch', 'Makita', 'Liene']) assert.ok(note.includes(t), t);
    assert.doesNotMatch(note, /<button/);
  }
});
test('BX-A85 groups start in the bright colours', () => {
  const colour = (n) => c.startGroups().find((g) => g.name === n).color, named = (n) => c.PALETTE.find((p) => p.name === n).hex;
  assert.deepEqual(['Festool', 'Power tools', 'Milwaukee', 'DEWALT'].map(colour), ['Green', 'Steel', 'Red', 'Gold'].map(named));
  assert.equal(colour('Festool'), '#6CB33F');
});
test('two-colour makers stay readable, and a picked tool keeps the pair', () => {
  const g = c.startGroups(), pairs = g.filter((x) => x.text);
  assert.deepEqual(pairs.map((x) => x.name), ['Festool', 'Wera']);
  for (const p of pairs) assert.ok(c.contrast(p.color, p.text) >= 4.5, `${p.name} ${c.contrast(p.color, p.text)}`);
  const rest = g.filter((x) => x.name !== 'Festool'), id = c.groupForEntry(rest, { brand: 'Festool', tier: 'power' });
  assert.equal(rest.find((x) => x.id === id).text, '#002B49');
});
test('Wera and Knipex start as groups, with readable bands', () => {
  const g = c.startGroups(), wera = g.find((x) => x.name === 'Wera');
  assert.deepEqual([wera.color, c.bandText(wera)], [c.PALETTE.find((p) => p.name === 'Black').hex, '#00A884']);
  assert.ok(c.contrast(wera.color, wera.text) >= 4.5); assert.equal(new Set(g.map((x) => x.id)).size, g.length); const k = g.find((x) => x.name === 'Knipex'); assert.deepEqual([k.color, c.bandText(k)], ['#E2001A', '#FFFFFF']); assert.ok(c.contrast(k.color, '#FFFFFF') >= 4.5);
  assert.equal(g[g.length - 1].name, 'Other');
});
test('BX-A86 untested sizes say so and give their dimensions', () => {
  const u = c.PROFILES.filter((p) => p.untested);
  assert.deepEqual(u.map((p) => p.sticker), [[97, 19], [101.5, 18], [117, 18], [150, 18]]);
  for (const p of u) { assert.equal(p.status, 'Untested'); assert.ok(p.fits.includes(`${p.sticker[0]} × ${p.sticker[1]}`), p.id); assert.deepEqual(p.card, p.sticker); assert.ok(p.fits.startsWith('Fits ')); }
  assert.ok(u[0].name.includes('TSTAK') && u[1].name.includes('PACKOUT'));
});
test('BX-A88 untested sizes print as Strips within the custom limits', () => {
  for (const p of c.PROFILES.filter((x) => x.untested)) {
    const [W, H] = p.sticker, l = c.layout(box(), W, H, 1.5, () => 0.6, true, '');
    assert.equal(l.strip, true, p.id); assert.ok(W <= c.CUSTOM.W.max && H >= c.CUSTOM.H.min, p.id); assert.ok(c.lieneCapacity(W, H, { B: 1.5, G: 1.9 }).n >= 1, p.id);
  }
});
test('BX-A89 only the app can hide the notices', () => {
  assert.match(page('index.html'), /id="noticesRead"/); assert.match(page('index.html'), /id="showNotices"/);
  assert.doesNotMatch(page('guide.html'), /noticesRead|id="printerNote" hidden|id="independentNote" hidden/);
  assert.match(page('index.html'), /class="foot"[\s\S]*not affiliated/);
});
test('BX-A82 what you need covers both routes', () => {
  const need = page('guide.html').match(/<section id="need">.*?<\/section>/s)[0];
  for (const t of ['Liene PixCut S1', 'office printer', 'Save as PDF', "haven't been tested"]) assert.ok(need.includes(t), t);
});
test('symbol shortcuts', () => assert.equal(c.fixSymbols('A * B -> C <-> D'), 'A · B → C ↔ D'));

test('custom sizes turn on the sheet', () => {
  const cap = c.lieneCapacity(120, 25, inputs());
  assert.equal(cap.rot, true); assert.equal(cap.n, 3);
  assert.equal(c.lieneCapacity(54, 35, inputs()).n, 6);
});

test('marks keep their proportions in the slot', () => {
  const m = c.fitMark({ x: 0, y: 0, w: 27, h: 12 }, 640, 296);
  near(m.w / m.h, 640 / 296); assert.ok(m.w <= 27 && m.h <= 12);
});

test('BX-A54 every catalog entry is complete and clean', () => {
  assert.ok(CATALOG.length > 120);
  CATALOG.forEach((e) => {
    assert.ok(e.brand && e.name && e.kind && e.tier, e.name);
    assert.ok(ICONS[e.icon], `${e.name}: ${e.icon}`);
    assert.ok(e.name.length <= c.LIMITS.name, e.name);
    assert.ok(e.kind.length <= c.LIMITS.kind && e.c1.length <= c.LIMITS.c && e.c2.length <= c.LIMITS.c, e.name);
    assert.doesNotMatch(JSON.stringify(e), /https?:|\$|\d{2}-\d{2}-\d{4}/);
  });
});

test('catalog search', () => {
  assert.ok(searchCatalog('festool router').every((e) => e.brand === 'Festool'));
  assert.ok(searchCatalog('festool router').some((e) => e.name === 'OF 1400'));
  assert.ok(searchCatalog('impact').some((e) => e.brand === 'Milwaukee'));
});

test('BX-A68 the sample logo is only in the sample', () => {
  const r = c.readList({ boxes: [], mark: c.SAMPLE_LOGO });
  assert.equal(r.mark.kind, 'none');
});

test('the sample is three boxes on one sheet', () => {
  const s = c.sampleState();
  assert.equal(s.boxes.length, 3); assert.equal(s.owner, 'Property of WOODWERD');
});

test('BX-A97 owner lines stack above the ID inside the footer', () => {
  for (const [W, H] of [[84, 54], [54, 35]]) {
    const one = c.layout(box(), W, H, 1.5, em, true, 'A'), three = c.layout(box(), W, H, 1.5, em, true, 'A\nB\nC'), foot = three.foot;
    assert.deepEqual(three.owner.map((l) => l.t), ['A', 'B', 'C']);
    assert.ok(three.owner[0].y - three.s4 * 0.73 > foot.y); assert.ok(three.y6 < foot.y + foot.h);
    assert.ok(three.owner[1].y > three.owner[0].y && three.y6 > three.owner[2].y);
    assert.equal(one.owner.length, 1);
  }
  const l = c.layout(box(), 84, 54, 1.5, em, true, 'A'), mid = l.foot.y + l.foot.h / 2;
  near(l.owner[0].y, mid - l.s4 * 0.25); near(l.y6, mid + l.s4 * 1.25);
});
test('BX-A98 only three lines of 32 characters are kept', () => {
  assert.equal(c.clipOwner('a\nb\nc\nd'), 'a\nb\nc');
  assert.equal(c.clipOwner('x'.repeat(40)), 'x'.repeat(32));
  assert.equal(c.clipOwner('a\n'), 'a\n'); // Return works while typing
  assert.deepEqual(c.ownerLines(' a \n\n b '), ['a', 'b']);
  assert.equal(c.readList({ version: 1, owner: 'a\nb\nc\nd', boxes: [box()] }).owner, 'a\nb\nc');
});
test('BX-A99 a long owner line stops short of the mark', () => {
  const wide = (t) => t.length * 0.7, l = c.layout(box(), 84, 54, 1.5, wide, true, 'x'.repeat(32));
  assert.ok(l.ownSize < l.s4);
  assert.ok(l.fx + (wide('X'.repeat(32)) + 0.08 * 32) * l.ownSize <= l.slot.x);
  near(c.layout(box(), 84, 54, 1.5, em, true, 'SHORT').ownSize, c.layout(box(), 84, 54, 1.5, em).s4);
});
test('BX-A100 owner lines survive export and reopening', () => {
  const s = { ...S({ boxes: [box()] }), custom: { W: 120, H: 25 }, mark: { kind: 'none' }, owner: 'Property of WOODWERD LLC\n512-555-0100', inputs: inputs(), route: 'liene', paper: 'letter' };
  assert.equal(c.readList(JSON.parse(JSON.stringify(c.writeList(s)))).owner, s.owner);
});
test('BX-A97 strip labels still leave the owner line off', () => {
  const l = c.layout(box(), 120, 25, 1.5, em, true, 'A\nB');
  assert.deepEqual(l.owner, []); assert.ok(l.dropped.includes('owner line'));
});

test('BX-A101 both pages link the main GitHub and the source', () => {
  for (const page of ['index.html', 'guide.html']) {
    const html = readFileSync(new URL(`../site/${page}`, import.meta.url), 'utf8');
    assert.equal(html.match(/class="ghlink" href="https:\/\/github\.com\/WOODWERD"/g).length, 2);
    assert.match(html, /href="https:\/\/github\.com\/WOODWERD\/box-ctrl">Source and issues on GitHub/);
  }
});
test('BX-A102 All tools matches the list in Cable Ctrl', () => {
  const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
  const print = html.slice(html.indexOf('<h2>Print'), html.indexOf('<h2>Track'));
  assert.deepEqual([...print.matchAll(/<b>(?:<a [^>]*>)?([^<]+)/g)].map((m) => m[1]), ['Cable Ctrl', 'File Ctrl', 'Box Ctrl']);
  assert.match(html, /<h2>Track <em>— no board needed<\/em><\/h2>\s*<ul>\s*<li class="soon"><b>Tool Ctrl<\/b> <span class="tag">In progress/);
  assert.match(html, /<b>CtrlClock<\/b> <span class="tag">In progress/);
});

test('the repo holds no brand colour names', () => {
  const src = readFileSync(new URL('../site/core.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /name: '(Festool|Milwaukee|DeWalt)/i);
});
