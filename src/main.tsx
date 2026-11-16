import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
} else if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // Limpiar dev-sw previos que puedan interceptar chunks dinámicos en desarrollo
  navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) {
      void reg.unregister();
    }
  }).catch(() => {
    // Ignorar errores de unregister
  });
}

createRoot(document.getElementById('root')!).render(<App />);
