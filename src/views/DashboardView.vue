<template>
  <div class="dashboard-view p-4 min-vh-100">
    <div class="container-fluid">
      <div class="row mb-4 align-items-end">
        <div class="col-md-8">
          <h1 class="display-6 fw-bold text-slate-900 mb-1">
            {{ project ? project.nombre : 'Vista General del Proyecto' }}
          </h1>
          <p class="text-slate-500 mb-0">
            {{ project ? project.direccion : 'Datos actualizados en tiempo real' }} ·
            <span class="fw-medium text-slate-700">
              {{ totalUnits }} unidades en {{ buildingsCount }} edificios
            </span>
          </p>
        </div>
        <div class="col-md-4 d-flex flex-wrap justify-content-md-end gap-2 mt-3 mt-md-0">
          <router-link :to="`/editor/${projectId}`" class="btn btn-white shadow-sm border-0 px-4 py-2 fw-bold">
            <i class="bi bi-box-seam me-2"></i>Visualizador 3D
          </router-link>
          <router-link :to="`/projects/${projectId}/units`" class="btn btn-primary-custom shadow-sm border-0 px-4 py-2 fw-bold">
            <i class="bi bi-file-earmark-text me-2"></i>Ver Unidades
          </router-link>
        </div>
      </div>

      <div class="card border-0 shadow-sm rounded-4 p-3 bg-white mb-4 dashboard-filter-card">
        <div class="row g-3 align-items-end">
          <div class="col-xl-4 col-md-5">
            <label class="filter-label-v2">Filtrar por propiedad</label>
            <select v-model="dashboardFilter.field" class="form-select filter-control">
              <option value="">Selecciona una propiedad</option>
              <option v-for="option in apartmentFilterOptions" :key="option.key" :value="option.key">
                {{ option.label }}
              </option>
            </select>
          </div>

          <div class="col-xl-5 col-md-5">
            <label class="filter-label-v2">Valor</label>
            <select v-if="selectedFilterType === 'boolean'" v-model="dashboardFilter.value" class="form-select filter-control" :disabled="!dashboardFilter.field">
              <option value="">Todos</option>
              <option value="true">Si</option>
              <option value="false">No</option>
            </select>
            <input
              v-else
              v-model="dashboardFilter.value"
              class="form-control filter-control"
              :disabled="!dashboardFilter.field"
              :type="filterInputType"
              :placeholder="filterPlaceholder"
            />
          </div>

          <div class="col-xl-3 col-md-2 d-flex align-items-end gap-2">
            <button class="btn btn-white filter-clear-btn w-100" :disabled="!hasDashboardFilterActive" @click="clearDashboardFilter">
              <i class="bi bi-x-circle me-2"></i>Limpiar
            </button>
          </div>
        </div>
        <div v-if="hasDashboardFilterActive" class="filter-summary mt-3">
          <i class="bi bi-funnel-fill me-2"></i>
          Mostrando {{ filteredProjectApartments.length }} de {{ projectApartments.length }} apartamentos
        </div>
      </div>

      <div class="row g-4 mb-4">
        <div v-for="card in topCards" :key="card.label" class="col-xl col-md-4 col-sm-6">
          <div class="card border-0 shadow-sm rounded-4 h-100 p-3 stat-card-v2">
            <div class="d-flex justify-content-between mb-3">
              <span class="text-uppercase ls-1 fw-bold text-slate-400 smaller-text">{{ card.label }}</span>
              <div :class="['card-icon-box', card.colorClass]">
                <i :class="['bi', card.icon]"></i>
              </div>
            </div>
            <div class="card-stat-content">
              <h2 class="fw-800 text-slate-900 mb-0">{{ card.value }}</h2>
              <div v-if="card.subtext" class="smaller-text fw-medium" :class="card.subColor">
                {{ card.subtext }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-4 mb-4">
        <div class="col-xl-9 col-12">
          <div class="card border-0 shadow-sm rounded-4 overflow-hidden main-3d-card">
            <div class="viewport-wrapper bg-slate-50">
              <div v-if="layoutNotice" class="layout-notice" :class="layoutNoticeTone">
                <i class="bi bi-info-circle-fill me-2"></i>
                <span>{{ layoutNotice }}</span>
              </div>
              <div v-if="selectedUnitSummary" class="selected-unit-chip">
                <i class="bi bi-pin-angle-fill me-1"></i>
                {{ selectedUnitSummary }}
              </div>
              <Viewport3D hideUI :visible-detailed-unit-ids="visibleDetailedUnitIds" />
              <ColorGuideModal :show="showColorGuide" @close="showColorGuide = false" />
              <div class="viewport-legend">
                <button class="legend-help-btn" @click="showColorGuide = true">
                  <i class="bi bi-info-circle me-1"></i>
                  Ayuda de colores
                </button>
                <div v-for="item in viewportLegendSegments" :key="item.label" class="legend-item">
                  <span class="dot" :class="{ 'dot-outline': item.outline }" :style="{ backgroundColor: item.color }"></span>
                  {{ item.label }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl-3 col-12">
          <div class="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <h5 class="fw-bold text-slate-900 mb-0">Edificios</h5>
              <span class="text-primary-custom smaller-text fw-bold">{{ buildingStats.length }}</span>
            </div>
            <p class="text-slate-400 smaller-text mb-4">Resumen de avance por edificio</p>

            <div v-if="buildingStats.length === 0" class="card-empty">
              No hay edificios o unidades para mostrar.
            </div>

            <div v-else class="building-progress-list d-flex flex-column gap-4">
              <div v-for="bld in buildingStats" :key="bld.id" class="bld-row">
                <div class="d-flex align-items-center justify-content-between mb-2">
                  <div class="d-flex align-items-center gap-2">
                    <div class="bld-accent" :style="{ background: bld.color }"></div>
                    <span class="fw-bold text-slate-700">{{ bld.name }}</span>
                  </div>
                  <div class="d-flex align-items-center gap-3">
                    <div class="text-end">
                      <div class="fw-bold text-slate-800 small">{{ bld.delivered }}</div>
                      <div class="smaller-text text-slate-400">ENTREG.</div>
                    </div>
                    <div class="text-end">
                      <div class="fw-bold text-orange-500 small">{{ bld.progress }}%</div>
                      <div class="smaller-text text-slate-400">AVANCE</div>
                    </div>
                  </div>
                </div>
                <div class="progress" style="height: 4px; background: #f1f5f9;">
                  <div class="progress-bar" :style="{ width: `${bld.progress}%`, background: bld.color }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-4 mb-4">
        <div class="col-xl-4 col-md-6">
          <div class="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <div class="d-flex justify-content-between align-items-center mb-4 gap-2 flex-wrap">
              <h5 class="fw-bold text-slate-900 mb-0">Entregas por mes</h5>
              <select v-model="selectedDeliveryYear" class="form-select form-select-sm year-select" :disabled="deliveredYears.length <= 1">
                <option v-for="year in deliveredYears" :key="year" :value="String(year)">{{ year }}</option>
              </select>
            </div>

            <div v-if="totalDeliveredByYear === 0" class="card-empty">
              Aun no hay entregas registradas para este periodo.
            </div>

            <div v-else>
              <div class="chart-panel">
                <Bar :data="deliveryChartData" :options="deliveryChartOptions" />
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl-4 col-md-6">
          <div class="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <h5 class="fw-bold text-slate-900 mb-4">Distribucion por estado</h5>
            <div class="d-flex align-items-center justify-content-center h-100 distribution-layout gap-3">
              <div class="chart-panel chart-panel-distribution">
                <Bar :data="distributionChartData" :options="distributionChartOptions" />
              </div>
              <div class="distribution-legend d-flex flex-column gap-2 ms-4">
                <div v-for="segment in distributionSegments" :key="segment.label" class="legend-item-v2 d-flex align-items-center gap-2">
                  <div class="dot-v2" :style="{ background: segment.color }"></div>
                  <span class="smaller-text text-slate-500">{{ segment.label }}</span>
                  <span class="smaller-text fw-bold text-slate-800 ms-auto">{{ segment.count }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl-4">
          <div class="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <h5 class="fw-bold text-slate-900 mb-0">Actividad reciente</h5>
              <span class="text-primary-custom smaller-text fw-bold">{{ recentActivities.length }}</span>
            </div>

            <div v-if="recentActivities.length === 0" class="card-empty">
              Sin actividad reciente para mostrar.
            </div>

            <div v-else class="activity-table-wrapper">
              <table class="table table-borderless table-sm custom-activity-table">
                <thead>
                  <tr class="smaller-text text-slate-400 text-uppercase ls-1">
                    <th>Unidad</th>
                    <th>Edificio</th>
                    <th class="text-end">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="act in recentActivities"
                    :key="act.id"
                    class="activity-row"
                    :class="{ 'activity-row-clickable': Boolean(act.unitId) }"
                    @click="handleActivityClick(act.unitId)"
                  >
                    <td class="fw-bold text-slate-700 py-3">{{ act.unit }}</td>
                    <td class="text-slate-500 py-3">{{ act.building }}</td>
                    <td class="text-end py-3">
                      <span :class="['status-pill', act.statusClass]">{{ act.status }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { appStore, selectProject, selectUnit, setAppMode } from '../store/appStore';
import type { Unit, DetailedUnit } from '../models/types';
import Viewport3D from '../components/Viewport3D.vue';
import ColorGuideModal from '../components/ui/ColorGuideModal.vue';
import { parseDateValue } from '../utils/normalizers';
import { Bar } from 'vue-chartjs';
import { UNIT_ESTADO_COLORS } from '../scene/RulesEngine';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

type DashboardStatus = 'available' | 'delivered' | 'financing' | 'inspection' | 'sold' | 'observation';
type StatusMeta = { label: string; color: string; statusClass: string };
type ApartmentFilterType = 'string' | 'number' | 'boolean' | 'date';
type ApartmentFilterOption = { key: keyof DetailedUnit; label: string; type: ApartmentFilterType };

const STATUS_META: Record<DashboardStatus, StatusMeta> = {
  delivered: { label: 'Entregada', color: '#22c55e', statusClass: 'status-green' },
  financing: { label: 'Con saldo', color: '#3b82f6', statusClass: 'status-blue' },
  inspection: { label: 'Inspeccion', color: '#06b6d4', statusClass: 'status-cyan' },
  sold: { label: 'Vendida', color: '#6366f1', statusClass: 'status-indigo' },
  observation: { label: 'Observacion', color: '#ef4444', statusClass: 'status-red' },
  available: { label: 'Disponible', color: '#94a3b8', statusClass: 'status-slate' }
};

const route = useRoute();
const projectId = computed(() => String(route.params.id ?? ''));
const showColorGuide = ref(false);
const dashboardFilter = ref<{ field: keyof DetailedUnit | ''; value: string }>({
  field: '',
  value: ''
});

const apartmentFilterOptions: ApartmentFilterOption[] = [
  { key: 'id', label: 'ID', type: 'number' },
  { key: 'codUnidad', label: 'Codigo unidad', type: 'string' },
  { key: 'edificio', label: 'Edificio', type: 'string' },
  { key: 'unidad', label: 'Unidad', type: 'string' },
  { key: 'metraje', label: 'Metraje', type: 'number' },
  { key: 'estado', label: 'Estado', type: 'string' },
  { key: 'nombre', label: 'Nombre', type: 'string' },
  { key: 'telefono', label: 'Telefono', type: 'string' },
  { key: 'correo', label: 'Correo', type: 'string' },
  { key: 'cedula', label: 'Cedula', type: 'string' },
  { key: 'precio', label: 'Precio', type: 'number' },
  { key: 'inicial', label: 'Inicial', type: 'number' },
  { key: 'inicialDolar', label: 'Inicial dolar', type: 'number' },
  { key: 'pagado', label: 'Pagado', type: 'number' },
  { key: 'adeudado', label: 'Adeudado', type: 'number' },
  { key: 'fechaCompletaInicial', label: 'Fecha completa inicial', type: 'date' },
  { key: 'fechaInicioVaciados', label: 'Fecha inicio vaciados', type: 'date' },
  { key: 'fechaEntregaInspeccion', label: 'Fecha entrega inspeccion', type: 'date' },
  { key: 'fechaLegal', label: 'Fecha legal', type: 'date' },
  { key: 'fechaGobierno', label: 'Fecha gobierno', type: 'date' },
  { key: 'fechaMicelaneos', label: 'Fecha micelaneos', type: 'date' },
  { key: 'fechaInspeccion1', label: 'Fecha inspeccion 1', type: 'date' },
  { key: 'fechaInspeccion2', label: 'Fecha inspeccion 2', type: 'date' },
  { key: 'fechaFormaPago', label: 'Fecha forma pago', type: 'date' },
  { key: 'iniciadoVaciados', label: 'Iniciado vaciados', type: 'boolean' },
  { key: 'enInspeccion', label: 'En inspeccion', type: 'boolean' },
  { key: 'inspeccion1', label: 'Inspeccion 1', type: 'boolean' },
  { key: 'inspeccion2', label: 'Inspeccion 2', type: 'boolean' },
  { key: 'legal', label: 'Legal', type: 'boolean' },
  { key: 'gobierno', label: 'Gobierno', type: 'boolean' },
  { key: 'micelaneos', label: 'Micelaneos', type: 'boolean' },
  { key: 'titulo', label: 'Titulo', type: 'boolean' },
  { key: 'responsableLegal', label: 'Responsable legal', type: 'string' },
  { key: 'responsableGobierno', label: 'Responsable gobierno', type: 'string' },
  { key: 'responsableMicelaneos', label: 'Responsable micelaneos', type: 'string' },
  { key: 'formaPago', label: 'Forma pago', type: 'string' },
  { key: 'banco', label: 'Banco', type: 'string' },
  { key: 'saldo', label: 'Saldo', type: 'boolean' },
  { key: 'entregada', label: 'Entregada', type: 'boolean' },
  { key: 'descargadaDGII', label: 'Descargada DGII', type: 'boolean' }
];

const project = computed(() => appStore.projects.find((p) => p.id === projectId.value));
const projectBuildings = computed(() => appStore.buildings.filter((b) => b.projectId === projectId.value));
const projectStats = computed(() => appStore.apartmentStatsByProject[projectId.value] ?? null);
const buildingsCount = computed(() => {
  if (hasDashboardFilterActive.value) {
    return new Set(filteredProjectApartments.value.map((apartment) => apartment.edificio).filter(Boolean)).size;
  }
  return projectStats.value?.edificios ?? projectBuildings.value.length;
});

const projectApartments = computed(() => appStore.detailedUnits);
const selectedFilterOption = computed(() =>
  apartmentFilterOptions.find((option) => option.key === dashboardFilter.value.field) ?? null
);
const selectedFilterType = computed<ApartmentFilterType>(() => selectedFilterOption.value?.type ?? 'string');
const filterInputType = computed(() => {
  if (selectedFilterType.value === 'number') return 'number';
  if (selectedFilterType.value === 'date') return 'date';
  return 'text';
});
const filterPlaceholder = computed(() => {
  if (!dashboardFilter.value.field) return 'Selecciona una propiedad primero';
  if (selectedFilterType.value === 'number') return 'Introduce un numero';
  if (selectedFilterType.value === 'date') return 'Selecciona una fecha';
  return 'Escribe para filtrar';
});
const hasDashboardFilterActive = computed(() => Boolean(dashboardFilter.value.field && dashboardFilter.value.value !== ''));
const normalizeFilterText = (value: unknown) => String(value ?? '')
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const matchesDashboardFilter = (apartment: DetailedUnit) => {
  if (!hasDashboardFilterActive.value || !dashboardFilter.value.field) return true;

  const option = selectedFilterOption.value;
  if (!option) return true;

  const rawValue = apartment[option.key];
  const filterValue = dashboardFilter.value.value;

  if (option.type === 'boolean') {
    return rawValue === (filterValue === 'true');
  }

  if (option.type === 'number') {
    const numericFilter = Number(filterValue);
    const numericValue = Number(rawValue);
    return Number.isFinite(numericFilter) && Number.isFinite(numericValue) && numericValue === numericFilter;
  }

  if (option.type === 'date') {
    const rawDate = parseDateValue(rawValue as string | null);
    if (!rawDate) return false;
    return rawDate.toISOString().slice(0, 10) === filterValue;
  }

  return normalizeFilterText(rawValue).includes(normalizeFilterText(filterValue));
};

const filteredProjectApartments = computed(() => {
  if (!hasDashboardFilterActive.value) return projectApartments.value;
  return projectApartments.value.filter(matchesDashboardFilter);
});
const visibleDetailedUnitIds = computed(() =>
  hasDashboardFilterActive.value ? filteredProjectApartments.value.map((apartment) => apartment.id) : null
);
const layoutUnits = computed(() => projectBuildings.value.flatMap((building) =>
  building.units.map((unit) => ({
    ...unit,
    buildingName: building.name
  }))
));

const normalizeStatus = (unit: { estado?: string; entregada?: boolean | null; saldo?: boolean | null; enInspeccion?: boolean | null }): DashboardStatus => {
  if (unit.entregada) return 'delivered';
  if (unit.saldo) return 'financing';
  if (unit.enInspeccion) return 'inspection';

  const estado = String(unit.estado ?? '').toLowerCase();
  if (estado.includes('entreg')) return 'delivered';
  if (estado.includes('financ') || estado.includes('saldo')) return 'financing';
  if (estado.includes('inspecc')) return 'inspection';
  if (estado.includes('vend')) return 'sold';
  if (estado.includes('observ')) return 'observation';

  return 'available';
};

const getLayoutUnitStatus = (unit: Unit): DashboardStatus => {
  if (unit.status === 'delivered') return 'delivered';
  if (unit.status === 'financing') return 'financing';
  if (unit.status === 'inspection') return 'inspection';
  if (unit.status === 'sold') return 'sold';
  if (unit.status === 'observation') return 'observation';
  return 'available';
};

const normalizedBuildingLabel = (label: string) => label
  .replace(/^bloque\s+/i, '')
  .replace(/^torre\s+/i, '')
  .replace(/\s+/g, '')
  .trim()
  .toUpperCase();

const findUnitIdForApartment = (apartment: DetailedUnit): string | null => {
  const apartmentKeys = new Set([
    apartment.codUnidad,
    `${apartment.edificio}-${apartment.unidad}`,
    apartment.unidad
  ].filter((key): key is string => Boolean(key)));

  const normalizedApartmentBuilding = normalizedBuildingLabel(apartment.edificio || '');

  for (const building of projectBuildings.value) {
    const normalizedBuilding = normalizedBuildingLabel(building.name);
    for (const unit of building.units) {
      const unitKeys = [
        unit.codUnidad,
        unit.detailedUnitCode,
        unit.externalUnitCode,
        unit.name,
        `${building.name}-${unit.name}`
      ].filter((key): key is string => Boolean(key));

      if (unitKeys.some((key) => apartmentKeys.has(key))) {
        return unit.id;
      }

      if (normalizedBuilding === normalizedApartmentBuilding && (unit.name === apartment.unidad || unit.name.includes(apartment.unidad))) {
        return unit.id;
      }
    }
  }

  return null;
};

const effectiveUnits = computed(() => {
  if (filteredProjectApartments.value.length > 0 || projectApartments.value.length > 0) {
    return filteredProjectApartments.value.map((apartment) => ({
      id: `apt-${apartment.id}`,
      unitId: findUnitIdForApartment(apartment),
      buildingName: apartment.edificio || 'N/A',
      displayName: apartment.codUnidad || `${apartment.edificio}-${apartment.unidad}`,
      status: normalizeStatus(apartment),
      adeudado: apartment.adeudado || 0,
      deliveryDate: apartment.fechaEntregaInspeccion
    }));
  }

  return layoutUnits.value.map((unit) => ({
    id: `layout-${unit.id}`,
    unitId: unit.id,
    buildingName: unit.buildingName,
    displayName: unit.name,
    status: getLayoutUnitStatus(unit),
    adeudado: unit.balance || 0,
    deliveryDate: unit.deliveryDate || null
  }));
});

const calculatedStatusCounts = computed(() => {
  const counts: Record<DashboardStatus, number> = {
    available: 0,
    delivered: 0,
    financing: 0,
    inspection: 0,
    sold: 0,
    observation: 0
  };

  for (const unit of effectiveUnits.value) {
    counts[unit.status] += 1;
  }

  return counts;
});

const statusCounts = computed(() => {
  const fallback = calculatedStatusCounts.value;
  if (hasDashboardFilterActive.value) return fallback;
  if (!projectStats.value) return fallback;
  return {
    ...fallback,
    sold: projectStats.value.vendida,
    delivered: projectStats.value.unidadesEntregadas,
    financing: projectStats.value.unidadesConSaldo,
    inspection: projectStats.value.unidadesEnInspeccion
  };
});

const totalUnits = computed(() => {
  if (hasDashboardFilterActive.value) return effectiveUnits.value.length;
  return projectStats.value?.totalUnidades ?? effectiveUnits.value.length;
});

const topCards = computed(() => {
  const sold = statusCounts.value.sold;
  const inspection = statusCounts.value.inspection;
  const available = statusCounts.value.available;
  const soldRate = totalUnits.value > 0 ? Math.round((sold / totalUnits.value) * 100) : 0;
  const availableObservation = hasDashboardFilterActive.value ? available : (projectStats.value?.disponiblesObservacion ?? available);

  return [
    { label: 'Total unidades', value: totalUnits.value, subtext: `En ${buildingsCount.value} edificios`, icon: 'bi-grid-3x3-gap', colorClass: 'bg-blue-soft', subColor: 'text-slate-400' },
    { label: 'Vendidas', value: sold, subtext: totalUnits.value > 0 ? `${soldRate}% del total` : 'Sin datos', icon: 'bi-bag-check', colorClass: 'bg-indigo-soft', subColor: 'text-indigo-600' },
    { label: 'Unidades Listas', value: inspection, subtext: `Unidades Listas ${inspection} de ${totalUnits.value}`, icon: 'bi-clipboard-check', colorClass: 'bg-green-soft', subColor: 'text-green-600' },
    { label: 'Disponibles', value: availableObservation, subtext: `Disponibles ${availableObservation} de ${totalUnits.value}`, icon: 'bi-house-door', colorClass: 'bg-amber-soft', subColor: 'text-amber-600' }
  ];
});

const deliveredYears = computed(() => {
  const years = effectiveUnits.value
    .filter((unit) => unit.status === 'delivered' && unit.deliveryDate)
    .map((unit) => parseDateValue(unit.deliveryDate)?.getFullYear())
    .filter((year): year is number => typeof year === 'number' && Number.isFinite(year));

  if (years.length === 0) {
    return [new Date().getFullYear()];
  }

  return [...new Set(years)].sort((a, b) => b - a);
});

const selectedDeliveryYear = ref(String(new Date().getFullYear()));
const selectedDeliveryYearValue = computed(() => Number(selectedDeliveryYear.value));

watch(deliveredYears, (years) => {
  if (!years.includes(selectedDeliveryYearValue.value)) {
    selectedDeliveryYear.value = String(years[0] ?? new Date().getFullYear());
  }
}, { immediate: true });

const monthlyDeliveries = computed(() => {
  const counts = Array(12).fill(0);

  for (const unit of effectiveUnits.value) {
    if (unit.status !== 'delivered' || !unit.deliveryDate) continue;
    const date = parseDateValue(unit.deliveryDate);
    if (!date) continue;
    if (date.getFullYear() !== selectedDeliveryYearValue.value) continue;
    counts[date.getMonth()] += 1;
  }

  return counts;
});

const totalDeliveredByYear = computed(() => monthlyDeliveries.value.reduce((sum, value) => sum + value, 0));

const buildingStats = computed(() => {
  const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#0ea5e9', '#ef4444', '#f59e0b'];
  const map = new Map<string, { id: string; name: string; delivered: number; total: number; color: string }>();

  for (const [index, building] of projectBuildings.value.entries()) {
    map.set(building.id, {
      id: building.id,
      name: building.name,
      delivered: 0,
      total: 0,
      color: colors[index % colors.length]
    });
  }

  for (const unit of effectiveUnits.value) {
    const matched = [...map.values()].find((building) =>
      normalizedBuildingLabel(building.name) === normalizedBuildingLabel(unit.buildingName)
    );
    if (!matched) continue;
    matched.total += 1;
    if (unit.status === 'delivered') {
      matched.delivered += 1;
    }
  }

  return [...map.values()].map((building) => ({
    ...building,
    progress: building.total > 0 ? Math.round((building.delivered / building.total) * 100) : 0
  }));
});

const distributionSegments = computed(() => ([
  { label: STATUS_META.inspection.label, count: statusCounts.value.inspection, color: STATUS_META.inspection.color },
  { label: STATUS_META.sold.label, count: statusCounts.value.sold, color: STATUS_META.sold.color },
  { label: STATUS_META.available.label, count: hasDashboardFilterActive.value ? statusCounts.value.available : (projectStats.value?.disponiblesObservacion ?? statusCounts.value.available), color: STATUS_META.available.color }
]));

const viewportLegendSegments = computed(() => ([
  { label: UNIT_ESTADO_COLORS.vendido.label, color: UNIT_ESTADO_COLORS.vendido.colorCss, outline: false },
  { label: UNIT_ESTADO_COLORS.disponible.label, color: UNIT_ESTADO_COLORS.disponible.colorCss, outline: true },
  { label: UNIT_ESTADO_COLORS.intercambio.label, color: UNIT_ESTADO_COLORS.intercambio.colorCss, outline: false }
]));

const deliveryChartData = computed(() => ({
  labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  datasets: [{
    label: 'Entregadas',
    data: monthlyDeliveries.value,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
    borderSkipped: false,
    maxBarThickness: 20
  }]
}));

const deliveryChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 650, easing: 'easeOutQuart' as const },
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: (ctx: any) => `${ctx.parsed.y} entregas` } }
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
    y: { beginAtZero: true, ticks: { precision: 0, color: '#94a3b8', font: { size: 11 } }, grid: { color: '#e2e8f0' } }
  }
}));

const distributionChartData = computed(() => ({
  labels: distributionSegments.value.map((segment) => segment.label),
  datasets: [{
    data: distributionSegments.value.map((segment) => segment.count),
    backgroundColor: distributionSegments.value.map((segment) => segment.color),
    borderRadius: 8,
    borderSkipped: false,
    maxBarThickness: 24
  }]
}));

const distributionChartOptions = computed(() => ({
  indexAxis: 'y' as const,
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 650, easing: 'easeOutQuart' as const },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: any) => `${ctx.label}: ${ctx.parsed.x}`
      }
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: { precision: 0, color: '#94a3b8', font: { size: 11 } },
      grid: { color: '#e2e8f0' }
    },
    y: {
      grid: { display: false },
      ticks: { color: '#64748b', font: { size: 11, weight: 700 } }
    }
  }
}));

const recentActivities = computed(() => {
  return [...effectiveUnits.value]
    .filter((unit) => unit.status !== 'available')
    .slice(0, 8)
    .map((unit) => ({
      id: unit.id,
      unitId: unit.unitId,
      unit: unit.displayName,
      building: unit.buildingName,
      status: STATUS_META[unit.status].label,
      statusClass: STATUS_META[unit.status].statusClass
    }));
});

const selectedUnitSummary = computed(() => {
  if (!appStore.selectedUnitId) return '';
  const layoutUnit = layoutUnits.value.find((unit) => unit.id === appStore.selectedUnitId);
  if (!layoutUnit) return '';
  return `Unidad seleccionada: ${layoutUnit.name} (${layoutUnit.buildingName})`;
});

const layoutNotice = computed(() => {
  if (appStore.currentProjectLayoutStatus === 'loading') return 'Cargando layout del proyecto...';
  if (appStore.currentProjectLayoutStatus === 'missing') return appStore.currentProjectLayoutMessage;
  if (appStore.currentProjectLayoutStatus === 'error') return appStore.currentProjectLayoutMessage || 'No se pudo cargar el layout del proyecto.';
  return '';
});

const layoutNoticeTone = computed(() => {
  if (appStore.currentProjectLayoutStatus === 'error') return 'layout-notice-error';
  return 'layout-notice-warning';
});

const handleActivityClick = (unitId: string | null) => {
  if (!unitId) return;
  selectUnit(unitId);
};

const clearDashboardFilter = () => {
  dashboardFilter.value = { field: '', value: '' };
};

onMounted(() => {
  setAppMode('view');
});

watch(() => dashboardFilter.value.field, () => {
  dashboardFilter.value.value = '';
});

watch(projectId, (newId) => {
  if (!newId) return;
  clearDashboardFilter();
  selectProject(newId);
}, { immediate: true });
</script>

<style scoped>
.dashboard-view {
  background: #f8fafc;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  color: #1e293b;
}

.text-slate-900 { color: #0f172a; }
.text-slate-800 { color: #1e293b; }
.text-slate-700 { color: #334155; }
.text-slate-500 { color: #64748b; }
.text-slate-400 { color: #94a3b8; }
.bg-slate-50 { background-color: #f8fafc; }
.text-orange-500 { color: #f97316; }
.text-green-600 { color: #16a34a; }
.text-red-500 { color: #ef4444; }
.text-blue-600 { color: #2563eb; }
.text-indigo-600 { color: #4f46e5; }
.text-amber-600 { color: #d97706; }
.bg-blue-600 { background: #2563eb; }
.bg-blue-200 { background: #bfdbfe; }
.bg-blue-100 { background: #dbeafe; }

.bg-blue-soft { background: #eff6ff; color: #3b82f6; }
.bg-green-soft { background: #f0fdf4; color: #22c55e; }
.bg-cyan-soft { background: #ecfeff; color: #06b6d4; }
.bg-red-soft { background: #fef2f2; color: #ef4444; }
.bg-indigo-soft { background: #eef2ff; color: #6366f1; }
.bg-amber-soft { background: #fffbeb; color: #d97706; }

.fw-800 { font-weight: 800; }
.ls-1 { letter-spacing: 0.05em; }
.smaller-text { font-size: 0.75rem; }

.btn-white {
  background: white;
  color: #64748b;
  font-weight: 600;
  border: 1px solid #e2e8f0 !important;
}

.btn-primary-custom {
  background: #3b82f6;
  color: white;
}

.btn-primary-custom:hover {
  background: #2563eb;
  color: white;
}

.year-select {
  min-width: 92px;
  border-radius: 999px;
  border-color: #dbeafe;
  color: #1d4ed8;
  background-color: #eff6ff;
  font-weight: 700;
}

.dashboard-filter-card {
  border: 1px solid #e2e8f0 !important;
}

.filter-label-v2 {
  display: block;
  margin-bottom: 6px;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.filter-control {
  min-height: 42px;
  border-color: #dbe3ef;
  border-radius: 12px;
  color: #1e293b;
  font-weight: 650;
}

.filter-control:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 0.2rem rgba(59, 130, 246, 0.12);
}

.filter-clear-btn {
  min-height: 42px;
  border-radius: 12px;
}

.filter-summary {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  max-width: 100%;
  padding: 7px 12px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 0.78rem;
  font-weight: 800;
}

.stat-card-v2 {
  transition: transform 0.2s;
}

.stat-card-v2:hover {
  transform: translateY(-2px);
}

.card-icon-box {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

.main-3d-card {
  height: 550px;
  position: relative;
}

.viewport-wrapper {
  height: 100%;
  width: 100%;
  position: relative;
}

.layout-notice {
  position: absolute;
  top: 16px;
  left: 16px;
  right: 16px;
  z-index: 5;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 14px;
  backdrop-filter: blur(10px);
  font-weight: 600;
  font-size: 0.9rem;
}

.layout-notice-warning {
  background: rgba(255, 251, 235, 0.95);
  color: #92400e;
  border: 1px solid #fde68a;
  box-shadow: 0 10px 24px rgba(251, 191, 36, 0.12);
}

.layout-notice-error {
  background: rgba(254, 242, 242, 0.95);
  color: #b91c1c;
  border: 1px solid #fecaca;
  box-shadow: 0 10px 24px rgba(239, 68, 68, 0.12);
}

.selected-unit-chip {
  position: absolute;
  left: 16px;
  bottom: 18px;
  z-index: 5;
  background: rgba(15, 23, 42, 0.86);
  color: #f8fafc;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
}

.viewport-legend {
  position: absolute;
  right: 16px;
  bottom: 14px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
  z-index: 4;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
  background: rgba(255, 255, 255, 0.9);
  padding: 4px 10px;
  border-radius: 20px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.dot { width: 8px; height: 8px; border-radius: 50%; }
.dot-outline { border: 1px solid #94a3b8; }

.legend-help-btn {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 999px;
  padding: 4px 10px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.building-progress-list {
  max-height: 420px;
  overflow-y: auto;
  padding-right: 8px;
}

.bld-accent { width: 4px; height: 16px; border-radius: 2px; }
.dot-v2 { width: 10px; height: 10px; border-radius: 3px; }

.distribution-layout {
  gap: 12px;
}

.chart-panel {
  position: relative;
  width: 100%;
  height: 220px;
}

.chart-panel-distribution {
  min-width: 0;
  height: 220px;
}

.card-empty {
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  color: #94a3b8;
  font-size: 0.9rem;
  padding: 16px;
}

.custom-activity-table thead th {
  border: none;
  padding-bottom: 12px;
}

.activity-table-wrapper {
  max-height: 380px;
  overflow-y: auto;
  padding-right: 4px;
}

.activity-row-clickable {
  cursor: pointer;
}

.activity-row-clickable:hover {
  background: #f8fafc;
}

.status-pill {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  text-transform: uppercase;
}

.status-green { background: #f0fdf4; color: #22c55e; border: 1px solid #dcfce7; }
.status-indigo { background: #eef2ff; color: #6366f1; border: 1px solid #e0e7ff; }
.status-cyan { background: #ecfeff; color: #06b6d4; border: 1px solid #cffafe; }
.status-blue { background: #eff6ff; color: #3b82f6; border: 1px solid #dbeafe; }
.status-red { background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; }
.status-slate { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }

.building-progress-list::-webkit-scrollbar,
.activity-table-wrapper::-webkit-scrollbar {
  width: 4px;
}

.building-progress-list::-webkit-scrollbar-track,
.activity-table-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.building-progress-list::-webkit-scrollbar-thumb,
.activity-table-wrapper::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}

:deep(.toolbar-glass), :deep(.properties-panel-glass) {
  display: none !important;
}

.dashboard-view::-webkit-scrollbar {
  width: 6px;
}

.dashboard-view::-webkit-scrollbar-track {
  background: transparent;
}

.dashboard-view::-webkit-scrollbar-thumb {
  border-radius: 10px;
}

@media (max-width: 992px) {
  .main-3d-card {
    height: 520px;
  }

  .building-progress-list {
    max-height: 260px;
  }

  .distribution-layout {
    flex-direction: column;
  }

  .distribution-legend {
    margin-left: 0 !important;
    width: 100%;
  }
}

@media (max-width: 768px) {
  .dashboard-view {
    padding-top: 70px !important;
    padding-left: 1rem !important;
    padding-right: 1rem !important;
  }

  .main-3d-card {
    height: 420px;
  }

  .viewport-legend {
    left: 16px;
    right: 16px;
    justify-content: center;
  }

  .selected-unit-chip {
    bottom: 56px;
    max-width: calc(100% - 32px);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
