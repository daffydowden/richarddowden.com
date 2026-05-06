/**
 * Pre-rendered figlet ASCII-art templates. Generated locally with
 * `npx figlet -f <font> -w 500 "<text>"` and pasted in. The site never
 * runs figlet at runtime; the templates here are the final glyph layout.
 */

export interface FigletSet {
  name: string;
  twoLine: { top: string; bottom: string }; // RICHARD over DOWDEN
  initials: string;                         // RD
  /** Unique non-space characters in this font's letterforms. */
  alphabet: string[];
}

export const ROMAN: FigletSet = {
  name: 'Roman',
  twoLine: {
    top:
`ooooooooo.   ooooo   .oooooo.   ooooo   ooooo       .o.       ooooooooo.   oooooooooo.
\`888   \`Y88. \`888'  d8P'  \`Y8b  \`888'   \`888'      .888.      \`888   \`Y88. \`888'   \`Y8b
 888   .d88'  888  888           888     888      .8"888.      888   .d88'  888      888
 888ooo88P'   888  888           888ooooo888     .8' \`888.     888ooo88P'   888      888
 888\`88b.     888  888           888     888    .88ooo8888.    888\`88b.     888      888
 888  \`88b.   888  \`88b    ooo   888     888   .8'     \`888.   888  \`88b.   888     d88'
o888o  o888o o888o  \`Y8bood8P'  o888o   o888o o88o     o8888o o888o  o888o o888bood8P'   `,
    bottom:
`oooooooooo.     .oooooo.   oooooo   oooooo     oooo oooooooooo.   oooooooooooo ooooo      ooo
\`888'   \`Y8b   d8P'  \`Y8b   \`888.    \`888.     .8'  \`888'   \`Y8b  \`888'     \`8 \`888b.     \`8'
 888      888 888      888   \`888.   .8888.   .8'    888      888  888          8 \`88b.    8
 888      888 888      888    \`888  .8'\`888. .8'     888      888  888oooo8     8   \`88b.  8
 888      888 888      888     \`888.8'  \`888.8'      888      888  888    "     8     \`88b.8
 888     d88' \`88b    d88'      \`888'    \`888'       888     d88'  888       o  8       \`888
o888bood8P'    \`Y8bood8P'        \`8'      \`8'       o888bood8P'   o888ooooood8 o8o        \`8  `,
  },
  initials:
`ooooooooo.   oooooooooo.
\`888   \`Y88. \`888'   \`Y8b
 888   .d88'  888      888
 888ooo88P'   888      888
 888\`88b.     888      888
 888  \`88b.   888     d88'
o888o  o888o o888bood8P'   `,
  alphabet: ['.', "'", '"', '`', '8', 'b', 'd', 'o', 'P', 'Y'],
};

export const UNIVERS: FigletSet = {
  name: 'Univers',
  twoLine: {
    top:
`88888888ba   88    ,ad8888ba,   88        88         db         88888888ba   88888888ba,
88      "8b  88   d8"'    \`"8b  88        88        d88b        88      "8b  88      \`"8b
88      ,8P  88  d8'            88        88       d8'\`8b       88      ,8P  88        \`8b
88aaaaaa8P'  88  88             88aaaaaaaa88      d8'  \`8b      88aaaaaa8P'  88         88
88""""88'    88  88             88""""""""88     d8YaaaaY8b     88""""88'    88         88
88    \`8b    88  Y8,            88        88    d8""""""""8b    88    \`8b    88         8P
88     \`8b   88   Y8a.    .a8P  88        88   d8'        \`8b   88     \`8b   88      .a8P
88      \`8b  88    \`"Y8888Y"'   88        88  d8'          \`8b  88      \`8b  88888888Y"'    `,
    bottom:
`88888888ba,      ,ad8888ba,   I8,        8        ,8I  88888888ba,    88888888888  888b      88
88      \`"8b    d8"'    \`"8b  \`8b       d8b       d8'  88      \`"8b   88           8888b     88
88        \`8b  d8'        \`8b  "8,     ,8"8,     ,8"   88        \`8b  88           88 \`8b    88
88         88  88          88   Y8     8P Y8     8P    88         88  88aaaaa      88  \`8b   88
88         88  88          88   \`8b   d8' \`8b   d8'    88         88  88"""""      88   \`8b  88
88         8P  Y8,        ,8P    \`8a a8'   \`8a a8'     88         8P  88           88    \`8b 88
88      .a8P    Y8a.    .a8P      \`8a8'     \`8a8'      88      .a8P   88           88     \`8888
88888888Y"'      \`"Y8888Y"'        \`8'       \`8'       88888888Y"'    88888888888  88      \`888  `,
  },
  initials:
`88888888ba   88888888ba,
88      "8b  88      \`"8b
88      ,8P  88        \`8b
88aaaaaa8P'  88         88
88""""88'    88         88
88    \`8b    88         8P
88     \`8b   88      .a8P
88      \`8b  88888888Y"'    `,
  alphabet: ['.', "'", '"', '`', ',', '8', 'a', 'b', 'd', 'I', 'P', 'Y'],
};

/**
 * Pick the right template for the current viewport breakpoint.
 * Returns a list of lines (rows) with one extra blank line between
 * twoLine.top and twoLine.bottom so the rendered name has gap.
 */
export function templateForLayout(
  set: FigletSet,
  layoutLines: readonly string[],
): string[] {
  if (layoutLines.length === 1) {
    // single-line layout: place RICHARD top, DOWDEN bottom anyway —
    // the figlet template is already wide and "RICHARD DOWDEN" as a
    // single rendered line would be impractically wide.
    return [
      ...set.twoLine.top.split('\n'),
      '',
      ...set.twoLine.bottom.split('\n'),
    ];
  }
  if (layoutLines.length === 2 && layoutLines[0]?.length === 1) {
    // narrow phone "R" / "·D" — render initials.
    return set.initials.split('\n');
  }
  return [
    ...set.twoLine.top.split('\n'),
    '',
    ...set.twoLine.bottom.split('\n'),
  ];
}
