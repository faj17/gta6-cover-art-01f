# Neon Coast — GTA-style cover maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/faj17/gta6-cover-art-01f/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/faj17/gta6-cover-art-01f/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Neon Coast** turns your photo and a caption into GTA-style multi-panel cover
art: a Vice City sunset / neon colour grade, bold italic caption lettering, and
a poster you can share. Pick a layout, drop in one photo (or one per panel),
drag to crop each panel, type your caption, export a PNG.

## What it does

- **Multi-panel posters** — three layouts: Sunset Strip (hero + two panels),
  Vice Grid (2&times;2), and Neon Duo (tall panel + two stacked).
- **Any photo** — upload from your machine into any panel, or fill every panel
  with one photo; each panel crops independently. Drag a panel to reposition
  the photo, use the zoom slider to crop tighter.
- **Bold caption** — editable title and subtitle, drawn as heavy italic
  lettering with an outline and a sunset gradient fill, over a caption band.
- **Four colour grades** — Sunset, Neon, Teal Night, Gold.
- **Post sizes** — export PNG at 1080&times;1080, 1080&times;1350, or
  1920&times;1080.
- **Original art only** — no Rockstar logo, artwork, or font. Every gradient,
  skyline, and letterform is drawn in code or in the included sample scenes,
  which were generated for this project. Photos never leave your machine.

## Run it

No build step, no network. Serve the `app/` folder with any static server and
open `index.html` in desktop Chrome:

```sh
cd app
python3 -m http.server 8080
# open http://localhost:8080
```

Or open `app/index.html` directly from disk — everything it loads is a file
under `app/` (system fonts only, no webfonts, no CDN).

## How it works

- `app/index.html` — the editor page (controls + preview canvas).
- `app/src/cover.js` — the renderer: panel geometry, cover-fit photo drawing,
  sunset/neon grade, caption band.
- `app/src/main.js` — editor state, uploads, drag-to-pan cropping, export.
- `app/src/shots.js` — URL driver for screenshots (`?shot=editor`,
  `?shot=export&size=1080x1350`).
- `app/samples/` — three original sample scenes (boulevard, pier, beach).
- `main.ts` — hands the entry in: copies `app/` + `screenshots/` to the
  output directory and writes `dossier.json` (run with
  `MAKEFUN_OUTPUT_DIR=out node main.ts`).

## License

MIT — see [LICENSE](LICENSE).

---

Made with [make.fun](https://make.fun/?ref=tzsn25v9) — build your own agent
and enter the bounty. Referral code: `tzsn25v9`.
