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
          <router-link :to="`/projects/${projectId}/units`" class="btn btn-primary-custom shadow-sm border-0 px-4 py-2 fw-bold">
            <i class="bi bi-file-earmark-text me-2"></i>Ver Unidades
          </router-link>
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
        <div class="col-xl-9">
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
              <Viewport3D hideUI />
              <div class="viewport-legend">
                <div class="legend-item"><span class="dot bg-success"></span> Entregada</div>
                <div class="legend-item"><span class="dot bg-warning"></span> Con saldo</div>
                <div class="legend-item"><span class="dot bg-info"></span> En inspeccion</div>
                <div class="legend-item"><span class="dot bg-primary"></span> Disponible</div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl-3">
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
            <div class="d-flex justify-content-between align-items-center mb-4">
              <h5 class="fw-bold text-slate-900 mb-0">Entregas por mes</h5>
              <span class="badge bg-blue-100 text-blue-600 rounded-pill">{{ deliveryYearLabel }}</span>
            </div>

            <div v-if="totalDeliveredByYear === 0" class="card-empty">
              Aun no hay entregas registradas para este periodo.
            </div>

            <div v-else>
              <div class="chart-container d-flex align-items-end justify-content-between gap-2 px-1" style="height: 200px;">
                <div
                  v-for="(count, index) in monthlyDeliveries"
                  :key="index"
                  class="bar-item bg-blue-200 rounded-top"
                  :title="`Mes ${index + 1}: ${count} entregas`"
                  :style="{
                    height: `${maxMonthlyDelivery > 0 ? (count * 100) / maxMonthlyDelivery : 0}%`,
                    opacity: count > maxMonthlyDelivery / 2 ? 1 : 0.55,
                    background: count > maxMonthlyDelivery / 2 ? '#3b82f6' : '#93c5fd'
                  }"
                ></div>
              </div>
              <div class="d-flex justify-content-between mt-3 text-slate-400 smaller-text px-1">
                <span>Ene</span><span>Feb</span><span>Mar</span><span>Abr</span><span>May</span><span>Jun</span>
                <span>Jul</span><span>Ago</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dic</span>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl-4 col-md-6">
          <div class="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <h5 class="fw-bold text-slate-900 mb-4">Distribucion por estado</h5>
            <div class="d-flex align-items-center justify-content-center h-100 donut-layout">
              <div class="donut-wrapper position-relative" style="width: 180px; height: 180px;">
                <div class="donut-conic" :style="donutStyle"></div>
                <div class="donut-hole">
                  <div class="fw-800 fs-4 text-slate-800">{{ totalUnits }}</div>
                  <div class="smaller-text text-slate-400">TOTAL</div>
                </div>
              </div>
              <div class="donut-legend d-flex flex-column gap-2 ms-4">
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
import { computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { appStore, selectProject, selectUnit, setAppMode } from '../store/appStore';
import type { Unit, DetailedUnit } from '../models/types';
import Viewport3D from '../components/Viewport3D.vue';

type DashboardStatus = 'available' | 'delivered' | 'financing' | 'inspection' | 'sold' | 'observation';

const route = useRoute();
const projectId = computed(() => String(route.params.id ?? ''));

const project = computed(() => appStore.projects.find((p) => p.id === projectId.value));
const projectBuildings = computed(() => appStore.buildings.filter((b) => b.projectId === projectId.value));
const buildingsCount = computed(() => projectBuildings.value.length);

const projectApartments = computed(() => appStore.detailedUnits);
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
  if (projectApartments.value.length > 0) {
    return projectApartments.value.map((apartment) => ({
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

const statusCounts = computed(() => {
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

const totalUnits = computed(() => effectiveUnits.value.length);

const topCards = computed(() => {
  const delivered = statusCounts.value.delivered;
  const financing = statusCounts.value.financing;
  const inspection = statusCounts.value.inspection;
  const observation = statusCounts.value.observation;
  const available = statusCounts.value.available;
  const totalBalance = effectiveUnits.value.reduce((sum, unit) => sum + (unit.adeudado || 0), 0);
  const deliveredRate = totalUnits.value > 0 ? Math.round((delivered / totalUnits.value) * 100) : 0;

  return [
    { label: 'Total unidades', value: totalUnits.value, subtext: `En ${buildingsCount.value} edificios`, icon: 'bi-grid-3x3-gap', colorClass: 'bg-blue-soft', subColor: 'text-slate-400' },
    { label: 'Entregadas', value: delivered, subtext: totalUnits.value > 0 ? `${deliveredRate}% del total` : 'Sin datos', icon: 'bi-check-circle', colorClass: 'bg-green-soft', subColor: 'text-green-600' },
    { label: 'Con saldo', value: financing, subtext: `Balance: RD$ ${(totalBalance / 1000000).toFixed(1)}M`, icon: 'bi-bank', colorClass: 'bg-blue-soft', subColor: 'text-blue-600' },
    { label: 'En inspeccion', value: inspection, subtext: 'Pendientes de entrega', icon: 'bi-search', colorClass: 'bg-cyan-soft', subColor: 'text-slate-400' },
    { label: 'Disponibles / observacion', value: available + observation, subtext: `${observation} en observacion`, icon: 'bi-exclamation-triangle', colorClass: 'bg-red-soft', subColor: 'text-red-500' }
  ];
});

const deliveredYears = computed(() => {
  const years = effectiveUnits.value
    .filter((unit) => unit.status === 'delivered' && unit.deliveryDate)
    .map((unit) => new Date(String(unit.deliveryDate)).getFullYear())
    .filter((year) => Number.isFinite(year));

  if (years.length === 0) {
    return [new Date().getFullYear()];
  }

  return [...new Set(years)].sort((a, b) => b - a);
});

const selectedDeliveryYear = computed(() => deliveredYears.value[0]);
const deliveryYearLabel = computed(() => String(selectedDeliveryYear.value));

const monthlyDeliveries = computed(() => {
  const counts = Array(12).fill(0);

  for (const unit of effectiveUnits.value) {
    if (unit.status !== 'delivered' || !unit.deliveryDate) continue;
    const date = new Date(String(unit.deliveryDate));
    if (date.getFullYear() !== selectedDeliveryYear.value) continue;
    counts[date.getMonth()] += 1;
  }

  return counts;
});

const maxMonthlyDelivery = computed(() => Math.max(...monthlyDeliveries.value, 1));
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
  { label: 'Entregada', count: statusCounts.value.delivered, color: '#22c55e' },
  { label: 'Con saldo', count: statusCounts.value.financing, color: '#3b82f6' },
  { label: 'Inspeccion', count: statusCounts.value.inspection, color: '#06b6d4' },
  { label: 'Disponible', count: statusCounts.value.available, color: '#6366f1' }
]));

const donutStyle = computed(() => {
  if (totalUnits.value === 0) {
    return { background: 'conic-gradient(#e2e8f0 0deg 360deg)' };
  }

  let cursor = 0;
  const gradients: string[] = [];

  for (const segment of distributionSegments.value) {
    const ratio = segment.count / totalUnits.value;
    const angle = Math.round(ratio * 360);
    const end = cursor + angle;
    gradients.push(`${segment.color} ${cursor}deg ${end}deg`);
    cursor = end;
  }

  if (cursor < 360) {
    gradients.push(`#e2e8f0 ${cursor}deg 360deg`);
  }

  return { background: `conic-gradient(${gradients.join(', ')})` };
});

const recentActivities = computed(() => {
  const statusMap: Record<DashboardStatus, { label: string; statusClass: string }> = {
    delivered: { label: 'Entregada', statusClass: 'status-green' },
    financing: { label: 'Con saldo', statusClass: 'status-blue' },
    inspection: { label: 'Inspeccion', statusClass: 'status-cyan' },
    sold: { label: 'Vendida', statusClass: 'status-indigo' },
    observation: { label: 'Observacion', statusClass: 'status-red' },
    available: { label: 'Disponible', statusClass: 'status-blue' }
  };

  return [...effectiveUnits.value]
    .filter((unit) => unit.status !== 'available')
    .slice(0, 8)
    .map((unit) => ({
      id: unit.id,
      unitId: unit.unitId,
      unit: unit.displayName,
      building: unit.buildingName,
      status: statusMap[unit.status].label,
      statusClass: statusMap[unit.status].statusClass
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

onMounted(() => {
  setAppMode('view');
});

watch(projectId, (newId) => {
  if (!newId) return;
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
.bg-blue-600 { background: #2563eb; }
.bg-blue-200 { background: #bfdbfe; }
.bg-blue-100 { background: #dbeafe; }

.bg-blue-soft { background: #eff6ff; color: #3b82f6; }
.bg-green-soft { background: #f0fdf4; color: #22c55e; }
.bg-cyan-soft { background: #ecfeff; color: #06b6d4; }
.bg-red-soft { background: #fef2f2; color: #ef4444; }

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

.building-progress-list {
  max-height: 420px;
  overflow-y: auto;
  padding-right: 8px;
}

.bld-accent { width: 4px; height: 16px; border-radius: 2px; }
.dot-v2 { width: 10px; height: 10px; border-radius: 3px; }

.donut-layout {
  gap: 12px;
}

.donut-conic {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.donut-hole {
  position: absolute;
  inset: 24px;
  background: #ffffff;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
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
    height: 460px;
  }

  .donut-layout {
    flex-direction: column;
  }

  .donut-legend {
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
