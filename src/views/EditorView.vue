<template>
  <div class="editor-view">
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
</style>
