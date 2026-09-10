export function record(values: number[], value: number) {
  values.push(value);
  if (values.length > 180) values.shift();
}
export function distribution(values: number[]) {
  const a = [...values].sort((x, y) => x - y);
  return {
    samples: a.length,
    meanMs: a.length ? a.reduce((x, y) => x + y, 0) / a.length : null,
    p95Ms: a.length ? a[Math.floor(a.length * 0.95)] : null,
  };
}
