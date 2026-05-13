import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { GrayThemeProvider } from './components/ui/GrayThemeContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GrayThemeProvider>
      <App />
    </GrayThemeProvider>
  </StrictMode>
);
