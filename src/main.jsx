import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './app/App.jsx'
import ErrorBoundary from './shared/ui/ErrorBoundary.jsx'
import { isNative } from './shared/platform.js'

// Redirect any non-/app path back to the static landing page (web only).
// On native the entire shell is the app so we never need this.
function LandingRedirect() {
  if (!isNative) window.location.replace('/landing.html');
  return null;
}

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
      <BrowserRouter>
        <Routes>
          {isNative ? (
            // Native shell: every path is the app
            <Route path="*" element={<App />} />
          ) : (
            <>
              <Route path="/app" element={<App />} />
              {/* Every other path → back to the static landing page */}
              <Route path="*" element={<LandingRedirect />} />
            </>
          )}
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
