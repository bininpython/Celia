import { describe, expect, it } from "vitest";
import { createCheckinToken, verifyCheckinToken } from "@/lib/checkin-token";
import { canAccess, homeFor, MODULE_ROLES } from "@/lib/permissions";

const SECRET = "segredo-de-teste-com-mais-de-20-caracteres";
const STUDENT = "20000000-0000-4000-8000-00000000000a";
const GYM = "00000000-0000-4000-8000-000000000001";

describe("token de check-in", () => {
  it("valida token assinado dentro do prazo", () => {
    const now = Date.now();
    const { token } = createCheckinToken(STUDENT, GYM, SECRET, now);
    expect(verifyCheckinToken(token, SECRET, now + 10_000)).toEqual({ valid: true, studentId: STUDENT, gymId: GYM });
  });
  it("rejeita token expirado, adulterado ou com outro segredo", () => {
    const now = Date.now();
    const { token } = createCheckinToken(STUDENT, GYM, SECRET, now);
    expect(verifyCheckinToken(token, SECRET, now + 120_000)).toEqual({ valid: false, reason: "expirado" });
    expect(verifyCheckinToken(token, "outro-segredo-qualquer-123456", now)).toEqual({ valid: false, reason: "assinatura" });
    const [payload, sig] = token.split(".");
    const forged = Buffer.from(`${"30000000-0000-4000-8000-00000000000b"}.${GYM}.${Math.floor(now / 1000) + 60}`).toString("base64url");
    expect(verifyCheckinToken(`${forged}.${sig}`, SECRET, now).valid).toBe(false);
    expect(verifyCheckinToken(payload!, SECRET, now)).toEqual({ valid: false, reason: "formato" });
  });
});

describe("permissões", () => {
  it("aluno só acessa o portal", () => {
    const allowed = (Object.keys(MODULE_ROLES) as (keyof typeof MODULE_ROLES)[]).filter((m) => canAccess("aluno", m));
    expect(allowed).toEqual(["portal"]);
    expect(homeFor("aluno")).toBe("/portal");
  });
  it("recepção não acessa o financeiro nem dados de saúde", () => {
    expect(canAccess("recepcionista", "financeiro")).toBe(false);
    expect(canAccess("recepcionista", "saude")).toBe(false);
    expect(canAccess("recepcionista", "mensalidades")).toBe(true);
  });
  it("professor acessa treinos mas não mensalidades", () => {
    expect(canAccess("professor", "treinos")).toBe(true);
    expect(canAccess("professor", "mensalidades")).toBe(false);
  });
  it("somente admin acessa configurações", () => {
    expect(canAccess("admin", "configuracoes")).toBe(true);
    expect(canAccess("gerente", "configuracoes")).toBe(false);
    expect(canAccess(null, "dashboard")).toBe(false);
  });
});
