<template>
  <div ref="rootEl" class="excel-filter">
    <button class="filter-trigger" :class="{ active: activeFilterCount > 0 || isOpen }" @click="togglePanel">
      <i class="bi bi-funnel"></i>
      <span>Filters</span>
      <span v-if="activeFilterCount > 0" class="filter-badge">{{ activeFilterCount }}</span>
    </button>

    <div v-if="isOpen" class="filter-popover">
      <div class="filter-actions">
        <button class="filter-action" @click="sortItems('asc')">
          <i class="bi bi-sort-alpha-down"></i>
          Sort A to Z
        </button>
        <button class="filter-action" @click="sortItems('desc')">
          <i class="bi bi-sort-alpha-up"></i>
          Sort Z to A
        </button>
        <button class="filter-action danger" @click="clearAllFilters">
          <i class="bi bi-x-circle"></i>
          Clear All Filters
        </button>
      </div>

      <div class="filter-section">
        <div class="filter-section-title">Fields</div>
        <input v-model="fieldSearch" class="filter-search" type="text" placeholder="Search fields" />
        <div class="field-list">
          <label v-for="field in visibleFilterFields" :key="field.key" class="field-option">
            <input v-model="draftSelectedFields" type="checkbox" :value="field.key" />
            <span>{{ field.label }}</span>
          </label>
          <div v-if="visibleFilterFields.length === 0" class="empty-filter-state">No fields found</div>
        </div>
      </div>

      <div class="filter-section">
        <div class="filter-section-title">Filter values</div>
        <div class="filter-help">Booleanos usan Si/No. Fechas y montos usan rango Desde/Hasta.</div>

        <div v-if="draftSelectedFields.length === 0" class="empty-filter-state">
          Select fields to add filter values.
        </div>

        <div v-for="fieldKey in draftSelectedFields" :key="fieldKey" class="value-filter-row">
          <label>{{ fieldLabel(fieldKey) }}</label>
          <select v-if="fieldKind(fieldKey) === 'boolean'" v-model="draftValues[fieldKey]">
            <option value="">Todos</option>
            <option value="true">Si</option>
            <option value="false">No</option>
          </select>
          <div v-else-if="fieldKind(fieldKey) === 'date'" class="range-filter-inputs">
            <input v-model="draftRanges[fieldKey].from" type="date" aria-label="Desde" />
            <input v-model="draftRanges[fieldKey].to" type="date" aria-label="Hasta" />
          </div>
          <div v-else-if="fieldKind(fieldKey) === 'number'" class="range-filter-inputs">
            <input v-model="draftRanges[fieldKey].from" type="number" step="0.01" placeholder="Desde" />
            <input v-model="draftRanges[fieldKey].to" type="number" step="0.01" placeholder="Hasta" />
          </div>
          <input
            v-else
            v-model="draftValues[fieldKey]"
            type="text"
            :placeholder="`Contiene ${fieldLabel(fieldKey)}`"
          />
        </div>
      </div>

      <div class="filter-footer">
        <button class="btn-cancel" @click="cancelPanel">Cancel</button>
        <button class="btn-ok" @click="applyDraftFilters">OK</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';

export type JsonRecord = Record<string, unknown>;

export interface FilterableField {
  key: string;
  label: string;
}

export interface ActiveJsonFilter {
  field: string;
  value: string;
}

type FilterKind = 'text' | 'boolean' | 'date' | 'number';
type RangeFilterValue = { from: string; to: string };

export interface FilterResult<T = unknown> {
  filteredItems: T[];
  activeFilters: ActiveJsonFilter[];
}

const props = withDefaults(defineProps<{
  items: unknown[];
  excludeFields?: string[];
  visibleFields?: string[];
}>(), {
  excludeFields: () => [],
  visibleFields: () => []
});

const emit = defineEmits<{
  (event: 'apply', result: FilterResult): void;
  (event: 'clear', result: FilterResult): void;
}>();

const rootEl = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const fieldSearch = ref('');
const draftSelectedFields = ref<string[]>([]);
const appliedSelectedFields = ref<string[]>([]);
const draftValues = reactive<Record<string, string>>({});
const appliedValues = reactive<Record<string, string>>({});
const draftRanges = reactive<Record<string, RangeFilterValue>>({});
const appliedRanges = reactive<Record<string, RangeFilterValue>>({});

const normalizeText = (value: unknown) => String(value ?? '')
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const toSearchableValue = (value: unknown) => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value === null || value === undefined) return '';
  return String(value);
};

const parseNumberValue = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/,/g, '').trim();
  if (normalized === '') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseDateTime = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.getTime();
  if (typeof value !== 'string' || value.trim() === '') return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
};

const ensureRange = (target: Record<string, RangeFilterValue>, field: string) => {
  if (!target[field]) {
    target[field] = { from: '', to: '' };
  }
  return target[field];
};

const getFieldValues = (field: string) =>
  props.items
    .map((item) => ((item ?? {}) as JsonRecord)[field])
    .filter((value) => value !== null && value !== undefined && value !== '');

const isBooleanLike = (value: unknown) => {
  if (typeof value === 'boolean') return true;
  if (typeof value !== 'string') return false;
  return ['true', 'false', 'si', 'sí', 'no'].includes(normalizeText(value));
};

const isDateFieldKey = (field: string) => normalizeText(field).includes('fecha') || normalizeText(field).includes('date');

const isAmountFieldKey = (field: string) => {
  const key = normalizeText(field);
  return ['precio', 'monto', 'total', 'pagado', 'adeudado', 'inicial', 'balance', 'metraje'].some((token) => key.includes(token));
};

const formatFieldLabel = (key: string) => key
  .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/^./, (char) => char.toUpperCase());

const filterableFields = computed<FilterableField[]>(() => {
  const fields = new Set<string>();
  const excluded = new Set(props.excludeFields);
  const allowed = new Set(props.visibleFields);
  const hasAllowList = props.visibleFields.length > 0;

  for (const item of props.items) {
    for (const key of Object.keys((item ?? {}) as JsonRecord)) {
      if (excluded.has(key)) continue;
      if (hasAllowList && !allowed.has(key)) continue;
      fields.add(key);
    }
  }

  return [...fields]
    .sort((a, b) => a.localeCompare(b))
    .map((key) => ({ key, label: formatFieldLabel(key) }));
});

const visibleFilterFields = computed(() => {
  const search = normalizeText(fieldSearch.value);
  if (!search) return filterableFields.value;
  return filterableFields.value.filter((field) =>
    normalizeText(field.key).includes(search) || normalizeText(field.label).includes(search)
  );
});

const activeFilters = computed<ActiveJsonFilter[]>(() =>
  appliedSelectedFields.value
    .map((field) => {
      const kind = fieldKind(field);
      if (kind === 'date' || kind === 'number') {
        const range = ensureRange(appliedRanges, field);
        return { field, value: [range.from, range.to].filter(Boolean).join(' - ') };
      }
      return { field, value: appliedValues[field]?.trim() ?? '' };
    })
    .filter((filter) => filter.value !== '')
);

const activeFilterCount = computed(() => activeFilters.value.length);

const fieldLabel = (key: string) =>
  filterableFields.value.find((field) => field.key === key)?.label ?? formatFieldLabel(key);

const fieldKind = (field: string): FilterKind => {
  const values = getFieldValues(field);
  if (values.length === 0) return 'text';

  if (values.every(isBooleanLike)) return 'boolean';
  if (isDateFieldKey(field) || values.every((value) => parseDateTime(value) !== null)) return 'date';
  if (isAmountFieldKey(field) && values.every((value) => parseNumberValue(value) !== null)) return 'number';
  if (values.every((value) => typeof value === 'number' || parseNumberValue(value) !== null)) return 'number';

  return 'text';
};

const booleanFilterMatches = (value: unknown, expected: string) => {
  if (!expected) return true;
  const normalized = normalizeText(value);
  const actual = value === true || normalized === 'true' || normalized === 'si' || normalized === 'sí';
  return expected === 'true' ? actual : !actual;
};

const dateRangeMatches = (value: unknown, range: RangeFilterValue) => {
  const timestamp = parseDateTime(value);
  if (timestamp === null) return false;
  const from = range.from ? Date.parse(`${range.from}T00:00:00`) : null;
  const to = range.to ? Date.parse(`${range.to}T23:59:59`) : null;
  if (from !== null && timestamp < from) return false;
  if (to !== null && timestamp > to) return false;
  return true;
};

const numberRangeMatches = (value: unknown, range: RangeFilterValue) => {
  const number = parseNumberValue(value);
  if (number === null) return false;
  const from = range.from === '' ? null : Number(range.from);
  const to = range.to === '' ? null : Number(range.to);
  if (from !== null && Number.isFinite(from) && number < from) return false;
  if (to !== null && Number.isFinite(to) && number > to) return false;
  return true;
};

const filterItems = (items: unknown[], filters: ActiveJsonFilter[]) => {
  if (filters.length === 0) return [...items];

  return items.filter((item) =>
    filters.every((filter) => {
      const value = ((item ?? {}) as JsonRecord)[filter.field];
      const kind = fieldKind(filter.field);
      if (kind === 'boolean') return booleanFilterMatches(value, appliedValues[filter.field] ?? '');
      if (kind === 'date') return dateRangeMatches(value, ensureRange(appliedRanges, filter.field));
      if (kind === 'number') return numberRangeMatches(value, ensureRange(appliedRanges, filter.field));
      return normalizeText(toSearchableValue(value)).includes(normalizeText(filter.value));
    })
  );
};

const buildFilterResult = (items = filterItems(props.items, activeFilters.value)) => ({
  filteredItems: items,
  activeFilters: activeFilters.value
});

const emitAppliedResult = (items = filterItems(props.items, activeFilters.value)) => {
  emit('apply', buildFilterResult(items));
};

const emitClearResult = (items = [...props.items]) => {
  emit('clear', buildFilterResult(items));
};

const syncDraftFromApplied = () => {
  draftSelectedFields.value = [...appliedSelectedFields.value];
  for (const key of Object.keys(draftValues)) {
    delete draftValues[key];
  }
  for (const key of Object.keys(draftRanges)) {
    delete draftRanges[key];
  }
  for (const field of draftSelectedFields.value) {
    if (fieldKind(field) === 'date' || fieldKind(field) === 'number') {
      const appliedRange = ensureRange(appliedRanges, field);
      draftRanges[field] = { ...appliedRange };
    } else {
      draftValues[field] = appliedValues[field] ?? '';
    }
  }
};

const togglePanel = () => {
  if (!isOpen.value) {
    syncDraftFromApplied();
  }
  isOpen.value = !isOpen.value;
};

const applyDraftFilters = () => {
  appliedSelectedFields.value = [...draftSelectedFields.value];

  for (const key of Object.keys(appliedValues)) {
    delete appliedValues[key];
  }
  for (const key of Object.keys(appliedRanges)) {
    delete appliedRanges[key];
  }
  for (const field of appliedSelectedFields.value) {
    if (fieldKind(field) === 'date' || fieldKind(field) === 'number') {
      const range = ensureRange(draftRanges, field);
      appliedRanges[field] = { from: range.from ?? '', to: range.to ?? '' };
    } else {
      appliedValues[field] = draftValues[field] ?? '';
    }
  }

  emitAppliedResult();
  isOpen.value = false;
};

const cancelPanel = () => {
  syncDraftFromApplied();
  isOpen.value = false;
};

const clearAllFilters = () => {
  draftSelectedFields.value = [];
  appliedSelectedFields.value = [];
  for (const key of Object.keys(draftValues)) {
    delete draftValues[key];
  }
  for (const key of Object.keys(appliedValues)) {
    delete appliedValues[key];
  }
  for (const key of Object.keys(draftRanges)) {
    delete draftRanges[key];
  }
  for (const key of Object.keys(appliedRanges)) {
    delete appliedRanges[key];
  }
  emitClearResult();
  isOpen.value = false;
};

const sortItems = (direction: 'asc' | 'desc') => {
  const sortField = draftSelectedFields.value[0] ?? filterableFields.value[0]?.key;
  if (!sortField) {
    emitAppliedResult([...props.items]);
    return;
  }

  const sortedItems = [...filterItems(props.items, activeFilters.value)].sort((a, b) => {
    const left = normalizeText(toSearchableValue(((a ?? {}) as JsonRecord)[sortField]));
    const right = normalizeText(toSearchableValue(((b ?? {}) as JsonRecord)[sortField]));
    return direction === 'asc' ? left.localeCompare(right) : right.localeCompare(left);
  });

  emitAppliedResult(sortedItems);
};

const onDocumentPointerDown = (event: PointerEvent) => {
  if (!isOpen.value) return;
  if (rootEl.value?.contains(event.target as Node)) return;
  cancelPanel();
};

watch(draftSelectedFields, (fields) => {
  for (const field of fields) {
    const kind = fieldKind(field);
    if (kind === 'date' || kind === 'number') {
      ensureRange(draftRanges, field);
      delete draftValues[field];
    } else if (draftValues[field] === undefined) {
      draftValues[field] = '';
      delete draftRanges[field];
    }
  }

  for (const field of Object.keys(draftValues)) {
    if (!fields.includes(field)) {
      delete draftValues[field];
    }
  }

  for (const field of Object.keys(draftRanges)) {
    if (!fields.includes(field)) {
      delete draftRanges[field];
    }
  }
});

watch(() => props.items, () => {
  emitAppliedResult();
}, { deep: true });

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown);
});

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown);
});
</script>

<style scoped>
.excel-filter {
  position: relative;
  display: inline-flex;
}

.filter-trigger {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #dbe3ef;
  border-radius: 12px;
  background: #ffffff;
  color: #334155;
  padding: 8px 14px;
  font-size: 0.9rem;
  font-weight: 800;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
}

.filter-trigger.active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #1d4ed8;
}

.filter-badge {
  min-width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #2563eb;
  color: #ffffff;
  font-size: 0.68rem;
  line-height: 1;
}

.filter-popover {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 1500;
  width: min(380px, calc(100vw - 32px));
  max-height: min(680px, calc(100vh - 140px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #dbe3ef;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.18);
}

.filter-actions {
  display: grid;
  gap: 2px;
  padding: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.filter-action {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #334155;
  padding: 9px 10px;
  font-size: 0.86rem;
  font-weight: 750;
  text-align: left;
}

.filter-action:hover {
  background: #f8fafc;
}

.filter-action.danger {
  color: #dc2626;
}

.filter-section {
  padding: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.filter-section-title {
  color: #0f172a;
  font-size: 0.82rem;
  font-weight: 900;
  margin-bottom: 8px;
}

.filter-help {
  color: #64748b;
  font-size: 0.74rem;
  font-weight: 700;
  margin-top: -4px;
  margin-bottom: 10px;
}

.filter-search,
.value-filter-row input,
.value-filter-row select {
  width: 100%;
  min-height: 36px;
  border: 1px solid #dbe3ef;
  border-radius: 9px;
  color: #1e293b;
  padding: 7px 9px;
  font-size: 0.84rem;
  font-weight: 650;
}

.filter-search:focus,
.value-filter-row input:focus,
.value-filter-row select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 0.18rem rgba(59, 130, 246, 0.12);
  outline: none;
}

.range-filter-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.field-list {
  max-height: 190px;
  overflow-y: auto;
  margin-top: 10px;
  display: grid;
  gap: 2px;
  padding-right: 3px;
}

.field-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 6px;
  border-radius: 8px;
  color: #334155;
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
}

.field-option:hover {
  background: #f8fafc;
}

.field-option input {
  accent-color: #2563eb;
}

.value-filter-row {
  display: grid;
  gap: 5px;
  margin-top: 10px;
}

.value-filter-row label {
  color: #475569;
  font-size: 0.74rem;
  font-weight: 850;
}

.empty-filter-state {
  color: #94a3b8;
  font-size: 0.82rem;
  font-weight: 700;
  padding: 8px 4px;
}

.filter-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 12px;
  background: #f8fafc;
}

.btn-cancel,
.btn-ok {
  border: 1px solid #dbe3ef;
  border-radius: 9px;
  padding: 7px 13px;
  font-size: 0.84rem;
  font-weight: 850;
}

.btn-cancel {
  background: #ffffff;
  color: #475569;
}

.btn-ok {
  border-color: #2563eb;
  background: #2563eb;
  color: #ffffff;
}

@media (max-width: 768px) {
  .excel-filter,
  .filter-trigger {
    width: 100%;
  }

  .filter-trigger {
    justify-content: center;
  }

  .filter-popover {
    left: 0;
    right: auto;
    width: calc(100vw - 32px);
  }
}
</style>
