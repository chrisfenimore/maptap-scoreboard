-- MapTap Scoreboard schema
-- Run this in your Supabase project's SQL editor (Project > SQL Editor > New query)

-- One row per friend, created automatically on sign up
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null unique,
  avatar_emoji text,
  avatar_url text,
  created_at timestamptz default now()
);

-- One row per player per day. unique(player_id, score_date) enforces
-- "one score per day" - re-submitting the same day overwrites it (upsert).
create table public.scores (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.profiles(id) not null,
  score numeric not null,
  score_date date not null,
  created_at timestamptz default now(),
  unique (player_id, score_date)
);

alter table public.profiles enable row level security;
alter table public.scores enable row level security;

create policy "profiles are viewable by everyone signed in"
  on public.profiles for select using (auth.role() = 'authenticated');
create policy "users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "scores are viewable by everyone signed in"
  on public.scores for select using (auth.role() = 'authenticated');
create policy "users can insert their own scores"
  on public.scores for insert with check (auth.uid() = player_id);
create policy "users can update their own scores"
  on public.scores for update using (auth.uid() = player_id);

-- Auto-create a profile row whenever someone signs up.
-- display_name and avatar_emoji are passed in from the sign-up form.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_emoji)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_emoji'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------
-- Optional: photo avatars (skip this section if emoji avatars are enough)
-- ---------------------------------------------------------------------
-- 1. In the Supabase dashboard, go to Storage, click "New bucket", name it
--    "avatars", and toggle it Public.
-- 2. Then run the policies below so signed-in users can upload their own photo.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar images are publicly readable"
  on storage.objects for select using (bucket_id = 'avatars');
create policy "users can upload their own avatar"
  on storage.objects for insert with check (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "users can update their own avatar"
  on storage.objects for update using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );
