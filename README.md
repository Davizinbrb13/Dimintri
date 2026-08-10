# NexusTI

Sistema interno para organizar chamados, equipamentos e movimentacoes da equipe de Tecnologia da Informacao.

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

- Nao existe cadastro publico. Novas contas entram somente por convite de um administrador.
- Todo usuario novo nasce como `technician`; a elevacao para `admin` ocorre apenas no servidor.
- Cada convidado define a propria senha no link individual recebido por e-mail.
- Tecnicos leem e alteram somente os proprios chamados.
- Administradores acompanham toda a equipe.
- As regras sao aplicadas por RLS no banco, alem da protecao das rotas no Next.js.

O cliente administrativo usa `SUPABASE_SECRET_KEY` somente em Server Actions. Essa chave nunca deve receber o prefixo `NEXT_PUBLIC_`.

Consulte o roteiro completo em [`docs/production-checklist.md`](docs/production-checklist.md).

## Banco de dados

- `profiles`: conta e papel do membro da equipe.
- `campuses`: unidades disponiveis no formulario.
- `requesters`: matricula e nome do solicitante.
- `sectors`: setores sugeridos e cadastrados automaticamente.
- `tickets`: ocorrencia, diagnostico, solucao e tecnico responsavel.
- `ticket_history`: snapshot automatico de cada criacao e alteracao.
- `equipment_categories`: classificacao opcional e reutilizavel dos modelos.
- `equipment_models`: nome do equipamento compartilhado por varias unidades.
- `equipment_assets`: unidade fisica identificada por serial unico.
- `equipment_movements`: entrega, devolucao, transferencia, manutencao ou baixa.
- `equipment_movement_items`: equipamentos e origem registrados em cada movimentacao.

O cadastro de equipamentos aceita ate 200 seriais por lote. O nome e a categoria sao informados uma vez, enquanto cada serial gera uma unidade independente. Movimentacoes atualizam o inventario de forma transacional e preservam o historico.

As migrations locais ficam em `supabase/migrations/` e devem ser aplicadas ao projeto configurado nas variaveis de ambiente.

## Validacao

```bash
npm run typecheck
npm run lint
npm run build
```
