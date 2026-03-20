<template>
  <div class="toolbar-glass shadow-sm d-flex align-items-center gap-3">
    <div class="brand-section">
      <div class="brand-icon">
        <i class="bi bi-layers-half"></i>
      </div>
      <div class="brand-text">
        <span class="brand-main">VISUAL 3D</span>
        <span class="brand-sub">Blueprints 3D</span>
      </div>
    </div>

    <div class="header-divider"></div>

    <!-- Mode Switcher -->
    <div v-if="!re_isViewer()" class="mode-switcher">
      <button 
        class="mode-btn" 
        :class="{ active: appMode === 'edit' }" 
        @click="setMode('edit')"
      >
        <i class="bi bi-pencil-square"></i>
        <span>Editor</span>
      </button>
      <button 
        class="mode-btn" 
        :class="{ active: appMode === 'view' }" 
        @click="setMode('view')"
      >
        <i class="bi bi-eye"></i>
        <span>Vista</span>
      </button>
      <div class="mode-indicator" :class="appMode"></div>
    </div>
    
    <div class="spacer"></div>

    <!-- Floor Size Control -->
    <div class="control-group d-flex align-items-center gap-2" v-if="appMode === 'edit' && !re_isViewer()">
      <div class="control-label">
        <i class="bi bi-grid-3x3"></i>
        <span class="d-none d-lg-inline">Suelo</span>
      </div>
      <div class="range-container">
        <input type="range" class="glass-range" id="gridSizeRange" 
               min="20" max="400" step="10" 
               :value="gridSize" @input="updateGridSize">
        <span class="range-value">{{ gridSize }}m</span>
      </div>
    </div>

    <!-- 3D Filter Toggle -->
    <div class="position-relative">
      <button 
        class="btn-glass-filter" 
        :class="{ active: showFilters || hasActiveFilters }" 
        @click="showFilters = !showFilters"
        title="Filtros 3D"
      >
        <i class="bi bi-funnel-fill" v-if="hasActiveFilters"></i>
        <i class="bi bi-funnel" v-else></i>
        <span class="d-none d-md-inline">Resaltar</span>
        <span v-if="hasActiveFilters" class="filter-count">{{ activeFilterCount }}</span>
      </button>

      <!-- FILTERS PANEL -->
      <div v-if="showFilters" class="filters-panel shadow-lg p-3 rounded-4">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h6 class="mb-0 fw-bold smaller-text text-uppercase ls-1">Filtros Visuales</h6>
          <button class="btn-close-sm" @click="showFilters = false">
            <i class="bi bi-x-lg"></i>
          </button>
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
             <div class="form-check form-switch">
               <input class="form-check-input" type="checkbox" role="switch" :checked="visualFilters.enInspeccion === true" @change="toggleFilter('enInspeccion', $event)">
             </div>
           </div>
        </div>

        <div class="filter-item mb-3">
           <div class="d-flex justify-content-between align-items-center">
             <label class="filter-label mb-0">Legal</label>
             <div class="form-check form-switch">
               <input class="form-check-input" type="checkbox" role="switch" :checked="visualFilters.legal === true" @change="toggleFilter('legal', $event)">
             </div>
           </div>
        </div>

        <div class="filter-item mb-3">
           <div class="d-flex justify-content-between align-items-center">
             <label class="filter-label mb-0">Título</label>
             <div class="form-check form-switch">
               <input class="form-check-input" type="checkbox" role="switch" :checked="visualFilters.titulo === true" @change="toggleFilter('titulo', $event)">
             </div>
           </div>
        </div>

        <div class="filter-item mb-3">
           <div class="d-flex justify-content-between align-items-center">
             <label class="filter-label mb-0">DGII</label>
             <div class="form-check form-switch">
               <input class="form-check-input" type="checkbox" role="switch" :checked="visualFilters.descargadaDGII === true" @change="toggleFilter('descargadaDGII', $event)">
             </div>
           </div>
        </div>

        <div class="filter-item mb-3">
           <div class="d-flex justify-content-between align-items-center">
             <label class="filter-label mb-0">Saldado</label>
             <div class="form-check form-switch">
               <input class="form-check-input" type="checkbox" role="switch" :checked="visualFilters.saldo === true" @change="toggleFilter('saldo', $event)">
             </div>
           </div>
        </div>

        <button class="btn btn-outline-danger btn-sm w-100 mt-2 py-2" @click="clearAllFilters">
          <i class="bi bi-trash3 me-2"></i> Limpiar Filtros
        </button>
      </div>
    </div>
    
    <div class="actions-group d-flex gap-2" v-if="appMode === 'edit' && re_canEditData()">
      <button class="btn-glass-primary" @click="emit('add-building')">
        <i class="bi bi-plus-lg"></i>
        <span>Edificio</span>
      </button>

      <input 
        type="file" 
        ref="fileInput" 
        accept="image/png, image/jpeg" 
        class="d-none" 
        @change="onFileChange"
      />
      <button class="btn-glass-outline" @click="triggerFileUpload" title="Subir Plano">
        <i class="bi bi-cloud-arrow-up"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { appStore, setAppMode, setGridSize, canEditData, isViewer, setVisualFilters } from '../../store/appStore';

const re_canEditData = () => canEditData();
const re_isViewer = () => isViewer();

const fileInput = ref<HTMLInputElement | null>(null);

const emit = defineEmits<{
  (e: 'blueprint-loaded', url: string): void,
  (e: 'add-building'): void
}>();

const appMode = computed(() => appStore.appMode);
const gridSize = computed(() => appStore.gridSize);
const visualFilters = computed(() => appStore.visualFilters);

const showFilters = ref(false);
const banks = ["Apap", "Popular", "BHD", "Alnap", "Banreservas", "Santa Cruz", "Scotiabank", "Cibao", "Banesco"];

const hasActiveFilters = computed(() => {
  return visualFilters.value.status !== null || 
         visualFilters.value.bank !== null || 
         visualFilters.value.hasDebt !== null ||
         visualFilters.value.enInspeccion !== null ||
         visualFilters.value.legal !== null ||
         visualFilters.value.titulo !== null ||
         visualFilters.value.descargadaDGII !== null ||
         visualFilters.value.saldo !== null;
});

const activeFilterCount = computed(() => {
  let count = 0;
  if (visualFilters.value.status) count++;
  if (visualFilters.value.bank) count++;
  if (visualFilters.value.hasDebt !== null) count++;
  if (visualFilters.value.enInspeccion !== null) count++;
  if (visualFilters.value.legal !== null) count++;
  if (visualFilters.value.titulo !== null) count++;
  if (visualFilters.value.descargadaDGII !== null) count++;
  if (visualFilters.value.saldo !== null) count++;
  return count;
});

const setMode = (mode: 'edit' | 'view') => {
  setAppMode(mode);
};

const updateGridSize = (event: Event) => {
  const target = event.target as HTMLInputElement;
  setGridSize(parseInt(target.value));
};

const updateFilter = (key: string, event: Event) => {
  const target = event.target as HTMLSelectElement;
  let val: any = target.value === '' ? null : target.value;
  if (key === 'floor' && val !== null) val = parseInt(val);
  setVisualFilters({ [key]: val });
};

const toggleFilter = (key: string, event: Event) => {
    const target = event.target as HTMLInputElement;
    setVisualFilters({ [key]: target.checked ? true : null });
};

const clearAllFilters = () => {
    setVisualFilters({
        status: null,
        bank: null,
        hasDebt: null,
        enInspeccion: null,
        legal: null,
        titulo: null,
        descargadaDGII: null,
        saldo: null
    });
};

const triggerFileUpload = () => {
  fileInput.value?.click();
};

const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  emit('blueprint-loaded', url);
  
  // Clear input so same file can be loaded again if needed
  target.value = '';
};
</script>

<style scoped>
.toolbar-glass {
  position: absolute;
  top: 16px;
  left: 16px;
  right: 16px;
  height: 64px;
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

.brand-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-main {
  font-weight: 900;
  font-size: 14px;
  letter-spacing: 0.1em;
  color: #0f172a;
  line-height: 1;
}

.brand-sub {
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.header-divider {
  width: 1px;
  height: 32px;
  background: rgba(0, 0, 0, 0.06);
  margin: 0 8px;
}

.mode-switcher {
  display: flex;
  background: rgba(0, 0, 0, 0.04);
  padding: 4px;
  border-radius: 12px;
  position: relative;
  gap: 4px;
}

.mode-btn {
  border: none;
  background: transparent;
  padding: 6px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  z-index: 1;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.mode-btn i {
  font-size: 14px;
}

.mode-btn.active {
  color: #0f172a;
}

.mode-indicator {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc(50% - 6px);
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.mode-indicator.view {
  transform: translateX(100%);
  margin-left: 4px;
}

.spacer { flex-grow: 1; }

.control-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
}

.control-label i {
  color: #3b82f6;
  font-size: 16px;
}

.range-container {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.5);
  padding: 4px 12px;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.05);
}

.btn-glass-filter {
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(0,0,0,0.08);
  padding: 8px 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.btn-glass-filter:hover, .btn-glass-filter.active {
  background: white;
  color: #3b82f6;
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
}

.filter-count {
  background: #3b82f6;
  color: white;
  font-size: 10px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: -6px;
  right: -6px;
}

.filters-panel {
  position: absolute;
  top: calc(100% + 12px);
  right: -50%;
  width: 250px;
  max-height: 450px;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  z-index: 1200;
}

.filter-label {
  font-size: 11px;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
  display: block;
}

.btn-close-sm {
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
}

.btn-close-sm:hover { color: #f43f5e; }

.glass-range {
  -webkit-appearance: none;
  appearance: none;
  width: 100px;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  outline: none;
}

.glass-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
  transition: all 0.2s;
}

.glass-range::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

.range-value {
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
  min-width: 35px;
}

.btn-glass-primary {
  background: #0f172a;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
}

.btn-glass-primary:hover {
  background: #1e293b;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.2);
}

.btn-glass-outline {
  background: rgba(255, 255, 255, 0.5);
  color: #64748b;
  border: 1px solid rgba(0,0,0,0.08);
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-glass-outline:hover {
  background: white;
  color: #0f172a;
  border-color: rgba(0,0,0,0.15);
}
@media (max-width: 768px) {
  .brand-text {
    display: none;
  }
  .header-divider {
    display: none;
  }
  .toolbar-glass {
    left: 68px; /* Shift to clear 45px menu button at left: 15px */
    right: 8px;
    padding: 0 10px;
    gap: 8px;
  }
}

@media (max-width: 600px) {
  .mode-btn span, 
  .control-label span,
  .btn-glass-primary span {
    display: none;
  }
  .mode-btn {
    padding: 6px 10px;
  }
  .range-container {
    padding: 4px 6px;
    gap: 8px;
  }
  .glass-range {
    width: 50px;
  }
  .control-group {
    gap: 4px;
  }
  .brand-section {
    gap: 8px;
  }
  .brand-icon {
    width: 32px;
    height: 32px;
    font-size: 18px;
  }
}

@media (max-width: 420px) {
  .range-value {
    display: none;
  }
  .glass-range {
    width: 40px;
  }
  .glass-select {
    width: 60px;
    font-size: 11px;
  }
}

@media (max-width: 380px) {
  .control-group {
    display: none !important;
  }
}
</style>

