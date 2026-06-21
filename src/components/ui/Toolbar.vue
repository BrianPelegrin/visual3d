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

      <router-link
        v-if="currentProjectId"
        :to="{ name: 'dashboard', params: { id: currentProjectId } }"
        class="btn-glass-dashboard toolbar-mobile-only"
      >
        <i class="bi bi-speedometer2"></i>
        <span>Dashboard</span>
      </router-link>

      <button
        v-if="currentProjectId"
        class="btn-glass-reload toolbar-mobile-only"
        :disabled="isReloadingProjectInfo"
        @click="handleReloadProjectInfo"
      >
        <i class="bi bi-arrow-clockwise" :class="{ spin: isReloadingProjectInfo }"></i>
        <span>Recargar Informacion</span>
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

      <div class="toolbar-desktop-only desktop-controls d-flex align-items-center gap-2">
        <router-link
          v-if="currentProjectId"
          :to="{ name: 'dashboard', params: { id: currentProjectId } }"
          class="btn-glass-dashboard"
        >
          <i class="bi bi-speedometer2"></i>
          <span>Dashboard</span>
        </router-link>

        <button
          v-if="currentProjectId"
          class="btn-glass-reload"
          :disabled="isReloadingProjectInfo"
          @click="handleReloadProjectInfo"
        >
          <i class="bi bi-arrow-clockwise" :class="{ spin: isReloadingProjectInfo }"></i>
          <span>{{ isReloadingProjectInfo ? 'Recargando...' : 'Recargar Informacion' }}</span>
        </button>

        <div v-if="appMode === 'edit' && !re_isViewer()" class="control-group d-flex align-items-center gap-2">
          <div class="form-check form-switch m-0">
            <input class="form-check-input" type="checkbox" role="switch" :checked="dragBuildingsEnabled" @change="toggleDragBuildings">
          </div>
          <div class="control-label">
            <i class="bi bi-arrows-move"></i>
            <span class="d-none d-lg-inline">Mover</span>
          </div>
        </div>

        <div v-if="appMode === 'edit' && re_canEditData()" class="position-relative">
          <button class="btn-glass-filter" :class="{ active: showGlobalDimensions }" @click="showGlobalDimensions = !showGlobalDimensions" title="Dimensiones globales">
            <i class="bi bi-rulers"></i>
            <span class="d-none d-lg-inline">Dimensiones</span>
          </button>

          <div v-if="showGlobalDimensions" class="global-dimensions-panel shadow-lg p-3 rounded-4">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h6 class="mb-0 fw-bold smaller-text text-uppercase ls-1">Dimensiones Globales</h6>
              <button class="btn-close-sm" @click="showGlobalDimensions = false"><i class="bi bi-x-lg"></i></button>
            </div>
            <p class="global-dimensions-help">Aplica ancho, largo y altura a todos los edificios del proyecto actual.</p>
            <div class="global-dimensions-grid">
              <label>
                <span>Ancho</span>
                <input type="number" min="1" max="50" step="0.5" v-model.number="globalWidth">
              </label>
              <label>
                <span>Largo</span>
                <input type="number" min="1" max="50" step="0.5" v-model.number="globalDepth">
              </label>
              <label>
                <span>Alto</span>
                <input type="number" min="1" max="120" step="0.5" v-model.number="globalHeight">
              </label>
            </div>
            <button class="btn-glass-primary w-100 justify-content-center mt-3" :disabled="projectBuildings.length === 0" @click="applyGlobalDimensions">
              <i class="bi bi-check2-circle"></i>
              <span>Aplicar a {{ projectBuildings.length }} edificio{{ projectBuildings.length === 1 ? '' : 's' }}</span>
            </button>
          </div>
        </div>

        <div v-if="appMode === 'edit' && re_canEditData()" class="position-relative">
          <button class="btn-glass-filter" :class="{ active: showBlueprintControls || hasBlueprintTransform }" @click="toggleBlueprintControls" title="Ajustar plano">
            <i class="bi bi-bounding-box"></i>
            <span class="d-none d-lg-inline">Plano</span>
          </button>

          <div v-if="showBlueprintControls" class="blueprint-controls-panel shadow-lg p-3 rounded-4">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h6 class="mb-0 fw-bold smaller-text text-uppercase ls-1">Ajustar Plano</h6>
              <button class="btn-close-sm" @click="showBlueprintControls = false"><i class="bi bi-x-lg"></i></button>
            </div>
            <div class="blueprint-slider-row mb-3">
              <div class="control-label"><i class="bi bi-grid-3x3"></i><span>Suelo</span></div>
              <input type="range" class="glass-range blueprint-range" id="gridSizeRange" min="20" max="400" step="10" :value="gridSize" @input="updateGridSize">
              <span class="range-value">{{ gridSize }}m</span>
            </div>
            <div class="blueprint-controls-grid">
              <label>
                <span>X</span>
                <input type="number" step="0.1" :value="blueprintTransform.x" @input="updateBlueprintTransformValue('x', $event)">
              </label>
              <label>
                <span>Z</span>
                <input type="number" step="0.1" :value="blueprintTransform.z" @input="updateBlueprintTransformValue('z', $event)">
              </label>
              <label>
                <span>Ancho</span>
                <input type="number" min="1" step="0.5" :value="blueprintTransform.width" @input="updateBlueprintTransformValue('width', $event)">
              </label>
              <label>
                <span>Largo</span>
                <input type="number" min="1" step="0.5" :value="blueprintTransform.depth" @input="updateBlueprintTransformValue('depth', $event)">
              </label>
            </div>

            <div class="blueprint-slider-row mt-3">
              <div class="control-label"><i class="bi bi-arrow-clockwise"></i><span>Rotación</span></div>
              <input type="range" class="glass-range blueprint-range" min="0" max="359" step="1" :value="blueprintTransform.rotationY" @input="updateBlueprintTransformValue('rotationY', $event)">
              <span class="range-value">{{ Math.round(blueprintTransform.rotationY) }}°</span>
            </div>
            <div class="blueprint-slider-row mt-3">
              <div class="control-label"><i class="bi bi-layers"></i><span>Opacidad</span></div>
              <input type="range" class="glass-range blueprint-range" min="0.15" max="1" step="0.05" :value="blueprintTransform.opacity" @input="updateBlueprintTransformValue('opacity', $event)">
              <span class="range-value">{{ Math.round(blueprintTransform.opacity * 100) }}%</span>
            </div>

            <div class="blueprint-actions mt-3">
              <button class="btn-glass-primary justify-content-center" @click="autoFitBlueprint">
                <i class="bi bi-aspect-ratio"></i>
                <span>Auto-ajustar</span>
              </button>
              <button class="btn-glass-outline justify-content-center" @click="resetBlueprintTransform" title="Volver al ajuste automático">
                <i class="bi bi-arrow-counterclockwise"></i>
              </button>
            </div>
          </div>
        </div>

        <div v-if="showEditorFilters" class="toolbar-editor-filter">
          <ExcelLikeFilter
            :items="appStore.detailedUnits"
            :visible-fields="dashboardFilterFields"
            :field-labels="dashboardFilterLabels"
            :field-types="dashboardFilterTypes"
            :state="dashboardFilterPopupState"
            :storage-key="dashboardFilterStorageKey"
            trigger-label="Filtros"
            @apply="handleEditorFilterApply"
            @clear="handleEditorFilterClear"
            @state-change="handleEditorFilterStateChange"
          />
        </div>

        <button class="btn-glass-outline" @click="emit('open-color-guide')" title="Guía de Colores">
          <i class="bi bi-palette"></i>
        </button>

        <div v-if="appMode === 'edit' && re_canEditData()" class="actions-group d-flex gap-2">
          <button class="btn-glass-save" :disabled="isSaving" @click="emit('save-layout')" title="Guardar cambios">
            <i class="bi" :class="isSaving ? 'bi-arrow-repeat spin' : 'bi-cloud-check'"></i>
            <span>{{ isSaving ? 'Guardando' : 'Guardar' }}</span>
          </button>
          <button class="btn-glass-primary" @click="emit('add-building')"><i class="bi bi-plus-lg"></i><span>Edificio</span></button>
          <button class="btn-glass-outline" @click="emit('generate-from-apartments')" title="Generar a partir de Apartamentos"><i class="bi bi-database-gear"></i></button>
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
          <div class="mobile-section-title">Edición</div>
          <div class="control-group d-flex align-items-center justify-content-between gap-2">
            <div class="control-label"><i class="bi bi-arrows-move"></i><span>Mover edificios</span></div>
            <div class="form-check form-switch m-0">
              <input class="form-check-input" type="checkbox" role="switch" :checked="dragBuildingsEnabled" @change="toggleDragBuildings">
            </div>
          </div>
        </div>

        <div v-if="appMode === 'edit' && re_canEditData()" class="mobile-section">
          <div class="mobile-section-title">Dimensiones globales</div>
          <div class="global-dimensions-card">
            <p class="global-dimensions-help">Aplica el mismo ancho, largo y alto a todos los edificios.</p>
            <div class="global-dimensions-grid">
              <label>
                <span>Ancho</span>
                <input type="number" min="1" max="50" step="0.5" v-model.number="globalWidth">
              </label>
              <label>
                <span>Largo</span>
                <input type="number" min="1" max="50" step="0.5" v-model.number="globalDepth">
              </label>
              <label>
                <span>Alto</span>
                <input type="number" min="1" max="120" step="0.5" v-model.number="globalHeight">
              </label>
            </div>
            <button class="btn-glass-primary w-100 justify-content-center mt-3" :disabled="projectBuildings.length === 0" @click="applyGlobalDimensions">
              <i class="bi bi-check2-circle"></i>
              <span>Aplicar a todos</span>
            </button>
          </div>
        </div>

        <div v-if="appMode === 'edit' && re_canEditData()" class="mobile-section">
          <div class="mobile-section-title">Plano</div>
          <div class="global-dimensions-card">
            <div class="blueprint-slider-row mb-3">
              <div class="control-label"><i class="bi bi-grid-3x3"></i><span>Suelo</span></div>
              <input type="range" class="glass-range blueprint-range" id="gridSizeRangeMobile" min="20" max="400" step="10" :value="gridSize" @input="updateGridSize">
              <span class="range-value">{{ gridSize }}m</span>
            </div>
            <div class="blueprint-controls-grid">
              <label>
                <span>X</span>
                <input type="number" step="0.1" :value="blueprintTransform.x" @input="updateBlueprintTransformValue('x', $event)">
              </label>
              <label>
                <span>Z</span>
                <input type="number" step="0.1" :value="blueprintTransform.z" @input="updateBlueprintTransformValue('z', $event)">
              </label>
              <label>
                <span>Ancho</span>
                <input type="number" min="1" step="0.5" :value="blueprintTransform.width" @input="updateBlueprintTransformValue('width', $event)">
              </label>
              <label>
                <span>Largo</span>
                <input type="number" min="1" step="0.5" :value="blueprintTransform.depth" @input="updateBlueprintTransformValue('depth', $event)">
              </label>
            </div>
            <div class="blueprint-slider-row mt-3">
              <div class="control-label"><i class="bi bi-arrow-clockwise"></i><span>Rotación</span></div>
              <input type="range" class="glass-range blueprint-range" min="0" max="359" step="1" :value="blueprintTransform.rotationY" @input="updateBlueprintTransformValue('rotationY', $event)">
              <span class="range-value">{{ Math.round(blueprintTransform.rotationY) }}°</span>
            </div>
            <div class="blueprint-slider-row mt-3">
              <div class="control-label"><i class="bi bi-layers"></i><span>Opacidad</span></div>
              <input type="range" class="glass-range blueprint-range" min="0.15" max="1" step="0.05" :value="blueprintTransform.opacity" @input="updateBlueprintTransformValue('opacity', $event)">
              <span class="range-value">{{ Math.round(blueprintTransform.opacity * 100) }}%</span>
            </div>
            <div class="blueprint-actions mt-3">
              <button class="btn-glass-primary w-100 justify-content-center" @click="autoFitBlueprint">
                <i class="bi bi-aspect-ratio"></i>
                <span>Auto-ajustar</span>
              </button>
              <button class="btn-glass-outline justify-content-center" @click="resetBlueprintTransform">
                <i class="bi bi-arrow-counterclockwise"></i>
              </button>
            </div>
          </div>
        </div>

        <div v-if="showEditorFilters" class="mobile-section mobile-editor-filter-section">
          <div class="mobile-section-title">Filtros</div>
          <ExcelLikeFilter
            class="mobile-editor-filter"
            :items="appStore.detailedUnits"
            :visible-fields="dashboardFilterFields"
            :field-labels="dashboardFilterLabels"
            :field-types="dashboardFilterTypes"
            :state="dashboardFilterPopupState"
            :storage-key="dashboardFilterStorageKey"
            trigger-label="Filtros"
            @apply="handleEditorFilterApply"
            @clear="handleEditorFilterClear"
            @state-change="handleEditorFilterStateChange"
          />
        </div>

        <div v-if="appMode === 'edit' && re_canEditData()" class="mobile-section">
          <div class="mobile-section-title">Acciones</div>
          <div class="mobile-actions-grid">
            <button class="btn-glass-save w-100 justify-content-center" :disabled="isSaving" @click="emit('save-layout')"><i class="bi" :class="isSaving ? 'bi-arrow-repeat spin' : 'bi-cloud-check'"></i><span>{{ isSaving ? 'Guardando' : 'Guardar cambios' }}</span></button>
            <button class="btn-glass-primary w-100 justify-content-center" @click="emit('add-building')"><i class="bi bi-plus-lg"></i><span>Agregar edificio</span></button>
            <button class="btn-glass-outline w-100 justify-content-center" @click="emit('generate-from-apartments')"><i class="bi bi-database-gear"></i><span>Generar a partir de Apartamentos</span></button>
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

        <div class="mobile-section">
          <button class="btn-glass-outline w-100 justify-content-center" @click="emit('open-color-guide')">
            <i class="bi bi-palette"></i>
            <span>Guía de Colores</span>
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { appStore, setAppMode, setGridSize, setDragBuildingsEnabled, canEditData, isViewer, setVisualFilters, setBlueprintTransform, updateCurrentProjectBuildingDimensions, reloadProjectInfo, setDashboardFilterPopupState } from '../../store/appStore';
import type { BlueprintTransform } from '../../models/types';
import ExcelLikeFilter, { type FilterResult, type FilterState } from './ExcelLikeFilter.vue';
import { dashboardFilterFields, dashboardFilterLabels, dashboardFilterTypes } from '../../utils/dashboardFilterFields';

const re_canEditData = () => canEditData();
const re_isViewer = () => isViewer();
const fileInput = ref<HTMLInputElement | null>(null);
const mobileMenuOpen = ref(false);
const showGlobalDimensions = ref(false);
const showBlueprintControls = ref(false);
const globalWidth = ref(4);
const globalDepth = ref(4);
const globalHeight = ref(8);

const emit = defineEmits<{
  (e: 'blueprint-loaded', url: string): void;
  (e: 'blueprint-auto-fit'): void;
  (e: 'generate-from-apartments'): void;
  (e: 'add-building'): void;
  (e: 'save-layout'): void;
  (e: 'open-color-guide'): void;
}>();

const appMode = computed(() => appStore.appMode);
const currentProjectId = computed(() => appStore.currentProjectId);
const isReloadingProjectInfo = computed(() => appStore.isProjectContextLoading && appStore.currentProjectId === currentProjectId.value);
const dashboardFilterStorageKey = computed(() => currentProjectId.value ? `dashboard-filter-popup-${currentProjectId.value}` : '');
const dashboardFilterPopupState = computed(() => {
  const projectId = currentProjectId.value;
  return appStore.dashboardFilterPopupState
    ?? (projectId ? appStore.dashboardFilterStateByProject[projectId]?.popupState : null)
    ?? null;
});
const showEditorFilters = computed(() => appMode.value === 'view' || (appMode.value === 'edit' && canEditData()));
const gridSize = computed(() => appStore.gridSize);
const dragBuildingsEnabled = computed(() => appStore.dragBuildingsEnabled);
const hasBlueprintTransform = computed(() => appStore.blueprintTransform !== null);
const isSaving = computed(() => appStore.currentProjectLayoutStatus === 'saving');
const projectBuildings = computed(() => appStore.buildings.filter(building => building.projectId === appStore.currentProjectId));
const totalUnits = computed(() => projectBuildings.value.reduce((acc, building) => acc + building.units.length, 0));
const linkedUnits = computed(() => projectBuildings.value.reduce((acc, building) => acc + building.units.filter(unit => unit.detailedUnitId !== null).length, 0));
const unmatchedUnits = computed(() => Math.max(totalUnits.value - linkedUnits.value, 0));

const averageDimensions = computed(() => {
  if (projectBuildings.value.length === 0) {
    return { width: 4, depth: 4, height: 8 };
  }

  const totals = projectBuildings.value.reduce((acc, building) => ({
    width: acc.width + (Number(building.dimensions.width) || 0),
    depth: acc.depth + (Number(building.dimensions.depth) || 0),
    height: acc.height + (Number(building.dimensions.height) || 0)
  }), { width: 0, depth: 0, height: 0 });

  const count = projectBuildings.value.length;
  return {
    width: Number((totals.width / count).toFixed(1)),
    depth: Number((totals.depth / count).toFixed(1)),
    height: Number((totals.height / count).toFixed(1))
  };
});

const blueprintFallbackTransform = computed<BlueprintTransform>(() => {
  if (projectBuildings.value.length === 0) {
    return {
      x: 0,
      z: 0,
      width: Math.max(1, gridSize.value * 0.8),
      depth: Math.max(1, gridSize.value * 0.8),
      rotationY: 0,
      opacity: 1
    };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  projectBuildings.value.forEach((building) => {
    const width = Math.max(0, Number(building.dimensions.width) || 0);
    const depth = Math.max(0, Number(building.dimensions.depth) || 0);
    const positionX = Number(building.position.x);
    const positionZ = Number(building.position.z);
    const halfWidth = width / 2;
    const halfDepth = depth / 2;
    minX = Math.min(minX, positionX - halfWidth);
    maxX = Math.max(maxX, positionX + halfWidth);
    minZ = Math.min(minZ, positionZ - halfDepth);
    maxZ = Math.max(maxZ, positionZ + halfDepth);
  });

  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minZ) || !Number.isFinite(maxZ)) {
    return {
      x: 0,
      z: 0,
      width: Math.max(1, gridSize.value * 0.8),
      depth: Math.max(1, gridSize.value * 0.8),
      rotationY: 0,
      opacity: 1
    };
  }

  return {
    x: Number(((minX + maxX) / 2).toFixed(2)),
    z: Number(((minZ + maxZ) / 2).toFixed(2)),
    width: Number(Math.max(1, (maxX - minX) * 1.12).toFixed(2)),
    depth: Number(Math.max(1, (maxZ - minZ) * 1.12).toFixed(2)),
    rotationY: 0,
    opacity: 1
  };
});

const blueprintTransform = computed<BlueprintTransform>(() => appStore.blueprintTransform ?? blueprintFallbackTransform.value);

watch(averageDimensions, (dimensions) => {
  globalWidth.value = dimensions.width;
  globalDepth.value = dimensions.depth;
  globalHeight.value = dimensions.height;
}, { immediate: true });

const setMode = (mode: 'edit' | 'view') => setAppMode(mode);
const handleReloadProjectInfo = async () => {
  if (!currentProjectId.value || isReloadingProjectInfo.value) return;
  await reloadProjectInfo(currentProjectId.value);
};
const toggleBlueprintControls = () => {
  showBlueprintControls.value = !showBlueprintControls.value;
  if (showBlueprintControls.value && !appStore.blueprintTransform) {
    emit('blueprint-auto-fit');
  }
};
const toggleDragBuildings = (event: Event) => {
  const target = event.target as HTMLInputElement;
  setDragBuildingsEnabled(target.checked);
};
const updateGridSize = (event: Event) => setGridSize(parseInt((event.target as HTMLInputElement).value));
const handleEditorFilterApply = (result: FilterResult) => {
  const filteredUnitIds = result.filteredItems
    .map((item) => Number((item as { id?: unknown }).id))
    .filter((id) => Number.isFinite(id));

  const detailedUnitIds = result.activeFilters.length > 0 ? filteredUnitIds : null;
  setVisualFilters({
    detailedUnitIds
  });

  if (currentProjectId.value) {
    appStore.dashboardFilterStateByProject[currentProjectId.value] = {
      detailedUnitIds,
      popupState: dashboardFilterPopupState.value
    };
  }
};
const handleEditorFilterStateChange = (state: FilterState | null) => {
  setDashboardFilterPopupState(state);
};
const handleEditorFilterClear = () => {
  setVisualFilters({ detailedUnitIds: null });
  setDashboardFilterPopupState(null);
  if (currentProjectId.value) {
    delete appStore.dashboardFilterStateByProject[currentProjectId.value];
  }
};
const clampDimension = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Number(value) || min));
const updateBlueprintTransformValue = (key: keyof BlueprintTransform, event: Event) => {
  const rawValue = Number((event.target as HTMLInputElement).value);
  if (!Number.isFinite(rawValue)) return;

  const normalizedValue = key === 'width' || key === 'depth'
    ? Math.max(1, rawValue)
    : key === 'opacity'
      ? Math.max(0.15, Math.min(1, rawValue))
      : key === 'rotationY'
        ? ((rawValue % 360) + 360) % 360
        : rawValue;

  setBlueprintTransform({
    ...blueprintTransform.value,
    [key]: Number(normalizedValue.toFixed(2))
  });
};
const autoFitBlueprint = () => emit('blueprint-auto-fit');
const resetBlueprintTransform = () => setBlueprintTransform(null);
const applyGlobalDimensions = () => {
  const width = clampDimension(globalWidth.value, 1, 50);
  const depth = clampDimension(globalDepth.value, 1, 50);
  const height = clampDimension(globalHeight.value, 1, 120);
  globalWidth.value = width;
  globalDepth.value = depth;
  globalHeight.value = height;
  updateCurrentProjectBuildingDimensions({ width, depth, height });
  showGlobalDimensions.value = false;
};
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
.toolbar-editor-filter {
  flex-shrink: 0;
}
.toolbar-editor-filter :deep(.filter-trigger) {
  min-height: 36px;
  background: rgba(255,255,255,0.5);
  border: 1px solid rgba(0,0,0,0.08);
  padding: 8px 16px;
  border-radius: 12px;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
  box-shadow: none;
}
.toolbar-editor-filter :deep(.filter-trigger:hover),
.toolbar-editor-filter :deep(.filter-trigger.active) {
  background: white;
  color: #3b82f6;
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59,130,246,0.1);
}
.mobile-editor-filter {
  width: 100%;
}
.mobile-editor-filter :deep(.filter-trigger) {
  justify-content: space-between;
}
.filters-panel { position: absolute; top: calc(100% + 12px); right: -50%; width: 250px; max-height: 450px; overflow-y: auto; background: rgba(255,255,255,0.95); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.4); z-index: 1200; }
.filter-label { font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; display: block; }
.btn-close-sm { border: none; background: transparent; color: #94a3b8; cursor: pointer; padding: 4px; }
.btn-close-sm:hover { color: #f43f5e; }

.global-dimensions-panel {
  position: absolute;
  top: calc(100% + 12px);
  right: -30%;
  width: 310px;
  background: rgba(255,255,255,0.96);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.4);
  z-index: 1200;
}

.blueprint-controls-panel {
  position: absolute;
  top: calc(100% + 12px);
  right: -35%;
  width: 340px;
  background: rgba(255,255,255,0.96);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.4);
  z-index: 1200;
}

.global-dimensions-card {
  background: rgba(15,23,42,0.04);
  border: 1px solid rgba(15,23,42,0.08);
  border-radius: 16px;
  padding: 12px;
}

.global-dimensions-help {
  margin: 0 0 12px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.35;
}

.global-dimensions-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.blueprint-controls-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.global-dimensions-grid label,
.blueprint-controls-grid label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.global-dimensions-grid span,
.blueprint-controls-grid span {
  color: #64748b;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.global-dimensions-grid input,
.blueprint-controls-grid input {
  width: 100%;
  min-width: 0;
  border: 1px solid rgba(15,23,42,0.08);
  background: rgba(255,255,255,0.72);
  border-radius: 10px;
  color: #0f172a;
  font-size: 13px;
  font-weight: 700;
  outline: none;
  padding: 8px 9px;
}

.global-dimensions-grid input:focus,
.blueprint-controls-grid input:focus {
  background: #ffffff;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}

.blueprint-slider-row {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr) 44px;
  align-items: center;
  gap: 10px;
}

.blueprint-range {
  width: 100%;
}

.blueprint-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px;
  gap: 8px;
}

.btn-glass-primary, .btn-glass-save, .btn-glass-outline, .btn-glass-dashboard, .btn-glass-reload { border: none; padding: 8px 16px; border-radius: 12px; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s; }
.btn-glass-primary { background: #0f172a; color: white; box-shadow: 0 4px 12px rgba(15,23,42,0.15); }
.btn-glass-save { background: #22c55e; color: white; box-shadow: 0 4px 12px rgba(34,197,94,0.18); }
.btn-glass-save:hover:not(:disabled) { background: #16a34a; transform: translateY(-1px); }
.btn-glass-save:disabled { opacity: 0.7; cursor: wait; }
.btn-glass-primary:hover { background: #1e293b; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(15,23,42,0.2); }
.btn-glass-outline { background: rgba(255,255,255,0.5); color: #64748b; border: 1px solid rgba(0,0,0,0.08); padding: 8px 12px; font-size: 18px; }
.btn-glass-outline:hover { background: white; color: #0f172a; border-color: rgba(0,0,0,0.15); }
.btn-glass-dashboard {
  min-height: 38px;
  background: rgba(37,99,235,0.1);
  color: #1d4ed8;
  border: 1px solid rgba(37,99,235,0.18);
  text-decoration: none;
  white-space: nowrap;
}
.btn-glass-dashboard:hover {
  background: #2563eb;
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(37,99,235,0.18);
}
.btn-glass-reload {
  min-height: 38px;
  background: rgba(15,23,42,0.06);
  color: #334155;
  border: 1px solid rgba(15,23,42,0.1);
  white-space: nowrap;
}
.btn-glass-reload:hover:not(:disabled) {
  background: #ffffff;
  color: #0f172a;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(15,23,42,0.12);
}
.btn-glass-reload:disabled {
  opacity: 0.72;
  cursor: wait;
  transform: none;
}
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
.mobile-range-container .glass-range { flex: 1; width: 100%; }
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
.desktop-controls {
  gap: 14px !important;
}
.actions-group {
  gap: 12px !important;
}

@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

@media (max-width: 1320px) {
  .brand-text {
    display: none;
  }

  .toolbar-glass {
    padding: 0 14px;
  }

  .toolbar-row {
    gap: 10px !important;
  }

  .desktop-controls {
    gap: 8px !important;
  }

  .actions-group {
    gap: 8px !important;
  }

  .mode-btn {
    padding: 6px 12px;
  }

  .btn-glass-primary,
  .btn-glass-save,
  .btn-glass-outline,
  .btn-glass-dashboard,
  .btn-glass-reload,
  .btn-glass-filter {
    padding-left: 10px;
    padding-right: 10px;
  }
}

@media (max-width: 1516px) {
  .brand-text, .header-divider, .toolbar-desktop-only { display: none !important; }

  .toolbar-mobile-only {
    display: flex;
  }

  .toolbar-glass {
    left: 16px;
    right: 16px;
    padding: 0 12px;
    max-height: calc(100vh - 24px);
    overflow-y: auto;
  }

  .toolbar-row { min-height: 56px; }
  .mobile-panel { display: flex; flex-direction: column; gap: 14px; padding: 0 0 14px; }
  .filters-panel,
  .global-dimensions-panel,
  .blueprint-controls-panel {
    position: static;
    width: 100%;
    right: auto;
    top: auto;
    max-height: none;
    margin-top: 12px;
  }
  .mobile-editor-filter :deep(.filter-popover) {
    position: static;
    width: 100%;
    max-height: min(640px, 70vh);
    margin-top: 12px;
  }
  .mode-status-badge { display: inline-flex; }
}

@media (max-width: 520px) {
  .blueprint-controls-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .blueprint-slider-row {
    grid-template-columns: 1fr 52px;
  }

  .blueprint-slider-row .control-label {
    grid-column: 1 / -1;
  }
}

@media (max-width: 768px) {
  .toolbar-glass { left: 68px; right: 12px; }
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
  .btn-glass-dashboard.toolbar-mobile-only {
    min-height: 36px;
    padding: 0 10px;
    font-size: 12px;
  }
  .btn-glass-reload.toolbar-mobile-only {
    min-height: 36px;
    padding: 0 10px;
    font-size: 12px;
  }
}

@media (max-width: 380px) {
  .toolbar-glass { left: 60px; }
  .glass-range { width: 80px; }
  .btn-glass-dashboard.toolbar-mobile-only span {
    display: none;
  }
  .btn-glass-reload.toolbar-mobile-only span {
    display: none;
  }
}
</style>
