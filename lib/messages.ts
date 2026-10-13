type Dict = { [k: string]: string | Dict };

export function deepMerge<T extends Dict>(base: T, override: Partial<T> | undefined): T {
  if (!override) return base;
  const out: Dict = { ...base };
  for (const [k, v] of Object.entries(override)) {
    const b = out[k];
    out[k] =
      typeof v === 'object' && v !== null && typeof b === 'object' && b !== null
        ? deepMerge(b as Dict, v as Dict)
        : (v as string | Dict);
  }
  return out as T;
}
