import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.jsx'
import ErrorBoundary from './shared/ui/ErrorBoundary.jsx'

// Ensure the viewport meta is set correctly for Capacitor on all platforms
if (!document.querySelector('meta[name="viewport"]')) {
  const meta = document.createElement('meta');
  meta.name = 'viewport';
  meta.content = 'viewport-fit=cover, width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no';
  document.head.appendChild(meta);
}

// PWA / Capacitor: window.innerHeight is the true usable height, unlike
// 100svh / 100vh which can mismatch in standalone PWA mode (especially iOS).
// We expose it as --app-height so the layout uses the real viewport size.
function _setAppHeight() {
  document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
}
_setAppHeight();
window.addEventListener('resize', _setAppHeight);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
