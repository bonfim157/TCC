import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, ErroDaApi, FalhaDeRede } from '../api/client';
import { rotas, type PedidoCadastroEscola } from '../api/contract';
import { Botao, CampoSelecao, CampoTexto, GrupoOpcoes } from '../components/controles';
import { Aviso } from '../components/feedback';
import { ControlesDeAcessibilidade } from '../layout/MenuAparencia';
import { LousaDeAcesso } from './Entrar';

const ufs = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];
const vazio: PedidoCadastroEscola = {
  inep: '', nome: '', esfera: 'estadual', secretaria: '', municipio: '', uf: 'SP', bairro: '', nomeResponsavel: '', email: '', senha: '',
};
type Erros = Partial<Record<keyof PedidoCadastroEscola | 'envio', string>>;

/** Cadastro da escola pela própria direção. O código INEP identifica a escola; cada código entra uma vez só. */
export function CadastrarEscola() {
  const [p, setP] = useState(vazio);
  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState(false);
  const campo = (k: keyof PedidoCadastroEscola) => ({
    value: p[k],
    erro: erros[k],
    onChange: (e: { target: { value: string } }) => setP({ ...p, [k]: e.target.value }),
  });

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const novos: Erros = {
      inep: /^\d{8}$/.test(p.inep.replace(/\D/g, '')) ? undefined : 'O código INEP tem 8 números.',
      nome: p.nome.trim().length >= 3 ? undefined : 'Informe o nome da escola.',
      secretaria: p.secretaria.trim() ? undefined : 'Informe a secretaria responsável.',
      municipio: p.municipio.trim() ? undefined : 'Informe o município.',
      bairro: p.bairro.trim() ? undefined : 'Informe o bairro.',
      nomeResponsavel: p.nomeResponsavel.trim().length >= 3 ? undefined : 'Informe seu nome completo.',
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim()) ? undefined : 'Confira o e-mail.',
      senha: p.senha.length >= 12 ? undefined : 'A senha precisa ter pelo menos 12 caracteres.',
    };
    setErros(novos);
    if (Object.values(novos).some(Boolean)) return;
    setEnviando(true);
    try {
      await api(rotas.cadastroEscola, { method: 'POST', body: JSON.stringify(p) });
      setFeito(true);
    } catch (err) {
      setErros({ envio: err instanceof FalhaDeRede ? 'Sem conexão. Confira a internet e tente de novo.' : err instanceof ErroDaApi ? err.message : 'Não foi possível cadastrar a escola.' });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="tela-acesso">
      <LousaDeAcesso>
        <p>Cadastre a sua escola e convide a equipe.</p>
        <p>Quem cadastra fica com o perfil de direção. Depois, você cadastra os alunos e convida os professores.</p>
      </LousaDeAcesso>
      <div className="acesso-conteudo">
        <div className="acesso-topo"><ControlesDeAcessibilidade /></div>
        <main id="conteudo" className="acesso-coluna acesso-coluna-larga">
          <Link to="/entrar">Voltar para entrar</Link>
          {feito ? (
            <div className="pagina" role="status">
              <div className="pagina-cabeca">
                <h1>Escola cadastrada</h1>
                <p>Entre com o e-mail e a senha que você criou. No primeiro acesso, o sistema pede um código do celular para proteger a conta da direção.</p>
              </div>
              <div><Link className="btn btn-primario" to="/entrar?modo=senha">Entrar</Link></div>
            </div>
          ) : (
            <form className="pagina" onSubmit={enviar} noValidate>
              <div className="pagina-cabeca">
                <h1>Cadastrar minha escola</h1>
              </div>
              {erros.envio && <Aviso tipo="erro" titulo="A escola não foi cadastrada">{erros.envio}</Aviso>}
              <fieldset className="painel pilha">
                <legend>A escola</legend>
                <CampoTexto
                  rotulo="Código INEP da escola" inputMode="numeric" autoComplete="off" className="entrada entrada-codigo"
                  ajuda="São 8 números. Estão no Censo Escolar e no Catálogo de Escolas do INEP. Cada escola só pode ser cadastrada uma vez."
                  {...campo('inep')}
                />
                <CampoTexto rotulo="Nome da escola" {...campo('nome')} />
                <GrupoOpcoes
                  rotulo="Rede" nome="esfera"
                  opcoes={[{ valor: 'estadual', rotulo: 'Estadual' }, { valor: 'municipal', rotulo: 'Municipal' }]}
                  valor={p.esfera} aoMudar={(v) => setP({ ...p, esfera: v as PedidoCadastroEscola['esfera'] })}
                />
                <CampoTexto rotulo="Secretaria responsável" {...campo('secretaria')} />
                <CampoTexto rotulo="Município" {...campo('municipio')} />
                <CampoSelecao rotulo="Estado" value={p.uf} onChange={(e) => setP({ ...p, uf: e.target.value })}>
                  {ufs.map((u) => <option key={u}>{u}</option>)}
                </CampoSelecao>
                <CampoTexto rotulo="Bairro" {...campo('bairro')} />
              </fieldset>
              <fieldset className="painel pilha">
                <legend>Sua conta</legend>
                <CampoTexto rotulo="Seu nome completo" autoComplete="name" {...campo('nomeResponsavel')} />
                <CampoTexto rotulo="E-mail" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} {...campo('email')} />
                <CampoTexto
                  rotulo="Crie uma senha" type="password" autoComplete="new-password"
                  ajuda="Pelo menos 12 caracteres. Uma frase fácil de lembrar funciona melhor que uma senha curta cheia de símbolos."
                  {...campo('senha')}
                />
              </fieldset>
              <div><Botao type="submit" carregando={enviando}>Cadastrar escola</Botao></div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
