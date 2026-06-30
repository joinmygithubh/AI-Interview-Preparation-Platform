import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Theme mode (light/dark/mono) is applied pre-paint by an inline script in
// index.html, then managed by the ThemeSelector component.

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
        <Toaster position="top-right" />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
