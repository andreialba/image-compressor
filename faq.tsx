import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './index.css';
import Faq from './components/Faq';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Faq />
  </React.StrictMode>
);
