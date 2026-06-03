import type { Unit } from '../models/types';

export type UnitEstadoColor = {
    label: string;
    colorHex: number;
    colorCss: string;
};

export const UNIT_ESTADO_COLORS: Record<string, UnitEstadoColor> = {
    vendido: { label: 'Vendido', colorHex: 0x22c55e, colorCss: '#22c55e' },
    disponible: { label: 'Disponible', colorHex: 0x3b82f6, colorCss: '#3b82f6' },
    intercambio: { label: 'Intercambio', colorHex: 0x64748b, colorCss: '#64748b' }
};

export const DYNAMIC_ESTADO_COLORS = [
    { colorHex: 0xf59e0b, colorCss: '#f59e0b' },
    { colorHex: 0x06b6d4, colorCss: '#06b6d4' },
    { colorHex: 0xef4444, colorCss: '#ef4444' },
    { colorHex: 0x8b5cf6, colorCss: '#8b5cf6' },
    { colorHex: 0x14b8a6, colorCss: '#14b8a6' },
    { colorHex: 0xf97316, colorCss: '#f97316' },
    { colorHex: 0xec4899, colorCss: '#ec4899' }
];

export const DEFAULT_UNIT_COLOR = 0xffffff;

export const normalizeEstadoKey = (value: unknown) => String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const getDynamicColorIndex = (key: string) => {
    let hash = 0;
    for (let index = 0; index < key.length; index += 1) {
        hash = ((hash << 5) - hash) + key.charCodeAt(index);
        hash |= 0;
    }
    return Math.abs(hash) % DYNAMIC_ESTADO_COLORS.length;
};

export const getEstadoColor = (estado: unknown, labelFallback = 'Sin estado'): UnitEstadoColor => {
    const key = normalizeEstadoKey(estado) || 'sin_estado';
    const knownColor = UNIT_ESTADO_COLORS[key];
    if (knownColor) return knownColor;

    const dynamicColor = DYNAMIC_ESTADO_COLORS[getDynamicColorIndex(key)];
    const label = String(estado ?? '').trim() || labelFallback;
    return {
        label,
        colorHex: dynamicColor.colorHex,
        colorCss: dynamicColor.colorCss
    };
};

export class RulesEngine {
    private estadoColors: Record<string, UnitEstadoColor>;

    constructor(initialEstadoColors: Record<string, UnitEstadoColor> = UNIT_ESTADO_COLORS) {
        this.estadoColors = { ...initialEstadoColors };
    }

    public updateEstadoColors(newEstadoColors: Record<string, UnitEstadoColor>) {
        this.estadoColors = { ...newEstadoColors };
    }

    public resolveColor(unit: Unit): number {
        const estadoColor = this.estadoColors[normalizeEstadoKey(unit.estado)] ?? getEstadoColor(unit.estado);
        return estadoColor?.colorHex ?? DEFAULT_UNIT_COLOR;
    }
}

// Singleton instance for the app.
export const globalRulesEngine = new RulesEngine();
