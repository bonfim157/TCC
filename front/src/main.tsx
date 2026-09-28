import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import '@fontsource/source-sans-3/latin-400.css';
import '@fontsource/source-sans-3/latin-600.css';
import '@fontsource/source-sans-3/latin-700.css';
import '@fontsource/source-serif-4/latin-600.css';
import '@fontsource/source-serif-4/latin-700.css';
import './styles/base.css';
import './styles/componentes.css';
import './styles/layout.css';
import './styles/paginas.css';
import './styles/registro.css';
import './styles/central.css';
import './styles/gestao.css';

import { App } from './App';
import { NotificacoesProvider } from './components/feedback';
import { LimiteDeErro } from './pages/Estados';
import { PreferenciasProvider } from './state/preferencias';
import { RascunhosProvider } from './state/rascunhos';
import { SessaoProvider } from './state/sessao';

async function iniciar() {
  // Enquanto não houver backend, a API simulada responde no próprio navegador.
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true });

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <LimiteDeErro>
        <BrowserRouter>
          <PreferenciasProvider>
            <SessaoProvider>
              <RascunhosProvider>
                <NotificacoesProvider>
                  <App />
                </NotificacoesProvider>
              </RascunhosProvider>
            </SessaoProvider>
          </PreferenciasProvider>
        </BrowserRouter>
      </LimiteDeErro>
    </StrictMode>,
  );
}

iniciar();
