// One sync with the data repo (BX-R148 to BX-R156). Copied from Tool Ctrl's sync.js and shaped for a box list.
// No page code: tested against a fake GitHub.
import { readDoc, mergeLists, listCommitMessage, diffLists, same, LOGO_FILE } from './core.js';
import { LIST_PATH, README_PATH, readme } from './github.js';

// Changes in this browser that GitHub doesn't have yet (BX-R155)
export const waiting = (base, local) => (base ? diffLists(base, local).total : 0);

// Reads box-ctrl.json; a file that won't read is never written over (BX-R156)
export async function readRemote(gh, repo) {
  const f = await gh.read(LIST_PATH);
  if (f.missing || f.error) return f;
  try { return { doc: readDoc(JSON.parse(f.text)), sha: f.sha }; }
  catch { return { error: { kind: 'unreadable', title: `${LIST_PATH} won't read`, text: `${LIST_PATH} in ${repo} isn't a Box Ctrl list. Nothing in this browser changed. Fix or remove the file on GitHub, then sync again.` } }; }
}

// BX-R150, BX-R151: the logo file follows the mark. It goes up before the list that points to it.
async function placeLogo(gh, mark, remoteMark, logoB64) {
  const want = mark?.kind === 'img', had = remoteMark?.kind === 'img';
  if (want && had && mark.hash === remoteMark.hash) return {};
  if (!want && !had) return {};
  const cur = await gh.raw(LOGO_FILE);
  if (cur.error) return { error: cur.error };
  if (want) {
    if (!logoB64) return {}; // the image isn't in this browser; the list still points to the one on GitHub
    const w = await gh.put(LOGO_FILE, logoB64, cur.sha || null, 'Box Ctrl: logo');
    return w.error ? { error: w.error } : {};
  }
  if (cur.missing) return {};
  const d = await gh.remove(LOGO_FILE, cur.sha, 'Box Ctrl: logo removed');
  return d.error ? { error: d.error } : {};
}

// base: the list as last synced; sha: GitHub's version of it; logoB64: this browser's logo, when it has one.
export async function syncOnce({ gh, repo, local, base, sha, logoB64 = null }) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const rem = await readRemote(gh, repo);
    if (rem.error) return { status: 'error', error: rem.error };
    let target, from, message;
    if (rem.missing) { target = local; from = null; message = 'Box Ctrl: first list'; }
    else if (rem.sha === sha && base) {
      if (same(local, base)) return { status: 'synced', list: local, base, sha, wrote: false };
      target = local; from = rem.doc; message = listCommitMessage(base, local);
    } else {
      const m = mergeLists(base, local, rem.doc);
      if (m.conflicts.length) return { status: 'conflict', merged: m.list, conflicts: m.conflicts, remote: rem.doc, remoteSha: rem.sha };
      if (same(m.list, rem.doc)) return { status: 'synced', list: m.list, base: rem.doc, sha: rem.sha, wrote: false };
      target = m.list; from = rem.doc; message = listCommitMessage(rem.doc, m.list);
    }
    const lg = await placeLogo(gh, target.mark, from?.mark, target.mark?.hash === local.mark?.hash ? logoB64 : null);
    if (lg.error) return { status: 'error', error: lg.error };
    const w = await gh.write(LIST_PATH, JSON.stringify(target, null, 2), rem.missing ? null : rem.sha, message);
    if (w.stale) { if (!rem.missing) { base = rem.doc; sha = rem.sha; local = target; } continue; }
    if (w.error) return { status: 'error', error: w.error };
    if (rem.missing) { const rd = await gh.read(README_PATH); if (rd.missing) await gh.write(README_PATH, readme(repo), null, 'Box Ctrl: README'); }
    return { status: 'synced', list: target, base: target, sha: w.sha, message, wrote: true };
  }
  return { status: 'error', error: { kind: 'busy', title: 'GitHub kept changing', text: 'GitHub kept changing while this synced. Try Sync now in a minute.' } };
}
