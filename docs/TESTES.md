# Testes

## Unitários (Vitest)

```bash
npm test
```

Cobrem datas e fuso de São Paulo, multa/juros, status de mensalidades, projeção de caixa, DRE, livro-caixa,
simulador de investimentos, métricas e recomendações, token de check-in, matriz de permissões e validações Zod.

## Banco de dados (PostgreSQL)

```bash
DATABASE_ADMIN_URL=postgres://postgres:SENHA@localhost:5432/postgres npm run test:db
```

Cria um banco descartável, simula o mínimo do Supabase (`supabase/tests/00_supabase_stub.sql`), aplica todas as
migrations e o seed e executa `supabase/tests/10_rls_business_rules.sql`: políticas RLS por perfil, geração de
mensalidades, pagamento/estorno, renegociação, check-in, anonimização, fichas, agregações e sincronização de
metadados do Auth.

## Ponta a ponta (Playwright)

Requer o app rodando contra um backend Supabase (local via `supabase start` ou um projeto de teste) com um
administrador criado:

```bash
E2E_BASE_URL=http://localhost:3000 E2E_ADMIN_EMAIL=admin@exemplo.com E2E_ADMIN_PASSWORD='***' npm run test:e2e
```

O roteiro percorre: proteção de rotas, login, preço de plano, cadastro com validação de CPF/LGPD, matrícula,
pagamento e recibo, saúde, check-in (e bloqueio de duplicidade), ficha de treino e registro de carga, lançamentos
financeiros, dashboard, DRE e demais páginas, simulador, exportação PDF/Excel/CSV, geração de mensalidades,
criação de acesso ao portal, portal do aluno, bloqueio do aluno às áreas da equipe e responsividade em celular
(390 px), tablet (820 px), Full HD (1920 px) e TV 4K (3840 px). Use `E2E_SCREENSHOTS=pasta` para salvar capturas.
