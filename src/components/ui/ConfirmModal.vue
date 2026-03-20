<template>
  <div v-if="show" class="modal-overlay d-flex align-items-center justify-content-center">
    <div class="modal-container bg-white rounded shadow-lg p-4">
      <div class="modal-header border-bottom pb-2 mb-3">
        <h5 class="modal-title text-danger">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          {{ title }}
        </h5>
      </div>
      <div class="modal-body mb-4">
        <p class="mb-0">{{ message }}</p>
      </div>
      <div class="modal-footer d-flex justify-content-end gap-2">
        <button class="btn btn-secondary" @click="$emit('cancel')">Cancelar</button>
        <button class="btn btn-danger" @click="$emit('confirm')">Eliminar</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean;
  title: string;
  message: string;
}>();

defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1200; /* Above everything */
}

.modal-container {
  width: 100%;
  max-width: 400px;
  animation: modal-appear 0.2s ease-out;
}

@keyframes modal-appear {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
