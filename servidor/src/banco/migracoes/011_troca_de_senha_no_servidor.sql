-- A aplicação lê só o indicador de senha temporária (nunca o hash) para recusar as rotas de dados até a troca.
grant select (senha_temporaria) on usuarios to app_tcc;
