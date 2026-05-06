# Product

## Register

brand

## Users

A handful of people land here, briefly: recruiters, hiring managers, the
occasional peer. They are scanning, not reading. They have ten seconds and
no task to complete. There are no links to click, no CV to download, no
contact form to fill in — yet. The page is not a destination, it is a moment.

## Product Purpose

A contact surface, nothing more. One page, one name, one effect. The site
is the artifact: an identity card rendered as a small piece of generative
work. It will grow later. Right now its job is to exist with confidence
and leave a trace in memory.

## Brand Personality

Technical, playful, irreverent, alive.

The character is carried entirely by the design. The page never speaks in
words. There is no greeting, no tagline, no "I'm a developer based in…".
The name and its decay say everything that needs saying.

## Anti-references

This site must not be confused for any of these. Each visual choice gets
checked against the list.

- **Dev-portfolio brutalism.** Black background, neon-green monospace,
  blinking terminal cursor, `> hello world`.
- **Crypto / web3 hacker aesthetic.** Matrix rain, glitch text, fake
  loading bars, RGB chromatic aberration as decoration.
- **SaaS-cream minimalism.** Linear/Vercel off-white, soft shadows,
  handwritten accent font, ambient gradient orb.
- **Generative-art Vimeo demo.** Abstract noise with no human anchor,
  pure texture, no statement, indistinguishable from a thousand others.
- **Surface-effect typography.** Clean type with shaders, noise, or
  particles drawn on top of it. The letters here are *constituted* by
  their fill, not decorated by it.

References in the right neighborhood, for triangulation: **cabbi.bo**
(kinetic typography, type-forward identity, restrained color, the type
itself doing the work) and **THINK / BUILD / ITERATE poster-style
ASCII-fill display type** on a dusty mineral ground (letters made of a
patterned grid of small marks, flat color, Risograph energy, no shadows).

## Design Principles

1. **The name is the artifact.** No nav, no header, no footer, no
   "© 2026". The page is the work. Resist every website-shaped instinct.
2. **Decay is the signature.** The cellular automata is not a flourish on
   top of a design, it is the design. The moment of recognition is ASCII
   resolving and then dissolving. Don't dilute it with secondary effects.
3. **Earn "technical" by being technical.** Real shaders, real CA, real
   care in the math. The craft must be felt by people who know, invisible
   to people who don't.
4. **Refuse the five traps.** Every render is checked against the
   anti-reference list above. If a frame could pass for a hacker terminal,
   a SaaS hero, a Vimeo art reel, or type-with-a-shader-on-top, rework.
5. **Quiet fallback, never apologetic.** Reduced-motion / low-power /
   screen-reader views render the name fully formed, undamaged, in the
   same palette. The fallback is the calm version of the site, not a
   second-class one.

## Accessibility & Inclusion

- Target WCAG 2.2 AA.
- `prefers-reduced-motion: reduce` → render the fully-formed ASCII name,
  no decay, no animation. No "play" toggle.
- The name is exposed to assistive tech as plain text (`aria-label` on
  the canvas / SVG; offscreen `<h1>` mirror).
- Foreground/background contrast must hit AA against the ASCII glyphs
  even at the most-eroded frame, not only the fully-formed one.
- No flashing or strobing patterns. CA evolution is smooth and slow.
