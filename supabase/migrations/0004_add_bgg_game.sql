-- add_bgg_game(bgg_id): fetch one game's details from BoardGameGeek's site
-- API and save it to the shared catalog. Called by signed-in users when they
-- add a game the library doesn't have yet. Uses the `http` extension so no
-- separate server is needed.

create extension if not exists http with schema extensions;

-- BGG descriptions are HTML; return plain paragraphs.
create or replace function public.html_paragraphs(html text) returns jsonb
language plpgsql immutable as $$
declare
  t text := coalesce(html, '');
  m text[];
begin
  t := regexp_replace(t, '<br\s*/?>', E'\n', 'gi');
  t := regexp_replace(t, '</p>', E'\n\n', 'gi');
  t := regexp_replace(t, '<[^>]+>', '', 'g');
  loop
    m := regexp_match(t, '&#(\d+);');
    exit when m is null;
    t := replace(t, '&#' || m[1] || ';', chr(m[1]::int));
  end loop;
  t := replace(replace(replace(replace(replace(t, '&quot;', '"'), '&apos;', ''''), '&lt;', '<'), '&gt;', '>'), '&nbsp;', ' ');
  t := replace(replace(replace(replace(t, '&mdash;', '—'), '&ndash;', '–'), '&hellip;', '…'), '&amp;', '&');
  return coalesce(
    (select jsonb_agg(p) from (select trim(x) p from regexp_split_to_table(t, E'\n') x) s where p <> ''),
    '[]'::jsonb
  );
end $$;

create or replace function public.add_bgg_game(p_bgg_id integer) returns public.games
language plpgsql security definer set search_path = public, extensions as $$
declare
  res extensions.http_response;
  item jsonb;
  dyn jsonb;
  overall jsonb;
  row public.games;
begin
  if auth.uid() is null then
    raise exception 'Sign in to add games';
  end if;

  select * into row from games where bgg_id = p_bgg_id;
  if found then return row; end if;

  res := http_get(format('https://api.geekdo.com/api/geekitems?objectid=%s&objecttype=thing', p_bgg_id));
  if res.status <> 200 then raise exception 'BoardGameGeek has no game %', p_bgg_id; end if;
  item := res.content::jsonb -> 'item';
  if item is null or item ->> 'subtype' not in ('boardgame', 'boardgameexpansion') then
    raise exception 'BGG item % is not a board game', p_bgg_id;
  end if;

  res := http_get(format('https://api.geekdo.com/api/dynamicinfo?objectid=%s&objecttype=thing', p_bgg_id));
  dyn := case when res.status = 200 then res.content::jsonb -> 'item' else '{}'::jsonb end;
  select r into overall from jsonb_array_elements(coalesce(dyn -> 'rankinfo', '[]')) r where (r ->> 'rankobjectid')::int = 1;

  insert into games (bgg_id, title, year, cover_url, thumb_url, info)
  values (
    p_bgg_id,
    item ->> 'name',
    nullif((item ->> 'yearpublished')::int, 0),
    item -> 'images' ->> 'original',
    item -> 'images' ->> 'thumb',
    jsonb_build_object(
      'tagline', nullif(item ->> 'short_description', ''),
      'players', jsonb_build_object('min', nullif((item ->> 'minplayers')::int, 0), 'max', nullif((item ->> 'maxplayers')::int, 0)),
      'bestPlayers', dyn -> 'polls' -> 'userplayers' -> 'best' -> 0,
      'recommendedPlayers', dyn -> 'polls' -> 'userplayers' -> 'recommended' -> 0,
      'playTime', jsonb_build_object('min', nullif((item ->> 'minplaytime')::int, 0), 'max', nullif((item ->> 'maxplaytime')::int, 0)),
      'minAge', nullif((item ->> 'minage')::int, 0),
      'communityAge', nullif(dyn -> 'polls' ->> 'playerage', ''),
      'weight', nullif((dyn -> 'stats' ->> 'avgweight')::numeric, 0),
      'rating', nullif((dyn -> 'stats' ->> 'average')::numeric, 0),
      'ratings', nullif((dyn -> 'stats' ->> 'usersrated')::int, 0),
      'rank', nullif(overall ->> 'rank', 'Not Ranked')::int,
      'languageDependence', nullif(dyn -> 'polls' ->> 'languagedependence', ''),
      'designers', jsonb_path_query_array(item, '$.links.boardgamedesigner[*].name'),
      'artists', jsonb_path_query_array(item, '$.links.boardgameartist[0 to 3].name'),
      'publishers', jsonb_path_query_array(item, '$.links.boardgamepublisher[0 to 2].name'),
      'categories', jsonb_path_query_array(item, '$.links.boardgamecategory[*].name'),
      'mechanics', jsonb_path_query_array(item, '$.links.boardgamemechanic[*].name'),
      'types', jsonb_path_query_array(item, '$.links.boardgamesubdomain[*].name'),
      'expands', jsonb_path_query_array(item, '$.links.expandsboardgame[*].name'),
      'description', html_paragraphs(item ->> 'description')
    )
  )
  returning * into row;
  return row;
end $$;

revoke execute on function public.add_bgg_game(integer) from public, anon;
grant execute on function public.add_bgg_game(integer) to authenticated;
