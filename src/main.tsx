import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initPWAInstallCapture } from './utils/pwaInstall';

initPWAInstallCapture();

createRoot(document.getElementById('root')!).render(<App />);
