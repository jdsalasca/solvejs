/* eslint-disable complexity, max-lines-per-function, max-params -- recursive math parser and layout */
import { failPdf } from "../errors.js";
import { measureText, resolveFontKey } from "../pdf/fonts.js";
import type { Block, DrawTarget } from "./blocks.js";
import { drawBox } from "./blocks.js";
import type { ResolvedStyle } from "./style.js";

type MathNode =
  | { kind: "text"; text: string }
  | { kind: "symbol"; text: string }
  | { kind: "group"; children: MathNode[] }
  | { kind: "sup"; base: MathNode; sup: MathNode }
  | { kind: "sub"; base: MathNode; sub: MathNode }
  | { kind: "frac"; num: MathNode; den: MathNode }
  | { kind: "sqrt"; body: MathNode };

const SYMBOLS: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", zeta: "ζ", eta: "η",
  theta: "θ", iota: "ι", kappa: "κ", lambda: "λ", mu: "μ", nu: "ν", xi: "ξ",
  omicron: "ο", pi: "π", rho: "ρ", sigma: "σ", tau: "τ", upsilon: "υ", phi: "φ",
  chi: "χ", psi: "ψ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ", Pi: "Π", Sigma: "Σ",
  Phi: "Φ", Psi: "Ψ", Omega: "Ω",
  sum: "∑", prod: "∏", int: "∫", sqrt: "√", infty: "∞", le: "≤", leq: "≤",
  ge: "≥", geq: "≥", ne: "≠", neq: "≠", approx: "≈", equiv: "≡", pm: "±",
  times: "×", cdot: "·", div: "÷", partial: "∂", nabla: "∇",
  to: "→", rightarrow: "→", leftarrow: "←", leftrightarrow: "↔", Rightarrow: "⇒",
  Leftrightarrow: "⇔", forall: "∀", exists: "∃", in: "∈", notin: "∉",
  subset: "⊂", supset: "⊃", cup: "∪", cap: "∩", and: "∧", or: "∨", neg: "¬"
};

class MathParser {
  private index = 0;

  constructor(private readonly source: string) {}

  parse(): MathNode[] {
    const nodes = this.parseNodes(false);
    if (this.index < this.source.length) failPdf("PDF_INVALID_INPUT", "Unexpected closing brace in math formula.");
    return nodes;
  }

  private parseNodes(stop: boolean): MathNode[] {
    const nodes: MathNode[] = [];
    while (this.index < this.source.length) {
      const char = this.source[this.index];
      if (char === "}") {
        if (!stop) break;
        this.index += 1;
        break;
      }
      if (char === "\\") {
        nodes.push(this.command());
        continue;
      }
      if (char === "^" || char === "_") {
        this.index += 1;
        const atom = this.atom();
        const base = nodes.pop();
        if (!base) failPdf("PDF_INVALID_INPUT", "Superscript or subscript requires a base.");
        nodes.push(char === "^" ? { kind: "sup", base, sup: atom } : { kind: "sub", base, sub: atom });
        continue;
      }
      if (char === "{") {
        this.index += 1;
        nodes.push({ kind: "group", children: this.parseNodes(true) });
        continue;
      }
      let text = "";
      while (this.index < this.source.length) {
        const current = this.source[this.index];
        if (current === "\\" || current === "^" || current === "_" || current === "{" || current === "}") break;
        text += current;
        this.index += 1;
      }
      if (text.length > 0) nodes.push({ kind: "text", text });
    }
    return nodes;
  }

  private atom(): MathNode {
    this.skipSpaces();
    if (this.index >= this.source.length) failPdf("PDF_INVALID_INPUT", "Expected an atom after superscript or subscript.");
    const char = this.source[this.index];
    if (char === "{") {
      this.index += 1;
      return { kind: "group", children: this.parseNodes(true) };
    }
    if (char === "\\") return this.command();
    this.index += 1;
    return { kind: "text", text: char };
  }

  private group(): MathNode {
    this.skipSpaces();
    if (this.source[this.index] !== "{") failPdf("PDF_INVALID_INPUT", "Expected a braced math group.");
    this.index += 1;
    return { kind: "group", children: this.parseNodes(true) };
  }

  private command(): MathNode {
    this.index += 1;
    const start = this.index;
    while (this.index < this.source.length && /[A-Za-z]/.test(this.source[this.index])) this.index += 1;
    const name = this.source.slice(start, this.index);
    if (name === "frac") return { kind: "frac", num: this.group(), den: this.group() };
    if (name === "sqrt") return { kind: "sqrt", body: this.group() };
    if (name === "text") {
      this.skipSpaces();
      if (this.source[this.index] !== "{") failPdf("PDF_INVALID_INPUT", "Expected a braced text group.");
      const end = this.source.indexOf("}", this.index);
      if (end < 0) failPdf("PDF_INVALID_INPUT", "Unclosed text group.");
      const text = this.source.slice(this.index + 1, end);
      this.index = end + 1;
      return { kind: "text", text };
    }
    const symbol = SYMBOLS[name];
    if (!symbol) failPdf("PDF_INVALID_INPUT", `Unsupported math command: \\${name}.`, { command: name });
    return { kind: "symbol", text: symbol };
  }

  private skipSpaces(): void {
    while (this.source[this.index] === " ") this.index += 1;
  }
}

type Measured = { node: MathNode; width: number; ascent: number; descent: number };

function measure(node: MathNode, size: number, family: string, italic: boolean): Measured {
  if (node.kind === "text") {
    const font = resolveFontKey(family as "helvetica" | "times" | "courier" | "symbol", false, italic);
    return { node, width: measureText(node.text, font, size), ascent: size * 0.75, descent: size * 0.25 };
  }
  if (node.kind === "symbol") {
    const font = resolveFontKey("symbol", false, false);
    return { node, width: measureText(node.text, font, size), ascent: size * 0.78, descent: size * 0.22 };
  }
  if (node.kind === "group") {
    const parts = node.children.map((child) => measure(child, size, family, italic));
    return {
      node,
      width: parts.reduce((sum, part) => sum + part.width, 0),
      ascent: Math.max(size * 0.75, ...parts.map((part) => part.ascent)),
      descent: Math.max(size * 0.25, ...parts.map((part) => part.descent))
    };
  }
  if (node.kind === "sup") {
    const base = measure(node.base, size, family, italic);
    const sup = measure(node.sup, size * 0.7, family, italic);
    return { node, width: base.width + sup.width, ascent: Math.max(base.ascent, sup.ascent + size * 0.45), descent: base.descent };
  }
  if (node.kind === "sub") {
    const base = measure(node.base, size, family, italic);
    const sub = measure(node.sub, size * 0.7, family, italic);
    return { node, width: base.width + sub.width, ascent: base.ascent, descent: Math.max(base.descent, sub.descent + size * 0.25) };
  }
  if (node.kind === "frac") {
    const num = measure(node.num, size * 0.8, family, italic);
    const den = measure(node.den, size * 0.8, family, italic);
    return {
      node,
      width: Math.max(num.width, den.width) + 6,
      ascent: num.ascent + size * 0.35,
      descent: den.descent + size * 0.3
    };
  }
  const body = measure(node.body, size * 0.95, family, italic);
  return { node, width: body.width + size * 0.55, ascent: body.ascent + size * 0.18, descent: body.descent };
}

function drawNode(
  target: DrawTarget,
  node: MathNode,
  x: number,
  baseline: number,
  size: number,
  family: string,
  italic: boolean,
  color: string
): number {
  if (node.kind === "text") {
    const font = resolveFontKey(family as "helvetica" | "times" | "courier" | "symbol", false, italic);
    const width = measureText(node.text, font, size);
    target.page.ops.push({ kind: "text", x, y: baseline, text: node.text, font, size, color });
    return width;
  }
  if (node.kind === "symbol") {
    const font = resolveFontKey("symbol", false, false);
    const width = measureText(node.text, font, size);
    target.page.ops.push({ kind: "text", x, y: baseline, text: node.text, font, size, color });
    return width;
  }
  if (node.kind === "group") {
    let cursor = x;
    for (const child of node.children) cursor += drawNode(target, child, cursor, baseline, size, family, italic, color);
    return cursor - x;
  }
  if (node.kind === "sup") {
    const width = drawNode(target, node.base, x, baseline, size, family, italic, color);
    return width + drawNode(target, node.sup, x + width, baseline - size * 0.35, size * 0.7, family, italic, color);
  }
  if (node.kind === "sub") {
    const width = drawNode(target, node.base, x, baseline, size, family, italic, color);
    return width + drawNode(target, node.sub, x + width, baseline + size * 0.25, size * 0.7, family, italic, color);
  }
  if (node.kind === "frac") {
    const width = Math.max(measure(node.num, size * 0.8, family, italic).width, measure(node.den, size * 0.8, family, italic).width) + 6;
    const numWidth = measure(node.num, size * 0.8, family, italic).width;
    const denWidth = measure(node.den, size * 0.8, family, italic).width;
    drawNode(target, node.num, x + (width - numWidth) / 2, baseline - size * 0.45, size * 0.8, family, italic, color);
    drawNode(target, node.den, x + (width - denWidth) / 2, baseline + size * 0.4, size * 0.8, family, italic, color);
    target.page.ops.push({ kind: "line", x1: x + 1, y1: baseline - size * 0.05, x2: x + width - 1, y2: baseline - size * 0.05, color, width: Math.max(0.5, size * 0.05) });
    return width;
  }
  const bodyWidth = measure(node.body, size * 0.95, family, italic).width;
  const width = bodyWidth + size * 0.55;
  const points = [
    { x, y: baseline - size * 0.1 },
    { x: x + size * 0.14, y: baseline + size * 0.02 },
    { x: x + size * 0.3, y: baseline - size * 0.12 },
    { x: x + size * 0.42, y: baseline - size * 0.55 },
    { x: x + width, y: baseline - size * 0.55 }
  ];
  target.page.ops.push({ kind: "polygon", points, stroke: color, lineWidth: Math.max(0.6, size * 0.05), lineJoin: "round", closed: false });
  drawNode(target, node.body, x + size * 0.5, baseline, size * 0.95, family, italic, color);
  return width;
}

export type MathBlock = Block & { kind: "math"; width: number; height: number };

export function mathBlock(tex: string, style: ResolvedStyle, available: number): MathBlock {
  if (typeof tex !== "string" || tex.trim().length === 0) failPdf("PDF_INVALID_INPUT", "Math requires a non-empty tex string.");
  if (tex.length > 20_000) failPdf("PDF_LIMIT_EXCEEDED", "Math formula is too long.", { length: tex.length });
  const nodes = new MathParser(tex).parse();
  const contentWidth = available - style.paddingLeft - style.paddingRight;
  const measured = measure({ kind: "group", children: nodes }, style.fontSize, style.fontFamily, style.italic);
  const scale = measured.width > contentWidth ? contentWidth / measured.width : 1;
  const size = style.fontSize * scale;
  const remeasured = measure({ kind: "group", children: nodes }, size, style.fontFamily, style.italic);
  const width = Math.min(available, remeasured.width + style.paddingLeft + style.paddingRight);
  const height = style.paddingTop + style.paddingBottom + remeasured.ascent + remeasured.descent;
  return {
    kind: "math",
    width,
    height,
    marginTop: style.marginTop,
    marginBottom: style.marginBottom,
    draw(target, x, y) {
      drawBox(target, { x, y, width, height }, style);
      const offset =
        style.align === "center"
          ? (contentWidth - remeasured.width) / 2
          : style.align === "right"
            ? contentWidth - remeasured.width
            : 0;
      drawNode(
        target,
        { kind: "group", children: nodes },
        x + style.paddingLeft + Math.max(0, offset),
        y + style.paddingTop + remeasured.ascent,
        size,
        style.fontFamily,
        style.italic,
        style.color
      );
    }
  };
}
