import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import './Styles/globals.css';
import { AuthProvider } from './context/AuthContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swPath = window.location.pathname.startsWith('/Hive') ? '/Hive/sw.js' : '/sw.js';
    navigator.serviceWorker.register(swPath)
      .then((reg) => console.log('Service worker registered successfully:', reg.scope))
      .catch((err) => console.error('Service worker registration failed:', err));
  });
}
