<template>
  <div class="viewport-wrapper">
    <Toolbar v-if="!hideUI" @blueprint-loaded="onBlueprintLoaded" @blueprint-auto-fit="handleBlueprintAutoFit" @generate-from-apartments="onGenerateFromApartments" @add-building="handleAddBuilding" @save-layout="handleSaveLayout" @open-color-guide="showColorGuide = true" />
    <PropertiesPanel v-if="!hideUI" />
    <UnitInfoWindow v-if="!hideUI || showUnitInfo" />
    <ColorGuideModal :show="showColorGuide" @close="showColorGuide = false" />
    <div ref="canvasContainer" class="canvas-container"></div>

    <div v-if="showLayoutPreviewModal" class="excel-modal-overlay" @click.self="cancelLayoutGeneration">
      <div class="excel-modal-card" role="dialog" aria-modal="true" aria-label="Confirmación de generación desde API">
        <div class="excel-modal-header">
          <h5 class="excel-modal-title">
            <i class="bi bi-database-gear me-2"></i>
            Generar a partir de Apartamentos
          </h5>
        </div>
        <div v-if="layoutPreview" class="excel-modal-body">
          <p class="excel-modal-lead">Esta acción reemplazará completamente el layout actual del proyecto.</p>
          <div class="excel-summary-row"><span>Proyecto</span><strong>{{ appStore.currentProjectId ?? '-' }}</strong></div>
          <div class="excel-summary-row"><span>Fuente</span><strong>{{ layoutPreview.source }}</strong></div>
          <div class="excel-summary-row"><span>Layout actual</span><strong>{{ layoutPreview.currentBuildings }} edificios / {{ layoutPreview.currentUnits }} unidades</strong></div>
          <div class="excel-summary-row"><span>Layout nuevo</span><strong>{{ layoutPreview.buildings }} edificios / {{ layoutPreview.units }} unidades</strong></div>
        </div>
        <div class="excel-modal-footer">
          <button class="btn btn-secondary" :disabled="isApplyingLayout" @click="cancelLayoutGeneration">Cancelar</button>
          <button class="btn btn-primary" :disabled="isApplyingLayout" @click="confirmLayoutGeneration">
            <i v-if="isApplyingLayout" class="bi bi-arrow-repeat spin me-2"></i>
            {{ isApplyingLayout ? 'Generando...' : 'Reemplazar Layout' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
const props = defineProps<{
  hideUI?: boolean;
  showUnitInfo?: boolean;
  visibleDetailedUnitIds?: number[] | null;
}>();
import { SceneManager } from '../scene/SceneManager';
import Toolbar from './ui/Toolbar.vue';
import PropertiesPanel from './ui/PropertiesPanel.vue';
import UnitInfoWindow from './ui/UnitInfoWindow.vue';
import ColorGuideModal from './ui/ColorGuideModal.vue';
import { appStore, addBuilding, selectBuilding, selectUnit, setBlueprintTransform, updateBuildingPosition, saveProjectLayout, generateProjectLayoutFromApartments, previewProjectLayoutFromApartments } from '../store/appStore';

type LayoutPreview = {
  source: string;
  buildings: number;
  units: number;
  currentBuildings: number;
  currentUnits: number;
};

const canvasContainer = ref<HTMLElement | null>(null);
const showLayoutPreviewModal = ref(false);
const showColorGuide = ref(false);
const isApplyingLayout = ref(false);
const layoutPreview = ref<LayoutPreview | null>(null);
let sceneManager: SceneManager | null = null;
const appMode = computed(() => appStore.appMode);
const selectedUnitId = computed(() => appStore.selectedUnitId);
const effectiveVisualFilters = computed(() => ({
  ...appStore.visualFilters,
  detailedUnitIds: props.visibleDetailedUnitIds ?? appStore.visualFilters.detailedUnitIds ?? null
}));
const projectBuildings = computed(() => {
  if (!appStore.currentProjectId) return [];
  return appStore.buildings.filter((b) => b.projectId === appStore.currentProjectId);
});
const currentProject = computed(() => appStore.projects.find((p) => p.id === appStore.currentProjectId));
let pendingLayoutSyncId: number | null = null;

const syncSceneLayout = () => {
  if (!sceneManager) return;
  sceneManager.syncBuildings(projectBuildings.value, effectiveVisualFilters.value, selectedUnitId.value);
};

const scheduleSceneLayoutSync = () => {
  if (!sceneManager || pendingLayoutSyncId !== null) return;

  pendingLayoutSyncId = window.requestAnimationFrame(() => {
    pendingLayoutSyncId = null;
    syncSceneLayout();
  });
};

const updateSceneVisualState = () => {
  if (!sceneManager) return;
  sceneManager.updateUnitVisualState(effectiveVisualFilters.value, selectedUnitId.value);
};

const applyCurrentBlueprint = (blueprintUrl?: string) => {
  if (!sceneManager) return;

  if (blueprintUrl) {
    sceneManager.loadBlueprint(blueprintUrl);
  } else {
    sceneManager.clearBlueprint();
  }
};

onMounted(() => {
  if (canvasContainer.value) {
    sceneManager = new SceneManager(canvasContainer.value);
    sceneManager.setGridSize(appStore.gridSize);

    sceneManager.onObjectSelected = (id, isUnit) => {
      if (isUnit) {
        selectUnit(id);
      } else {
        selectBuilding(id);
      }
    };

    sceneManager.onBuildingMoved = (id, x, z) => {
      updateBuildingPosition(id, { x, z });
    };

    sceneManager.appMode = appMode.value;
    sceneManager.dragBuildingsEnabled = appStore.dragBuildingsEnabled;
    sceneManager.setBlueprintTransform(appStore.blueprintTransform);
    sceneManager.start();

    syncSceneLayout();
    applyCurrentBlueprint(currentProject.value?.imagenPlano);
  }
});

watch(
  projectBuildings,
  () => scheduleSceneLayoutSync(),
  { deep: true }
);

watch(
  effectiveVisualFilters,
  () => updateSceneVisualState(),
  { deep: true }
);

watch(
  () => appStore.unitColorSettings,
  () => updateSceneVisualState(),
  { deep: true }
);

watch(selectedUnitId, () => {
  updateSceneVisualState();
});

watch(appMode, (newMode) => {
  if (sceneManager) {
    sceneManager.appMode = newMode;
    sceneManager.updateDragControlsState();
  }
});

watch(
  () => appStore.dragBuildingsEnabled,
  (enabled) => {
    if (sceneManager) {
      sceneManager.dragBuildingsEnabled = enabled;
    }
  }
);

watch(
  () => appStore.gridSize,
  (newSize) => {
    if (sceneManager) {
      sceneManager.setGridSize(newSize);
    }
  }
);

watch(
  () => appStore.blueprintTransform,
  (transform) => {
    if (sceneManager) {
      sceneManager.setBlueprintTransform(transform);
    }
  },
  { deep: true }
);

watch(
  () => currentProject.value?.imagenPlano,
  (blueprintUrl) => {
    applyCurrentBlueprint(blueprintUrl);
  },
  { immediate: true }
);

const onBlueprintLoaded = (url: string) => {
  if (sceneManager) {
    sceneManager.loadBlueprint(url);
  }
};

const handleBlueprintAutoFit = () => {
  if (!sceneManager) {
    setBlueprintTransform(null);
    return;
  }

  setBlueprintTransform(sceneManager.getAutoBlueprintTransform());
};

const onGenerateFromApartments = async () => {
  const preview = await previewProjectLayoutFromApartments();
  if (!preview) return;

  layoutPreview.value = preview;
  showLayoutPreviewModal.value = true;
};

const cancelLayoutGeneration = () => {
  showLayoutPreviewModal.value = false;
  layoutPreview.value = null;
  appStore.currentProjectLayoutStatus = 'ready';
  appStore.currentProjectLayoutMessage = 'Generación desde API cancelada por el usuario.';
};

const confirmLayoutGeneration = async () => {
  isApplyingLayout.value = true;
  try {
    await generateProjectLayoutFromApartments();
  } finally {
    isApplyingLayout.value = false;
    showLayoutPreviewModal.value = false;
    layoutPreview.value = null;
  }
};

const handleAddBuilding = () => {
  addBuilding({ x: 0, z: 0 });
};

const handleSaveLayout = async () => {
  await saveProjectLayout();
};

onUnmounted(() => {
  if (pendingLayoutSyncId !== null) {
    window.cancelAnimationFrame(pendingLayoutSyncId);
    pendingLayoutSyncId = null;
  }
  if (sceneManager) {
    sceneManager.dispose();
  }
  window.removeEventListener('keydown', onModalEscape);
});

const onModalEscape = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return;
  if (showLayoutPreviewModal.value && !isApplyingLayout.value) {
    cancelLayoutGeneration();
  }
};

onMounted(() => {
  window.addEventListener('keydown', onModalEscape);
});
</script>

<style scoped>
.viewport-wrapper {
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.canvas-container {
  width: 100%;
  height: 100%;
  display: block;
}

.excel-modal-overlay {
  position: absolute;
  inset: 0;
  z-index: 1400;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.excel-modal-card {
  width: min(560px, 100%);
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 20px 48px rgba(2, 6, 23, 0.25);
  overflow: hidden;
}

.excel-modal-header {
  padding: 16px 18px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.excel-modal-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  color: #0f172a;
}

.excel-modal-body {
  padding: 16px 18px;
}

.excel-modal-lead {
  margin: 0 0 12px 0;
  color: #334155;
  font-size: 0.95rem;
}

.excel-summary-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 8px 0;
  border-bottom: 1px dashed #e2e8f0;
  color: #475569;
  font-size: 0.92rem;
}

.excel-summary-row strong {
  color: #0f172a;
  text-align: right;
}

.excel-modal-footer {
  padding: 14px 18px 18px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>

