# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project overview

Personal website for Oscar Valledor — [oscarvalledor.com](https://oscarvalledor.com).
Static site built with HTML, CSS, and vanilla JavaScript. Hosted on GitHub Pages.
Domain: `oscarvalledor.com` (configured via `CNAME`).
Analytics: Google Analytics (`G-Q5J88H59YB`).

The philosophy behind this site mirrors its content: simplicity, intentionality, and the removal of excess. Every decision — from the achromatic palette to the lack of a build step — is deliberate. Respect that.

---

## ⚠️ Mandatory workflow rules

These two rules apply to **every session**. Follow them without being asked.

### 1. Keep CLAUDE.md up to date

After any meaningful change to the project (new view, new file, changed architecture, new pattern, updated design tokens, new sync script, changed file structure, etc.), **update this CLAUDE.md file** to reflect the change before finishing the task. This includes:

- Adding new files to the file map
- Documenting new views in the view table
- Updating the "How to add" recipes if the pattern changed
- Recording new design tokens or CSS rules
- Noting new dependencies, APIs, or external resources
- Updating the architecture section if the structure evolved

CLAUDE.md is the single source of truth for how this project works. If it's out of date, future sessions will make mistakes. Treat it as part of the deliverable, not an afterthought.

### 2. Commit and push after meaningful progress

After completing any meaningful unit of work (a new feature, a bug fix, a content addition, a refactor, etc.), **remind the user to commit and push** — or do it directly if instructed to. Use descriptive commit messages:

```bash
git add -A
git commit -m "descriptive message about what changed"
git push
```

Don't let work accumulate uncommitted. The site deploys from `main` via GitHub Pages, so pushing = deploying.

---

## Local development

A local server is required — `file://` blocks `fetch()` for JSON data files.

```bash
cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/Developments/personal-website
python3 -m http.server 8081
```

Then open `http://localhost:8081`. There is no build step, no bundler, no framework. Edit → refresh → done.

---

## Architecture

### Core principle

Everything is a single-page app rendered from one `index.html`. No frameworks, no build tools, no dependencies in production. The only external runtime resources are Google Analytics and two APIs (OpenStreetMap Nominatim for reverse geocoding, Open-Meteo for weather — currently disabled).

### Page structure

The `.page` container uses flexbox `justify-content: space-between` to create three vertical zones:

```
┌──────────────────────────────┐
│  .top   — Name + tagline     │
│                              │
│  .site-nav — Vertical TOC    │  ← centrepiece of the page
│                              │
│  .bottom — © + present.js    │
└──────────────────────────────┘
```

Desktop is viewport-locked (`overflow: hidden` on `html, body` above 600px). Mobile scrolls naturally.

### View system

All views are overlays toggled through a single mechanism:

1. `page.dataset.view = 'name'` opens a view
2. CSS selectors `[data-view="X"] #X-view` set `opacity: 1` and `pointer-events: auto`
3. When a view is open, `.top`, `.bottom`, and `.site-nav` fade to `opacity: 0`
4. `.view-title` appears top-left showing the view name (clickable to close)
5. `delete page.dataset.view` closes the current view
6. All overlay views have `role="dialog"` and `aria-label` for accessibility

The `openView(name)` function acts as a toggle — calling it with the already-active view closes it. Views can be closed by clicking the view title (top-left), the "Close" link (bottom-right), or pressing Escape.

**All views:**

| View | Trigger | Data source | Notes |
|------|---------|-------------|-------|
| Now | Nav / key `1` | Hardcoded HTML | Has a tree illustration with grow animation |
| Work | Nav / key `2` | `projects.json` | Filters out `hidden: true` projects |
| About | Nav / key `3` | Hardcoded HTML | Max-width `50vw` on desktop |
| Essays | Nav / key `4` | `essays.json` | Links to standalone HTML pages in `essays/` |
| Thoughts | Nav / key `5` | `thoughts.json` | Numbered, separated by `<hr>` |
| Books | Nav / key `6` | `books.json` | Sections: "Currently reading" + read list |
| Music | Nav / key `7` | `music.json` | Sections: "Playlists" + "Albums" |
| Links | Nav / key `8` | Hardcoded HTML | — |
| Contact | Nav / key `9` | Hardcoded HTML | Email obfuscated via JS |
| Colophon | Click `©` | Hardcoded HTML | — |
| Shortcuts | Key `?` | Hardcoded HTML | — |
| Moon | Key `M` | Calculated | Moon phase algorithm |
| Konami | ↑↑↓↓←→←→BA | Hardcoded HTML | Easter egg |

### Data-driven views pattern

Views backed by JSON follow a consistent pattern:

```
1. Lazy fetch on first open (cached in a module-level variable)
2. Render function builds DOM imperatively (createElement, appendChild)
3. Content goes into the `.view-list` container inside the overlay
```

Functions: `loadX()` fetches + caches → `renderX(data)` builds DOM.

Existing data views: Books, Projects, Essays, Music, Thoughts.

### Staggered animations

When a view opens, `staggerView(name)` assigns `transitionDelay` of `i * 50ms` to each child of `.view-list`. When closing, delays are reset to ensure instant fade-out.

### URL param support

`?view=essays` (or any view name) auto-opens that view on page load. Used by essay back-links (`← Essays` links to `../?view=essays`).

---

## File map

```
index.html              — Single-page app: all views, all inline JS
style.css               — All styles: layout, views, dark mode, mobile
essay.css               — Override for essay pages (enables scrolling, sets essay layout)
present.js              — Live clock, geolocation, reverse geocode, moon phase

essays/                 — Individual essay HTML pages (standalone documents)
  └── cities-and-ambition.html

books.json              — Goodreads sync data (auto-updated daily)
projects.json           — Work/projects list (manual edits)
essays.json             — Essay index with slug, author, date, readingTime, source
music.json              — Playlists + albums with Spotify URLs
thoughts.json           — Short-form thoughts (auto-synced from Apple Notes)
links.json              — Bookmarked sites (exists as data, not yet rendered dynamically)

sync-books.js           — Goodreads RSS → books.json (Node.js, runs in GitHub Actions, decodes HTML entities)
sync-thoughts.py        — Apple Notes DB → thoughts.json (Python, local macOS)
sync-thoughts-auto.sh   — Debounced wrapper for sync-thoughts.py (LaunchAgent trigger)

.github/workflows/
  └── sync-books.yml    — Daily at 08:00 UTC

sitemap.xml             — Root + all essay pages
robots.txt              — Standard allow-all + sitemap reference
404.html                — Custom 404 page
CNAME                   — oscarvalledor.com
favicon.png / .svg      — Favicon
og-image.png / .svg     — Open Graph image
tree.png / .svg         — Illustration used in Now view
```

---

## Design system

**This project has its own design system that overrides the global brand guidelines.** Do not apply the global `~/.claude/rules/brand-guidelines.md` here — follow the rules below instead.

Canonical spec maintained in `brand-guidelines/achromatic-serif/guidelines.md`.

### Philosophy

Achromatic. Serif. Text-driven. The design communicates through restraint — what's removed matters more than what's added. Think of it as typography + whitespace + opacity. Nothing else.

### Colour

| Token | Light mode | Dark mode |
|-------|-----------|-----------|
| Background | `#ffffff` | `#000000` |
| Text | `#000000` | `#ffffff` |
| Links | Same as text | Same as text |

That's it. No greys, no accent colours, no gradients. Dark mode is a pure CSS inversion via `@media (prefers-color-scheme: dark)`.

### Typography

| Property | Value |
|----------|-------|
| Font family | `'Times New Roman', Times, serif` |
| Base font size | `0.9rem` |
| Line height | `1.4` (body), `1.6` (essays) |
| Letter spacing | `0.01em` |
| Rendering | `-webkit-font-smoothing: antialiased` |

**Emphasis rules:**
- Use *italics* for emphasis. Never bold.
- Section labels (`.view-label`) are plain text, no special weight.
- View titles appear top-left during overlay, plain text.

### Hierarchy through opacity

This is the main visual hierarchy tool. Size and colour don't change.

| Level | Opacity | Usage |
|-------|---------|-------|
| Primary | `1` | Main text, links, titles |
| Secondary | `0.55` | `.view-meta` — descriptions, dates, subtitles |
| Tertiary | `0.4` | Nav counters (`::before`), thought numbers, separators |

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| Page padding | `5vw` | All sides, all pages |
| Nav gap | `0.6rem` | Between nav items (mobile: `0.5rem`) |
| View list gap | `0.75rem` | Between items in any `.view-list` |
| Thought/About gap | `1rem` | Thoughts and About view use wider spacing |
| Section label margin | `0.25rem` bottom, `1rem` top (between sections) |
| Footer nav gap | `2rem` | Between footer links |

### Links

```css
a {
  color: inherit;
  text-decoration: none;
  border-bottom: 1px solid;    /* underline via border */
  padding-bottom: 1px;
  transition: opacity 250ms ease;
}
a:hover { opacity: 0.35; }
```

Exception: `.copyright`, `.site-nav a`, and `.view-title` have no `border-bottom`.

All interactive elements have `:focus-visible` styles for keyboard accessibility. Links get `outline: 1px solid; outline-offset: 2px`. Nav items get the same shift + opacity as hover.

### Transitions & animations

| What | Duration | Easing | Notes |
|------|----------|--------|-------|
| Page fade-in | `400ms` | ease | `.page.is-ready` |
| View overlay | `500ms` | ease | Opacity transition |
| Link hover | `250ms` | ease | Opacity change |
| Nav hover | `250ms` | ease | `translateX(4px)` + opacity |
| List item stagger | `400ms` | ease | `50ms` delay per item |
| Present bar | `400ms` | ease | `#present.is-ready` |
| Tree reveal | `2.5s` | ease-out | `clip-path` bottom-to-top |
| Tree breathe | `9s` | linear | Scale + translateY loop |
| Hello flash | `600ms` | ease | Fade in/out |

### Navigation (Table of Contents)

The site nav is a vertical list with CSS counters (`counter-reset: toc` / `counter-increment: toc`). Numbers are `decimal-leading-zero` (01, 02, ...). Counter opacity is `0.4`, brightens to `0.65` on hover. Items shift right `4px` on hover.

### View footers

Every view has a `.view-footer` with a short poetic label on the left and a "Close" link on the right:

| View | Footer label |
|------|-------------|
| Now | "Last updated {month year}" |
| Work | "The garden." |
| Essays | "Long form." |
| Thoughts | "Short form." |
| Books | Count of books read |
| Music | "Worth listening to." |
| Links | "Worth bookmarking." |
| Contact | "Get in touch." |

### Responsive design

Single breakpoint: `600px`.

**Desktop (> 600px):** Viewport-locked, `overflow: hidden`, full flexbox layout. View lists have `overflow-y: auto` for internal scrolling when content exceeds viewport.
**Mobile (≤ 600px):** Scrolls naturally. Bottom section stacks vertically. Nav items have padding for touch targets. Present bar wraps. About view goes full-width. View footer stacks. Now tree becomes 100% width.

### What NOT to use

Never: shadows, border-radius, gradients, icons, emoji, images (except tree.png and og-image), bold text, colour, grid layout, CSS variables, external fonts, component libraries.

---

## How to add new content

### Add a new JSON-driven view

1. **Create the data file** — e.g. `photos.json`:
   ```json
   { "photos": [{ "title": "...", "url": "...", "date": "..." }] }
   ```

2. **Add the overlay HTML** in `index.html` (inside `.page`, after existing views):
   ```html
   <div id="photos-view" class="overlay-view">
     <div class="view-list"></div>
     <div class="view-footer">
       <span>Footer label.</span>
       <nav><a href="#" class="view-close">Close</a></nav>
     </div>
   </div>
   ```

3. **Add the CSS visibility rule** in `style.css`:
   ```css
   [data-view="photos"] #photos-view {
     opacity: 1;
     pointer-events: auto;
   }
   ```

4. **Add the nav link** in `index.html` (inside `.site-nav`):
   ```html
   <a href="#" data-view="photos">Photos</a>
   ```

5. **Register in the view title map** (in `<script>` inside `index.html`):
   ```js
   const viewTitleMap = {
     // ... existing entries
     photos: 'Photos',
   };
   ```

6. **Add load + render functions** following the existing pattern:
   ```js
   let photosData = null;

   async function loadPhotos() {
     if (photosData) return photosData;
     const res = await fetch('photos.json');
     photosData = await res.json();
     return photosData;
   }

   function renderPhotos(data) {
     const list = document.querySelector('#photos-view .view-list');
     list.innerHTML = '';
     for (const photo of data.photos) {
       const p = document.createElement('p');
       // ... build DOM
       list.appendChild(p);
     }
   }
   ```

7. **Register in `loadView()`**:
   ```js
   async function loadView(name) {
     // ... existing cases
     else if (name === 'photos') renderPhotos(await loadPhotos());
   }
   ```

8. **Update keyboard shortcuts** if a number key is available (update both JS `shortcuts` object and the shortcuts view HTML).

9. **Update `sitemap.xml`** if the view has a URL param entry worth indexing.

### Add a new essay

1. **Create the HTML file** in `essays/your-slug.html`. Copy the structure from an existing essay. Key elements:
   - `<title>` format: `Essay Title — Oscar Valledor`
   - Links to `../style.css` and `../essay.css` (relative paths)
   - CSP meta tag (copy from existing)
   - Google Analytics snippet (copy from existing)
   - `.top` with site link and `← Essays` back-link to `../?view=essays`
   - `.essay-header` with `.essay-title` (italic) and `.view-meta` (date/author)
   - `.essay-body` with `<p>` tags
   - `.view-footer` (optional: link to original source)

2. **Add entry to `essays.json`**:
   ```json
   {
     "title": "Essay Title",
     "slug": "your-slug",
     "date": "2026-03-01",
     "author": "Author Name",        // omit if original
     "readingTime": "10 min",         // optional
     "source": "https://..."          // optional, for curated essays
   }
   ```

3. **Add to `sitemap.xml`**:
   ```xml
   <url>
     <loc>https://oscarvalledor.com/essays/your-slug.html</loc>
     <changefreq>yearly</changefreq>
     <priority>0.8</priority>
   </url>
   ```

### Add a new thought

Thoughts are synced automatically from Apple Notes. Edit the note titled **"Thoughts - Personal Website"** in Apple Notes. Each paragraph (separated by blank lines) becomes a thought. The sync runs automatically via LaunchAgent when the Notes DB changes, or manually:

```bash
python3 sync-thoughts.py
```

### Add a project

Edit `projects.json`. Fields:

```json
{
  "title": "Project Name",
  "status": "short status text",        // e.g. "founder — acquired by X"
  "description": "",                    // optional longer description
  "url": "https://...",                 // optional link
  "stage": "tree",                      // not currently used in rendering
  "hidden": false                       // set true to hide from Work view
}
```

### Add music

Edit `music.json`. Two arrays: `playlists` (title + url) and `albums` (title + artist + url). All URLs should be Spotify links.

### Add a link

The Links view is currently **hardcoded in HTML** inside `index.html`. `links.json` exists as a data file but is not yet dynamically rendered. To add a link, edit the HTML directly in the `#links-view` section. If you want to make it data-driven, follow the JSON-driven view pattern.

---

## Sync systems

### Books (automated, GitHub Actions)

`sync-books.js` fetches from Goodreads RSS using a user ID (`152827522`). Runs daily at 08:00 UTC via `.github/workflows/sync-books.yml`. Output: `books.json`.

### Thoughts (automated, local macOS)

`sync-thoughts.py` reads the Apple Notes SQLite database for a note titled "Thoughts - Personal Website". `sync-thoughts-auto.sh` wraps it with a 5-minute debounce and auto-commits/pushes. Triggered by a LaunchAgent watching the Notes DB.

**Important:** The auto-sync script must live at `~/.local/bin/sync-thoughts-auto.sh` — not in iCloud Drive. macOS blocks `launchd` execution from iCloud paths.

---

## Easter eggs

| Egg | Trigger | Effect |
|-----|---------|--------|
| Konami | ↑↑↓↓←→←→BA | Opens hidden view with a message |
| Hola | Type "hola" anywhere | "hola." flashes centre screen |
| Tab clock | Switch to another tab | Browser tab title becomes live HH:MM:SS |
| Moon | Press M | Shows current moon phase + details |

---

## Security

- CSP meta tag restricts scripts, styles, images, connections, and frames
- Email is obfuscated via two-part JS concatenation (never appears in HTML source)
- `.gitignore` blocks `.DS_Store`, `.env`, `.env.*`, `node_modules/`, `*.log`

When adding new external resources (APIs, CDNs), update the CSP `content` attribute in both `index.html` and any essay HTML files.

---

## Images

Compress before committing:

```bash
# PNGs
pngquant --quality=65-80 --strip --force --output file.png file.png
optipng -o5 file.png

# SVGs
svgo file.svg
```

All tools installed via Homebrew.

---

## Git conventions

- Commit messages for sync scripts: `sync: update X from Y`
- Manual content changes: use descriptive messages, e.g. `add essay: simplicity is a strategy`
- The `main` branch deploys directly to GitHub Pages

---

## Scalability notes

The site is intentionally simple but designed to grow through repetition of patterns, not through added complexity.

**To keep it scalable:**
- New content types should follow the JSON + lazy-load + render pattern
- New views should use the same overlay mechanism (never a new page unless it's an essay)
- All styling goes in `style.css` (never inline styles, never a new CSS file except `essay.css`)
- All JS stays inline in `index.html` (no new JS files except `present.js`)
- Keep the data format flat: arrays of objects with simple string fields
- If a view is currently hardcoded HTML and you want it data-driven, create a JSON file and follow the pattern — but only when it's worth it (don't over-engineer for 8 links)

**What would require architectural changes:**
- More than ~15 views → consider a view registry object instead of the current if/else in `loadView()`
- Dozens of essays → consider generating `sitemap.xml` from `essays.json` via a script
- Adding interactivity beyond overlays (filters, search) → keep it in vanilla JS, no frameworks
- Images in views → needs thoughtful handling of loading states; use lazy loading

---

## Quick reference: editing checklist

When making changes, check:

- [ ] Does the new element follow the opacity hierarchy (`1` / `0.55` / `0.4`)?
- [ ] Is any emphasis done with italics (never bold)?
- [ ] Are transitions in the 250–500ms range with `ease` timing?
- [ ] Does the mobile layout work at ≤ 600px?
- [ ] If a new external resource was added, is CSP updated in all HTML files?
- [ ] If a new essay was added, is `sitemap.xml` updated?
- [ ] Are images compressed before committing?
- [ ] Does dark mode work correctly (just colour inversion, no new colours)?
