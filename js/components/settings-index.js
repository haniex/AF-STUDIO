// =====================================================================
// AF SETTINGS CENTER — search index (single source of truth for labels).
// Works fully offline. Never indexes personal values (email, names, files).
// status: 'active' — works now · 'device' — stored on this device only
//         'info' — information / action · 'soon' — announced, not active
// =====================================================================

export const SC_CATEGORIES = [
  { id: 'account', icon: 'user', ru: 'Аккаунт', en: 'Account', d_ru: 'Профиль, аватар, email и способ входа', d_en: 'Profile, avatar, email and sign-in method' },
  { id: 'notifications', icon: 'bell', ru: 'Уведомления', en: 'Notifications', d_ru: 'Каналы, категории, звук и тихие часы', d_en: 'Channels, categories, sound and quiet hours' },
  { id: 'ai', icon: 'ai', ru: 'AF AI и лимиты', en: 'AF AI & usage', d_ru: 'Расход запросов и персональные настройки AI', d_en: 'Request usage and personal AI preferences' },
  { id: 'appearance', icon: 'palette', ru: 'Внешний вид', en: 'Appearance', d_ru: 'Тема, язык, текст, плотность, акцент и эффекты', d_en: 'Theme, language, text, density, accent and effects' },
  { id: 'workspace', icon: 'layers', ru: 'Рабочее пространство', en: 'Workspace', d_ru: 'Стартовая страница, списки, сортировка и Обзор', d_en: 'Start page, lists, sorting and Overview' },
  { id: 'security', icon: 'shield', ru: 'Безопасность', en: 'Security', d_ru: 'Пароль, подтверждение email и сеансы', d_en: 'Password, email confirmation and sessions' },
  { id: 'data', icon: 'download', ru: 'Данные и приватность', en: 'Data & privacy', d_ru: 'Экспорт, история AI и удаление аккаунта', d_en: 'Export, AI history and account deletion' },
  { id: 'experimental', icon: 'spark', ru: 'Экспериментальные', en: 'Experimental', d_ru: 'Необязательные эффекты и звуки интерфейса', d_en: 'Optional effects and interface sounds' },
];

const e = (id, category, ru, en, d_ru, d_en, k_ru = '', k_en = '', status = 'active') =>
  ({ id, category, label_ru: ru, label_en: en, description_ru: d_ru, description_en: d_en, keywords_ru: k_ru, keywords_en: k_en, selector: `[data-sid="${id}"]`, status });

export const SETTINGS_INDEX = [
  // ---------------------------------------------------------------- account
  e('account.avatar', 'account', 'Аватар', 'Avatar', 'Фото профиля: JPG, PNG или WEBP до 2 МБ', 'Profile photo: JPG, PNG or WEBP up to 2 MB', 'фото картинка изображение профиль аватарка', 'photo picture image profile userpic'),
  e('account.name', 'account', 'Имя', 'Name', 'Как к вам обращаться на платформе', 'How the platform addresses you', 'имя фамилия ник профиль обращение', 'name full name nickname profile'),
  e('account.email', 'account', 'Email и смена адреса', 'Email & change address', 'Адрес для входа и писем. Смена подтверждается письмом', 'Sign-in and mail address. Changes are confirmed by email', 'почта адрес емейл мейл сменить почту', 'mail address change email'),
  e('account.provider', 'account', 'Способ входа', 'Sign-in method', 'Email и пароль или Google', 'Email & password or Google', 'google гугл oauth провайдер вход', 'google oauth provider login'),
  e('account.role', 'account', 'Тип аккаунта', 'Account type', 'Клиент или администратор студии', 'Client or studio administrator', 'роль админ администратор клиент', 'role admin client', 'info'),
  // ---------------------------------------------------------------- notifications
  e('notif.inapp', 'notifications', 'Уведомления в платформе', 'In-app notifications', 'Общий переключатель: события появляются в центре уведомлений', 'Master switch: events appear in the notification center', 'колокольчик оповещения внутри платформы', 'bell alerts inside'),
  e('notif.email', 'notifications', 'Email-уведомления', 'Email notifications', 'Общий переключатель писем о событиях', 'Master switch for event emails', 'почта письма рассылка', 'mail letters emails'),
  e('notif.project_updates', 'notifications', 'Проекты и статусы', 'Projects & statuses', 'Новые заявки, смена этапа, завершение проекта', 'New requests, stage changes, project completion', 'проект статус этап заказ', 'project status stage order'),
  e('notif.messages', 'notifications', 'Сообщения', 'Messages', 'Новые ответы студии в переписке', 'New studio replies in conversations', 'чат переписка ответ сообщение', 'chat conversation reply message'),
  e('notif.approvals', 'notifications', 'Согласования и комментарии', 'Approvals & comments', 'Запросы согласования рендеров и комментарии к ним', 'Render approval requests and review comments', 'рендер согласование правки ревью комментарий', 'render approval review revision comment'),
  e('notif.sound', 'notifications', 'Звук уведомлений', 'Notification sound', 'Короткий сигнал при новом событии', 'A short chime for new events', 'звук сигнал громкость мелодия', 'sound chime audio volume'),
  e('notif.browser', 'notifications', 'Системные уведомления браузера', 'Browser notifications', 'Показывать уведомление ОС, когда вкладка в фоне', 'Show an OS notification when the tab is in the background', 'пуш push системные браузер рабочий стол', 'push system desktop browser'),
  e('notif.quiet', 'notifications', 'Тихие часы', 'Quiet hours', 'Без всплывающих окон, звука и некритичных писем в выбранное время', 'No pop-ups, sound or non-critical emails during chosen hours', 'не беспокоить ночь сон тишина режим', 'do not disturb night sleep silence dnd'),
  e('notif.upcoming', 'notifications', 'Файлы, AI, новости и дайджест', 'Files, AI, news & digest', 'Будут включены в Notifications 2.0', 'Will be activated in Notifications 2.0', 'сводка дайджест новости файлы', 'digest summary news files', 'soon'),
  // ---------------------------------------------------------------- ai
  e('ai.usage_daily', 'ai', 'Дневной лимит AF AI', 'AF AI daily limit', 'Использовано, осталось и время сброса', 'Used, remaining and reset time', 'лимит квота запросы остаток сброс сегодня расход статистика', 'limit quota requests remaining reset today usage stats', 'info'),
  e('ai.usage_minute', 'ai', 'Минутный лимит AF AI', 'AF AI per-minute limit', 'Сколько запросов доступно в ближайшие 60 секунд', 'How many requests are available in the next 60 seconds', 'лимит минута частота скорость остаток', 'limit minute rate speed remaining', 'info'),
  e('ai.style', 'ai', 'Стиль ответов', 'Response style', 'Краткий, сбалансированный или подробный', 'Concise, balanced or detailed', 'длина подробность кратко развёрнуто', 'length verbosity short long'),
  e('ai.language', 'ai', 'Язык ответов AI', 'AI response language', 'Автоматически, русский или английский', 'Automatic, Russian or English', 'язык русский английский', 'language russian english'),
  e('ai.default_mode', 'ai', 'Режим по умолчанию', 'Default mode', 'Диалог, ТЗ или смета при открытии AF AI', 'Chat, brief or estimate when AF AI opens', 'режим тз смета диалог', 'mode brief estimate chat'),
  e('ai.save_history', 'ai', 'Сохранять историю диалогов', 'Save chat history', 'Выключите, чтобы новые диалоги не сохранялись на сервере', 'Turn off so new chats are not stored on the server', 'история диалоги приватность хранение', 'history chats privacy storage'),
  e('ai.project_context', 'ai', 'Контекст моих проектов', 'My projects as context', 'AI видит названия и статусы ваших 5 последних проектов', 'AI sees titles and statuses of your 5 latest projects', 'контекст проекты знания', 'context projects knowledge'),
  e('ai.moodboard_images', 'ai', 'Изображения мудборда в анализе', 'Moodboard images in analysis', 'Передавать картинки мудборда модели при нажатии «Анализ»', 'Send moodboard pictures to the model when you press “Analyze”', 'изображения картинки фото мудборд анализ', 'images pictures photos moodboard analysis'),
  e('ai.extended_stats', 'ai', 'Расширенная статистика в чате', 'Extended stats in chat', 'Показывать минутный лимит рядом с полем ввода', 'Show the per-minute limit next to the input', 'статистика минута индикатор', 'stats minute indicator'),
  // ---------------------------------------------------------------- appearance
  e('app.theme', 'appearance', 'Тема интерфейса', 'Interface theme', 'Тёмная или светлая — синхронизируется между устройствами', 'Dark or light — synced across devices', 'тема цвет тёмная светлая ночь день режим', 'theme color dark light night day mode'),
  e('app.language', 'appearance', 'Язык интерфейса', 'Interface language', 'Русский или английский', 'Russian or English', 'язык русский английский перевод', 'language russian english translation'),
  e('app.text_scale', 'appearance', 'Размер текста', 'Text size', '90%, 100%, 110% или 120%', '90%, 100%, 110% or 120%', 'шрифт размер масштаб крупнее мельче', 'font size scale bigger smaller zoom'),
  e('app.density', 'appearance', 'Плотность интерфейса', 'Interface density', 'Просторно или компактно', 'Comfortable or compact', 'компактность отступы плотность', 'compact spacing density'),
  e('app.contrast', 'appearance', 'Контраст', 'Contrast', 'Стандартный или повышенный для лучшей читаемости', 'Standard or high for better legibility', 'контраст читаемость доступность', 'contrast legibility accessibility'),
  e('app.card_style', 'appearance', 'Стиль карточек', 'Card style', 'Стандартные или минималистичные', 'Default or minimal', 'карточки рамки тени', 'cards borders shadows'),
  e('app.sidebar', 'appearance', 'Компактная боковая панель', 'Compact sidebar', 'Только иконки слева. Кнопка в шапке меню или клавиша [', 'Icons only on the left. Button in the menu header or the [ key', 'меню панель свернуть сайдбар иконки навигация', 'menu panel collapse sidebar icons navigation'),
  e('app.accent', 'appearance', 'Цветовой акцент', 'Accent colour', 'Золото, шампань, бронза или платина', 'Gold, champagne, bronze or platinum', 'цвет акцент золото бронза оттенок', 'color colour accent gold bronze tint'),
  e('app.tooltips', 'appearance', 'Всплывающие подсказки', 'Tooltips', 'Подписи к иконкам компактного меню', 'Labels for icons of the compact menu', 'подсказки тултипы подписи', 'tooltips hints labels'),
  e('app.hover', 'appearance', 'Эффекты наведения', 'Hover effects', 'Подсветка и сдвиг карточек при наведении', 'Glow and lift of cards on hover', 'наведение подсветка ховер', 'hover glow highlight'),
  e('app.fx', 'appearance', 'Анимации', 'Animations', 'Полные или минимальные — для этого устройства', 'Full or minimal — for this device', 'анимация движение плавность уменьшить', 'animation motion reduce', 'device'),
  e('app.q3d', 'appearance', 'Качество 3D', '3D quality', 'Высокое, среднее или экономия — для этого устройства', 'High, medium or saver — for this device', '3д 3d графика качество webgl производительность', '3d graphics quality webgl performance', 'device'),
  e('app.glow', 'appearance', 'Свечение за курсором', 'Cursor glow', 'Мягкая подсветка за указателем — для этого устройства', 'Soft glow behind the pointer — for this device', 'курсор свечение мышь', 'cursor glow mouse', 'device'),
  // ---------------------------------------------------------------- workspace
  e('ws.start_page', 'workspace', 'Стартовая страница', 'Start page', 'Что открывается при входе без конкретной ссылки', 'What opens when you sign in without a specific link', 'старт главная домашняя открывать', 'start home landing open'),
  e('ws.projects_view', 'workspace', 'Вид проектов', 'Projects view', 'Карточки или список', 'Cards or list', 'сетка список проекты вид', 'grid list projects view'),
  e('ws.projects_sort', 'workspace', 'Сортировка проектов', 'Projects sorting', 'По обновлению, созданию, названию или этапу', 'By update, creation, name or stage', 'сортировка порядок проекты', 'sort order projects'),
  e('ws.files_view', 'workspace', 'Вид файлов', 'Files view', 'Список или плитка', 'List or tiles', 'файлы плитка список', 'files tiles list'),
  e('ws.files_sort', 'workspace', 'Сортировка файлов', 'Files sorting', 'По дате, названию или размеру', 'By date, name or size', 'сортировка файлы размер дата', 'sort files size date'),
  e('ws.page_size', 'workspace', 'Размер списка', 'List size', 'Сколько элементов показывать до кнопки «Показать ещё»', 'How many items to show before “Show more”', 'количество карточек страница пагинация', 'count cards page pagination'),
  e('ws.remember_filters', 'workspace', 'Запоминать фильтры', 'Remember filters', 'Проекты и файлы откроются с последним выбранным фильтром', 'Projects and files reopen with the last chosen filter', 'фильтр запомнить', 'filter remember'),
  e('ws.project_tab', 'workspace', 'Вкладка проекта по умолчанию', 'Default project tab', 'Какая вкладка открывается в карточке проекта', 'Which tab opens in a project', 'вкладка проект файлы согласование', 'tab project files review'),
  e('ws.ov_stats', 'workspace', 'Обзор: статистика', 'Overview: statistics', 'Четыре счётчика в начале Обзора', 'The four counters at the top of Overview', 'обзор статистика счётчики виджеты', 'overview statistics counters widgets'),
  e('ws.ov_quick', 'workspace', 'Обзор: быстрые действия', 'Overview: quick actions', 'Виджет с кнопками AI, калькулятора, 3D Lab и конструктора', 'Widget with AI, calculator, 3D Lab and builder buttons', 'быстрые действия кнопки виджет', 'quick actions buttons widget'),
  e('ws.ov_activity', 'workspace', 'Обзор: последние действия', 'Overview: recent activity', 'Лента последних событий', 'Feed of recent events', 'последние действия события лента', 'recent activity events feed'),
  e('ws.ov_favorites', 'workspace', 'Обзор: избранное', 'Overview: favorites', 'Галерея избранных работ', 'Gallery of favorite works', 'избранное галерея', 'favorites gallery'),
  e('ws.ov_ai', 'workspace', 'Обзор: баннер AF AI', 'Overview: AF AI banner', 'Карточка-приглашение в AF AI', 'Invitation card to AF AI', 'баннер ai реклама', 'banner ai promo'),
  e('ws.ov_about', 'workspace', 'Обзор: о студии', 'Overview: about the studio', 'Компактный блок о студии', 'Compact studio block', 'о студии информация', 'about studio info'),
  e('ws.kbd_hints', 'workspace', 'Подсказки клавиатурных комбинаций', 'Keyboard shortcut hints', 'Показывать сочетания клавиш в меню', 'Show shortcuts in menus', 'клавиши горячие сочетания хоткеи клавиатура', 'keys hotkeys shortcuts keyboard'),
  // ---------------------------------------------------------------- security
  e('security.password', 'security', 'Смена пароля', 'Change password', 'Требуется текущий пароль', 'Current password required', 'пароль сменить безопасность защита', 'password change security protection'),
  e('security.email_status', 'security', 'Подтверждение email', 'Email confirmation', 'Статус подтверждения адреса', 'Address confirmation status', 'подтверждение верификация почта', 'confirmation verification mail', 'info'),
  e('security.sessions', 'security', 'Сеансы и входы', 'Sessions & sign-ins', 'Дата регистрации, последний вход, выход на всех устройствах', 'Registration date, last sign-in, sign out everywhere', 'выход сеанс устройства последний вход выйти везде', 'logout session devices last login sign out everywhere'),
  e('security.mfa', 'security', 'Двухфакторная защита', 'Two-factor protection', 'Будет доступна в следующем обновлении AF STUDIO', 'Coming in the next AF STUDIO update', '2fa mfa totp двухфакторная код', '2fa mfa totp two-factor code', 'soon'),
  // ---------------------------------------------------------------- data
  e('data.export', 'data', 'Экспорт моих данных', 'Export my data', 'JSON со всеми вашими данными и настройками', 'JSON with all your data and preferences', 'экспорт скачать выгрузка json резервная копия', 'export download backup json'),
  e('data.stored', 'data', 'Какие данные хранятся', 'What data is stored', 'Что мы храним, зачем и как это удалить', 'What we store, why, and how to delete it', 'приватность конфиденциальность данные хранение', 'privacy data storage', 'info'),
  e('data.ai_history', 'data', 'Удалить историю AF AI', 'Delete AF AI history', 'Удалить все диалоги с AI без возможности восстановления', 'Delete all AI chats permanently', 'история ai удалить диалоги очистить', 'history ai delete chats clear'),
  e('data.stats', 'data', 'Статистика аккаунта', 'Account statistics', 'Сколько проектов, файлов и диалогов в аккаунте', 'How many projects, files and chats your account has', 'статистика количество', 'statistics count', 'info'),
  e('data.delete', 'data', 'Удалить аккаунт', 'Delete account', 'Безвозвратно удалить аккаунт и все данные', 'Permanently delete the account and all data', 'удалить аккаунт стереть', 'delete account erase remove'),
  // ---------------------------------------------------------------- experimental
  e('exp.reveal', 'experimental', 'Анимация появления', 'Entrance animation', 'Плавное появление карточек при прокрутке', 'Cards fade in as you scroll', 'анимация появление прокрутка', 'animation appear scroll reveal'),
  e('exp.ripple', 'experimental', 'Волна при нажатии', 'Press ripple', 'Световая волна на кнопках', 'Light ripple on buttons', 'волна клик кнопки эффект', 'ripple click buttons effect'),
  e('exp.scroll_progress', 'experimental', 'Индикатор прокрутки', 'Scroll progress line', 'Золотая линия прогресса сверху страницы', 'Gold progress line at the top of the page', 'прогресс прокрутка линия', 'progress scroll line'),
  e('exp.ui_sounds', 'experimental', 'Звуки интерфейса', 'Interface sounds', 'Тихий щелчок при нажатии кнопок', 'A soft tick when pressing buttons', 'звук щелчок клик', 'sound tick click'),
  e('exp.hero_hint', 'experimental', 'Подсказка на 3D-фоне', 'Hint on the 3D background', 'Надпись «Нажмите на фон» на Обзоре', '“Tap the background” hint on Overview', 'подсказка 3д фон обзор', 'hint 3d background overview'),
  e('exp.onboarding', 'experimental', 'Обучающий тур', 'Welcome tour', 'Показать приветственное обучение ещё раз', 'Show the welcome tour again', 'обучение приветствие тур подсказки', 'onboarding welcome tour tips', 'info'),
];

// ---------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------
const EN = 'qwertyuiop[]asdfghjkl;\'zxcvbnm,.`';
const RU = 'йцукенгшщзхъфывапролджэячсмитьбюё';
const swapLayout = (s) => [...s].map((c) => { const i = EN.indexOf(c); if (i >= 0) return RU[i]; const j = RU.indexOf(c); return j >= 0 ? EN[j] : c; }).join('');

export const normalize = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е')
  .replace(/3д/g, '3d').replace(/[^\p{L}\p{N}\s]+/gu, ' ').replace(/\s+/g, ' ').trim();

const SYN = { цвет: 'акцент тема', color: 'accent theme', colour: 'accent theme', темн: 'тема', dark: 'theme', лимит: 'квота', limit: 'quota',
  уведомлен: 'оповещения', alert: 'notification', меню: 'панель', menu: 'sidebar', шрифт: 'текст', font: 'text', выйти: 'выход', logout: 'sign out' };

const haystack = (it, cat) => {
  const f = (x) => normalize(x);
  return {
    label: f(`${it.label_ru} ${it.label_en}`),
    kw: f(`${it.keywords_ru} ${it.keywords_en}`),
    desc: f(`${it.description_ru} ${it.description_en}`),
    cat: f(`${cat?.ru || ''} ${cat?.en || ''}`),
  };
};
const CACHE = new Map();
function hay(it) {
  if (!CACHE.has(it.id)) CACHE.set(it.id, haystack(it, SC_CATEGORIES.find((c) => c.id === it.category)));
  return CACHE.get(it.id);
}
const words = (s) => s.split(' ').filter(Boolean);
function scoreTokens(tokens, h) {
  let total = 0;
  for (const tk of tokens) {
    let best = 0;
    const test = (text, w) => {
      for (const word of words(text)) {
        if (word === tk) best = Math.max(best, w * 1.4);
        else if (word.startsWith(tk)) best = Math.max(best, w * 1.15);
        else if (tk.length >= 4 && word.startsWith(tk.slice(0, -1))) best = Math.max(best, w * 0.9); // simple stemming
        else if (tk.length >= 3 && word.includes(tk)) best = Math.max(best, w * 0.6);
      }
    };
    test(h.label, 3); test(h.kw, 2.2); test(h.desc, 1); test(h.cat, 0.8);
    if (!best) return 0; // every token must match somewhere
    total += best;
  }
  return total;
}

/** → [{ item, score }] best first. Instant, offline. */
export function searchSettings(query, { index = SETTINGS_INDEX } = {}) {
  const q = normalize(query);
  if (!q) return [];
  const variants = [q];
  const swapped = normalize(swapLayout(String(query).toLowerCase()));
  if (swapped && swapped !== q) variants.push(swapped);
  const withSyn = (v) => {
    const extra = Object.entries(SYN).filter(([k]) => v.includes(k)).map(([, s]) => s).join(' ');
    return extra ? [v, `${extra}`] : [v];
  };
  const results = [];
  for (const it of index) {
    const h = hay(it);
    let s = 0;
    for (const v of variants) for (const vv of withSyn(v)) s = Math.max(s, scoreTokens(words(vv), h) * (vv === v ? 1 : 0.8));
    if (s > 0) results.push({ item: it, score: s });
  }
  return results.sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));
}

/** Group results by category, categories in menu order. */
export function groupResults(results) {
  const order = SC_CATEGORIES.map((c) => c.id);
  const map = new Map();
  results.forEach((r) => { if (!map.has(r.item.category)) map.set(r.item.category, []); map.get(r.item.category).push(r); });
  return [...map.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0])).map(([category, items]) => ({ category, items }));
}
