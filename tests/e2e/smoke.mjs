// Teste ponta a ponta (Playwright) dos fluxos principais.
// Requer o app rodando com um backend Supabase (ver docs/TESTES.md).
// Uso: E2E_BASE_URL=http://localhost:3000 E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... node tests/e2e/smoke.mjs
import { createRequire } from "node:module";
// Usa o Playwright instalado no ambiente (ou adicione-o como devDependency)
const { chromium } = createRequire(import.meta.url)("playwright");
import { mkdirSync } from "node:fs";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const ADMIN = { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD };
const SHOTS = process.env.E2E_SCREENSHOTS;
const stamp = Date.now().toString().slice(-6);
const STUDENT = `Aluna Teste ${stamp}`;
const STUDENT_EMAIL = `aluna${stamp}@studio.test`;
// CPF válido e único por execução
function makeCpf() {
  const d = Array.from({ length: 9 }, (_, i) => (i < 6 ? Number(stamp[i]) : Math.floor(Math.random() * 10)));
  for (const len of [9, 10]) {
    const s = d.reduce((a, n, i) => a + n * (len + 1 - i), 0);
    const r = (s * 10) % 11;
    d.push(r === 10 ? 0 : r);
  }
  return d.join("");
}
const CPF = makeCpf();
const results = [];
const errors = [];

async function step(name, fn) {
  try {
    await fn();
    results.push(`✓ ${name}`);
  } catch (e) {
    results.push(`✗ ${name}: ${e.message.split("\n")[0]}`);
    throw e;
  }
}
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
const toast = (page, text) => page.locator("[data-sonner-toast]").filter({ hasText: text }).first().waitFor({ timeout: 15000 });

async function login(page, email, password) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
const page = await ctx.newPage();
page.on("console", (m) => m.type() === "error" && errors.push(`[console] ${page.url()} ${m.text()}`));
page.on("pageerror", (e) => errors.push(`[pageerror] ${page.url()} ${e.message}`));
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

try {
  await step("rota protegida redireciona para login", async () => {
    await page.goto(`${BASE}/alunos`);
    await page.waitForURL(/\/login/);
  });

  await step("login inválido mostra erro", async () => {
    await page.goto(`${BASE}/login`);
    await page.getByLabel("E-mail").fill(ADMIN.email);
    await page.getByLabel("Senha").fill("senha-errada");
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.getByText("E-mail ou senha incorretos.").waitFor();
  });

  await step("login do administrador abre o dashboard", async () => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.waitForURL(/\/dashboard/);
    await page.getByRole("heading", { name: /Olá/ }).waitFor();
    await shot(page, "01-dashboard-vazio");
  });

  await step("define preço do plano Mensal", async () => {
    await page.goto(`${BASE}/planos`);
    await page.getByRole("button", { name: "Editar Mensal" }).click();
    await page.getByLabel("Preço do ciclo").fill("150");
    await page.getByRole("button", { name: "Salvar" }).click();
    await toast(page, "Plano atualizado");
    await page.getByRole("cell", { name: "R$ 150,00" }).first().waitFor();
  });

  await step("validação do cadastro de aluno (CPF e LGPD)", async () => {
    await page.goto(`${BASE}/alunos/novo`);
    await page.getByLabel("Nome completo").fill(STUDENT);
    await page.getByLabel("CPF").fill("111.111.111-11");
    await page.getByRole("button", { name: "Cadastrar aluno" }).click();
    await page.getByText("CPF inválido").waitFor();
    await page.getByText("É necessário registrar o consentimento").waitFor();
  });

  let studentUrl = "";
  await step("cadastra aluno", async () => {
    await page.getByLabel("CPF").fill(CPF);
    await page.getByLabel("Telefone / WhatsApp").fill("(11) 98765-4321");
    await page.getByLabel("Data de nascimento").fill("1990-05-20");
    await page.getByText("O titular foi informado").click();
    await page.getByText("O aluno autoriza receber avisos").click();
    await page.getByRole("button", { name: "Cadastrar aluno" }).click();
    await page.waitForURL(/\/alunos\/[0-9a-f-]{36}$/);
    studentUrl = page.url();
    await page.getByRole("heading", { name: STUDENT }).waitFor();
  });

  await step("matricula no plano Mensal com primeira cobrança", async () => {
    await page.getByRole("button", { name: "Nova matrícula" }).click();
    await page.getByLabel("Plano").selectOption({ label: "Mensal · Mensal · R$ 150,00" });
    await page.getByRole("button", { name: "Matricular" }).click();
    await toast(page, "Matrícula registrada");
    await page.getByText("Valor por ciclo").waitFor();
  });

  await step("registra pagamento e emite recibo", async () => {
    await page.getByRole("tab", { name: "Financeiro" }).click();
    await page.getByRole("button", { name: "Receber" }).first().click();
    await page.getByLabel("Forma").selectOption("pix");
    await page.getByRole("button", { name: "Confirmar pagamento" }).click();
    await toast(page, "Pagamento registrado");
    const [receipt] = await Promise.all([ctx.waitForEvent("page"), page.getByRole("button", { name: "Imprimir recibo" }).click()]);
    await receipt.waitForLoadState();
    await receipt.getByText("Recebemos de").waitFor();
    await receipt.getByText("R$ 150,00").first().waitFor();
    await shot(receipt, "02-recibo");
    await receipt.close();
    await page.reload();
    await page.getByRole("tab", { name: "Financeiro" }).click();
    await page.getByText("Pago", { exact: true }).first().waitFor();
  });

  await step("salva dados de saúde com consentimento específico", async () => {
    await page.getByRole("tab", { name: "Saúde" }).click();
    await page.getByLabel("Lesões / cirurgias").fill("Condromalácia patelar leve");
    await page.getByText("O aluno consentiu").click();
    await page.getByRole("button", { name: "Salvar" }).click();
    await toast(page, "Informações de saúde salvas");
  });

  let code = "";
  await step("check-in pela matrícula", async () => {
    code = (await page.getByText(/Matrícula CB\d+/).first().textContent()).match(/CB\d+/)[0];
    await page.goto(`${BASE}/frequencia`);
    await page.getByRole("tab", { name: "Matrícula" }).click();
    await page.getByLabel("Número de matrícula").fill(code);
    await page.getByRole("button", { name: "Registrar" }).click();
    await toast(page, `Check-in registrado: ${STUDENT}`);
  });

  await step("bloqueia check-in duplicado", async () => {
    await page.getByLabel("Número de matrícula").fill(code);
    await page.getByRole("button", { name: "Registrar" }).click();
    await toast(page, "Check-in já registrado");
    await shot(page, "03-frequencia");
  });

  await step("cria ficha de treino A/B", async () => {
    await page.goto(`${BASE}/treinos/nova`);
    await page.locator("#student_id").selectOption({ label: STUDENT });
    await page.getByLabel("Título").fill("Hipertrofia — fase 1");
    await page.locator('[id="divisions.0.items.0.exercise_id"]').selectOption({ label: "Supino reto com barra" });
    await page.locator('[id="divisions.0.items.0.load_kg"]').fill("20");
    await page.getByRole("button", { name: /Adicionar treino B/ }).click();
    await page.locator('[id="divisions.1.items.0.exercise_id"]').selectOption({ label: "Agachamento livre" });
    await page.getByRole("button", { name: "Salvar ficha" }).click();
    await page.waitForURL(/\/treinos\/[0-9a-f-]{36}$/);
    await page.getByText("Supino reto com barra").waitFor();
    await page.getByText("Agachamento livre").waitFor();
  });

  await step("registra execução e carga", async () => {
    await page.getByRole("button", { name: "Registrar execução de Supino reto com barra" }).click();
    await page.getByLabel("Carga utilizada (kg)").fill("22.5");
    await page.getByRole("button", { name: "Salvar" }).click();
    await toast(page, "Execução registrada");
    await shot(page, "04-ficha");
  });

  await step("lança despesa paga e conta a pagar recorrente", async () => {
    await page.goto(`${BASE}/financeiro`);
    await page.getByRole("button", { name: "Novo lançamento" }).click();
    const dlg = page.getByRole("dialog");
    await dlg.getByLabel("Categoria").selectOption({ label: "Aluguel" });
    await dlg.locator("#t_desc").fill("Aluguel do espaço");
    await dlg.locator("#t_amount").fill("2000");
    await dlg.locator("#t_rep").fill("3");
    await dlg.getByRole("button", { name: "Salvar" }).click();
    await toast(page, "3 lançamentos criados");
    await page.getByRole("button", { name: "Liquidar" }).first().click();
    await page.getByRole("button", { name: "Confirmar" }).click();
    await toast(page, "Lançamento liquidado");
    await shot(page, "05-financeiro");
  });

  await step("dashboard reflete os dados reais", async () => {
    await page.goto(`${BASE}/dashboard`);
    await page.getByText("Mensalidades recebidas").waitFor();
    // Os valores acumulam entre execuções; verifica que os cartões refletem lançamentos (≠ zero)
    for (const [label, min] of [["Mensalidades recebidas", 150], ["Despesas (caixa)", 2000]]) {
      const text = await page.locator("[data-slot=card]").filter({ hasText: label }).locator(".text-2xl").textContent();
      const value = Number(text.replace(/[^\d,]/g, "").replace(",", "."));
      if (!(value >= min)) throw new Error(`${label}: ${text}`);
    }
    await shot(page, "06-dashboard");
  });

  await step("DRE, livro-caixa, fluxo de caixa, orçamento e análises carregam", async () => {
    for (const path of ["/financeiro/dre", "/financeiro/livro-caixa", "/financeiro/fluxo-de-caixa?horizonte=12", "/financeiro/orcamento", "/analises", "/investimentos", "/agenda", "/auditoria", "/funcionarios", "/configuracoes", "/notificacoes", "/relatorios", "/exercicios", "/mensalidades", "/alunos"]) {
      const res = await page.goto(`${BASE}${path}`);
      if (!res || res.status() >= 400) throw new Error(`${path} -> ${res?.status()}`);
      await page.locator("h1").first().waitFor();
      if (await page.getByText("Algo deu errado").count()) throw new Error(`${path} exibiu erro`);
    }
    await page.goto(`${BASE}/financeiro/dre`);
    await page.getByRole("row", { name: /Resultado líquido do período/ }).waitFor();
    await shot(page, "07-dre");
  });

  await step("simulador de investimentos calcula payback", async () => {
    await page.goto(`${BASE}/investimentos`);
    await page.getByLabel("Valor do investimento").fill("12000");
    await page.getByLabel("Novos alunos/mês atribuídos").fill("0");
    await page.getByLabel("Outras receitas/economia por mês").fill("1000");
    await page.getByLabel("Custo mensal adicional").fill("0");
    await page.getByText("12 meses").first().waitFor();
    await shot(page, "08-investimentos");
  });

  await step("exporta relatórios em PDF, Excel e CSV", async () => {
    for (const [fmt, type] of [["pdf", "application/pdf"], ["xlsx", "spreadsheetml"], ["csv", "text/csv"]]) {
      const r = await page.request.get(`${BASE}/api/relatorios/lancamentos?formato=${fmt}`);
      if (r.status() !== 200 || !r.headers()["content-type"].includes(type)) throw new Error(`${fmt}: ${r.status()} ${r.headers()["content-type"]}`);
      const body = await r.body();
      if (body.length < 100) throw new Error(`${fmt} vazio`);
    }
    const inad = await page.request.get(`${BASE}/api/relatorios/inadimplencia?formato=csv`);
    if (inad.status() !== 200) throw new Error("inadimplência falhou");
  });

  await step("gera mensalidades da competência sem duplicar", async () => {
    await page.goto(`${BASE}/mensalidades`);
    await page.getByRole("button", { name: "Gerar mensalidades" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Gerar" }).click();
    await toast(page, "Nenhuma nova mensalidade");
  });

  await step("cria acesso do aluno ao portal", async () => {
    await page.goto(studentUrl);
    await page.getByRole("button", { name: "Criar acesso ao portal" }).click();
    await page.getByLabel("E-mail de login").fill(STUDENT_EMAIL);
    await page.getByLabel("Senha provisória").fill("Aluno@1234");
    await page.getByRole("button", { name: "Criar acesso" }).click();
    await toast(page, "Acesso criado");
  });

  await step("aluno entra no portal e vê apenas os próprios dados", async () => {
    await ctx.clearCookies();
    await login(page, STUDENT_EMAIL, "Aluno@1234");
    await page.waitForURL(/\/portal$/);
    await page.getByAltText("QR Code de check-in").waitFor({ timeout: 15000 });
    await shot(page, "09-portal");
    await page.goto(`${BASE}/portal/treinos`);
    await page.getByText("1. Supino reto com barra").waitFor();
    await page.getByText("últ.: 22,5 kg").waitFor();
    await page.goto(`${BASE}/portal/mensalidades`);
    await page.getByRole("link", { name: /Recibo nº/ }).first().click();
    await page.getByText("Recebemos de").waitFor();
  });

  await step("aluno não acessa áreas da equipe nem relatórios", async () => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForURL(/\/portal/);
    await page.goto(`${BASE}/alunos`);
    await page.waitForURL(/\/portal/);
    const r = await page.request.get(`${BASE}/api/relatorios/lancamentos?formato=csv`);
    if (r.status() !== 403) throw new Error(`relatório deveria ser 403, foi ${r.status()}`);
  });

  await step("layout responsivo: celular, tablet, desktop e TV", async () => {
    for (const [w, h, name] of [[390, 844, "celular"], [820, 1180, "tablet"], [1920, 1080, "fullhd"], [3840, 2160, "tv-4k"]]) {
      await page.setViewportSize({ width: w, height: h });
      for (const path of ["/portal", "/portal/treinos", "/portal/mensalidades"]) {
        await page.goto(`${BASE}${path}`);
        await page.locator("h1").first().waitFor();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        if (overflow) throw new Error(`rolagem horizontal em ${path} (${name} ${w}px)`);
      }
      await shot(page, `11-portal-${name}`);
    }
  });

  await step("layout responsivo no celular (QR)", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/portal`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (overflow) throw new Error("rolagem horizontal no portal (390px)");
    await shot(page, "10-portal-mobile");
  });
} catch {
  // falha registrada em results
} finally {
  await browser.close();
  console.log(results.join("\n"));
  const relevant = errors.filter((e) => !e.includes("favicon"));
  if (relevant.length) console.log(`\nErros de console/página:\n${relevant.slice(0, 20).join("\n")}`);
  process.exit(results.some((r) => r.startsWith("✗")) || relevant.length ? 1 : 0);
}
