export function levenshtein(a: string, b: string): number {
  const aLen = a.length;
  const bLen = b.length;

  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  const row: number[] = Array.from({ length: bLen + 1 }, (_, i) => i);

  for (let i = 1; i <= aLen; i++) {
    let prev = i;
    for (let j = 1; j <= bLen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const val = Math.min((row[j] as number) + 1, prev + 1, (row[j - 1] as number) + cost);
      row[j - 1] = prev;
      prev = val;
    }
    row[bLen] = prev;
  }

  return row[bLen] as number;
}

export function findSuggestion(input: string, candidates: string[]): string | undefined {
  if (input.length === 0) return undefined;

  let best: { name: string; distance: number } | undefined;

  for (const candidate of candidates) {
    if (candidate.startsWith(input) || input.startsWith(candidate)) {
      return candidate;
    }

    const distance = levenshtein(input, candidate);
    if (distance <= 3 && (!best || distance < best.distance)) {
      best = { name: candidate, distance };
    }
  }

  return best?.name;
}
