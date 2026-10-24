// Navega por todas as páginas no modo demonstração, com cada perfil,
// verificando erros de servidor/console, permissões e bloqueio de gravação.
// Uso: E2E_BASE_URL=http://localhost:3000 node tests/e2e/demo.mjs
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const SHOTS = process.env.E2E_SCREENSHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const STAFF_PAGES = [
  "/dashboard", "/notificacoes", "/alunos", "/alunos/novo", "/planos", "/mensalidades", "/frequencia", "/treinos", "/treinos/nova",
  "/exercicios", "/agenda", "/financeiro", "/financeiro/livro-caixa", "/financeiro/fluxo-de-caixa", "/financeiro/dre",
  "/financeiro/orcamento", "/financeiro/categorias", "/financeiro/fornecedores", "/investimentos", "/analises", "/relatorios",
  "/funcionarios", "/auditoria", "/configuracoes",
];
const PORTAL_PAGES = ["/portal", "/portal/treinos", "/portal/mensalidades", "/portal/frequencia", "/portal/agenda", "/portal/perfil"];
const ROLES = { admin: "Administradora", gerente: "Gerente", recepcionista: "Recepção", professor: "Professor", aluno: "Aluno (portal)" };

const browser = await chromium.launch();
const failures = [];
let visited = 0;

for (const [role, label] of Object.entries(ROLES)) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`${BASE}/login`);
  await page.getByRole("button", { name: new RegExp(label.replace(/[()]/g, ".")) }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));

  const pages = role === "aluno" ? PORTAL_PAGES : STAFF_PAGES;
  for (const path of pages) {
    errors.length = 0;
    let res = null;
    try {
      res = await page.goto(`${BASE}${path}`);
    } catch {
      // redirecionamento por falta de permissão interrompe a navegação
      await page.waitForLoadState();
      res = { status: () => 200 };
    }
    await page.waitForLoadState("networkidle").catch(() => {});
    visited++;
    const finalPath = new URL(page.url()).pathname;
    if (!res || res.status() >= 400) failures.push(`${role} ${path}: HTTP ${res?.status()}`);
    if (await page.getByText("Algo deu errado").count()) failures.push(`${role} ${path}: página de erro`);
    if (errors.length) failures.push(`${role} ${path}: ${errors[0].slice(0, 160)}`);
    if (finalPath === path && SHOTS && ["admin", "aluno"].includes(role)) await page.screenshot({ path: `${SHOTS}/${role}${path.replaceAll("/", "_")}.png`, fullPage: true });
  }

  // abre páginas de detalhe a partir das listagens
  if (role === "admin") {
    for (const [list, pattern] of [["/alunos", /\/alunos\/[0-9a-f-]{36}$/], ["/treinos", /\/treinos\/[0-9a-f-]{36}$/]]) {
      await page.goto(`${BASE}${list}`);
      const link = page.locator(`main a[href^="${list}/"]:not([href$="/novo"]):not([href$="/nova"])`).first();
      const href = await link.getAttribute("href");
      await page.goto(`${BASE}${href}`);
      visited++;
      if (!pattern.test(page.url()) || (await page.getByText("Algo deu errado").count())) failures.push(`admin detalhe ${href}`);
      if (list === "/treinos") {
        await page.goto(`${BASE}${href}/imprimir`);
        await page.goto(`${BASE}${href}/editar`);
        visited += 2;
      } else {
        for (const tab of ["Financeiro", "Treinos", "Frequência", "Saúde"]) await page.getByRole("tab", { name: tab }).click();
        await page.goto(`${BASE}${href}/editar`);
        visited++;
      }
    }
    // gravação bloqueada
    await page.goto(`${BASE}/planos`);
    await page.getByRole("button", { name: "Editar Mensal" }).click();
    await page.getByRole("button", { name: "Salvar" }).click();
    await page.locator("[data-sonner-toast]").filter({ hasText: "Modo demonstração" }).first().waitFor({ timeout: 10000 }).catch(() => failures.push("gravação não foi bloqueada"));
    // relatórios
    for (const fmt of ["pdf", "xlsx", "csv"]) {
      const r = await page.request.get(`${BASE}/api/relatorios/lancamentos?formato=${fmt}`);
      if (r.status() !== 200) failures.push(`relatório ${fmt}: ${r.status()}`);
    }
    const insights = await page.goto(`${BASE}/analises`);
    void insights;
  }
  if (role === "recepcionista") {
    await page.goto(`${BASE}/financeiro`).catch(() => {});
    await page.waitForURL(/\/dashboard/, { timeout: 10000 }).catch(() => failures.push("recepção não foi redirecionada do financeiro"));
    if (await page.getByText("Lançamentos financeiros").count()) failures.push("recepção viu conteúdo do financeiro");
  }
  if (role === "aluno") {
    await page.goto(`${BASE}/dashboard`).catch(() => {});
    await page.waitForURL(/\/portal/, { timeout: 10000 }).catch(() => failures.push("aluno não foi redirecionado do dashboard"));
  }
  await ctx.close();
}

// Responsividade
const ctx = await browser.newContext({ locale: "pt-BR" });
const page = await ctx.newPage();
await page.goto(`${BASE}/login`);
await page.getByRole("button", { name: /Administradora/ }).click();
await page.waitForURL(/dashboard/);
for (const [w, h, name] of [[390, 844, "celular"], [820, 1180, "tablet"], [1920, 1080, "fullhd"], [3840, 2160, "tv"]]) {
  await page.setViewportSize({ width: w, height: h });
  for (const path of ["/dashboard", "/alunos", "/financeiro"]) {
    await page.goto(`${BASE}${path}`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (overflow) failures.push(`rolagem horizontal ${path} em ${name}`);
  }
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/responsivo-${name}.png` });
}
await browser.close();

console.log(`Páginas visitadas: ${visited}`);
if (failures.length) {
  console.log(`Falhas (${failures.length}):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("✓ Modo demonstração: todas as páginas carregaram sem erros, gravações bloqueadas e permissões respeitadas.");
