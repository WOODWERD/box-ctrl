// The icon library (BX-R50 to BX-R54). Drawn icons are MIT with this project.
// Marked T: Tabler Icons 3.19.0, MIT, © Paweł Kuna, restyled by the stroke rules in draw code.
const f = (n) => n.toFixed(2);
function teeth(cx, cy, ro, ri, a0, a1, n) {
  const step = (a1 - a0) / n, p = [];
  for (let i = 0; i < n; i++) {
    const a = (a0 + i * step) * Math.PI / 180, b = (a0 + (i + 1) * step) * Math.PI / 180;
    p.push(`${f(cx + ro * Math.cos(a))} ${f(cy + ro * Math.sin(a))}`, `${f(cx + ri * Math.cos(b))} ${f(cy + ri * Math.sin(b))}`);
  }
  return 'M' + p.join(' L');
}
const circ = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const GRIP = 'M7 11l-1 6 M11 11l-1 6 M4 17h9v4H4z';
const dots = Array.from({ length: 6 }, (_, a) => `M${f(12 + 5.5 * Math.cos(a * Math.PI / 3))} ${f(12 + 5.5 * Math.sin(a * Math.PI / 3))}h.01`).join(' ');

// key, display name, path, plain search words
const ROWS = {
  'Power, cutting': [
    ['circular-saw', 'Circular saw', 'M3 13h18 M3 13a9 9 0 0 1 18 0 ' + teeth(12, 13, 7, 5.8, 0, 180, 7) + ' ' + circ(12, 13, 1.5), 'skill saw'],
    ['track-saw', 'Track saw', 'M4 16h16 M5 16a7 7 0 0 1 14 0 M15 10.5l2-4h3l-1 5 M2 19h20v2H2z', 'plunge saw rail'],
    ['miter-saw', 'Miter saw', 'M3 18h18v3H3z M19 18v-3.5 M19 14.5L13.5 12 ' + teeth(9, 10, 5.5, 4.4, 0, 360, 10) + 'z ' + circ(9, 10, 1.2), 'chop saw'],
    ['table-saw', 'Table saw', 'M2 12h20 M5 12l-2 9 M19 12l2 9 ' + teeth(12, 12, 4.5, 3.5, 180, 360, 5), ''],
    ['jigsaw', 'Jigsaw', 'M5 13V9a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v4z M9 9h6 M4 15h16 M15 15v6', ''],
    ['recip-saw', 'Reciprocating saw', 'M3 9h13a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z M17 8v8 M17 11h5v2h-5 M6 15v4h3l1-4', 'recip demolition'],
    ['multi-tool', 'Multi-tool', 'M4 9h10a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H4a2.5 2.5 0 0 1 0-5z M15 10h3v3h-3 M15.5 13v6h5v-6 M15.5 19l1 1.5l1-1.5l1 1.5l1-1.5', 'oscillating'],
    ['grinder', 'Grinder', 'M4 8h8a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H4a2.5 2.5 0 0 1 0-5z M13 8.5h4v5h-4 M10 18h10 M11 16.5a4 2.5 0 0 1 8 0 M15 8.5V4', 'angle cut-off'],
  ],
  'Power, shaping': [
    ['router', 'Router', 'M9 4h6v11H9z ' + circ(5, 11, 1.5) + ' ' + circ(19, 11, 1.5) + ' M6.5 11H9 M15 11h2.5 M4 18h16 M12 18v3', 'trim edge'],
    ['sander', 'Sander', 'M4 16h16v3H4z M6 16v-4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4 M10 10V7h4v3 M18 13h3', 'orbital polisher'],
    ['planer', 'Planer', 'M3 17h18 M4 17v-4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4 M13 11V7a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v4 M6 11V8h3v3', ''],
    ['joiner', 'Joiner', 'M3 5h8v14H3z M13 5h8v14h-8z M7 10.5h10a1.5 1.5 0 0 1 0 3H7a1.5 1.5 0 0 1 0-3z', 'domino biscuit tenon mortise dowel'],
  ],
  'Power, drill and drive': [
    ['drill', 'Drill', 'M4 5h11a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M16 6.5l3 1v1l-3 1 M19 8h3 ' + GRIP, 'driver'],
    ['impact-driver', 'Impact driver', 'M4 5h9a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M14 6.5h3v3h-3 M17 8h3 M18.5 6.8v2.4 ' + GRIP, ''],
    ['hammer-drill', 'Hammer drill', 'M3 6h13v6H3z M16 7.5h2v3h-2 M18 9h4 M5 12l-1 7h4l1-7 M13 12l1.5 6', 'rotary sds'],
    ['impact-wrench', 'Impact wrench', 'M4 5h9a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M14 7h2v2h-2 M16 5.5h4v5h-4z ' + GRIP, ''],
  ],
  'Shop and site': [
    ['nailer', 'Nailer', 'M5 3h5v14H5z M10 6h9v3h-9 M10 14l9-5v3l-9 5 M7.5 17v3', 'nail gun brad finish'],
    ['heat-gun', 'Heat gun', 'M3 6h13a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H3z M17 7.5h3v3h-3 M8 12l-1 9h4l1-9', ''],
    ['extractor', 'Extractor', 'M5 8h11a2 2 0 0 1 2 2v7H3v-7a2 2 0 0 1 2-2z M18 11c4 0 4-7-1-7H9 ' + circ(6, 20, 1.5) + ' ' + circ(15, 20, 1.5), 'vacuum dust vac'],
    ['laser-level', 'Laser level', 'M8 8h8v8H8z M10.5 11h3v2h-3 M2 12h1.5 M5 12h1.5 M17.5 12h1.5 M20.5 12h1.5 M12 5V3.5 M12 2v-.01', ''],
    ['light', 'Light', 'M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7 M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3 M9.7 17l4.6 0', 'work lamp bulb T'],
    ['radio', 'Radio', 'M14 3l-9.371 3.749a1 1 0 0 0 -.629 .928v11.323a1 1 0 0 0 1 1h14a1 1 0 0 0 1 -1v-11a1 1 0 0 0 -1 -1h-14.5 M4 12h16 M7 12v-2 M17 16v.01 M13 16v.01', 'speaker bluetooth T'],
    ['battery', 'Battery', 'M16 7h1a2 2 0 0 1 2 2v.5a.5 .5 0 0 0 .5 .5a.5 .5 0 0 1 .5 .5v3a.5 .5 0 0 1 -.5 .5a.5 .5 0 0 0 -.5 .5v.5a2 2 0 0 1 -2 2h-2 M8 7h-2a2 2 0 0 0 -2 2v6a2 2 0 0 0 2 2h1 M12 8l-2 4h3l-2 4', 'charger T'],
  ],
  'Hand tools': [
    ['screwdriver', 'Screwdriver', 'M9.5 15.5a2.5 2.5 0 0 1 5 0v4a2.5 2.5 0 0 1-5 0z M10.5 13v-1.5h3V13 M12 11.5V6.5 M10.75 6.5h2.5l.75-3.5h-4z', 'driver set', 45],
    ['bits', 'Bits', 'M10 3h4v9h-4z M10 7h4 M10 12l2 6l2-6 M12 18v3', 'driver bit'],
    ['hex-key', 'Hex key', 'M5 5v12a3 3 0 0 0 3 3h7 M20.5 7L18.75 10.03L15.25 10.03L13.5 7L15.25 3.97L18.75 3.97z', 'allen'],
    ['ratchet', 'Ratchet', circ(7, 7, 4) + ' M6 6h2v2H6z M10 9.5l9.5 9.5a1.4 1.4 0 0 1-2 2L8 11.5', 'socket wrench'],
    ['sockets', 'Sockets', 'M3 12h5v8H3z M3 14h5 M9.5 8h5v12h-5z M9.5 10h5 M16 4h5v16h-5z M16 6h5', ''],
    ['wrench', 'Wrench', 'M7 10h3v-3l-3.5 -3.5a6 6 0 0 1 8 8l6 6a2 2 0 0 1 -3 3l-6 -6a6 6 0 0 1 -8 -8l3.5 3.5', 'spanner T'],
    ['hammer', 'Hammer', 'M11.414 10l-7.383 7.418a2.091 2.091 0 0 0 0 2.967a2.11 2.11 0 0 0 2.976 0l7.407 -7.385 M18.121 15.293l2.586 -2.586a1 1 0 0 0 0 -1.414l-7.586 -7.586a1 1 0 0 0 -1.414 0l-2.586 2.586a1 1 0 0 0 0 1.414l7.586 7.586a1 1 0 0 0 1.414 0z', 'mallet T'],
    ['chisel', 'Chisel', 'M14 14l1.5 1.5 M18.347 15.575l2.08 2.079a1.96 1.96 0 0 1 -2.773 2.772l-2.08 -2.079a1.96 1.96 0 0 1 2.773 -2.772z M3 6l3 -3l7.414 7.414a2 2 0 0 1 .586 1.414v2.172h-2.172a2 2 0 0 1 -1.414 -.586l-7.414 -7.414z', 'T'],
    ['pliers', 'Pliers', 'M12 12C10.5 9 10.5 6 11.5 3 M12 12C13.5 9 13.5 6 12.5 3 M12 12C11 15 9 18 8 21 M12 12C13 15 15 18 16 21 ' + circ(12, 12, 1.5), 'cutters'],
    ['knife', 'Knife', 'M3 10h11v5H3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z M14 10h4l3 5h-7 M6 10V8.5h3V10', 'utility blade'],
    ['tape-measure', 'Tape measure', 'M5 6h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z ' + circ(9, 12.5, 3) + ' M15 17h6v2', ''],
    ['level', 'Level', 'M3 9h18a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z M10 11h4v2h-4z', 'spirit bubble'],
    ['square', 'Square', 'M4 3h4v14H4z M8 13h13v4H8 M11 13v1.5 M14 13v1.5 M17 13v1.5', 'try'],
    ['clamp', 'Clamp', 'M6 3v18 M6 4h9v4 M6 15h9 M13 15V9 M11 9h4 M11 18h4v3h-4z M13 15v3', 'bar f-clamp vise'],
    ['layout', 'Layout tools', 'M4 4h6v16H4z M4 8h3 M4 12h3 M4 16h3 M16 4h4v13l-2 3l-2-3z M16 8h4', 'pencil ruler marking'],
    ['measure', 'Measuring', 'M19.875 12c.621 0 1.125 .512 1.125 1.143v5.714c0 .631 -.504 1.143 -1.125 1.143h-15.875a1 1 0 0 1 -1 -1v-5.857c0 -.631 .504 -1.143 1.125 -1.143h15.75z M9 12v2 M6 12v3 M12 12v3 M18 12v3 M15 12v2 M3 3v4 M3 5h18 M21 3v4', 'ruler rule T'],
  ],
  'Consumables': [
    ['screw', 'Screws', 'M7 3h10l-3 3h-4z M10 6v10l2 5l2-5V6 M10 10l4 1.5 M10 14l4 1.5', 'fasteners'],
    ['nut', 'Nuts and bolts', 'M19 6.84a2.007 2.007 0 0 1 1 1.754v6.555c0 .728 -.394 1.4 -1.03 1.753l-6 3.844a1.995 1.995 0 0 1 -1.94 0l-6 -3.844a2.006 2.006 0 0 1 -1.03 -1.752v-6.557c0 -.728 .394 -1.399 1.03 -1.753l6 -3.582a2.049 2.049 0 0 1 2 0l6 3.582h-.03z M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0', 'washers fasteners T'],
    ['tenon', 'Tenons', 'M6 9h12a3 3 0 0 1 0 6H6a3 3 0 0 1 0-6z M8 9l2 6 M12 9l2 6 M16 9l2 6', 'domino dowels biscuits'],
    ['abrasive', 'Abrasives', circ(12, 12, 9) + ' ' + circ(12, 12, 1.5) + ' ' + dots, 'sanding discs sandpaper'],
    ['saw-blade', 'Saw blade', teeth(12, 12, 9.5, 7.7, 0, 360, 12) + 'z ' + circ(12, 12, 2), 'blades'],
    ['router-bit', 'Router bit', 'M10 2h4v9h-4z M8 11h8l-1 6H9z M11 17h2v3h-2z', ''],
    ['drill-bit', 'Drill bit', 'M10.5 2h3v8h-3z M10.5 10h3v8l-1.5 3l-1.5-3z M10.5 12.5l3 1.5 M10.5 15.5l3 1.5', ''],
    ['glue', 'Glue', 'M7 11a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z M10 9l1-3h2l1 3 M12 6V3', 'adhesive'],
    ['finish', 'Finish', 'M3 21v-4a4 4 0 1 1 4 4h-4 M21 3a16 16 0 0 0 -12.8 10.2 M21 3a16 16 0 0 1 -10.2 12.8 M10.6 9a9 9 0 0 1 4.4 4.4', 'brush paint oil T'],
    ['spray', 'Spray', 'M4 10m0 2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v7a2 2 0 0 1 -2 2h-4a2 2 0 0 1 -2 -2z M6 10v-4a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v4 M15 7h.01 M18 9h.01 M18 5h.01 M21 3h.01 M21 7h.01 M21 11h.01 M10 7h1', 'aerosol T'],
    ['tape', 'Tape', circ(11, 11, 8) + ' ' + circ(11, 11, 3.5) + ' M19 11v10l-2-1l-2 1v-2.5', 'roll'],
    ['hardware', 'Hardware', 'M12 3l8 4.5l0 9l-8 4.5l-8 -4.5l0 -9l8 -4.5 M12 12l8 -4.5 M12 12l0 9 M12 12l-8 -4.5 M16 5.25l-8 4.5', 'package parts T'],
  ],
  'Kits': [
    ['kit', 'Kit', 'M3 10h18v10H3z M3 10l2-3h14l2 3 M9 7V4h6v3 M3 14h18 M11 13h2v2h-2z', 'toolbox case set'],
  ],
};

export const ICONS = {};
export const ICON_GROUPS = Object.keys(ROWS).map((group) => ({
  group,
  keys: ROWS[group].map(([key, name, d, words, rot]) => {
    ICONS[key] = { key, name, d, words: `${name} ${words || ''}`.toLowerCase(), rot: rot || 0 };
    return key;
  }),
}));

export function searchIcons(q) {
  const t = String(q).trim().toLowerCase().split(/\s+/).filter(Boolean);
  return Object.values(ICONS).filter((i) => t.every((w) => i.words.includes(w) || i.key.includes(w)));
}
