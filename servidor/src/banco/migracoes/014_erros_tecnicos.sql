-- Erros inesperados do servidor (resposta 500). O log da Vercel, no plano Hobby, guarda só 1 hora.
-- Sem dados pessoais: guarda o método, o modelo da rota (sem valores), o tipo e o código do erro. Nunca a mensagem.
create table erros_tecnicos (
  id      bigint generated always as identity primary key,
  em      timestamptz not null default clock_timestamp(),
  metodo  text not null,
  rota    text not null,
  tipo    text not null,
  codigo  text
);
-- Só gravação pela aplicação. A leitura fica para a administração técnica, pelo dono do banco.
grant insert on erros_tecnicos to app_tcc;
