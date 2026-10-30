// zod-схемы: общие для формы на клиенте и API-роутов.
import { z } from "zod";
import { copy } from "./copy.ru";
import { isValidContact } from "./contact";
import { CITIES, DEADLINES, EVENT_NAMES, FORMATS, GENDERS, GOALS, NICHES } from "./niches";

const E = copy.errors;
const msg = (message: string) => ({ errorMap: () => ({ message }) });

const age = z
  .number({ required_error: E.required, invalid_type_error: E.required })
  .int(E.age)
  .min(14, E.age)
  .max(65, E.age);

const amount = z
  .number({ required_error: E.required, invalid_type_error: E.required })
  .int(E.required)
  .min(0, E.required)
  .max(100_000_000, E.required);

const optionalText = (max: number) => z.string().trim().max(max, E.tooLong).optional().default("");
const utm = z.string().trim().max(200).optional().nullable();

export const requestSchema = z
  .object({
    product: z.string({ required_error: E.required }).trim().min(1, E.required).max(200, E.tooLong),
    city: z.enum(CITIES, msg(E.required)),
    niches: z.array(z.enum(NICHES, msg(E.niches)), msg(E.niches)).min(1, E.niches).max(3, E.niches),
    age_from: age,
    age_to: age,
    gender: z.enum(GENDERS, msg(E.required)),
    goal: z.enum(GOALS, msg(E.required)),
    budget_min: amount,
    budget_max: amount,
    deadline_type: z.enum(DEADLINES, msg(E.required)),
    deadline_date: z.string().optional().nullable(),
    formats: z.array(z.enum(FORMATS)).max(FORMATS.length).optional().default([]),
    content_requirements: optionalText(1000),
    liked_creators: optionalText(1000),
    contact: z
      .string({ required_error: E.required })
      .trim()
      .min(1, E.required)
      .max(100, E.contact)
      .refine(isValidContact, E.contact),
    consent: z.literal(true, msg(E.consent)),
    website: z.string().optional(),
    session_id: z.string().max(100).optional().nullable(),
    utm_source: utm,
    utm_medium: utm,
    utm_campaign: utm,
  })
  .superRefine((v, ctx) => {
    if (v.age_from > v.age_to) ctx.addIssue({ code: "custom", path: ["age_to"], message: E.age });
    if (v.budget_max <= v.budget_min) ctx.addIssue({ code: "custom", path: ["budget_max"], message: E.budget });
    if (v.deadline_type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(v.deadline_date ?? "")) {
      ctx.addIssue({ code: "custom", path: ["deadline_date"], message: E.required });
    }
  });

export type RequestInput = z.input<typeof requestSchema>;
export type RequestData = z.output<typeof requestSchema>;

/** deadline в БД: week | two_weeks | month | YYYY-MM-DD. */
export function deadlineValue(d: Pick<RequestData, "deadline_type" | "deadline_date">): string {
  return d.deadline_type === "date" ? d.deadline_date! : d.deadline_type;
}

/** Ошибки zod → { поле: первое сообщение }. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

export const contactSchema = z.object({
  requestId: z.string().uuid(),
  creatorId: z.string().uuid(),
  choice: z.enum(["admatch", "direct"]),
});

export const manualSchema = z.object({ requestId: z.string().uuid() });

// ─── события аналитики ─────────────────────────────────────────────────────
const nonNeg = z.number().finite().min(0);
const creatorRank = z.object({ creator_id: z.string().uuid(), rank: z.number().int().min(1) }).strict();

export const eventPropsSchemas = {
  wishes_submitted: z
    .object({
      niches: z.array(z.string().max(50)).max(3),
      budget_min: nonNeg,
      budget_max: nonNeg,
      form_duration_sec: nonNeg,
    })
    .strict(),
  results_viewed: z.object({ matches_count: z.number().int().min(0) }).strict(),
  card_opened: creatorRank,
  contact_clicked: creatorRank,
  deal_choice: z
    .object({
      creator_id: z.string().uuid(),
      choice: z.enum(["admatch", "direct"]),
      order: z.enum(["admatch_first", "direct_first"]),
    })
    .strict(),
  time_to_results: z.object({ seconds_from_landing: nonNeg }).strict(),
} satisfies Record<(typeof EVENT_NAMES)[number], z.ZodTypeAny>;

export const eventSchema = z.object({
  sessionId: z.string().min(1).max(100),
  requestId: z.string().uuid().optional().nullable(),
  name: z.enum(EVENT_NAMES),
  props: z.record(z.unknown()).default({}),
});

export const eventsBatchSchema = z.array(z.unknown()).min(1).max(50);
