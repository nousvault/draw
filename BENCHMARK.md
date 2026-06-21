# draw.nous.my.id vs. Excalidraw Official — Feature Benchmark Report

**Date:** 2026-06-21
**Scope:** draw.nous.my.id (vanilla JS + HTML Canvas 2D, ~585 lines, zero dependencies) vs. Excalidraw official (v0.18.1, `@excalidraw/excalidraw` npm package, React component)

---

## 1. Feature Comparison Table

| Feature | draw.nous.my.id | Excalidraw Official | Priority |
|---|---|---|---|
| **Drawing Tools** | | | |
| Rectangle | ✅ | ✅ | — |
| Ellipse / Circle | ✅ | ✅ | — |
| Arrow | ✅ basic line | ✅ smart, bindable | — |
| Freehand / Pen | ✅ | ✅ | — |
| Text tool | ✅ | ✅ | — |
| Eraser | ✅ | ✅ | — |
| Select tool | ✅ | ✅ | — |
| Line (straight, non-arrow) | ❌ | ✅ | Med |
| Diamond / Rhombus | ❌ | ✅ | Low |
| Image insert (raster embed) | ❌ | ✅ | High |
| Embeddable iframes on canvas | ❌ | ✅ | Low |
| **Styling & Appearance** | | | |
| Stroke color picker | ❌ | ✅ | High |
| Fill color picker | ❌ | ✅ | High |
| Fill styles (hachure, cross-hatch, solid, dots) | ❌ | ✅ via Rough.js | Med |
| Stroke width options | ❌ | ✅ 4 levels | High |
| Stroke style (solid / dashed / dotted) | ❌ | ✅ | Med |
| Roughness / hand-drawn feel slider | ❌ | ✅ | Med |
| Opacity per element | ❌ | ✅ | Med |
| Font family options | ❌ | ✅ | Med |
| Font size control | ❌ | ✅ | High |
| Text alignment (L / C / R) | ❌ | ✅ | Med |
| Arrow head style options | ❌ | ✅ | Low |
| **Canvas & Navigation** | | | |
| Pan (space+drag, middle mouse) | ✅ | ✅ | — |
| Zoom (Ctrl+wheel, +/− buttons) | ✅ | ✅ | — |
| Zoom to fit / scroll to content | ❌ | ✅ | Med |
| Background: dot grid | ✅ | ✅ dot/line/crosshatch/none | — |
| Dark mode / theme toggle | ❌ | ✅ | Med |
| Infinite canvas | ✅ | ✅ | — |
| **Object Manipulation** | | | |
| Drag to move | ✅ | ✅ | — |
| Resize handles (8-point bbox) | ❌ | ✅ | High |
| Rotate handle | ❌ | ✅ | High |
| Multi-select (rubber-band drag) | ❌ | ✅ | High |
| Ctrl+A select all | ❌ | ✅ | High |
| Copy / Paste (Ctrl+C / Ctrl+V) | ❌ | ✅ | High |
| Duplicate (Ctrl+D) | ❌ | ✅ | High |
| Element grouping (Ctrl+G) | ❌ | ✅ | Med |
| Align & distribute | ❌ | ✅ | Med |
| Z-order (bring forward / send back) | ❌ | ✅ | Med |
| Lock element | ❌ | ✅ | Low |
| Arrow-to-shape connector binding | ❌ | ✅ auto re-routes | High |
| Double-click to edit label | ✅ | ✅ | — |
| **Export & Import** | | | |
| PNG download | ✅ | ✅ | — |
| Copy to clipboard (PNG) | ✅ | ✅ | — |
| JSON export / import | ✅ | ✅ .excalidraw format | — |
| SVG export | ❌ | ✅ | High |
| PDF export | ❌ | ✅ Excalidraw+ only | Low |
| Export background toggle | ❌ | ✅ | Low |
| Export scale selection | ❌ | ✅ | Low |
| **Collaboration & Sync** | | | |
| localStorage persistence | ✅ | ✅ | — |
| Real-time collaboration (WebSocket) | ❌ | ✅ excalidraw.com | Low* |
| Shareable live session links | ❌ | ✅ | Low* |
| **Undo / History** | | | |
| Undo / Redo | ✅ 50-step | ✅ deep history | — |
| **Keyboard Shortcuts** | | | |
| Tool shortcuts (S/P/R/O/A/T/E) | ✅ | ✅ extended set | — |
| Ctrl+Z / Shift+Z undo/redo | ✅ | ✅ | — |
| Delete key to erase selection | ❌ | ✅ | Med |
| Ctrl+C / Ctrl+V / Ctrl+D | ❌ | ✅ | High |
| **PWA / Offline** | | | |
| PWA / service worker / offline | ❌ | ✅ | Low |
| **Platform Characteristics** | | | |
| Zero JS dependencies | ✅ | ❌ React 18+ required | — |
| Sub-10 KB total page weight | ✅ | ❌ ~450–500 KB gz bundle | — |
| Static-site / no build pipeline | ✅ | ❌ Vite/webpack required | — |
| SEO sr-only content block | ✅ | ❌ not built-in | — |
| Full branding / UI control | ✅ | ⚠️ CSS vars only | — |

> \*Real-time collaboration is low priority for draw.nous.my.id's single-user static-tool use case.

---

## 2. Top 10 Missing Features (Excalidraw → draw.nous.my.id)

### 1. Resize & Rotate Handles
8-point bounding-box resize handles + rotation handle per selected element. Currently all shapes are locked at drawn dimensions.

### 2. Stroke & Fill Styling Panel
Per-element: stroke color, fill color, fill style (hachure/cross-hatch/solid/dots via Rough.js), stroke width (4 levels), stroke style, opacity 0–100%.

### 3. Multi-Select, Copy & Paste
Rubber-band drag select, Ctrl+A, Ctrl+C/V/D. Currently only one object movable at a time, no clipboard ops at all.

### 4. SVG Export
Fully scalable self-contained SVG with embedded fonts. PNG-only export loses vector fidelity for docs, slides, READMEs.

### 5. Arrow / Connector Binding
Arrows snap-bind to shape anchor points and auto-reroute when the shape moves. Currently arrows are static line segments.

### 6. Image Embedding
Drag/paste raster images (PNG/JPEG/WebP/SVG) as first-class resizable canvas elements that survive JSON round-trips and export.

### 7. Per-Element Font & Text Styling
Font family, font size, and text alignment per text/label element. Currently fixed canvas font, no per-element overrides.

### 8. Element Grouping, Z-Order & Alignment
Ctrl+G grouping, Z-axis ordering (front/back), snap-align (left/right/top/bottom), distribute evenly.

### 9. Dark Mode / Theme
Built-in light/dark toggle respecting `prefers-color-scheme`. Currently light-only.

### 10. Zoom-to-Fit (Shift+1)
Centers and scales viewport to encompass all canvas content. No recovery path when objects drift off-screen.

---

## 3. Migration Assessment

### Option A — Adopt @excalidraw/excalidraw (clone & theme)

**Pros**
- All ~40 missing features arrive immediately including Rough.js aesthetic, connector binding, shape libraries, dark mode
- Actively maintained — browser compat, a11y, bug fixes land upstream automatically
- CSS custom properties (`--color-*` on `.excalidraw`) allow surface-level branding without forking

**Cons**

| Factor | Detail |
|---|---|
| Bundle size | ~1 MB minified / **~450–500 KB gzipped** including React 18 — ~55× current page weight |
| Dependencies | 50+ direct: Rough.js, jotai, i18next, fractional-indexing, @radix-ui/* etc. |
| React requirement | Hard peer dep on React 18+; needs ESM import-maps or full Vite/webpack pipeline |
| Branding control | Toolbar, context menus, dialogs carry Excalidraw branding; removing requires patching React tree |
| Upgrade risk | .excalidraw scene format + component API had breaking changes 0.17→0.18; regression testing required |

### Option B — Continue extending custom vanilla canvas

**Pros**
- Zero dependencies; plain `<script>` deploy on any static host
- Complete pixel control over branding and UX
- Sub-10 KB baseline; fast on slow connections and low-end mobile
- No build pipeline
- Rough.js (~35 KB gz) can be added selectively for hand-drawn aesthetic

**Cons**
- Closing the top-10 gap: estimated ~3–5 weeks of focused work
- No off-the-shelf real-time collab
- We own all browser quirks and a11y gaps

### Recommendation: Stay custom, build incrementally

The core value of draw.nous.my.id is being a **fast, branded, dependency-free static tool**. The React bundle cost (~55× page weight) and build pipeline overhead are not justified for current requirements.

**Incremental build order (highest ROI first):**

| # | Feature | Est. effort |
|---|---|---|
| 1 | Resize + rotate handles | 3–4 days |
| 2 | Stroke & fill color pickers | 1–2 days |
| 3 | Multi-select + Ctrl+C/V/D | 2 days |
| 4 | SVG export | 1 day |
| 5 | Arrow connector binding | 2–3 days |
| 6 | Per-element font size + dark mode | 2 days |

Also worth evaluating: adding Rough.js (~35 KB gz, zero framework deps) as a single `<script>` import for the hand-drawn aesthetic.

**Revisit migration** only if real-time collaboration or advanced diagramming (flowchart auto-layout, Mermaid import, nested groups) becomes a hard requirement. When that happens, keep the static SEO landing page and serve the Excalidraw component on a sub-route with its own React bundle — don't replace the root page wholesale.
