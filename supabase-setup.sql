-- ============================================================
-- BioLab 极简版 SQL（共 7 条语句）
-- 用法：Supabase 控制台 → SQL Editor → New query → 粘贴 → Run
-- 第一段跑完再跑第二段，两段都可以重复执行
-- ============================================================

-- ============ 第一段：用户数据（4 条语句） ============

create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

drop policy if exists "own data" on public.user_data;

create policy "own data" on public.user_data for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============ 第二段：文件存储（3 条语句） ============

insert into storage.buckets (id, name, public, file_size_limit)
values ('biolab-files', 'biolab-files', false, 52428800)
on conflict (id) do nothing;

drop policy if exists "own files" on storage.objects;

create policy "own files" on storage.objects for all
  using (bucket_id = 'biolab-files' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'biolab-files' and (storage.foldername(name))[1] = auth.uid()::text);
