import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { VideoTemplate } from './components/video/VideoTemplate';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VideoTemplate />
  </StrictMode>,
);