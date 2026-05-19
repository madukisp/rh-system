# RH-SYSTEM — Contexto do Grupo WhatsApp

> Arquivo de configuração da IA. Não editar manualmente salvo orientação.

## Escopo restrito
**Este grupo é dedicado exclusivamente ao projeto rh-system.**
- Path base: `C:\Users\Amanda\sbcd-projects\rh-system`
- **Nunca acessar outros projetos** (tlp-dashboard, kanbanapp, etc.) **exceto se Amanda pedir explicitamente**
- Documentação auxiliar pode ser criada em `MaduKB/RHS/` se necessário

## Propósito do grupo
Agenda / linha do tempo pessoal. Amanda lembra de coisas que já fez → eu anoto automaticamente nos projetos/cards/tarefas do rh-system. Não precisa pedir pra criar projeto — se ela mencionar algo que fez, eu já registro.

## O que já foi feito nesta sessão (2026-05-19)
- ✅ Projeto "Sistema de Admissão - Google Planilhas" inserido na tabela `projetos` do banco SQLite
  - Criação: 10/06/2025 (primeira resposta do formulário, Edna Gonçalves)
  - Status: inativo (arquivado)
  - Setor: RH - Seleção
  - Descrição: fluxo de admissão via Google Forms → 2 planilhas (exame médico + capa admissão) → PDF automático → email ao analista
- ✅ Card Hermes `t_49df6e4e` criado para TLP v1 (React, descartado)
- ✅ Card Hermes `t_15686934` criado para Sistema de Admissão (Jun/2025)
- ✅ Registro detalhado salvo em `MaduKB/TLP/Tarefas/2026-05-19_sistema-admissao-arquivado.md`

## Regras de interação
1. Mensagens curtas e diretas (Amanda não gosta de texto longo)
2. Se ela disser "calma ai" ou "não é pra subir", parar imediatamente
3. Sempre confirmar antes de rodar comando destrutivo
4. Horários em BRT (UTC-3), nunca UTC
5. Anotar projetos/tarefas automaticamente quando ela mencionar trabalho já realizado

## Estado atual do banco
- **Engine atual: SQLite** (migrou-se fora do Supabase)
- Path do banco: `data/rh-system.sqlite` (relativo à raiz do projeto)
- 11 projetos cadastrados (ver `listProjetos()` ou query direta no SQLite)
