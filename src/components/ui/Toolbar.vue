<template>
  <div class="toolbar-glass shadow-sm">
    <div class="toolbar-row d-flex align-items-center gap-3">
      <div class="brand-section">
        <div class="brand-icon">
          <i class="bi bi-layers-half"></i>
        </div>
        <div class="brand-text">
          <span class="brand-main">VISUAL 3D</span>
          <span class="brand-sub">Blueprints 3D</span>
        </div>
      </div>

      <button class="toolbar-collapse-toggle toolbar-mobile-only" @click="mobileMenuOpen = !mobileMenuOpen" aria-label="Abrir menú">
        <i class="bi" :class="mobileMenuOpen ? 'bi-x-lg' : 'bi-list'"></i>
        <span>Menú</span>
      </button>

      <div class="header-divider"></div>

      <div class="mode-status-badge toolbar-mobile-only" :class="appMode">
        <i class="bi" :class="appMode === 'edit' ? 'bi-pencil-square' : 'bi-eye'"></i>
        <span>{{ appMode === 'edit' ? 'Modo: Editor' : 'Modo: Vista' }}</span>
      </div>

      <div v-if="!re_isViewer()" class="mode-switcher toolbar-desktop-only">
        <button class="mode-btn" :class="{ active: appMode === 'edit' }" @click="setMode('edit')">
          <i class="bi bi-pencil-square"></i>
          <span>Editor</span>
        </button>
        <button class="mode-btn" :class="{ active: appMode === 'view' }" @click="setMode('view')">
          <i class="bi bi-eye"></i>
          <span>Vista</span>
        </button>
        <div class="mode-indicator" :class="appMode"></div>
      </div>

      <div class="spacer toolbar-desktop-only"></div>

      <div class="toolbar-desktop-only d-flex align-items-center gap-2">
      <div v-if="appMode === 'edit' && !re_isViewer()" class="control-group d-flex align-items-center gap-2">
        <div class="control-label">
          <i class="bi bi-grid-3x3"></i>
          <span class="d-none d-lg-inline">Suelo</span>
        </div>
          <div class="range-container">
            <input type="range" class="glass-range" id="gridSizeRange" min="20" max="400" step="10" :value="gridSize" @input="updateGridSize">
            <span class="range-value">{{ gridSize }}m</span>
          </div>
        </div>

        <div class="control-group d-flex align-items-center gap-2">
          <div class="form-check form-switch m-0">
            <input class="form-check-input" type="checkbox" role="switch" :checked="dragBuildingsEnabled" @change="toggleDragBuildings">
          </div>
          <div class="control-label">
            <i class="bi bi-arrows-move"></i>
            <span class="d-none d-lg-inline">Mover</span>
          </div>
        </div>

        <div class="position-relative">
          <button class="btn-glass-filter" :class="{ active: showFilters || hasActiveFilters }" @click="showFilters = !showFilters" title="Filtros 3D">
            <i class="bi bi-funnel-fill" v-if="hasActiveFilters"></i>
            <i class="bi bi-funnel" v-else></i>
            <span class="d-none d-md-inline">Resaltar</span>
            <span v-if="hasActiveFilters" class="filter-count">{{ activeFilterCount }}</span>
          </button>

          <div v-if="showFilters" class="filters-panel shadow-lg p-3 rounded-4">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h6 class="mb-0 fw-bold smaller-text text-uppercase ls-1">Filtros Visuales</h6>
              <button class="btn-close-sm" @click="showFilters = false"><i class="bi bi-x-lg"></i></button>
            </div>

            <div class="filter-item mb-3">
              <label class="filter-label">Estado</label>
              <select class="form-select form-select-sm" :value="visualFilters.status || ''" @change="updateFilter('status', $event)">
                <option value="">Todos</option>
                <option value="delivered">Entregado</option>
                <option value="financing">Financiamiento</option>
                <option value="inspection">Inspección</option>
                <option value="sold">Vendido</option>
                <option value="observation">Observación</option>
                <option value="available">Disponible</option>
              </select>
            </div>

            <div class="filter-item mb-3">
              <label class="filter-label">Banco</label>
              <select class="form-select form-select-sm" :value="visualFilters.bank || ''" @change="updateFilter('bank', $event)">
                <option value="">Todos</option>
                <option v-for="b in banks" :key="b" :value="b">{{ b }}</option>
              </select>
            </div>

            <div class="filter-item mb-3">
              <div class="d-flex justify-content-between align-items-center">
                <label class="filter-label mb-0">Inspección</label>
                <div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" :checked="visualFilters.enInspeccion === true" @change="toggleFilter('enInspeccion', $event)"></div>
              </div>
            </div>
            <div class="filter-item mb-3">
              <div class="d-flex justify-content-between align-items-center">
                <label class="filter-label mb-0">Legal</label>
                <div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" :checked="visualFilters.legal === true" @change="toggleFilter('legal', $event)"></div>
              </div>
            </div>
            <div class="filter-item mb-3">
              <div class="d-flex justify-content-between align-items-center">
                <label class="filter-label mb-0">Título</label>
                <div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" :checked="visualFilters.titulo === true" @change="toggleFilter('titulo', $event)"></div>
              </div>
            </div>
            <div class="filter-item mb-3">
              <div class="d-flex justify-content-between align-items-center">
                <label class="filter-label mb-0">DGII</label>
                <div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" :checked="visualFilters.descargadaDGII === true" @change="toggleFilter('descargadaDGII', $event)"></div>
              </div>
            </div>
            <div class="filter-item mb-3">
              <div class="d-flex justify-content-between align-items-center">
                <label class="filter-label mb-0">Saldado</label>
                <div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" :checked="visualFilters.saldo === true" @change="toggleFilter('saldo', $event)"></div>
              </div>
            </div>

            <button class="btn btn-outline-danger btn-sm w-100 mt-2 py-2" @click="clearAllFilters">
              <i class="bi bi-trash3 me-2"></i> Limpiar Filtros
            </button>
          </div>
        </div>

        <div v-if="appMode === 'edit' && re_canEditData()" class="actions-group d-flex gap-2">
          <button class="btn-glass-save" :disabled="isSaving" @click="emit('save-layout')" title="Guardar cambios">
            <i class="bi" :class="isSaving ? 'bi-arrow-repeat spin' : 'bi-cloud-check'"></i>
            <span>{{ isSaving ? 'Guardando' : 'Guardar' }}</span>
          </button>
          <button class="btn-glass-primary" @click="emit('add-building')"><i class="bi bi-plus-lg"></i><span>Edificio</span></button>
          <input type="file" ref="fileInput" accept="image/png, image/jpeg" class="d-none" @change="onFileChange" />
          <button class="btn-glass-outline" @click="triggerFileUpload" title="Subir Plano"><i class="bi bi-cloud-arrow-up"></i></button>
        </div>
      </div>
    </div>

    <transition name="mobile-fade-slide">
      <div v-if="mobileMenuOpen" class="mobile-panel toolbar-mobile-only">
        <div v-if="!re_isViewer()" class="mobile-section">
          <div class="mobile-section-title">Modo actual</div>
          <div class="mode-status-card" :class="appMode">
            <i class="bi" :class="appMode === 'edit' ? 'bi-pencil-square' : 'bi-eye'"></i>
            <div>
              <div class="mode-status-label">Estás en</div>
              <div class="mode-status-value">{{ appMode === 'edit' ? 'Editor' : 'Vista' }}</div>
            </div>
          </div>
          <div class="mode-switcher mobile-mode-switcher">
            <button class="mode-btn" :class="{ active: appMode === 'edit' }" @click="setMode('edit')"><i class="bi bi-pencil-square"></i><span>Editor</span></button>
            <button class="mode-btn" :class="{ active: appMode === 'view' }" @click="setMode('view')"><i class="bi bi-eye"></i><span>Vista</span></button>
            <div class="mode-indicator" :class="appMode"></div>
          </div>
        </div>

        <div v-if="appMode === 'edit' && !re_isViewer()" class="mobile-section">
          <div class="mobile-section-title">Suelo</div>
          <div class="control-group d-flex align-items-center gap-2 mobile-control-group">
            <div class="control-label"><i class="bi bi-grid-3x3"></i><span>Suelo</span></div>
            <div class="range-container mobile-range-container">
              <input type="range" class="glass-range" id="gridSizeRangeMobile" min="20" max="400" step="10" :value="gridSize" @input="updateGridSize">
              <span class="range-value">{{ gridSize }}m</span>
            </div>
          </div>

          <div class="control-group d-flex align-items-center justify-content-between gap-2 mt-3">
            <div class="control-label"><i class="bi bi-arrows-move"></i><span>Mover edificios</span></div>
            <div class="form-check form-switch m-0">
              <input class="form-check-input" type="checkbox" role="switch" :checked="dragBuildingsEnabled" @change="toggleDragBuildings">
            </div>
          </div>
        </div>

        <div class="mobile-section position-relative">
          <div class="mobile-section-title">Filtros</div>
          <button class="btn-glass-filter w-100 justify-content-between" :class="{ active: showFilters || hasActiveFilters }" @click="showFilters = !showFilters" title="Filtros 3D">
            <span class="d-flex align-items-center gap-2"><i class="bi bi-funnel-fill" v-if="hasActiveFilters"></i><i class="bi bi-funnel" v-else></i><span>Resaltar</span></span>
            <span v-if="hasActiveFilters" class="filter-count position-static">{{ activeFilterCount }}</span>
          </button>
          <div v-if="showFilters" class="filters-panel shadow-lg p-3 rounded-4 mobile-filters-panel">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h6 class="mb-0 fw-bold smaller-text text-uppercase ls-1">Filtros Visuales</h6>
              <button class="btn-close-sm" @click="showFilters = false"><i class="bi bi-x-lg"></i></button>
            </div>
            <div class="filter-item mb-3">
              <label class="filter-label">Estado</label>
              <select class="form-select form-select-sm" :value="visualFilters.status || ''" @change="updateFilter('status', $event)">
                <option value="">Todos</option>
                <option value="delivered">Entregado</option>
                <option value="financing">Financiamiento</option>
                <option value="inspection">Inspección</option>
                <option value="sold">Vendido</option>
                <option value="observation">Observación</option>
                <option value="available">Disponible</option>
              </select>
            </div>
            <div class="filter-item mb-3">
              <label class="filter-label">Banco</label>
              <select class="form-select form-select-sm" :value="visualFilters.bank || ''" @change="updateFilter('bank', $event)">
                <option value="">Todos</option>
                <option v-for="b in banks" :key="b" :value="b">{{ b }}</option>
              </select>
            </div>
            <div class="filter-item mb-3"><div class="d-flex justify-content-between align-items-center"><label class="filter-label mb-0">Inspección</label><div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" :checked="visualFilters.enInspeccion === true" @change="toggleFilter('enInspeccion', $event)"></div></div></div>
            <div class="filter-item mb-3"><div class="d-flex justify-content-between align-items-center"><label class="filter-label mb-0">Legal</label><div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" :checked="visualFilters.legal === true" @change="toggleFilter('legal', $event)"></div></div></div>
            <div class="filter-item mb-3"><div class="d-flex justify-content-between align-items-center"><label class="filter-label mb-0">Título</label><div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" :checked="visualFilters.titulo === true" @change="toggleFilter('titulo', $event)"></div></div></div>
            <div class="filter-item mb-3"><div class="d-flex justify-content-between align-items-center"><label class="filter-label mb-0">DGII</label><div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" :checked="visualFilters.descargadaDGII === true" @change="toggleFilter('descargadaDGII', $event)"></div></div></div>
            <div class="filter-item mb-3"><div class="d-flex justify-content-between align-items-center"><label class="filter-label mb-0">Saldado</label><div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" :checked="visualFilters.saldo === true" @change="toggleFilter('saldo', $event)"></div></div></div>
            <button class="btn btn-outline-danger btn-sm w-100 mt-2 py-2" @click="clearAllFilters"><i class="bi bi-trash3 me-2"></i> Limpiar Filtros</button>
          </div>
        </div>

        <div v-if="appMode === 'edit' && re_canEditData()" class="mobile-section">
          <div class="mobile-section-title">Acciones</div>
          <div class="mobile-actions-grid">
            <button class="btn-glass-save w-100 justify-content-center" :disabled="isSaving" @click="emit('save-layout')"><i class="bi" :class="isSaving ? 'bi-arrow-repeat spin' : 'bi-cloud-check'"></i><span>{{ isSaving ? 'Guardando' : 'Guardar cambios' }}</span></button>
            <button class="btn-glass-primary w-100 justify-content-center" @click="emit('add-building')"><i class="bi bi-plus-lg"></i><span>Agregar edificio</span></button>
            <input type="file" ref="fileInput" accept="image/png, image/jpeg" class="d-none" @change="onFileChange" />
            <button class="btn-glass-outline w-100 justify-content-center" @click="triggerFileUpload"><i class="bi bi-cloud-arrow-up"></i><span>Subir plano</span></button>
          </div>
        </div>

        <div v-if="appMode === 'edit' && !re_isViewer()" class="mobile-section">
          <div class="mobile-section-title">Vinculación</div>
          <div class="link-summary-card">
            <div class="link-summary-row"><span>Vinculadas</span><strong>{{ linkedUnits }} / {{ totalUnits }}</strong></div>
            <div class="link-summary-row"><span>Sin match</span><strong>{{ unmatchedUnits }}</strong></div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { appStore, setAppMode, setGridSize, setDragBuildingsEnabled, canEditData, isViewer, setVisualFilters } from '../../store/appStore';

const re_canEditData = () => canEditData();
const re_isViewer = () => isViewer();
const fileInput = ref<HTMLInputElement | null>(null);
const mobileMenuOpen = ref(false);

const emit = defineEmits<{
  (e: 'blueprint-loaded', url: string): void;
  (e: 'add-building'): void;
  (e: 'save-layout'): void;
}>();

const appMode = computed(() => appStore.appMode);
const gridSize = computed(() => appStore.gridSize);
const dragBuildingsEnabled = computed(() => appStore.dragBuildingsEnabled);
const visualFilters = computed(() => appStore.visualFilters);
const isSaving = computed(() => appStore.currentProjectLayoutStatus === 'saving');
const projectBuildings = computed(() => appStore.buildings.filter(building => building.projectId === appStore.currentProjectId));
const totalUnits = computed(() => projectBuildings.value.reduce((acc, building) => acc + building.units.length, 0));
const linkedUnits = computed(() => projectBuildings.value.reduce((acc, building) => acc + building.units.filter(unit => unit.detailedUnitId !== null).length, 0));
const unmatchedUnits = computed(() => Math.max(totalUnits.value - linkedUnits.value, 0));

const showFilters = ref(false);
const banks = ['Apap', 'Popular', 'BHD', 'Alnap', 'Banreservas', 'Santa Cruz', 'Scotiabank', 'Cibao', 'Banesco'];

const hasActiveFilters = computed(() => visualFilters.value.status !== null || visualFilters.value.bank !== null || visualFilters.value.hasDebt !== null || visualFilters.value.enInspeccion !== null || visualFilters.value.legal !== null || visualFilters.value.titulo !== null || visualFilters.value.descargadaDGII !== null || visualFilters.value.saldo !== null);
const activeFilterCount = computed(() => [visualFilters.value.status, visualFilters.value.bank, visualFilters.value.hasDebt, visualFilters.value.enInspeccion, visualFilters.value.legal, visualFilters.value.titulo, visualFilters.value.descargadaDGII, visualFilters.value.saldo].filter(value => value !== null && value !== undefined && value !== '').length);

const setMode = (mode: 'edit' | 'view') => setAppMode(mode);
const toggleDragBuildings = (event: Event) => {
  const target = event.target as HTMLInputElement;
  setDragBuildingsEnabled(target.checked);
};
const updateGridSize = (event: Event) => setGridSize(parseInt((event.target as HTMLInputElement).value));
const updateFilter = (key: string, event: Event) => setVisualFilters({ [key]: ((event.target as HTMLSelectElement).value === '' ? null : (event.target as HTMLSelectElement).value) as any });
const toggleFilter = (key: string, event: Event) => setVisualFilters({ [key]: (event.target as HTMLInputElement).checked ? true : null });
const clearAllFilters = () => setVisualFilters({ status: null, bank: null, hasDebt: null, enInspeccion: null, legal: null, titulo: null, descargadaDGII: null, saldo: null });
const triggerFileUpload = () => fileInput.value?.click();
const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  emit('blueprint-loaded', URL.createObjectURL(file));
  target.value = '';
};
</script>

<style scoped>
.toolbar-glass {
  position: absolute;
  top: 16px;
  left: 16px;
  right: 16px;
  min-height: 64px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  z-index: 1100;
  padding: 0 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

.toolbar-row { min-height: 64px; }
.brand-section { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.brand-icon { width: 36px; height: 36px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
.brand-text { display: flex; flex-direction: column; }
.brand-main { font-weight: 900; font-size: 14px; letter-spacing: 0.1em; color: #0f172a; line-height: 1; }
.brand-sub { font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
.header-divider { width: 1px; height: 32px; background: rgba(0,0,0,0.06); margin: 0 8px; flex-shrink: 0; }
.spacer { flex-grow: 1; }

.mode-switcher { display: flex; background: rgba(0,0,0,0.04); padding: 4px; border-radius: 12px; position: relative; gap: 4px; }
.mode-btn { border: none; background: transparent; padding: 6px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; color: #64748b; cursor: pointer; z-index: 1; transition: all 0.3s; display: flex; align-items: center; gap: 8px; }
.mode-btn i { font-size: 14px; }
.mode-btn.active { color: #0f172a; }
.mode-indicator { position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc(50% - 6px); background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.mode-indicator.view { transform: translateX(100%); margin-left: 4px; }

.control-label { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; }
.control-label i { color: #3b82f6; font-size: 16px; }
.range-container { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.5); padding: 4px 12px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.05); }
.glass-range { -webkit-appearance: none; appearance: none; width: 100px; height: 4px; background: #e2e8f0; border-radius: 2px; outline: none; }
.glass-range::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; background: #3b82f6; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 6px rgba(59,130,246,0.3); transition: all 0.2s; }
.glass-range::-webkit-slider-thumb:hover { transform: scale(1.1); }
.range-value { font-size: 13px; font-weight: 700; color: #1e293b; min-width: 35px; }

.btn-glass-filter { background: rgba(255,255,255,0.5); border: 1px solid rgba(0,0,0,0.08); padding: 8px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; color: #64748b; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s; position: relative; }
.btn-glass-filter:hover, .btn-glass-filter.active { background: white; color: #3b82f6; border-color: #3b82f6; box-shadow: 0 4px 12px rgba(59,130,246,0.1); }
.filter-count { background: #3b82f6; color: white; font-size: 10px; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; position: absolute; top: -6px; right: -6px; }
.filters-panel { position: absolute; top: calc(100% + 12px); right: -50%; width: 250px; max-height: 450px; overflow-y: auto; background: rgba(255,255,255,0.95); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.4); z-index: 1200; }
.filter-label { font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; display: block; }
.btn-close-sm { border: none; background: transparent; color: #94a3b8; cursor: pointer; padding: 4px; }
.btn-close-sm:hover { color: #f43f5e; }

.btn-glass-primary, .btn-glass-save, .btn-glass-outline { border: none; padding: 8px 16px; border-radius: 12px; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s; }
.btn-glass-primary { background: #0f172a; color: white; box-shadow: 0 4px 12px rgba(15,23,42,0.15); }
.btn-glass-save { background: #22c55e; color: white; box-shadow: 0 4px 12px rgba(34,197,94,0.18); }
.btn-glass-save:hover:not(:disabled) { background: #16a34a; transform: translateY(-1px); }
.btn-glass-save:disabled { opacity: 0.7; cursor: wait; }
.btn-glass-primary:hover { background: #1e293b; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(15,23,42,0.2); }
.btn-glass-outline { background: rgba(255,255,255,0.5); color: #64748b; border: 1px solid rgba(0,0,0,0.08); padding: 8px 12px; font-size: 18px; }
.btn-glass-outline:hover { background: white; color: #0f172a; border-color: rgba(0,0,0,0.15); }
.spin { animation: spin 1s linear infinite; }

.toolbar-collapse-toggle {
  display: none;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.72);
  color: #0f172a;
  height: 38px;
  padding: 0 12px;
  border-radius: 10px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.08);
}
.mode-status-badge { display: none; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 999px; background: rgba(15,23,42,0.06); color: #0f172a; font-size: 12px; font-weight: 700; white-space: nowrap; }
.mode-status-badge.edit { background: rgba(37,99,235,0.1); color: #1d4ed8; }
.mode-status-badge.view { background: rgba(15,23,42,0.06); color: #334155; }

.mobile-panel { display: none; }
.mobile-section { margin-top: 14px; }
.mobile-section-title { font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; margin-bottom: 10px; }
.mobile-mode-switcher { width: 100%; }
.mobile-mode-switcher .mode-btn { flex: 1; justify-content: center; }
.mobile-control-group { width: 100%; flex-wrap: wrap; }
.mobile-range-container { width: 100%; justify-content: space-between; }
.mobile-actions-grid { display: grid; gap: 10px; }
.link-summary-card { background: rgba(15,23,42,0.04); border: 1px solid rgba(15,23,42,0.08); border-radius: 16px; padding: 12px 14px; }
.link-summary-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 4px 0; font-size: 13px; color: #334155; }
.link-summary-row strong { color: #0f172a; }
.mode-status-card { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 16px; margin-bottom: 10px; background: rgba(15,23,42,0.04); border: 1px solid rgba(15,23,42,0.08); }
.mode-status-card.edit { background: rgba(37,99,235,0.08); border-color: rgba(37,99,235,0.15); }
.mode-status-card.view { background: rgba(15,23,42,0.04); border-color: rgba(15,23,42,0.08); }
.mode-status-card i { font-size: 18px; color: #2563eb; }
.mode-status-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
.mode-status-value { font-size: 15px; font-weight: 800; color: #0f172a; }

.toolbar-mobile-only { display: none; }
.toolbar-desktop-only { display: flex; }

@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

@media (max-width: 768px) {
  .brand-text, .header-divider, .toolbar-desktop-only { display: none !important; }
  .toolbar-mobile-only { display: flex; }
  .toolbar-glass { left: 68px; right: 12px; padding: 0 12px; }
  .toolbar-row { min-height: 56px; }
  .mobile-panel { display: flex; flex-direction: column; gap: 14px; padding: 0 0 14px; }
  .filters-panel { position: static; width: 100%; right: auto; top: auto; max-height: none; margin-top: 12px; }
  .mode-status-badge { display: inline-flex; }
}

@media (max-width: 600px) {
  .toolbar-glass { left: 68px; right: 8px; padding: 0 10px; }
  .brand-icon { width: 32px; height: 32px; font-size: 18px; }
  .mobile-panel { padding-bottom: 12px; }
  .toolbar-collapse-toggle {
    height: 36px;
    padding: 0 10px;
    font-size: 12px;
  }
}

@media (max-width: 380px) {
  .toolbar-glass { left: 60px; }
  .glass-range { width: 80px; }
}
</style>
