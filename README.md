# NexusTI

CRM interno para organizar chamados e demandas da equipe de Tecnologia da Informacao.

## Stack

- Next.js 16 com App Router, Server Components e Server Actions.
- Supabase Auth, Postgres e Row Level Security.
- Identidade visual compartilhada em `design-system-nexusti/`.

## Desenvolvimento

1. Instale as dependencias com `npm install`.
2. Confirme as variaveis de `.env.local` usando `.env.example` como referencia.
3. Execute `npm run dev` e abra `http://localhost:3000`.

A chave usada no navegador e a chave publicavel do Supabase. Nenhuma chave secreta ou `service_role` faz parte do frontend.

## Contas e permissoes

- O primeiro usuario cadastrado recebe o papel `admin`.
- Os demais usuarios recebem o papel `technician`.
- Tecnicos leem e alteram somente os proprios chamados.
- Administradores acompanham toda a equipe.
- As regras sao aplicadas por RLS no banco, alem da protecao das rotas no Next.js.

Para producao, depois de cadastrar a equipe, desative novos cadastros publicos no painel do Supabase Auth ou adote um fluxo de convites.

## Banco de dados

- `profiles`: conta e papel do membro da equipe.
- `campuses`: unidades disponiveis no formulario.
- `requesters`: matricula e nome do solicitante.
- `sectors`: setores sugeridos e cadastrados automaticamente.
- `tickets`: ocorrencia, diagnostico, solucao e tecnico responsavel.
- `ticket_history`: snapshot automatico de cada criacao e alteracao.

As migrations locais ficam em `supabase/migrations/` e devem ser aplicadas ao projeto configurado nas variaveis de ambiente.

## Validacao

```bash
npm run typecheck
npm run lint
npm run build
```
