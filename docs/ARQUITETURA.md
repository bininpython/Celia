# Arquitetura e modelo de dados

## Visão geral

```
Navegador (desktop, tablet, celular, TV)
   │  HTTPS
   ▼
Next.js 16 na Vercel ─ proxy.ts (renova sessão e protege rotas)
   ├─ Server Components: leitura de dados com a sessão do usuário (RLS aplicado)
   ├─ Server Actions: escrita, sempre com validação Zod no servidor + checagem de perfil
   ├─ Route Handlers: /api/relatorios/[tipo] (PDF/Excel/CSV), /api/portal/meus-dados (LGPD), /auth/callback
   ▼
Supabase
   ├─ PostgreSQL: tabelas, funções, gatilhos, Row Level Security (barreira definitiva de acesso)
   ├─ Auth: login por e-mail/senha; papel e vínculos em app_metadata (somente service role altera)
   └─ Storage: fotos de alunos (privado) e logo (público)
```

Princípios:

- **O banco é a fonte da verdade e a barreira de segurança.** Toda leitura usa o cliente com a sessão do usuário,
  então as políticas RLS valem mesmo que a interface falhe. A matriz `src/lib/permissions.ts` só controla navegação.
- **Regras críticas no banco, em transação:** baixa de mensalidade e lançamento no caixa ao registrar pagamento,
  estorno, geração de mensalidades por competência, renegociação, ficha de treino completa, anonimização, validação
  de check-in, auditoria.
- **Cálculos explicáveis em funções puras e testadas** (`src/lib/finance`, `src/lib/analytics`): multa/juros,
  projeção de caixa, DRE, ROI/payback/VPL, livro-caixa, retenção, ticket médio, risco de abandono, recomendações.
- **Agregações no SQL** (`fin_monthly`, `fin_totals`, `fin_by_category`, `plan_stats`, `checkins_heatmap`…), com
  `SECURITY INVOKER` para respeitar o RLS e evitar limites de linhas na API.

## Estrutura de pastas

```
src/
  app/(auth)/            login, recuperação de senha
  app/(app)/             área da equipe (dashboard, alunos, planos, mensalidades, frequência, treinos,
                         exercícios, agenda, financeiro/*, investimentos, análises, relatórios, equipe,
                         auditoria, configurações, notificações)
  app/portal/            portal do aluno
  app/api/               relatórios e exportação de dados do titular
  components/ui/         componentes base (padrão shadcn/ui sobre Radix)
  components/{shared,charts,billing,training,layout,brand}/
  lib/                   auth (DAL), action (wrapper de Server Actions), permissões, datas, formatação,
                         finance/, analytics/, reports/, validators/ (Zod), queries/, supabase/
  types/database.ts      tipos gerados a partir das migrations (npm run gen:types)
supabase/
  migrations/            esquema, funções, RLS, storage, agregações, sincronização de metadados do Auth
  seed.sql               academia, planos-base e biblioteca de exercícios (sem dados fictícios)
  tests/                 testes SQL de RLS e regras de negócio
tests/unit, tests/e2e    Vitest e Playwright
```

## Modelo de dados

Todas as tabelas de negócio têm `gym_id` (preenchido automaticamente por `current_gym_id()`), o que deixa o sistema
pronto para mais de uma unidade.

| Tabela | Finalidade |
|---|---|
| `gyms` | Academia: dados cadastrais, regras de cobrança (multa, juros, vencimento), alertas, saldo inicial, retenção, cor/logo |
| `profiles` | Usuário do sistema (1:1 com `auth.users`): papel (`admin`, `gerente`, `recepcionista`, `professor`, `aluno`), ativo |
| `staff` | Funcionários: função, cargo, horários, salário, responsabilidades, vínculo com login |
| `plans` | Planos mensal/trimestral/semestral/anual/personalizado: duração em meses e preço por ciclo |
| `students` | Alunos: dados pessoais, contato, matrícula (código `CB00001`), vencimento, situação, consentimentos LGPD, foto |
| `student_health` | Dados de saúde (sensíveis), com acesso restrito a professores/gestão e ao próprio aluno |
| `memberships` | Matrícula aluno × plano: valor, desconto, vigência, situação, cancelamento (máx. 1 ativa por aluno) |
| `invoices` | Mensalidades/cobranças: competência, vencimento, valor, desconto, multa, juros, situação, renegociação |
| `payments` | Pagamentos com recibo numerado, forma, estorno e campos para gateway futuro |
| `financial_categories` | Categorias de receita/despesa, natureza fixa/variável e grupo do DRE |
| `suppliers` | Fornecedores |
| `transactions` | Livro de lançamentos: contas a pagar/receber, competência × caixa, recorrência, vínculo com pagamento/investimento |
| `budgets` | Orçamento mensal por categoria (previsto × realizado) |
| `investments` | Investimentos e expectativas de retorno/custo |
| `exercises` | Biblioteca de exercícios por grupo muscular e equipamento |
| `workout_plans`, `workout_divisions`, `workout_exercises` | Fichas (A, B, C, D, E ou personalizadas) com séries, repetições, carga, descanso |
| `workout_logs` | Execução registrada (carga, séries, repetições) para gráficos de progressão |
| `checkins` | Frequência por recepção, matrícula ou QR Code |
| `events`, `event_attendees` | Agenda de aulas (com vagas), avaliações e compromissos |
| `notifications` | Alertas internos (equipe) e avisos ao aluno (apenas com consentimento) |
| `audit_logs` | Trilha de auditoria automática de inclusões, alterações e exclusões |
| `report_exports` | Registro das exportações de relatórios |

### Fluxos automáticos no banco

- **Pagamento → mensalidade + caixa:** ao inserir em `payments`, a mensalidade é quitada quando o total é atingido e
  uma receita "Mensalidades" é lançada como liquidada. O estorno cancela o lançamento e reabre a mensalidade.
  Pagamentos não podem ser editados (somente estornados).
- **Geração por competência:** `generate_invoices(mês)` cria as cobranças de matrículas ativas cujo ciclo vence no
  mês (mensal todo mês, trimestral a cada 3…), sem duplicar.
- **Check-in:** bloqueia alunos não ativos e repetição em 30 minutos; só a equipe registra (o QR do aluno é lido
  pela recepção e validado por assinatura HMAC com validade de 90 s).
- **Novos usuários:** perfil criado por gatilho; papel e vínculos (aluno/funcionário) vêm de `app_metadata`,
  aplicados também quando o Auth grava os metadados após a criação. O primeiro usuário vira administrador.

## Decisões e limitações conhecidas

- Componentes no padrão shadcn/ui foram escritos no repositório (o registro online não estava acessível no ambiente
  de desenvolvimento); seguem a mesma API e dependem de `radix-ui`.
- Projeções, recomendações e simulações são **estimativas** baseadas em regras explícitas, sempre identificadas como tal.
- Upload de foto/logo usa Supabase Storage; não foi testado ponta a ponta no ambiente local (sem serviço de Storage).
- Notificações por e-mail/WhatsApp e gateway de pagamento não estão implementados (estrutura preparada).
