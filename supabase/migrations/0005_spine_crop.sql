-- "Fix spine": anyone signed in can mark where a game's title sits on its
-- cover. The scheduled spine job (scripts/sync-spines.mjs) remakes the spine
-- around that box for everyone.

alter table public.games
  add column spine_crop jsonb,          -- { left, top, right, bottom } as 0-1 cover fractions
  add column spine_crop_at timestamptz, -- when it was last set; the job regenerates newer crops
  add column spine_crop_by uuid references public.profiles on delete set null;

create or replace function public.set_spine_crop(p_bgg_id integer, p_left numeric, p_top numeric, p_right numeric, p_bottom numeric)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to fix spines';
  end if;
  if not (0 <= p_left and p_left < p_right and p_right <= 1 and 0 <= p_top and p_top < p_bottom and p_bottom <= 1) then
    raise exception 'The title box must be inside the cover';
  end if;
  update games
  set spine_crop = jsonb_build_object('left', p_left, 'top', p_top, 'right', p_right, 'bottom', p_bottom),
      spine_crop_at = now(),
      spine_crop_by = auth.uid()
  where bgg_id = p_bgg_id;
end $$;

revoke execute on function public.set_spine_crop(integer, numeric, numeric, numeric, numeric) from public, anon;
grant execute on function public.set_spine_crop(integer, numeric, numeric, numeric, numeric) to authenticated;
