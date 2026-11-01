// Inline SVG brand art. Every shape takes its color from site.css, so both
// themes work without a second drawing.

const round = (n) => Math.round(n * 10) / 10;
const project = ([x, y, z]) => [round((x + z) * 0.866), round((x - z) * 0.5 + y)];
const points = (corners) => corners.map((c) => project(c).join(",")).join(" ");
const polygon = (cls, corners) => `<polygon class="${cls}" points="${points(corners)}"/>`;

/** The logo without its tile: the letter, and the bar that crosses it. */
export const mark = (size = 28) => `<svg class="mark" viewBox="10 16 76 64" width="${size}" height="${round(size * 64 / 76)}" aria-hidden="true">
<path class="mark-a" d="M28 74 48 22l20 52"/><path class="mark-bar" d="M16 58h64"/>
</svg>`;

/** The logo letter as an isometric solid, pierced by the bar. */
export function isoMark() {
  const depth = 22;
  const letter = [[0, 100], [37, 0], [63, 0], [100, 100], [76, 100], [50, 30], [24, 100]];
  const camera = [1, -1, -1];
  const at = (p, z) => [p[0], p[1], z];
  const faces = letter.map((a, i) => {
    const b = letter[(i + 1) % letter.length];
    // The letter winds clockwise on screen, so the outward normal is (dy, -dx).
    const normal = [b[1] - a[1], a[0] - b[0]];
    const visible = normal[0] * camera[0] + normal[1] * camera[1] > 0;
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, depth / 2];
    return { a, b, visible, near: mid[0] * camera[0] + mid[1] * camera[1] + mid[2] * camera[2] };
  });
  const sides = faces
    .filter((f) => f.visible)
    .sort((p, q) => p.near - q.near)
    .map((f) => polygon("iso-side", [at(f.a, 0), at(f.b, 0), at(f.b, depth), at(f.a, depth)]));
  const ghost = polygon("iso-ghost", letter.map((p) => at(p, depth)));

  const [left, right, top, bottom, front, back] = [-30, 130, 63, 70, -4, 7];
  const bar = [
    polygon("iso-bar-top", [[left, top, front], [right, top, front], [right, top, back], [left, top, back]]),
    polygon("iso-bar-end", [[right, top, front], [right, bottom, front], [right, bottom, back], [right, top, back]]),
    polygon("iso-bar", [[left, top, front], [right, top, front], [right, bottom, front], [left, bottom, front]]),
  ];

  return `<svg class="iso" viewBox="-34 -34 190 176" aria-hidden="true">
${sides.join("\n")}
${polygon("iso-front", letter.map((p) => at(p, 0)))}
${ghost}
${bar.join("\n")}
</svg>`;
}
