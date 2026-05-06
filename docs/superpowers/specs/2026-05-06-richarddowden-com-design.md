# Design Brief — richarddowden.com

**Date:** 2026-05-06
**Status:** Approved
**Anchors:** [`PRODUCT.md`](../../../PRODUCT.md), [`DESIGN.md`](../../../DESIGN.md)

## 1. Feature Summary

A single-page personal contact surface. The name `RICHARD DOWDEN` is rendered as heavy condensed display type, the letterforms constituted by an ASCII grid of marks, on a drenched mineral field. At T=0 the name is fully resolved. From T>0 onwards a custom cellular automaton governs the grid; the name does not reform. The page is the artifact.

## 2. Primary User Action

There is no action. The visitor looks. The simulation runs. They leave with a memory of a name that was alive on the page.

## 3. Design Direction

**Color strategy.** Drenched. The page is one mineral field, plus one near-black mark. Two hues total. Specific hue resolved during implementation in the browser, not in a swatch picker — celadon, oxidized copper, weathered slate, faded indigo, faded ochre are live candidates.

**Theme — scene sentence.** *A recruiter scrolling through twelve open candidate tabs at 11pm in a softly-lit kitchen pauses on this one because something on the page is moving in a way that doesn't match the others.* Forces a quiet, slightly cool, slightly mineralized field, not a dark hacker-lab and not a bright SaaS hero.

**Anchor references.** **cabbi.bo** (kinetic typography, type-forward identity), **THINK / BUILD / ITERATE poster-style ASCII-fill display** (punch-card glyph density inside heavy condensed letters on a dusty mineral ground), **Conway's Game of Life run on a Risograph poster** (the imaginary intersection that defines this brief).

## 4. Scope

- **Fidelity:** production-ready (this is the actual shipping site).
- **Breadth:** one page, one surface.
- **Interactivity:** none. No play / pause, no scrubber, no "click to restart". The simulation runs.
- **Time intent:** polish until it ships.

## 5. Layout Strategy

The name fills the viewport.

- **Ultrawide / desktop ≥1280px:** single line, `RICHARD DOWDEN` set edge-to-edge with controlled side margin.
- **Standard desktop / tablet 600–1280px:** two lines, `RICHARD` on top and `DOWDEN` below, each filling its line edge-to-edge.
- **Mobile <600px:** initials only, `R·D` (interpunct as separator), set as a single very large block in the upper-left quadrant, *not* centered. Asymmetric placement on mobile reads as deliberate composition, not "responsive shrink."

The ASCII cell size is constant across breakpoints (e.g., 8px on retina, 12px on standard) so the grain of the simulation stays consistent. Letter sizes scale to nearest integer multiple of cell size; never sub-pixel.

The grid extends only inside the letterforms. The negative space is the field color, untouched. The CA *can* leak gliders outside the letter silhouette as the simulation evolves, this is desired behavior, not a bug.

## 6. Key States

| State | What the visitor sees |
| --- | --- |
| **Initial paint (0–1000ms)** | Field color washes in. ASCII glyphs appear inside the letterforms in their fully-formed configuration. No CA evolution yet. |
| **Settling (1000–1500ms)** | Brief pause, the name holds, fully readable. This is the "moment of recognition" called out in PRODUCT.md Principle 2. |
| **Simulation running (1500ms+)** | CA begins evolving. Cells flicker, gliders form, regions stabilize and decay. The name remains semi-recognizable for 30–120s, then dissolves into emergent structure. Runs forever; no reset. |
| **Reduced motion** (`prefers-reduced-motion: reduce`) | Initial-paint state, frozen. No simulation, no toggle. Identical visual to the WebGL-fallback state. |
| **WebGL unavailable** | Same as reduced motion: static rendering of the fully-formed name on the field. SSR-rendered SVG or HTML/CSS, no JS dependency. |
| **Tab backgrounded** | Simulation pauses (`document.hidden` → no `requestAnimationFrame`). Resumes on tab-focus. Saves battery; ethical default. |
| **Slow device / sustained <30fps** | Simulation throttles step rate (CA generations per second), keeps render rate at display refresh. No quality-degradation message. |

## 7. Interaction Model

None. No hover, no click, no scroll behavior, no keyboard shortcut, no URL hash that controls the simulation. The page accepts no input and offers no controls. Pointer movement does nothing. Touch does nothing.

## 8. Content Requirements

- **Visible text:** the name. `RICHARD DOWDEN` (full) or `R·D` (mobile breakpoint). No tagline, no copyright, no nav, no footer, no skip-link visible.
- **Document title:** `Richard Dowden`.
- **Meta description:** one sentence, e.g., *"Richard Dowden — a name, an ASCII rendering, a cellular automaton allowed to run."* Final copy resolved at implementation.
- **Accessibility text:** offscreen `<h1>Richard Dowden</h1>` for screen readers; `aria-hidden="true"` on the canvas. The canvas exposes nothing semantically.
- **Open Graph image:** a static rendering of the fully-formed ASCII name on the field (same as reduced-motion fallback). 1200×630.
- **Favicon:** a single ASCII glyph of the field-color / mark-color motif at 32×32 (e.g., one mark cell on field, or the letterform `R` rendered tiny in the same grid style).

## 9. Architecture Notes & Recommended References

- **Stack:** Vite + TypeScript, no framework, no router. Single `index.html`, one entry module, one shader module. Target shipped JS ≤30KB gzip.
- **Rendering pipeline:** Two off-screen WebGL2 textures used as ping-pong buffers for the CA state. A *step shader* reads the previous frame and writes the next CA generation. A *render shader* reads the current state and outputs to the canvas, sampling a glyph atlas to draw an ASCII mark for each living cell. The glyph chosen for a given cell is a stable function of `(x, y)` (deterministic hash), so the punch-card texture has variation without per-frame jitter.
- **CA core:** rule expressed as a small function `(neighborhood: u32) => bool` in GLSL, with the rule selected by a `#define` or uniform. This is the swappability call: Conway, Brian's Brain, Day-and-Night, and a custom rule are all available, switchable in one line.
- **Initial seed:** rasterize the typeset name to a 1-bit alpha buffer (canvas2D, then `getImageData`), upload as the initial CA texture. The "rasterized text" is the seed condition.
- **Glyph atlas:** small set of ASCII marks (e.g., `: . ; + * # @` or a curated 6–8 character alphabet), pre-rendered to a single texture. Selection per cell by `hash(x, y) % alphabet_length`.
- **Step rate:** CA runs at ~10–20 generations/sec, render runs at display refresh rate. Decoupled. Step rate slows under load.
- **References to load during craft:**
  - `reference/typography.md` — for the heavy condensed display choice and the rasterization pipeline
  - `reference/animate.md` and `reference/motion-design.md` — for the settling pause and reduced-motion fallback
  - `reference/color-and-contrast.md` — for picking the field hue against AA contrast for the eroded states
  - `reference/responsive-design.md` — for the desktop / tablet / mobile layout breakpoints

## 10. Open Questions

These resolve at implementation time, not now.

1. **Specific field hue.** Decided in the browser with the type rendered live. Probably one of: dusty celadon, weathered slate, oxidized copper, faded indigo, faded ochre.
2. **Specific display typeface.** Heavy condensed; candidates include Druk Wide Heavy (commercial), Compacta (commercial), F37 Bergman (commercial), Voyage Bold Condensed (free), or a self-hosted woodtype-revival open-source alternative. Decide once we see the rasterized result at the chosen cell size.
3. **CA rule parameters.** Custom rule must be tuned so the name persists in semi-recognizable form for 30–120s before dissolving. May require parameter sweeps during implementation. Keep Conway, Brian's Brain, Day-and-Night swappable for comparison.
4. **Glyph alphabet.** 6–8 marks. Final selection depends on what reads as punch-card vs. what reads as noise at the chosen cell size.
5. **Hosting.** Probably Cloudflare Pages or Vercel static. Single HTML page with one entry chunk. To confirm separately.
