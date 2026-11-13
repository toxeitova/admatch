// Вход блогеров (email + пароль) и админа. Свои подписанные cookie, без Supabase Auth:
// всё хранится в нашей БД, проверка только на сервере.
import "server-only";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const CREATOR_COOKIE = "am_creator";
export const ADMIN_COOKIE = "am_admin";
const CREATOR_TTL = 30 * 24 * 3600;
const ADMIN_TTL = 12 * 3600;

function secret(): string {
  const s = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("SESSION_SECRET или SUPABASE_SERVICE_ROLE_KEY не заданы");
  return s;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 32).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [kind, salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const a = Buffer.from(hash, "base64url");
  const b = scryptSync(password, salt, a.length);
  return a.length === b.length && timingSafeEqual(a, b);
}

function sign(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function unsign<T>(token: string | undefined): T | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString()) as T & { exp: number };
    return data.exp > Date.now() / 1000 ? data : null;
  } catch {
    return null;
  }
}

const cookieOpts = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});

/** Версия пароля в cookie: после смены пароля все старые входы перестают работать. */
export const passwordVersion = (hash: string) =>
  createHmac("sha256", secret()).update(hash).digest("base64url").slice(0, 16);

export async function setCreatorSession(creatorId: string, passwordHash: string) {
  const exp = Math.floor(Date.now() / 1000) + CREATOR_TTL;
  (await cookies()).set(CREATOR_COOKIE, sign({ cid: creatorId, pv: passwordVersion(passwordHash), exp }), cookieOpts(CREATOR_TTL));
}

/** Данные из cookie без проверки по БД (проверку делает getCreatorId в creatorSession.ts). */
export async function readCreatorCookie(): Promise<{ cid: string; pv: string } | null> {
  return unsign<{ cid: string; pv: string }>((await cookies()).get(CREATOR_COOKIE)?.value);
}

export async function clearCreatorSession() {
  (await cookies()).delete(CREATOR_COOKIE);
}

export function adminPasswordOk(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 6) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function setAdminSession() {
  const exp = Math.floor(Date.now() / 1000) + ADMIN_TTL;
  (await cookies()).set(ADMIN_COOKIE, sign({ admin: true, exp }), cookieOpts(ADMIN_TTL));
}

export async function isAdmin(): Promise<boolean> {
  return unsign<{ admin: boolean }>((await cookies()).get(ADMIN_COOKIE)?.value)?.admin === true;
}

export async function clearAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}
