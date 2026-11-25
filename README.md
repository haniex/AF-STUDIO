# AF STUDIO 2.0

Закрытая платформа 3D-визуализации **AF STUDIO** (Александр Фролов).
Отдельный сайт: `https://haniex.github.io/AF-STUDIO/`. Старый сайт-портфолио не затрагивается.

```
Посетитель → AF Access (вход / регистрация) → AF Studio → портфолио, AF AI,
конструктор, калькулятор, 3D Lab, мудборды → заявка → «Мои проекты» → согласование рендеров
Администратор → AF Admin (admin.html) → заявки, статусы, файлы, контент, цены, AI
```

## Стек

| Слой | Технология | Почему |
|---|---|---|
| Frontend | Vanilla JS (ES-модули), без сборки | Сохраняет деплой на GitHub Pages и весь существующий код/стили; переход на React/Next не нужен |
| 3D / анимации | Three.js r134, GSAP 3.12.5 (как в оригинале) | Совместимость с исходной сценой и анимациями |
| Auth | Supabase Auth (PKCE, email-подтверждение, сброс пароля, Google OAuth опционально) | Настоящие аккаунты, серверная проверка JWT |
| Данные | Supabase Postgres + **RLS на каждой таблице** | Клиенты видят только своё |
| Файлы | Supabase Storage (3 приватных бакета) | Подписанные ссылки, проверка типа/размера |
| Серверная логика | Supabase Edge Functions (Deno) | AI-ключ и service_role — только на сервере |
| AI | Google Gemini (по умолчанию `gemini-3.5-flash-lite`, меняется в админке) | Дёшево и быстро для консультанта |

## Структура

```
index.html            — единственная точка входа платформы (экран загрузки → AF Access → AF Studio)
admin.html            — AF Admin (только роль admin, проверяется на сервере)
project.html, 404.html— редиректы старых/неизвестных URL внутрь защищённой платформы
styles.css            — оригинальные стили AF (без изменений)
css/platform.css      — дизайн-система платформы
images/               — оригинальные изображения проектов (без изменений)
js/
  config.js           — публичные параметры (URL Supabase, anon key, флаги)
  main.js             — загрузка, центральная проверка сессии, роутинг
  lib/supabase.js     — клиент, «Запомнить меня», подписанные URL, вызов функций
  core/               — auth, router (единый guard), i18n RU/EN, ui (безопасный html``), api, pricing, errors, theme
  auth/access.js      — экран AF Access (вход/регистрация/восстановление/подтверждение + 3D-сцена)
  app/shell.js        — сайдбар, шапка, центр уведомлений, мобильная навигация, онбординг
  views/              — Overview, Portfolio (+До/После), Services, AF AI, Builder, Calculator, 3D Lab,
                        My Projects (+детали: файлы, согласование, переписка, история), Files, Messages,
                        Favorites, Moodboard, Notifications, Settings
  components/         — chat.js (переписка, realtime), review.js (рендеры с метками)
  three/              — 10 детализированных процедурных 3D-моделей, студийное окружение, 3D-витрина главной
  legacy/widgets.js   — перенесённые виджеты оригинала (hero 3D, таймлайн процесса, карусель отзывов, tilt)
  admin/              — дашборд, заявки, обращения, пользователи, CRUD контента, цены, база знаний и настройки AI, журнал
  data/               — контент оригинального сайта (этапы процесса, «Обо мне»)
supabase/
  migrations/         — схема, RLS, Storage, сид-данные (перенесены 1:1 с сайта)
  functions/          — ai-chat, delete-account, notify
  dashboard/          — те же функции одним файлом для браузерного редактора Supabase
  check.sql, check-ai.sql, make-admin.sql — проверки и назначение администратора
tests/unit.test.mjs   — юнит-тесты чистой логики (`node --test tests/`)
docs/                 — AUDIT, SETUP (что настроить владельцу), UPDATE-2.1 (Telegram, Google, админка), SECURITY, TESTING
```

## Быстрый старт

1. Выполните шаги из [`docs/SETUP.md`](docs/SETUP.md) (≈30–40 минут).
2. Укажите `SUPABASE_URL` и `SUPABASE_ANON_KEY` в `js/config.js`.
3. Залейте содержимое папки в **новый** репозиторий `AF-STUDIO` и включите GitHub Pages.
4. Зарегистрируйтесь и назначьте себе роль администратора SQL-командой из SETUP.md.

Пока `js/config.js` не заполнен, сайт показывает только экран AF Access с уведомлением
о незавершённой настройке — платформа не открывается без настоящей авторизации.
