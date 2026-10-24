# Implantação: Supabase + Vercel

## 1. Supabase

1. Crie um projeto em <https://supabase.com> (região São Paulo, `sa-east-1`, recomendada).
2. Aplique as migrations **em ordem** e depois o seed. Opções:
   - **Supabase CLI** (recomendado): `supabase link --project-ref <ref>` e `supabase db push`; em seguida execute
     `supabase/seed.sql` no SQL Editor.
   - **SQL Editor**: cole e execute, nesta ordem, os arquivos de `supabase/migrations/` e por fim `supabase/seed.sql`.
3. **Authentication → Providers → Email:** mantenha e-mail/senha habilitado. Em **Authentication → Sign In / Up**,
   desative *Allow new users to sign up* — as contas são criadas pelo sistema (equipe e alunos).
4. **Authentication → URL Configuration:** defina *Site URL* com o endereço de produção
   (ex.: `https://celia-ten.vercel.app`) e adicione `https://SEU-DOMINIO/auth/callback` em *Redirect URLs*.
5. **Primeiro administrador:** em **Authentication → Users → Add user**, crie o usuário da proprietária com e-mail e
   senha (marque *Auto Confirm User*). Por ser o primeiro usuário, ele recebe o perfil **administrador**.
6. Copie em **Project Settings → API**: `Project URL`, chave `anon`/publishable e chave `service_role` (secreta).

## 2. Vercel

1. Importe o repositório do GitHub na Vercel (framework detectado: Next.js; nenhuma configuração extra de build).
2. **Settings → Git → Production Branch:** `main`. O domínio `*.vercel.app` de produção só funciona depois que houver
   um deploy da branch de produção — se a branch não existir, a Vercel mostra `404 DEPLOYMENT_NOT_FOUND`.
3. **Settings → Environment Variables** (Production e Preview):

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave anon/publishable |
| `SUPABASE_SERVICE_ROLE_KEY` | chave service_role (**nunca** com prefixo `NEXT_PUBLIC_`) |
| `NEXT_PUBLIC_SITE_URL` | URL pública, ex.: `https://celia-ten.vercel.app` |
| `CHECKIN_TOKEN_SECRET` | segredo aleatório longo (`openssl rand -base64 48`) |

4. Faça um novo deploy após cadastrar as variáveis (variáveis `NEXT_PUBLIC_*` entram no build).
   Sem elas, o sistema exibe a página "Configuração pendente".

## 3. Primeiro acesso

1. Entre com o administrador criado no passo 1.5.
2. **Configurações:** dados da academia, multa/juros, saldo inicial de caixa e data.
3. **Planos:** defina os preços (o seed cria os planos com R$ 0,00 e o sistema alerta sobre isso).
4. **Equipe:** cadastre funcionários e crie seus acessos (perfil definido no cadastro).
5. **Alunos:** cadastre, matricule e, se desejar, crie o acesso ao portal.

## 4. Rotinas recomendadas (opcionais)

Mensalidades e alertas podem ser gerados pelos botões "Gerar mensalidades" e "Verificar alertas agora". Para
automatizar, habilite a extensão **pg_cron** no Supabase (Database → Extensions) e agende, por exemplo:

```sql
-- alertas diários às 7h (horário de Brasília = 10h UTC)
select cron.schedule('alertas-diarios', '0 10 * * *',
  $$ select public.generate_notifications('00000000-0000-4000-8000-000000000001') $$);
```

`generate_invoices` usa a permissão do usuário logado; para automatizá-la, crie uma função própria
`SECURITY DEFINER` restrita ao agendador.

## 5. Backups

Os planos pagos do Supabase incluem backups diários (e PITR opcional). No plano gratuito, faça exportações periódicas
(`supabase db dump`) e guarde-as em local seguro. Teste a restauração periodicamente.
