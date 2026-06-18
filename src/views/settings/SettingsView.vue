<template>
  <div class="settings-view p-4 min-vh-100">
    <div class="container-fluid">
      <div class="settings-header row mb-4 align-items-center">
        <div class="col-md-8">
          <h1 class="h3 fw-bold text-slate-900 mb-1">Configuraciones</h1>
          <p class="text-slate-500 mb-0 smaller-text">
            Ajusta las preferencias generales del sistema.
          </p>
        </div>
      </div>

      <div class="settings-menu">
        <router-link to="/settings/colors" class="settings-option bg-white shadow-sm">
          <div class="settings-option-icon">
            <i class="bi bi-palette"></i>
          </div>
          <div class="settings-option-content">
            <h2 class="h5 fw-bold mb-1">Colores de unidades</h2>
            <p class="text-slate-500 mb-0 smaller-text">
              Configura la paleta visual utilizada para identificar los estados de las unidades.
            </p>
          </div>
          <i class="bi bi-chevron-right settings-option-arrow"></i>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.settings-view {
  background: #f8fafc;
}

.settings-header {
  transition: padding-top 0.2s ease;
}

.settings-menu {
  display: grid;
  gap: 16px;
}

.settings-option {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  color: inherit;
  text-decoration: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.settings-option:hover {
  border-color: #93c5fd;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.settings-option-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 52px;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 1.5rem;
}

.settings-option-content {
  flex: 1;
  min-width: 0;
}

.settings-option-arrow {
  flex: 0 0 auto;
  font-size: 1rem;
  color: #64748b;
}

@media (max-width: 768px) {
  .settings-header {
    padding-top: 56px;
  }
}
</style>
