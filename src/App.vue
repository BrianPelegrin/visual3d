<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { appStore, logout } from './store/appStore';
import ProfileModal from './components/ui/ProfileModal.vue';

const router = useRouter();
const route = useRoute();
const isAuthenticated = computed(() => appStore.isAuthenticated);
const currentUser = computed(() => appStore.currentUser);
const showGlobalLoader = computed(() => {
  if (route.path === '/login') return false;
  return appStore.networkBusyCount > 0 || appStore.isProjectContextLoading;
});

const handleLogout = () => {
  logout();
  router.push('/login');
};

const isSidebarOpen = ref(false);
const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value;
};

// Close sidebar on mobile after navigation
watch(route, () => {
  isSidebarOpen.value = false;
});

const showProfileModal = ref(false);
const openProfile = () => {
  showProfileModal.value = true;
};
</script>

<template>
  <div class="app-layout d-flex">
    <div v-if="showGlobalLoader" class="app-loader-overlay">
      <div class="app-loader-card">
        <div class="app-loader-spinner"></div>
        <div class="app-loader-text">Cargando información...</div>
      </div>
    </div>

    <!-- Mobile Menu Button -->
    <button v-if="isAuthenticated && route.path !== '/login'" class="mobile-menu-toggle d-md-none" @click="toggleSidebar" aria-label="Toggle Menu">
      <i class="bi" :class="isSidebarOpen ? 'bi-x-lg' : 'bi-list'"></i>
    </button>

    <!-- Sidebar Backdrop (Mobile Only) -->
    <div v-if="isSidebarOpen" class="sidebar-backdrop d-md-none" @click="isSidebarOpen = false"></div>

    <!-- Sidebar -->
    <nav v-if="isAuthenticated" class="sidebar glass shadow-lg d-flex flex-column align-items-center py-4" 
         :class="{ 'sidebar-open': isSidebarOpen }">
      <div class="sidebar-logo mb-5">
        <i class="bi bi-layers-half text-primary fs-3"></i>
      </div>
      
      <div class="nav-links d-flex flex-column gap-4">
        <router-link to="/projects" class="nav-item" title="Proyectos">
          <i class="bi bi-folder2-open"></i>
        </router-link>
        <router-link v-if="currentUser?.role === 'admin'" to="/users" class="nav-item" title="Usuarios">
          <i class="bi bi-people"></i>
        </router-link>
      </div>
      
      <div class="mt-auto mb-2 d-flex flex-column gap-3 align-items-center">
        <div v-if="currentUser" class="user-avatar-mini avatar-highlight" :title="currentUser.name" @click="openProfile">
          {{ currentUser.name.charAt(0) }}
        </div>
        <button class="nav-item border-0 bg-transparent text-red-500" title="Cerrar Sesión" @click="handleLogout">
          <i class="bi bi-box-arrow-right"></i>
        </button>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="main-content flex-grow-1 overflow-y-auto">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- Profile Modal -->
    <ProfileModal :show="showProfileModal" @close="showProfileModal = false" />
  </div>
</template>

<style>
/* Global Glassmorphism Base */
:root {
  --sidebar-width: 80px;
}

.app-layout {
  overflow: hidden;
  width: 100vw;
  height: 100vh;
  height: 100dvh; /* dvh adjusts for mobile browser bars */
  padding-bottom: env(safe-area-inset-bottom);
  padding-top: env(safe-area-inset-top);
  box-sizing: border-box;
}

body {
  margin: 0;
  background-color: #f1f5f9;
  overflow: hidden;
}

.glass {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px) saturate(180%);
  border-right: 1px solid rgba(255, 255, 255, 0.3);
}

.sidebar {
  width: var(--sidebar-width);
  height: 100vh;
  height: 100dvh;
  z-index: 2000;
  position: relative;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  padding-bottom: env(safe-area-inset-bottom);
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    transform: translateX(-100%);
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(20px);
    width: 80px; /* Keep it narrow but fixed */
  }

  .sidebar.sidebar-open {
    transform: translateX(0);
  }

  .nav-links {
    padding: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
}

.mobile-menu-toggle {
  position: fixed;
  top: 15px;
  left: 15px;
  z-index: 3000;
  width: 45px;
  height: 45px;
  border-radius: 12px;
  background: white;
  border: 1px solid #e2e8f0;
  color: #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  cursor: pointer;
}

.sidebar-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  z-index: 1900;
}

.nav-links {
  width: 100%;
  padding: 0 16px;
}

.nav-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  color: #64748b;
  text-decoration: none;
  transition: all 0.3s;
  font-size: 1.4rem;
}

.nav-item:hover {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.nav-item.router-link-active {
  background: #0f172a;
  color: white;
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.2);
}

.user-avatar-mini {
  width: 48px;
  height: 48px;
  background: #3b82f6;
  color: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.2rem;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  cursor: pointer;
}

.avatar-highlight {
  border: 2px solid rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 15px rgba(59, 130, 246, 0.3);
}

.avatar-highlight:hover {
  transform: scale(1.1);
  border-color: #3b82f6;
  box-shadow: 0 0 25px rgba(59, 130, 246, 0.6);
  background: #2563eb;
}

.main-content {
  height: 100vh;
  height: 100dvh;
  overflow-x: hidden;
  overflow-y: auto;
  position: relative;
  min-width: 0;
  /* Add bottom padding so content doesn't hide under browser bar */
  padding-bottom: env(safe-area-inset-bottom);
  box-sizing: border-box;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.app-loader-overlay {
  position: fixed;
  inset: 0;
  z-index: 5000;
  background: rgba(248, 250, 252, 0.8);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-loader-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.15);
}

.app-loader-spinner {
  width: 22px;
  height: 22px;
  border: 3px solid #cbd5e1;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: app-spin 0.8s linear infinite;
}

.app-loader-text {
  font-size: 0.95rem;
  font-weight: 700;
  color: #334155;
}

@keyframes app-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
