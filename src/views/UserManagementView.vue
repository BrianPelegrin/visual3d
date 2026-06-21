<template>
  <div class="user-management-view p-4 min-vh-100">
    <div class="container-fluid">
      
      <!-- HEADER SECTION -->
      <div class="row mb-4 align-items-center">
        <div class="col-md-8">
          <h1 class="h3 fw-bold text-slate-900 mb-1">Mantenimiento de Usuarios</h1>
          <p class="text-slate-500 mb-0 smaller-text">
            Administra los usuarios y sus permisos en la plataforma.
          </p>
        </div>
        <div class="col-md-4 d-flex justify-content-md-end gap-2 mt-3 mt-md-0">
          <router-link to="/dashboard" class="btn btn-white shadow-sm border-0 px-3 py-2">
            <i class="bi bi-arrow-left me-2"></i>Volver
          </router-link>
          <button v-if="re_isAdmin()" class="btn btn-primary-custom shadow-sm border-0 px-4 py-2 fw-bold" @click="openAddModal">
            <i class="bi bi-person-plus me-2"></i>Nuevo Usuario
          </button>
        </div>
      </div>

      <!-- FILTERS SECTION -->
      <div class="card border-0 shadow-sm mb-4 user-filters-card">
        <div class="card-body">
          <div class="row g-3 align-items-end">
            <div class="col-md-5">
              <label class="form-label smaller-text fw-bold text-slate-400 text-uppercase ls-1">Búsqueda</label>
              <div class="input-group">
                <span class="input-group-text">
                  <i class="bi bi-search"></i>
                </span>
              <input 
                v-model="searchQuery" 
                type="text" 
                  class="form-control" 
                placeholder="Buscar por nombre o email..."
                @input="currentPage = 1"
              >
            </div>
          </div>
            <div class="col-md-4">
              <label class="form-label smaller-text fw-bold text-slate-400 text-uppercase ls-1">Rol</label>
              <div class="input-group">
                <span class="input-group-text">
                  <i class="bi bi-person-badge"></i>
                </span>
                <select 
                  v-model="roleFilter" 
                  class="form-select"
                  @change="currentPage = 1"
                >
                  <option value="all">Todos los roles</option>
                  <option value="admin">Administradores</option>
                  <option value="editor">Editores</option>
                  <option value="ventas">Ventas</option>
                  <option value="viewer">Visitantes</option>
                </select>
              </div>
          </div>
            <div class="col-md-3 d-flex align-items-end">
              <button class="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2" @click="searchQuery = ''; roleFilter = 'all'; currentPage = 1;">
                <i class="bi bi-arrow-counterclockwise"></i>
                <span>Limpiar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- USER LIST SECTION -->
      <div class="card border-0 shadow-sm overflow-hidden mb-4">
        <div class="table-responsive">
          <table class="table table-hover align-middle custom-user-table mb-0">
            <thead class="bg-white border-bottom">
              <tr class="smaller-text text-slate-500 text-uppercase fw-bold ls-1">
                <th class="ps-4">Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th class="text-end pe-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in paginatedUsers" :key="user.id">
                <td class="ps-4">
                  <div class="d-flex align-items-center gap-3">
                    <div class="avatar-box bg-blue-soft text-blue-600 fw-bold">
                      {{ user.name.charAt(0) }}
                    </div>
                    <div>
                      <div class="fw-bold text-slate-700">{{ user.name }}</div>
                      <div class="smaller-text text-slate-400">ID: {{ user.id }}</div>
                    </div>
                  </div>
                </td>
                <td class="text-slate-500">{{ user.email }}</td>
                <td>
                  <span :class="['role-pill', getRoleClass(user.role)]">
                    {{ translateRole(user.role) }}
                  </span>
                </td>
                <td class="text-end pe-4">
                  <div class="user-actions">
                    <button v-if="re_isAdmin()" class="btn btn-sm btn-outline-secondary user-action-btn" @click="openEditModal(user)" title="Editar usuario" aria-label="Editar usuario">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button v-if="re_isAdmin()" class="btn btn-sm btn-outline-danger user-action-btn" @click="confirmDelete(user)" title="Eliminar usuario" aria-label="Eliminar usuario">
                      <i class="bi bi-trash3"></i>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="paginatedUsers.length === 0">
                <td colspan="4" class="text-center py-5 text-slate-400">
                  <i class="bi bi-info-circle me-2"></i>No se encontraron usuarios con los filtros aplicados.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- PAGINATION SECTION -->
        <div v-if="totalPages > 1" class="px-4 py-3 border-top d-flex justify-content-between align-items-center bg-slate-50 rounded-bottom-4">
          <div class="smaller-text text-slate-500">
             Mostrando {{ startIndex + 1 }}-{{ Math.min(startIndex + itemsPerPage, filteredUsers.length) }} de {{ filteredUsers.length }}
          </div>
          <div class="d-flex gap-1">
            <button 
              class="btn btn-white pagination-btn" 
              :disabled="currentPage === 1"
              @click="currentPage--"
            >
              <i class="bi bi-chevron-left"></i>
            </button>
            
            <button 
              v-for="p in totalPages" 
              :key="p"
              class="btn pagination-btn"
              :class="currentPage === p ? 'btn-primary-custom' : 'btn-white'"
              @click="currentPage = p"
            >
              {{ p }}
            </button>

            <button 
              class="btn btn-white pagination-btn" 
              :disabled="currentPage === totalPages"
              @click="currentPage++"
            >
              <i class="bi bi-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>


    </div>

    <!-- ADD/EDIT MODAL -->
    <Transition name="user-modal">
      <div v-if="showModal" class="modal d-block user-modal" tabindex="-1" role="dialog" aria-modal="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow">
            <div class="modal-header">
              <h5 class="modal-title fw-bold">{{ isEditing ? 'Editar Usuario' : 'Nuevo Usuario' }}</h5>
              <button type="button" class="btn-close" aria-label="Cerrar" @click="closeModal"></button>
            </div>
            <div class="modal-body">
              <form id="user-form" @submit.prevent="saveUser">
                <div class="mb-3">
                  <label class="form-label text-slate-500 smaller-text fw-bold">NOMBRE COMPLETO</label>
                  <input v-model="form.name" type="text" class="form-control" required placeholder="Ej. Juan Pérez">
                </div>
                <div class="mb-3">
                  <label class="form-label text-slate-500 smaller-text fw-bold">EMAIL</label>
                  <input v-model="form.email" type="email" class="form-control" required placeholder="juan@example.com">
                </div>
                <div class="mb-3">
                  <label class="form-label text-slate-500 smaller-text fw-bold">
                    {{ isEditing ? 'NUEVA CONTRASEÑA (OPCIONAL)' : 'CONTRASEÑA' }}
                  </label>
                  <input
                    v-model="form.password"
                    type="password"
                    class="form-control"
                    :required="!isEditing"
                    :placeholder="isEditing ? 'Dejar en blanco para mantener la actual' : 'Ingresa una contraseña segura'"
                  >
                  <div v-if="isEditing" class="smaller-text text-slate-400 mt-1">
                    Solo completa este campo si quieres cambiar la contraseña del usuario.
                  </div>
                </div>
                <div class="mb-0">
                  <label class="form-label text-slate-500 smaller-text fw-bold">ROL</label>
                  <select v-model="form.role" class="form-select" required>
                    <option value="admin">Administrador</option>
                    <option value="editor">Editor</option>
                    <option value="ventas">Ventas</option>
                    <option value="viewer">Visitante</option>
                  </select>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary px-4" @click="closeModal">Cancelar</button>
              <button type="submit" form="user-form" class="btn btn-primary px-4 fw-bold">
                {{ isEditing ? 'Guardar Cambios' : 'Crear Usuario' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
    <Transition name="user-backdrop">
      <div v-if="showModal" class="modal-backdrop user-modal-backdrop"></div>
    </Transition>

    <!-- DELETE CONFIRMATION -->
    <Transition name="user-modal">
      <div v-if="showDeleteConfirm" class="modal d-block user-modal" tabindex="-1" role="dialog" aria-modal="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow">
            <div class="modal-header">
              <h5 class="modal-title fw-bold">Eliminar usuario</h5>
              <button type="button" class="btn-close" aria-label="Cerrar" @click="showDeleteConfirm = false"></button>
            </div>
            <div class="modal-body text-center">
              <div class="text-danger mb-3 fs-1">
                <i class="bi bi-exclamation-triangle"></i>
              </div>
              <p class="text-slate-500 mb-0">Esta acción eliminará a <strong>{{ userToDelete?.name }}</strong> y no se puede deshacer.</p>
            </div>
            <div class="modal-footer justify-content-center">
              <button class="btn btn-secondary px-4" @click="showDeleteConfirm = false">Cancelar</button>
              <button class="btn btn-danger px-4 fw-bold" @click="doDelete">Eliminar</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
    <Transition name="user-backdrop">
      <div v-if="showDeleteConfirm" class="modal-backdrop user-modal-backdrop"></div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { appStore, addUser, updateUser, deleteUser, isAdmin } from '../store/appStore';

// Permission exposure
const re_isAdmin = () => isAdmin();
import type { User, UserRole } from '../models/types';

// Filtering & Pagination State
const searchQuery = ref('');
const roleFilter = ref('all');
const currentPage = ref(1);
const itemsPerPage = 5;

// All users from store
const allUsers = computed(() => appStore.users);

// Filtered List
const filteredUsers = computed(() => {
  return allUsers.value.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
                         u.email.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesRole = roleFilter.value === 'all' || u.role === roleFilter.value;
    return matchesSearch && matchesRole;
  });
});

// Paginated List
const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredUsers.value.slice(start, end);
});

// Total Pages
const totalPages = computed(() => Math.ceil(filteredUsers.value.length / itemsPerPage));
const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage);

// Modal & Form State
const showModal = ref(false);
const isEditing = ref(false);
const editingUserId = ref<number | null>(null);
const showDeleteConfirm = ref(false);
const userToDelete = ref<User | null>(null);

const form = reactive({
  name: '',
  email: '',
  password: '',
  role: 'viewer' as UserRole
});

const translateRole = (role: UserRole) => {
  const roles: Record<string, string> = {
    admin: 'Administrador',
    editor: 'Editor',
    ventas: 'Ventas',
    viewer: 'Visitante'
  };
  return roles[role] || role;
};

const getRoleClass = (role: UserRole) => {
  switch (role) {
    case 'admin': return 'role-red';
    case 'editor': return 'role-blue';
    case 'ventas': return 'role-green';
    case 'viewer': return 'role-slate';
    default: return 'role-slate';
  }
};

const openAddModal = () => {
  isEditing.value = false;
  editingUserId.value = null;
  form.name = '';
  form.email = '';
  form.password = '';
  form.role = 'viewer';
  showModal.value = true;
};

const openEditModal = (user: User) => {
  isEditing.value = true;
  editingUserId.value = user.id;
  form.name = user.name;
  form.email = user.email;
  form.password = '';
  form.role = user.role;
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const saveUser = async () => {
  const normalizedPassword = form.password.trim();
  const payload = {
    name: form.name,
    email: form.email,
    role: form.role,
    ...(normalizedPassword ? { password: normalizedPassword } : {})
  };

  if (isEditing.value && editingUserId.value) {
    await updateUser(editingUserId.value, payload);
  } else {
    await addUser(payload);
  }
  closeModal();
};

const confirmDelete = (user: User) => {
  userToDelete.value = user;
  showDeleteConfirm.value = true;
};

const doDelete = async () => {
  if (userToDelete.value) {
    await deleteUser(userToDelete.value.id);
  }
  showDeleteConfirm.value = false;
  userToDelete.value = null;
};
</script>

<style scoped>
.user-management-view {
  background: #f8fafc;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  color: #1e293b;
}

@media (max-width: 768px) {
  .user-management-view {
    padding-top: 70px !important;
    padding-left: 1rem !important;
    padding-right: 1rem !important;
  }
}

.text-red-500 { color: #ef4444; }
.bg-red-soft { background: #fef2f2; }

.smaller-text { font-size: 0.75rem; }
.ls-1 { letter-spacing: 0.05em; }

.btn-primary-custom {
  background: #3b82f6;
  color: white;
}
.btn-primary-custom:hover {
  background: #2563eb;
  color: white;
}
.btn-danger-custom {
  background: #ef4444;
  color: white;
}
.btn-danger-custom:hover {
  background: #dc2626;
  color: white;
}
.user-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  flex-wrap: wrap;
}

.user-action-btn {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

/* Pagination */
.pagination-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-weight: 700;
  font-size: 0.85rem;
}

/* Avatar */
.avatar-box {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

/* Table */
.custom-user-table thead th {
  padding: 16px;
}
.custom-user-table tbody td {
  padding: 16px 8px;
  border-bottom: 1px solid #f1f5f9;
}

/* Role Pills */
.role-pill {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  text-transform: uppercase;
}
.role-red { background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; }
.role-blue { background: #eff6ff; color: #3b82f6; border: 1px solid #dbeafe; }
.role-green { background: #f0fdf4; color: #16a34a; border: 1px solid #dcfce7; }
.role-slate { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }

/* Modal */
.user-modal {
  background: transparent;
}

.user-modal-enter-active,
.user-modal-leave-active {
  transition: opacity 0.18s ease;
}

.user-modal-enter-active .modal-dialog,
.user-modal-leave-active .modal-dialog {
  transition: transform 0.22s ease, opacity 0.22s ease;
}

.user-modal-enter-from,
.user-modal-leave-to {
  opacity: 0;
}

.user-modal-enter-from .modal-dialog,
.user-modal-leave-to .modal-dialog {
  opacity: 0;
  transform: translateY(-18px) scale(0.98);
}

.user-backdrop-enter-active,
.user-backdrop-leave-active {
  transition: opacity 0.18s ease;
}

.user-backdrop-enter-from,
.user-backdrop-leave-to {
  opacity: 0;
}

.user-modal-backdrop {
  opacity: var(--bs-backdrop-opacity, 0.5);
}

/* Form */
.form-control, .form-select {
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  font-weight: 500;
}
.form-control:focus, .form-select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.user-filters-card .form-control,
.user-filters-card .form-select {
  padding: 0.375rem 0.75rem;
  border: var(--bs-border-width) solid var(--bs-border-color);
  border-radius: var(--bs-border-radius);
  font-weight: 400;
  line-height: 1.5;
}

.user-filters-card .form-control:focus,
.user-filters-card .form-select:focus {
  border-color: var(--bs-primary-border-subtle, var(--bs-primary));
  box-shadow: 0 0 0 0.25rem rgba(var(--bs-primary-rgb), 0.25);
}

/* Scrollbar styling */
.user-management-view::-webkit-scrollbar {
  width: 6px;
}
.user-management-view::-webkit-scrollbar-track {
  background: transparent;
}
.user-management-view::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}

@media (max-width: 768px) {
  .user-management-view {
    padding-top: 60px !important;
  }
}
</style>
