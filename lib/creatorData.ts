// Данные кабинета блогера и админки. Только сервер, service_role.
import "server-only";
import { todayIsoAlmaty } from "./availability";
import { legacyPrices, PRICE_KEYS, type PriceKey } from "./creatorValidation";
import { db } from "./supabase.server";

export const STATS_MAX_AGE_DAYS = 30;

export interface CreatorProfile {
  id: string;
  handle: string;
  display_name: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  niches: string[];
  contact: string | null;
  status: string;
  verified: boolean | null;
  followers: number | null;
  almaty_share_pct: number | null;
  avg_reels_views: number | null;
  stories_reach: number | null;
  er_pct: number | null;
  audience_age_from: number | null;
  audience_age_to: number | null;
  audience_gender: string | null;
  data_checked_at: string | null;
  production_included: boolean | null;
  price_reels_15: number | null;
  price_reels_60: number | null;
  price_post_photo: number | null;
  price_post_carousel: number | null;
  price_story_one: number | null;
  price_story_series: number | null;
}

const PROFILE_COLUMNS =
  "id,handle,display_name,instagram_url,tiktok_url,niches,contact,status,verified,followers,almaty_share_pct," +
  "avg_reels_views,stories_reach,er_pct,audience_age_from,audience_age_to,audience_gender,data_checked_at," +
  `production_included,${PRICE_KEYS.join(",")}`;

export interface Submission {
  id: string;
  creator_id: string;
  followers: number;
  almaty_share_pct: number;
  avg_reels_views: number | null;
  stories_reach: number | null;
  er_pct: number | null;
  audience_age_from: number | null;
  audience_age_to: number | null;
  audience_gender: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export async function findAccountByEmail(email: string) {
  const { data, error } = await db().from("creator_accounts").select("id,creator_id,password_hash").eq("email", email).maybeSingle();
  if (error) throw error;
  return data as { id: string; creator_id: string; password_hash: string } | null;
}

export async function handleTaken(handle: string): Promise<boolean> {
  const { data, error } = await db().from("creators").select("id").eq("handle", handle).maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function createCreatorAccount(input: {
  email: string;
  passwordHash: string;
  handle: string;
  display_name: string;
  niches: string[];
  contact: string;
  tiktok_url: string;
}): Promise<string> {
  const { data, error } = await db()
    .from("creators")
    .insert({
      handle: input.handle,
      display_name: input.display_name,
      instagram_url: `https://instagram.com/${input.handle}`,
      tiktok_url: input.tiktok_url || null,
      city: "Алматы",
      niches: input.niches,
      contact: input.contact,
      verified: false,
      consent: true,
      active: true,
      is_test: false,
      status: "draft",
      data_source: "creator_cabinet",
    })
    .select("id")
    .single();
  if (error) throw error;
  const creatorId = (data as { id: string }).id;
  const acc = await db()
    .from("creator_accounts")
    .insert({ creator_id: creatorId, email: input.email, password_hash: input.passwordHash });
  if (acc.error) {
    await db().from("creators").delete().eq("id", creatorId);
    throw acc.error;
  }
  return creatorId;
}

export async function touchLogin(creatorId: string) {
  await db().from("creator_accounts").update({ last_login_at: new Date().toISOString() }).eq("creator_id", creatorId);
}

export async function getProfile(creatorId: string): Promise<CreatorProfile | null> {
  const { data, error } = await db().from("creators").select(PROFILE_COLUMNS).eq("id", creatorId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const p = data as unknown as CreatorProfile;
  if (p.er_pct != null) p.er_pct = Number(p.er_pct);
  return p;
}

export async function updateProfile(creatorId: string, p: { display_name: string; niches: string[]; contact: string; tiktok_url: string }) {
  const { error } = await db()
    .from("creators")
    .update({ ...p, tiktok_url: p.tiktok_url || null, updated_at: new Date().toISOString() })
    .eq("id", creatorId);
  if (error) throw error;
}

export async function updatePrices(creatorId: string, p: Record<PriceKey, number | null> & { production_included: boolean }) {
  const { error } = await db()
    .from("creators")
    .update({ ...p, ...legacyPrices(p), updated_at: new Date().toISOString() })
    .eq("id", creatorId);
  if (error) throw error;
}

export async function getAvailability(creatorId: string, fromDay = todayIsoAlmaty()): Promise<string[]> {
  const { data, error } = await db()
    .from("creator_availability")
    .select("day")
    .eq("creator_id", creatorId)
    .gte("day", fromDay)
    .order("day");
  if (error) throw error;
  return ((data ?? []) as { day: string }[]).map((r) => r.day);
}

/** Свободные даты сразу для нескольких блогеров (для подборки). */
export async function getAvailabilityFor(creatorIds: string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (!creatorIds.length) return out;
  const { data, error } = await db()
    .from("creator_availability")
    .select("creator_id,day")
    .in("creator_id", creatorIds)
    .gte("day", todayIsoAlmaty())
    .order("day");
  if (error) throw error;
  for (const r of (data ?? []) as { creator_id: string; day: string }[]) {
    out.set(r.creator_id, [...(out.get(r.creator_id) ?? []), r.day]);
  }
  return out;
}

/** Заменяет будущие свободные даты. Возвращает [было, стало]. */
export async function setAvailability(creatorId: string, days: string[]): Promise<[string[], string[]]> {
  const today = todayIsoAlmaty();
  const before = await getAvailability(creatorId, today);
  const next = [...new Set(days.filter((d) => d >= today))].sort();
  const del = await db().from("creator_availability").delete().eq("creator_id", creatorId).gte("day", today);
  if (del.error) throw del.error;
  if (next.length) {
    const ins = await db().from("creator_availability").insert(next.map((day) => ({ creator_id: creatorId, day })));
    if (ins.error) throw ins.error;
  }
  return [before, next];
}

export async function createSubmission(
  creatorId: string,
  s: Omit<Submission, "id" | "creator_id" | "status" | "admin_note" | "created_at" | "reviewed_at">,
  screenshots: string[],
): Promise<string> {
  const { data, error } = await db()
    .from("creator_stats_submissions")
    .insert({ creator_id: creatorId, ...s })
    .select("id")
    .single();
  if (error) throw error;
  const id = (data as { id: string }).id;
  const rows = screenshots.map((dataUrl) => {
    const [head, b64] = dataUrl.split(",");
    return { submission_id: id, mime: head.slice(5, head.indexOf(";")), data: b64 };
  });
  const ins = await db().from("creator_screenshots").insert(rows);
  if (ins.error) throw ins.error;
  // ещё не подтверждённый блогер ждёт проверки; подтверждённый остаётся в подборке со старыми цифрами
  const prof = await getProfile(creatorId);
  if (prof && !prof.verified) {
    await db().from("creators").update({ status: "pending" }).eq("id", creatorId);
  }
  return id;
}

export async function latestSubmission(creatorId: string): Promise<Submission | null> {
  const { data, error } = await db()
    .from("creator_stats_submissions")
    .select("*")
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Submission | null) ?? null;
}

type Filter = [column: string, op: "eq" | "gte", value: string];

async function countRows(table: string, filters: Filter[]): Promise<number> {
  let q = db().from(table).select("*", { count: "exact", head: true });
  for (const [col, op, val] of filters) q = op === "eq" ? q.eq(col, val) : q.gte(col, val);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

/** Цифры для блогера «как в hh»: сколько раз показали, открыли, хотели связаться. */
export async function creatorActivity(creatorId: string) {
  const monthStart = todayIsoAlmaty().slice(0, 8) + "01";
  const card: Filter[] = [["name", "eq", "card_opened"], ["props->>creator_id", "eq", creatorId]];
  const [shown, shownMonth, opened, openedMonth, contacts, contactsMonth] = await Promise.all([
    countRows("matches", [["creator_id", "eq", creatorId]]),
    countRows("matches", [["creator_id", "eq", creatorId], ["created_at", "gte", monthStart]]),
    countRows("events", card),
    countRows("events", [...card, ["ts", "gte", monthStart]]),
    countRows("contact_requests", [["creator_id", "eq", creatorId]]),
    countRows("contact_requests", [["creator_id", "eq", creatorId], ["created_at", "gte", monthStart]]),
  ]);
  return { shown, shownMonth, opened, openedMonth, contacts, contactsMonth };
}

export function statsAgeDays(dataCheckedAt: string | null, today = todayIsoAlmaty()): number | null {
  if (!dataCheckedAt) return null;
  return Math.floor((Date.parse(today) - Date.parse(dataCheckedAt.slice(0, 10))) / 86_400_000);
}

// ─── Админ ─────────────────────────────────────────────────────────────

export interface PendingItem extends Submission {
  creator: CreatorProfile;
  screenshotIds: string[];
}

export async function pendingSubmissions(): Promise<PendingItem[]> {
  const { data, error } = await db()
    .from("creator_stats_submissions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) throw error;
  const subs = (data ?? []) as Submission[];
  const out: PendingItem[] = [];
  for (const s of subs) {
    const [creator, shots] = await Promise.all([
      getProfile(s.creator_id),
      db().from("creator_screenshots").select("id").eq("submission_id", s.id),
    ]);
    if (!creator) continue;
    out.push({ ...s, creator, screenshotIds: ((shots.data ?? []) as { id: string }[]).map((r) => r.id) });
  }
  return out;
}

export async function getScreenshot(id: string): Promise<{ mime: string; data: string } | null> {
  const { data, error } = await db().from("creator_screenshots").select("mime,data").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as { mime: string; data: string } | null) ?? null;
}

export async function reviewSubmission(id: string, decision: "approve" | "reject", note: string) {
  const { data, error } = await db().from("creator_stats_submissions").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  const s = data as Submission | null;
  if (!s || s.status !== "pending") return null;
  const now = new Date().toISOString();
  const upd = await db()
    .from("creator_stats_submissions")
    .update({ status: decision === "approve" ? "approved" : "rejected", admin_note: note || null, reviewed_at: now })
    .eq("id", id);
  if (upd.error) throw upd.error;
  const prof = await getProfile(s.creator_id);
  if (decision === "approve") {
    const c = await db()
      .from("creators")
      .update({
        followers: s.followers,
        almaty_share_pct: s.almaty_share_pct,
        avg_reels_views: s.avg_reels_views,
        stories_reach: s.stories_reach,
        er_pct: s.er_pct,
        audience_age_from: s.audience_age_from,
        audience_age_to: s.audience_age_to,
        audience_gender: s.audience_gender,
        verified: true,
        status: "approved",
        data_checked_at: todayIsoAlmaty(),
        data_source: "creator_cabinet_screenshots",
        updated_at: now,
      })
      .eq("id", s.creator_id);
    if (c.error) throw c.error;
  } else if (prof && !prof.verified) {
    await db().from("creators").update({ status: "rejected" }).eq("id", s.creator_id);
  }
  return { submission: s, creator: prof };
}

/** Подтверждённые блогеры-кабинетчики с устаревшей аналитикой. */
export async function staleCreators(): Promise<CreatorProfile[]> {
  const border = new Date(Date.parse(todayIsoAlmaty()) - STATS_MAX_AGE_DAYS * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await db()
    .from("creators")
    .select(PROFILE_COLUMNS)
    .eq("data_source", "creator_cabinet_screenshots")
    .lt("data_checked_at", border)
    .order("data_checked_at");
  if (error) throw error;
  return (data ?? []) as unknown as CreatorProfile[];
}

export async function cabinetCreators(): Promise<CreatorProfile[]> {
  const { data, error } = await db()
    .from("creators")
    .select(PROFILE_COLUMNS)
    .in("data_source", ["creator_cabinet", "creator_cabinet_screenshots"])
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as CreatorProfile[];
}
