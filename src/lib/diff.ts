export type DiffKind = "add" | "remove" | "context";

export interface DiffLine {
  kind: DiffKind;
  text: string;
}

/**
 * Minimal LCS-based line diff — enough for reviewing an AI-proposed file
 * rewrite without pulling in a diffing dependency.
 */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const n = a.length;
  const m = b.length;

  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      lcs[i]![j] = a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      result.push({ kind: "context", text: a[i]! });
      i += 1;
      j += 1;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      result.push({ kind: "remove", text: a[i]! });
      i += 1;
    } else {
      result.push({ kind: "add", text: b[j]! });
      j += 1;
    }
  }
  while (i < n) result.push({ kind: "remove", text: a[i++]! });
  while (j < m) result.push({ kind: "add", text: b[j++]! });
  return result;
}

/** Collapses long runs of unchanged lines around each change hunk. */
export function collapseContext(lines: DiffLine[], padding = 2): DiffLine[] {
  const keep = new Array<boolean>(lines.length).fill(false);
  lines.forEach((line, index) => {
    if (line.kind === "context") return;
    for (let k = Math.max(0, index - padding); k <= Math.min(lines.length - 1, index + padding); k += 1) {
      keep[k] = true;
    }
  });
  const out: DiffLine[] = [];
  let skipping = false;
  lines.forEach((line, index) => {
    if (keep[index]) {
      out.push(line);
      skipping = false;
    } else if (!skipping) {
      out.push({ kind: "context", text: "⋯" });
      skipping = true;
    }
  });
  return out;
}
