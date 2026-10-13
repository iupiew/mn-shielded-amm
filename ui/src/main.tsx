import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Buffer } from 'buffer';
import App from './App';
import './App.css';
import './tabs.css';

// midnight-js hex helpers expect a Node-style Buffer in some code paths.
(globalThis as { Buffer?: typeof Buffer }).Buffer ??= Buffer;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
