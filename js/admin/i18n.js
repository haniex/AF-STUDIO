// Admin-only UI strings (RU/EN)
import { getLang } from '../core/i18n.js';

const D = {
  ru: {
    denied: 'Доступ запрещён', deniedText: 'Эта панель доступна только администраторам AF STUDIO.',
    nav: { dashboard: 'Дашборд', projects: 'Заявки и проекты', messages: 'Обращения', users: 'Пользователи', portfolio: 'Портфолио', beforeAfter: 'До / После',
      labModels: '3D-модели', services: 'Услуги', pricing: 'Цены', factors: 'Коэффициенты', reviews: 'Отзывы', kb: 'База знаний AI', ai: 'Настройки AI', audit: 'Журнал действий', content: 'Контент' },
    kpi: { new_requests: 'Новые заявки', active_projects: 'Активные проекты', done_projects: 'Завершённые', new_users_7d: 'Новые пользователи (7 дн.)', unanswered: 'Без ответа', users_total: 'Всего пользователей', ai_requests_today: 'AI-запросов сегодня' },
    activity: 'Активность за 30 дней', lProjects: 'Заявки', lMessages: 'Сообщения', lUsers: 'Регистрации', lAi: 'AI', recent: 'Последние заявки', unansweredList: 'Ожидают ответа',
    search: 'Поиск по имени или email', role: 'Роль', admin: 'Администратор', client: 'Клиент', makeAdmin: 'Сделать админом', revokeAdmin: 'Снять права',
    roleConfirm: 'Изменить роль пользователя {email}?', registered: 'Регистрация', projectsCount: 'Проектов', client2: 'Клиент', contact: 'Контакты',
    changeStatus: 'Изменить статус', statusNote: 'Комментарий для клиента (необязательно)', edit: 'Редактировать', uploadFile: 'Загрузить файл', fileKind: 'Тип файла',
    newRound: 'Новая версия на согласование', roundTitle: 'Название версии', all: 'Все', open: 'Открытые', closed: 'Закрытые', close: 'Закрыть обращение', reopen: 'Открыть снова',
    newItem: 'Добавить', save: 'Сохранить', deleteConfirm: 'Удалить запись?', saved: 'Сохранено', id: 'ID (slug)', empty: 'Записей нет',
    aiEnabled: 'AI включён', aiModel: 'Модель Gemini', aiDaily: 'Лимит запросов в день на пользователя', aiMinute: 'Лимит запросов в минуту', aiMaxChars: 'Макс. длина сообщения',
    aiExtra: 'Дополнительные инструкции для AI', aiUsage: 'Использование по дням', confirmed: 'Подтверждено владельцем', uploadReplace: 'Загрузить',
    publish: 'Опубликовано', when: 'Когда', who: 'Кто', action: 'Действие', entity: 'Объект',
  },
  en: {
    denied: 'Access denied', deniedText: 'This panel is available to AF STUDIO administrators only.',
    nav: { dashboard: 'Dashboard', projects: 'Requests & projects', messages: 'Inbox', users: 'Users', portfolio: 'Portfolio', beforeAfter: 'Before / After',
      labModels: '3D models', services: 'Services', pricing: 'Pricing', factors: 'Coefficients', reviews: 'Reviews', kb: 'AI knowledge base', ai: 'AI settings', audit: 'Audit log', content: 'Content' },
    kpi: { new_requests: 'New requests', active_projects: 'Active projects', done_projects: 'Completed', new_users_7d: 'New users (7d)', unanswered: 'Unanswered', users_total: 'Total users', ai_requests_today: 'AI requests today' },
    activity: 'Activity, last 30 days', lProjects: 'Requests', lMessages: 'Messages', lUsers: 'Sign-ups', lAi: 'AI', recent: 'Latest requests', unansweredList: 'Awaiting reply',
    search: 'Search by name or email', role: 'Role', admin: 'Administrator', client: 'Client', makeAdmin: 'Make admin', revokeAdmin: 'Revoke admin',
    roleConfirm: 'Change role of {email}?', registered: 'Registered', projectsCount: 'Projects', client2: 'Client', contact: 'Contacts',
    changeStatus: 'Change status', statusNote: 'Note for the client (optional)', edit: 'Edit', uploadFile: 'Upload file', fileKind: 'File type',
    newRound: 'New version for approval', roundTitle: 'Version title', all: 'All', open: 'Open', closed: 'Closed', close: 'Close thread', reopen: 'Reopen',
    newItem: 'Add', save: 'Save', deleteConfirm: 'Delete this record?', saved: 'Saved', id: 'ID (slug)', empty: 'No records',
    aiEnabled: 'AI enabled', aiModel: 'Gemini model', aiDaily: 'Daily requests per user', aiMinute: 'Requests per minute', aiMaxChars: 'Max message length',
    aiExtra: 'Additional AI instructions', aiUsage: 'Usage per day', confirmed: 'Confirmed by owner', uploadReplace: 'Upload',
    publish: 'Published', when: 'When', who: 'Who', action: 'Action', entity: 'Entity',
  },
};
export function a(key, vars) {
  let v = key.split('.').reduce((o, k) => (o ? o[k] : undefined), D[getLang()]) ?? key.split('.').reduce((o, k) => (o ? o[k] : undefined), D.ru) ?? key;
  if (vars && typeof v === 'string') v = v.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  return v;
}
