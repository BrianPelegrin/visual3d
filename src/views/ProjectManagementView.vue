<template>
  <div class="project-management-view p-4 min-vh-100">
    <div class="container-fluid">
      
      <!-- HEADER SECTION -->
      <div class="row mb-4 align-items-center">
        <div class="col-md-8">
          <h1 class="h3 fw-bold text-slate-900 mb-1">Mantenimiento de Proyectos</h1>
          <p class="text-slate-500 mb-0 smaller-text">
            Administra los proyectos de edificios y sus planos base.
          </p>
        </div>
        <div class="col-md-4 d-flex justify-content-md-end gap-2 mt-3 mt-md-0">
          <button v-if="re_canEditData()" class="btn btn-primary-custom shadow-sm border-0 px-4 py-2 fw-bold" @click="openAddModal">
            <i class="bi bi-plus-lg me-2"></i>Nuevo Proyecto
          </button>
        </div>
      </div>

      <!-- FILTERS SECTION -->
      <div class="mb-4">
        <div class="filter-glass p-3 rounded-4 shadow-sm">
          <div class="row g-3 align-items-end">
            <div class="col-md-4">
              <label class="form-label smaller-text fw-bold text-slate-400 text-uppercase ls-1">Búsqueda</label>
              <div class="search-wrapper position-relative">
                <i class="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-slate-400"></i>
                <input 
                  v-model="searchQuery" 
                  type="text" 
                  class="form-control ps-5 border-0 bg-slate-100 shadow-none py-2" 
                  placeholder="Nombre o dirección..."
                >
              </div>
            </div>
            <div class="col-md-3">
              <label class="form-label smaller-text fw-bold text-slate-400 text-uppercase ls-1">Provincia</label>
              <div class="position-relative">
                <i class="bi bi-geo-alt position-absolute top-50 start-0 translate-middle-y ms-3 text-slate-400"></i>
                <input 
                  v-model="provinciaFilter" 
                  type="text" 
                  class="form-control ps-5 border-0 bg-slate-100 shadow-none py-2" 
                  placeholder=" Filtrar..."
                >
              </div>
            </div>
            <div class="col-md-3">
              <label class="form-label smaller-text fw-bold text-slate-400 text-uppercase ls-1">Municipio</label>
              <div class="position-relative">
                <i class="bi bi-geo position-absolute top-50 start-0 translate-middle-y ms-3 text-slate-400"></i>
                <input 
                  v-model="municipioFilter" 
                  type="text" 
                  class="form-control ps-5 border-0 bg-slate-100 shadow-none py-2" 
                  placeholder=" Filtrar..."
                >
              </div>
            </div>
            <div class="col-md-2 d-flex align-items-end">
              <button 
                class="btn btn-outline-slate btn-sm w-100 py-2 rounded-3 d-flex align-items-center justify-content-center gap-2" 
                @click="searchQuery = ''; provinciaFilter = ''; municipioFilter = '';"
              >
                <i class="bi bi-arrow-counterclockwise"></i>
                <span>Limpiar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- PROJECT LIST SECTION -->
      <div class="card border-0 shadow-sm rounded-4 bg-white overflow-hidden mb-4">
        <div v-if="isProjectsLoading" class="list-loader">
          <div class="list-loader-spinner"></div>
          <div class="list-loader-text">Cargando proyectos...</div>
        </div>
        <div v-else class="table-responsive">
          <table class="table table-hover align-middle custom-project-table mb-0">
            <thead class="bg-white border-bottom">
              <tr class="smaller-text text-slate-500 text-uppercase fw-bold ls-1">
                <th class="ps-4">ID</th>
                <th>Proyecto</th>
                <th>Ubicación</th>
                <th class="text-end pe-4" style="min-width: 180px;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="prj in paginatedProjects" :key="prj.id">
                <td class="ps-4">
                  <span class="badge bg-slate-900 text-white rounded-pill px-3 fw-bold">{{ prj.id }}</span>
                </td>
                <td>
                  <div class="d-flex align-items-center gap-3">
                    <div class="project-img-box bg-blue-soft rounded-3 overflow-hidden">
                      <img v-if="prj.imagenPlano" :src="prj.imagenPlano" :alt="prj.nombre">
                      <i v-else class="bi bi-building text-blue-600"></i>
                    </div>
                    <div>
                      <div class="fw-bold text-slate-700">{{ prj.nombre }}</div>
                      <div class="smaller-text text-slate-400">{{ prj.direccion }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="text-slate-700 fw-medium">{{ prj.municipio }}</div>
                  <div class="smaller-text text-slate-400">{{ prj.provincia }}</div>
                </td>
                <td class="text-end pe-4">
                  <div class="d-flex justify-content-end gap-2">
                    <button class="btn btn-icon text-blue-500" @click="enterEditMode(prj.id)" title="Editar Modelo 3D">
                      <i class="bi bi-box-seam"></i>
                    </button>
                    <div class="vr mx-1 opacity-25"></div>
                    <router-link :to="`/dashboard/${prj.id}`" class="btn btn-icon text-emerald-600" title="Ver Dashboard">
                      <i class="bi bi-speedometer2"></i>
                    </router-link>
                    <router-link :to="`/projects/${prj.id}/units`" class="btn btn-icon text-indigo-600" title="Ver Apartamentos">
                      <i class="bi bi-houses"></i>
                    </router-link>
                    <div class="vr mx-1 opacity-25"></div>
                    <button v-if="re_canEditData()" class="btn btn-icon text-blue-600" @click="openEditModal(prj)" title="Editar Info">
                      <i class="bi bi-pencil-square"></i>
                    </button>
                    <button v-if="re_canDeleteData()" class="btn btn-icon text-red-500" @click="confirmDelete(prj)" title="Eliminar">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="paginatedProjects.length === 0">
                <td colspan="4" class="text-center py-5 text-slate-400">
                  <i class="bi bi-info-circle me-2"></i>No se encontraron proyectos con los filtros aplicados.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- PAGINATION SECTION -->
        <div v-if="totalPages > 1" class="px-4 py-3 border-top d-flex justify-content-between align-items-center bg-slate-50 rounded-bottom-4">
          <div class="smaller-text text-slate-500">
             Mostrando {{ startIndex + 1 }}-{{ Math.min(startIndex + itemsPerPage, filteredProjects.length) }} de {{ filteredProjects.length }}
          </div>
          <div class="d-flex gap-1">
            <button 
              class="btn btn-white pagination-btn" 
              :disabled="currentPage === 1"
              @click="currentPage--"
            >
              <i class="bi bi-chevron-left"></i>
            </button>
            
            <template v-for="p in visiblePages" :key="p">
              <span v-if="p === '...'" class="px-2 text-slate-400">...</span>
              <button 
                v-else
                class="btn pagination-btn"
                :class="currentPage === p ? 'btn-primary-custom' : 'btn-white'"
                @click="currentPage = Number(p)"
              >
                {{ p }}
              </button>
            </template>

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
    <div v-if="showModal" class="modal-overlay d-flex align-items-center justify-content-center">
      <div class="modal-content-custom bg-white rounded-4 shadow-lg p-4 animate__animated animate__fadeInDown">
        <h4 class="fw-bold text-slate-900 mb-4">{{ isEditing ? 'Editar Proyecto' : 'Nuevo Proyecto' }}</h4>

        <div v-if="formMessage" class="form-banner mb-4" :class="formMessageType === 'danger' ? 'form-banner-danger' : 'form-banner-warning'">
          <i class="bi me-2" :class="formMessageType === 'danger' ? 'bi-exclamation-triangle-fill' : 'bi-exclamation-circle-fill'"></i>
          <span>{{ formMessage }}</span>
        </div>
        
        <form @submit.prevent="saveProject">
          <div class="mb-4">
            <label class="form-label text-slate-500 smaller-text fw-bold ls-1 mb-2 text-uppercase">ID del Proyecto</label>
            <div class="input-group">
              <input 
                v-model="form.id" 
                type="text" 
                class="form-control" 
                required 
                placeholder="Digita o selecciona..."
                :disabled="isEditing"
              >
              <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false" :disabled="isEditing"></button>
              <ul class="dropdown-menu dropdown-menu-end shadow-lg border-0 rounded-3 p-2">
                <li v-for="id in availableIds" :key="id">
                  <a class="dropdown-item rounded-2 py-2" href="#" @click.prevent="form.id = id">
                    <i class="bi bi-hash me-2 text-slate-400"></i>{{ id }}
                  </a>
                </li>
                <li v-if="availableIds.length === 0" class="dropdown-header">No hay IDs sugeridos</li>
              </ul>
            </div>
            <div class="smaller-text text-slate-400 mt-1">Digita un nuevo ID o elige uno sugerido de la lista.</div>
          </div>
          
          <div class="mb-3">
            <label class="form-label text-slate-500 smaller-text fw-bold ls-1 mb-2 text-uppercase">Nombre del Proyecto</label>
            <input v-model="form.nombre" type="text" class="form-control px-3" required placeholder="Ej. Residencial Horizonte">
          </div>
          
          <div class="mb-3">
            <label class="form-label text-slate-500 smaller-text fw-bold ls-1 mb-2 text-uppercase">Dirección</label>
            <input v-model="form.direccion" type="text" class="form-control px-3" required placeholder="Calle, número, sector...">
          </div>

          <div class="row mb-3">
            <div class="col-md-6">
              <label class="form-label text-slate-500 smaller-text fw-bold ls-1 mb-2 text-uppercase">Provincia</label>
              <input v-model="form.provincia" type="text" class="form-control px-3" required placeholder="Ej. Santiago">
            </div>
            <div class="col-md-6">
              <label class="form-label text-slate-500 smaller-text fw-bold ls-1 mb-2 text-uppercase">Municipio</label>
              <input v-model="form.municipio" type="text" class="form-control px-3" required placeholder="Ej. Santiago de los Caballeros">
            </div>
          </div>

          <div class="mb-4">
            <label class="form-label text-slate-500 smaller-text fw-bold ls-1 mb-2 text-uppercase">Imagen del Plano</label>
            <div class="upload-container rounded-3 p-3 border-dashed text-center position-relative mb-2" :class="{'has-image': form.imagenPlano}">
              <div v-if="!form.imagenPlano" class="py-2">
                <i class="bi bi-cloud-arrow-up fs-2 text-slate-400 mb-2 d-inline-block"></i>
                <div class="smaller-text text-slate-500">Haz clic para cargar imagen (JPG, PNG)</div>
              </div>
              <div v-else class="preview-box position-relative">
                <img :src="form.imagenPlano" class="img-fluid rounded-2 shadow-sm plano-preview">
                <button type="button" class="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 rounded-circle shadow" @click="form.imagenPlano = ''">
                  <i class="bi bi-x"></i>
                </button>
              </div>
              <input 
                type="file" 
                class="position-absolute top-0 start-0 w-100 h-100 opacity-0 cursor-pointer" 
                accept="image/*"
                @change="handleImageUpload"
              >
            </div>
            <div class="smaller-text text-slate-400">La imagen se convertirá a Base64 para el servidor.</div>
          </div>
          
          <div class="d-flex justify-content-end gap-2 pt-2">
            <button type="button" class="btn btn-white px-4 py-2" @click="closeModal">Cancelar</button>
            <button type="submit" class="btn btn-primary-custom px-4 py-2 fw-bold shadow-sm">
              {{ isEditing ? 'Guardar Cambios' : 'Crear Proyecto' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- DELETE CONFIRMATION -->
    <div v-if="showDeleteConfirm" class="modal-overlay d-flex align-items-center justify-content-center">
      <div class="modal-content-custom bg-white rounded-4 shadow-lg p-4 text-center">
        <div class="text-red-500 mb-3 fs-1">
          <i class="bi bi-exclamation-circle text-red-100 p-3 rounded-circle bg-red-soft"></i>
        </div>
        <h4 class="fw-bold text-slate-900">¿Eliminar proyecto?</h4>
        <p class="text-slate-500">¿Estás seguro de que deseas eliminar <strong>{{ projectToDelete?.nombre }}</strong>? Esta acción no se puede deshacer.</p>
        
        <div class="d-flex justify-content-center gap-2 mt-4">
          <button class="btn btn-white px-4" @click="showDeleteConfirm = false">Cancelar</button>
          <button class="btn btn-danger-custom px-4 fw-bold" @click="doDelete">Eliminar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue';
import { useRouter } from 'vue-router';
import { appStore, addProject, updateProject, deleteProject, canEditData, canDeleteData } from '../store/appStore';

// Permission exposure for template
const re_canEditData = () => canEditData();
const re_canDeleteData = () => canDeleteData();
import type { Project } from '../models/types';

const router = useRouter();
// ...

// Filtering & Pagination State
const searchQuery = ref('');
const provinciaFilter = ref('');
const municipioFilter = ref('');
const currentPage = ref(1);
const itemsPerPage = 5;

// Reset pagination when filters change
watch([searchQuery, provinciaFilter, municipioFilter], () => {
    currentPage.value = 1;
});

// Data from store
const allProjects = computed(() => appStore.projects);
const availableIds = computed(() => appStore.availableProjectIds);
const isProjectsLoading = computed(() => appStore.isProjectsLoading && allProjects.value.length === 0);

// Filtered List
const filteredProjects = computed(() => {
  return allProjects.value.filter(p => {
    const term = searchQuery.value.toLowerCase();
    const matchesSearch = p.nombre.toLowerCase().includes(term) || 
                         p.direccion.toLowerCase().includes(term) ||
                         p.id.toLowerCase().includes(term);
    const matchesProvincia = p.provincia.toLowerCase().includes(provinciaFilter.value.toLowerCase());
    const matchesMunicipio = p.municipio.toLowerCase().includes(municipioFilter.value.toLowerCase());
    return matchesSearch && matchesProvincia && matchesMunicipio;
  });
});

// Paginated List
const paginatedProjects = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredProjects.value.slice(start, end);
});

// Total Pages
const totalPages = computed(() => Math.ceil(filteredProjects.value.length / itemsPerPage));
const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage);

const visiblePages = computed(() => {
  const total = totalPages.value;
  const current = currentPage.value;
  const delta = 1; 
  const range = [];
  const rangeWithDots: (number | string)[] = [];
  let l;

  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  range.push(1);
  for (let i = current - delta; i <= current + delta; i++) {
    if (i < total && i > 1) {
      range.push(i);
    }
  }
  range.push(total);

  for (let i of range) {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1);
      } else if (i - l !== 1) {
        rangeWithDots.push('...');
      }
    }
    rangeWithDots.push(i);
    l = i;
  }

  return rangeWithDots;
});

// Modal & Form State
const showModal = ref(false);
const isEditing = ref(false);
const showDeleteConfirm = ref(false);
const projectToDelete = ref<Project | null>(null);
const formMessage = ref('');
const formMessageType = ref<'danger' | 'warning'>('danger');

const form = reactive({
  id: '',
  nombre: '',
  direccion: '',
  provincia: '',
  municipio: '',
  imagenPlano: ''
});

const openAddModal = () => {
  isEditing.value = false;
  form.id = '';
  form.nombre = '';
  form.direccion = '';
  form.provincia = '';
  form.municipio = '';
  form.imagenPlano = '';
  formMessage.value = '';
  showModal.value = true;
};

const handleImageUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    if (file.size > 2 * 1024 * 1024) { // 2MB limit for base64 strings in this demo
      formMessageType.value = 'warning';
      formMessage.value = 'La imagen es demasiado grande. El límite es 2MB.';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      form.imagenPlano = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
};

const openEditModal = (prj: Project) => {
  isEditing.value = true;
  form.id = prj.id;
  form.nombre = prj.nombre;
  form.direccion = prj.direccion;
  form.provincia = prj.provincia;
  form.municipio = prj.municipio;
  form.imagenPlano = prj.imagenPlano;
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  formMessage.value = '';
};

const saveProject = async () => {
  try {
    if (isEditing.value) {
      await updateProject(form.id, { ...form });
    } else {
      // Check if ID already exists
      if (appStore.projects.some(p => p.id === form.id)) {
        formMessageType.value = 'danger';
        formMessage.value = 'Ese ID ya existe. Prueba con otro identificador.';
        return;
      }
      await addProject({ ...form });
    }
    formMessage.value = '';
    closeModal();
  } catch (_error) {
    formMessageType.value = 'danger';
    formMessage.value = 'No se pudo guardar el proyecto. Intenta nuevamente.';
  }
};

const confirmDelete = (prj: Project) => {
  projectToDelete.value = prj;
  showDeleteConfirm.value = true;
};

const doDelete = async () => {
  if (projectToDelete.value) {
    await deleteProject(projectToDelete.value.id);
  }
  showDeleteConfirm.value = false;
  projectToDelete.value = null;
};

const enterEditMode = (id: string) => {
  router.push(`/editor/${id}`);
};

</script>

<style scoped>
.project-management-view {
  background: #f8fafc;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  color: #1e293b;
}

@media (max-width: 768px) {
  .project-management-view {
    padding-top: 70px !important;
    padding-left: 1rem !important;
    padding-right: 1rem !important;
  }
}

/* Colors & Helpers */
.text-slate-900 { color: #0f172a; }
.text-slate-700 { color: #334155; }
.text-slate-500 { color: #64748b; }
.text-slate-400 { color: #94a3b8; }
.text-blue-600 { color: #2563eb; }
.text-emerald-600 { color: #059669; }
.text-indigo-600 { color: #4f46e5; }
.text-red-500 { color: #ef4444; }
.bg-blue-soft { background: #eff6ff; }
.bg-red-soft { background: #fef2f2; }
.bg-slate-100 { background: #f1f5f9; }
.bg-slate-900 { background: #0f172a; }

.fw-800 { font-weight: 800; }
.fw-bold { font-weight: 700; }

.smaller-text { font-size: 0.75rem; }
.ls-1 { letter-spacing: 0.05em; }

/* Custom Buttons */
.filter-glass {
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.form-control, .form-select {
  border-radius: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.form-control:focus, .form-select:focus {
  background-color: white !important;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1) !important;
  border: 1px solid #3b82f6 !important;
}

.btn-outline-slate {
  border: 1px solid #e2e8f0;
  color: #64748b;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-outline-slate:hover {
  background: #f1f5f9;
  color: #1e293b;
  border-color: #cbd5e1;
}

.bg-slate-100 { background-color: #f1f5f9 !important; }

.text-slate-900 { color: #0f172a; }
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
.btn-icon:hover {
  background: rgba(0,0,0,0.05);
}

/* Project Img */
.project-img-box {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
}

/* Table */
.custom-project-table thead th {
  padding: 16px;
}
.custom-project-table tbody td {
  padding: 16px 8px;
  border-bottom: 1px solid #f1f5f9;
}

.list-loader {
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #64748b;
}

.list-loader-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #cbd5e1;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.list-loader-text {
  font-weight: 700;
  font-size: 0.9rem;
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

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  z-index: 1000;
}
.modal-content-custom {
  width: 100%;
  max-width: 550px;
}

.form-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 0.9rem;
  font-weight: 600;
  border: 1px solid transparent;
}

.form-banner-danger {
  background: #fef2f2;
  color: #b91c1c;
  border-color: #fecaca;
}

.form-banner-warning {
  background: #fffbeb;
  color: #b45309;
  border-color: #fde68a;
}

/* Form */
.form-control, .form-select {
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  font-weight: 500;
}
.form-control:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.border-dashed {
  border: 2px dashed #e2e8f0;
}

.upload-container {
  transition: all 0.3s;
  background: #f8fafc;
  min-height: 100px;
}

.upload-container:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.upload-container.has-image {
  border-style: solid;
  padding: 8px !important;
}

.plano-preview {
  max-height: 180px;
  object-fit: contain;
  width: 100%;
}

.cursor-pointer {
  cursor: pointer;
}

.project-img-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Scrollbar styling */
.project-management-view::-webkit-scrollbar {
  width: 6px;
}
.project-management-view::-webkit-scrollbar-track {
  background: transparent;
}
.project-management-view::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}

@media (max-width: 768px) {
  .project-management-view {
    padding-top: 60px !important;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
