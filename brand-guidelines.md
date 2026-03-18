# Oscar Valledor — Brand Guidelines

These guidelines define the visual identity for oscarvalledor.com and any related materials. Apply them to all design work unless explicitly overridden.

---

## Philosophy

Achromatic. Serif. Text-driven. The design communicates through restraint — what's removed matters more than what's added. Think of it as typography + whitespace + opacity. Nothing else.

Technology should feel like an extension of human intention, not a replacement for it. Every decision — from the achromatic palette to the minimal structure — is deliberate.

---

## Color

| Token | Light mode | Dark mode |
|-------|-----------|-----------|
| Background | `#FFFFFF` | `#000000` |
| Text | `#000000` | `#FFFFFF` |
| Links | Same as text | Same as text |

No greys, no accent colours, no gradients. Dark mode is a pure inversion.

---

## Typography

| Property | Value |
|----------|-------|
| Font family | **Times New Roman**, Times, serif |
| Base font size | `0.9rem` (~14.4px) |
| Line height | `1.4` (general), `1.6` (long-form text) |
| Letter spacing | `0.01em` |

### Emphasis rules

- Use *italics* for emphasis. **Never bold.**
- Section labels are plain text, no special weight.
- Titles are plain text — hierarchy comes from placement and opacity, not size or weight.

---

## Visual hierarchy

Hierarchy is achieved through **opacity alone**. Size and colour do not change.

| Level | Opacity | Usage |
|-------|---------|-------|
| Primary | `1.0` | Main text, titles, links |
| Secondary | `0.4` | Descriptions, dates, subtitles, metadata |
| Tertiary | `0.3` | Counters, numbering, auxiliary labels |

---

## Spacing

Generous whitespace. Content breathes. Low visual density.

| Context | Value |
|---------|-------|
| Page padding | `5vw` all sides |
| Gap between items | `0.75rem` |
| Gap between sections | `1rem` |
| Section label margin | `0.25rem` bottom |

---

## Links

- Same colour as text (inherit)
- No text-decoration; underline via a `1px solid` bottom border
- Hover state: reduce opacity to `0.35`

---

## Transitions & motion

All motion is subtle and functional. Nothing decorative.

| What | Duration | Easing |
|------|----------|--------|
| Fade-in | `400ms` | ease |
| Overlays | `500ms` | ease |
| Hover states | `250ms` | ease |
| List item stagger | `400ms` per item, `50ms` delay between items | ease |

---

## Layout principles

- Text-driven layouts. No grids of cards or image galleries.
- Content is vertically stacked with clear spatial separation.
- Desktop: viewport-locked, no scrolling (content fits the screen).
- Mobile: natural scrolling, same visual language.
- Single breakpoint at `600px`.

---

## What NOT to use

- Shadows
- Border-radius
- Gradients
- Icons or emoji
- Decorative images
- Bold text
- Colour (beyond black and white)
- External or sans-serif fonts
- Component libraries or complex UI patterns

---

## Applying to presentations

When translating these guidelines to PowerPoint or Keynote:

- **Backgrounds**: Pure white slides. Use pure black for inverted/accent slides.
- **Typography**: Use Times New Roman for all text. Titles in regular weight (not bold). Use italics for emphasis.
- **Hierarchy**: Use opacity (or lighter greys as a proxy: `#999999` for secondary, `#B3B3B3` for tertiary) since PowerPoint doesn't support true opacity on text natively.
- **Layout**: Generous margins. Left-aligned text. Minimal content per slide — let the whitespace speak.
- **No decorations**: No slide transitions, no animations, no shapes, no icons, no gradients, no drop shadows. If PowerPoint offers it as a "design idea," decline.
- **Images**: Use sparingly and only when essential. Full-bleed, no borders, no rounded corners.
- **Consistency**: Every slide should feel like it belongs to the same quiet, restrained system.
