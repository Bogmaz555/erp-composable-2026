/** X-bar control chart limits (3-sigma, subgroup n=1). */
export function calcControlLimits(values: number[]) {
  if (values.length < 2) {
    const v = values[0] ?? 0;
    return { mean: v, ucl: v, lcl: v, sigma: 0, cp: null, cpk: null };
  }
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  const sigma = Math.sqrt(variance);
  const ucl = mean + 3 * sigma;
  const lcl = mean - 3 * sigma;
  return { mean, ucl, lcl, sigma };
}

export function calcCapability(values: number[], usl?: number | null, lsl?: number | null) {
  const { mean, sigma } = calcControlLimits(values);
  if (!sigma || usl == null || lsl == null) return { cp: null, cpk: null };
  const cp = (usl - lsl) / (6 * sigma);
  const cpkUpper = (usl - mean) / (3 * sigma);
  const cpkLower = (mean - lsl) / (3 * sigma);
  const cpk = Math.min(cpkUpper, cpkLower);
  return { cp: round(cp), cpk: round(cpk) };
}

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}
