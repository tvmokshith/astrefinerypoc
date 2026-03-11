export function linearForecast(values: number[], steps: number) {
    const n = values.length;
    if (n < 2) return Array.from({ length: steps }, () => values[n - 1] ?? 0);
    const xs = values.map((_, i) => i);
    const xMean = xs.reduce((a, b) => a + b, 0) / n;
    const yMean = values.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i += 1) {
        num += (xs[i] - xMean) * (values[i] - yMean);
        den += (xs[i] - xMean) ** 2;
    }
    const slope = den === 0 ? 0 : num / den;
    const intercept = yMean - slope * xMean;
    return Array.from({ length: steps }, (_, j) => intercept + slope * (n + j));
}
