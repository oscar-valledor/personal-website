# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project

Personal website for Oscar Valledor — [oscarvalledor.com](https://oscarvalledor.com). Static site built with HTML, CSS, and vanilla JavaScript. Hosted on GitHub Pages.

## Local development

Must use a local server — `file://` blocks `fetch()` for JSON data files.

```
python3 -m http.server 8081
```

## Architecture

### Layout

Single-page app with an overlay view system. One `index.html` with a `.page` container structured as three vertical sections (top, nav, bottom) using flexbox `space-between`. Desktop is viewport-locked (`overflow: hidden`); mobile scrolls.

### View system

All views are overlays toggled via `page.dataset.view = 'name'`. CSS selectors like `[data-view="books"] #books-view` control visibility through opacity transitions. `openView(name)` toggles (closes if already active). Every overlay shares the `.overlay-view` class; `.view-close` handles all close buttons.

Views: Now, Work, About, Essays, Thoughts, Books, Music, Links, Contact, Colophon (© click), Shortcuts (`?`), Moon (`M`), Konami (secret).

### Data loading

Views backed by JSON files (`books.json`, `projects.json`, `essays.json`, `music.json`, `thoughts.json`) are fetched lazily on first open and cached in memory. Render functions build DOM imperatively — no templating library. Links and Contact views are hardcoded in HTML. `quotes.json` and `links.json` exist as data files but are not currently rendered by the frontend.

### Keyboard shortcuts

1=Now, 2=Work, 3=About, 4=Essays, 5=Thoughts, 6=Books, 7=Music, 8=Links, 9=Contact, M=Moon, ?=Shortcuts, Esc=Close.

### Navigation

Vertical Table of Contents (01–09) as page centrepiece. CSS counters for numbering. Hover shifts right (`translateX(4px)`) and brightens counter number.

### Essays

Individual HTML pages in `essays/`. `essay.css` overrides `overflow` for scrollable pages. `essays.json` supports `slug`, `author`, `source`, `readingTime` fields. Each essay has a `← Essays` back link pointing to `../?view=essays`. The `?view=` URL param auto-opens the corresponding view on load.

### present.js

Live clock (HH:MM:SS ticking every second), geolocation with reverse geocode, moon phase calculation. Weather API is disabled (commented out). Moon text hidden in footer via CSS (`display: none`) — accessible only through the M shortcut.

### Sync scripts

- **Quotes**: `sync-quotes.js` scrapes Brain Food newsletter for "Tiny Thoughts". GitHub Actions cron (Mondays 9:00 UTC). Data saved to `quotes.json` but not currently displayed in the frontend.
- **Books**: `sync-books.js` syncs from Goodreads. GitHub Actions cron (daily 8:00 UTC).
- **Thoughts**: `sync-thoughts.py` reads Apple Notes DB. `sync-thoughts-auto.sh` wraps it with debounce + git commit/push. LaunchAgent watches Notes DB. The auto-sync script must live at `~/.local/bin/` — not in iCloud Drive (macOS blocks `launchd` execution from iCloud paths).

### Easter eggs

- Konami code (↑↑↓↓←→←→BA) opens hidden view
- Type `hola` anywhere on page — "hola." flashes centre screen
- Tab goes inactive — title becomes live HH:MM:SS clock
- Moon view via M key

## Design system

Achromatic, serif, text-driven. See the full token reference in the brand guidelines memory file. Key rules:

- Black and white only. Dark mode inverts via `prefers-color-scheme: dark`
- `Times New Roman` at `0.9rem`, line-height `1.4`
- Hierarchy through opacity (`1` / `0.4` / `0.3`), never color or size
- No shadows, no border-radius, no gradients, no icons, no emoji
- Emphasis via italics, never bold
- Transitions 250–500ms ease, staggered list entrances at 50ms per item
- Flexbox only (no grid), fluid spacing with `5vw` padding
- Links underlined with `border-bottom: 1px solid`, hover dims to `0.35` opacity
- Single breakpoint at `600px`
- Max content width `560px` (essays, about)
- View footers use short poetic labels ("The garden.", "Long form.", "Worth listening to.")

## Files

```
index.html          — Single-page app, all views and inline JS
style.css           — All styles, dark mode, mobile breakpoint
essay.css           — Overrides for scrollable essay pages
present.js          — Clock, geolocation, moon phase
essays/             — Individual essay HTML pages
*.json              — Data files (books, projects, essays, music, thoughts, quotes, links)
sync-quotes.js      — Brain Food quote scraper (Node)
sync-books.js       — Goodreads sync (Node)
sync-thoughts.py    — Apple Notes sync (Python)
sync-thoughts-auto.sh — Debounced auto-sync wrapper
.github/workflows/  — GitHub Actions for quotes and books sync
sitemap.xml         — Includes root + essay pages
robots.txt          — Standard
404.html            — Custom 404 page
```

## Security

- `.gitignore` blocks `.DS_Store`, `.env`, `.env.*`, `node_modules/`, `*.log`
- CSP meta tag restricts scripts, frames, and connections
- Email obfuscated via JS (two-part concatenation, not in HTML source)

## Images

Compress with `pngquant` + `optipng` for PNGs, `svgo` for SVGs (all installed via Homebrew).
