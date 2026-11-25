-- AF STUDIO: проверка установки. Ожидается: works=8, services=4, kb=10, buckets=3, reviews=3, pricing=4
select
  (select count(*) from public.portfolio_items) as works,
  (select count(*) from public.services)        as services,
  (select count(*) from public.kb_articles)     as kb,
  (select count(*) from storage.buckets where id in ('project-files','portfolio-media','avatars')) as buckets,
  (select count(*) from public.reviews)         as reviews,
  (select count(*) from public.pricing_categories) as pricing;
