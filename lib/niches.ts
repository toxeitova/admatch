// Справочник ниш — один и тот же в форме, подборе и в БД (creators.niches / requests.niches).
export const NICHES = [
  "Еда и рестораны",
  "Красота и уход",
  "Мода и одежда",
  "Лайфстайл",
  "Мамы и дети",
  "Спорт и здоровье",
  "Путешествия",
  "Техника и гаджеты",
  "Образование",
  "Юмор и развлечения",
  "Дом и интерьер",
  "Авто",
] as const;

export type Niche = (typeof NICHES)[number];

export const FORMATS = ["reels", "stories", "post", "tiktok"] as const;
export type Format = (typeof FORMATS)[number];

export const CITIES = ["Алматы"] as const;

export const GENDERS = ["f", "m", "all"] as const;
export const GOALS = ["sales", "followers", "visits"] as const;
export const DEADLINES = ["week", "two_weeks", "month", "date"] as const;

export const EVENT_NAMES = [
  "wishes_submitted",
  "results_viewed",
  "card_opened",
  "contact_clicked",
  "deal_choice",
  "time_to_results",
] as const;
export type EventName = (typeof EVENT_NAMES)[number];
