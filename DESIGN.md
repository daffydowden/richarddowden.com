<!-- SEED: re-run /impeccable document once there's code to capture the actual tokens and components. -->

---
name: richarddowden.com
description: A name, an ASCII rendering, a cellular automaton allowed to run.
---

# Design System: richarddowden.com

## 1. Overview

**Creative North Star: "The Living Glyph"**

The page is a single glyph that is alive. The name is rendered in heavy
condensed display type, the letterforms constituted by an ASCII fill — small
marks arranged on a grid so that the typography and the texture are the
same thing. At T=0 the name is fully resolved. From T>0 onwards the grid
is governed by a cellular automaton, and what happens to the name is up
to the rules. Gliders form, structures collapse, regions oscillate. The
name does not reform. It is the initial condition of a dynamical system.

The surface is drenched in a single mineral hue. There is no white card,
no header, no nav, no chrome. The mark is near-black on the field, flat,
no shadow, no gradient. Density comes from the ASCII grid itself, not
from layered surfaces.

The aesthetic rejects every easy reading of "ASCII + cellular automata":
the dev-portfolio terminal, the crypto/web3 hacker poster, the SaaS-cream
landing, the abstract Vimeo art reel, and especially the
type-with-a-shader-on-top default. The letters here are *constituted by*
their fill, not decorated by it.

**Key Characteristics:**
- One page, one name, one ongoing simulation. No links, no chrome.
- Drenched flat color, mineral hue family, no gradients, no shadows.
- Heavy condensed display letterforms, rendered as an ASCII grid of marks.
- The CA is the design, not an effect on top of the design.
- Quiet, fully-formed fallback for reduced motion.

## 2. Colors

A single mineral field with a single near-black mark on it. The site is
**Drenched**: the surface IS the color, and it is the only color other
than the type itself. The atmosphere is dusty, slightly cool, slightly
mineralized, Risograph-adjacent. A specific hue is `[to be resolved during
implementation]` — celadon, oxidized copper, weathered slate, faded indigo,
and faded ochre are all live candidates. The decision is a feeling, made
in the browser with the type rendered, not in a swatch picker.

### Primary
- **Field** `[to be resolved during implementation]` — the entire page
  background. Mineral, dusty, low-chroma, flat. Carries 100% of the
  surface other than the glyph fill.

### Neutral
- **Mark** `[to be resolved during implementation]` — the ASCII glyph
  color. Near-black, tinted toward the field hue (chroma ~0.005–0.01 in
  OKLCH). Never `#000`. Must hit WCAG AA against the field even at the
  most-eroded CA frame, not only the fully-formed one.

### Named Rules

**The Drenched Rule.** The page is one color, plus the mark. Two hues
total. Adding a third is forbidden, including for "accent", "highlight",
"link", or "focus ring". Focus and state changes use the mark and the
field, repositioned or inverted, never a new color.

**The Flat Rule.** No gradients, no shadows, no glows, no blurs, no
transparency layers. The visual interest is the ASCII grid and the CA
evolution; nothing else needs decoration. If a frame looks like it has
glow, the bloom is wrong, not aesthetic.

**The Tint-Don't-Stack Rule.** Neutrals tilt toward the field hue. There
is no neutral grey, no off-white card. There is the field, and there is
the mark.

## 3. Typography

**Display Font:** `[heavy condensed display family to be chosen at
implementation — Druk Wide, Compacta, Tungsten, Ironmonger, F37
Bergman, or similar woodtype-revival]`
**Body Font:** *(none — this site has no body copy)*
**Label / Mono Font:** *(none)*

**Character:** A single typographic voice: heavy, condensed, declarative.
The silhouette of each letter is what the CA grid fills in. Lighter or
wider typefaces fail the brief — there isn't enough enclosed area for the
ASCII grid to feel dense, and the eroded states read as illegible noise
instead of evolving structure.

### Hierarchy

- **Display** (heavy weight, condensed, clamp(20vw, 24vw, 28vw),
  line-height 0.85, normal letter-spacing): the name. The only piece of
  type on the page. Set to fill the viewport edge-to-edge with controlled
  margin. Letters are stacked or wrapped per breakpoint, not shrunk to
  fit on one line.

### Named Rules

**The One Type Rule.** There is exactly one piece of text on this page
and it is the name. There is no tagline, no copyright, no nav label, no
button. If a future page adds copy, it is a different page.

**The Constituted Rule.** Letterforms are not "drawn and then filled with
ASCII". The ASCII grid IS the letter. The cells of the grid are the only
visible marks; there is no underlying outline, no stroke, no painted
silhouette beneath the grid. Erosion of the grid IS erosion of the letter.

**The Sub-Pixel Honesty Rule.** The ASCII glyph cells render at integer
sizes that align to the device pixel grid. No hinting tricks, no
sub-pixel anti-aliasing on the marks themselves. The grid is honest about
being a grid.

## 4. Elevation

The system is **flat**. There are no shadows, no elevation tiers, no
layered surfaces, no card stacks. Depth, where it appears, comes from the
density of the ASCII grid (denser regions read as nearer / more present;
sparser regions as more eroded / further away), not from light-and-shadow
simulation.

### Named Rules

**The No-Shadow Rule.** `box-shadow` is forbidden in the project CSS, on
every element, in every state. Same for `filter: drop-shadow`,
`backdrop-filter: blur`, `text-shadow`, and decorative gradients. If a
state needs to be communicated, the mark or the field handles it.

## 5. Components

*Omitted in seed mode. The site has no components other than its single
glyph-canvas. Re-run `/impeccable document` once there is code to extract.*

## 6. Do's and Don'ts

### Do:
- **Do** render the entire page as a drenched mineral field with one
  near-black mark on it.
- **Do** treat the cellular automaton as a real dynamical system. Pick a
  rule set that produces emergent behavior (gliders, oscillators,
  metastable structures), not one that smoothly fades to nothing.
- **Do** make the name fully recognizable at T=0, then let the math run.
- **Do** align the ASCII grid to integer pixel boundaries, even at
  responsive breakpoints.
- **Do** ship the reduced-motion fallback as the *quiet version*, not a
  worse version: the fully-formed name on the same field, in the same
  mark color, no animation, no toggle.
- **Do** check every shipped frame against the five anti-references in
  PRODUCT.md.

### Don't:
- **Don't** ship dev-portfolio brutalism. No black background, no
  neon-green monospace, no terminal cursor blink, no `> hello world`.
- **Don't** ship crypto/web3 hacker aesthetic. No Matrix rain, no glitch
  text, no fake loading bars, no RGB chromatic aberration as decoration.
- **Don't** ship SaaS-cream minimalism. No Linear/Vercel off-white, no
  soft shadows, no handwritten accent font, no ambient gradient orb.
- **Don't** ship a generative-art Vimeo demo. No abstract noise with no
  human anchor; the name is the anchor and is non-negotiable.
- **Don't** ship surface-effect typography. The ASCII fill is the letter.
  No clean type underneath with shaders drawn on top of it.
- **Don't** add a second accent color, even for a focus ring or a hover
  state. The Drenched Rule does not bend.
- **Don't** add a "play / pause / reset" UI. The simulation runs. The
  user does not direct it.
- **Don't** add a footer, a copyright, a "made with WebGL" credit, or a
  view-source tooltip. Resist every website-shaped instinct (PRODUCT.md,
  Principle 1).
- **Don't** use `#000` or `#fff`. Tint everything toward the field hue.
- **Don't** animate any CSS layout property. The decay happens on the
  GPU, in a shader, against a texture; the DOM is essentially static.
