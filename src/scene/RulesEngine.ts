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

export const DEFAULT_UNIT_COLOR = 0xffffff;

export const normalizeEstadoKey = (value: unknown) => String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export class RulesEngine {
    private estadoColors: Record<string, UnitEstadoColor>;

    constructor(initialEstadoColors: Record<string, UnitEstadoColor> = UNIT_ESTADO_COLORS) {
        this.estadoColors = { ...initialEstadoColors };
    }

    public updateEstadoColors(newEstadoColors: Record<string, UnitEstadoColor>) {
        this.estadoColors = { ...newEstadoColors };
    }

    public resolveColor(unit: Unit): number {
        const estadoColor = this.estadoColors[normalizeEstadoKey(unit.estado)];
        return estadoColor?.colorHex ?? DEFAULT_UNIT_COLOR;
    }
}

// Singleton instance for the app.
export const globalRulesEngine = new RulesEngine();
