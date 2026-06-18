<template>
  <div class="colors-view p-4 min-vh-100">
    <div class="container-fluid">
      <div class="row mb-4 align-items-center">
        <div class="col-md-8">
          <router-link to="/settings" class="back-button mb-3">
            <i class="bi bi-arrow-left"></i>
            <span>Volver a configuraciones</span>
          </router-link>
          <h1 class="h3 fw-bold text-slate-900 mb-1">Colores de unidades</h1>
          <p class="text-slate-500 mb-0 smaller-text">
            Administra los colores globales para los estados de las unidades.
          </p>
        </div>
      </div>

      <div class="colors-panel bg-white shadow-sm">
        <div class="colors-panel-header">
          <div>
            <h2 class="h5 fw-bold mb-1">Paleta de estados</h2>
            <p class="text-slate-500 mb-0 smaller-text">
              Estos colores se aplican en toda la aplicacion.
            </p>
          </div>
          <button class="btn btn-primary-custom shadow-sm border-0 px-4 py-2 fw-bold" @click="openAddModal">
            <i class="bi bi-plus-lg me-2"></i>Nuevo color
          </button>
        </div>

        <div v-if="unitColorsErrorMessage" class="list-error">
          <div class="fw-bold text-danger mb-2">{{ unitColorsErrorMessage }}</div>
          <button class="btn btn-outline-slate btn-sm" @click="loadUnitColorSettings">
            <i class="bi bi-arrow-clockwise me-1"></i>Reintentar
          </button>
        </div>

        <div v-if="isUnitColorsLoading" class="list-loader">
          <div class="list-loader-spinner"></div>
          <div class="list-loader-text">Cargando colores...</div>
        </div>

        <div v-else class="table-responsive">
          <table class="table table-hover align-middle colors-table mb-0">
            <thead class="bg-white border-bottom">
              <tr class="smaller-text text-slate-500 text-uppercase fw-bold ls-1">
                <th class="ps-4">Estado</th>
                <th>Color</th>
                <th>Hex</th>
                <th class="text-end pe-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in sortedColors" :key="`${item.id ?? item.estado}-${item.colorCss}`">
                <td class="ps-4">
                  <div class="fw-bold text-slate-700">{{ item.estado }}</div>
                  <div class="smaller-text text-slate-400">Clave: {{ getEstadoKey(item.estado) }}</div>
                </td>
                <td>
                  <div class="d-flex align-items-center gap-3">
                    <span class="color-swatch" :style="{ backgroundColor: item.colorCss }"></span>
                    <span class="text-slate-500 fw-medium">{{ item.colorCss }}</span>
                  </div>
                </td>
                <td>
                  <span class="color-pill">{{ item.colorCss }}</span>
                </td>
                <td class="text-end pe-4">
                  <div class="d-flex justify-content-end gap-2">
                    <button class="btn btn-icon text-blue-600" title="Editar" :disabled="isUnitColorsSaving" @click="openEditModal(item)">
                      <i class="bi bi-pencil-square"></i>
                    </button>
                    <button class="btn btn-icon text-red-500" title="Eliminar" :disabled="isUnitColorsSaving" @click="removeColor(item)">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="sortedColors.length === 0">
                <td colspan="4" class="text-center py-5 text-slate-400">
                  <i class="bi bi-info-circle me-2"></i>No hay colores configurados.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="modal-overlay d-flex align-items-center justify-content-center">
      <div class="modal-content-custom bg-white rounded-4 shadow-lg p-4">
        <div class="d-flex align-items-start justify-content-between gap-3 mb-4">
          <div>
            <h4 class="fw-bold text-slate-900 mb-1">{{ isEditing ? 'Editar color' : 'Nuevo color' }}</h4>
            <p class="text-slate-500 smaller-text mb-0">
              Define el estado y el color que usara la aplicacion.
            </p>
          </div>
          <button type="button" class="btn-close-sm" @click="closeModal">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div v-if="formError" class="form-banner form-banner-danger mb-4">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          <span>{{ formError }}</span>
        </div>

        <form @submit.prevent="saveColor">
          <div class="mb-3">
            <label class="form-label text-slate-500 smaller-text fw-bold text-uppercase">Nombre del estado</label>
            <input
              v-model="form.estado"
              type="text"
              class="form-control"
              required
              placeholder="Ej. Vendido"
            >
          </div>

          <div class="mb-4">
            <label class="form-label text-slate-500 smaller-text fw-bold text-uppercase">Color</label>
            <div class="color-input-row">
              <input v-model="form.colorCss" type="color" class="form-control form-control-color color-picker" required>
              <input v-model="form.colorCss" type="text" class="form-control" required pattern="^#[0-9a-fA-F]{6}$" placeholder="#3b82f6">
            </div>
          </div>

          <div class="modal-preview mb-4">
            <span class="color-swatch" :style="{ backgroundColor: normalizedPreviewColor }"></span>
            <div>
              <div class="fw-bold text-slate-700">{{ form.estado || 'Nombre del estado' }}</div>
              <div class="smaller-text text-slate-400">{{ normalizedPreviewColor }}</div>
            </div>
          </div>

          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-white px-4" :disabled="isUnitColorsSaving" @click="closeModal">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary-custom px-4 fw-bold" :disabled="isUnitColorsSaving">
              <span v-if="isUnitColorsSaving" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              {{ isEditing ? 'Guardar cambios' : 'Crear color' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { appStore, deleteUnitColorSetting, loadUnitColorSettings, saveUnitColorSetting } from '../../store/appStore';
import type { UnitColorSetting } from '../../models/types';
import { normalizeEstadoKey } from '../../scene/RulesEngine';

const showModal = ref(false);
const isEditing = ref(false);
const editingColorId = ref<UnitColorSetting['id']>(null);
const editingOriginalEstado = ref('');
const formError = ref('');

const form = reactive({
  estado: '',
  colorCss: '#3b82f6'
});

const unitColorsErrorMessage = computed(() => appStore.unitColorsErrorMessage);
const isUnitColorsLoading = computed(() => appStore.isUnitColorsLoading);
const isUnitColorsSaving = computed(() => appStore.isUnitColorsSaving);
const sortedColors = computed(() =>
  [...appStore.unitColorSettings].sort((a, b) => a.estado.localeCompare(b.estado, 'es', { sensitivity: 'base' }))
);
const normalizedPreviewColor = computed(() => normalizeColorInput(form.colorCss));

const getEstadoKey = (estado: string) => normalizeEstadoKey(estado) || 'sin_estado';
const normalizeColorInput = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value.trim())
  ? value.trim().toLowerCase()
  : '#3b82f6';

const resetForm = () => {
  form.estado = '';
  form.colorCss = '#3b82f6';
  editingColorId.value = null;
  editingOriginalEstado.value = '';
  formError.value = '';
};

const openAddModal = () => {
  resetForm();
  isEditing.value = false;
  showModal.value = true;
};

const openEditModal = (item: UnitColorSetting) => {
  resetForm();
  isEditing.value = true;
  editingColorId.value = item.id;
  editingOriginalEstado.value = item.estado;
  form.estado = item.estado;
  form.colorCss = item.colorCss;
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const validateForm = () => {
  const estado = form.estado.trim();
  if (!estado) return 'El nombre del estado es requerido.';

  const key = getEstadoKey(estado);
  const duplicate = appStore.unitColorSettings.some((item) =>
    getEstadoKey(item.estado) === key
    && (!isEditing.value || getEstadoKey(editingOriginalEstado.value) !== key)
  );
  if (duplicate) return 'Ya existe un color configurado para ese estado.';

  if (!/^#[0-9a-fA-F]{6}$/.test(form.colorCss.trim())) {
    return 'Selecciona un color válido en formato hexadecimal.';
  }

  return '';
};

const saveColor = async () => {
  formError.value = validateForm();
  if (formError.value) return;

  try {
    await saveUnitColorSetting({
      id: editingColorId.value,
      estado: form.estado.trim(),
      colorCss: normalizeColorInput(form.colorCss)
    });
    closeModal();
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'No se pudo guardar el color.';
  }
};

const removeColor = async (item: UnitColorSetting) => {
  const confirmed = window.confirm(`Eliminar el color configurado para "${item.estado}"?`);
  if (!confirmed) return;

  try {
    await deleteUnitColorSetting(item);
  } catch (_error) {
    // The store exposes the error banner in the list.
  }
};

onMounted(() => {
  void loadUnitColorSettings();
});
</script>

<style scoped>
.colors-view {
  background: #f8fafc;
  color: #1e293b;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

.colors-panel {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  overflow: hidden;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #2563eb;
  font-size: 0.9rem;
  font-weight: 700;
  text-decoration: none;
}

.back-button:hover {
  color: #1d4ed8;
}

.colors-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.colors-table thead th {
  padding: 16px;
}

.colors-table tbody td {
  padding: 16px 8px;
  border-bottom: 1px solid #f1f5f9;
}

.color-swatch {
  width: 36px;
  height: 36px;
  border: 1px solid rgba(15, 23, 42, 0.14);
  border-radius: 10px;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.35);
  flex-shrink: 0;
}

.color-pill {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #f8fafc;
  color: #334155;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
}

.list-error {
  padding: 20px 24px;
  background: #fef2f2;
  border-bottom: 1px solid #fecaca;
}

.list-loader {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 180px;
  color: #64748b;
  font-weight: 700;
}

.list-loader-spinner {
  width: 22px;
  height: 22px;
  border: 3px solid #cbd5e1;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 5000;
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(4px);
  padding: 16px;
}

.modal-content-custom {
  width: 100%;
  max-width: 460px;
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
  background: #f1f5f9;
  color: #ef4444;
}

.color-input-row {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 12px;
}

.color-picker {
  width: 76px;
  min-height: 44px;
  padding: 6px;
}

.modal-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #f8fafc;
}

.form-banner {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.85rem;
}

.form-banner-danger {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.form-control {
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  font-weight: 500;
}

.form-control:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.btn-primary-custom {
  background: #3b82f6;
  color: white;
}

.btn-primary-custom:hover {
  background: #2563eb;
  color: white;
}

.btn-outline-slate {
  color: #475569;
  border: 1px solid #cbd5e1;
  background: white;
}

.btn-outline-slate:hover {
  color: #1e293b;
  border-color: #94a3b8;
}

.btn-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: transparent;
  padding: 0;
  border: none;
}

.btn-icon:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.05);
}

.btn-icon:disabled {
  opacity: 0.55;
}

.text-red-500 { color: #ef4444; }
.smaller-text { font-size: 0.75rem; }
.ls-1 { letter-spacing: 0.05em; }

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .colors-view {
    padding-top: 70px !important;
    padding-left: 1rem !important;
    padding-right: 1rem !important;
  }

  .back-button {
    margin-left: 56px;
  }

  .colors-panel-header {
    align-items: stretch;
    flex-direction: column;
  }

  .colors-panel-header .btn {
    width: 100%;
  }
}
</style>
