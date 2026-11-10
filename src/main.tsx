import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register service worker on window load (skip if unsupported)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.update().catch(() => {});
    }).catch((err) => {
      console.warn('ServiceWorker registration error:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
