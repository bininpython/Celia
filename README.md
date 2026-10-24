# Studio Personal Célia Barbosa — Plataforma de gestão

Sistema web para a gestão completa do **Studio Personal Célia Barbosa**: alunos, matrículas, planos, mensalidades,
pagamentos, fichas de treino, frequência (check-in por QR Code), financeiro empresarial (livro-caixa, fluxo de caixa,
DRE, orçamento), investimentos, inteligência financeira, agenda, relatórios, equipe/permissões e portal do aluno.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript estrito · Tailwind CSS 4 · componentes no padrão shadcn/ui
(Radix) · Supabase (PostgreSQL, Auth, Storage, RLS) · Recharts · React Hook Form + Zod · Vercel.

## Modo visitação (demonstração)

Enquanto o Supabase não estiver configurado (ou com `NEXT_PUBLIC_DEMO_MODE=true`), o sistema roda em **modo visitação**:
nenhuma conexão com banco de dados, dados **fictícios** gerados em memória e **nenhuma alteração é salva**. Na tela de
entrada, escolha um perfil (Administradora, Gerente, Recepção, Professor ou Aluno) para conhecer as funcionalidades.
Os formulários validam normalmente, mas ao salvar exibem o aviso "Modo demonstração". Para usar com dados reais,
configure as variáveis do Supabase (ver [`docs/IMPLANTACAO.md`](docs/IMPLANTACAO.md)) e remova `NEXT_PUBLIC_DEMO_MODE`.

## Começando

```bash
npm install
cp .env.example .env.local     # preencha com as chaves do seu projeto Supabase
npm run dev                    # http://localhost:3000
```

Antes do primeiro acesso, aplique as migrations e o seed no Supabase e crie o primeiro usuário
(ele vira **administrador** automaticamente). Passo a passo em [`docs/IMPLANTACAO.md`](docs/IMPLANTACAO.md).

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/ARQUITETURA.md](docs/ARQUITETURA.md) | Arquitetura, módulos, modelo de dados e decisões técnicas |
| [docs/IMPLANTACAO.md](docs/IMPLANTACAO.md) | Supabase, Vercel, variáveis de ambiente, primeiro acesso, rotinas agendadas |
| [docs/SEGURANCA_LGPD.md](docs/SEGURANCA_LGPD.md) | Perfis e permissões, RLS, auditoria, backups e LGPD |
| [docs/TESTES.md](docs/TESTES.md) | Como executar os testes unitários, de banco e ponta a ponta |
| [docs/IDENTIDADE_VISUAL.md](docs/IDENTIDADE_VISUAL.md) | Cores, tipografia, símbolo vetorial e responsividade |

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` / `build` / `start` | Desenvolvimento, build de produção e servidor |
| `npm run lint` / `typecheck` | ESLint e verificação de tipos |
| `npm test` | Testes unitários (Vitest) da lógica de negócio |
| `npm run test:db` | Aplica migrations em um PostgreSQL descartável e testa RLS e regras de negócio |
| `npm run test:e2e` | Teste ponta a ponta no navegador (Playwright) contra um ambiente em execução |
| `npm run test:demo` | Percorre todas as páginas no modo visitação, com os 5 perfis |
| `npm run gen:types` | Regenera `src/types/database.ts` a partir das migrations |

## Integrações

Não há integrações externas prontas além do Supabase. Pagamentos são **registrados manualmente** (PIX, cartão,
dinheiro, transferência); a tabela `payments` já possui os campos `gateway` e `gateway_reference` para uma integração
futura com gateway de pagamento. Notificações são **internas** (painel da equipe e portal do aluno com consentimento);
envio por e-mail/WhatsApp não está implementado.
