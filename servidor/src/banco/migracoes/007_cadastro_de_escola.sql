-- Cadastro da escola pela própria direção.
--
-- O isolamento é por rede (002), então cada escola cadastrada assim ganha uma
-- rede só dela: entrar numa rede existente daria acesso aos casos das outras
-- escolas dessa rede. O código INEP identifica a escola e só pode ser usado uma vez.
alter table escolas add column inep text unique check (inep ~ '^[0-9]{8}$');

-- A aplicação não tem INSERT em redes nem em usuarios: cria as duas só por aqui.
-- O resto (regional, escola, tipos de ocorrência, vínculo) entra pela própria
-- aplicação, já dentro da rede nova e sob a Row-Level Security de sempre.
create function cadastrar_escola(
  p_rede_id text, p_nome text, p_secretaria text, p_municipio text, p_uf text, p_esfera text, p_sigla text,
  p_usuario_nome text, p_email text, p_senha_hash text
) returns text
  language plpgsql security definer set search_path = public as $$
declare v_usuario text;
begin
  insert into redes (id, nome, secretaria, municipio, uf, esfera, sigla, subdominio)
    values (p_rede_id, p_nome, p_secretaria, p_municipio, p_uf, p_esfera, p_sigla, p_rede_id);
  insert into usuarios (nome, email, senha_hash)
    values (p_usuario_nome, lower(p_email), p_senha_hash) returning id into v_usuario;
  return v_usuario;
end $$;
revoke all on function cadastrar_escola(text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function cadastrar_escola(text, text, text, text, text, text, text, text, text, text) to app_tcc;
