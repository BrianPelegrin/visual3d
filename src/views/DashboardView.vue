<template>
  <div class="dashboard-view p-4 min-vh-100">
    <div class="container-fluid">
      
      <!-- HEADER SECTION -->
      <div class="row mb-4 align-items-end">
        <div class="col-md-8">
          <h1 class="display-6 fw-bold text-slate-900 mb-1">
            {{ project ? project.nombre : 'Vista General del Proyecto' }}
          </h1>
          <p class="text-slate-500 mb-0">
            {{ project ? project.direccion : 'Datos actualizados en tiempo real' }} · 
            <span class="fw-medium text-slate-700">{{ totalUnits }} unidades en {{ buildingsCount }} edificios</span>
          </p>
        </div>
        <div class="col-md-4 d-flex flex-wrap justify-content-md-end gap-2 mt-3 mt-md-0">
          <button class="btn btn-white shadow-sm border-0 px-3 py-2">
            <i class="bi bi-box-arrow-up me-2"></i>Exportar
          </button>
          <button class="btn btn-primary-custom shadow-sm border-0 px-4 py-2 fw-bold">
            <i class="bi bi-file-earmark-text me-2"></i>Reporte
          </button>
        </div>
      </div>

      <!-- TOP STAT CARDS -->
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

      <!-- MIDDLE SECTION: 3D + BUILDINGS -->
      <div class="row g-4 mb-4">
        <div class="col-xl-9">
          <div class="card border-0 shadow-sm rounded-4 overflow-hidden main-3d-card">
            <div class="viewport-wrapper bg-slate-50">
              <Viewport3D hideUI />
              <div class="viewport-legend position-absolute bottom-0 start-50 translate-middle-x pb-3 d-flex gap-3">
                 <div class="legend-item"><span class="dot bg-success"></span> Entregada</div>
                 <div class="legend-item"><span class="dot bg-warning"></span> Saldo</div>
                 <div class="legend-item"><span class="dot bg-info"></span> Inspección</div>
                 <div class="legend-item"><span class="dot bg-primary"></span> Disponible</div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-xl-3">
          <div class="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <h5 class="fw-bold text-slate-900 mb-0">Edificios</h5>
              <a href="#" class="text-primary-custom text-decoration-none smaller-text fw-bold">Ver todos →</a>
            </div>
            <p class="text-slate-400 smaller-text mb-4">Resumen de avance por edificio</p>
            
            <div class="building-progress-list d-flex flex-column gap-4">
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
                  <div class="progress-bar" :style="{ width: bld.progress + '%', background: bld.color }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- BOTTOM SECTION: ANALYSIS -->
      <div class="row g-4 mb-4">
        <!-- Delivery Chart -->
        <div class="col-xl-4 col-md-6">
          <div class="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <h5 class="fw-bold text-slate-900 mb-0">Entregas por Mes</h5>
              <span class="badge bg-blue-100 text-blue-600 rounded-pill">2026 <i class="bi bi-caret-down-fill ms-1"></i></span>
            </div>
            <div class="chart-container d-flex align-items-end justify-content-between gap-2 px-1" style="height: 200px;">
              <div v-for="(count, index) in monthlyDeliveries" :key="index" 
                   class="bar-item bg-blue-200 rounded-top" 
                   :title="`Mes ${index + 1}: ${count} entregas`"
                   :style="{ height: (maxMonthlyDelivery > 0 ? (count * 100 / maxMonthlyDelivery) : 0) + '%', opacity: count > (maxMonthlyDelivery / 2) ? 1 : 0.6, background: count > (maxMonthlyDelivery / 2) ? '#3b82f6' : '#93c5fd' }">
              </div>
            </div>
            <div class="d-flex justify-content-between mt-3 text-slate-400 smaller-text px-1">
              <span>Ene</span><span>Feb</span><span>Mar</span><span>Abr</span><span>May</span><span>Jun</span>
              <span>Jul</span><span>Ago</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dic</span>
            </div>
          </div>
        </div>

        <!-- Distribution Chart -->
        <div class="col-xl-4 col-md-6">
          <div class="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <h5 class="fw-bold text-slate-900 mb-4">Distribución por Estado</h5>
            <div class="d-flex align-items-center justify-content-center h-100">
              <div class="donut-wrapper position-relative" style="width: 180px; height: 180px;">
                <svg viewBox="0 0 36 36" class="donut">
                  <circle class="donut-ring" cx="18" cy="18" r="15.915" fill="transparent" stroke="#f1f5f9" stroke-width="3"></circle>
                  <circle class="donut-segment" cx="18" cy="18" r="15.915" fill="transparent" stroke="#22c55e" stroke-width="3" stroke-dasharray="45 55" stroke-dashoffset="25"></circle>
                  <circle class="donut-segment" cx="18" cy="18" r="15.915" fill="transparent" stroke="#3b82f6" stroke-width="3" stroke-dasharray="25 75" stroke-dashoffset="80"></circle>
                  <circle class="donut-segment" cx="18" cy="18" r="15.915" fill="transparent" stroke="#06b6d4" stroke-width="3" stroke-dasharray="15 85" stroke-dashoffset="55"></circle>
                  <circle class="donut-segment" cx="18" cy="18" r="15.915" fill="transparent" stroke="#6366f1" stroke-width="3" stroke-dasharray="15 85" stroke-dashoffset="40"></circle>
                </svg>
                <div class="donut-label position-absolute top-50 start-50 translate-middle text-center">
                   <div class="fw-800 fs-4 text-slate-800">{{ totalUnits }}</div>
                   <div class="smaller-text text-slate-400">TOTAL</div>
                </div>
              </div>
              <div class="donut-legend d-flex flex-column gap-2 ms-4">
                 <div v-for="st in statusLegend" :key="st.label" class="legend-item-v2 d-flex align-items-center gap-2">
                   <div class="dot-v2" :style="{ background: st.color }"></div>
                   <span class="smaller-text text-slate-500">{{ st.label }}</span>
                   <span class="smaller-text fw-bold text-slate-800 ms-auto">{{ st.count }}</span>
                 </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="col-xl-4">
          <div class="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <h5 class="fw-bold text-slate-900 mb-0">Actividad Reciente</h5>
              <a href="#" class="text-primary-custom text-decoration-none smaller-text fw-bold">Ver todo →</a>
            </div>
            <div class="activity-table-wrapper">
              <table class="table table-borderless table-sm custom-activity-table">
                <thead>
                  <tr class="smaller-text text-slate-400 text-uppercase ls-1">
                    <th>Unidad</th>
                    <th>Edificio</th>
                    <th class="text-end">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="act in recentActivities" :key="act.id">
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
import { appStore, setAppMode, selectProject } from '../store/appStore';
import Viewport3D from '../components/Viewport3D.vue';

const route = useRoute();
const projectId = computed(() => route.params.id as string);
const project = computed(() => appStore.projects.find(p => p.id === projectId.value));

onMounted(() => {
  setAppMode('view');
  if (projectId.value) {
    selectProject(projectId.value);
    console.log('Cargando dashboard para proyecto:', project.value?.nombre);
  }
});

watch(projectId, (newId) => {
  if (newId) {
    selectProject(newId);
  }
});

const buildingsCount = computed(() => projectBuildings.value.length);
const projectBuildings = computed(() => appStore.buildings.filter(b => b.projectId === projectId.value));

// Enriched units with real data from detailedUnits
const allUnits = computed(() => {
  return projectBuildings.value.flatMap(b => b.units.map(u => {
    const detailed = u.detailedUnitId ? appStore.detailedUnits.find(du => du.id === u.detailedUnitId) : null;
    return {
      ...u,
      // Priority to official data if linked
      status: detailed ? (detailed.entregada ? 'delivered' : (detailed.saldo ? 'financing' : u.status)) : u.status,
      balance: detailed ? (detailed.adeudado || 0) : (u.balance || 0),
      client: detailed ? detailed.nombre : null,
      deliveryDate: detailed ? detailed.fechaEntregaInspeccion : u.deliveryDate,
      price: detailed ? (detailed.precio || 0) : (u.price || 0)
    };
  }));
});

const totalUnits = computed(() => allUnits.value.length);

const topCards = computed(() => {
  const delivered = allUnits.value.filter(u => u.status === 'delivered').length;
  const financing = allUnits.value.filter(u => u.status === 'financing').length;
  const totalBalance = allUnits.value.reduce((acc, u) => acc + (u.balance || 0), 0);
  const inspection = allUnits.value.filter(u => u.status === 'inspection').length;
  const observation = allUnits.value.filter(u => u.status === 'observation').length;

  return [
    { label: 'Total Unidades', value: totalUnits.value, subtext: `En ${buildingsCount.value} edificios`, icon: 'bi-grid-3x3-gap', colorClass: 'bg-blue-soft', subColor: 'text-slate-400' },
    { label: 'Entregadas', value: delivered, subtext: `${Math.round((delivered / totalUnits.value) * 100)}% del total`, icon: 'bi-check-circle', colorClass: 'bg-green-soft', subColor: 'text-green-600' },
    { label: 'En Financiamiento', value: financing, subtext: `Balance: RD$ ${(totalBalance / 1000000).toFixed(1)}M`, icon: 'bi-bank', colorClass: 'bg-blue-soft', subColor: 'text-blue-600' },
    { label: 'En Inspección', value: inspection, subtext: 'Pendientes de entrega', icon: 'bi-search', colorClass: 'bg-cyan-soft', subColor: 'text-slate-400' },
    { label: 'En Observación', value: observation, subtext: `${observation} unidades reportadas`, icon: 'bi-exclamation-triangle', colorClass: 'bg-red-soft', subColor: 'text-red-500' }
  ];
});

// Calculate monthly deliveries for 2026
const monthlyDeliveries = computed(() => {
  const counts = Array(12).fill(0);
  allUnits.value.forEach(u => {
    if (u.status === 'delivered' && u.deliveryDate) {
      const date = new Date(u.deliveryDate);
      if (date.getFullYear() === 2026) {
        counts[date.getMonth()]++;
      }
    }
  });
  return counts;
});

const maxMonthlyDelivery = computed(() => Math.max(...monthlyDeliveries.value, 1));

const buildingStats = computed(() => {
  const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#0ea5e9', '#ec4899', '#ef4444'];
  return projectBuildings.value.map((b, i) => {
    const total = b.units.length;
    // Map units within this building to their enriched versions for stats
    const enrichedBldUnits = b.units.map(u => {
        const detailed = u.detailedUnitId ? appStore.detailedUnits.find(du => du.id === u.detailedUnitId) : null;
        return detailed ? { ...u, status: detailed.entregada ? 'delivered' : u.status } : u;
    });
    
    const delivered = enrichedBldUnits.filter(u => u.status === 'delivered').length;
    const progress = total > 0 ? Math.round((delivered / total) * 100) : 0;
    return {
      id: b.id,
      name: b.name,
      delivered,
      total,
      progress,
      color: colors[i % colors.length]
    };
  });
});

const statusLegend = computed(() => [
  { label: 'Entregada', count: allUnits.value.filter(u => u.status === 'delivered').length, color: '#22c55e' },
  { label: 'Saldo pend.', count: allUnits.value.filter(u => u.status === 'financing').length, color: '#3b82f6' },
  { label: 'Inspección', count: allUnits.value.filter(u => u.status === 'inspection').length, color: '#06b6d4' },
  { label: 'Disponibles', count: allUnits.value.filter(u => u.status === 'available').length, color: '#6366f1' }
]);

const recentActivities = computed(() => {
  // Just showing the first 5 project relevant units for display
  return allUnits.value
    .filter(u => u.status !== 'available')
    .slice(0, 5)
    .map((u) => {
      const b = projectBuildings.value.find(b => b.id === u.buildingId);
      const statusMap: Record<string, { label: string, class: string }> = {
        delivered: { label: 'Entregada', class: 'status-green' },
        financing: { label: 'Saldo', class: 'status-blue' },
        inspection: { label: 'Inspección', class: 'status-cyan' },
        sold: { label: 'Vendida', class: 'status-indigo' },
        observation: { label: 'Observación', class: 'status-red' }
      };
      const st = statusMap[u.status] || { label: u.status, class: 'status-blue' };
      
      return {
        id: u.id,
        unit: u.name,
        building: b ? b.name : 'N/A',
        status: st.label,
        statusClass: st.class
      };
    });
});
</script>

<style scoped>
.dashboard-view {
  background: #f8fafc;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  color: #1e293b;
}

/* Colors & Helpers */
.text-slate-900 { color: #0f172a; }
.text-slate-800 { color: #1e293b; }
.text-slate-700 { color: #334155; }
.text-slate-500 { color: #64748b; }
.text-slate-400 { color: #94a3b8; }
.bg-slate-50 { background-color: #f8fafc; }
.text-orange-600 { color: #ea580c; }
.text-orange-500 { color: #f97316; }
.text-green-600 { color: #16a34a; }
.text-red-500 { color: #ef4444; }

.bg-blue-soft { background: #eff6ff; color: #3b82f6; }
.bg-green-soft { background: #f0fdf4; color: #22c55e; }
.bg-cyan-soft { background: #ecfeff; color: #06b6d4; }
.bg-red-soft { background: #fef2f2; color: #ef4444; }

.text-blue-600 { color: #2563eb; }
.bg-blue-100 { background: #dbeafe; }
.text-blue-600 { color: #2563eb; }

.bg-blue-600 { background: #2563eb; }
.bg-blue-200 { background: #bfdbfe; }
.bg-blue-100 { background: #dbeafe; }

.fw-800 { font-weight: 800; }
.ls-1 { letter-spacing: 0.05em; }
.smaller-text { font-size: 0.75rem; }

/* Custom Buttons */
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

/* Cards */
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

/* 3D Main Section */
.main-3d-card {
  height: 550px;
  position: relative;
}
.viewport-wrapper {
  height: 100%;
  width: 100%;
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
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}
.dot { width: 8px; height: 8px; border-radius: 50%; }

/* Building List */
.building-progress-list {
  max-height: 420px;
  overflow-y: auto;
  padding-right: 8px;
}
.bld-accent { width: 4px; height: 16px; border-radius: 2px; }

/* Charts */
.donut-ring { stroke: #f1f5f9; }
.donut-segment { transition: stroke-dasharray 0.3s ease; }
.dot-v2 { width: 10px; height: 10px; border-radius: 3px; }

/* Table */
.custom-activity-table thead th {
  border: none;
  padding-bottom: 12px;
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

/* Activity Table Scroll */
.activity-table-wrapper {
  max-height: 380px;
  overflow-y: auto;
  padding-right: 4px;
}

/* Internal Scrollbar styling */
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
.building-progress-list::-webkit-scrollbar-thumb:hover,
.activity-table-wrapper::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}

:deep(.toolbar-glass), :deep(.properties-panel-glass) {
  display: none !important;
}

/* Scrollbar styling */
.dashboard-view::-webkit-scrollbar {
  width: 6px;
}
.dashboard-view::-webkit-scrollbar-track {
  background: transparent;
}
.dashboard-view::-webkit-scrollbar-thumb {
  border-radius: 10px;
}

@media (max-width: 768px) {
  .dashboard-view {
    padding-top: 70px !important;
    padding-left: 1rem !important;
    padding-right: 1rem !important;
  }
}
</style>
