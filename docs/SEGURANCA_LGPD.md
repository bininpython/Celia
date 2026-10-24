# Segurança e LGPD

## Perfis de acesso

| Perfil | Acesso |
|---|---|
| Administrador | Tudo, incluindo configurações, criação de logins, exclusão e anonimização de alunos |
| Gerente | Operação e financeiro completos; não altera configurações nem cria administradores |
| Recepcionista | Alunos (sem saúde), matrículas, mensalidades e pagamentos, frequência, agenda |
| Professor | Alunos (consulta + saúde), fichas e exercícios, frequência, agenda |
| Aluno | Somente o portal, com os próprios dados |

A matriz é aplicada na interface (`src/lib/permissions.ts`) e **garantida no banco** por Row Level Security
(`supabase/migrations/*_rls.sql`). Testes SQL verificam, entre outros: aluno não vê dados de outro aluno, recepção não
vê financeiro nem saúde, professor não altera cadastros, ninguém eleva o próprio papel, gerente não cria administrador.

## Controles técnicos

- Supabase Auth com sessão em cookies `httpOnly` renovada no `proxy.ts`; páginas e ações reconsultam o usuário no servidor.
- Validação com Zod no cliente **e** no servidor em todas as Server Actions.
- `service_role` usada apenas no servidor para criar logins, após checagem de perfil.
- QR Code de check-in assinado (HMAC-SHA256) com validade de 90 s.
- Pagamentos imutáveis (somente estorno), auditoria automática de todas as tabelas sensíveis.
- Fotos de alunos em bucket privado, entregues por URL assinada temporária.

## LGPD

- **Minimização:** cadastro pede só o necessário; CPF mascarado em relatórios.
- **Consentimento:** registro obrigatório no cadastro; consentimento específico para dados de saúde (art. 11);
  avisos no portal apenas com autorização do aluno, revogável a qualquer momento.
- **Dados sensíveis:** tabela separada `student_health`, acesso restrito; a auditoria registra apenas que houve
  alteração, sem o conteúdo.
- **Direitos do titular:** o aluno baixa seus dados em JSON no portal (portabilidade) e atualiza contatos.
  A academia pode corrigir, excluir (sem histórico financeiro) ou **anonimizar** (remove dados pessoais, saúde e
  treinos, preservando registros financeiros exigidos por lei).
- **Retenção:** prazo configurável em Configurações; recomenda-se revisar alunos arquivados periodicamente.

Recomenda-se ainda: política de privacidade publicada, nomeação de encarregado (DPO) e contrato com o operador
(Supabase/Vercel) contemplando transferência internacional, se aplicável.
