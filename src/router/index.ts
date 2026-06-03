import { createRouter, createWebHistory } from 'vue-router';
import { appStore, ensureAuthInitialized, isSales } from '../store/appStore';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/projects'
    },
    {
      path: '/dashboard/:id?',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue')
    },
    {
      path: '/editor/:id?',
      name: 'editor',
      component: () => import('../views/EditorView.vue')
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('../views/UserManagementView.vue'),
      meta: { requiresAdmin: true }
    },
    {
      path: '/projects',
      name: 'projects',
      component: () => import('../views/ProjectManagementView.vue')
    },
    {
      path: '/projects/:id/units',
      name: 'project-units',
      component: () => import('../views/ProjectUnitsView.vue')
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue')
    }
  ]
});

router.beforeEach(async (to, _from, next) => {
  await ensureAuthInitialized();

  if (to.name !== 'login' && !appStore.isAuthenticated) {
    next({ name: 'login' });
  } else if (to.name === 'login' && appStore.isAuthenticated) {
    next({ name: 'projects' });
  } else if (to.meta.requiresAdmin && appStore.currentUser?.role !== 'admin') {
    next({ name: 'projects' }); 
  } else if (isSales() && (to.name === 'editor' || to.name === 'project-units')) {
    const id = to.params.id as string | undefined;
    next(id ? { name: 'dashboard', params: { id } } : { name: 'projects' });
  } else {
    // Check for project-specific routes that require an ID. Project details are loaded lazily per screen.
    const projectRoutes = ['dashboard', 'editor', 'project-units'];
    if (projectRoutes.includes(to.name as string)) {
      const id = to.params.id as string;
      
      if (!id) {
        console.warn(`Attempted access to ${String(to.name)} without project ID. Redirecting to projects.`);
        next({ name: 'projects' });
        return;
      }
    }
    next();
  }
});

export default router;
