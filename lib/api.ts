import { NextResponse } from "next/server";
import { copy } from "./copy.ru";

export const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export const serverError = (e: unknown, where: string) => {
  console.error(`[api] ${where}:`, e);
  return json({ error: copy.errors.server }, 500);
};

/** Тело запроса как JSON; поддерживает text/plain от navigator.sendBeacon. */
export async function readJson(req: Request, maxChars = 64_000): Promise<unknown> {
  const text = await req.text();
  if (text.length > maxChars) throw new Error("payload too large");
  return text ? JSON.parse(text) : null;
}
