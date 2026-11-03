# Changelog

What changed in each version of [Box Ctrl](https://woodwerd.github.io/box-ctrl/), newest first. Versions are x-numbers while Box Ctrl is a public beta.

## x0.1.6 · 2026-11-03
- QR codes on labels. Each label with a box ID gets a small code that opens that box in [Tool Ctrl](https://woodwerd.github.io/tool-ctrl/). The code holds only the link, nothing else.
- On a card the code sits at the left of the white footer. On a long strip it leads the label on its own white square. A label too small for a code that scans leaves it off and says so.
- A QR codes switch under the preview turns codes off for the whole list. It's saved with the list, the backup and GitHub sync.
- The box ID prints larger and bolder (9 pt), and the owner line larger (6.5 pt), both in black for a cleaner print.
- QR codes are made in the browser by qrcode-generator (MIT), bundled with the app.

## x0.1.5 · 2026-11-02
- 44 new icons, 96 in all. Catalog tools now use icons of their own.
- Icon and catalog search match word stems, so "sanders" finds every sander icon and "oscillator" finds the multi-tool.
- 43 new Milwaukee entries and 5 new Festool entries in the catalog.

## x0.1.4 · 2026-11-02
- A step-by-step Set up GitHub page for people new to GitHub, linked from the guide and the Connect panel.
- After an update, the new version shows right away instead of after GitHub Pages' ten-minute cache.

## x0.1.3 · 2026-11-02
- The Systainer standard card is now one size, 80 × 52 mm, for both the sticker and the paper card. Still 3 per Liene sheet, 9 on Letter and 10 on A4.

## x0.1.2 · 2026-11-02
- Optional GitHub storage. Connect your own private repo and the list syncs between devices, with a history of every change. Nothing leaves your computer unless you connect.
- Get boxes from Tool Ctrl reads your Tool Ctrl record from the same repo and shows what's new and changed before anything changes.

## x0.1.1 · 2026-11-02
- 75 Festool tools added to the catalog: older tools still in use, Europe-only tools, rails, batteries and lights.

## x0.1.0 · 2026-11-01
- Public beta at woodwerd.github.io/box-ctrl.

## Before the public beta · x0.0.1 to x0.0.13 · 2026-11-01
- Labels sized to the box you own, from box profiles or a custom size, with a logo, an icon library and a catalog of standard tools by maker.
- Printing on the Liene PixCut S1 or plain office paper, and a guided tutorial on a sample list.
- ID prefix and Start numbering at, with Change all and Undo.
- Spreadsheet export that keeps your own columns, and a backup file.
- Untested starting sizes for DEWALT TSTAK and Milwaukee PACKOUT.
- Default groups by maker with brand-style colour pairs, and an owner line of up to three lines.
- The printer and independence notices, which can be hidden on a device once read.
