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

/** A loud made-up video thumbnail: a blurred scene, a silhouette, and shouted text. */
export function thumb(i, { from, to, spot, text, arrow }) {
  const id = `thumb-${i}`;
  return `<svg viewBox="0 0 320 180" aria-hidden="true">
<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>
<filter id="${id}-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="16"/></filter></defs>
<rect width="320" height="180" fill="url(#${id})"/>
<g filter="url(#${id}-soft)"><circle cx="${60 + (i * 83) % 200}" cy="48" r="58" fill="${spot}"/><circle cx="${270 - (i * 57) % 170}" cy="150" r="46" fill="#000" fill-opacity=".55"/></g>
<g fill="#000" fill-opacity=".82"><circle cx="246" cy="84" r="31"/><path d="M186 180c3-44 30-62 60-62s57 18 60 62z"/></g>
<text x="14" y="${text.length > 1 ? 62 : 84}" font-family="Inter, sans-serif" font-size="33" font-weight="800" fill="#fff" stroke="#000" stroke-width="6" paint-order="stroke">${text.map((t, n) => `<tspan x="14" dy="${n ? 38 : 0}">${t}</tspan>`).join("")}</text>
${arrow ? '<path d="M150 150l44-30m-26-1 27 0-2 26" fill="none" stroke="#ff2d2d" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>' : ""}
</svg>`;
}
