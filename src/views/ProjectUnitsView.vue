<template>
  <div class="project-units-view p-4 min-vh-100">
    <div class="container-fluid">
      
      <!-- HEADER -->
      <div class="row mb-4 align-items-center">
        <div class="col-md-8">
          <div class="d-flex align-items-center gap-3 mb-1">
            <router-link to="/projects" class="btn btn-white btn-sm rounded-circle shadow-sm p-0 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px;">
              <i class="bi bi-arrow-left"></i>
            </router-link>
            <h1 class="h3 fw-bold text-slate-900 mb-0">Unidades de Proyecto: {{ project?.nombre || projectId }}</h1>
          </div>
          <p class="text-slate-500 mb-0 smaller-text">
            Listado detallado de apartamentos, estados financieros y procesos legales.
          </p>
        </div>
        <div class="col-md-4 d-flex justify-content-md-end gap-2 mt-3 mt-md-0">
          <div class="badge bg-blue-soft text-blue-600 px-3 py-2 rounded-3 border">
            Total: {{ filteredUnits.length }} Unidades
          </div>
        </div>
      </div>

      <!-- FILTERS -->
      <div class="mb-4">
        <div class="filter-glass p-3 rounded-4 shadow-sm">
          <div class="row g-3 align-items-end">
            <div class="col-md-3">
              <label class="form-label smaller-text fw-bold text-slate-400 text-uppercase ls-1">Búsqueda</label>
              <div class="search-wrapper position-relative">
                <i class="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-slate-400"></i>
                <input 
                  v-model="filters.search" 
                  type="text" 
                  class="form-control ps-5 border-0 bg-slate-100 shadow-none py-2" 
                  placeholder="Unidad, edificio, nombre..."
                >
              </div>
            </div>
            <div class="col-md-2">
              <label class="form-label smaller-text fw-bold text-slate-400 text-uppercase ls-1">Edificio</label>
              <div class="position-relative">
                <i class="bi bi-building position-absolute top-50 start-0 translate-middle-y ms-3 text-slate-400"></i>
                <select v-model="filters.edificio" class="form-select ps-5 border-0 bg-slate-100 shadow-none py-2">
                  <option value="">Todos</option>
                  <option v-for="b in availableBuildings" :key="b" :value="b">{{ b }}</option>
                </select>
              </div>
            </div>
            <div class="col-md-2">
              <label class="form-label smaller-text fw-bold text-slate-400 text-uppercase ls-1">Estado</label>
              <div class="position-relative">
                <i class="bi bi-tag position-absolute top-50 start-0 translate-middle-y ms-3 text-slate-400"></i>
                <select v-model="filters.estado" class="form-select ps-5 border-0 bg-slate-100 shadow-none py-2">
                  <option value="">Todos</option>
                  <option value="Entregada">Entregada</option>
                  <option value="Financiamiento">Financiamiento</option>
                  <option value="Inspección">Inspección</option>
                  <option value="Vendido">Vendido</option>
                  <option value="Disponible">Disponible</option>
                  <option value="Observación">Observación</option>
                </select>
              </div>
            </div>
            <div class="col-md-2">
              <label class="form-label smaller-text fw-bold text-slate-400 text-uppercase ls-1">Banco</label>
              <div class="position-relative">
                <i class="bi bi-bank position-absolute top-50 start-0 translate-middle-y ms-3 text-slate-400"></i>
                <select v-model="filters.banco" class="form-select ps-5 border-0 bg-slate-100 shadow-none py-2">
                   <option value="">Todos</option>
                   <option v-for="b in banks" :key="b" :value="b">{{ b || 'Sin Banco' }}</option>
                </select>
              </div>
            </div>
            <div class="col-md-3 d-flex align-items-end gap-3">
               <div class="flex-grow-1">
                 <div class="smaller-text fw-bold text-slate-400 text-uppercase ls-1 d-flex align-items-center gap-2">
                   <i class="bi bi-cash-stack"></i> Con Deuda
                 </div>
                 <div class="form-check form-switch mt-2">
                   <input v-model="filters.withDebt" class="form-check-input" type="checkbox" role="switch">
                 </div>
               </div>
               <button 
                 class="btn btn-outline-slate btn-sm px-3 py-2 rounded-3 d-flex align-items-center gap-2" 
                 @click="resetFilters"
                 title="Limpiar Filtros"
               >
                 <i class="bi bi-arrow-counterclockwise"></i>
                 <span>Limpiar</span>
               </button>
            </div>
          </div>
        </div>
      </div>

      <!-- UNITS TABLE -->
      <div class="card border-0 shadow-sm rounded-4 bg-white overflow-hidden">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0 units-table">
            <thead class="bg-white border-bottom">
              <tr class="smaller-text text-slate-500 text-uppercase fw-bold ls-1">
                <th class="ps-4">Unidad</th>
                <th>Cliente</th>
                <th>Monto / Deuda</th>
                <th>Financiamiento</th>
                <th>Procesos</th>
                <th>Inspección</th>
                <th class="text-end pe-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="unit in paginatedUnits" :key="unit.id">
                <td class="ps-4">
                  <div class="fw-bold text-slate-900">{{ unit.codUnidad }}</div>
                  <div class="smaller-text text-slate-400">{{ unit.edificio }} - {{ unit.unidad }}</div>
                  <span class="badge mt-2 fw-bold" :class="statusClass(unit.estado)">{{ unit.estado || 'N/A' }}</span>
                </td>
                <td>
                  <div v-if="unit.nombre" class="fw-medium text-slate-700">{{ unit.nombre }}</div>
                  <div v-else class="text-slate-300 italic">No asignado</div>
                  <div class="smaller-text text-slate-400">{{ unit.cedula }}</div>
                </td>
                <td>
                  <div class="fw-bold text-slate-900">{{ formatCurrency(unit.precio) }}</div>
                  <div class="smaller-text" :class="unit.adeudado && unit.adeudado > 0 ? 'text-red-500 fw-bold' : 'text-emerald-600'">
                    Deuda: {{ formatCurrency(unit.adeudado || 0) }}
                  </div>
                </td>
                <td>
                  <div class="smaller-text fw-bold">{{ unit.formaPago || 'Sin definir' }}</div>
                  <div class="smaller-text text-slate-500">{{ unit.banco || '-' }}</div>
                </td>
                <td>
                  <div class="d-flex gap-2 flex-wrap">
                    <span class="process-dot" :class="{ active: unit.legal }" title="Legal">L</span>
                    <span class="process-dot" :class="{ active: unit.gobierno }" title="Gobierno">G</span>
                    <span class="process-dot" :class="{ active: unit.micelaneos }" title="Micelaneos">M</span>
                    <span class="process-dot" :class="{ active: unit.titulo }" title="Título">T</span>
                  </div>
                  <div class="smaller-text text-slate-400 mt-1">Resp: {{ unit.responsableLegal || '-' }}</div>
                </td>
                <td>
                  <div class="d-flex flex-column gap-1">
                    <div class="smaller-text d-flex justify-content-between">
                      <span>Inspec 1:</span>
                      <i class="bi" :class="unit.inspeccion1 ? 'bi-check-circle-fill text-emerald-500' : 'bi-dash-circle text-slate-300'"></i>
                    </div>
                    <div class="smaller-text d-flex justify-content-between">
                      <span>Inspec 2:</span>
                      <i class="bi" :class="unit.inspeccion2 ? 'bi-check-circle-fill text-emerald-500' : 'bi-dash-circle text-slate-300'"></i>
                    </div>
                  </div>
                </td>
                <td class="text-end pe-4">
                   <button class="btn btn-icon text-blue-600" @click="viewDetails(unit)" title="Ver Detalles">
                      <i class="bi bi-eye"></i>
                   </button>
                </td>
              </tr>
              <tr v-if="paginatedUnits.length === 0">
                <td colspan="7" class="text-center py-5 text-slate-400">
                  <i class="bi bi-search fs-4 d-block mb-2"></i>
                  No hay unidades que coincidan con los filtros.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- PAGINATION SECTION -->
        <div v-if="totalPages > 1" class="px-4 py-3 border-top d-flex justify-content-between align-items-center bg-slate-50 rounded-bottom-4">
          <div class="smaller-text text-slate-500">
             Mostrando {{ startIndex + 1 }}-{{ Math.min(startIndex + itemsPerPage, filteredUnits.length) }} de {{ filteredUnits.length }}
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

      <!-- UNIT DETAILS MODAL -->
      <div v-if="showModal" class="modal-overlay d-flex align-items-center justify-content-center">
        <div class="modal-content-custom bg-white rounded-4 shadow-lg p-0 animate__animated animate__fadeInDown overflow-hidden" style="max-width: 800px; width: 95%;">
          
          <!-- Modal Header -->
          <div class="modal-header-custom p-4 text-white d-flex justify-content-between align-items-start" :class="headerBgClass">
            <div>
              <div class="text-uppercase smaller-text fw-bold ls-1 opacity-75 mb-1">Detalle de Unidad</div>
              <h3 class="fw-800 mb-0">{{ selectedUnit?.codUnidad }}</h3>
              <div class="smaller-text opacity-75">{{ selectedUnit?.edificio }} - {{ selectedUnit?.unidad }}</div>
            </div>
            <button class="btn-close-custom" @click="showModal = false">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <!-- Modal Body -->
          <div class="modal-body-custom p-4">
            <div class="row g-4">
              <!-- General Info -->
              <div class="col-md-6">
                <h6 class="fw-bold text-slate-900 border-bottom pb-2 mb-3">Información General</h6>
                <div class="d-flex flex-column gap-3">
                  <div class="detail-row">
                    <span class="label">Estado</span>
                    <span class="badge fw-bold" :class="statusClass(selectedUnit?.estado || '')">{{ selectedUnit?.estado }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Cliente</span>
                    <span class="value fw-bold text-slate-700">{{ selectedUnit?.nombre || 'N/A' }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Cédula</span>
                    <span class="value">{{ selectedUnit?.cedula || 'N/A' }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Metraje</span>
                    <span class="value">{{ selectedUnit?.metraje }} m²</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Contacto</span>
                    <div class="value">
                      <div class="smaller-text"><i class="bi bi-telephone me-1"></i>{{ selectedUnit?.telefono || '-' }}</div>
                      <div class="smaller-text"><i class="bi bi-envelope me-1"></i>{{ selectedUnit?.correo || '-' }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Financial Info -->
              <div class="col-md-6">
                <h6 class="fw-bold text-slate-900 border-bottom pb-2 mb-3">Estado Financiero</h6>
                <div class="financial-card rounded-3 p-3 mb-3 bg-slate-50 border">
                  <div class="d-flex justify-content-between mb-2">
                    <span class="smaller-text text-slate-500">Precio Venta</span>
                    <span class="fw-bold text-slate-900">{{ formatCurrency(selectedUnit?.precio || 0) }}</span>
                  </div>
                  <div class="d-flex justify-content-between mb-1">
                    <span class="smaller-text text-slate-500">Inicial Pagado</span>
                    <span class="fw-bold text-emerald-600">{{ formatCurrency(selectedUnit?.pagado || 0) }}</span>
                  </div>
                  <div class="d-flex justify-content-between pt-2 border-top mt-2">
                    <span class="smaller-text fw-bold text-slate-700">Balance Adeudado</span>
                    <span class="fw-800 fs-5" :class="selectedUnit?.adeudado && selectedUnit.adeudado > 0 ? 'text-red-500' : 'text-emerald-600'">
                      {{ formatCurrency(selectedUnit?.adeudado || 0) }}
                    </span>
                  </div>
                </div>
                <div class="d-flex flex-column gap-2">
                    <div class="detail-row">
                      <span class="label">Forma Pago</span>
                      <span class="value fw-medium">{{ selectedUnit?.formaPago || 'N/A' }}</span>
                    </div>
                    <div class="detail-row">
                      <span class="label">Institución</span>
                      <span class="value">{{ selectedUnit?.banco || '-' }}</span>
                    </div>
                    <div class="detail-row" v-if="selectedUnit?.fechaFormaPago">
                      <span class="label">Fecha Trámite</span>
                      <span class="value text-primary fw-bold">{{ selectedUnit?.fechaFormaPago }}</span>
                    </div>
                </div>
              </div>

              <!-- Milestones / CONSTRUCTION -->
              <div class="col-12 border-top pt-4">
                <h6 class="fw-bold text-slate-900 mb-3"><i class="bi bi-tools me-2"></i>Hitos y Construcción</h6>
                <div class="d-flex flex-wrap gap-2">
                  <div class="p-2 rounded-3 border flex-grow-1 d-flex align-items-center gap-2" :class="selectedUnit?.iniciadoVaciados ? 'bg-success-soft border-success' : 'bg-slate-50'">
                    <i class="bi" :class="selectedUnit?.iniciadoVaciados ? 'bi-hammer text-success' : 'bi-dash-circle text-slate-400'"></i>
                    <div class="smaller-text">
                      <div class="fw-bold">Vaciados</div>
                      <div class="opacity-75">{{ selectedUnit?.iniciadoVaciados ? 'Iniciado' : 'Pendiente' }}</div>
                    </div>
                  </div>
                  <div class="p-2 rounded-3 border flex-grow-1 d-flex align-items-center gap-2" :class="selectedUnit?.enInspeccion ? 'bg-amber-50 border-warning' : 'bg-slate-50'">
                    <i class="bi" :class="selectedUnit?.enInspeccion ? 'bi-clipboard-check text-warning' : 'bi-dash-circle text-slate-400'"></i>
                    <div class="smaller-text">
                      <div class="fw-bold">Inspección</div>
                      <div class="opacity-75">{{ selectedUnit?.enInspeccion ? 'En Curso' : 'Esperando' }}</div>
                    </div>
                  </div>
                  <div class="p-2 rounded-3 border flex-grow-1 d-flex align-items-center gap-2" :class="selectedUnit?.adeudado === 0 ? 'bg-success-soft border-success' : 'bg-red-50 border-danger'">
                    <i class="bi" :class="selectedUnit?.adeudado === 0 ? 'bi-cash-coin text-success' : 'bi-cash-stack text-danger'"></i>
                    <div class="smaller-text">
                      <div class="fw-bold">Cuentas</div>
                      <div class="opacity-75">{{ selectedUnit?.adeudado === 0 ? 'Saldado' : 'Con Balance' }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- TIMELINE / DATES -->
              <div class="col-12 border-top pt-4">
                <h6 class="fw-bold text-slate-900 mb-3"><i class="bi bi-calendar3 me-2"></i>Cronograma de Fechas</h6>
                <div class="row g-3">
                  <div class="col-6 col-md-3">
                    <div class="date-item">
                      <div class="date-label">Completa Inicial</div>
                      <div class="date-value">{{ selectedUnit?.fechaCompletaInicial || '---' }}</div>
                    </div>
                  </div>
                  <div class="col-6 col-md-3">
                    <div class="date-item">
                      <div class="date-label">Inicio Vaciados</div>
                      <div class="date-value">{{ selectedUnit?.fechaInicioVaciados || '---' }}</div>
                    </div>
                  </div>
                  <div class="col-6 col-md-3">
                    <div class="date-item">
                      <div class="date-label">Legal</div>
                      <div class="date-value">{{ selectedUnit?.fechaLegal || '---' }}</div>
                    </div>
                  </div>
                  <div class="col-6 col-md-3">
                    <div class="date-item">
                      <div class="date-label">Entrega Inspección</div>
                      <div class="date-value fw-bold text-blue-600">{{ selectedUnit?.fechaEntregaInspeccion || '---' }}</div>
                    </div>
                  </div>
                  <div class="col-6 col-md-3">
                    <div class="date-item">
                      <div class="date-label">Inspección 1</div>
                      <div class="date-value">{{ selectedUnit?.fechaInspeccion1 || '---' }}</div>
                    </div>
                  </div>
                  <div class="col-6 col-md-3">
                    <div class="date-item">
                      <div class="date-label">Inspección 2</div>
                      <div class="date-value">{{ selectedUnit?.fechaInspeccion2 || '---' }}</div>
                    </div>
                  </div>
                  <div class="col-6 col-md-3">
                    <div class="date-item">
                      <div class="date-label">Bono Gobierno</div>
                      <div class="date-value">{{ selectedUnit?.fechaGobierno || '---' }}</div>
                    </div>
                  </div>
                  <div class="col-6 col-md-3">
                    <div class="date-item">
                      <div class="date-label">Trámite Título</div>
                      <div class="date-value">{{ selectedUnit?.fechaMicelaneos || '---' }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Process Tags -->
              <div class="col-12">
                <h6 class="fw-bold text-slate-900 border-bottom pb-2 mb-3">Procesos y Seguimientos</h6>
                <div class="row g-3">
                  <div class="col-md-3">
                    <div class="process-stat-card" :class="{ active: selectedUnit?.legal }">
                      <div class="icon">L</div>
                      <div class="info">
                        <div class="title">Proceso Legal</div>
                        <div class="status">{{ selectedUnit?.legal ? 'Completado' : 'Pendiente' }}</div>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="process-stat-card" :class="{ active: selectedUnit?.gobierno }">
                      <div class="icon">G</div>
                      <div class="info">
                        <div class="title">Bono Gobierno</div>
                        <div class="status">{{ selectedUnit?.gobierno ? 'Aplicado' : 'Sin procesar' }}</div>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="process-stat-card" :class="{ active: selectedUnit?.micelaneos }">
                      <div class="icon">M</div>
                      <div class="info">
                        <div class="title">Micelaneos</div>
                        <div class="status">{{ selectedUnit?.micelaneos ? 'Pagados' : 'Pendiente' }}</div>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="process-stat-card" :class="{ active: selectedUnit?.titulo }">
                      <div class="icon">T</div>
                      <div class="info">
                        <div class="title">Título Prop.</div>
                        <div class="status">{{ selectedUnit?.titulo ? 'Emitido' : 'En trámite' }}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="mt-3 d-flex flex-column gap-2">
                  <div class="row g-2">
                    <div class="col-md-4">
                      <div class="p-2 bg-blue-soft rounded-2 smaller-text text-blue-700">
                        <div class="opacity-75">Legal</div>
                        <strong>{{ selectedUnit?.responsableLegal || 'N/A' }}</strong>
                      </div>
                    </div>
                    <div class="col-md-4">
                      <div class="p-2 bg-blue-soft rounded-2 smaller-text text-blue-700">
                        <div class="opacity-75">Gobierno</div>
                        <strong>{{ selectedUnit?.responsableGobierno || 'N/A' }}</strong>
                      </div>
                    </div>
                    <div class="col-md-4">
                      <div class="p-2 bg-blue-soft rounded-2 smaller-text text-blue-700">
                        <div class="opacity-75">Miceláneos</div>
                        <strong>{{ selectedUnit?.responsableMicelaneos || 'N/A' }}</strong>
                      </div>
                    </div>
                  </div>
                  <div class="d-flex gap-2">
                    <div v-if="selectedUnit?.entregada" class="badge bg-success-soft text-success px-3 py-2 border border-success flex-grow-1">
                      <i class="bi bi-box-seam me-1"></i> ENTREGADA
                    </div>
                    <div v-if="selectedUnit?.descargadaDGII" class="badge bg-purple-soft text-purple-600 px-3 py-2 border border-purple flex-grow-1">
                      <i class="bi bi-file-earmark-check me-1"></i> DGII COMPLETADO
                    </div>
                    <div v-if="selectedUnit?.saldo" class="badge bg-emerald-soft text-emerald-600 px-3 py-2 border border-emerald flex-grow-1">
                      <i class="bi bi-wallet2 me-1"></i> SALDO TOTAL
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="modal-footer-custom bg-slate-50 p-3 d-flex justify-content-end gap-2 border-top">
            <button class="btn btn-white px-4" @click="showModal = false">Cerrar</button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { appStore } from '../store/appStore';
import type { DetailedUnit } from '../models/types';

const route = useRoute();
const projectId = route.params.id as string;

const project = computed(() => appStore.projects.find(p => p.id === projectId));

// MODAL STATE
const showModal = ref(false);
const selectedUnit = ref<DetailedUnit | null>(null);

const headerBgClass = computed(() => {
  if (!selectedUnit.value) return 'bg-slate-800';
  switch(selectedUnit.value.estado) {
    case 'Entregada': return 'bg-emerald-600';
    case 'Financiamiento': return 'bg-blue-600';
    case 'Inspección': return 'bg-cyan-600';
    case 'Vendido': return 'bg-indigo-600';
    case 'Disponible': return 'bg-slate-500';
    case 'Observación': return 'bg-red-600';
    default: return 'bg-slate-800';
  }
});

// FILTERS
const filters = ref({
  search: '',
  estado: '',
  edificio: '',
  banco: '',
  responsable: '',
  withDebt: false
});

// Reset pagination when filters change
watch(filters, () => {
  currentPage.value = 1;
}, { deep: true });

const availableBuildings = computed(() => {
    const buildings = new Set(appStore.detailedUnits
        .filter(u => u.codUnidad.startsWith(projectId))
        .map(u => u.edificio));
    return Array.from(buildings).sort();
});

const currentPage = ref(1);
const itemsPerPage = 5;

const banks = ["Apap", "Popular", "BHD", "Alnap", "Banreservas", "Santa Cruz", "Scotiabank", "Cibao", "Banesco"];

const filteredUnits = computed(() => {
  return appStore.detailedUnits.filter(u => {
    // Basic filter by project id assuming codUnidad contains it or we add a project field
    // For this demo, we'll assume the codUnidad starts with the project ID
    const matchesProject = u.codUnidad.startsWith(projectId);
    if (!matchesProject) return false;

    const matchesSearch = !filters.value.search || 
      u.codUnidad.toLowerCase().includes(filters.value.search.toLowerCase()) ||
      u.nombre.toLowerCase().includes(filters.value.search.toLowerCase()) ||
      u.unidad.toLowerCase().includes(filters.value.search.toLowerCase());
    
    const matchesStatus = !filters.value.estado || u.estado === filters.value.estado;
    const matchesBuilding = !filters.value.edificio || u.edificio === filters.value.edificio;
    const matchesBank = !filters.value.banco || u.banco === filters.value.banco;
    const matchesResp = !filters.value.responsable || u.responsableLegal === filters.value.responsable;
    const matchesDebt = !filters.value.withDebt || (u.adeudado && u.adeudado > 0);

    return matchesSearch && matchesStatus && matchesBuilding && matchesBank && matchesResp && matchesDebt;
  });
});

const totalPages = computed(() => Math.ceil(filteredUnits.value.length / itemsPerPage));
const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage);

const visiblePages = computed(() => {
  const total = totalPages.value;
  const current = currentPage.value;
  const delta = 1; // Show current and +/- 1
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

const paginatedUnits = computed(() => {
  return filteredUnits.value.slice(startIndex.value, startIndex.value + itemsPerPage);
});

const resetFilters = () => {
  filters.value = {
    search: '',
    estado: '',
    edificio: '',
    banco: '',
    responsable: '',
    withDebt: false
  };
  currentPage.value = 1;
};

// HELPERS
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(val);
};

const statusClass = (status: string) => {
  switch(status) {
    case 'Entregada': return 'status-badge-delivered';
    case 'Financiamiento': return 'status-badge-financing';
    case 'Inspección': return 'status-badge-inspection';
    case 'Vendido': return 'status-badge-sold';
    case 'Disponible': return 'status-badge-available';
    case 'Observación': return 'status-badge-observation';
    default: return 'status-badge-other';
  }
};

const viewDetails = (unit: DetailedUnit) => {
  selectedUnit.value = unit;
  showModal.value = true;
};

onMounted(() => {
  // We could fetch units here if we had an API
  window.scrollTo(0, 0);
});
</script>

<style scoped>
.project-units-view {
  background: #f8fafc;
  color: #1e293b;
}

@media (max-width: 768px) {
  .project-units-view {
    padding-top: 70px !important;
    padding-left: 1rem !important;
    padding-right: 1rem !important;
  }
}

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

.smaller-text { font-size: 0.75rem; }
.ls-1 { letter-spacing: 0.05em; }

.btn-white {
  background: white;
  color: #64748b;
  border: 1px solid #e2e8f0 !important;
  font-weight: 600;
}

.bg-blue-soft { background: #eff6ff; }
.text-blue-600 { color: #2563eb; }
.text-slate-900 { color: #0f172a; }
.text-slate-700 { color: #334155; }
.text-slate-500 { color: #64748b; }
.text-slate-400 { color: #94a3b8; }
.text-slate-300 { color: #cbd5e1; }
/* Table */
.units-table thead th {
  padding: 16px;
  background-color: white !important;
}
.units-table tbody td {
  padding: 16px 8px;
  border-bottom: 1px solid #f1f5f9;
}

.process-dot {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 800;
  border: 1px solid transparent;
}

.process-dot.active {
  background: #eff6ff;
  color: #3b82f6;
  border-color: #dbeafe;
}

.btn-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.btn-icon:hover {
  background: #f1f5f9;
  border-color: #e2e8f0;
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

.btn-primary-custom {
  background: #3b82f6;
  color: white;
}
.btn-primary-custom:hover {
  background: #2563eb;
  color: white;
}

.form-switch .form-check-input {
  width: 2.5em;
  height: 1.25em;
  cursor: pointer;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8px);
  z-index: 3000;
}

.modal-content-custom {
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.modal-body-custom {
  flex: 1;
  overflow-y: auto;
}

.modal-header-custom {
  position: relative;
}

.btn-close-custom {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-close-custom:hover {
  background: rgba(255, 255, 255, 0.4);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.detail-row .label {
  font-size: 0.75rem;
  color: #94a3b8;
  font-weight: 500;
}

.detail-row .value {
  font-size: 0.85rem;
  color: #334155;
  text-align: right;
}

.process-stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #f1f5f9;
  background: white;
  opacity: 0.6;
}

.process-stat-card.active {
  opacity: 1;
  border-color: #dbeafe;
  background: #f8faff;
}

.process-stat-card .icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #f1f5f9;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.8rem;
}

.process-stat-card.active .icon {
  background: #3b82f6;
  color: white;
}

.process-stat-card .title {
  font-size: 0.75rem;
  font-weight: 700;
  color: #475569;
}

.process-stat-card .status {
  font-size: 0.65rem;
  color: #94a3b8;
}

.bg-emerald-600 { background-color: #059669 !important; }
.bg-blue-600 { background-color: #2563eb !important; }
.bg-cyan-600 { background-color: #0891b2 !important; }
.bg-indigo-600 { background-color: #4f46e5 !important; }
.bg-red-600 { background-color: #dc2626 !important; }
.bg-slate-500 { background-color: #64748b !important; }
.bg-slate-800 { background-color: #1e293b !important; }

/* Status Badges V2 */
.badge.status-badge-delivered { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
.badge.status-badge-financing { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
.badge.status-badge-inspection { background: #ecfeff; color: #0891b2; border: 1px solid #a5f3fc; }
.badge.status-badge-sold { background: #eef2ff; color: #4f46e5; border: 1px solid #c7d2fe; }
.badge.status-badge-available { background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; }
.badge.status-badge-observation { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.badge.status-badge-other { background: #f1f5f9; color: #94a3b8; border: 1px solid #e2e8f0; }

.bg-success-soft { background-color: #ecfdf5 !important; }
.bg-purple-soft { background-color: #f5f3ff !important; }
.bg-emerald-soft { background-color: #ecfdf5 !important; }
.bg-red-50 { background-color: #fef2f2 !important; }
.bg-amber-50 { background-color: #fffbeb !important; }
.text-purple-600 { color: #7c3aed !important; }
.text-emerald-600 { color: #059669 !important; }
.border-purple { border-color: #ddd6fe !important; }
.border-emerald { border-color: #a7f3d0 !important; }

.date-item {
  background: #f8fafc;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #f1f5f9;
}
.date-label {
  font-size: 0.65rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  margin-bottom: 2px;
}
.date-value {
  font-size: 0.8rem;
  color: #334155;
  font-weight: 500;
}

@media (max-width: 768px) {
  .project-units-view {
    padding-top: 60px !important;
  }
}
</style>
