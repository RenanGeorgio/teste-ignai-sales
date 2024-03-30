import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from 'react-query';
import { queryClient } from '@services';
import App from './App';
import '@styles/global.scss';
import ThemeCtxProvider from './contexts/ThemeCtx';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeCtxProvider>
          <App />
        </ThemeCtxProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
