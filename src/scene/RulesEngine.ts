import type { Unit } from '../models/types';

export interface ColorRule {
    id: string;
    field: keyof Unit;
    operator: 'equals' | 'not_equals' | 'contains';
    value: any;
    colorHex: number; // e.g. 0x00FF00
    priority: number;
}

// Default set of rules aligned with NT8 data statuses
export const defaultRules: ColorRule[] = [
    { id: 'r1', field: 'status', operator: 'equals', value: 'observation', colorHex: 0xef4444, priority: 100 }, // Red
    { id: 'r2', field: 'status', operator: 'equals', value: 'delivered', colorHex: 0x22c55e, priority: 10 },   // Green
    { id: 'r3', field: 'status', operator: 'equals', value: 'inspection', colorHex: 0x06b6d4, priority: 20 }, // Cyan
    { id: 'r4', field: 'status', operator: 'equals', value: 'financing', colorHex: 0x3b82f6, priority: 30 },  // Blue
    { id: 'r5', field: 'status', operator: 'equals', value: 'sold', colorHex: 0x6366f1, priority: 40 },       // Indigo
    { id: 'r6', field: 'status', operator: 'equals', value: 'available', colorHex: 0xf8fafc, priority: 5 }     // Slate/White
];

export class RulesEngine {
    private rules: ColorRule[];

    constructor(initialRules: ColorRule[] = defaultRules) {
        // Sort by priority descending (highest priority evaluated last, overriding lower)
        // Wait, normally highest priority matches first and returns. Let's do that:
        this.rules = [...initialRules].sort((a, b) => b.priority - a.priority);
    }

    public updateRules(newRules: ColorRule[]) {
        this.rules = [...newRules].sort((a, b) => b.priority - a.priority);
    }

    public resolveColor(unit: Unit): number {
        // Default color if no rule matches
        const DEFAULT_COLOR = 0xffffff;

        for (const rule of this.rules) {
            const unitValue = unit[rule.field];
            
            let matches = false;
            switch (rule.operator) {
                case 'equals':
                    matches = unitValue === rule.value;
                    break;
                case 'not_equals':
                    matches = unitValue !== rule.value;
                    break;
                case 'contains':
                    if (typeof unitValue === 'string' && typeof rule.value === 'string') {
                        matches = unitValue.includes(rule.value);
                    }
                    break;
            }

            if (matches) {
                return rule.colorHex;
            }
        }

        return DEFAULT_COLOR;
    }
}

// Singleton instance for the app
export const globalRulesEngine = new RulesEngine();
