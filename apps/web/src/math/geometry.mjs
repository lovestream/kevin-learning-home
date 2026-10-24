// Selected pure geometry, math-learning@a7c05aaa8d9c5eabae4f3453807f830da1cbf279; see docs/implementation/evidence/math-01/origins.json.
export const faces = [
  { id: 1, name: "上面", color: "#e9b44d", mark: "★" },
  { id: 2, name: "左面", color: "#9477b6", mark: "●" },
  { id: 3, name: "前面", color: "#df6c4f", mark: "●" },
  { id: 4, name: "右面", color: "#527eab", mark: "◆" },
  { id: 5, name: "下面", color: "#469684", mark: "●" },
  { id: 6, name: "后面", color: "#b18b66", mark: "▲" },
];
const rad = (d) => (d * Math.PI) / 180;
export function projectPoint([x, y, z], azimuth = 25, elevation = 20) {
  const a = rad(azimuth),
    e = rad(elevation);
  return {
    x: x * Math.cos(a) + z * Math.sin(a),
    y:
      x * Math.sin(a) * Math.sin(e) +
      y * Math.cos(e) -
      z * Math.cos(a) * Math.sin(e),
    depth:
      x * Math.sin(a) * Math.cos(e) -
      y * Math.sin(e) -
      z * Math.cos(a) * Math.cos(e),
  };
}
export function boxFaces(width = 1, height = 1, depth = 1, origin = [0, 0, 0]) {
  const [x, y, z] = origin,
    a = x - width / 2,
    b = x + width / 2,
    c = y - height / 2,
    d = y + height / 2,
    f = z - depth / 2,
    g = z + depth / 2;
  return [
    {
      id: 1,
      points: [
        [a, c, f],
        [b, c, f],
        [b, c, g],
        [a, c, g],
      ],
    },
    {
      id: 2,
      points: [
        [a, c, g],
        [a, c, f],
        [a, d, f],
        [a, d, g],
      ],
    },
    {
      id: 3,
      points: [
        [a, c, f],
        [b, c, f],
        [b, d, f],
        [a, d, f],
      ],
    },
    {
      id: 4,
      points: [
        [b, c, f],
        [b, c, g],
        [b, d, g],
        [b, d, f],
      ],
    },
    {
      id: 5,
      points: [
        [a, d, f],
        [b, d, f],
        [b, d, g],
        [a, d, g],
      ],
    },
    {
      id: 6,
      points: [
        [b, c, g],
        [a, c, g],
        [a, d, g],
        [b, d, g],
      ],
    },
  ];
}
const subtract = (a, b) => a.map((v, i) => v - b[i]);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export function composeSolid(solid, azimuth, elevation) {
  const raw = solid.map((face, index) => {
    const points = face.points.map((p) => projectPoint(p, azimuth, elevation));
    const normal = cross(
      subtract(face.points[1], face.points[0]),
      subtract(face.points[3], face.points[0]),
    );
    const n = projectPoint(normal, azimuth, elevation),
      length = Math.hypot(n.x, n.y, n.depth);
    const light = Math.min(
      1,
      Math.abs(
        (-n.x * 0.35 - n.y * 0.65 + n.depth * 0.68) /
          (length * Math.hypot(0.35, 0.65, 0.68)),
      ),
    );
    return {
      ...face,
      key: index,
      points,
      depth: points.reduce((s, p) => s + p.depth, 0) / 4,
      shade: 0.68 + 0.32 * light,
    };
  });
  const all = raw.flatMap((f) => f.points),
    xs = all.map((p) => p.x),
    ys = all.map((p) => p.y);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const scale = Math.min(
    290 / Math.max(maxX - minX, 0.4),
    245 / Math.max(maxY - minY, 0.4),
    185,
  );
  const ox = 210 - ((minX + maxX) / 2) * scale,
    oy = 160 - ((minY + maxY) / 2) * scale;
  return {
    scale,
    faces: raw
      .sort((a, b) => a.depth - b.depth)
      .map((f) => ({
        ...f,
        points: f.points.map((p) => ({
          ...p,
          x: ox + p.x * scale,
          y: oy + p.y * scale,
        })),
      })),
  };
}
export function tint(hex, factor) {
  return (
    "#" +
    hex
      .slice(1)
      .match(/../g)
      .map((part) =>
        Math.round(parseInt(part, 16) * factor)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
