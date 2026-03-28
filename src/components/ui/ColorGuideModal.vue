<template>
  <div v-if="show" class="guide-overlay" @click.self="emit('close')">
    <div class="guide-modal">
      <div class="guide-header">
        <div>
          <h4 class="mb-1 fw-bold">Guía de Colores 3D</h4>
          <div class="guide-subtitle">Referencia visual de estados y selección de unidades.</div>
        </div>
        <button class="btn-close-sm" @click="emit('close')"><i class="bi bi-x-lg"></i></button>
      </div>
      <div class="guide-body">
        <div v-for="item in colorLegend" :key="item.label" class="guide-row">
          <span class="guide-swatch" :style="{ backgroundColor: item.color }"></span>
          <span class="guide-label">{{ item.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ show: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const colorLegend = [
  { label: 'Disponible', color: '#f8fafc' },
  { label: 'Entregado', color: '#22c55e' },
  { label: 'Inspección', color: '#06b6d4' },
  { label: 'Financiamiento', color: '#3b82f6' },
  { label: 'Vendido', color: '#6366f1' },
  { label: 'Observación', color: '#ef4444' },
  { label: 'Unidad seleccionada', color: '#f59e0b' }
];
</script>

<style scoped>
.guide-overlay {
  position: fixed;
  inset: 0;
  z-index: 5000;
  background: rgba(15, 23, 42, 0.72);
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  padding: 0;
}

.guide-modal {
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
  overflow-y: auto;
}

.guide-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(255, 255, 255, 0.65);
  position: sticky;
  top: 0;
  backdrop-filter: blur(10px);
  z-index: 2;
}

.guide-subtitle {
  color: #475569;
  font-size: 14px;
  font-weight: 500;
}

.guide-body {
  padding: 24px 28px 40px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.guide-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
}

.guide-swatch {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 1px solid rgba(15, 23, 42, 0.15);
  flex-shrink: 0;
}

.guide-label {
  font-size: 15px;
  color: #1e293b;
  font-weight: 700;
}

.btn-close-sm {
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  padding: 8px;
  border-radius: 10px;
}

.btn-close-sm:hover {
  background: rgba(15, 23, 42, 0.06);
  color: #ef4444;
}

@media (max-width: 768px) {
  .guide-header { padding: 18px 16px; }
  .guide-body { padding: 16px; grid-template-columns: 1fr; }
}
</style>
