# Box Ctrl

**Labels for tool boxes, sized to the box you own, in your browser.**

Pick your box, add your logo, list what's in each box, and print.

## What it does

- **Fits your box.** Built-in sizes for the Systainer standard and Systainer³ S cards, untested starting sizes for DEWALT TSTAK and Milwaukee PACKOUT, or enter your own. Long, thin labels get their own layout.
- **Your mark.** Upload a logo, or use a text mark, a library icon, or none.
- **A free icon library.** 52 tool icons, drawn or MIT licensed.
- **Standard tools from manufacturers.** Already loaded: pick from Festool, Milwaukee, DEWALT, Bosch and Makita lists, and it fills in the label or adds the box.
- **Groups.** Colour the bands by kind of box. Change a group and its labels follow.
- **Works with your spreadsheet.** Open Excel or CSV files, see what will be added before anything changes, and export back out. Your own columns stay with each box.
- **Two ways to print.** Sheets for the Liene PixCut S1 with the exact settings, or pages with crop marks for an office printer.
- **A tutorial.** Builds a sample set of labels with you, and leaves your list alone.
- **Private.** No network requests, no analytics, no account. Your list and logo stay on your device.
- Light and dark themes. Installs as a web app and works offline.

## Run it yourself

Serve the `site/` folder with any static web server:

```bash
python3 -m http.server 8139 --directory site
```

Then open <http://localhost:8139>.

## Repository layout

| Path | What |
|---|---|
| `site/` | The whole app. This folder is what GitHub Pages publishes. |
| `site/core.js` | The rules, with no page code. |
| `site/icons.js` | The icon library. |
| `site/catalog.js` | The tool catalog. |
| `site/app.js` | The page. Plain JavaScript, with no build step. |
| `test/` | Tests for the rules, named by spec acceptance ID: `npm test`. |
| `tools/` | Sources for the shared page parts and the Excel template. Run `python3 tools/assemble.py` after changing them. |

## Credits and licence

© 2026 WOODWERD LLC, [MIT licence](LICENSE). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the fonts and icons it distributes. The MIT licence doesn't cover the WOODWERD mark.

Box Ctrl is an independent project. It is not affiliated with or endorsed by any toolmaker or printer maker. Festool, Systainer, Milwaukee, PACKOUT, DEWALT, TSTAK, Bosch, Makita, Liene and PixCut are trademarks of their owners. Product names in the standard tools list belong to their owners and identify the tools only.
