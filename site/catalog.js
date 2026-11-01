// The tool catalog (BX-R101 to BX-R109). Written by hand for this app: names, plus our own short wording.
// Nothing here is copied from a maker's site, catalogue, PDF or feed. No part numbers, specs, prices or links.
// Product names belong to their owners and are used only to identify the tools.
export const CATALOG_DATE = '2026-11-01';

// name, kind, contents line 1, contents line 2, icon, tier
const FESTOOL = [
  ['TS 55 F', 'Track saw', 'Plunge saw · blade', 'Splinter guard', 'track-saw', 'power'],
  ['TS 60 K', 'Track saw', 'Plunge saw · kickback stop', 'Blade · splinter guard', 'track-saw', 'power'],
  ['TSC 55 K', 'Cordless track saw', 'Plunge saw · kickback stop', 'Blade · splinter guard', 'track-saw', 'power'],
  ['HK 55', 'Carpentry saw', 'Circular saw · blade', 'Rip fence', 'circular-saw', 'power'],
  ['HKC 55 K', 'Cordless carpentry saw', 'Circular saw · blade', 'Rip fence', 'circular-saw', 'power'],
  ['CSC SYS 50', 'Cordless table saw', 'Table saw · blade', 'Rip fence · sliding table', 'table-saw', 'power'],
  ['CARVEX PS 420', 'Jigsaw', 'Jigsaw · blades', 'Splinter guard', 'jigsaw', 'power'],
  ['CARVEX PSC 420', 'Cordless jigsaw', 'Jigsaw · blades', 'Splinter guard', 'jigsaw', 'power'],
  ['RSC 18', 'Reciprocating saw', 'Saw · blades', '', 'recip-saw', 'power'],
  ['VECTURO OSC 18', 'Oscillating multi-tool', 'Multi-tool · blades', 'Depth stop', 'multi-tool', 'power'],
  ['OF 1010', 'Router', 'Router · edge guide', 'Collets', 'router', 'power'],
  ['OF 1400', 'Router', 'Router · edge guide', 'Collets', 'router', 'power'],
  ['OF 2200', 'Router', 'Router · base plates', 'Collets', 'router', 'power'],
  ['OFK 700', 'Edge router', 'Edge router · bit', '', 'router', 'power'],
  ['MFK 700', 'Modular trim router', 'Trim router · bases', '', 'router', 'power'],
  ['DOMINO DF 500', 'Joiner', 'Domino · cutter', 'Trim stops', 'joiner', 'power'],
  ['DOMINO DF 700', 'Joiner XL', 'Domino XL · cutter', 'Trim stops', 'joiner', 'power'],
  ['HL 850', 'Planer', 'Planer · blade', 'Edge guide', 'planer', 'power'],
  ['ETS EC 150/3', 'Random orbital sander', 'Sander · pad', '3 mm stroke', 'sander', 'power'],
  ['ETS EC 150/5', 'Random orbital sander', 'Sander · pad', '5 mm stroke', 'sander', 'power'],
  ['ETS EC 125/3', 'Random orbital sander', 'Sander · pad', '3 mm stroke', 'sander', 'power'],
  ['ETS 150/3', 'Random orbital sander', 'Sander · pad', '3 mm stroke', 'sander', 'power'],
  ['ETS 150/5', 'Random orbital sander', 'Sander · pad', '5 mm stroke', 'sander', 'power'],
  ['ETS 125', 'Random orbital sander', 'Sander · pad', '', 'sander', 'power'],
  ['ETSC 125', 'Cordless sander', 'Sander · pad', '', 'sander', 'power'],
  ['ROTEX RO 90', 'Gear-driven sander', 'Sander · round pad', 'Delta pad', 'sander', 'power'],
  ['ROTEX RO 125', 'Gear-driven sander', 'Sander · pad', 'Protector', 'sander', 'power'],
  ['ROTEX RO 150', 'Gear-driven sander', 'Sander · pad', 'Protector', 'sander', 'power'],
  ['RTS 400', 'Orbital sander', 'Sander · rectangular pad', '', 'sander', 'power'],
  ['DTS 400', 'Delta sander', 'Sander · delta pad', '', 'sander', 'power'],
  ['LS 130', 'Linear sander', 'Sander · profile pads', '', 'sander', 'power'],
  ['T 18+3', 'Drill / driver', 'Drill · chucks', 'Bit holder', 'drill', 'power'],
  ['TXS 18', 'Compact drill / driver', 'Drill · chuck', 'Bit holder', 'drill', 'power'],
  ['CXS 18', 'Compact drill / driver', 'Drill · chucks', 'Bit holder', 'drill', 'power'],
  ['C 18', 'Drill / driver', 'Drill · chucks', 'Bit holder', 'drill', 'power'],
  ['TPC 18/4', 'Hammer drill / driver', 'Hammer drill · chucks', 'Side handle', 'drill', 'power'],
  ['TID 18', 'Impact driver', 'Impact driver · bits', '', 'impact-driver', 'power'],
  ['CTC SYS', 'Cordless extractor', 'Extractor · hose', 'Filter', 'extractor', 'power'],
  ['SYSLITE', 'Work light', 'Light · stand', '', 'light', 'power'],
  ['SYSROCK', 'Jobsite radio', 'Bluetooth radio', '', 'radio', 'power'],
  ['DOMINO TENONS', 'Joinery', 'Beech tenons', '4 – 10 mm', 'tenon', 'consumable'],
  ['GRANAT 150', 'Abrasives', 'Discs 150 mm', 'P80 – P400', 'abrasive', 'consumable'],
  ['GRANAT 125', 'Abrasives', 'Discs 125 mm', 'P80 – P400', 'abrasive', 'consumable'],
];

const MILWAUKEE = [
  ['M18 FUEL DRILL', 'Drill / driver', 'Drill · side handle', 'Battery · charger', 'drill', 'power'],
  ['M18 FUEL HAMMER', 'Hammer drill / driver', 'Hammer drill · side handle', 'Battery · charger', 'hammer-drill', 'power'],
  ['M18 FUEL IMPACT', 'Impact driver', 'Impact driver · bits', 'Battery · charger', 'impact-driver', 'power'],
  ['M18 FUEL WRENCH', 'Impact wrench', 'Impact wrench · sockets', 'Battery · charger', 'impact-wrench', 'power'],
  ['M18 FUEL ROTARY', 'Rotary hammer', 'SDS hammer · side handle', 'Depth stop', 'hammer-drill', 'power'],
  ['M18 FUEL CIRC SAW', 'Circular saw', 'Circular saw · blade', 'Rip fence', 'circular-saw', 'power'],
  ['M18 FUEL TRACK SAW', 'Track saw', 'Plunge saw · blade', 'Splinter guard', 'track-saw', 'power'],
  ['M18 FUEL MITER SAW', 'Miter saw', 'Miter saw · blade', 'Dust bag', 'miter-saw', 'power'],
  ['M18 FUEL TABLE SAW', 'Table saw', 'Table saw · blade', 'Rip fence', 'table-saw', 'power'],
  ['M18 FUEL JIGSAW', 'Jigsaw', 'Jigsaw · blades', '', 'jigsaw', 'power'],
  ['M18 FUEL SAWZALL', 'Reciprocating saw', 'Saw · blades', '', 'recip-saw', 'power'],
  ['M18 FUEL HACKZALL', 'One-handed recip saw', 'Saw · blades', '', 'recip-saw', 'power'],
  ['M18 FUEL MULTI-TOOL', 'Oscillating multi-tool', 'Multi-tool · blades', 'Depth stop', 'multi-tool', 'power'],
  ['M18 FUEL GRINDER', 'Angle grinder', 'Grinder · guard', 'Side handle', 'grinder', 'power'],
  ['M18 FUEL ROUTER', 'Compact router', 'Router · edge guide', 'Collets', 'router', 'power'],
  ['M18 FUEL SANDER', 'Random orbital sander', 'Sander · pad', 'Dust bag', 'sander', 'power'],
  ['M18 FUEL BRAD NAILER', 'Brad nailer', 'Nailer · nose tips', '', 'nailer', 'power'],
  ['M18 FUEL FINISH NAIL', 'Finish nailer', 'Nailer · nose tips', '', 'nailer', 'power'],
  ['M18 FUEL FRAMING', 'Framing nailer', 'Nailer · nose tips', '', 'nailer', 'power'],
  ['M18 HEAT GUN', 'Heat gun', 'Heat gun · nozzles', '', 'heat-gun', 'power'],
  ['M18 FUEL VAC', 'Wet / dry vacuum', 'Vacuum · hose', 'Filter', 'extractor', 'power'],
  ['M18 FLOOD LIGHT', 'Work light', 'Flood light', '', 'light', 'power'],
  ['M12 FUEL DRILL', 'Compact drill / driver', 'Drill · chuck', 'Battery · charger', 'drill', 'power'],
  ['M12 FUEL INSTALL', 'Installation drill / driver', 'Drill · heads', 'Bit holder', 'drill', 'power'],
  ['M12 FUEL IMPACT', 'Compact impact driver', 'Impact driver · bits', 'Battery · charger', 'impact-driver', 'power'],
  ['M12 FUEL STUBBY', 'Compact impact wrench', 'Impact wrench · sockets', '', 'impact-wrench', 'power'],
  ['M12 FUEL RATCHET', 'Cordless ratchet', 'Ratchet · sockets', '', 'ratchet', 'power'],
  ['M12 FUEL HACKZALL', 'One-handed recip saw', 'Saw · blades', '', 'recip-saw', 'power'],
  ['M12 FUEL CUT OFF', 'Cut-off tool', 'Cut-off tool · wheels', '', 'grinder', 'power'],
  ['M12 PIN NAILER', 'Pin nailer', 'Nailer · nose tips', '', 'nailer', 'power'],
  ['M12 BATTERIES', 'Batteries / chargers', 'M12 packs', 'Charger', 'battery', 'power'],
  ['M18 BATTERIES', 'Batteries / chargers', 'M18 packs', 'Charger', 'battery', 'power'],
  ['DRIVER BITS', 'Bits', 'Impact bits', 'Bit holders', 'bits', 'consumable'],
  ['SAWZALL BLADES', 'Saw blades', 'Wood · metal', 'Demolition', 'saw-blade', 'consumable'],
];

const build = (brand, rows) => rows.map(([name, kind, c1, c2, icon, tier]) => ({ brand, name, kind, c1, c2, icon, tier }));
export const CATALOG = [...build('Festool', FESTOOL), ...build('Milwaukee', MILWAUKEE)];

export function searchCatalog(q, list = CATALOG) {
  const words = String(q).trim().toLowerCase().split(/\s+/).filter(Boolean);
  return list.filter((c) => { const t = `${c.brand} ${c.name} ${c.kind}`.toLowerCase(); return words.every((w) => t.includes(w)); });
}
