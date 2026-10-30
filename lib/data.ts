import "server-only";
// Доступ к данным для API-роутов и серверных страниц. Все запросы — через service_role.
import { db } from "./supabase.server";
import { showTestData } from "./env";
import { buildWhyFits, parseLikedHandles, rankCreators } from "./matching";
import { PUBLIC_CREATOR_COLUMNS, PUBLIC_REQUEST_COLUMNS, toPublicCreator } from "./publicCreator";
import { deadlineValue, type RequestData } from "./validation";
import type { Format } from "./niches";
import type { Creator, MatchRequest, PublicMatch, PublicRequest } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID.test(s);

function toMatchRequest(r: {
  city: string;
  niches: string[];
  age_from: number;
  age_to: number;
  gender: MatchRequest["gender"];
  budget_min: number;
  budget_max: number;
  formats: string[] | null;
  liked_creators?: string | null;
}): MatchRequest {
  return {
    city: r.city,
    niches: r.niches,
    age_from: r.age_from,
    age_to: r.age_to,
    gender: r.gender,
    budget_min: r.budget_min,
    budget_max: r.budget_max,
    formats: (r.formats ?? []) as Format[],
    liked_handles: parseLikedHandles(r.liked_creators),
  };
}

/** Кандидаты из БД: грубый предфильтр, точные правила — в rankCreators. Без contact. */
async function fetchCandidates(req: MatchRequest) {
  let q = db()
    .from("creators")
    .select(`${PUBLIC_CREATOR_COLUMNS},consent,is_test`)
    .eq("active", true)
    .eq("consent", true)
    .eq("verified", true)
    .eq("city", req.city)
    .overlaps("niches", req.niches);
  if (!showTestData()) q = q.eq("is_test", false);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as Omit<Creator, "contact" | "data_source">[];
}

export interface CreatedRequest {
  id: string;
  found: number;
}

/** Сохраняет заявку, подбирает блогеров и пишет matches. */
export async function createRequestWithMatches(input: RequestData): Promise<CreatedRequest> {
  const matchReq = toMatchRequest({ ...input, formats: input.formats });

  const [inserted, candidates] = await Promise.all([
    db()
      .from("requests")
      .insert({
        product: input.product,
        city: input.city,
        niches: input.niches,
        age_from: input.age_from,
        age_to: input.age_to,
        gender: input.gender,
        goal: input.goal,
        budget_min: input.budget_min,
        budget_max: input.budget_max,
        deadline: deadlineValue(input),
        formats: input.formats,
        content_requirements: input.content_requirements || null,
        liked_creators: input.liked_creators || null,
        contact: input.contact,
        consent: input.consent,
        session_id: input.session_id || null,
        utm_source: input.utm_source || null,
        utm_medium: input.utm_medium || null,
        utm_campaign: input.utm_campaign || null,
      })
      .select("id")
      .single(),
    fetchCandidates(matchReq),
  ]);
  if (inserted.error) throw inserted.error;
  const id = inserted.data.id as string;

  const ranked = rankCreators(matchReq, candidates, { showTest: showTestData() });
  if (ranked.length) {
    const { error } = await db()
      .from("matches")
      .insert(ranked.map((r) => ({ request_id: id, creator_id: r.creator.id, rank: r.rank, score: r.score })));
    if (error) throw error;
  }
  return { id, found: ranked.length };
}

const MATCHES_SELECT: string = `rank,score,creators(${PUBLIC_CREATOR_COLUMNS})`;

type MatchRow = { rank: number; score: number; creators: Record<string, unknown> | null };

export interface ResultsPayload {
  request: PublicRequest;
  matches: PublicMatch[];
}

/** Заявка и подборка для страницы результатов. Без contact заявки и блогеров. */
export async function getResults(id: string): Promise<ResultsPayload | null> {
  if (!isUuid(id)) return null;
  const [reqRes, matchesRes] = await Promise.all([
    db().from("requests").select(`${PUBLIC_REQUEST_COLUMNS},liked_creators`).eq("id", id).maybeSingle(),
    db()
      .from("matches")
      .select(MATCHES_SELECT)
      .eq("request_id", id)
      .order("rank", { ascending: true }),
  ]);
  if (reqRes.error) throw reqRes.error;
  if (matchesRes.error) throw matchesRes.error;
  if (!reqRes.data) return null;

  const { liked_creators, ...request } = reqRes.data as unknown as PublicRequest & { liked_creators: string | null };
  const matchReq = toMatchRequest({ ...request, liked_creators });
  const matches: PublicMatch[] = ((matchesRes.data ?? []) as unknown as MatchRow[])
    .filter((m) => m.creators)
    .map((m) => {
      const creator = toPublicCreator(m.creators!);
      return {
        rank: m.rank,
        score: m.score,
        whyFits: buildWhyFits({ ...creator, consent: true, is_test: false }, matchReq),
        creator,
      };
    });
  return { request, matches };
}

export interface TeamRequest {
  id: string;
  product: string;
  contact: string;
  goal: string | null;
  deadline: string | null;
  formats: string[] | null;
  content_requirements: string | null;
  liked_creators: string | null;
}

/** Данные заявки для уведомлений команде (включая контакт бизнеса). */
export async function getRequestForTeam(id: string): Promise<TeamRequest | null> {
  const { data, error } = await db()
    .from("requests")
    .select("id,product,contact,goal,deadline,formats,content_requirements,liked_creators")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as TeamRequest | null;
}

/** Блогер из подборки этой заявки (с contact — только для серверного использования). */
export async function getMatchedCreator(requestId: string, creatorId: string) {
  const { data, error } = await db()
    .from("matches")
    .select("creators(id,handle,contact)")
    .eq("request_id", requestId)
    .eq("creator_id", creatorId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.creators ?? null) as unknown as { id: string; handle: string; contact: string | null } | null;
}

export async function insertContactRequest(requestId: string, creatorId: string, choice: "admatch" | "direct") {
  const { error } = await db().from("contact_requests").insert({ request_id: requestId, creator_id: creatorId, choice });
  if (error) throw error;
}

/** Создаёт manual_request. Возвращает false, если по заявке ручной подбор уже запрошен. */
export async function createManualRequest(requestId: string): Promise<{ created: boolean; found: number }> {
  const [existing, count] = await Promise.all([
    db().from("manual_requests").select("id").eq("request_id", requestId).limit(1),
    db().from("matches").select("id", { count: "exact", head: true }).eq("request_id", requestId),
  ]);
  if (existing.error) throw existing.error;
  if (count.error) throw count.error;
  const found = count.count ?? 0;
  if (existing.data?.length) return { created: false, found };
  const { error } = await db().from("manual_requests").insert({ request_id: requestId, found_count: found });
  if (error) throw error;
  return { created: true, found };
}

export async function insertEvents(
  rows: { session_id: string; request_id: string | null; name: string; props: Record<string, unknown> }[],
) {
  const { error } = await db().from("events").insert(rows);
  if (error) throw error;
}
