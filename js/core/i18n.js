// AF STUDIO — i18n (RU/EN). Static UI strings live here; DB content uses *_ru / *_en columns.
const DICT = {
  ru: {
    brand: { studio: 'AF STUDIO', tagline: 'Платформа 3D-визуализации' },
    common: {
      close: 'Закрыть', cancel: 'Отмена', confirm: 'Подтвердить', save: 'Сохранить', saved: 'Сохранено', delete: 'Удалить',
      edit: 'Изменить', create: 'Создать', open: 'Открыть', back: 'Назад', next: 'Далее', send: 'Отправить', wait: 'Подождите…',
      loading: 'Загрузка…', retry: 'Повторить', search: 'Поиск', all: 'Все', yes: 'Да', no: 'Нет', or: 'или', copy: 'Копировать',
      copied: 'Скопировано', upload: 'Загрузить', download: 'Скачать', errorTitle: 'Что-то пошло не так', viewAll: 'Смотреть все',
      new: 'Новое', demo: 'Демо', optional: 'необязательно', required: 'обязательно', today: 'сегодня', more: 'Ещё', none: 'Нет данных',
      add: 'Добавить', apply: 'Применить', reset: 'Сбросить', preview: 'Предпросмотр', details: 'Подробнее', remove: 'Убрать',
    },
    boot: { checking: 'Проверяем доступ…', secure: 'Защищённое соединение' },
    access: {
      kicker: 'AF ACCESS', title1: 'Создавайте.', title2: 'Исследуйте.', title3: 'Воплощайте.',
      lead: 'Закрытая платформа AF STUDIO: портфолио, AF AI, конструктор проектов, расчёт стоимости и личный кабинет — в одном пространстве.',
      f1: 'Личный кабинет и статусы проектов', f2: 'AF AI — консультации и ТЗ', f3: 'Согласование рендеров с метками',
      login: 'Вход', register: 'Регистрация', email: 'Email', password: 'Пароль', password2: 'Повторите пароль', name: 'Имя',
      showPwd: 'Показать пароль', hidePwd: 'Скрыть пароль', remember: 'Запомнить меня', forgot: 'Забыли пароль?',
      loginBtn: 'ВОЙТИ В AF STUDIO', registerBtn: 'СОЗДАТЬ АККАУНТ', google: 'Продолжить с Google',
      noAccount: 'Нет аккаунта?', haveAccount: 'Уже есть аккаунт?', toRegister: 'Создать', toLogin: 'Войти',
      consent: 'Я принимаю {terms} и {privacy}', terms: 'условия использования', privacy: 'политику конфиденциальности',
      welcomeBack: 'С возвращением', createTitle: 'Создайте аккаунт', loginSub: 'Войдите, чтобы открыть платформу.',
      registerSub: 'Пара минут — и вы в AF STUDIO.',
      forgotTitle: 'Восстановление пароля', forgotSub: 'Отправим на email безопасную ссылку для сброса пароля.',
      sendLink: 'Отправить ссылку', backToLogin: '← Вернуться ко входу',
      forgotSent: 'Если аккаунт с таким email существует, письмо уже в пути. Проверьте папку «Спам».',
      resetTitle: 'Новый пароль', resetSub: 'Придумайте новый пароль для аккаунта.', resetBtn: 'Сохранить пароль',
      resetDone: 'Пароль изменён. Добро пожаловать!',
      confirmTitle: 'Подтвердите email', confirmSub: 'Мы отправили письмо на {email}. Перейдите по ссылке в письме — после этого вход станет доступен.',
      resend: 'Отправить письмо ещё раз', resent: 'Письмо отправлено повторно.', resendIn: 'Повторная отправка через {s} с',
      confirmed: 'Email подтверждён. Войдите в аккаунт.', entering: 'Открываем AF STUDIO…',
      strength: ['Слабый', 'Средний', 'Хороший', 'Надёжный'],
      notConfigured: 'Платформа ещё не подключена к серверу. Владельцу сайта нужно указать параметры Supabase в js/config.js (см. docs/SETUP.md).',
      secureNote: 'Данные защищены шифрованием и правилами доступа на сервере.',
      termsText: 'Используя AF STUDIO, вы соглашаетесь, что материалы, загруженные в платформу, используются только для работы над вашими проектами. Сроки и стоимость фиксируются после согласования брифа. Итоговые файлы передаются после завершения проекта.',
      privacyText: 'Мы храним имя, email и материалы проектов исключительно для оказания услуг. Данные не передаются третьим лицам, кроме сервисов, необходимых для работы платформы (хостинг базы данных, отправка писем, AI-ассистент). Вы можете удалить аккаунт и все данные в Настройках.',
    },
    v: {
      required: 'Заполните это поле', email: 'Введите корректный email', pwdMin: 'Минимум 8 символов',
      pwdMatch: 'Пароли не совпадают', consent: 'Нужно согласие с условиями', name: 'Укажите имя (2–60 символов)',
    },
    errors: {
      generic: 'Не удалось выполнить действие. Попробуйте ещё раз.', network: 'Нет соединения с сервером. Проверьте интернет.',
      invalid_credentials: 'Неверный email или пароль.', email_not_confirmed: 'Email ещё не подтверждён. Проверьте почту.',
      user_already_exists: 'Аккаунт с таким email уже существует. Войдите или восстановите пароль.',
      weak_password: 'Пароль слишком простой. Добавьте цифры и буквы разного регистра.',
      rate_limited: 'Слишком много попыток. Подождите немного и повторите.', same_password: 'Новый пароль должен отличаться от текущего.',
      session_expired: 'Сессия истекла. Войдите снова.', link_expired: 'Ссылка устарела или уже использована. Запросите новую.',
      signup_disabled: 'Регистрация временно отключена.', forbidden: 'Недостаточно прав для этого действия.',
      not_found: 'Не найдено или нет доступа.', file_too_big: 'Файл больше {mb} МБ.', file_type: 'Этот тип файла не поддерживается.',
      ai_disabled: 'AF AI временно отключён администратором.', ai_not_configured: 'AF AI ещё не подключён владельцем платформы.',
      daily_limit: 'Дневной лимит AI-запросов исчерпан ({limit}). Возвращайтесь завтра или напишите администратору.',
      provider_busy: 'AI-сервис перегружен. Повторите через минуту.', provider_error: 'AI-сервис не ответил. Повторите позже.',
      provider_timeout: 'AI отвечал слишком долго. Попробуйте короче сформулировать вопрос.', too_long: 'Сообщение слишком длинное.',
      invalid_password: 'Неверный пароль.', last_admin: 'Нельзя удалить единственного администратора.', confirmation_required: 'Введите слово подтверждения.',
      already_decided: 'Решение по этой версии уже принято.',
      server_config: 'Сервер AF AI настроен не до конца (нет доступа к базе). Сообщите администратору.',
    },
    nav: {
      groupStudio: 'Студия', groupCreate: 'Создание', groupSpace: 'Моё пространство',
      overview: 'Обзор', portfolio: 'Портфолио', services: 'Услуги', ai: 'AF AI', builder: 'Конструктор проекта',
      calculator: 'Калькулятор', lab: '3D Lab', projects: 'Мои проекты', messages: 'Сообщения', favorites: 'Избранное',
      settings: 'Настройки', files: 'Файлы', moodboard: 'Мудборды', notifications: 'Уведомления', admin: 'AF Admin',
      logout: 'Выйти', profile: 'Профиль', theme: 'Тема', menu: 'Меню',
    },
    status: {
      new: 'Новая заявка', awaiting: 'Ожидает ответа', brief_approved: 'Бриф согласован', concept: 'Концепция',
      production: 'Производство', review: 'Проверка', revisions: 'Правки', done: 'Завершён',
    },
    notif: {
      title: 'Уведомления', empty: 'Новых уведомлений нет', markAll: 'Прочитать все',
      project_created: 'Новая заявка {no}', project_status: '{no}: статус — «{status}»', project_done: '{no} завершён 🎉',
      message: 'Новое сообщение: {subject}', comment: 'Комментарий к рендеру: {title}', review_request: 'Запрос согласования: {title} (v{version})',
      review_decision: 'Решение клиента по {title}', new_user: 'Новый пользователь: {email}', generic: 'Уведомление',
    },
    overview: {
      hello: 'Здравствуйте, {name}', sub: 'Ваше пространство AF STUDIO', projects: 'Проектов', active: 'Активных',
      favorites: 'В избранном', unread: 'Непрочитанных', quick: 'Быстрые действия', recentMsgs: 'Последние сообщения',
      recentProjects: 'Последние проекты', noMsgs: 'Сообщений пока нет', noProjects: 'Проектов пока нет',
      qBuilder: 'Создать проект', qCalc: 'Рассчитать стоимость', qAi: 'Спросить AF AI', qMood: 'Собрать мудборд',
      qPortfolio: 'Смотреть работы', heroKicker: '3D GRAPHIC DESIGNER · 12 ЛЕТ ОПЫТА', heroTitle: 'Александр Фролов',
      heroSub: 'Создаю фотореалистичные миры, в которых хочется жить и к которым хочется прикоснуться.',
      onbTitle1: 'Добро пожаловать в AF STUDIO', onbText1: 'Здесь собраны работы студии, инструменты планирования и ваш личный кабинет.',
      onbTitle2: 'Опишите задачу', onbText2: 'Конструктор проекта и AF AI помогут сформулировать ТЗ, а калькулятор — оценить бюджет.',
      onbTitle3: 'Следите за работой', onbText3: 'Статусы, файлы, согласование рендеров и переписка — в «Моих проектах».', onbDone: 'Начать',
      adminTitle: 'Вы вошли как администратор', adminText: 'Заявки, статусы, файлы клиентов, контент, цены и AI — в панели AF Admin.',
    },
    portfolio: {
      title: 'Портфолио', sub: 'Каждый проект — это история, рассказанная светом, формой и материалом.', works: 'Работы',
      compare: 'До / После', fProduct: 'Продукт', fArch: 'Архитектура', fCharacter: 'Персонажи', fMotion: 'Motion',
      view: 'Смотреть проект →', about: 'О проекте', brief: 'Задача', solution: 'Решение', tools: 'Инструменты',
      time: 'Срок', result: 'Результат', orderSimilar: 'Заказать похожий проект', prev: '← Предыдущий', next: 'Следующий →',
      addFav: 'В избранное', removeFav: 'Убрать из избранного', favAdded: 'Добавлено в избранное', favRemoved: 'Убрано из избранного',
      allWorks: '← Все работы', notFound: 'Проект не найден',
      baEmpty: 'Сравнения появятся здесь, когда студия опубликует реальные материалы проектов.',
      baSource: 'Исходник', baDraft: 'Черновик', baFinal: 'Рендер', baHint: 'Перетащите ползунок', baLeft: 'Слева', baRight: 'Справа',
    },
    services: {
      title: 'Услуги', sub: 'Полный цикл — от концепта до финального рендера и композитинга.', discuss: 'Обсудить проект',
      calc: 'Рассчитать', processKicker: 'ПРОЦЕСС', processTitle: 'От идеи. До вау.',
      processSub: 'Продуманный процесс, прозрачные решения и внимание к каждой детали — от первой идеи до финального результата.',
      outcome: 'Результат:', reviewsKicker: 'AF / CLIENT EXPERIENCE', reviewsTitle: 'Доверие, воплощённое в деталях',
      contactsTitle: 'Контакты', writeUs: 'Написать в студию', location: 'Узловая, Тульская область, Россия',
    },
    ai: {
      title: 'AF AI', sub: 'Консультант по услугам, ТЗ и предварительным сметам. Отвечает только по базе знаний студии.',
      newChat: 'Новый чат', history: 'История', placeholder: 'Опишите задачу или задайте вопрос…', thinking: 'AF AI думает…',
      empty: 'Начните разговор', emptySub: 'Например: «Нужна визуализация флакона духов для рекламы — с чего начать?»',
      s1: 'Какую услугу выбрать для моей задачи?', s2: 'Помоги составить ТЗ', s3: 'Сколько примерно будет стоить?', s4: 'Какие материалы нужны для старта?',
      modeChat: 'Диалог', modeBrief: 'Составить ТЗ', modeEstimate: 'Смета', handoff: 'Подключить администратора',
      handoffDone: 'Диалог передан администратору. Ответ придёт в «Сообщения».', handoffConfirm: 'Передать этот диалог администратору студии?',
      saveResult: 'Сохранить', savedResult: 'Ответ сохранён', toBuilder: 'В конструктор', deleteChat: 'Удалить чат',
      deleteConfirm: 'Удалить этот чат без возможности восстановления?', rename: 'Переименовать', usage: 'Сегодня: {used} / {limit}',
      disclaimer: 'AI может ошибаться. Окончательные стоимость и сроки подтверждает студия после брифа.', saved: 'Сохранённые',
    },
    builder: {
      title: 'Конструктор проекта', sub: 'Семь шагов — и у студии будет всё для точной оценки.',
      steps: ['Услуга', 'Объект', 'Цель', 'Стиль', 'Объём', 'Бюджет', 'Отправка'],
      s1: 'Какая услуга нужна?', s2: 'Опишите объект', s3: 'Цель проекта', s4: 'Стиль и референсы',
      s5: 'Ракурсы и анимация', s6: 'Бюджет и сроки', s7: 'Контакты и отправка',
      objectName: 'Название проекта / объекта', objectDesc: 'Описание объекта', objectDescPh: 'Что это, размеры, материалы, особенности. Есть ли CAD/чертежи/фото?',
      hasCad: 'Есть CAD / чертежи', hasPhotos: 'Есть фото объекта', goals: ['E-commerce', 'Реклама', 'Презентация', 'Инвесторы', 'Соцсети', 'Игра / движок', 'Другое'],
      goalNote: 'Где будет использоваться результат?', styles: ['Студийный минимализм', 'Lifestyle', 'Премиум / люкс', 'Технологичный', 'Тёплый натуральный', 'Неон / киберпанк', 'Фэнтези'],
      refs: 'Референсы', dropHint: 'Перетащите изображения сюда или нажмите, чтобы выбрать', dropSub: 'JPG, PNG, WEBP · до {mb} МБ',
      styleNote: 'Комментарий к стилю', angles: 'Количество ракурсов', objects: 'Количество объектов', animation: 'Анимация, сек',
      turntable: 'Turntable 360°', formats: 'Форматы', budget: 'Бюджет', budgets: ['до 30 000 ₽', '30–60 000 ₽', '60–120 000 ₽', '120 000 ₽ +', 'Нужна оценка'],
      deadline: 'Желаемый срок', urgent: 'Срочно', contactName: 'Имя', contactEmail: 'Email', contactTg: 'Telegram', contactPhone: 'Телефон',
      preferred: 'Удобный способ связи', consent: 'Согласен(на) на обработку данных для подготовки предложения',
      spec: 'Техническое задание', submit: 'Отправить заявку', draftSaved: 'Черновик сохранён', draftRestored: 'Восстановлен черновик',
      aiHint: 'Подсказка AF AI', successTitle: 'Заявка {no} отправлена', successText: 'Студия получила заявку и скоро ответит. Следите за статусом в «Моих проектах».',
      openProject: 'Открыть проект', newProject: 'Новая заявка', clearDraft: 'Очистить черновик', clearConfirm: 'Очистить все поля конструктора?',
      selectService: 'Выберите услугу', fillTitle: 'Укажите название (минимум 2 символа)', fillDesc: 'Опишите объект подробнее (минимум 20 символов)',
      pickGoal: 'Выберите хотя бы одну цель', uploading: 'Загрузка файлов…', fromCalc: 'Параметры перенесены из калькулятора',
    },
    calc: {
      title: 'Калькулятор стоимости', sub: 'Предварительная оценка на основе ориентиров студии.', category: 'Категория',
      complexity: 'Сложность', objects: 'Количество объектов', angles: 'Количество ракурсов', detail: 'Детализация',
      animation: 'Анимация, сек', extras: 'Дополнительно', urgency: 'Срочность', range: 'Расчётный диапазон', works: 'Состав работ',
      extraCosts: 'Возможные дополнительные расходы', timeline: 'Примерные сроки', days: '{a}–{b} дн.', create: 'Создать проект',
      note: 'Это предварительная оценка. Точная смета — после согласования брифа.',
      unconfirmed: 'Часть коэффициентов ещё уточняется студией — расчёт ориентировочный.', included: 'включено ракурсов: {n}',
      askAi: 'Обсудить с AF AI', empty: 'Тарифы ещё не настроены администратором.',
    },
    lab: {
      screenshot: 'Скриншот', wireframe: 'Каркас (wireframe)', background: 'Фон', speed: 'Скорость вращения', bgs: { dark: 'Студия', warm: 'Тёплый', light: 'Светлый', grid: 'Сетка' },
      title: '3D Lab', sub: 'Интерактивные демонстрации: вращайте, приближайте, меняйте материалы и свет.',
      models: 'Модели', demo: 'Демо-сцена', demoNote: 'Демонстрационный объект для показа возможностей viewer.',
      color: 'Цвет', material: 'Материал', light: 'Освещение', camera: 'Ракурс', autorotate: 'Автовращение', fullscreen: 'На весь экран',
      zoomIn: 'Приблизить', zoomOut: 'Отдалить', reset: 'Сбросить вид', loadLocal: 'Открыть свой GLB', loading: 'Загрузка модели…',
      loadError: 'Не удалось загрузить модель.', mats: { original: 'Исходный', gloss: 'Глянец', metal: 'Металл', glass: 'Стекло', matte: 'Мат', gold: 'Золото', carbon: 'Карбон' },
      lights: { studio: 'Студия', sunset: 'Закат', dramatic: 'Драма', neon: 'Неон' }, cams: { front: 'Спереди', side: 'Сбоку', top: 'Сверху', hero: '3/4' },
      hint: 'Перетаскивайте для вращения · колесо/щипок для масштаба', webglOff: 'Ваш браузер не поддерживает WebGL.',
      bottle: 'Флакон', knot: 'Узел', headset: 'Наушники', localNote: 'Файл открывается только в вашем браузере и никуда не загружается.',
    },
    projects: {
      title: 'Мои проекты', sub: 'Все заявки и проекты со статусами и материалами.', empty: 'У вас пока нет проектов',
      emptySub: 'Опишите задачу в конструкторе — это займёт пару минут.', created: 'Создан', updated: 'Обновлён', service: 'Услуга',
      tabOverview: 'Обзор', tabFiles: 'Файлы', tabReview: 'Согласование', tabMessages: 'Переписка', tabHistory: 'История',
      spec: 'Техническое задание', estimate: 'Оценка из калькулятора', budget: 'Бюджет', deadline: 'Срок', moodboards: 'Мудборды',
      history: 'История статусов', finalBadge: 'Итоговый · защищён', uploadRef: 'Добавить материалы', noFiles: 'Файлов пока нет',
      noRounds: 'Рендеры на согласование появятся здесь.', version: 'Версия {v}', approve: 'Утвердить', requestChanges: 'Запросить правки',
      approveConfirm: 'Утвердить эту версию рендера? После утверждения правки по ней не принимаются.',
      changesPh: 'Что нужно изменить?', addMarker: 'Кликните по изображению, чтобы поставить метку', commentPh: 'Комментарий…',
      reply: 'Ответить', approved: 'Утверждено', changesRequested: 'Запрошены правки', pending: 'Ожидает решения',
      markerMode: 'Режим меток', studio: 'Студия', you: 'Вы', all: 'Все статусы', filter: 'Фильтр',
    },
    files: {
      title: 'Файлы', sub: 'Референсы, ТЗ, материалы и итоговые файлы ваших проектов.', all: 'Все', kinds: {
        reference: 'Референс', image: 'Изображение', brief: 'ТЗ', material: 'Материал', moodboard: 'Мудборд', render: 'Рендер', final: 'Итоговый',
      }, kind: 'Тип', project: 'Проект', noProject: 'Без проекта', deleteConfirm: 'Удалить файл «{name}»?', protected: 'Файл передан студией и защищён от изменений.',
    },
    messages: {
      title: 'Сообщения', sub: 'Переписка со студией.', newThread: 'Новое обращение', subject: 'Тема', placeholder: 'Напишите сообщение…',
      empty: 'Диалогов пока нет', emptySub: 'Задайте вопрос студии — ответ придёт сюда.', select: 'Выберите диалог',
      studio: 'AF Studio', you: 'Вы', closed: 'Закрыт', firstMsg: 'Сообщение', telegram: 'Telegram', email: 'Email',
    },
    favorites: { title: 'Избранное', sub: 'Работы, к которым хочется вернуться. Синхронизируется между устройствами.', empty: 'В избранном пока пусто', emptySub: 'Отмечайте работы сердечком в портфолио.' },
    mood: {
      title: 'Мудборды', sub: 'Соберите визуальное направление: изображения, палитры, материалы и заметки.', newBoard: 'Новая доска',
      untitled: 'Новый мудборд', addImage: 'Изображение', addColor: 'Цвет', addPalette: 'Палитра', addMaterial: 'Материал', addNote: 'Заметка',
      notePh: 'Заметка…', exportPng: 'PNG', exportPdf: 'PDF', analyze: 'Анализ AF AI', sendToProject: 'В проект', selectProject: 'Выберите проект',
      sent: 'Мудборд прикреплён к проекту', empty: 'Мудбордов пока нет', emptySub: 'Создайте первую доску.', deleteConfirm: 'Удалить мудборд?',
      palettes: 'Палитры', materials: { metal: 'Металл', glass: 'Стекло', wood: 'Дерево', concrete: 'Бетон', fabric: 'Ткань', leather: 'Кожа', marble: 'Мрамор', plastic: 'Пластик', gold: 'Золото' },
      autosave: 'Автосохранение', bringFront: 'На передний план', analysis: 'Анализ направления',
    },
    settings: {
      title: 'Настройки', profile: 'Профиль', name: 'Имя', avatar: 'Аватар', changeAvatar: 'Сменить аватар', email: 'Email',
      changeEmail: 'Изменить email', newEmail: 'Новый email', emailSent: 'Мы отправили подтверждение на новый адрес. Email сменится после перехода по ссылке.',
      security: 'Безопасность', currentPwd: 'Текущий пароль', newPwd: 'Новый пароль', changePwd: 'Сменить пароль', pwdChanged: 'Пароль изменён',
      prefs: 'Предпочтения', language: 'Язык интерфейса', theme: 'Тема', dark: 'Тёмная', light: 'Светлая', notifications: 'Уведомления',
      notifyInapp: 'Уведомления в платформе', notifyEmail: 'Уведомления на email', session: 'Сессия', logout: 'Выйти', logoutAll: 'Выйти на всех устройствах',
      danger: 'Опасная зона', deleteAccount: 'Удалить аккаунт', deleteText: 'Аккаунт, проекты, файлы, переписка и история AI будут удалены безвозвратно.',
      deleteConfirmWord: 'Введите УДАЛИТЬ для подтверждения', deleted: 'Аккаунт удалён', oauthUser: 'Вход через Google — пароль не используется.',
      visual: 'Эффекты и 3D', visualHint: 'Настройки этого устройства. Уменьшите эффекты на слабом телефоне или ноутбуке.',
      animations: 'Анимации', animFull: 'Полные', animReduced: 'Минимум', quality3d: 'Качество 3D', q: { high: 'Высокое', medium: 'Среднее', low: 'Экономное' },
      glow: 'Подсветка за курсором', account: 'Аккаунт', registered: 'Регистрация', lastLogin: 'Последний вход', provider: 'Способ входа',
      emailStatus: 'Email', confirmed: 'Подтверждён', notConfirmed: 'Не подтверждён', export: 'Скачать мои данные (JSON)',
    },
    legal: { terms: 'Условия использования', privacy: 'Политика конфиденциальности' },
  },

  en: {
    brand: { studio: 'AF STUDIO', tagline: '3D visualization platform' },
    common: {
      close: 'Close', cancel: 'Cancel', confirm: 'Confirm', save: 'Save', saved: 'Saved', delete: 'Delete', edit: 'Edit', create: 'Create',
      open: 'Open', back: 'Back', next: 'Next', send: 'Send', wait: 'Please wait…', loading: 'Loading…', retry: 'Retry', search: 'Search',
      all: 'All', yes: 'Yes', no: 'No', or: 'or', copy: 'Copy', copied: 'Copied', upload: 'Upload', download: 'Download',
      errorTitle: 'Something went wrong', viewAll: 'View all', new: 'New', demo: 'Demo', optional: 'optional', required: 'required',
      today: 'today', more: 'More', none: 'No data', add: 'Add', apply: 'Apply', reset: 'Reset', preview: 'Preview', details: 'Details', remove: 'Remove',
    },
    boot: { checking: 'Checking access…', secure: 'Secure connection' },
    access: {
      kicker: 'AF ACCESS', title1: 'Create.', title2: 'Explore.', title3: 'Bring to life.',
      lead: 'The private AF STUDIO platform: portfolio, AF AI, project builder, cost estimates and your client space — in one place.',
      f1: 'Client space with live project statuses', f2: 'AF AI — consulting & briefs', f3: 'Render approvals with pinned comments',
      login: 'Sign in', register: 'Sign up', email: 'Email', password: 'Password', password2: 'Repeat password', name: 'Name',
      showPwd: 'Show password', hidePwd: 'Hide password', remember: 'Remember me', forgot: 'Forgot password?',
      loginBtn: 'ENTER AF STUDIO', registerBtn: 'CREATE ACCOUNT', google: 'Continue with Google',
      noAccount: 'No account yet?', haveAccount: 'Already have an account?', toRegister: 'Create one', toLogin: 'Sign in',
      consent: 'I accept the {terms} and the {privacy}', terms: 'terms of use', privacy: 'privacy policy',
      welcomeBack: 'Welcome back', createTitle: 'Create your account', loginSub: 'Sign in to open the platform.', registerSub: 'A couple of minutes and you are in.',
      forgotTitle: 'Reset password', forgotSub: 'We will email you a secure reset link.', sendLink: 'Send link', backToLogin: '← Back to sign in',
      forgotSent: 'If an account with this email exists, the email is on its way. Check your spam folder.',
      resetTitle: 'New password', resetSub: 'Choose a new password for your account.', resetBtn: 'Save password', resetDone: 'Password changed. Welcome!',
      confirmTitle: 'Confirm your email', confirmSub: 'We sent an email to {email}. Follow the link in it — then you can sign in.',
      resend: 'Resend email', resent: 'Email sent again.', resendIn: 'Resend in {s}s', confirmed: 'Email confirmed. Please sign in.', entering: 'Opening AF STUDIO…',
      strength: ['Weak', 'Fair', 'Good', 'Strong'],
      notConfigured: 'The platform is not connected to its server yet. The site owner must set the Supabase parameters in js/config.js (see docs/SETUP.md).',
      secureNote: 'Your data is encrypted and protected by server-side access rules.',
      termsText: 'By using AF STUDIO you agree that materials uploaded to the platform are used only to work on your projects. Price and timeline are fixed once the brief is agreed. Final files are delivered after project completion.',
      privacyText: 'We store your name, email and project materials solely to provide our services. Data is not shared with third parties except services required to run the platform (database hosting, email delivery, AI assistant). You can delete your account and all data in Settings.',
    },
    v: { required: 'This field is required', email: 'Enter a valid email', pwdMin: 'At least 8 characters', pwdMatch: 'Passwords do not match', consent: 'Please accept the terms', name: 'Enter your name (2–60 characters)' },
    errors: {
      generic: 'Could not complete the action. Please try again.', network: 'No connection to the server. Check your internet.',
      invalid_credentials: 'Wrong email or password.', email_not_confirmed: 'Email not confirmed yet. Check your inbox.',
      user_already_exists: 'An account with this email already exists. Sign in or reset your password.',
      weak_password: 'Password is too weak. Add digits and mixed-case letters.', rate_limited: 'Too many attempts. Please wait a moment.',
      same_password: 'The new password must differ from the current one.', session_expired: 'Session expired. Please sign in again.',
      link_expired: 'The link has expired or was already used. Request a new one.', signup_disabled: 'Sign-ups are temporarily disabled.',
      forbidden: 'You do not have permission for this action.', not_found: 'Not found or no access.', file_too_big: 'File is larger than {mb} MB.',
      file_type: 'This file type is not supported.', ai_disabled: 'AF AI is temporarily disabled by the administrator.',
      ai_not_configured: 'AF AI is not connected by the platform owner yet.', daily_limit: 'Daily AI limit reached ({limit}). Come back tomorrow or message the studio.',
      provider_busy: 'AI service is busy. Retry in a minute.', provider_error: 'AI service did not respond. Try later.',
      provider_timeout: 'AI took too long. Try a shorter question.', too_long: 'Message is too long.', invalid_password: 'Wrong password.',
      last_admin: 'You cannot delete the only administrator.', confirmation_required: 'Type the confirmation word.', already_decided: 'A decision for this version was already made.',
      server_config: 'The AF AI server is not fully configured (no database access). Please tell the administrator.',
    },
    nav: {
      groupStudio: 'Studio', groupCreate: 'Create', groupSpace: 'My space', overview: 'Overview', portfolio: 'Portfolio', services: 'Services',
      ai: 'AF AI', builder: 'Project Builder', calculator: 'Price Calculator', lab: '3D Lab', projects: 'My Projects', messages: 'Messages',
      favorites: 'Favorites', settings: 'Settings', files: 'Files', moodboard: 'Moodboards', notifications: 'Notifications', admin: 'AF Admin',
      logout: 'Sign out', profile: 'Profile', theme: 'Theme', menu: 'Menu',
    },
    status: { new: 'New request', awaiting: 'Awaiting reply', brief_approved: 'Brief approved', concept: 'Concept', production: 'Production', review: 'Review', revisions: 'Revisions', done: 'Completed' },
    notif: {
      title: 'Notifications', empty: 'No new notifications', markAll: 'Mark all read', project_created: 'New request {no}',
      project_status: '{no}: status — “{status}”', project_done: '{no} completed 🎉', message: 'New message: {subject}',
      comment: 'Review comment: {title}', review_request: 'Approval requested: {title} (v{version})', review_decision: 'Client decision on {title}', new_user: 'New user: {email}', generic: 'Notification',
    },
    overview: {
      hello: 'Hello, {name}', sub: 'Your AF STUDIO space', projects: 'Projects', active: 'Active', favorites: 'Favorites', unread: 'Unread',
      quick: 'Quick actions', recentMsgs: 'Recent messages', recentProjects: 'Recent projects', noMsgs: 'No messages yet', noProjects: 'No projects yet',
      qBuilder: 'Create a project', qCalc: 'Estimate cost', qAi: 'Ask AF AI', qMood: 'Build a moodboard', qPortfolio: 'View works',
      heroKicker: '3D GRAPHIC DESIGNER · 12 YEARS EXP', heroTitle: 'Alexander Frolov', heroSub: 'I create photorealistic worlds you want to live in and touch.',
      onbTitle1: 'Welcome to AF STUDIO', onbText1: 'Studio works, planning tools and your personal client space — all here.',
      onbTitle2: 'Describe your task', onbText2: 'The project builder and AF AI help you write a brief; the calculator estimates the budget.',
      onbTitle3: 'Follow the work', onbText3: 'Statuses, files, render approvals and chat live in “My Projects”.', onbDone: 'Get started',
      adminTitle: 'You are signed in as administrator', adminText: 'Requests, statuses, client files, content, pricing and AI live in AF Admin.',
    },
    portfolio: {
      title: 'Portfolio', sub: 'Every project is a story told through light, form and material.', works: 'Works', compare: 'Before / After',
      fProduct: 'Product', fArch: 'Architecture', fCharacter: 'Characters', fMotion: 'Motion', view: 'View project →', about: 'About the project',
      brief: 'Brief', solution: 'Solution', tools: 'Tools', time: 'Timeline', result: 'Deliverables', orderSimilar: 'Order a similar project',
      prev: '← Previous', next: 'Next →', addFav: 'Add to favorites', removeFav: 'Remove from favorites', favAdded: 'Added to favorites',
      favRemoved: 'Removed from favorites', allWorks: '← All works', notFound: 'Project not found',
      baEmpty: 'Comparisons will appear here once the studio publishes real project materials.', baSource: 'Source', baDraft: 'Draft', baFinal: 'Render',
      baHint: 'Drag the slider', baLeft: 'Left', baRight: 'Right',
    },
    services: {
      title: 'Services', sub: 'Full pipeline — from concept to final render and compositing.', discuss: 'Discuss a project', calc: 'Estimate',
      processKicker: 'PROCESS', processTitle: 'From idea. To wow.', processSub: 'A thoughtful process, transparent decisions, and attention to every detail — from the first idea to the final result.',
      outcome: 'Outcome:', reviewsKicker: 'AF / CLIENT EXPERIENCE', reviewsTitle: 'Trust, embodied in detail', contactsTitle: 'Contacts',
      writeUs: 'Message the studio', location: 'Uzlovaya, Tula Oblast, Russia',
    },
    ai: {
      title: 'AF AI', sub: 'Consultant for services, briefs and preliminary estimates. Answers only from the studio knowledge base.',
      newChat: 'New chat', history: 'History', placeholder: 'Describe your task or ask a question…', thinking: 'AF AI is thinking…',
      empty: 'Start a conversation', emptySub: 'E.g. “I need a perfume bottle visualization for an ad — where do we start?”',
      s1: 'Which service fits my task?', s2: 'Help me write a brief', s3: 'Roughly how much will it cost?', s4: 'What materials do you need to start?',
      modeChat: 'Chat', modeBrief: 'Write brief', modeEstimate: 'Estimate', handoff: 'Connect administrator',
      handoffDone: 'Conversation handed to the administrator. The reply will arrive in Messages.', handoffConfirm: 'Hand this conversation to the studio administrator?',
      saveResult: 'Save', savedResult: 'Answer saved', toBuilder: 'To builder', deleteChat: 'Delete chat', deleteConfirm: 'Delete this chat permanently?',
      rename: 'Rename', usage: 'Today: {used} / {limit}', disclaimer: 'AI can make mistakes. Final price and timeline are confirmed by the studio after the brief.', saved: 'Saved',
    },
    builder: {
      title: 'Project Builder', sub: 'Seven steps — and the studio has everything for an accurate quote.',
      steps: ['Service', 'Object', 'Goal', 'Style', 'Scope', 'Budget', 'Submit'],
      s1: 'Which service do you need?', s2: 'Describe the object', s3: 'Project goal', s4: 'Style & references', s5: 'Angles & animation', s6: 'Budget & timeline', s7: 'Contacts & submit',
      objectName: 'Project / object name', objectDesc: 'Object description', objectDescPh: 'What it is, size, materials, specifics. Do you have CAD/drawings/photos?',
      hasCad: 'I have CAD / drawings', hasPhotos: 'I have photos of the object', goals: ['E-commerce', 'Advertising', 'Presentation', 'Investors', 'Social media', 'Game / engine', 'Other'],
      goalNote: 'Where will the result be used?', styles: ['Studio minimalism', 'Lifestyle', 'Premium / luxury', 'Tech', 'Warm natural', 'Neon / cyberpunk', 'Fantasy'],
      refs: 'References', dropHint: 'Drop images here or click to choose', dropSub: 'JPG, PNG, WEBP · up to {mb} MB', styleNote: 'Style notes',
      angles: 'Number of angles', objects: 'Number of objects', animation: 'Animation, sec', turntable: '360° turntable', formats: 'Formats', budget: 'Budget',
      budgets: ['under 30,000 ₽', '30–60,000 ₽', '60–120,000 ₽', '120,000 ₽ +', 'Need an estimate'], deadline: 'Desired deadline', urgent: 'Urgent',
      contactName: 'Name', contactEmail: 'Email', contactTg: 'Telegram', contactPhone: 'Phone', preferred: 'Preferred contact method',
      consent: 'I agree to data processing for preparing the proposal', spec: 'Technical specification', submit: 'Submit request',
      draftSaved: 'Draft saved', draftRestored: 'Draft restored', aiHint: 'AF AI hint', successTitle: 'Request {no} submitted',
      successText: 'The studio received your request and will reply soon. Track the status in My Projects.', openProject: 'Open project',
      newProject: 'New request', clearDraft: 'Clear draft', clearConfirm: 'Clear all builder fields?', selectService: 'Choose a service',
      fillTitle: 'Enter a name (at least 2 characters)', fillDesc: 'Describe the object in more detail (at least 20 characters)', pickGoal: 'Pick at least one goal',
      uploading: 'Uploading files…', fromCalc: 'Parameters carried over from the calculator',
    },
    calc: {
      title: 'Price Calculator', sub: 'A preliminary estimate based on studio guidelines.', category: 'Category', complexity: 'Complexity', objects: 'Number of objects',
      angles: 'Number of angles', detail: 'Detail level', animation: 'Animation, sec', extras: 'Extras', urgency: 'Urgency', range: 'Estimated range',
      works: 'Scope of work', extraCosts: 'Possible extra costs', timeline: 'Approximate timeline', days: '{a}–{b} days', create: 'Create project',
      note: 'This is a preliminary estimate. The exact quote follows the agreed brief.', unconfirmed: 'Some coefficients are still being confirmed by the studio — the estimate is approximate.',
      included: 'angles included: {n}', askAi: 'Discuss with AF AI', empty: 'Rates have not been configured by the administrator yet.',
    },
    lab: {
      screenshot: 'Screenshot', wireframe: 'Wireframe', background: 'Background', speed: 'Rotation speed', bgs: { dark: 'Studio', warm: 'Warm', light: 'Light', grid: 'Grid' },
      title: '3D Lab', sub: 'Interactive demos: rotate, zoom, switch materials and lighting.', models: 'Models', demo: 'Demo scene',
      demoNote: 'Demonstration object showcasing the viewer.', color: 'Color', material: 'Material', light: 'Lighting', camera: 'Camera', autorotate: 'Auto-rotate',
      fullscreen: 'Fullscreen', zoomIn: 'Zoom in', zoomOut: 'Zoom out', reset: 'Reset view', loadLocal: 'Open your GLB', loading: 'Loading model…',
      loadError: 'Could not load the model.', mats: { original: 'Original', gloss: 'Gloss', metal: 'Metal', glass: 'Glass', matte: 'Matte', gold: 'Gold', carbon: 'Carbon' },
      lights: { studio: 'Studio', sunset: 'Sunset', dramatic: 'Dramatic', neon: 'Neon' }, cams: { front: 'Front', side: 'Side', top: 'Top', hero: '3/4' },
      hint: 'Drag to rotate · wheel/pinch to zoom', webglOff: 'Your browser does not support WebGL.', bottle: 'Bottle', knot: 'Knot', headset: 'Headphones',
      localNote: 'The file opens only in your browser and is not uploaded anywhere.',
    },
    projects: {
      title: 'My Projects', sub: 'All requests and projects with statuses and materials.', empty: 'You have no projects yet', emptySub: 'Describe your task in the builder — it takes a couple of minutes.',
      created: 'Created', updated: 'Updated', service: 'Service', tabOverview: 'Overview', tabFiles: 'Files', tabReview: 'Review', tabMessages: 'Messages', tabHistory: 'History',
      spec: 'Technical specification', estimate: 'Calculator estimate', budget: 'Budget', deadline: 'Deadline', moodboards: 'Moodboards', history: 'Status history',
      finalBadge: 'Final · protected', uploadRef: 'Add materials', noFiles: 'No files yet', noRounds: 'Renders for approval will appear here.', version: 'Version {v}',
      approve: 'Approve', requestChanges: 'Request changes', approveConfirm: 'Approve this render version? No further revisions are accepted for it after approval.',
      changesPh: 'What should be changed?', addMarker: 'Click the image to drop a marker', commentPh: 'Comment…', reply: 'Reply', approved: 'Approved',
      changesRequested: 'Changes requested', pending: 'Awaiting decision', markerMode: 'Marker mode', studio: 'Studio', you: 'You', all: 'All statuses', filter: 'Filter',
    },
    files: {
      title: 'Files', sub: 'References, briefs, materials and final files of your projects.', all: 'All', kinds: {
        reference: 'Reference', image: 'Image', brief: 'Brief', material: 'Material', moodboard: 'Moodboard', render: 'Render', final: 'Final',
      }, kind: 'Type', project: 'Project', noProject: 'No project', deleteConfirm: 'Delete file “{name}”?', protected: 'Delivered by the studio and protected from changes.',
    },
    messages: {
      title: 'Messages', sub: 'Conversations with the studio.', newThread: 'New conversation', subject: 'Subject', placeholder: 'Write a message…',
      empty: 'No conversations yet', emptySub: 'Ask the studio a question — the reply will arrive here.', select: 'Select a conversation', studio: 'AF Studio',
      you: 'You', closed: 'Closed', firstMsg: 'Message', telegram: 'Telegram', email: 'Email',
    },
    favorites: { title: 'Favorites', sub: 'Works you want to come back to. Synced across devices.', empty: 'No favorites yet', emptySub: 'Tap the heart on portfolio works.' },
    mood: {
      title: 'Moodboards', sub: 'Build a visual direction: images, palettes, materials and notes.', newBoard: 'New board', untitled: 'New moodboard',
      addImage: 'Image', addColor: 'Color', addPalette: 'Palette', addMaterial: 'Material', addNote: 'Note', notePh: 'Note…', exportPng: 'PNG', exportPdf: 'PDF',
      analyze: 'AF AI analysis', sendToProject: 'To project', selectProject: 'Choose a project', sent: 'Moodboard attached to the project', empty: 'No moodboards yet',
      emptySub: 'Create your first board.', deleteConfirm: 'Delete this moodboard?', palettes: 'Palettes',
      materials: { metal: 'Metal', glass: 'Glass', wood: 'Wood', concrete: 'Concrete', fabric: 'Fabric', leather: 'Leather', marble: 'Marble', plastic: 'Plastic', gold: 'Gold' },
      autosave: 'Autosave', bringFront: 'Bring to front', analysis: 'Direction analysis',
    },
    settings: {
      title: 'Settings', profile: 'Profile', name: 'Name', avatar: 'Avatar', changeAvatar: 'Change avatar', email: 'Email', changeEmail: 'Change email', newEmail: 'New email',
      emailSent: 'We sent a confirmation to the new address. The email changes after you follow the link.', security: 'Security', currentPwd: 'Current password',
      newPwd: 'New password', changePwd: 'Change password', pwdChanged: 'Password changed', prefs: 'Preferences', language: 'Interface language', theme: 'Theme',
      dark: 'Dark', light: 'Light', notifications: 'Notifications', notifyInapp: 'In-app notifications', notifyEmail: 'Email notifications', session: 'Session',
      logout: 'Sign out', logoutAll: 'Sign out on all devices', danger: 'Danger zone', deleteAccount: 'Delete account',
      deleteText: 'Your account, projects, files, messages and AI history will be permanently deleted.', deleteConfirmWord: 'Type DELETE to confirm',
      deleted: 'Account deleted', oauthUser: 'Signed in with Google — no password is used.',
      visual: 'Effects & 3D', visualHint: 'Settings for this device. Reduce effects on a slow phone or laptop.',
      animations: 'Animations', animFull: 'Full', animReduced: 'Minimal', quality3d: '3D quality', q: { high: 'High', medium: 'Medium', low: 'Saver' },
      glow: 'Cursor glow', account: 'Account', registered: 'Registered', lastLogin: 'Last sign-in', provider: 'Sign-in method',
      emailStatus: 'Email', confirmed: 'Confirmed', notConfirmed: 'Not confirmed', export: 'Download my data (JSON)',
    },
    legal: { terms: 'Terms of use', privacy: 'Privacy policy' },
  },
};

const LANG_KEY = 'af.lang'; // own key: independent from the old site on the same domain
let current = localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'ru';
const listeners = new Set();

export const getLang = () => current;
export function setLang(lang) {
  current = lang === 'en' ? 'en' : 'ru';
  localStorage.setItem(LANG_KEY, current);
  document.documentElement.lang = current;
  listeners.forEach((fn) => { try { fn(current); } catch (e) { console.error(e); } });
}
export const onLang = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

function lookup(lang, key) {
  return key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), DICT[lang]);
}
/** t('access.consent', {terms:'…'}) — falls back to RU, then to the key itself. */
export function t(key, vars) {
  let v = lookup(current, key);
  if (v === undefined) v = lookup('ru', key);
  if (v === undefined) return key;
  if (typeof v === 'string' && vars) v = v.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
  return v;
}
/** Localized DB field: loc(row, 'title') → row.title_en | row.title_ru */
export const loc = (row, field) => (row ? (row[`${field}_${current}`] || row[`${field}_ru`] || '') : '');
/** Localized JSON item {ru, en} */
export const locj = (o) => (o ? o[current] || o.ru || '' : '');

/** Fill [data-i18n], [data-i18n-placeholder], [data-i18n-aria] inside a root. */
export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((n) => { n.textContent = t(n.dataset.i18n); });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((n) => { n.placeholder = t(n.dataset.i18nPlaceholder); });
  root.querySelectorAll('[data-i18n-aria]').forEach((n) => { n.setAttribute('aria-label', t(n.dataset.i18nAria)); });
}

document.documentElement.lang = current;
export { DICT };
