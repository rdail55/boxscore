-- BoxScore: accounts, shelves, shared game catalog, plays.
-- Run once in Supabase → SQL Editor → New query → paste → Run.
--
-- Everything is readable by anyone (shelves are public links); each user can
-- only change their own rows. The shared `games` catalog is written only by
-- server functions using the service role.

-- Profiles -------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_-]{3,30}$'),
  display_name text not null,
  avatar_url text,
  bgg_username text,
  created_at timestamptz not null default now()
);

-- New sign-ups get a profile; username comes from the email, made unique.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base text := left(regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_-]', '', 'g'), 24);
  candidate text;
  n int := 1;
begin
  if length(base) < 3 then base := base || 'player'; end if;
  candidate := base;
  while exists (select 1 from profiles where username = candidate) loop
    n := n + 1;
    candidate := base || n;
  end loop;
  insert into profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    candidate,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', base),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Shared game catalog ----------------------------------------------------------

create table public.games (
  bgg_id integer primary key,
  title text not null,
  year integer,
  cover_url text,
  thumb_url text,
  spine_url text,            -- null until a spine is generated
  spine_width numeric,       -- CSS px at the 280px shelf height
  info jsonb not null default '{}'::jsonb, -- players, time, weight, credits, description…
  updated_at timestamptz not null default now()
);

-- Shelves ----------------------------------------------------------------------

create table public.shelf_games (
  user_id uuid not null references public.profiles on delete cascade,
  bgg_id integer not null references public.games,
  added_at timestamptz not null default now(),
  primary key (user_id, bgg_id)
);

-- Plays ------------------------------------------------------------------------

-- People someone plays with. Just names for now; linked_user_id lets a name be
-- tied to a real account later so the play shows on their profile too.
create table public.players (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles on delete cascade,
  name text not null check (length(trim(name)) between 1 and 40),
  linked_user_id uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);
create unique index players_owner_name on public.players (owner_id, lower(name));

create table public.plays (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles on delete cascade,
  bgg_id integer not null references public.games,
  played_on date not null,
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index plays_owner on public.plays (owner_id, played_on desc);

create table public.play_players (
  play_id uuid not null references public.plays on delete cascade,
  player_id uuid not null references public.players on delete cascade,
  won boolean not null default false,
  primary key (play_id, player_id)
);

-- Row level security -----------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.shelf_games enable row level security;
alter table public.players enable row level security;
alter table public.plays enable row level security;
alter table public.play_players enable row level security;

create policy "public read" on public.profiles for select using (true);
create policy "public read" on public.games for select using (true);
create policy "public read" on public.shelf_games for select using (true);
create policy "public read" on public.players for select using (true);
create policy "public read" on public.plays for select using (true);
create policy "public read" on public.play_players for select using (true);

create policy "own profile" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "own shelf" on public.shelf_games for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own players" on public.players for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "own plays" on public.plays for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "own play players" on public.play_players for all
  using (exists (select 1 from public.plays p where p.id = play_id and p.owner_id = auth.uid()))
  with check (
    exists (select 1 from public.plays p where p.id = play_id and p.owner_id = auth.uid())
    and exists (select 1 from public.players pl where pl.id = player_id and pl.owner_id = auth.uid())
  );
