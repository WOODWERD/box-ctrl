#!/usr/bin/env python3
"""Writes site/box-ctrl-template.xlsx (BX-R96). Run from the repo root when the template changes."""
import zipfile
from xml.sax.saxutils import escape

ROWS = [
    ["ID", "Name", "Kind", "Contents", "Group", "Icon", "Quantity"],
    ["BOX-001", "TRIM ROUTER", "Router", "Router · edge guide|Collets", "Power tools", "router", 1],
    ["BOX-002", "DRIVER SET", "Screwdrivers", "Slotted · Phillips|Bit holder", "Hand tools", "screwdriver", 1],
    ["BOX-003", "SANDING DISCS", "Abrasives", "Discs 150 mm|P80 – P400", "Consumables", "abrasive", 1],
]


def cell(col, row, value):
    ref = f"{'ABCDEFG'[col]}{row}"
    if isinstance(value, int):
        return f'<c r="{ref}"><v>{value}</v></c>'
    return f'<c r="{ref}" t="inlineStr"><is><t>{escape(value)}</t></is></c>'


sheet = "".join(
    f'<row r="{r}">' + "".join(cell(c, r, v) for c, v in enumerate(row)) + "</row>"
    for r, row in enumerate(ROWS, 1)
)
HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
FILES = {
    "[Content_Types].xml": HEAD + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    "_rels/.rels": HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    "xl/workbook.xml": HEAD + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Boxes" sheetId="1" r:id="rId1"/></sheets></workbook>',
    "xl/_rels/workbook.xml.rels": HEAD + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    "xl/worksheets/sheet1.xml": HEAD + f'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="12" customWidth="1"/><col min="2" max="5" width="26" customWidth="1"/></cols><sheetData>{sheet}</sheetData></worksheet>',
}

with zipfile.ZipFile("site/box-ctrl-template.xlsx", "w", zipfile.ZIP_DEFLATED) as z:
    for name, text in FILES.items():
        z.writestr(name, text)
print("wrote site/box-ctrl-template.xlsx")
