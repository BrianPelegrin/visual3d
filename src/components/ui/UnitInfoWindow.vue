<template>
  <transition name="fade-slide">
    <div v-if="appMode === 'view' && selectedUnit" class="unit-info-glass shadow-lg">
      <div class="glass-header d-flex justify-content-between align-items-center">
        <div class="d-flex flex-column" @click="toggleMinimize" style="cursor: pointer;">
          <div class="d-flex align-items-center gap-2">
            <div class="icon-circle">
              <i class="bi" :class="isMinimized ? 'bi-chevron-up' : 'bi-door-open-fill'"></i>
            </div>
            <span class="text-uppercase fw-bold ls-1 small tracking-wider">
              {{ isMinimized ? selectedUnit.name : 'Detalles de la Unidad' }}
            </span>
          </div>
          <div v-if="projectName && !isMinimized" class="project-indicator mt-1 animate__animated animate__fadeIn">
            <i class="bi bi-building-fill-gear"></i> {{ projectName }}
          </div>
        </div>
        <div class="d-flex gap-2">
          <button class="btn-minimize-custom" @click="toggleMinimize">
            <i class="bi" :class="isMinimized ? 'bi-fullscreen' : 'bi-dash-lg'"></i>
          </button>
          <button class="btn-close-custom" @click="closeWindow">
            <i class="bi bi-x"></i>
          </button>
        </div>
      </div>

      <div v-show="!isMinimized" class="glass-body-wrapper animate__animated animate__fadeIn">
        <div class="glass-body">
        <div class="mb-3">
          <h2 class="unit-title mb-1 text-truncate">{{ selectedUnit.name }}</h2>
          <div class="d-flex align-items-center gap-2">
            <span class="status-dot" :class="selectedUnit.status"></span>
            <span class="status-text text-uppercase fw-semibold">{{ unitStatusLabel }}</span>
          </div>
        </div>

        <div class="info-grid">
          <!-- Linked Data Section (only if available) -->
          <div v-if="linkedDetailedUnit" class="linked-data-wrapper animate__animated animate__fadeIn">
            <div class="info-item">
              <span class="info-label">Codigo Unidad</span>
              <span class="info-value text-truncate">{{ linkedDetailedUnit.codUnidad || 'N/D' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Estado Real</span>
              <span class="info-value text-primary fw-bold">{{ linkedDetailedUnit.estado || 'N/D' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Cliente</span>
              <span class="info-value text-end">{{ linkedDetailedUnit.nombre || 'N/D' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Cedula</span>
              <span class="info-value text-end">{{ linkedDetailedUnit.cedula || 'N/D' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Telefono</span>
              <span class="info-value text-end">{{ linkedDetailedUnit.telefono || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Correo</span>
              <span class="info-value text-truncate">{{ linkedDetailedUnit.correo || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Metraje</span>
              <span class="info-value">{{ linkedDetailedUnit.metraje || 0 }} m2</span>
            </div>

            <div class="section-divider my-3"></div>

            <div class="financial-pill mb-3">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="smaller-text opacity-75">Precio</span>
                <span class="fw-bold">{{ formatCurrency(linkedDetailedUnit.precio || 0) }}</span>
              </div>
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="smaller-text opacity-75">Inicial</span>
                <span class="fw-bold">{{ formatCurrency(linkedDetailedUnit.inicial || 0) }} / USD {{ linkedDetailedUnit.inicialDolar || 0 }}</span>
              </div>
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="smaller-text opacity-75">Pagado</span>
                <span class="fw-bold text-emerald-500">{{ formatCurrency(linkedDetailedUnit.pagado || 0) }} ({{ paymentProgress }}%)</span>
              </div>
              <div class="progress-container my-2">
                <div class="progress-bar-custom" :style="{ width: paymentProgress + '%' }"></div>
              </div>
              <div class="d-flex justify-content-between align-items-center">
                <span class="smaller-text fw-bold">Adeudado</span>
                <span class="fw-800" :class="(linkedDetailedUnit.adeudado || 0) > 0 ? 'text-danger' : 'text-emerald-500'">
                  {{ formatCurrency(linkedDetailedUnit.adeudado || 0) }}
                </span>
              </div>
            </div>

            <div class="info-item">
              <span class="info-label">Forma Pago</span>
              <span class="info-value text-end">{{ linkedDetailedUnit.formaPago || 'N/D' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Banco</span>
              <span class="info-value text-end">{{ linkedDetailedUnit.banco || 'N/D' }}</span>
            </div>

            <div class="section-divider my-3"></div>

            <div class="section-label-tiny mb-2">Checkpoints</div>
            <div class="d-flex flex-wrap gap-2 mb-3">
              <span class="badge-premium" :class="linkedDetailedUnit.enInspeccion ? 'paid' : 'pending'">Inspeccion</span>
              <span class="badge-premium" :class="linkedDetailedUnit.legal ? 'paid' : 'pending'">Legal</span>
              <span class="badge-premium" :class="linkedDetailedUnit.titulo ? 'paid' : 'pending'">Titulo</span>
              <span class="badge-premium" :class="linkedDetailedUnit.descargadaDGII ? 'paid' : 'pending'">DGII</span>
              <span class="badge-premium" :class="linkedDetailedUnit.saldo ? 'paid' : 'pending'">Saldo</span>
              <span class="badge-premium" :class="linkedDetailedUnit.entregada ? 'paid' : 'pending'">Entregada</span>
            </div>

            <div class="section-label-tiny mb-2">Fechas</div>
            <div class="mini-timeline">
              <div v-if="linkedDetailedUnit.fechaCompletaInicial" class="timeline-point">
                <span class="point-label">Inicial</span>
                <span class="point-date">{{ formatDate(linkedDetailedUnit.fechaCompletaInicial) }}</span>
              </div>
              <div v-if="linkedDetailedUnit.fechaInicioVaciados" class="timeline-point">
                <span class="point-label">Vaciados</span>
                <span class="point-date">{{ formatDate(linkedDetailedUnit.fechaInicioVaciados) }}</span>
              </div>
              <div v-if="linkedDetailedUnit.fechaEntregaInspeccion" class="timeline-point">
                <span class="point-label">Entrega/Inspeccion</span>
                <span class="point-date">{{ formatDate(linkedDetailedUnit.fechaEntregaInspeccion) }}</span>
              </div>
              <div v-if="linkedDetailedUnit.fechaLegal" class="timeline-point">
                <span class="point-label">Legal</span>
                <span class="point-date">{{ formatDate(linkedDetailedUnit.fechaLegal) }}</span>
              </div>
              <div v-if="linkedDetailedUnit.fechaGobierno" class="timeline-point">
                <span class="point-label">Gobierno</span>
                <span class="point-date">{{ formatDate(linkedDetailedUnit.fechaGobierno) }}</span>
              </div>
              <div v-if="linkedDetailedUnit.fechaMicelaneos" class="timeline-point">
                <span class="point-label">Miscelaneos</span>
                <span class="point-date">{{ formatDate(linkedDetailedUnit.fechaMicelaneos) }}</span>
              </div>
              <div v-if="linkedDetailedUnit.fechaInspeccion1" class="timeline-point">
                <span class="point-label">Inspeccion 1</span>
                <span class="point-date">{{ formatDate(linkedDetailedUnit.fechaInspeccion1) }}</span>
              </div>
              <div v-if="linkedDetailedUnit.fechaInspeccion2" class="timeline-point">
                <span class="point-label">Inspeccion 2</span>
                <span class="point-date">{{ formatDate(linkedDetailedUnit.fechaInspeccion2) }}</span>
              </div>
            </div>
          </div>
          <!-- Basic Data (Always visible or fallback) -->
          <div v-if="!linkedDetailedUnit" class="basic-data-wrapper animate__animated animate__fadeIn">
             <div class="financial-pill mb-3">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="smaller-text opacity-75">Precio Estimado</span>
                <span class="fw-bold fs-6">{{ formatCurrency(selectedUnit.price || 0) }}</span>
              </div>
              <div v-if="selectedUnit.balance" class="d-flex justify-content-between align-items-center mb-1">
                <span class="smaller-text opacity-75">Balance</span>
                <span class="fw-bold text-danger">{{ formatCurrency(selectedUnit.balance) }}</span>
              </div>
              <div class="section-divider my-2 opacity-50"></div>
              <div class="d-flex justify-content-between align-items-center">
                <span class="smaller-text fw-bold">Estado</span>
                <span class="badge-premium" :class="selectedUnit.paid ? 'paid' : 'pending'">
                   {{ selectedUnit.paid ? 'Saldado' : 'Pendiente' }}
                </span>
              </div>
            </div>
          </div>
          
          <!-- Basic Info Section (always visible fallback) -->
          <div class="info-item mt-2">
            <span class="info-label">Estado Pago</span>
            <div class="info-value">
              <span v-if="selectedUnit.paid || linkedDetailedUnit?.saldo" class="badge-premium paid">
                <i class="bi bi-check2-circle me-1"></i> Pagado
              </span>
              <span v-else class="badge-premium pending">
                <i class="bi bi-clock-history me-1"></i> Pendiente
              </span>
            </div>
          </div>

          <div class="info-item">
            <span class="info-label">Edificio</span>
            <span class="info-value text-truncate" :title="parentBuilding?.name">
              {{ parentBuilding?.name || 'N/D' }}
            </span>
          </div>

          <div class="info-item">
            <span class="info-label">Referencia</span>
            <span class="info-value text-muted-custom font-mono">
              {{ linkedDetailedUnit?.codUnidad || ('#' + selectedUnit.id.substring(4)) }}
            </span>
          </div>

          <div class="info-item">
            <span class="info-label">Banco</span>
            <span class="info-value text-truncate">
              {{ linkedDetailedUnit?.banco || selectedUnit.bank || 'N/D' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-show="!isMinimized" class="glass-footer">
        <button class="btn-action-primary" @click="closeWindow">
          Aceptar
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { appStore, selectUnit } from '../../store/appStore';
//import type { UnitStatus } from '../../models/types';

const isMinimized = ref(true);

const toggleMinimize = () => {
  isMinimized.value = !isMinimized.value;
};

const selectedUnitId = computed(() => appStore.selectedUnitId);

// Reset minimized state when selecting a new unit
watch(selectedUnitId, (newId) => {
  if (newId) {
    isMinimized.value = true;
  }
});
const appMode = computed(() => appStore.appMode);

// Find the unit and its parent building
const unitData = computed(() => {
  if (!selectedUnitId.value) return null;
  for (const bld of appStore.buildings) {
    const unit = bld.units.find(u => u.id === selectedUnitId.value);
    if (unit) return { unit, bld };
  }
  return null;
});

const selectedUnit = computed(() => unitData.value?.unit);
const parentBuilding = computed(() => unitData.value?.bld);

const projectName = computed(() => {
  if (!parentBuilding.value) return null;
  return appStore.projects.find(p => p.id === parentBuilding.value?.projectId)?.nombre || null;
});

const linkedDetailedUnit = computed(() => {
  if (!selectedUnit.value?.detailedUnitId) return null;
  return appStore.detailedUnits.find(du => du.id === selectedUnit.value?.detailedUnitId);
});

const paymentProgress = computed(() => {
  if (!linkedDetailedUnit.value || !linkedDetailedUnit.value.precio) return 0;
  const progress = (linkedDetailedUnit.value.pagado || 0) / linkedDetailedUnit.value.precio * 100;
  return Math.round(progress);
});

const unitStatusLabel = computed(() => {
  const statusLabels: Record<string, string> = {
    available: 'Disponible',
    reserved: 'Reservado',
    sold: 'Vendido',
    delivered: 'Entregado',
    financing: 'Financiado',
    inspection: 'Inspección',
    observation: 'Observación',
    maintenance: 'Mantenimiento'
  };
  return statusLabels[selectedUnit.value?.status || ''] || selectedUnit.value?.status || '';
});

const closeWindow = () => {
  selectUnit(null);
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', maximumFractionDigits: 0 }).format(val);
};

const formatDate = (value: string) => {
  if (!value) return '-';
  const raw = String(value).trim();
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat('es-DO', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
};
</script>

<style scoped>
.unit-info-glass {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  width: 340px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  z-index: 1000;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1), 
              inset 0 0 0 1px rgba(255, 255, 255, 0.5);
}

.glass-header {
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.3);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.project-indicator {
  font-size: 10px;
  font-weight: 600;
  color: #3b82f6;
  opacity: 0.9;
  display: flex;
  align-items: center;
  gap: 4px;
}

.icon-circle {
  width: 32px;
  height: 32px;
  background: #3b82f6;
  color: white;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-close-custom {
  background: none;
  border: none;
  font-size: 24px;
  color: #64748b;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-close-custom:hover {
  color: #0f172a;
  transform: scale(1.1);
}

.btn-minimize-custom {
  background: none;
  border: none;
  font-size: 18px;
  color: #64748b;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-minimize-custom:hover {
  color: #3b82f6;
  transform: scale(1.1);
}

.glass-body {
  padding: 20px;
  max-height: 55vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(0,0,0,0.15) transparent;
}

.glass-body::-webkit-scrollbar {
  width: 6px;
}

.glass-body::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.15);
  border-radius: 10px;
}

.glass-body::-webkit-scrollbar-track {
  background: transparent;
}

.financial-pill {
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.15);
  padding: 12px;
  border-radius: 16px;
}

.progress-container {
  height: 6px;
  background: rgba(0,0,0,0.05);
  border-radius: 10px;
  overflow: hidden;
}

.progress-bar-custom {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #3b82f6);
  border-radius: 10px;
  transition: width 1s ease-out;
}

.btn-mock {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: white;
  border: 1px solid #f1f5f9;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.2s;
  cursor: pointer;
}

.btn-mock:hover {
  background: #f8fafc;
  color: #3b82f6;
  border-color: #dbeafe;
  transform: translateY(-2px);
}

.contact-pill {
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  padding: 10px;
  border-radius: 12px;
}

.resp-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  background: rgba(0,0,0,0.02);
  border-radius: 6px;
}

.resp-label { font-size: 10px; color: #94a3b8; font-weight: 600; }
.resp-name { font-size: 11px; color: #334155; font-weight: 700; }

.section-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0,0,0,0.05), transparent);
}

.section-label-tiny {
  font-size: 10px;
  font-weight: 800;
  color: #94a3b8;
  letter-spacing: 0.1em;
}

.milestone-badge {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: white;
  border: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cbd5e1;
  transition: all 0.2s;
  font-size: 13px;
}

.milestone-badge.active {
  background: #eff6ff;
  color: #3b82f6;
  border-color: #dbeafe;
  box-shadow: 0 4px 10px rgba(59, 130, 246, 0.1);
}

.mini-timeline {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 12px;
  border-left: 1px dashed #e2e8f0;
}

.timeline-point {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

.timeline-point::before {
  content: '';
  position: absolute;
  left: -15px;
  top: 50%;
  transform: translateY(-50%);
  width: 5px;
  height: 5px;
  background: #cbd5e1;
  border-radius: 50%;
}

.timeline-point.important::before {
  background: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.point-label { font-size: 11px; font-weight: 600; color: #64748b; }
.point-date { font-size: 11px; font-weight: 700; color: #1e293b; }

.smaller-text { font-size: 11px; }

.unit-title {
  font-family: 'Inter', sans-serif;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: #0f172a;
  margin: 0;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.status-dot.available { background: #10b981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2); }
.status-dot.reserved { background: #f59e0b; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2); }
.status-dot.sold { background: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2); }
.status-dot.maintenance { background: #64748b; box-shadow: 0 0 0 3px rgba(100, 116, 139, 0.2); }

.status-text {
  font-size: 11px;
  letter-spacing: 0.5px;
  color: #64748b;
}

.info-grid {
  display: grid;
  gap: 16px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 13px;
  color: #94a3b8;
  font-weight: 500;
}

.info-value {
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
  max-width: 180px;
}

.badge-premium {
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
}

.badge-premium.paid {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.badge-premium.pending {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.text-muted-custom {
  color: #94a3b8;
}

.font-mono {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
}

.process-indicator {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.05);
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.process-indicator.sm {
  width: 18px;
  height: 18px;
  font-size: 9px;
  border-radius: 4px;
}

.process-indicator.active {
  background: #3b82f6;
  color: white;
  border-color: #2563eb;
}

.glass-footer {
  padding: 0 24px 24px;
}

.btn-action-primary {
  width: 100%;
  padding: 12px;
  background: #0f172a;
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.15);
}

.btn-action-primary:hover {
  background: #1e293b;
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.2);
}

.btn-action-primary:active {
  transform: translateY(0);
}

/* Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translate(-50%, 40px) scale(0.95);
}
</style>
