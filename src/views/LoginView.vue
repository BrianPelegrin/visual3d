<template>
  <div class="login-page d-flex align-items-center justify-content-center">
    <!-- Animated Background Shapes -->
    <div class="bg-shape shape-1"></div>
    <div class="bg-shape shape-2"></div>
    <div class="bg-shape shape-3"></div>

    <div class="login-card glass p-5 animate__animated animate__fadeInUp">
      <div class="text-center mb-5">
        <div class="logo-box mb-3 d-inline-flex align-items-center justify-content-center">
          <i class="bi bi-layers-half text-primary fs-1"></i>
        </div>
        <h2 class="fw-800 text-slate-900">Visual3D</h2>
        <p class="text-slate-500 fw-medium">Panel de Gestión Inmobiliaria</p>
      </div>

      <form @submit.prevent="handleLogin">
        <div class="mb-4">
          <label class="form-label text-slate-500 smaller-text fw-bold ls-1 mb-2 text-uppercase">Correo Electrónico</label>
          <div class="input-group-custom">
            <i class="bi bi-envelope text-slate-400"></i>
            <input 
              v-model="email" 
              type="email" 
              class="form-control" 
              placeholder="tucorreo@ejemplo.com"
              required
              :disabled="loading"
            >
          </div>
        </div>

        <div class="mb-4">
          <label class="form-label text-slate-500 smaller-text fw-bold ls-1 mb-2 text-uppercase">Contraseña</label>
          <div class="input-group-custom">
            <i class="bi bi-shield-lock text-slate-400"></i>
            <input 
              v-model="password" 
              type="password" 
              class="form-control" 
              placeholder="••••••••"
              required
              :disabled="loading"
            >
          </div>
        </div>

        <div v-if="errorMessage" class="alert alert-danger-soft smaller-text fw-bold mb-4 animate__animated animate__shakeX">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ errorMessage }}
        </div>

        <button 
          type="submit" 
          class="btn btn-primary-custom w-100 py-3 fw-800 shadow-lg position-relative overflow-hidden"
          :disabled="loading"
        >
          <span v-if="!loading">INICIAR SESIÓN</span>
          <span v-else class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        </button>
      </form>

      <div class="mt-5 text-center">
        <p class="smaller-text text-slate-400 mb-0">© 2026 Visual3D Labs · v2.1.0</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { login } from '../store/appStore';

const router = useRouter();
const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMessage = ref('');

const handleLogin = async () => {
  loading.value = true;
  errorMessage.value = '';
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1200));
  
  const success = await login(email.value, password.value);
  
  if (success) {
    router.push('/projects');
  } else {
    errorMessage.value = 'Credenciales inválidas. Verifica tu correo y contraseña.';
    loading.value = false;
  }
};
</script>

<style scoped>
.login-page {
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh; /* Adapts to mobile browser bar */
  max-width: 100vw;
  background-color: #f1f5f9;
  position: relative;
  overflow: hidden;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  /* Extra padding for safe area (notch / browser bar) */
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}


/* Animated Background */
.bg-shape {
  position: absolute;
  filter: blur(80px);
  z-index: 0;
  opacity: 0.5;
  animation: float 20s infinite alternate cubic-bezier(0.445, 0.05, 0.55, 0.95);
}

.shape-1 {
  width: 400px;
  height: 400px;
  background: #3b82f6;
  top: -100px;
  left: -100px;
}

.shape-2 {
  width: 350px;
  height: 350px;
  background: #06b6d4;
  bottom: -50px;
  right: -50px;
  animation-delay: -5s;
}

.shape-3 {
  width: 300px;
  height: 300px;
  background: #8b5cf6;
  top: 40%;
  left: 30%;
  opacity: 0.3;
  animation-duration: 25s;
}

@keyframes float {
  from { transform: translate(0, 0) rotate(0deg) scale(1); }
  to { transform: translate(100px, 50px) rotate(30deg) scale(1.1); }
}

/* Glass Card */
.login-card {
  width: 100%;
  max-width: 460px;
  margin: 0 auto;
  padding: clamp(1.5rem, 5vw, 3rem) !important;
  border-radius: 32px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08);
  position: relative;
  z-index: 10;
}

.logo-box {
  width: 70px;
  height: 70px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 10px 20px rgba(0,0,0,0.05);
}

/* Forms */
.text-slate-900 { color: #0f172a; }
.text-slate-500 { color: #64748b; }
.text-slate-400 { color: #94a3b8; }
.fw-800 { font-weight: 800; }
.ls-1 { letter-spacing: 0.05em; }
.smaller-text { font-size: 0.75rem; }

.input-group-custom {
  position: relative;
  display: flex;
  align-items: center;
}

.input-group-custom i {
  position: absolute;
  left: 16px;
  font-size: 1.1rem;
  z-index: 5;
}

.input-group-custom .form-control {
  padding: 14px 14px 14px 48px;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  background: white;
  font-weight: 500;
  transition: all 0.3s;
}

.input-group-custom .form-control:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.btn-primary-custom {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 14px;
  transition: all 0.3s;
}

.btn-primary-custom:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3);
}

.btn-primary-custom:active {
  transform: translateY(0);
}

.alert-danger-soft {
  background-color: #fef2f2;
  color: #ef4444;
  border: 1px solid #fee2e2;
  border-radius: 12px;
  padding: 12px;
}
</style>
