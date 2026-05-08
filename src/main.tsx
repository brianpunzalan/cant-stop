import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { extend } from '@pixi/react';
import { Graphics, Text, Sprite, Container } from 'pixi.js';
import { App } from './App';

// Register PixiJS components for use as JSX elements
extend({ Graphics, Text, Sprite, Container });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
