-- Cada código do segundo fator vale uma vez: guarda o último passo de 30 s aceito.
alter table fatores_mfa add column ultimo_passo bigint;
