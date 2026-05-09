// src/utils/normalizers.ts

export const normalizeText = (value: unknown) => String(value ?? '').trim();

export const normalizeLookupKey = (value: unknown) => normalizeText(value)
  .toLowerCase()
  .replace(/\s+/g, '')
  .replace(/_/g, '-');

export const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, '').trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

export const toNumberOrZero = (value: unknown): number => toNumberOrNull(value) ?? 0;

export const toBooleanOrNull = (value: unknown): boolean | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['si', 'sí', 's', 'yes', 'true', '1', 'entregado'].includes(normalized)) return true;
    if (['no', 'n', 'false', '0'].includes(normalized)) return false;
  }
  return null;
};

export const parseDateValue = (value: unknown): Date | null => {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number' && Number.isFinite(value)) {
    // Excel serial date (days since 1899-12-30)
    if (value > 20000) {
      const ms = Math.round((value - 25569) * 86400 * 1000);
      const date = new Date(ms);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const unix = new Date(value);
    return Number.isNaN(unix.getTime()) ? null : unix;
  }

  const raw = normalizeText(value);
  if (!raw) return null;

  const nativeParsed = new Date(raw);
  if (!Number.isNaN(nativeParsed.getTime())) return nativeParsed;

  const slash = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slash) {
    const day = Number(slash[1]);
    const month = Number(slash[2]) - 1;
    const year = Number(slash[3].length === 2 ? `20${slash[3]}` : slash[3]);
    const custom = new Date(year, month, day);
    return Number.isNaN(custom.getTime()) ? null : custom;
  }

  return null;
};
