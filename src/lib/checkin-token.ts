import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Token de check-in assinado (HMAC-SHA256) exibido como QR Code no portal.
 * Formato: base64url(studentId.gymId.expiraEmSegundos).assinatura
 * Validade curta para impedir reutilização de capturas de tela.
 */
export const CHECKIN_TOKEN_TTL_SECONDS = 90;

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");
const unb64 = (s: string) => Buffer.from(s, "base64url").toString("utf8");
const sign = (payload: string, secret: string) => createHmac("sha256", secret).update(payload).digest("base64url");

export function createCheckinToken(studentId: string, gymId: string, secret: string, now = Date.now()) {
  const exp = Math.floor(now / 1000) + CHECKIN_TOKEN_TTL_SECONDS;
  const payload = b64(`${studentId}.${gymId}.${exp}`);
  return { token: `${payload}.${sign(payload, secret)}`, expiresAt: exp * 1000 };
}

export type TokenCheck =
  | { valid: true; studentId: string; gymId: string }
  | { valid: false; reason: "formato" | "assinatura" | "expirado" };

export function verifyCheckinToken(token: string, secret: string, now = Date.now()): TokenCheck {
  const parts = token.trim().split(".");
  if (parts.length !== 2) return { valid: false, reason: "formato" };
  const [payload, sig] = parts as [string, string];
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { valid: false, reason: "assinatura" };
  const fields = unb64(payload).split(".");
  if (fields.length !== 3) return { valid: false, reason: "formato" };
  const [studentId, gymId, exp] = fields as [string, string, string];
  if (Number(exp) * 1000 < now) return { valid: false, reason: "expirado" };
  return { valid: true, studentId, gymId };
}
