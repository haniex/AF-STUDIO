# Настройка AF STUDIO 2.0 — что нужно сделать владельцу

> Всё, что требует ваших аккаунтов и ключей, перечислено здесь. Без этих шагов платформа
> не открывается дальше экрана входа — это сделано намеренно (никакой фиктивной авторизации).

## 1. Проект Supabase
1. Создайте проект на [supabase.com](https://supabase.com) (регион ближе к клиентам, например Frankfurt).
2. **Project Settings → API**: скопируйте `Project URL` и `anon public` key → вставьте в `js/config.js`.
   `service_role` key **никуда в код не вставлять**.

## 2. База данных
Через Supabase CLI:
```bash
supabase link --project-ref <ref>
supabase db push          # применит supabase/migrations/* по порядку
```
или вставьте файлы по очереди в **SQL Editor**: `…0001_schema.sql` → `…0002_rls.sql` → `…0003_storage.sql` → `…0004_seed.sql` → `…0005_grants.sql`.

> `0005_grants.sql` обязателен: новые проекты Supabase не выдают API-ролям права на таблицы автоматически
> (без него — ошибка `42501 permission denied`). Проверка установки — `supabase/check.sql`.
> Отключите автоперевод страницы в браузере, иначе он «переводит» SQL.

## 3. Auth
**Authentication → URL Configuration**
- Site URL: `https://haniex.github.io/AF-STUDIO`
- Redirect URLs: `https://haniex.github.io/AF-STUDIO/**` (и `http://localhost:5500/**` для локальной разработки)

**Authentication → Providers → Email**
- Confirm email: **ON**
- Secure password change: ON; минимальная длина пароля: 8
- **Authentication → Rate Limits** — оставьте значения по умолчанию или ужесточите.

**SMTP (обязательно для продакшена)**: встроенная почта Supabase имеет жёсткий лимит писем.
Подключите свой SMTP (Resend / Postmark / Яндекс 360) в **Authentication → SMTP Settings**.
Шаблоны писем (подтверждение, сброс) можно оформить в стиле AF в **Email Templates**.

**Google OAuth (опционально)**: Providers → Google → Client ID/Secret из Google Cloud Console,
затем `FEATURES.googleOAuth: true` в `js/config.js`.

## 4. Первый администратор
1. Зарегистрируйтесь на сайте и подтвердите email.
2. В SQL Editor:
```sql
insert into public.user_roles(user_id, role)
select id, 'admin' from auth.users where email = 'enemy1032@gmail.com'
on conflict do nothing;
```
Дальнейшие роли назначаются в AF Admin → Пользователи (проверка на сервере, `admin_set_role`).

## 5. Edge Functions и секреты

**Через браузер (без CLI):** Edge Functions → Deploy a new function → Via Editor → имя `ai-chat` /
`delete-account` → вставить файл из `supabase/dashboard/` → Deploy → в настройках функции **отключить Verify JWT**
(функции сами проверяют пользователя). Секреты: Edge Functions → Secrets:
`GEMINI_API_KEY`, `ALLOWED_ORIGINS=https://haniex.github.io`, `AF_SERVICE_KEY` = ключ `sb_secret_…`
из Project Settings → API Keys (нужен, если устаревший service_role отключён).

**Через CLI:**
```bash
supabase functions deploy ai-chat
supabase functions deploy delete-account
supabase functions deploy notify --no-verify-jwt
supabase secrets set GEMINI_API_KEY=...            # https://aistudio.google.com/apikey
supabase secrets set ALLOWED_ORIGINS=https://haniex.github.io
supabase secrets set SITE_URL=https://haniex.github.io/AF-STUDIO
# email-уведомления (опционально):
supabase secrets set RESEND_API_KEY=... MAIL_FROM="AF Studio <studio@ваш-домен>" WEBHOOK_SECRET=<случайная строка>
```
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` Edge Functions получают автоматически.

**Модель AI.** По умолчанию `gemini-3.5-flash-lite` (по документации Google на ноябрь 2026 рекомендована
для новых проектов наряду с `gemini-3.8-flash`). Модель, лимиты (по умолчанию 40 запросов/день и 6/мин
на пользователя) и доп. инструкции меняются в AF Admin → Настройки AI. Перед запуском сверьте актуальные
цены и условия на ai.google.dev — на бесплатном тарифе Google может использовать данные запросов для улучшения моделей.

## 6. Email-уведомления о событиях
**Database → Webhooks → Create**: таблица `public.notifications`, событие `INSERT`,
тип «Supabase Edge Function» → `notify`, заголовок `x-webhook-secret: <WEBHOOK_SECRET>`.
Без `RESEND_API_KEY` функция ничего не отправляет (уведомления в платформе работают всегда).

## 7. Realtime
Миграция добавляет `notifications`, `messages`, `review_comments` в публикацию `supabase_realtime`.
Проверьте в **Database → Publications**, что они включены.

## 8. Деплой на GitHub Pages (новый отдельный сайт)
Старый сайт `haniex.github.io/ENEM1` не трогаем — AF STUDIO живёт в своём репозитории.
1. GitHub → **New repository** → имя `AF-STUDIO` → Public → Create.
2. Загрузите в корень всё содержимое папки `AF-STUDIO-2.0` (включая `.nojekyll`).
3. Settings → Pages → Deploy from branch `main` / `/ (root)`.
4. Адрес сайта: `https://haniex.github.io/AF-STUDIO/`. Адрес определяется автоматически, поэтому при другом
   имени репозитория или своём домене код менять не нужно — только Site URL / Redirect URLs в Supabase.
5. **Не публикуйте ссылку клиентам**, пока не пройдён чек-лист `docs/TESTING.md`.

## 9. Контент, который должен подтвердить владелец
| Что | Где | Почему |
|---|---|---|
| Коэффициенты цен с пометкой UNCONFIRMED | AF Admin → Цены / Коэффициенты | Опорные цены взяты из FAQ сайта; доплаты за ракурсы/объекты/анимацию — начальные значения. После проверки отметьте «Подтверждено владельцем» — пропадёт предупреждение в калькуляторе |
| 3 отзыва | AF Admin → Отзывы | Перенесены с сайта как есть — снимите с публикации, если они не реальные |
| Обложка Aether Guardian | AF Admin → Портфолио | Сейчас стоковое фото Unsplash |
| До / После | AF Admin → До / После | Пусто намеренно — только реальные материалы (исходник, черновик, рендер) |
| 3D-модели | AF Admin → 3D-модели | Загрузите GLB/GLTF; до этого 3D Lab показывает демо-объекты с пометкой «Демо» |
| Условия и политика конфиденциальности | `js/core/i18n.js` → `access.termsText/privacyText` | Краткий текст-заготовка — замените юридически выверенным |

## 10. Изображения портфолио (опционально, максимальная закрытость)
Файлы в `images/` на GitHub Pages физически доступны по прямой ссылке (это статический хостинг).
Тексты и структура портфолио уже закрыты (БД + RLS). Чтобы закрыть и сами картинки:
загрузите их в AF Admin → Портфолио (бакет `portfolio-media`, приватный), затем удалите `images/` из репозитория.


## AF STUDIO 3.0 — Settings Center и лимиты AF AI

1. SQL Editor (автоперевод страницы выключить): по очереди выполнить
   `supabase/migrations/20261126000001_user_preferences.sql` и `supabase/migrations/20261126000002_ai_quota.sql`
   — в конце каждого файла проверочная строка, все значения должны быть `true`.
2. Edge Functions → **ai-chat** → вставить `supabase/dashboard/ai-chat.ts` → Deploy (Verify JWT OFF).
3. Edge Functions → **notify** → вставить `supabase/dashboard/notify.ts` (v4) → Deploy (Verify JWT OFF).
4. Проверка: `supabase/tests/3.0-settings-quota.test.sql` → `all_tests_passed = true` (выполняется с ROLLBACK).

Новые секреты не нужны. Подробности — `docs/AF-3.0-REPORT.md`.


## AF AI 3.1 и восстановление пароля

1. SQL Editor → `supabase/migrations/20261126000003_ai_scope.sql` → все флаги `true`.
2. Edge Functions → **ai-chat** → вставить `supabase/dashboard/ai-chat.ts` → Deploy (Verify JWT OFF).
   Изменение файла в архиве само по себе опубликованную функцию не меняет.
3. Authentication → Emails → **Reset Password** ← `supabase/email-templates/reset-password.html`
   (по желанию Confirm signup ← `confirm-signup.html`). Site URL = `https://haniex.github.io/AF-STUDIO`.
4. Authentication → Rate Limits — поднять лимиты входа и проверки кодов; для писем подключить SMTP.

Подробности — `docs/AF-AI-3.1-REPORT.md`.


## AF AI 3.2 — интернет-поиск
1. SQL Editor → `supabase/migrations/20261126000004_ai_web.sql`.
2. Edge Functions → ai-chat → вставить `supabase/dashboard/ai-chat.ts` → Deploy.
Поиск включается/выключается в AF Admin → AI Settings. Подробности — `docs/AF-AI-3.1-REPORT.md` (раздел 3.2).
