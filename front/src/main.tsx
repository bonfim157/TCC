import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-700.css';
import './styles/base.css';
import './styles/componentes.css';
import './styles/layout.css';
import './styles/paginas.css';
import './styles/registro.css';
import './styles/central.css';
import './styles/gestao.css';

import { App } from './App';
import { NotificacoesProvider } from './components/feedback';
import { FaixaDemonstracao } from './layout/FaixaDemonstracao';
import { LimiteDeErro } from './pages/Estados';
import { PreferenciasProvider } from './state/preferencias';
import { RascunhosProvider } from './state/rascunhos';
import { SessaoProvider } from './state/sessao';

/*
 * VITE_API=real: o front chama o servidor em /api, no mesmo domínio.
 * Qualquer outro valor (padrão): a API simulada responde no próprio navegador.
 * No modo real, a simulação nem entra no pacote gerado.
 */
const simulada = import.meta.env.VITE_API !== 'real';

async function iniciar() {
  if (simulada) {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass', quiet: true });
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <LimiteDeErro>
        <BrowserRouter>
          <PreferenciasProvider>
            <SessaoProvider>
              <RascunhosProvider>
                <NotificacoesProvider>
                  {simulada && <FaixaDemonstracao />}
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
