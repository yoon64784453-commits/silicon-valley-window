begin;

create or replace function public.generate_order_no()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_prefix text;
  next_suffix integer;
begin
  current_prefix := to_char(now() at time zone 'Asia/Shanghai', 'YYYYMMDDHH24MI');

  lock table public.orders in exclusive mode;

  select coalesce(max(substring(order_no from 13)::integer), -1) + 1
  into next_suffix
  from public.orders
  where order_no ~ ('^' || current_prefix || '[0-9]+$');

  return current_prefix || lpad(next_suffix::text, 3, '0');
end;
$$;

alter table public.orders
  add column if not exists order_no text;

with candidates as (
  select
    id,
    to_char(created_at at time zone 'Asia/Shanghai', 'YYYYMMDDHH24MI') as prefix,
    row_number() over (
      partition by to_char(created_at at time zone 'Asia/Shanghai', 'YYYYMMDDHH24MI')
      order by created_at, id
    ) - 1 as suffix
  from public.orders
  where order_no is null
),
numbered as (
  select
    id,
    prefix || lpad(suffix::text, 3, '0') as generated_order_no
  from candidates
)
update public.orders as orders
set order_no = numbered.generated_order_no
from numbered
where orders.id = numbered.id
  and orders.order_no is null;

create unique index if not exists orders_order_no_unique_idx
  on public.orders (order_no)
  where order_no is not null;

alter table public.orders
  alter column order_no set default public.generate_order_no();

commit;
