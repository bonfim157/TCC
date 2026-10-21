-- Convites recebidos em Minha conta: quem já tem conta vê os convites de outras
-- escolas sem precisar do link. Os convites ficam isolados por rede; este índice
-- (sem RLS, como tokens_convite) diz só em que rede está o convite de um e-mail.
alter table tokens_convite add column convite_id text references convites(id);
alter table tokens_convite add column email text;
create index tokens_convite_email on tokens_convite (email);
grant update on tokens_convite to app_tcc;
