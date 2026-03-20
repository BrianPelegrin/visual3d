import { createApp } from 'vue'
import './style.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import App from './App.vue'
import router from './router'
import { ensureAuthInitialized } from './store/appStore'

const bootstrap = async () => {
  await ensureAuthInitialized();

  const app = createApp(App);
  app.use(router);
  await router.isReady();
  app.mount('#app');
};

void bootstrap();
