<template>
  <transition name="modal-fade">
    <div v-if="show" class="modal-overlay d-flex align-items-center justify-content-center" @click.self="close">
      <div class="modal-content-glass shadow-lg">
        <div class="modal-header-glass">
          <div class="d-flex align-items-center gap-3">
            <div class="avatar-large">
              {{ currentUser?.name.charAt(0) }}
            </div>
            <div>
              <h3 class="mb-0 fw-800 text-slate-900">Editar Perfil</h3>
              <p class="mb-0 smaller-text text-slate-500">Actualiza tu información personal</p>
            </div>
          </div>
          <button class="btn-close-custom" @click="close">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <form @submit.prevent="handleSave" class="modal-body-glass p-4">
          <div class="mb-3">
            <label class="form-label-glass">Nombre Completo</label>
            <div class="input-wrapper">
              <i class="bi bi-person"></i>
              <input v-model="formData.name" type="text" class="form-control-glass" required>
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label-glass">Correo Electrónico (No editable)</label>
            <div class="input-wrapper disabled">
              <i class="bi bi-envelope"></i>
              <input :value="formData.email" type="email" class="form-control-glass" disabled>
            </div>
          </div>

          <div class="mb-4">
            <div class="form-check-glass mb-3">
              <input v-model="shouldUpdatePassword" type="checkbox" id="updatePass" class="checkbox-glass">
              <label for="updatePass" class="checkbox-label">Actualizar contraseña</label>
            </div>

            <transition name="fade-slide-down">
              <div v-if="shouldUpdatePassword" class="password-fields-wrapper">
                <div class="mb-3">
                  <label class="form-label-glass">Contraseña Actual</label>
                  <div class="input-wrapper">
                    <i class="bi bi-shield-lock"></i>
                    <input v-model="formData.oldPassword" type="password" class="form-control-glass" placeholder="••••••••" required>
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label-glass">Nueva Contraseña</label>
                  <div class="input-wrapper">
                    <i class="bi bi-key"></i>
                    <input v-model="formData.password" type="password" class="form-control-glass" placeholder="••••••••" required>
                  </div>
                </div>
              </div>
            </transition>
          </div>

          <div v-if="error" class="alert alert-danger-glass mb-3">
            <i class="bi bi-exclamation-circle me-2"></i> {{ error }}
          </div>

          <div class="d-flex gap-3 pt-2">
            <button type="button" class="btn-glass-secondary flex-grow-1" @click="close">Cancelar</button>
            <button type="submit" class="btn-glass-primary flex-grow-1 d-flex align-items-center justify-content-center gap-2" :disabled="isSaving">
              <i v-if="isSaving" class="spinner-border spinner-border-sm"></i>
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { appStore, updateProfile } from '../../store/appStore';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits(['close']);

const currentUser = computed(() => appStore.currentUser);
const isSaving = ref(false);
const error = ref('');
const shouldUpdatePassword = ref(false);

const formData = reactive({
  name: '',
  email: '',
  oldPassword: '',
  password: ''
});

// Initialize form when opening
watch(() => props.show, (isShowing) => {
  if (isShowing && currentUser.value) {
    formData.name = currentUser.value.name;
    formData.email = currentUser.value.email;
    formData.oldPassword = '';
    formData.password = '';
    shouldUpdatePassword.value = false;
    error.value = '';
  }
});

const close = () => {
  if (!isSaving.value) emit('close');
};

const handleSave = async () => {
  if (!formData.name || !formData.email) {
    error.value = 'Por favor completa los campos obligatorios.';
    return;
  }

  isSaving.value = true;
  error.value = '';

  try {
    const updates: any = {
      name: formData.name
    };

    if (shouldUpdatePassword.value) {
      if (!formData.password || formData.password.length < 4) {
        error.value = 'La nueva contraseña debe tener al menos 4 caracteres.';
        isSaving.value = false;
        return;
      }

      if (!formData.oldPassword) {
        error.value = 'Debes indicar tu contraseña actual.';
        isSaving.value = false;
        return;
      }
      
      updates.password = formData.password;
      updates.oldPassword = formData.oldPassword;
    }

    const updated = await updateProfile(updates);
    if (!updated) {
      error.value = 'No se pudo actualizar el perfil.';
      return;
    }

    close();
  } catch (e: any) {
    error.value = 'Ocurrió un error al actualizar el perfil.';
  } finally {
    isSaving.value = false;
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(8px);
  z-index: 5000;
}

.modal-content-glass {
  width: 90%;
  max-width: 400px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px) saturate(180%);
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  overflow: hidden;
  animation: modal-pop 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modal-pop {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.modal-header-glass {
  padding: 24px;
  background: rgba(255, 255, 255, 0.3);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.avatar-large {
  width: 54px;
  height: 54px;
  background: #3b82f6;
  color: white;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 800;
  box-shadow: 0 8px 16px rgba(59, 130, 246, 0.25);
}

.btn-close-custom {
  background: none;
  border: none;
  font-size: 20px;
  color: #64748b;
  cursor: pointer;
  padding: 4px;
  transition: all 0.2s;
}

.btn-close-custom:hover {
  color: #ef4444;
  transform: rotate(90deg);
}

.form-label-glass {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: #475569;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrapper i {
  position: absolute;
  left: 14px;
  color: #94a3b8;
  font-size: 1rem;
}

.form-control-glass {
  width: 100%;
  padding: 12px 14px 12px 40px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 14px;
  font-size: 0.95rem;
  font-weight: 500;
  color: #1e293b;
  transition: all 0.2s;
}

.form-control-glass:focus {
  outline: none;
  background: white;
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.form-control-glass:disabled {
  background: rgba(0, 0, 0, 0.05);
  cursor: not-allowed;
  color: #94a3b8;
}

.input-wrapper.disabled i {
  opacity: 0.5;
}

.btn-glass-primary {
  background: #0f172a;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 14px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-glass-primary:hover:not(:disabled) {
  background: #1e293b;
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.15);
}

.btn-glass-primary:active {
  transform: translateY(0);
}

.btn-glass-secondary {
  background: rgba(0, 0, 0, 0.03);
  color: #475569;
  border: 1px solid rgba(0, 0, 0, 0.05);
  padding: 12px;
  border-radius: 14px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-glass-secondary:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #1e293b;
}

.alert-danger-glass {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.2);
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
}

.form-check-glass {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0, 0, 0, 0.03);
  padding: 10px 14px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.form-check-glass:hover {
  background: rgba(0, 0, 0, 0.06);
}

.checkbox-glass {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #3b82f6;
}

.checkbox-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  margin: 0;
}

/* Transitions */
.fade-slide-down-enter-active,
.fade-slide-down-leave-active {
  transition: all 0.3s ease-out;
  max-height: 200px;
}

.fade-slide-down-enter-from,
.fade-slide-down-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
  margin-bottom: 0 !important;
}

.modal-fade-enter-active, .modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from, .modal-fade-leave-to {
  opacity: 0;
}

.fw-800 { font-weight: 800; }
.text-slate-900 { color: #0f172a; }
.smaller-text { font-size: 0.75rem; }
.text-slate-500 { color: #64748b; }
</style>
