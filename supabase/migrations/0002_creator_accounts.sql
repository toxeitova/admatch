-- AdMatch 0002: кабинет блогера, цены по форматам, аналитика на проверку, скриншоты, свободные даты.
-- Запустить один раз в Supabase → SQL Editor → Run. Повторный запуск безопасен.

-- 1. Новые поля блогера
alter table creators add column if not exists price_reels_15      int check (price_reels_15 >= 0);
alter table creators add column if not exists price_reels_60      int check (price_reels_60 >= 0);
alter table creators add column if not exists price_post_photo    int check (price_post_photo >= 0);
alter table creators add column if not exists price_post_carousel int check (price_post_carousel >= 0);
alter table creators add column if not exists price_story_one     int check (price_story_one >= 0);
alter table creators add column if not exists price_story_series  int check (price_story_series >= 0);
-- draft: заполняет кабинет · pending: аналитика на проверке · approved: показывается в подборке · rejected
alter table creators add column if not exists status text not null default 'approved'
  check (status in ('draft', 'pending', 'approved', 'rejected'));
alter table creators add column if not exists updated_at timestamptz not null default now();

-- 2. Аккаунты блогеров (email + пароль; хеш scrypt считает сервер)
create table if not exists creator_accounts (
  id             uuid primary key default gen_random_uuid(),
  creator_id     uuid not null unique references creators(id) on delete cascade,
  email          text not null unique,
  password_hash  text not null,
  created_at     timestamptz not null default now(),
  last_login_at  timestamptz
);

-- 3. Аналитика, которую блогер отправляет на проверку админу
create table if not exists creator_stats_submissions (
  id                 uuid primary key default gen_random_uuid(),
  creator_id         uuid not null references creators(id) on delete cascade,
  followers          int not null check (followers >= 0),
  almaty_share_pct   int not null check (almaty_share_pct between 0 and 100),
  avg_reels_views    int check (avg_reels_views >= 0),
  stories_reach      int check (stories_reach >= 0),
  er_pct             numeric(4,1) check (er_pct >= 0),
  audience_age_from  int check (audience_age_from between 0 and 80),
  audience_age_to    int check (audience_age_to between 0 and 80),
  audience_gender    text check (audience_gender in ('f', 'm', 'mixed')),
  status             text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note         text,
  created_at         timestamptz not null default now(),
  reviewed_at        timestamptz
);
create index if not exists creator_stats_submissions_creator_idx on creator_stats_submissions (creator_id, created_at desc);
create index if not exists creator_stats_submissions_status_idx on creator_stats_submissions (status, created_at);

-- 4. Скриншоты статистики (сжатые на телефоне JPEG, base64)
create table if not exists creator_screenshots (
  id             uuid primary key default gen_random_uuid(),
  submission_id  uuid not null references creator_stats_submissions(id) on delete cascade,
  mime           text not null default 'image/jpeg',
  data           text not null,
  created_at     timestamptz not null default now()
);
create index if not exists creator_screenshots_submission_idx on creator_screenshots (submission_id);

-- 5. Свободные даты блогера
create table if not exists creator_availability (
  creator_id  uuid not null references creators(id) on delete cascade,
  day         date not null,
  primary key (creator_id, day)
);

-- Доступ только с сервера (service_role), как у остальных таблиц
alter table creator_accounts          enable row level security;
alter table creator_stats_submissions enable row level security;
alter table creator_screenshots       enable row level security;
alter table creator_availability      enable row level security;

notify pgrst, 'reload schema';
select 'AdMatch 0002 готово' as result;
