<template>
  <transition name="panel-slide">
    <div v-if="appMode === 'edit' && selectedBuilding && !re_isViewer()" 
         class="properties-panel-glass shadow-lg d-flex flex-column"
         :class="{ 'is-collapsed': isCollapsed }">
      <!-- HEADER -->
      <div class="glass-header d-flex justify-content-between align-items-center" @click="toggleCollapse">
        <div class="d-flex align-items-center gap-2">
          <div class="icon-circle">
            <i class="bi bi-sliders2"></i>
          </div>
          <span class="text-uppercase fw-bold ls-1 small tracking-wider">Propiedades</span>
        </div>
        <div class="d-flex gap-2">
          <button class="btn-action-icon" @click.stop="toggleCollapse" :title="isCollapsed ? 'Expandir' : 'Contraer'">
            <i class="bi" :class="isCollapsed ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
          </button>
          <button v-if="re_canDeleteData()" class="btn-action-icon danger" @click.stop="requestDeleteBuilding" title="Eliminar Edificio">
            <i class="bi bi-trash3"></i>
          </button>
          <button class="btn-close-custom" @click.stop="closePanel">
            <i class="bi bi-x"></i>
          </button>
        </div>
      </div>

      <div class="glass-body overflow-auto flex-grow-1" v-show="!isCollapsed">
        <!-- BUILDING SECTION -->
        <div class="property-section mb-4">
          <div class="section-title">
            <i class="bi bi-building"></i> Configuración del Edificio
          </div>
          
          <div class="glass-input-group mb-3">
            <label class="glass-label">Nombre del Edificio</label>
            <input type="text" class="glass-input" v-model="buildingName" placeholder="Ej: Edificio A..." />
          </div>
          
          <div class="glass-input-group">
            <label class="glass-label">Posición (X, Z)</label>
            <div class="position-inputs">
              <div class="coord-input">
                <span>X</span>
                <input type="number" step="1" v-model.number="buildingPositionX" @input="updatePos" />
              </div>
              <div class="coord-input">
                <span>Z</span>
                <input type="number" step="1" v-model.number="buildingPositionZ" @input="updatePos" />
              </div>
            </div>
          </div>

          <div class="glass-input-group mt-3">
            <label class="glass-label">Rotación del Edificio</label>
            <div class="rotation-control">
              <input type="range" min="0" max="359" step="1" v-model.number="buildingRotationY" @input="updateRotation" />
              <div class="rotation-readout">
                <span>{{ buildingRotationY }}°</span>
              </div>
            </div>
          </div>

          <button v-if="re_canEditData()" class="btn-glass-secondary w-100 mt-3" @click="addUnit">
            <i class="bi bi-plus-lg me-2"></i> Añadir Nueva Unidad
          </button>
        </div>

        <div class="glass-divider mb-4"></div>

        <!-- UNITS SECTION -->
        <div class="property-section mb-4">
          <div class="section-title d-flex justify-content-between">
            <span><i class="bi bi-grid-3x3-gap"></i> Unidades</span>
            <span class="badge-count">{{ selectedBuilding.units.length }}</span>
          </div>

          <div class="units-list-wrapper">
            <div 
              v-for="unit in selectedBuilding.units" 
              :key="unit.id"
              class="unit-list-item"
              :class="{ 'active': selectedUnitId === unit.id }"
              @click="selectUnit(unit.id)"
            >
              <div class="d-flex align-items-center gap-2">
                <i class="bi bi-house-door"></i>
                <span class="unit-name">{{ unit.name }}</span>
              </div>
              <span class="unit-status-tag" :class="unit.status">{{ unit.status }}</span>
            </div>
          </div>
        </div>

        <div class="glass-divider mb-4" v-if="selectedUnit"></div>

        <!-- UNIT EDITING SECTION -->
        <transition name="fade">
          <div v-if="selectedUnit" class="property-section unit-edit-active">
            <div class="section-title text-info-custom">
              <i class="bi bi-pencil-square"></i> Editar Unidad: {{ selectedUnit.name }}
            </div>
            
            <div class="glass-input-group mb-3">
              <label class="glass-label">Nombre de la Unidad</label>
              <input type="text" class="glass-input" v-model="unitName" />
            </div>

            <div class="glass-input-group mb-3">
              <label class="glass-label">Estado</label>
              <select class="glass-select" v-model="unitStatus">
                <option value="available">Disponible</option>
                <option value="reserved">Reservado</option>
                <option value="sold">Vendido</option>
                <option value="maintenance">Mantenimiento</option>
              </select>
            </div>

            <div class="glass-input-group mb-3">
              <label class="glass-label">Vincular con Registro Real</label>
              <select class="glass-select" v-model="detailedUnitId">
                <option :value="null">-- Sin Vincular --</option>
                <option v-for="du in filteredDetailedUnits" :key="du.id" :value="du.id">
                  {{ du.codUnidad }} ({{ du.nombre || 'Sin Cliente' }})
                </option>
              </select>
            </div>

            <div v-if="linkedDetailedUnit" class="linked-info-card mb-3 animate__animated animate__fadeIn">
               <div class="small fw-bold text-muted mb-1">DATOS REALES VINCULADOS:</div>
               <div class="d-flex justify-content-between align-items-center">
                 <span class="badge bg-primary">{{ linkedDetailedUnit.codUnidad }}</span>
                 <span class="small">{{ linkedDetailedUnit.estado }}</span>
               </div>
               <div class="mt-1 small text-truncate">{{ linkedDetailedUnit.nombre }}</div>
            </div>

            <div class="glass-switch mb-4">
              <input type="checkbox" :id="'paidSwitch' + selectedUnit.id" v-model="unitPaid">
              <label :for="'paidSwitch' + selectedUnit.id">
                <span class="switch-inner"></span>
                <span class="switch-label">Pago Recibido (Verde)</span>
              </label>
            </div>

            <button v-if="re_canDeleteData()" class="btn-glass-danger w-100" @click="requestDeleteUnit">
              <i class="bi bi-trash3 me-2"></i> Eliminar Unidad
            </button>
          </div>
          <div v-else class="empty-state">
            <i class="bi bi-cursor-fill mb-2"></i>
            <p>Selecciona una unidad para modificar sus propiedades</p>
          </div>
        </transition>
      </div>
    </div>
  </transition>

  <ConfirmModal 
    :show="showConfirm" 
    :title="modalTitle" 
    :message="modalMessage" 
    @confirm="handleConfirm" 
    @cancel="showConfirm = false" 
  />
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import { appStore, selectBuilding, selectUnit, updateBuildingPosition, addUnitToBuilding, updateUnit, deleteBuilding, deleteUnit, updateBuilding, canEditData, canDeleteData, isViewer } from '../../store/appStore';

const re_canEditData = () => canEditData();
const re_canDeleteData = () => canDeleteData();
const re_isViewer = () => isViewer();
import type { UnitStatus } from '../../models/types';
import ConfirmModal from './ConfirmModal.vue';

const appMode = computed(() => appStore.appMode);
const selectedBuildingId = computed(() => appStore.selectedBuildingId);
const selectedUnitId = computed(() => appStore.selectedUnitId);

const isCollapsed = ref(false);
const toggleCollapse = () => {
    isCollapsed.value = !isCollapsed.value;
};

// Automatic collapse on small screens when selecting a building
watch(selectedBuildingId, (id) => {
    if (id && window.innerWidth < 600) {
        isCollapsed.value = true;
    } else {
        isCollapsed.value = false;
    }
});

const selectedBuilding = computed(() => 
  appStore.buildings.find(b => b.id === selectedBuildingId.value)
);

const selectedUnit = computed(() => 
  selectedBuilding.value?.units.find(u => u.id === selectedUnitId.value)
);

const closePanel = () => {
  selectBuilding(null);
};

// Local bindings for Building editing
const buildingPositionX = ref(0);
const buildingPositionZ = ref(0);
const buildingRotationY = ref(0);

const buildingName = computed({
    get: () => selectedBuilding.value?.name || '',
    set: (val) => {
        if (selectedBuildingId.value) {
            updateBuilding(selectedBuildingId.value, { name: val });
        }
    }
});

watch(selectedBuilding, (val) => {
  if (val) {
    buildingPositionX.value = val.position.x;
    buildingPositionZ.value = val.position.z;
    buildingRotationY.value = val.rotationY ?? 0;
  }
}, { immediate: true });

const updatePos = () => {
    if (selectedBuildingId.value) {
        updateBuildingPosition(selectedBuildingId.value, { 
            x: buildingPositionX.value, 
            z: buildingPositionZ.value 
        });
    }
};

const updateRotation = () => {
    if (selectedBuildingId.value) {
        updateBuilding(selectedBuildingId.value, {
            rotationY: buildingRotationY.value
        });
    }
};

const addUnit = () => {
    if (selectedBuildingId.value) {
        addUnitToBuilding(selectedBuildingId.value);
    }
};

// Local bindings for Unit editing
const unitName = computed({
    get: () => selectedUnit.value?.name || '',
    set: (val) => {
        if(selectedBuildingId.value && selectedUnitId.value) {
            updateUnit(selectedBuildingId.value, selectedUnitId.value, { name: val });
        }
    }
});

const unitStatus = computed({
    get: () => selectedUnit.value?.status || 'available',
    set: (val: string) => {
        if(selectedBuildingId.value && selectedUnitId.value) {
            updateUnit(selectedBuildingId.value, selectedUnitId.value, { status: val as UnitStatus });
        }
    }
});

const unitPaid = computed({
    get: () => selectedUnit.value?.paid || false,
    set: (val: boolean) => {
        if(selectedBuildingId.value && selectedUnitId.value) {
            updateUnit(selectedBuildingId.value, selectedUnitId.value, { paid: val });
        }
    }
});

const detailedUnitId = computed({
    get: () => selectedUnit.value?.detailedUnitId || null,
    set: (val: number | null) => {
        if(selectedBuildingId.value && selectedUnitId.value) {
            updateUnit(selectedBuildingId.value, selectedUnitId.value, { detailedUnitId: val });
        }
    }
});

const filteredDetailedUnits = computed(() => {
    if (!selectedBuilding.value) return [];
    const bldName = selectedBuilding.value.name.toUpperCase();
    
    // Filter by building name if it contains DN, DO, DP etc
    let prefix = "";
    if (bldName.includes("DN")) prefix = "DN";
    else if (bldName.includes("DO")) prefix = "DO";
    else if (bldName.includes("DP")) prefix = "DP";

    if (prefix) {
        return appStore.detailedUnits.filter(du => du.edificio === prefix);
    }
    return appStore.detailedUnits.slice(0, 100); // Sample if no prefix match
});

const linkedDetailedUnit = computed(() => {
    if (!detailedUnitId.value) return null;
    return appStore.detailedUnits.find(du => du.id === detailedUnitId.value);
});

// Deletion Logic
const showConfirm = ref(false);
const modalTitle = ref('');
const modalMessage = ref('');
const pendingAction = ref<'deleteBuilding' | 'deleteUnit' | null>(null);

const requestDeleteBuilding = () => {
    if (!selectedBuilding.value) return;
    modalTitle.value = 'Eliminar Edificio';
    modalMessage.value = `¿Estás seguro de que deseas eliminar el edificio "${selectedBuilding.value.name}"? Se borrarán todas sus unidades.`;
    pendingAction.value = 'deleteBuilding';
    showConfirm.value = true;
};

const requestDeleteUnit = () => {
    if (!selectedUnit.value) return;
    modalTitle.value = 'Eliminar Unidad';
    modalMessage.value = `¿Estás seguro de que deseas eliminar la unidad "${selectedUnit.value.name}"?`;
    pendingAction.value = 'deleteUnit';
    showConfirm.value = true;
};

const handleConfirm = () => {
    if (pendingAction.value === 'deleteBuilding' && selectedBuildingId.value) {
        deleteBuilding(selectedBuildingId.value);
    } else if (pendingAction.value === 'deleteUnit' && selectedBuildingId.value && selectedUnitId.value) {
        deleteUnit(selectedBuildingId.value, selectedUnitId.value);
    }
    showConfirm.value = false;
    pendingAction.value = null;
};
</script>

<style scoped>
.properties-panel-glass {
  position: absolute;
  top: 96px;
  right: 16px;
  bottom: 16px;
  width: 340px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  z-index: 1000;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
}

.properties-panel-glass.is-collapsed {
  height: 72px !important;
  bottom: 16px;
  top: auto !important;
  overflow: hidden;
}

.glass-header {
  padding: 20px;
  background: rgba(255, 255, 255, 0.3);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  cursor: pointer;
}

.icon-circle {
  width: 32px;
  height: 32px;
  background: #3b82f6;
  color: white;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.ls-1 { letter-spacing: 0.1em; }

.btn-close-custom, .btn-action-icon {
  background: none;
  border: none;
  font-size: 20px;
  color: #64748b;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  border-radius: 8px;
}

.btn-action-icon:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #0f172a;
}

.btn-action-icon.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.glass-body {
  padding: 24px;
}

@media (max-width: 600px) {
  .properties-panel-glass {
    top: auto;
    left: 8px;
    right: 8px;
    bottom: 8px;
    width: auto;
    height: 40vh;
    border-radius: 20px;
  }

  .properties-panel-glass.is-collapsed {
    height: 64px;
    bottom: 8px;
  }

  .glass-header {
    padding: 12px 16px;
  }

  .glass-body {
    padding: 16px;
  }
}

.section-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #334155;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title i {
  font-size: 16px;
  color: #3b82f6;
}

.text-info-custom {
  color: #0891b2;
}
.text-info-custom i { color: #0891b2; }

.glass-input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.glass-label {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  margin-left: 4px;
}

.glass-input, .glass-select {
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 14px;
  color: #1e293b;
  transition: all 0.2s;
  outline: none;
}

.glass-input:focus, .glass-select:focus {
  background: white;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.position-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.rotation-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rotation-control input[type='range'] {
  flex: 1;
}

.rotation-readout {
  min-width: 56px;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(59, 130, 246, 0.1);
  color: #1d4ed8;
  font-weight: 700;
  text-align: center;
}

.rotation-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rotation-control input[type='range'] {
  flex: 1;
}

.rotation-readout {
  min-width: 52px;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(59, 130, 246, 0.1);
  color: #1d4ed8;
  font-weight: 700;
  text-align: center;
}

.coord-input {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  overflow: hidden;
}

.coord-input span {
  padding: 0 12px;
  font-size: 11px;
  font-weight: 800;
  color: #94a3b8;
  background: rgba(0, 0, 0, 0.02);
  height: 100%;
  display: flex;
  align-items: center;
}

.coord-input input {
  border: none;
  background: transparent;
  padding: 10px;
  width: 100%;
  font-size: 14px;
  outline: none;
}

.btn-glass-secondary {
  background: rgba(59, 130, 246, 0.05);
  color: #2563eb;
  border: 1px dashed rgba(59, 130, 246, 0.3);
  padding: 10px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-glass-secondary:hover {
  background: rgba(59, 130, 246, 0.1);
  transform: translateY(-1px);
}

.glass-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0,0,0,0.05), transparent);
}

.badge-count {
  background: #f1f5f9;
  color: #475569;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
}

.units-list-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  padding-right: 4px;
}

.units-list-wrapper::-webkit-scrollbar {
  width: 4px;
}
.units-list-wrapper::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.1);
  border-radius: 10px;
}

.unit-list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.unit-list-item:hover {
  background: rgba(255, 255, 255, 0.6);
  transform: translateX(2px);
}

.unit-list-item.active {
  background: white;
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
}

.unit-name {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
}

.unit-status-tag {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
}

.unit-status-tag.available { color: #059669; background: rgba(16, 185, 129, 0.1); }
.unit-status-tag.reserved { color: #d97706; background: rgba(245, 158, 11, 0.1); }
.unit-status-tag.sold { color: #2563eb; background: rgba(59, 130, 246, 0.1); }
.unit-status-tag.maintenance { color: #475569; background: rgba(100, 116, 139, 0.1); }

/* Switch Styling */
.glass-switch {
  display: flex;
  align-items: center;
}

.glass-switch input {
  display: none;
}

.glass-switch label {
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 12px;
}

.switch-inner {
  position: relative;
  width: 40px;
  height: 20px;
  background: #e2e8f0;
  border-radius: 20px;
  transition: all 0.3s;
}

.switch-inner::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  transition: all 0.3s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.glass-switch input:checked + label .switch-inner {
  background: #10b981;
}

.glass-switch input:checked + label .switch-inner::after {
  left: 22px;
}

.switch-label {
  font-size: 13px;
  font-weight: 500;
  color: #475569;
}

.btn-glass-danger {
  background: rgba(239, 68, 68, 0.05);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.2);
  padding: 10px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-glass-danger:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
}

.linked-info-card {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  padding: 12px;
  border-left: 4px solid #3b82f6;
}

.empty-state {
  text-align: center;
  padding: 32px 20px;
  color: #94a3b8;
}

.empty-state i {
  font-size: 24px;
}

.empty-state p {
  font-size: 12px;
  margin: 0;
}

/* Animations */
.panel-slide-enter-active, .panel-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.panel-slide-enter-from, .panel-slide-leave-to {
  opacity: 0;
  transform: translateX(40px);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>




