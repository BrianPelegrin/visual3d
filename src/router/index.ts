import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import EditorView from '../views/EditorView.vue';
import UserManagementView from '../views/UserManagementView.vue';
import ProjectManagementView from '../views/ProjectManagementView.vue';
import ProjectUnitsView from '../views/ProjectUnitsView.vue';
import LoginView from '../views/LoginView.vue';
import { appStore, ensureAuthInitialized } from '../store/appStore';

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
      component: DashboardView
    },
    {
      path: '/editor/:id?',
      name: 'editor',
      component: EditorView
    },
    {
      path: '/users',
      name: 'users',
      component: UserManagementView,
      meta: { requiresAdmin: true }
    },
    {
      path: '/projects',
      name: 'projects',
      component: ProjectManagementView
    },
    {
      path: '/projects/:id/units',
      name: 'project-units',
      component: ProjectUnitsView
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView
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
  } else {
    // Check for project-specific routes that require a valid ID
    const projectRoutes = ['dashboard', 'editor', 'project-units'];
    if (projectRoutes.includes(to.name as string)) {
      const id = to.params.id as string;
      const projectExists = appStore.projects.some(p => p.id === id);
      
      if (!id || !projectExists) {
        console.warn(`Attempted access to ${String(to.name)} without valid project ID. Redirecting to projects.`);
        next({ name: 'projects' });
        return;
      }
    }
    next();
  }
});

export default router;
