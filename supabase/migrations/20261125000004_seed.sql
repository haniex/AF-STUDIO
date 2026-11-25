-- =====================================================================
-- AF STUDIO 2.0 — seed data migrated 1:1 from the existing site
-- (index.html, project.js, script.js FAQ). Nothing invented except values
-- explicitly marked UNCONFIRMED below, which the owner must confirm in AF Admin.
-- =====================================================================

insert into public.services(id,title_ru,title_en,desc_ru,desc_en,features,sort) values
('product','Продуктовая визуализация','Product visualization','Фотореалистичные рендеры товаров для e-commerce, рекламы и презентаций. От простых объектов до сложных сборок.','Photorealistic product renders for e-commerce, advertising and presentations. From simple objects to complex assemblies.','[{"ru": "Каталожные и lifestyle-сцены", "en": "Catalog & lifestyle scenes"}, {"ru": "360° и turntable", "en": "360° and turntable"}, {"ru": "Анимация продукта", "en": "Product animation"}]'::jsonb,0),
('arch','Архитектурная визуализация','Architectural visualization','Экстерьеры и интерьеры любой сложности. От эскиза до финального рендера и анимации.','Exteriors and interiors of any complexity. From sketch to final render and animation.','[{"ru": "Экстерьер / интерьер", "en": "Exterior / interior"}, {"ru": "Дневные и ночные сцены", "en": "Day & night scenes"}, {"ru": "Архитектурные ролики", "en": "Architectural films"}]'::jsonb,1),
('character','Character Design','Character Design','Создание персонажей для игр, анимации и рекламы. От концепта до ригга и готовой модели.','Characters for games, animation and advertising. From concept to rig and production-ready model.','[{"ru": "Sculpt + retopo", "en": "Sculpt + retopo"}, {"ru": "Текстуры и материалы", "en": "Textures & materials"}, {"ru": "Риггинг и skinning", "en": "Rigging & skinning"}]'::jsonb,2),
('motion','Motion & Animation','Motion & Animation','3D-анимация, motion-графика и брендинговые ролики. От 5-секундных loops до полноценных фильмов.','3D animation, motion graphics and brand films. From 5-second loops to full films.','[{"ru": "Logo animation", "en": "Logo animation"}, {"ru": "Product animation", "en": "Product animation"}, {"ru": "Full CG films", "en": "Full CG films"}]'::jsonb,3)
on conflict (id) do nothing;

-- NOTE: 'aether' uses a stock Unsplash image in the original site — replace with the real render in AF Admin.
insert into public.portfolio_items(id,category,year,tags,title_ru,title_en,card_ru,card_en,lead_ru,lead_en,desc_ru,desc_en,brief_ru,brief_en,solution_ru,solution_en,tools,time_ru,time_en,result_ru,result_en,cover,gallery,sort) values
('haniex','product','2024','Product · Tech','Haniex','Haniex','Фотореалистичная визуализация премиальных наушников. Полный цикл: моделирование, UV, текстурирование, освещение Octane, композитинг. 12 финальных кадров + turntable.','Photorealistic visualization of premium headphones. Full pipeline: modeling, UV, texturing, Octane lighting, compositing. 12 final frames + turntable.','Фотореалистичная визуализация премиальных наушников.','Photorealistic visualization of premium headphones.','Полный цикл продуктовой визуализации для технологического бренда. Задача — показать премиальность материала и эргономику формы так, чтобы изображение работало и в e-commerce, и в рекламе.','Full product visualization pipeline for a tech brand. The goal was to show material premium quality and ergonomic form so the image works both in e-commerce and advertising.','Клиенту нужны были 12 финальных кадров + turntable для каталога и соцсетей. Стиль — чистый studio look с акцентом на металл и мягкие тени.','Client needed 12 final frames + turntable for catalog and socials. Style — clean studio look with focus on metal and soft shadows.','Модель собрана в Blender, UV и текстуры в Substance. Освещение — Octane (HDR + area lights). Композитинг и цветокоррекция в After Effects. Результат: серия, которая подняла конверсию карточки товара.','Model built in Blender, UV and textures in Substance. Lighting — Octane (HDR + area lights). Compositing and grading in After Effects. Result: a series that improved product page conversion.',array['Blender','Octane','Substance','After Effects','Photoshop']::text[],'2,5 недели','2.5 weeks','12 кадров 4K + 8-сек turntable + исходники','12 × 4K frames + 8s turntable + source files','images/haniex.jpg',array['images/haniex.jpg','images/haniex-2.jpg','images/haniex-3.jpg']::text[],0),
('aurora','arch','2025','Architecture · Exterior','Aurora Residence','Aurora Residence','Архитектурная визуализация современной виллы на побережье. Акцент на естественном свете, материалах камня и стекла. 8 ракурсов + сумерки.','Architectural visualization of a modern coastal villa. Focus on natural light, stone and glass materials. 8 angles + dusk sequence.','Архитектурная визуализация современной виллы на побережье.','Architectural visualization of a modern coastal villa.','Экстерьерная визуализация частной виллы. Акцент на естественный свет, материалы камня, стекла и дерева, связь архитектуры с ландшафтом.','Exterior visualization of a private villa. Focus on natural light, stone, glass and wood materials, connection of architecture with landscape.','Нужны дневные и сумеречные ракурсы для презентации инвесторам и продажи. 8 ключевых видов + атмосферные детали.','Day and dusk angles needed for investor presentation and sales. 8 key views + atmospheric details.','Моделирование и сценография в Blender + Cinema 4D. Рендер Redshift. Постобработка с акцентом на мягкий свет и отражения в воде.','Modeling and set dressing in Blender + Cinema 4D. Rendered in Redshift. Post with soft light and water reflections.',array['Blender','Cinema 4D','Redshift','Photoshop']::text[],'3 недели','3 weeks','8 ракурсов 6K + сумеречная серия','8 × 6K angles + dusk series','images/aurora.jpg',array['images/aurora.jpg','images/aurora-2.jpg','images/aurora-3.jpg']::text[],1),
('lumina','product','2024','Packaging · Luxury','Lumina Bottle','Lumina Bottle','3D-визуализация флакона люксовых духов. Сложные материалы стекла, жидкости, этикетки и отражений. Серия для рекламной кампании.','3D visualization of a luxury perfume bottle. Complex glass, liquid, label and reflection materials. Series for an advertising campaign.','3D-визуализация флакона люксовых духов.','3D visualization of a luxury perfume bottle.','Серия для рекламной кампании люксового аромата. Сложные материалы стекла, жидкости, этикетки и отражений.','Series for a luxury fragrance advertising campaign. Complex glass, liquid, label and reflection materials.','Нужен «дорогой» look: идеальные блики, объём жидкости, читаемая этикетка. Использование в print и digital.','Needed a “premium” look: perfect highlights, liquid volume, readable label. For print and digital.','Высокая детализация стекла и каустики в Octane. Жидкость с правильным IOR. Композитинг с контролируемыми отражениями.','High-detail glass and caustics in Octane. Liquid with correct IOR. Compositing with controlled reflections.',array['Blender','Octane','Photoshop']::text[],'10 дней','10 days','6 ключевых кадров + варианты фона','6 key frames + background variants','images/lumina.jpg',array['images/lumina.jpg','images/lumina-2.jpg','images/lumina-3.jpg']::text[],2),
('vertex','character','2023','Character · Game','Vertex','Vertex','Создание игрового персонажа: ZBrush-скульптинг, ретопология, UV, текстурирование Substance, риггинг и базовые анимации. Готов к интеграции в Unreal.','Game character creation: ZBrush sculpting, retopology, UV, Substance texturing, rigging and basic animations. Ready for Unreal integration.','Игровой персонаж: от скульпта до ригга.','Game character: from sculpt to rig.','Полный пайплайн персонажа для игры: high-poly скульпт, ретопология, текстуры, риггинг и базовые анимации.','Full character pipeline for a game: high-poly sculpt, retopology, textures, rigging and basic animations.','Стиль — современный sci-fi. Модель должна быть production-ready для Unreal Engine 5.','Style — modern sci-fi. Model must be production-ready for Unreal Engine 5.','ZBrush → ретопология → Substance → риг в Blender. Экспорт в Unreal с правильными LODs и materials.','ZBrush → retopo → Substance → rig in Blender. Export to Unreal with proper LODs and materials.',array['ZBrush','Blender','Substance','Unreal Engine']::text[],'4 недели','4 weeks','Game-ready модель + 5 анимаций','Game-ready model + 5 animations','images/vertex.jpg',array['images/vertex.jpg','images/vertex-2.jpg','images/vertex-3.jpg']::text[],3),
('echo','motion','2025','Motion · Brand','Echo Sphere','Echo Sphere','Motion-идентификация и 3D-анимация для технологического бренда. Абстрактные формы, звуковые волны, логотип в движении. 15-секундный ролик + loop.','Motion identity and 3D animation for a tech brand. Abstract forms, sound waves, logo in motion. 15-second film + loop.','Motion-идентификация и 3D-анимация для tech-бренда.','Motion identity and 3D animation for a tech brand.','Абстрактные формы, звуковые волны и логотип в движении. 15-секундный ролик + seamless loop для digital.','Abstract forms, sound waves and logo in motion. 15-second film + seamless loop for digital.','Нужна сильная motion-идентификация, которая ощущается «технологично» и премиально.','Needed strong motion identity that feels both tech and premium.','Процедурные формы в Cinema 4D + Octane. Анимация и sound design в After Effects. Финальный delivery в нескольких форматах.','Procedural forms in Cinema 4D + Octane. Animation and sound design in After Effects. Final delivery in multiple formats.',array['Cinema 4D','Octane','After Effects']::text[],'2 недели','2 weeks','15с ролик + loop 10с + stil frames','15s film + 10s loop + still frames','images/echo.jpg',array['images/echo.jpg','images/echo-2.jpg','images/echo-3.jpg']::text[],4),
('urban','arch','2024','Environment · City','Urban Pulse','Urban Pulse','Концептуальный городской пейзаж будущего. Сочетание архитектуры, атмосферы и неонового освещения. Мат-пейнт + 3D-элементы.','Conceptual future cityscape. Mix of architecture, atmosphere and neon lighting. Matte-paint + 3D elements.','Концептуальный городской пейзаж будущего.','Conceptual future cityscape.','Сочетание архитектуры, атмосферы и неонового освещения. Мат-пейнт + 3D-элементы.','Mix of architecture, atmosphere and neon lighting. Matte-paint + 3D elements.','Концепт для pitch-deck. Нужна сильная атмосфера «город будущего» без перегруза деталями.','Concept for a pitch-deck. Strong “city of the future” atmosphere without detail overload.','3D-блокинг + kitbash, атмосфера в post, неоновые акценты. Финальный кадр работает и как key art, и как фон.','3D blocking + kitbash, atmosphere in post, neon accents. Final frame works as both key art and background.',array['Blender','Photoshop','After Effects']::text[],'1,5 недели','1.5 weeks','Key art 8K + 3 варианта освещения','Key art 8K + 3 lighting variants','images/urban.jpg',array['images/urban.jpg','images/urban-2.jpg','images/urban-3.jpg']::text[],5),
('neon','product','2023','Automotive · Concept','Neon Drift','Neon Drift','Концепт-кар в неоновом стиле. Драматичное освещение, высокодетализированные материалы кузова и интерьера. Серия из 6 кадров.','Neon-style concept car. Dramatic lighting, highly detailed body and interior materials. Series of 6 frames.','Концепт-кар в неоновом стиле.','Neon-style concept car.','Драматичное освещение, высокодетализированные материалы кузова и интерьера. Серия из 6 кадров.','Dramatic lighting, highly detailed body and interior materials. Series of 6 frames.','Концепт для automotive-студии. Нужен wow-эффект и ощущение скорости даже в статике.','Concept for an automotive studio. Needed wow-factor and sense of speed even in stills.','Детальный кузов и материалы в Blender/Octane. Неоновый light setup. Пост с контролем бликов и глубины.','Detailed body and materials in Blender/Octane. Neon light setup. Post with controlled highlights and depth.',array['Blender','Octane','Photoshop']::text[],'3 недели','3 weeks','6 кадров 5K + material breakdown','6 × 5K frames + material breakdown','images/neon.jpg',array['images/neon.jpg','images/neon-2.jpg','images/neon-3.jpg']::text[],6),
('aether','character','2025','Character · Fantasy','Aether Guardian','Aether Guardian','Фэнтезийный персонаж-страж: high-poly скульпт, стилизованные текстуры, cloth simulation в Marvelous Designer, готовый к анимации.','Fantasy guardian character: high-poly sculpt, stylized textures, cloth simulation in Marvelous Designer, animation-ready.','Фэнтезийный персонаж-страж.','Fantasy guardian character.','High-poly скульпт, стилизованные текстуры, cloth simulation в Marvelous Designer, готовый к анимации.','High-poly sculpt, stylized textures, cloth simulation in Marvelous Designer, animation-ready.','Персонаж для fantasy-проекта. Нужна сильная силуэтная читаемость и ощущение «магии» в материалах.','Character for a fantasy project. Strong silhouette readability and sense of “magic” in materials.','ZBrush sculpt → Marvelous для ткани → Substance → риг. Материалы с emissive и subsurface для «эфирного» эффекта.','ZBrush sculpt → Marvelous for cloth → Substance → rig. Materials with emissive and subsurface for ethereal effect.',array['ZBrush','Marvelous Designer','Substance','Blender']::text[],'5 недель','5 weeks','Production-ready character + turntable','Production-ready character + turntable','https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=1400&q=80',array['https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=1400&q=80']::text[],7)
on conflict (id) do nothing;

-- Testimonials exactly as published on the current site. Owner: confirm they are real or unpublish in AF Admin.
insert into public.reviews(author,role_ru,role_en,quote_ru,quote_en,rating,sort)
select * from (values
('Мария К.','Product Manager · TechBrand','Product Manager · TechBrand','«Александр сделал визуализацию, которая превзошла все ожидания. Клиенты сразу захотели купить продукт. Работали быстро и без лишних правок.»','«Alexander delivered a visualization that exceeded all expectations. Clients immediately wanted to buy the product. Fast work, almost no revisions.»',5,0),
('Elena V.','Art Director · Global Agency','Art Director · Global Agency','«Лучший 3D-специалист, с которым я работал. Качество на уровне международных студий, при этом коммуникация простая и человечная. Рекомендую без оговорок.»','«The best 3D specialist I have worked with. Quality at international studio level, yet communication is simple and human. Recommend without reservations.»',5,1),
('Дмитрий С.','Creative Director · Studio Nova','Creative Director · Studio Nova','«Работает быстро, точно понимает задачу и всегда предлагает сильные визуальные решения. Надёжный партнёр на долгий срок.»','«Works fast, understands the brief precisely and always offers strong visual solutions. A reliable long-term partner.»',5,2)
) v(author,role_ru,role_en,quote_ru,quote_en,rating,sort)
where not exists (select 1 from public.reviews);

insert into public.kb_articles(topic,title_ru,title_en,body_ru,body_en,sort)
select * from (values
('pricing','Сколько стоит визуализация?','How much does visualization cost?','Стоимость зависит от сложности и объёма:

- **Простой продукт** — от 15 000 ₽ (1–3 ракурса)
- **Сложный продукт / упаковка** — 25–60 000 ₽
- **Архитектура (экстерьер)** — от 40 000 ₽ за ключевой ракурс
- **Персонаж game-ready** — от 80 000 ₽
- **Motion / ролик** — индивидуально, от 50 000 ₽

Точную смету даю после брифа. Напишите задачу — отвечу с ориентиром по цене и срокам.','Price depends on complexity and scope:

- **Simple product** — from $150–200 (1–3 angles)
- **Complex product / packaging** — $250–600
- **Architecture (exterior)** — from $400 per key view
- **Game-ready character** — from $800
- **Motion / film** — custom, from $500

Exact quote after the brief. Send your task — I’ll reply with a price and timeline range.',0),
('terms','Какие сроки выполнения?','What are the timelines?','Типичные сроки:

- **Продуктовый рендер** — 3–10 дней
- **Архитектурный экстерьер** — 1–3 недели
- **Character (full pipeline)** — 3–6 недель
- **Motion 10–15 сек** — 1–3 недели

Срочный заказ возможен (+30–50% к стоимости). После согласования брифа фиксируем дедлайн в договоре.','Typical timelines:

- **Product render** — 3–10 days
- **Architectural exterior** — 1–3 weeks
- **Character (full pipeline)** — 3–6 weeks
- **Motion 10–15 sec** — 1–3 weeks

Rush jobs are possible (+30–50%). After the brief we lock the deadline in the agreement.',1),
('process','Что нужно для старта?','What do you need to start?','Чтобы начать, достаточно:

- Краткое описание задачи и цели (реклама, e-com, pitch…)
- Референсы (Pinterest, скрины, конкуренты)
- Чертежи / CAD / фото продукта — если есть
- Желаемые ракурсы и сроки

Если ничего нет — помогу собрать бриф на созвоне или в переписке. После этого даю смету и план работ.','To start, I need:

- Short description of the task and goal (ads, e-com, pitch…)
- References (Pinterest, screenshots, competitors)
- Drawings / CAD / product photos — if available
- Desired angles and deadline

If you have nothing yet — I’ll help build the brief on a call or in chat. Then you get a quote and work plan.',2),
('terms','Сколько правок входит?','How many revisions are included?','В стандартный пакет входит:

- **2 раунда правок** на этапе блокига / освещения
- **1 раунд** на финальном композитинге

Мелкие правки (цвет, кроп, логотип) — без доплаты. Крупные изменения композиции или модели после утверждения — оцениваются отдельно. Все этапы согласуем, чтобы правок было минимум.','Standard package includes:

- **2 revision rounds** at blocking / lighting stage
- **1 round** at final compositing

Small tweaks (color, crop, logo) — free. Major composition or model changes after approval are quoted separately. We align at every stage to keep revisions minimal.',3),
('terms','В каких форматах отдача?','What delivery formats?','По умолчанию отдаю:

- **PNG / JPEG** — 4K–8K под web и print
- **TIFF** — по запросу для полиграфии
- **MP4 / ProRes** — для motion
- Исходники сцены (Blender / C4D) — по договорённости

Могу подготовить версии под Instagram, баннеры, презентации и каталог. Напишите, где будет использоваться — подстрою.','Default delivery:

- **PNG / JPEG** — 4K–8K for web and print
- **TIFF** — on request for print
- **MP4 / ProRes** — for motion
- Scene sources (Blender / C4D) — by agreement

I can prepare versions for Instagram, banners, decks and catalogs. Tell me where it will be used — I’ll adapt.',4),
('terms','Работаете удалённо / с другими странами?','Do you work remotely / internationally?','Да. Работаю полностью удалённо с клиентами по всему миру.

- Коммуникация: Telegram, Email, Zoom / Google Meet
- Оплата: перевод, карта, для зарубежных клиентов — удобный способ обсуждаем
- Договор и NDA — по запросу
- Часовой пояс: MSK (UTC+3), гибко подстраиваюсь

Язык общения: русский и английский.','Yes. I work fully remote with clients worldwide.

- Comms: Telegram, Email, Zoom / Google Meet
- Payment: transfer, card; for international clients we agree on a convenient method
- Contract and NDA — on request
- Timezone: MSK (UTC+3), flexible

Languages: Russian and English.',5),
('about','Об Александре Фролове / AF','About Alexander Frolov / AF','Я — Александр Дмитриевич Фролов, 3D-графический дизайнер из Узловой, Тульская область. Уже 12 лет я превращаю идеи в объёмные, живые изображения.

Моя специализация — фотореалистичная продуктовая и архитектурная визуализация, character design и motion-графика. Работаю с клиентами по всему миру, сочетая техническую точность с художественным вкусом. Каждый проект начинается с глубокого понимания задачи и заканчивается изображением, которое продаёт, вдохновляет и остаётся в памяти.

Инструменты: Blender, Cinema 4D, Octane, Redshift, ZBrush, Substance, After Effects, Photoshop, Unreal Engine, Marvelous Designer.
- Полный цикл: от концепта до финального рендера и композитинга
- Работа с брендами, студиями и частными заказчиками
- Сроки от 3 дней до 6 недель в зависимости от сложности

Опыт: 12 лет.','I am Alexander Dmitrievich Frolov, a 3D graphic designer from Uzlovaya, Tula Oblast. For 12 years I have been turning ideas into volumetric, living images.

My focus is photorealistic product and architectural visualization, character design and motion graphics. I work with clients worldwide, combining technical precision with artistic taste. Every project starts with a deep understanding of the brief and ends with an image that sells, inspires and stays in memory.

Tools: Blender, Cinema 4D, Octane, Redshift, ZBrush, Substance, After Effects, Photoshop, Unreal Engine, Marvelous Designer.
- Full pipeline: from concept to final render and compositing
- Work with brands, studios and private clients
- Timelines from 3 days to 6 weeks depending on complexity

Experience: 12 years.',10),
('process','Этапы работы','Work stages','1. **Бриф и референсы** — Выясняем задачу, цели, аудиторию, визуальное направление, сроки и бюджет. Собираем референсы и фиксируем ожидания. Результат: чёткий бриф и согласованное направление.
2. **Концепция и структура** — Формируем композицию, блокинг сцены и основные ракурсы. Согласовываем moodboard и общее настроение кадра. Результат: утверждённый концепт и структура проекта.
3. **Моделирование и дизайн** — Строим геометрию, UV, базовые материалы. Настраиваем свет и камеры. Промежуточные превью для правок. Результат: рабочая сцена и согласованный look.
4. **Детализация и тест** — Текстуры, материалы, мелкие детали. Финальные тестовые рендеры, правки освещения и композитинга. Результат: готовая к финалу сцена без сюрпризов.
5. **Финальная передача** — Рендер в нужном разрешении, цветокоррекция, экспорт форматов. Передача файлов и сопровождение при необходимости. Результат: готовые файлы и закрытый этап.','1. **Brief & references** — We clarify the task, goals, audience, visual direction, timeline and budget. Collect references and align expectations. Outcome: a clear brief and agreed direction.
2. **Concept & structure** — We shape composition, scene blocking and key angles. Align the moodboard and overall frame mood. Outcome: approved concept and project structure.
3. **Modeling & design** — We build geometry, UVs, base materials. Set up lighting and cameras. Interim previews for feedback. Outcome: working scene and approved look.
4. **Detailing & review** — Textures, materials, fine details. Final test renders, lighting and compositing refinements. Outcome: scene ready for final with no surprises.
5. **Final delivery** — Render at required resolution, color grade, format export. File handoff and support if needed. Outcome: final files and a closed stage.',11),
('services','Услуги студии','Studio services','**Продуктовая визуализация** — Фотореалистичные рендеры товаров для e-commerce, рекламы и презентаций. От простых объектов до сложных сборок.
- Каталожные и lifestyle-сцены
- 360° и turntable
- Анимация продукта

**Архитектурная визуализация** — Экстерьеры и интерьеры любой сложности. От эскиза до финального рендера и анимации.
- Экстерьер / интерьер
- Дневные и ночные сцены
- Архитектурные ролики

**Character Design** — Создание персонажей для игр, анимации и рекламы. От концепта до ригга и готовой модели.
- Sculpt + retopo
- Текстуры и материалы
- Риггинг и skinning

**Motion & Animation** — 3D-анимация, motion-графика и брендинговые ролики. От 5-секундных loops до полноценных фильмов.
- Logo animation
- Product animation
- Full CG films','**Product visualization** — Photorealistic product renders for e-commerce, advertising and presentations. From simple objects to complex assemblies.
- Catalog & lifestyle scenes
- 360° and turntable
- Product animation

**Architectural visualization** — Exteriors and interiors of any complexity. From sketch to final render and animation.
- Exterior / interior
- Day & night scenes
- Architectural films

**Character Design** — Characters for games, animation and advertising. From concept to rig and production-ready model.
- Sculpt + retopo
- Textures & materials
- Rigging & skinning

**Motion & Animation** — 3D animation, motion graphics and brand films. From 5-second loops to full films.
- Logo animation
- Product animation
- Full CG films',12),
('contacts','Контакты','Contacts','Email: enemy1032@gmail.com
Telegram: @uguro (https://t.me/uguro)
Телефон: +7 902 902-67-69
Локация: Узловая, Тульская область, Россия. Работа удалённо по всему миру, часовой пояс MSK (UTC+3).','Email: enemy1032@gmail.com
Telegram: @uguro (https://t.me/uguro)
Phone: +7 902 902-67-69
Location: Uzlovaya, Tula Oblast, Russia. Remote work worldwide, timezone MSK (UTC+3).',13)
) v(topic,title_ru,title_en,body_ru,body_en,sort)
where not exists (select 1 from public.kb_articles);

-- ---------------------------------------------------------------------
-- PRICING
-- Anchors taken from the site FAQ ("Сколько стоит визуализация?" / "Какие сроки?"):
--   product from 15 000 ₽ (1–3 angles), complex product 25–60 000 ₽,
--   architecture from 40 000 ₽ per key view, game-ready character from 80 000 ₽,
--   motion from 50 000 ₽; timelines 3–10 d / 1–3 w / 3–6 w / 1–3 w; rush +30–50%.
-- Values tagged UNCONFIRMED are initial coefficients to be confirmed by the owner.
-- `confirmed=false` makes the calculator show an explicit "preliminary" notice.
-- ---------------------------------------------------------------------
insert into public.pricing_categories
 (id,title_ru,title_en,currency,base_min,base_max,included_angles,per_angle,per_object,anim_per_sec,days_min,days_max,works,extras_note_ru,extras_note_en,confirmed,sort) values
 ('product','Продуктовая визуализация','Product Visualization','RUB',
   15000, 25000, 3, 3000 /*UNCONFIRMED*/, 5000 /*UNCONFIRMED*/, 2000 /*UNCONFIRMED*/, 3, 10,
   '[{"ru":"Моделирование продукта","en":"Product modeling"},{"ru":"Материалы и текстуры","en":"Materials & textures"},{"ru":"Студийное освещение","en":"Studio lighting"},{"ru":"Рендер и композитинг","en":"Render & compositing"},{"ru":"2 раунда правок + 1 финальный","en":"2 revision rounds + 1 final"}]',
   'Сложные сборки и упаковка — 25–60 000 ₽. Срочность +30–50%. Исходники сцены — по договорённости.',
   'Complex assemblies & packaging — 25–60k ₽. Rush +30–50%. Scene source files by agreement.', false, 0),
 ('arch','Архитектурная визуализация','Architecture','RUB',
   40000, 60000 /*UNCONFIRMED max*/, 1, 40000, 0, 3000 /*UNCONFIRMED*/, 7, 21,
   '[{"ru":"Моделирование и сценография","en":"Modeling & set dressing"},{"ru":"Материалы, ландшафт, окружение","en":"Materials, landscape, surroundings"},{"ru":"Дневной/сумеречный свет","en":"Day/dusk lighting"},{"ru":"Рендер и постобработка","en":"Render & post-production"}]',
   'Цена указана за ключевой ракурс. Анимационные пролёты оцениваются отдельно.',
   'Price is per key view. Fly-through animations are quoted separately.', false, 1),
 ('character','Character Design','Character Design','RUB',
   80000, 150000 /*UNCONFIRMED max*/, 1, 10000 /*UNCONFIRMED*/, 0, 4000 /*UNCONFIRMED*/, 21, 42,
   '[{"ru":"Концепт и скульпт","en":"Concept & sculpt"},{"ru":"Ретопология и UV","en":"Retopology & UV"},{"ru":"Текстуры и материалы","en":"Textures & materials"},{"ru":"Риггинг и skinning","en":"Rigging & skinning"}]',
   'Game-ready с LOD и экспортом в движок — по ТЗ. Анимации персонажа оцениваются отдельно.',
   'Game-ready with LODs and engine export per spec. Character animations quoted separately.', false, 2),
 ('motion','Motion & Animation','Motion & Animation','RUB',
   50000, 90000 /*UNCONFIRMED max*/, 1, 0, 8000 /*UNCONFIRMED*/, 3000 /*UNCONFIRMED*/, 7, 21,
   '[{"ru":"Раскадровка и стиль","en":"Storyboard & style"},{"ru":"3D-анимация","en":"3D animation"},{"ru":"Рендер секвенций","en":"Sequence rendering"},{"ru":"Монтаж и звук (по ТЗ)","en":"Edit & sound (per brief)"}]',
   'Базовая цена — ролик до 10–15 секунд. Каждая дополнительная секунда считается отдельно.',
   'Base price covers a 10–15 s film. Each extra second is priced separately.', false, 3)
on conflict (id) do nothing;

insert into public.pricing_factors(id,grp,label_ru,label_en,multiplier,multiplier_max,addon,time_mult,sort) values
 ('cx_simple' ,'complexity','Простая форма','Simple form',            1.00, null, 0, 1.00, 0),
 ('cx_medium' ,'complexity','Средняя сложность','Medium complexity',   1.35, null, 0, 1.25, 1), -- UNCONFIRMED
 ('cx_complex','complexity','Сложная сборка','Complex assembly',       1.80, null, 0, 1.60, 2), -- UNCONFIRMED
 ('dt_standard','detail','Стандартная детализация','Standard detail',  1.00, null, 0, 1.00, 0),
 ('dt_high'   ,'detail','Высокая детализация','High detail',           1.25, null, 0, 1.20, 1), -- UNCONFIRMED
 ('dt_hero'   ,'detail','Hero / макро-кадры','Hero / macro shots',     1.50, null, 0, 1.40, 2), -- UNCONFIRMED
 ('ex_turntable','extras','Turntable 360°','360° turntable',           1.00, null, 8000, 1.00, 0),  -- UNCONFIRMED
 ('ex_sources','extras','Исходники сцены','Scene source files',        1.00, null, 10000, 1.00, 1), -- UNCONFIRMED (FAQ: by agreement)
 ('ex_formats','extras','Версии под соцсети/баннеры','Social/banner versions', 1.00, null, 5000, 1.05, 2), -- UNCONFIRMED
 ('ex_print'  ,'extras','TIFF для печати 8K','8K print TIFF',          1.00, null, 3000, 1.00, 3), -- UNCONFIRMED
 ('ur_normal' ,'urgency','Обычные сроки','Standard timeline',          1.00, null, 0, 1.00, 0),
 ('ur_rush'   ,'urgency','Срочно (+30–50%)','Rush (+30–50%)',          1.30, 1.50, 0, 0.60, 1)  -- from FAQ; time_mult UNCONFIRMED
on conflict (id) do nothing;

insert into public.ai_settings(id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- FIRST ADMIN (run manually once, after the owner registered):
--   insert into public.user_roles(user_id, role)
--   select id, 'admin' from auth.users where email = 'enemy1032@gmail.com'
--   on conflict do nothing;
-- ---------------------------------------------------------------------
