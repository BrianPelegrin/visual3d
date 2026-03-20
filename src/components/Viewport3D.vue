<template>
  <div class="viewport-wrapper">
    <Toolbar v-if="!hideUI" @blueprint-loaded="onBlueprintLoaded" @add-building="handleAddBuilding" @save-layout="handleSaveLayout" />
    <PropertiesPanel v-if="!hideUI" />
    <UnitInfoWindow v-if="!hideUI" />
    <div ref="canvasContainer" class="canvas-container"></div>
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
import { appStore, addBuilding, selectBuilding, selectUnit, updateBuildingPosition, saveProjectLayout } from '../store/appStore';

const canvasContainer = ref<HTMLElement | null>(null);
let sceneManager: SceneManager | null = null;
const appMode = computed(() => appStore.appMode);
const selectedUnitId = computed(() => appStore.selectedUnitId);
const projectBuildings = computed(() => {
  if (!appStore.currentProjectId) return [];
  return appStore.buildings.filter(b => b.projectId === appStore.currentProjectId);
});
const currentProject = computed(() => appStore.projects.find(p => p.id === appStore.currentProjectId));

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
    
    // Initial sync with project-specific buildings
    sceneManager.syncBuildings(projectBuildings.value, appStore.visualFilters, selectedUnitId.value);
    applyCurrentBlueprint(currentProject.value?.imagenPlano);
  }
});

// Reactively sync buildings when the filtered list changes
watch(projectBuildings, (newBuildings) => {
  if (sceneManager) {
    sceneManager.syncBuildings(newBuildings, appStore.visualFilters, selectedUnitId.value);
  }
}, { deep: true });

watch(() => appStore.visualFilters, (newFilters) => {
  if (sceneManager) {
    sceneManager.syncBuildings(projectBuildings.value, newFilters, selectedUnitId.value);
  }
}, { deep: true });

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

watch(() => appStore.dragBuildingsEnabled, (enabled) => {
  if (sceneManager) {
    sceneManager.dragBuildingsEnabled = enabled;
  }
});

watch(() => appStore.gridSize, (newSize) => {
  if (sceneManager) {
    sceneManager.setGridSize(newSize);
  }
});

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

const handleAddBuilding = () => {
  // Add an initial building near the center
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
</style>

