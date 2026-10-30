-- AdMatch MVP: схема, RLS и представления для метрик эксперимента.
-- Все таблицы закрыты RLS без публичных политик: читать и писать может только
-- service_role из серверных API-роутов.


-- ─── creators ──────────────────────────────────────────────────────────────
create table if not exists creators (
  id                  uuid primary key default gen_random_uuid(),
  handle              text not null unique,
  display_name        text,
  avatar_url          text,
  instagram_url       text,
  tiktok_url          text,
  city                text not null default 'Алматы',
  niches              text[] not null,
  followers           int,
  almaty_share_pct    int check (almaty_share_pct between 0 and 100),
  avg_reels_views     int,
  stories_reach       int,
  er_pct              numeric(4,1),
  audience_age_from   int,
  audience_age_to     int,
  audience_gender     text check (audience_gender in ('f','m','mixed')),
  price_reels         int,
  price_stories       int,
  price_post          int,
  price_tiktok        int,
  production_included bool default false,
  past_ad_url         text,
  why_fits_text       text,
  contact             text,
  verified            bool default false,
  data_source         text,
  data_checked_at     date,
  consent             bool default false,
  active              bool default true,
  last_post_at        date,
  is_test             bool default false,
  created_at          timestamptz default now()
);

create index if not exists creators_niches_idx on creators using gin (niches);
create index if not exists creators_city_idx on creators (city) where active and consent and verified;

-- ─── requests ──────────────────────────────────────────────────────────────
create table if not exists requests (
  id                   uuid primary key default gen_random_uuid(),
  product              text not null,
  city                 text not null default 'Алматы',
  niches               text[] not null,
  age_from             int,
  age_to               int,
  gender               text check (gender in ('f','m','all')),
  goal                 text check (goal in ('sales','followers','visits')),
  budget_min           int,
  budget_max           int,
  deadline             text,
  formats              text[] not null default '{}',
  content_requirements text,
  liked_creators       text,
  contact              text,
  consent              bool not null default false,
  session_id           text,
  utm_source           text,
  utm_medium           text,
  utm_campaign         text,
  created_at           timestamptz not null default now()
);

-- ─── matches ───────────────────────────────────────────────────────────────
create table if not exists matches (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references requests(id) on delete cascade,
  creator_id  uuid not null references creators(id) on delete cascade,
  rank        int not null,
  score       int not null,
  created_at  timestamptz not null default now()
);

create index if not exists matches_request_idx on matches (request_id, rank);

-- ─── contact_requests ──────────────────────────────────────────────────────
create table if not exists contact_requests (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references requests(id) on delete cascade,
  creator_id  uuid not null references creators(id) on delete cascade,
  choice      text not null check (choice in ('admatch','direct')),
  status      text not null default 'new'
              check (status in ('new','checking','available','unavailable','intro_sent','deal','no_deal')),
  deal_amount int,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists contact_requests_request_idx on contact_requests (request_id);

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists contact_requests_updated_at on contact_requests;
create trigger contact_requests_updated_at
  before update on contact_requests
  for each row execute function set_updated_at();

-- ─── manual_requests ───────────────────────────────────────────────────────
create table if not exists manual_requests (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references requests(id) on delete cascade,
  found_count int not null default 0,
  created_at  timestamptz not null default now()
);

-- ─── events ────────────────────────────────────────────────────────────────
create table if not exists events (
  id          bigserial primary key,
  session_id  text,
  request_id  uuid,
  name        text not null,
  props       jsonb not null default '{}'::jsonb,
  ts          timestamptz not null default now()
);

create index if not exists events_name_idx on events (name, session_id);

-- ─── RLS: включено, политик нет ────────────────────────────────────────────
alter table creators         enable row level security;
alter table requests         enable row level security;
alter table matches          enable row level security;
alter table contact_requests enable row level security;
alter table manual_requests  enable row level security;
alter table events           enable row level security;

-- ─── Метрики ───────────────────────────────────────────────────────────────

-- E1: заявки, по которым бизнес связался хотя бы с одним блогером в течение 14 дней.
create or replace view v_e1 as
select
  count(*) filter (
    where exists (
      select 1 from contact_requests cr
      where cr.request_id = r.id
        and cr.created_at <= r.created_at + interval '14 days'
    )
  )::int as contacted_requests,
  count(*)::int as total_requests
from requests r;

-- E2: доля выбора «Через AdMatch» среди всех deal_choice.
create or replace view v_e2 as
select
  count(*) filter (where props->>'choice' = 'admatch')::int as admatch_choices,
  count(*)::int as total_choices,
  case when count(*) = 0 then 0
       else round(100.0 * count(*) filter (where props->>'choice' = 'admatch') / count(*), 1)
  end as admatch_share_pct
from events
where name = 'deal_choice';

-- Воронка: уникальные сессии на каждом шаге.
create or replace view v_funnel as
with steps(step_order, step) as (
  values (1, 'wishes_submitted'),
         (2, 'results_viewed'),
         (3, 'card_opened'),
         (4, 'contact_clicked'),
         (5, 'deal_choice')
)
select s.step_order, s.step, count(distinct e.session_id)::int as sessions
from steps s
left join events e on e.name = s.step
group by s.step_order, s.step
order by s.step_order;

-- Медиана времени от первого визита до показа подборки.
create or replace view v_time_to_results as
select
  percentile_cont(0.5) within group (
    order by (props->>'seconds_from_landing')::numeric
  ) as median_seconds_from_landing,
  count(*)::int as samples
from events
where name = 'time_to_results'
  and props ? 'seconds_from_landing';

-- Представления не должны быть видны anon/authenticated через PostgREST.
revoke all on v_e1, v_e2, v_funnel, v_time_to_results from anon, authenticated;
