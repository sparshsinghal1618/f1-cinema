import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/base.css';
import './styles/components.css';
import './styles/sections.css';

const container = document.getElementById('root');
if (!container) throw new Error('Mount point #root is missing');

// Deliberately not wrapped in StrictMode: the 3D layers own WebGL contexts and
// canvas-generated texture caches, and double-mounting them in development only
// adds churn without changing the shipped behaviour.
createRoot(container).render(<App />);
