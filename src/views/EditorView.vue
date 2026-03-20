<template>
  <div class="editor-view">
    <div v-if="layoutNotice" class="layout-notice">
      <i class="bi bi-info-circle-fill me-2"></i>
      <span>{{ layoutNotice }}</span>
    </div>
    <Viewport3D />
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { setAppMode, selectProject, isViewer } from '../store/appStore';
import Viewport3D from '../components/Viewport3D.vue';

const route = useRoute();
const projectId = computed(() => route.params.id as string);
const layoutNotice = computed(() => {
  return '';
});

const initProject = () => {
    if (isViewer()) {
        setAppMode('view');
    } else {
        setAppMode('edit');
    }
    
    if (projectId.value) {
        selectProject(projectId.value);
        console.log('Editor initialized for project:', projectId.value);
    }
};

onMounted(initProject);
watch(projectId, initProject);
</script>

<style scoped>
.editor-view {
  width: 100%;
  height: 100vh;
}

.layout-notice {
  position: absolute;
  top: 16px;
  left: 16px;
  right: 16px;
  z-index: 10;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 251, 235, 0.95);
  color: #92400e;
  border: 1px solid #fde68a;
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 24px rgba(251, 191, 36, 0.12);
  font-weight: 600;
  font-size: 0.9rem;
}
</style>
