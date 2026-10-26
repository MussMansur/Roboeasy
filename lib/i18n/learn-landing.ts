/**
 * Copy of the home page ("Learn robotics from scratch"), phase 13; live at
 * /[lang] since the first tracks shipped (the AI generator's page moved to
 * /[lang]/ai). Kazakh needs a review by a native speaker before launch.
 */

import type { Locale } from './config'

export type TrackKey = 'start' | 'build' | 'blocks' | 'sensors' | 'navigation' | 'python' | 'mechanisms' | 'fll'

export interface LearnLandingCopy {
  previewNote: string
  hero: { badge: string; title: string; accent: string; sub: string; cta: string; ctaTest: string; chips: string[]; path: string[]; station: string }
  how: { eyebrow: string; title: string; steps: { title: string; text: string }[] }
  tracks: { eyebrow: string; title: string; lead: string; noKit: string; partKit: string; items: Record<TrackKey, { title: string; text: string; time: string }> }
  virtual: { eyebrow: string; title: string; text: string; points: string[] }
  motivation: { eyebrow: string; title: string; items: { title: string; text: string }[]; note: string }
  mentor: { eyebrow: string; title: string; text: string; levels: string[]; question: string; answer: string }
  compete: { eyebrow: string; title: string; text: string; cta: string }
  adults: { eyebrow: string; title: string; teachers: { title: string; items: string[] }; parents: { title: string; items: string[] } }
  faq: { title: string; items: { q: string; a: string }[] }
  final: { title: string; text: string; cta: string }
}

const ru: LearnLandingCopy = {
  previewNote: 'Превью нового лендинга. Уроки ещё в работе — на сайте пока прежняя главная.',
  hero: {
    badge: 'Для LEGO® Education SPIKE™ Prime',
    title: 'Научись робототехнике',
    accent: 'с нуля',
    sub: 'Собирай роботов и программируй их — сначала блоками, потом на Python. Короткие уроки, виртуальный робот и ИИ-наставник, который подсказывает, а не решает за тебя.',
    cta: 'Начать бесплатно',
    ctaTest: 'Я уже умею — пройти тест',
    chips: ['Можно без набора', '5–10 минут в день', 'Қазақша · Русский · English'],
    path: ['Что такое робот', 'Хаб — мозг робота', 'Моторы', 'Датчики', 'Первая поездка'],
    station: 'Старт',
  },
  how: {
    eyebrow: 'Как это устроено',
    title: 'Немного теории — и сразу к делу',
    steps: [
      { title: 'Узнай', text: 'Короткое объяснение с картинкой: одна идея за раз, понятными словами.' },
      { title: 'Сделай', text: 'Собери программу из блоков или напиши код и запусти виртуального робота.' },
      { title: 'Проверь', text: 'Задание проверяется само. Не вышло — подсказка и новая попытка, без штрафа.' },
    ],
  },
  tracks: {
    eyebrow: 'Обучение',
    title: '8 треков от первой программы до соревнований',
    lead: 'Идёшь по шагам: каждый трек открывает следующий. Если уже что-то умеешь — пройди тест и начни с нужного места.',
    noKit: 'без набора',
    partKit: 'часть с набором',
    items: {
      start: { title: 'Старт', text: 'Что такое робот, хаб, моторы и датчики. Первая программа.', time: '1 ч' },
      build: { title: 'Сборка', text: 'Детали, прочные конструкции, шестерни. Базовая тележка.', time: '2,5 ч' },
      blocks: { title: 'Программирование блоками', text: 'Последовательность, циклы, условия, переменные, свои блоки.', time: '3,5 ч' },
      sensors: { title: 'Датчики', text: 'Цвет, расстояние, касание, гироскоп. Езда по линии.', time: '2,5 ч' },
      navigation: { title: 'Навигация и точность', text: 'Калибровка, точные повороты, регуляторы без страха.', time: '2 ч' },
      python: { title: 'Python', text: 'Те же задачи в коде: блоки и Python рядом.', time: '2 ч' },
      mechanisms: { title: 'Механизмы и насадки', text: 'Захват, подъёмник, толкатель. Насадка под задачу.', time: '1,5 ч' },
      fll: { title: 'Соревнования FLL', text: 'Стратегия заездов, работа в команде, защита робота.', time: '2 ч' },
    },
  },
  virtual: {
    eyebrow: 'Без набора',
    title: 'Виртуальный робот всегда под рукой',
    text: 'Основной путь проходится в симуляторе: робот ездит по полю, видит линии и стены, а задания проверяются автоматически. Есть набор SPIKE Prime? Задания на настоящем роботе дают бонус.',
    points: ['Поле с линиями, стенами и зонами', 'Датчики цвета, расстояния, силы и гироскоп', 'Скачай программу и запусти на своём роботе'],
  },
  motivation: {
    eyebrow: 'Мотивация',
    title: 'Каждый день немного — и результат заметен',
    items: [
      { title: 'Стрики', text: 'Дни подряд с выполненной целью. Заморозки спасают, если пропустил день.' },
      { title: 'Опыт и уровни', text: 'От «Новичка» до «Капитана команды» — за уроки, проекты и повторение.' },
      { title: 'Достижения', text: 'Бейджи за первую программу, первый датчик, собранного робота и секретные решения.' },
    ],
    note: 'Без давления: если сбился — просто начнёшь заново, рекорд сохранится.',
  },
  mentor: {
    eyebrow: 'ИИ-наставник',
    title: 'Подсказывает, а не решает за тебя',
    text: 'Застрял? Наставник видит задание и твою программу и помогает по ступенькам — чтобы до ответа ты дошёл сам.',
    levels: ['Наводящий вопрос', 'На что обратить внимание', 'Небольшой фрагмент'],
    question: 'Почему робот не доезжает до финиша?',
    answer: 'Посмотри на блок «ехать». Сколько сантиметров до финиша на поле, а сколько едет робот?',
  },
  compete: {
    eyebrow: 'Соревнования',
    title: 'До уровня FIRST LEGO League',
    text: 'В последнем треке — стратегия заездов, насадки, работа в команде и защита робота. FLL-тренер поможет спланировать сезон.',
    cta: 'Открыть FLL-тренер',
  },
  adults: {
    eyebrow: 'Учителям и родителям',
    title: 'Удобно в классе, безопасно дома',
    teachers: { title: 'Учителям', items: ['Классы с входом по коду', 'Назначение уроков со сроками', 'Видно, где ученики застревают'] },
    parents: { title: 'Родителям', items: ['Минимум данных: только никнейм', 'Нет чата между пользователями', 'ИИ отвечает только про учёбу'] },
  },
  faq: {
    title: 'Частые вопросы',
    items: [
      { q: 'Нужен ли набор LEGO?', a: 'Нет. Основной путь проходится на виртуальном роботе. Набор SPIKE Prime нужен для бонусных заданий и сборки.' },
      { q: 'С какого возраста?', a: 'Уроки рассчитаны на 9–16 лет, но подходят и взрослым новичкам.' },
      { q: 'Это бесплатно?', a: 'Да, учиться можно бесплатно и без регистрации.' },
      { q: 'Я уже программирую. Начинать с нуля?', a: 'Нет — пройди тест на входе, и мы подскажем, с какого урока начать.' },
      { q: 'Это официальный продукт LEGO?', a: 'Нет. RoboEasy — независимый проект и не связан с LEGO Group и FIRST.' },
    ],
  },
  final: { title: 'Первая программа — через 5 минут', text: 'Начни с трека «Старт»: виртуальный робот уже ждёт.', cta: 'Начать бесплатно' },
}

const en: LearnLandingCopy = {
  previewNote: 'Preview of the new landing page. Lessons are in progress; the site still shows the current home page.',
  hero: {
    badge: 'For LEGO® Education SPIKE™ Prime',
    title: 'Learn robotics',
    accent: 'from scratch',
    sub: 'Build robots and program them, first with blocks and then in Python. Short lessons, a virtual robot and an AI mentor that gives hints instead of doing it for you.',
    cta: 'Start for free',
    ctaTest: 'I already know some — take the test',
    chips: ['No kit needed', '5–10 minutes a day', 'Қазақша · Русский · English'],
    path: ['What is a robot', 'The hub — the brain', 'Motors', 'Sensors', 'First drive'],
    station: 'Start',
  },
  how: {
    eyebrow: 'How it works',
    title: 'A little theory, then straight to practice',
    steps: [
      { title: 'Learn', text: 'A short explanation with a picture: one idea at a time, in plain words.' },
      { title: 'Do', text: 'Build a program from blocks or write code and run the virtual robot.' },
      { title: 'Check', text: 'The task checks itself. Not there yet? Get a hint and try again, no penalty.' },
    ],
  },
  tracks: {
    eyebrow: 'Learning',
    title: '8 tracks from the first program to competitions',
    lead: 'Go step by step: each track opens the next one. Already know some? Take the test and start in the right place.',
    noKit: 'no kit needed',
    partKit: 'partly with a kit',
    items: {
      start: { title: 'Start', text: 'What a robot is: hub, motors and sensors. Your first program.', time: '1 h' },
      build: { title: 'Building', text: 'Parts, strong structures, gears. A basic driving base.', time: '2.5 h' },
      blocks: { title: 'Block programming', text: 'Sequences, loops, conditions, variables, My Blocks.', time: '3.5 h' },
      sensors: { title: 'Sensors', text: 'Colour, distance, touch, gyro. Line following.', time: '2.5 h' },
      navigation: { title: 'Navigation and accuracy', text: 'Calibration, precise turns, controllers without fear.', time: '2 h' },
      python: { title: 'Python', text: 'The same tasks in code: blocks and Python side by side.', time: '2 h' },
      mechanisms: { title: 'Mechanisms and attachments', text: 'Grabber, lift, pusher. An attachment for the task.', time: '1.5 h' },
      fll: { title: 'FLL competitions', text: 'Run strategy, teamwork, presenting your robot.', time: '2 h' },
    },
  },
  virtual: {
    eyebrow: 'No kit needed',
    title: 'A virtual robot is always at hand',
    text: 'The main path runs in the simulator: the robot drives on a field, sees lines and walls, and tasks are checked automatically. Have a SPIKE Prime kit? Tasks on the real robot give a bonus.',
    points: ['A field with lines, walls and zones', 'Colour, distance and force sensors and a gyro', 'Download the program and run it on your robot'],
  },
  motivation: {
    eyebrow: 'Motivation',
    title: 'A little every day adds up',
    items: [
      { title: 'Streaks', text: 'Days in a row with your goal done. Freezes save the streak if you miss a day.' },
      { title: 'XP and levels', text: 'From “Beginner” to “Team captain” — for lessons, projects and review.' },
      { title: 'Achievements', text: 'Badges for your first program, first sensor, first robot built and secret solutions.' },
    ],
    note: 'No pressure: if you miss, you simply start again, and your record stays.',
  },
  mentor: {
    eyebrow: 'AI mentor',
    title: 'Gives hints, not answers',
    text: 'Stuck? The mentor sees the task and your program and helps step by step, so you reach the answer yourself.',
    levels: ['A guiding question', 'What to look at', 'A small piece of code'],
    question: 'Why doesn’t the robot reach the finish?',
    answer: 'Look at the “move” block. How many centimetres is the finish on the field, and how far does the robot drive?',
  },
  compete: {
    eyebrow: 'Competitions',
    title: 'All the way to FIRST LEGO League',
    text: 'The last track covers run strategy, attachments, teamwork and presenting your robot. The FLL coach helps plan the season.',
    cta: 'Open the FLL coach',
  },
  adults: {
    eyebrow: 'For teachers and parents',
    title: 'Easy in class, safe at home',
    teachers: { title: 'Teachers', items: ['Classes with a join code', 'Assign lessons with due dates', 'See where students get stuck'] },
    parents: { title: 'Parents', items: ['Minimal data: just a nickname', 'No chat between users', 'The AI only talks about learning'] },
  },
  faq: {
    title: 'Questions',
    items: [
      { q: 'Do I need a LEGO kit?', a: 'No. The main path runs on a virtual robot. A SPIKE Prime kit is used for bonus tasks and building.' },
      { q: 'What age is it for?', a: 'Lessons are made for ages 9–16, and adult beginners are welcome too.' },
      { q: 'Is it free?', a: 'Yes, you can learn for free and without signing up.' },
      { q: 'I already code. Do I start from zero?', a: 'No — take the placement test and we’ll suggest where to start.' },
      { q: 'Is this an official LEGO product?', a: 'No. RoboEasy is an independent project, not affiliated with the LEGO Group or FIRST.' },
    ],
  },
  final: { title: 'Your first program in 5 minutes', text: 'Start with the “Start” track: the virtual robot is waiting.', cta: 'Start for free' },
}

const kk: LearnLandingCopy = {
  previewNote: 'Жаңа лендингтің алдын ала көрінісі. Сабақтар әзірленуде — сайтта әзірге бұрынғы басты бет.',
  hero: {
    badge: 'LEGO® Education SPIKE™ Prime үшін',
    title: 'Робототехниканы',
    accent: 'нөлден үйрен',
    sub: 'Роботтар құрастырып, оларды бағдарламала — алдымен блоктармен, кейін Python тілінде. Қысқа сабақтар, виртуалды робот және сен үшін шешпейтін, тек кеңес беретін ЖИ-тәлімгер.',
    cta: 'Тегін бастау',
    ctaTest: 'Мен білемін — тест тапсыру',
    chips: ['Жиынтықсыз да болады', 'Күніне 5–10 минут', 'Қазақша · Русский · English'],
    path: ['Робот деген не', 'Хаб — роботтың миы', 'Моторлар', 'Датчиктер', 'Алғашқы сапар'],
    station: 'Бастау',
  },
  how: {
    eyebrow: 'Қалай жұмыс істейді',
    title: 'Аздаған теория — және бірден іске',
    steps: [
      { title: 'Біл', text: 'Суреті бар қысқа түсіндірме: бір уақытта бір идея, түсінікті сөздермен.' },
      { title: 'Жаса', text: 'Блоктардан бағдарлама құрастыр немесе код жазып, виртуалды роботты іске қос.' },
      { title: 'Тексер', text: 'Тапсырма өзі тексеріледі. Шықпаса — кеңес және жаңа әрекет, айыпсыз.' },
    ],
  },
  tracks: {
    eyebrow: 'Оқу',
    title: 'Алғашқы бағдарламадан жарыстарға дейін 8 трек',
    lead: 'Қадам бойынша жүресің: әр трек келесісін ашады. Бірдеңе білсең — тест тапсырып, керекті жерден баста.',
    noKit: 'жиынтықсыз',
    partKit: 'бір бөлігі жиынтықпен',
    items: {
      start: { title: 'Бастау', text: 'Робот, хаб, моторлар және датчиктер. Алғашқы бағдарлама.', time: '1 сағ' },
      build: { title: 'Құрастыру', text: 'Бөлшектер, берік құрылымдар, тісті доңғалақтар. Негізгі арба.', time: '2,5 сағ' },
      blocks: { title: 'Блоктармен бағдарламалау', text: 'Реттілік, циклдер, шарттар, айнымалылар, өз блоктарың.', time: '3,5 сағ' },
      sensors: { title: 'Датчиктер', text: 'Түс, қашықтық, жанасу, гироскоп. Сызық бойымен жүру.', time: '2,5 сағ' },
      navigation: { title: 'Навигация және дәлдік', text: 'Калибрлеу, дәл бұрылыстар, қорықпай реттегіштер.', time: '2 сағ' },
      python: { title: 'Python', text: 'Сол тапсырмалар кодта: блоктар мен Python қатар.', time: '2 сағ' },
      mechanisms: { title: 'Механизмдер мен саптамалар', text: 'Қармағыш, көтергіш, итергіш. Тапсырмаға саптама.', time: '1,5 сағ' },
      fll: { title: 'FLL жарыстары', text: 'Заездер стратегиясы, командалық жұмыс, роботты қорғау.', time: '2 сағ' },
    },
  },
  virtual: {
    eyebrow: 'Жиынтықсыз',
    title: 'Виртуалды робот әрдайым қасыңда',
    text: 'Негізгі жол симуляторда өтеді: робот алаңда жүреді, сызықтар мен қабырғаларды көреді, ал тапсырмалар автоматты түрде тексеріледі. SPIKE Prime жиынтығың бар ма? Нағыз роботтағы тапсырмалар бонус береді.',
    points: ['Сызықтары, қабырғалары мен аймақтары бар алаң', 'Түс, қашықтық, күш датчиктері және гироскоп', 'Бағдарламаны жүктеп, өз роботыңда іске қос'],
  },
  motivation: {
    eyebrow: 'Мотивация',
    title: 'Күн сайын аздап — нәтиже байқалады',
    items: [
      { title: 'Стриктер', text: 'Мақсат орындалған қатарынан күндер. Күн өткізіп алсаң, мұздату құтқарады.' },
      { title: 'Тәжірибе мен деңгейлер', text: '«Жаңадан бастаушыдан» «Команда капитанына» дейін — сабақтар, жобалар және қайталау үшін.' },
      { title: 'Жетістіктер', text: 'Алғашқы бағдарлама, алғашқы датчик, құрастырылған робот және құпия шешімдер үшін белгілер.' },
    ],
    note: 'Қысымсыз: тоқтап қалсаң — қайта бастайсың, рекордың сақталады.',
  },
  mentor: {
    eyebrow: 'ЖИ-тәлімгер',
    title: 'Сен үшін шешпейді, кеңес береді',
    text: 'Тығырыққа тірелдің бе? Тәлімгер тапсырма мен бағдарламаңды көріп, сатылап көмектеседі — жауапқа өзің жетуің үшін.',
    levels: ['Бағыттаушы сұрақ', 'Неге назар аудару керек', 'Шағын үзінді'],
    question: 'Неге робот мәреге жетпейді?',
    answer: '«Жүру» блогына қара. Алаңда мәреге дейін неше сантиметр, ал робот қанша жүреді?',
  },
  compete: {
    eyebrow: 'Жарыстар',
    title: 'FIRST LEGO League деңгейіне дейін',
    text: 'Соңғы тректе — заездер стратегиясы, саптамалар, командалық жұмыс және роботты қорғау. FLL-жаттықтырушы маусымды жоспарлауға көмектеседі.',
    cta: 'FLL-жаттықтырушыны ашу',
  },
  adults: {
    eyebrow: 'Мұғалімдер мен ата-аналарға',
    title: 'Сыныпта ыңғайлы, үйде қауіпсіз',
    teachers: { title: 'Мұғалімдерге', items: ['Код арқылы кіретін сыныптар', 'Мерзімі бар сабақтарды тағайындау', 'Оқушылардың қай жерде қиналатыны көрінеді'] },
    parents: { title: 'Ата-аналарға', items: ['Ең аз дерек: тек лақап ат', 'Пайдаланушылар арасында чат жоқ', 'ЖИ тек оқу туралы жауап береді'] },
  },
  faq: {
    title: 'Жиі қойылатын сұрақтар',
    items: [
      { q: 'LEGO жиынтығы керек пе?', a: 'Жоқ. Негізгі жол виртуалды роботта өтеді. SPIKE Prime жиынтығы бонус тапсырмалар мен құрастыру үшін керек.' },
      { q: 'Нешеден бастап?', a: 'Сабақтар 9–16 жасқа арналған, бірақ ересек жаңадан бастаушыларға да жарайды.' },
      { q: 'Бұл тегін бе?', a: 'Иә, тегін және тіркелусіз оқуға болады.' },
      { q: 'Мен бағдарламалай аламын. Нөлден бастау керек пе?', a: 'Жоқ — кіру тестін тапсыр, біз қай сабақтан бастау керегін айтамыз.' },
      { q: 'Бұл LEGO-ның ресми өнімі ме?', a: 'Жоқ. RoboEasy — тәуелсіз жоба, LEGO Group және FIRST-пен байланысы жоқ.' },
    ],
  },
  final: { title: 'Алғашқы бағдарлама — 5 минутта', text: '«Бастау» трегінен баста: виртуалды робот күтіп тұр.', cta: 'Тегін бастау' },
}

const COPY: Record<Locale, LearnLandingCopy> = { ru, kk, en }

export function getLearnLanding(lang: Locale): LearnLandingCopy {
  return COPY[lang]
}
