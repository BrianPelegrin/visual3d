<template>
  <div class="viewport-wrapper">
    <Toolbar v-if="!hideUI" @blueprint-loaded="onBlueprintLoaded" @excel-selected="onExcelSelected" @add-building="handleAddBuilding" @save-layout="handleSaveLayout" @open-color-guide="showColorGuide = true" />
    <PropertiesPanel v-if="!hideUI" />
    <UnitInfoWindow v-if="!hideUI" />
    <ColorGuideModal :show="showColorGuide" @close="showColorGuide = false" />
    <div ref="canvasContainer" class="canvas-container"></div>

    <div v-if="showExcelPreviewModal" class="excel-modal-overlay">
      <div class="excel-modal-card">
        <div class="excel-modal-header">
          <h5 class="excel-modal-title">
            <i class="bi bi-file-earmark-spreadsheet me-2"></i>
            Generar Desde Excel
          </h5>
        </div>
        <div v-if="excelPreview" class="excel-modal-body">
          <p class="excel-modal-lead">Esta accion reemplazara completamente el layout actual del proyecto.</p>
          <div class="excel-summary-row"><span>Proyecto</span><strong>{{ appStore.currentProjectId ?? '-' }}</strong></div>
          <div class="excel-summary-row"><span>Hoja detectada</span><strong>{{ excelPreview.sheet }}</strong></div>
          <div class="excel-summary-row"><span>Layout actual</span><strong>{{ excelPreview.currentBuildings }} edificios / {{ excelPreview.currentUnits }} unidades</strong></div>
          <div class="excel-summary-row"><span>Layout nuevo</span><strong>{{ excelPreview.buildings }} edificios / {{ excelPreview.units }} unidades</strong></div>
        </div>
        <div class="excel-modal-footer">
          <button class="btn btn-secondary" :disabled="isApplyingExcel" @click="cancelExcelGeneration">Cancelar</button>
          <button class="btn btn-primary" :disabled="isApplyingExcel" @click="confirmExcelGeneration">
            <i v-if="isApplyingExcel" class="bi bi-arrow-repeat spin me-2"></i>
            {{ isApplyingExcel ? 'Generando...' : 'Reemplazar Layout' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
defineProps<{
  hideUI?: boolean;
}>();
import { SceneManager } from '../scene/SceneManager';
import Toolbar from './ui/Toolbar.vue';
import PropertiesPanel from './ui/PropertiesPanel.vue';
import UnitInfoWindow from './ui/UnitInfoWindow.vue';
import ColorGuideModal from './ui/ColorGuideModal.vue';
import { appStore, addBuilding, selectBuilding, selectUnit, updateBuildingPosition, saveProjectLayout, generateProjectLayoutFromExcel, previewProjectLayoutFromExcel } from '../store/appStore';

type ExcelPreview = {
  sheet: string;
  buildings: number;
  units: number;
  currentBuildings: number;
  currentUnits: number;
};

const canvasContainer = ref<HTMLElement | null>(null);
const showExcelPreviewModal = ref(false);
const showColorGuide = ref(false);
const isApplyingExcel = ref(false);
const excelPreview = ref<ExcelPreview | null>(null);
const selectedExcelFile = ref<File | null>(null);
let sceneManager: SceneManager | null = null;
const appMode = computed(() => appStore.appMode);
const selectedUnitId = computed(() => appStore.selectedUnitId);
const projectBuildings = computed(() => {
  if (!appStore.currentProjectId) return [];
  return appStore.buildings.filter((b) => b.projectId === appStore.currentProjectId);
});
const currentProject = computed(() => appStore.projects.find((p) => p.id === appStore.currentProjectId));

const applyCurrentBlueprint = (blueprintUrl?: string) => {
  if (sceneManager && blueprintUrl) {
    sceneManager.loadBlueprint(blueprintUrl);
  }
};

onMounted(() => {
  if (canvasContainer.value) {
    sceneManager = new SceneManager(canvasContainer.value);

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
    sceneManager.start();

    sceneManager.syncBuildings(projectBuildings.value, appStore.visualFilters, selectedUnitId.value);
    applyCurrentBlueprint(currentProject.value?.imagenPlano);
  }
});

watch(
  projectBuildings,
  (newBuildings) => {
    if (sceneManager) {
      sceneManager.syncBuildings(newBuildings, appStore.visualFilters, selectedUnitId.value);
    }
  },
  { deep: true }
);

watch(
  () => appStore.visualFilters,
  (newFilters) => {
    if (sceneManager) {
      sceneManager.syncBuildings(projectBuildings.value, newFilters, selectedUnitId.value);
    }
  },
  { deep: true }
);

watch(selectedUnitId, () => {
  if (sceneManager) {
    sceneManager.syncBuildings(projectBuildings.value, appStore.visualFilters, selectedUnitId.value);
  }
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

const onExcelSelected = async (file: File) => {
  const preview = await previewProjectLayoutFromExcel(file);
  if (!preview) return;

  selectedExcelFile.value = file;
  excelPreview.value = preview;
  showExcelPreviewModal.value = true;
};

const cancelExcelGeneration = () => {
  showExcelPreviewModal.value = false;
  excelPreview.value = null;
  selectedExcelFile.value = null;
  appStore.currentProjectLayoutStatus = 'ready';
  appStore.currentProjectLayoutMessage = 'Generacion desde Excel cancelada por el usuario.';
};

const confirmExcelGeneration = async () => {
  if (!selectedExcelFile.value) return;
  isApplyingExcel.value = true;
  try {
    await generateProjectLayoutFromExcel(selectedExcelFile.value);
  } finally {
    isApplyingExcel.value = false;
    showExcelPreviewModal.value = false;
    excelPreview.value = null;
    selectedExcelFile.value = null;
  }
};

const handleAddBuilding = () => {
  addBuilding({ x: 0, z: 0 });
};

const handleSaveLayout = async () => {
  await saveProjectLayout();
};

onUnmounted(() => {
  if (sceneManager) {
    sceneManager.dispose();
  }
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
