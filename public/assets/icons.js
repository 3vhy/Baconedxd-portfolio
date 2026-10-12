/* Small original 10x10 pixel-art icons, coloured from the theme via CSS classes. */
window.PixelIcons = (function () {
  const ICONS = {
    crown: [
      "..........", "..........", ".y..yy..y.", ".yy.yy.yy.", ".yyyyyyyy.",
      ".yryaayry.", ".yyyyyyyy.", ".oooooooo.", "..........", ".........."
    ],
    shield: [
      ".kkkkkkkk.", "kaaaddaaak", "kaaaddaaak", "kddddddddk", "kaaaddaaak",
      "kaaaddaaak", ".kaaddaak.", "..kaddak..", "...kddk...", "....kk...."
    ],
    sword: [
      "........ww", ".......wwa", "......wwa.", ".....wwa..", ".y..wwa...",
      "..yywa....", "...yy.....", "..bbyy....", ".bb..y....", "bb........"
    ],
    hammer: [
      "..........", ".gggggggg.", ".gwgggggg.", ".gggggggg.", "....bb....",
      "....bb....", "....bb....", "....bb....", "....bb....", ".........."
    ],
    book: [
      "..........", ".kkkkkkkk.", ".kaaaaaawk", ".kaddddawk", ".kaaaaaawk",
      ".kaddddawk", ".kaaaaaawk", ".kaaaaaawk", ".kkkkkkkkk", ".........."
    ],
    chat: [
      "..........", ".aaaaaaaa.", "aaaaaaaaaa", "aawaawaawa", "aaaaaaaaaa",
      ".aaaaaaaa.", "..aa......", ".aa.......", "..........", ".........."
    ],
    star: [
      "....yy....", "....yy....", "...yyyy...", "yyyyyyyyyy", ".yyyyyyyy.",
      "..yyyyyy..", "..yyyyyy..", ".yyy..yyy.", ".yy....yy.", ".........."
    ],
    heart: [
      "..........", ".rrr..rrr.", "rrwrrrrrrr", "rwrrrrrrrr", "rrrrrrrrrr",
      ".rrrrrrrr.", "..rrrrrr..", "...rrrr...", "....rr....", ".........."
    ],
    camera: [
      "..........", "..........", "...ggg....", ".gggggggg.", ".ggkkkkgg.",
      ".ggkaakgg.", ".ggkaakgg.", ".ggkkkkgg.", ".gggggggg.", ".........."
    ],
    gear: [
      "....aa....", ".aa.aa.aa.", ".aaaaaaaa.", "..aakkaa..", "aaakkkkaaa",
      "aaakkkkaaa", "..aakkaa..", ".aaaaaaaa.", ".aa.aa.aa.", "....aa...."
    ],
    gem: [
      "..........", "...wwaa...", "..waaaad..", ".waaaaaad.", "waaaaaaadd",
      ".aaaaaadd.", "..aaaadd..", "...aadd...", "....dd....", ".........."
    ],
    ebook: [
      "..........", "..kkkkkkk.", ".kdaaaaaak", ".kdawaaaak", ".kdaaaawak",
      ".kdaawaaak", ".kdaaaaaak", ".kdddddddk", "..kkkkkkk.", ".........."
    ],
    player: [
      "..kkkkkk..", ".kbbbbbbk.", ".kbbbbbbk.", ".kssssssk.", ".kswdswdk.",
      ".kssssssk.", ".ksbbbbsk.", ".kssssssk.", "..kkkkkk..", ".........."
    ],
    clock: [
      "...kkkk...", "..kaaaak..", ".kaaawaak.", "kaaaawaaak", "kaaaawwwak",
      "kaaaaaaaak", ".kaaaaaak.", "..kaaaak..", "...kkkk...", ".........."
    ]
  };
  const CLS = { k: "pk", a: "pa", d: "pd", w: "pw", y: "py", o: "po", r: "pr", g: "pg", b: "pb", s: "ps" };

  function svg(name, size = 40) {
    const rows = ICONS[name] || ICONS.star;
    let rects = "";
    rows.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const ch = row[x];
        if (ch === ".") { x++; continue; }
        let w = 1;
        while (row[x + w] === ch) w++;
        rects += `<rect class="${CLS[ch] || "pa"}" x="${x}" y="${y}" width="${w}" height="1"/>`;
        x += w;
      }
    });
    return `<svg class="px-icon" viewBox="0 0 10 10" width="${size}" height="${size}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
  }
  return { svg, names: Object.keys(ICONS) };
})();
