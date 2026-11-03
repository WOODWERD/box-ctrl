// GitHub storage and Get boxes from Tool Ctrl, against a fake GitHub (BX-A104 to BX-A130). No real repo or token is used.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import * as c from '../site/core.js';
import { client, fromB64, toB64, LIST_PATH, LOGO_PATH, TOOL_CTRL_PATH, README_PATH } from '../site/github.js';
import { syncOnce, waiting } from '../site/sync.js';
import { toolCtrlRows, readToolCtrl, planToolCtrl, applyToolCtrl } from '../site/toolctrl.js';

const TOKEN = 'test-token-not-real';
const REPO = 'someone/ctrl-data';

// A small stand-in for api.github.com: one repo, files with shas, a token that can be revoked
function fakeGitHub({ isPrivate = true } = {}) {
  const files = new Map(); let n = 0; const calls = [], commits = [];
  const gh = { files, calls, commits, token: TOKEN, isPrivate, canWrite: true, down: false };
  gh.fetch = async (url, opts = {}) => {
    calls.push({ url, method: opts.method || 'GET', auth: opts.headers?.Authorization });
    if (gh.down) throw new TypeError('offline');
    const ok = (status, body) => ({ status, json: async () => body });
    if (opts.headers?.Authorization !== `Bearer ${gh.token}`) return ok(401, { message: 'Bad credentials' });
    const u = new URL(url);
    if (u.origin !== 'https://api.github.com') return ok(400, {});
    const path = u.pathname.replace(`/repos/${REPO}`, '');
    if (path === '') return ok(200, { full_name: REPO, private: gh.isPrivate, permissions: { push: gh.canWrite } });
    const file = path.replace('/contents/', '');
    if (!opts.method || opts.method === 'GET') {
      if (file === '') return files.size ? ok(200, [...files].map(([name, f]) => ({ name, sha: f.sha }))) : ok(404, {});
      const f = files.get(file);
      return f ? ok(200, { sha: f.sha, content: f.b64, encoding: 'base64' }) : ok(404, { message: 'Not Found' });
    }
    if (!gh.canWrite) return ok(403, { message: 'Resource not accessible' });
    const body = JSON.parse(opts.body), cur = files.get(file);
    if (opts.method === 'DELETE') {
      if (!cur) return ok(404, {});
      if (body.sha !== cur.sha) return ok(409, { message: 'sha does not match' });
      files.delete(file); commits.push(body.message); return ok(200, {});
    }
    if ((cur && body.sha !== cur.sha) || (!cur && body.sha)) return ok(409, { message: 'sha does not match' });
    const sha = `sha${++n}`;
    files.set(file, { sha, b64: body.content, message: body.message }); commits.push(body.message);
    return ok(cur ? 200 : 201, { content: { sha } });
  };
  return gh;
}
const text = (gh, f) => fromB64(gh.files.get(f).b64);
const listOn = (gh) => JSON.parse(text(gh, LIST_PATH));
const clone = (x) => JSON.parse(JSON.stringify(x));
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABpfZFQAAAAABJRU5ErkJggg==';

// A device's list as the page builds it: keys on every box (BX-R153)
function device({ logo = false } = {}) {
  const s = { profile: 'systainer', custom: { W: 120, H: 25 }, owner: 'PROPERTY OF SAMPLE SHOP', prefix: 'BOX-', startNo: 1, extraCols: [], groups: c.startGroups(),
    inputs: { ...c.DEFAULTS }, route: 'liene', paper: 'letter', boxes: c.withKeys(c.exampleBoxes().slice(0, 3)),
    mark: logo ? { kind: 'img', src: PNG, file: 'logo.png', w: 1, h: 1, origW: 1 } : { kind: 'text', text: 'SAMPLE', frame: 'none' } };
  return c.listDoc(s);
}
const logoB64 = PNG.split(',')[1];
const sync = (gh, local, base = null, sha = null, logo = null) => syncOnce({ gh: client(REPO, TOKEN, gh.fetch), repo: REPO, local, base, sha, logoB64: logo });

test('BX-A108 an empty repo, or one with only Tool Ctrl\'s record, gets the list, the logo and a README', async () => {
  const gh = fakeGitHub();
  gh.files.set(TOOL_CTRL_PATH, { sha: 'tc1', b64: toB64('{"kind":"tool-ctrl-record"}') });
  const local = device({ logo: true });
  const s = await sync(gh, local, null, null, logoB64);
  assert.equal(s.status, 'synced');
  assert.deepEqual(listOn(gh), local);
  assert.equal(gh.files.get(LOGO_PATH).b64, logoB64);
  assert.match(text(gh, README_PATH), /box-ctrl/); assert.match(text(gh, README_PATH), /tool-ctrl/);
  assert.equal(gh.files.get(TOOL_CTRL_PATH).sha, 'tc1');
});

test('BX-A117 the list holds no image data, only a pointer and a hash', async () => {
  const gh = fakeGitHub(); await sync(gh, device({ logo: true }), null, null, logoB64);
  const t = text(gh, LIST_PATH);
  assert.ok(!t.includes('base64')); assert.equal(listOn(gh).mark.path, LOGO_PATH); assert.match(listOn(gh).mark.hash, /^[0-9a-f]+$/);
});

test('BX-A105 BX-A106 only api.github.com for the data repo, and the token is in no address or file', async () => {
  const gh = fakeGitHub(); await sync(gh, device({ logo: true }), null, null, logoB64);
  for (const k of gh.calls) { assert.ok(k.url.startsWith(`https://api.github.com/repos/${REPO}`), k.url); assert.ok(!k.url.includes(TOKEN)); }
  for (const [, f] of gh.files) assert.ok(!fromB64(f.b64).includes(TOKEN));
  for (const m of gh.commits) assert.ok(!m.includes(TOKEN));
});

test('BX-A109 a sync never writes Tool Ctrl\'s record', async () => {
  const gh = fakeGitHub(); gh.files.set(TOOL_CTRL_PATH, { sha: 'tc1', b64: toB64('{}') });
  let s = await sync(gh, device());
  const next = clone(s.list); next.boxes[0].name = 'CHANGED';
  s = await sync(gh, next, s.base, s.sha);
  assert.equal(gh.files.get(TOOL_CTRL_PATH).sha, 'tc1');
  assert.ok(!gh.calls.some((k) => k.method !== 'GET' && k.url.endsWith(TOOL_CTRL_PATH)));
});

test('BX-A112 two devices change different boxes and both changes land, with nothing asked', async () => {
  const gh = fakeGitHub();
  const first = await sync(gh, device());
  const a = clone(first.list), b = clone(first.list);
  a.boxes[0].name = 'FROM A'; b.boxes[1].name = 'FROM B';
  const sa = await sync(gh, a, first.base, first.sha);
  const sb = await sync(gh, b, first.base, first.sha);
  assert.equal(sa.status, 'synced'); assert.equal(sb.status, 'synced');
  assert.deepEqual(listOn(gh).boxes.map((x) => x.name).slice(0, 2), ['FROM A', 'FROM B']);
});

test('BX-A113 the same field on two devices asks which to keep', async () => {
  const gh = fakeGitHub();
  const first = await sync(gh, device());
  const a = clone(first.list), b = clone(first.list);
  a.boxes[0].name = 'ROUTER A'; b.boxes[0].name = 'ROUTER B';
  await sync(gh, a, first.base, first.sha);
  const sb = await sync(gh, b, first.base, first.sha);
  assert.equal(sb.status, 'conflict');
  assert.equal(sb.conflicts.length, 1);
  assert.deepEqual([sb.conflicts[0].local, sb.conflicts[0].remote], ['ROUTER B', 'ROUTER A']);
  c.resolveListConflict(sb.merged, sb.conflicts[0], 'remote');
  const done = await sync(gh, sb.merged, sb.remote, sb.remoteSha);
  assert.equal(done.status, 'synced'); assert.equal(listOn(gh).boxes[0].name, 'ROUTER A');
});

test('BX-A114 edits made offline go up as one commit', async () => {
  const gh = fakeGitHub();
  const first = await sync(gh, device());
  const next = clone(first.list); next.boxes[0].name = 'ONE'; next.boxes[1].name = 'TWO'; next.owner = 'NEW OWNER';
  assert.equal(waiting(first.base, next), 3);
  gh.down = true;
  assert.equal((await sync(gh, next, first.base, first.sha)).error.kind, 'offline');
  gh.down = false;
  const before = gh.commits.length, s = await sync(gh, next, first.base, first.sha);
  assert.equal(s.status, 'synced'); assert.equal(gh.commits.length - before, 1);
  assert.match(gh.commits.at(-1), /^Box Ctrl: 2 boxes changed, settings changed$/);
});

test('BX-A115 a revoked token says what to fix and writes nothing', async () => {
  const gh = fakeGitHub(); const first = await sync(gh, device());
  gh.token = 'revoked';
  const next = clone(first.list); next.boxes[0].name = 'KEPT';
  const s = await sync(gh, next, first.base, first.sha);
  assert.equal(s.error.kind, 'auth'); assert.match(s.error.text, /Contents read and write/);
});

test('BX-A116 the repo check says when a repo is public', async () => {
  const api = client(REPO, TOKEN, fakeGitHub({ isPrivate: false }).fetch);
  assert.equal((await api.check()).private, false);
});

test('BX-A118 removing the logo deletes the file in the next commit', async () => {
  const gh = fakeGitHub();
  const first = await sync(gh, device({ logo: true }), null, null, logoB64);
  const next = clone(first.list); next.mark = { kind: 'none' };
  await sync(gh, next, first.base, first.sha);
  assert.ok(!gh.files.has(LOGO_PATH)); assert.ok(gh.commits.includes('Box Ctrl: logo removed'));
});

test('BX-A120 a text mark, an icon, none or the sample logo writes no image', async () => {
  for (const mark of [{ kind: 'text', text: 'X', frame: 'none' }, { kind: 'icon', icon: 'router' }, { kind: 'none' }, c.SAMPLE_LOGO]) {
    const gh = fakeGitHub(), local = device(); local.mark = c.docMark(mark);
    await sync(gh, local);
    assert.ok(!gh.files.has(LOGO_PATH));
  }
});

test('BX-E16 Tool Ctrl committing at the same moment doesn\'t block a save', async () => {
  const gh = fakeGitHub(); const first = await sync(gh, device());
  gh.files.set(TOOL_CTRL_PATH, { sha: 'tc2', b64: toB64('{}') });
  const next = clone(first.list); next.boxes[0].name = 'STILL SAVES';
  assert.equal((await sync(gh, next, first.base, first.sha)).status, 'synced');
});

test('BX-E21 a box-ctrl.json edited into nonsense changes nothing and isn\'t written over', async () => {
  const gh = fakeGitHub(); gh.files.set(LIST_PATH, { sha: 'x1', b64: toB64('not json') });
  const s = await sync(gh, device());
  assert.equal(s.error.kind, 'unreadable'); assert.equal(gh.files.get(LIST_PATH).sha, 'x1');
});

test('BX-R153 keys survive a backup and stay out of the spreadsheet', () => {
  const d = device(), back = c.readList(JSON.parse(JSON.stringify(d)));
  assert.deepEqual(back.boxes.map((b) => b.k), d.boxes.map((b) => b.k));
  assert.ok(!c.writeCsv({ ...back }).includes(d.boxes[0].k));
});

// ---------- Get boxes from Tool Ctrl ----------
// A made-up Tool Ctrl record. No one's real equipment (BX-R66).
function tcRecord() {
  return { containers: [
    { id: 'WW-001', name: 'TRACK SAW', kind: 'Track saw', kindOfBox: 'Systainer', status: 'active' },
    { id: 'WW-002', name: 'ROUTER', kind: 'Router', kindOfBox: 'Systainer', status: 'active' },
    { id: 'WW-003', name: 'OLD BOX', kind: '', kindOfBox: 'Bin', status: 'retired' },
    { id: 'WW-004', name: 'ROLLING CHEST', kind: '', kindOfBox: 'Tool chest', status: 'active' }],
  compartments: [{ id: 'WW-004-D1', containerId: 'WW-004', type: 'D', n: 1, name: 'PLIERS' }],
  items: [
    { uid: 'i1', name: 'TS 55 F', brand: 'Festool', tier: 'Power', place: 'WW-001', status: 'active', warranty: { serial: 'SECRET-SERIAL', bought: '2025-01-01' }, notes: 'secret note' },
    { uid: 'i2', name: 'Guide rail', brand: '', tier: 'Power', place: 'WW-001', status: 'active' },
    { uid: 'i3', name: 'OF 1010', brand: 'Festool', tier: 'Power', place: 'WW-002', status: 'active' },
    { uid: 'i4', name: 'Side cutters', brand: 'Knipex', tier: 'Hand', place: 'WW-004-D1', status: 'active' }] };
}
const st = (boxes) => ({ groups: c.startGroups(), prefix: 'BOX-', startNo: 1, boxes });

test('BX-A121 rows match Tool Ctrl\'s own Export for Box Ctrl, when Tool Ctrl is beside this repo', { skip: !existsSync(new URL('../../tool-ctrl/site/core.js', import.meta.url)) }, async () => {
  const tc = await import('../../tool-ctrl/site/core.js');
  const rec = { ...tc.emptyRecord('X', 'WW'), ...clone(tcRecord()) };
  for (const compartments of [false, true]) {
    const mine = toolCtrlRows(rec, { compartments }).rows, theirs = c.parseCsv(tc.exportBoxCtrl(rec, { compartments }).csv);
    assert.deepEqual(mine.map((r) => r.map(String)), theirs.filter((r) => r.some((x) => x !== '')));
  }
});

test('BX-A122 no warranty detail, location or note comes across', () => {
  const plan = planToolCtrl(st([]), tcRecord());
  const t = JSON.stringify(applyToolCtrl([], plan));
  for (const s of ['SECRET-SERIAL', '2025-01-01', 'secret note']) assert.ok(!t.includes(s), s);
});

test('BX-A123 BX-A124 a changed box takes the new name only, and a box Tool Ctrl lacks stays', () => {
  const mine = c.withKeys([
    { id: 'WW-001', name: 'OLD NAME', kind: 'Track saw', c1: 'TS 55 F · Guide rail', c2: '', groupId: 'kit', icon: 'router', qty: 0, extra: { Shelf: 'A' } },
    { id: 'BOX-200', name: 'MINE ONLY', kind: '', c1: '', c2: '', groupId: 'other', icon: '', qty: 1 }]);
  const plan = planToolCtrl(st(mine), tcRecord());
  assert.deepEqual(plan.changed.map((x) => [x.id, x.fields]), [['WW-001', ['name']]]);
  assert.deepEqual(plan.added.map((b) => b.id), ['WW-002', 'WW-004']);
  assert.deepEqual(plan.notIn, ['BOX-200']);
  const r = applyToolCtrl(mine, plan);
  const w1 = r.boxes.find((b) => b.id === 'WW-001');
  assert.deepEqual([w1.name, w1.groupId, w1.icon, w1.qty, w1.extra.Shelf, w1.k], ['TRACK SAW', 'kit', 'router', 0, 'A', mine[0].k]);
  assert.ok(r.boxes.some((b) => b.id === 'BOX-200'));
  assert.equal(r.boxes.find((b) => b.id === 'WW-002').groupId, 'festool');
});

test('BX-A125 only new and changed boxes keep a quantity, when asked', () => {
  const mine = [{ id: 'WW-001', name: 'OLD', kind: 'Track saw', c1: 'TS 55 F · Guide rail', c2: '', groupId: 'other', icon: '', qty: 3 }, { id: 'BOX-200', name: 'X', kind: '', c1: '', c2: '', groupId: 'other', icon: '', qty: 2 }];
  const r = applyToolCtrl(mine, planToolCtrl(st(mine), tcRecord()), { onlyChanged: true });
  assert.deepEqual(r.boxes.map((b) => [b.id, b.qty]), [['WW-001', 1], ['BOX-200', 0], ['WW-002', 1], ['WW-004', 1]]);
});

test('BX-A126 a record Box Ctrl can\'t read says so', () => {
  assert.match(readToolCtrl('nope', REPO).error, /isn't a Tool Ctrl record/);
  assert.match(readToolCtrl(JSON.stringify({ kind: 'tool-ctrl-record', version: 9, record: { containers: [] } }), REPO).error, /newer/);
  assert.ok(readToolCtrl(JSON.stringify({ kind: 'tool-ctrl-record', version: 1, record: tcRecord() }), REPO).record);
});

test('BX-R160 one row per drawer when chosen', () => {
  const plan = planToolCtrl(st([]), tcRecord(), { compartments: true });
  assert.deepEqual(plan.added.map((b) => b.id), ['WW-001', 'WW-002', 'WW-004-D1']);
});
