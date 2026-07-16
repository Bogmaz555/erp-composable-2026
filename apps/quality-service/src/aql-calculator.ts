/** Uproszczona tablica AQL ISO 2859-1 (Normal II, AQL 2.5%) */
const LOT_TO_SAMPLE: [number, number][] = [
  [8, 2], [15, 3], [25, 5], [50, 8], [90, 13], [150, 20],
  [280, 32], [500, 50], [1200, 80], [3200, 125], [10000, 200],
];

const SAMPLE_AC_RE: Record<number, { accept: number; reject: number }> = {
  2: { accept: 0, reject: 1 },
  3: { accept: 0, reject: 1 },
  5: { accept: 0, reject: 1 },
  8: { accept: 0, reject: 1 },
  13: { accept: 1, reject: 2 },
  20: { accept: 1, reject: 2 },
  32: { accept: 2, reject: 3 },
  50: { accept: 3, reject: 4 },
  80: { accept: 5, reject: 6 },
  125: { accept: 7, reject: 8 },
  200: { accept: 10, reject: 11 },
};

export function calcSampleSize(lotSize: number): number {
  if (lotSize <= 0) return 0;
  for (const [maxLot, sample] of LOT_TO_SAMPLE) {
    if (lotSize <= maxLot) return sample;
  }
  return 200;
}

export function calcAcceptReject(sampleSize: number): { acceptNumber: number; rejectNumber: number } {
  const row = SAMPLE_AC_RE[sampleSize] ?? { accept: Math.floor(sampleSize * 0.05), reject: Math.ceil(sampleSize * 0.05) + 1 };
  return { acceptNumber: row.accept, rejectNumber: row.reject };
}

export function evaluateAql(defects: number, acceptNumber: number, rejectNumber: number): 'ACCEPT' | 'REJECT' | 'PENDING' {
  if (defects <= acceptNumber) return 'ACCEPT';
  if (defects >= rejectNumber) return 'REJECT';
  return 'PENDING';
}
