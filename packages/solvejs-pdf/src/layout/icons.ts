import type { Block } from "./blocks.js";

/** Built-in vector icon names. */
export type PdfIconName =
  | "check"
  | "close"
  | "plus"
  | "minus"
  | "arrow-right"
  | "arrow-left"
  | "arrow-up"
  | "arrow-down"
  | "star"
  | "spark"
  | "bolt"
  | "info"
  | "warning"
  | "mail"
  | "lock"
  | "calendar"
  | "search"
  | "download"
  | "upload"
  | "external"
  | "clock"
  | "chart"
  | "doc"
  | "folder"
  | "user"
  | "globe";

type IconPath = { points: Array<[number, number]>; closed?: boolean; fill?: boolean };
type IconDefinition = { paths: IconPath[] };

function circle(cx: number, cy: number, radius: number, steps = 20): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  for (let index = 0; index < steps; index += 1) {
    const angle = (index / steps) * Math.PI * 2;
    points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
  }
  return points;
}

function star(cx: number, cy: number, outer: number, inner: number): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (index / 10) * Math.PI * 2;
    points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
  }
  return points;
}

const ICONS: Record<PdfIconName, IconDefinition> = {
  check: { paths: [{ points: [[4, 12], [9, 18], [20, 6]], closed: false }] },
  close: { paths: [{ points: [[5, 5], [19, 19]], closed: false }, { points: [[19, 5], [5, 19]], closed: false }] },
  plus: { paths: [{ points: [[12, 4], [12, 20]], closed: false }, { points: [[4, 12], [20, 12]], closed: false }] },
  minus: { paths: [{ points: [[4, 12], [20, 12]], closed: false }] },
  "arrow-right": { paths: [{ points: [[4, 12], [20, 12]], closed: false }, { points: [[13, 5], [20, 12], [13, 19]], closed: false }] },
  "arrow-left": { paths: [{ points: [[20, 12], [4, 12]], closed: false }, { points: [[11, 5], [4, 12], [11, 19]], closed: false }] },
  "arrow-up": { paths: [{ points: [[12, 20], [12, 4]], closed: false }, { points: [[5, 11], [12, 4], [19, 11]], closed: false }] },
  "arrow-down": { paths: [{ points: [[12, 4], [12, 20]], closed: false }, { points: [[5, 13], [12, 20], [19, 13]], closed: false }] },
  star: { paths: [{ points: star(12, 12, 10, 4.4), fill: true }] },
  spark: { paths: [{ points: star(12, 12, 10, 2.4), fill: true }] },
  bolt: { paths: [{ points: [[13, 2], [5, 14], [11, 14], [10, 22], [19, 9], [13, 9]], fill: true }] },
  info: { paths: [{ points: circle(12, 12, 9), closed: true }, { points: [[12, 10], [12, 17]], closed: false }, { points: circle(12, 7, 0.9, 8), fill: true }] },
  warning: { paths: [{ points: [[12, 3], [22, 20], [2, 20]], closed: true }, { points: [[12, 9], [12, 15]], closed: false }, { points: circle(12, 18, 0.9, 8), fill: true }] },
  mail: { paths: [{ points: [[3, 6], [21, 6], [21, 18], [3, 18]], closed: true }, { points: [[3, 7], [12, 14], [21, 7]], closed: false }] },
  lock: { paths: [{ points: [[5, 11], [19, 11], [19, 21], [5, 21]], closed: true }, { points: [[8, 11], [8, 7], [9, 4], [12, 3], [15, 4], [16, 7], [16, 11]], closed: false }] },
  calendar: { paths: [{ points: [[3, 5], [21, 5], [21, 21], [3, 21]], closed: true }, { points: [[3, 10], [21, 10]], closed: false }, { points: [[8, 2], [8, 7]], closed: false }, { points: [[16, 2], [16, 7]], closed: false }] },
  search: { paths: [{ points: circle(10, 10, 7), closed: true }, { points: [[15, 15], [21, 21]], closed: false }] },
  download: { paths: [{ points: [[12, 3], [12, 16]], closed: false }, { points: [[6, 10], [12, 16], [18, 10]], closed: false }, { points: [[4, 20], [20, 20]], closed: false }] },
  upload: { paths: [{ points: [[12, 16], [12, 3]], closed: false }, { points: [[6, 9], [12, 3], [18, 9]], closed: false }, { points: [[4, 20], [20, 20]], closed: false }] },
  external: { paths: [{ points: [[14, 4], [20, 4], [20, 10]], closed: false }, { points: [[20, 4], [11, 13]], closed: false }, { points: [[18, 14], [18, 20], [4, 20], [4, 6], [10, 6]], closed: false }] },
  clock: { paths: [{ points: circle(12, 12, 9), closed: true }, { points: [[12, 6], [12, 12], [16, 15]], closed: false }] },
  chart: { paths: [{ points: [[4, 20], [4, 12], [9, 12], [9, 20]], closed: true, fill: true }, { points: [[10, 20], [10, 7], [15, 7], [15, 20]], closed: true, fill: true }, { points: [[16, 20], [16, 3], [21, 3], [21, 20]], closed: true, fill: true }] },
  doc: { paths: [{ points: [[5, 3], [15, 3], [20, 8], [20, 21], [5, 21]], closed: true }, { points: [[15, 3], [15, 8], [20, 8]], closed: false }] },
  folder: { paths: [{ points: [[3, 6], [10, 6], [12, 8], [21, 8], [21, 20], [3, 20]], closed: true }] },
  user: { paths: [{ points: circle(12, 8, 4.5), closed: true }, { points: [[4, 21], [5, 16], [8, 14], [12, 13], [16, 14], [19, 16], [20, 21]], closed: false }] },
  globe: { paths: [{ points: circle(12, 12, 9), closed: true }, { points: [[3, 12], [21, 12]], closed: false }, { points: [[12, 3], [12, 21]], closed: false }] }
};

export type IconBlock = Block & {
  kind: "icon";
  name: PdfIconName;
  size: number;
  color: string;
  strokeWidth: number;
  marginTop: number;
  marginBottom: number;
};

// eslint-disable-next-line max-params -- icon geometry keeps size, color and spacing explicit
export function iconBlock(name: PdfIconName, size: number, color: string, strokeWidth: number, marginTop = 0, marginBottom = 0): IconBlock {
  const definition = ICONS[name];
  const scale = size / 24;
  return {
    kind: "icon",
    name,
    size,
    color,
    strokeWidth,
    height: size,
    marginTop,
    marginBottom,
    draw(target, x, y) {
      for (const path of definition.paths) {
        target.page.ops.push({
          kind: "polygon",
          points: path.points.map(([px, py]) => ({ x: x + px * scale, y: y + py * scale })),
          ...(path.fill ? { fill: color } : { stroke: color, lineWidth: strokeWidth }),
          lineJoin: "round",
          closed: path.closed !== false
        });
      }
    }
  };
}

export function iconNames(): PdfIconName[] {
  return Object.keys(ICONS) as PdfIconName[];
}
