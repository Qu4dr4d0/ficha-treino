-- Limite diário de importações por usuário (foto/print/texto lidos pelo Claude).
-- Rode uma vez no SQL Editor do Supabase.

create table if not exists public.import_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default (now() at time zone 'America/Sao_Paulo')::date,
  count int not null default 0,
  primary key (user_id, day)
);

alter table public.import_usage enable row level security;

-- cada um só enxerga o próprio uso
drop policy if exists "ler o proprio uso" on public.import_usage;
create policy "ler o proprio uso" on public.import_usage
  for select using (auth.uid() = user_id);

-- Soma 1 ao uso de hoje e diz se ainda está dentro do limite.
-- security definer: o usuário não grava na tabela direto, só por aqui.
create or replace function public.bump_import(max_per_day int)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'America/Sao_Paulo')::date;
  n int;
begin
  if uid is null then
    return json_build_object('ok', false, 'reason', 'login');
  end if;
  insert into import_usage (user_id, day, count) values (uid, today, 1)
  on conflict (user_id, day) do update set count = import_usage.count + 1
  where import_usage.count < max_per_day
  returning count into n;
  if n is null then
    return json_build_object('ok', false, 'reason', 'limite', 'max', max_per_day);
  end if;
  return json_build_object('ok', true, 'used', n, 'max', max_per_day);
end;
$$;

revoke all on function public.bump_import(int) from public, anon;
grant execute on function public.bump_import(int) to authenticated;
