import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const tailwind = readFileSync(new URL("../../tailwind.config.ts", import.meta.url), "utf8");

function block(source: string, selector: string): string {
  const start = source.indexOf(selector);
  assert.notEqual(start, -1, `missing ${selector}`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  throw new Error(`unclosed ${selector}`);
}

function vars(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  const pattern = /--([\w-]+):\s*([^;]+);/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    out[match[1]] = match[2].trim();
  }
  return out;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sat = s / 100;
  const lig = l / 100;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = lig - c / 2;
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function parseHsl(value: string): { rgb: [number, number, number]; alpha: number } {
  const match = value
    .replace(/^hsl\(/, "")
    .replace(/\)$/, "")
    .trim()
    .match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%(?:\s*\/\s*([\d.]+))?$/);
  assert.ok(match, `unparsed color ${value}`);
  return {
    rgb: hslToRgb(Number(match[1]), Number(match[2]), Number(match[3])),
    alpha: match[4] === undefined ? 1 : Number(match[4]),
  };
}

function blend(
  fg: [number, number, number],
  bg: [number, number, number],
  alpha: number
): [number, number, number] {
  return [
    fg[0] * alpha + bg[0] * (1 - alpha),
    fg[1] * alpha + bg[1] * (1 - alpha),
    fg[2] * alpha + bg[2] * (1 - alpha),
  ];
}

function luminance(rgb: [number, number, number]): number {
  const lin = (channel: number) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const lighter = Math.max(luminance(a), luminance(b));
  const darker = Math.min(luminance(a), luminance(b));
  return (lighter + 0.05) / (darker + 0.05);
}

const root = vars(block(css, ":root"));
const dark = vars(block(css, "\n.dark {"));

test("glass tokens meet opacity, blur, and tailwind wiring", () => {
  const lightBg = parseHsl(root["glass-bg"]);
  const darkBg = parseHsl(dark["glass-bg"]);
  assert.ok(lightBg.alpha >= 0.85, `light glass opacity ${lightBg.alpha}`);
  assert.ok(darkBg.alpha >= 0.8, `dark glass opacity ${darkBg.alpha}`);
  assert.ok(Number.parseFloat(root["glass-blur"]) <= 12);
  assert.ok(Number.parseFloat(dark["glass-blur"]) <= 12);
  assert.match(css, /backdrop-filter:\s*blur\(var\(--glass-blur\)\)/);
  assert.match(css, /@supports not \(backdrop-filter: blur\(1px\)\)/);
  assert.match(css, /@media \(prefers-reduced-transparency: reduce\)/);
  assert.match(css, /\.glass \.bg-card \.text-muted-foreground/);
  for (const token of ["--glass-bg", "--glass-border", "--glass-blur", "--glass-shadow", "--glass-muted"]) {
    assert.match(tailwind, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.notEqual(root["muted-foreground"], root["glass-muted"]);
  assert.notEqual(dark["muted-foreground"], dark["glass-muted"]);
});

test("glass-muted clears WCAG AA on worst-case glass and on the opaque fallback", () => {
  const lightGlass = parseHsl(root["glass-bg"]);
  const darkGlass = parseHsl(dark["glass-bg"]);
  const lightMuted = parseHsl(root["glass-muted"]).rgb;
  const darkMuted = parseHsl(dark["glass-muted"]).rgb;
  const lightFg = parseHsl(root.foreground).rgb;
  const darkFg = parseHsl(dark.foreground).rgb;
  const lightPrimary = parseHsl(root.primary).rgb;
  const darkPrimary = parseHsl(dark.primary).rgb;
  const black: [number, number, number] = [0, 0, 0];
  const white: [number, number, number] = [255, 255, 255];

  const cases: Array<[string, [number, number, number], [number, number, number]]> = [
    ["light muted over primary", lightMuted, blend(lightGlass.rgb, lightPrimary, lightGlass.alpha)],
    ["light muted over black", lightMuted, blend(lightGlass.rgb, black, lightGlass.alpha)],
    ["light foreground over black", lightFg, blend(lightGlass.rgb, black, lightGlass.alpha)],
    ["dark muted over white", darkMuted, blend(darkGlass.rgb, white, darkGlass.alpha)],
    ["dark muted over primary", darkMuted, blend(darkGlass.rgb, darkPrimary, darkGlass.alpha)],
    ["dark foreground over white", darkFg, blend(darkGlass.rgb, white, darkGlass.alpha)],
    ["light muted on opaque card", lightMuted, parseHsl(root.card).rgb],
    ["dark muted on opaque card", darkMuted, parseHsl(dark.card).rgb],
  ];

  const legacy: Array<[string, [number, number, number], [number, number, number]]> = [
    ["legacy light muted over primary", parseHsl(root["muted-foreground"]).rgb, blend(lightGlass.rgb, lightPrimary, lightGlass.alpha)],
    ["legacy light muted over black", parseHsl(root["muted-foreground"]).rgb, blend(lightGlass.rgb, black, lightGlass.alpha)],
    ["legacy dark muted over white", parseHsl(dark["muted-foreground"]).rgb, blend(darkGlass.rgb, white, darkGlass.alpha)],
  ];

  for (const [name, text, surface] of [...cases, ...legacy]) {
    const ratio = contrast(text, surface);
    console.log(`${name}: ${ratio.toFixed(2)}:1`);
    if (!name.startsWith("legacy")) {
      assert.ok(ratio >= 4.5, `${name} is ${ratio.toFixed(2)}:1`);
    }
  }
});
