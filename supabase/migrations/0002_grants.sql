-- This project doesn't grant table access to the API roles by default.
-- Row level security (0001) still decides which rows each user can touch.
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant update on public.profiles to authenticated;
grant insert, update, delete on public.shelf_games, public.players, public.plays, public.play_players to authenticated;
