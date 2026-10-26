/**
 * Public privacy and parents pages, written from docs/privacy.md (draft,
 * pending legal review — keep both in sync).
 */

import type { Locale } from './config'

export interface LegalPage {
  title: string
  lead: string
  draft: string
  sections: { title: string; items: string[] }[]
}

const privacy: Record<Locale, LegalPage> = {
  ru: {
    title: 'Конфиденциальность',
    lead: 'RoboEasy создан для детей, поэтому мы собираем как можно меньше данных и не показываем учеников друг другу.',
    draft: 'Черновик: текст проходит юридическую проверку.',
    sections: [
      {
        title: 'Что мы храним',
        items: [
          'Ник, возрастную группу, часовой пояс, цель на день и вид робота — только в твоём браузере.',
          'Прогресс: пройденные уроки, ошибки, время, достижения — тоже только в браузере.',
          'Мы не спрашиваем имя и фамилию, почту, телефон, фото, голос и местоположение.',
        ],
      },
      {
        title: 'Что уходит на сервер',
        items: [
          'Вопрос наставнику и текущая программа — чтобы ИИ (Google Gemini) придумал подсказку. Мы их не сохраняем.',
          'В журнал наставника пишем только номер урока и шага, уровень подсказки и длину вопроса — без текста и без IP.',
          'Сертификат: ник, трек и дата зашифрованы в самой ссылке и подписаны — на сервере не хранятся.',
          'Счётчики защиты от перегрузки держатся в памяти сервера не дольше суток.',
        ],
      },
      {
        title: 'Безопасность',
        items: [
          'Нет чатов, комментариев и публичных профилей.',
          'Рейтинги (после появления аккаунтов) — только внутри класса или между друзьями, только ники.',
          'ИИ-наставник даёт подсказки, но не готовые решения, не задаёт личных вопросов и не уходит от темы урока.',
          'Никаких покупок: всё для робота открывается за учёбу.',
        ],
      },
      {
        title: 'Твои данные — твои',
        items: [
          'Профиль → «Мои данные»: скачать всё одним файлом, загрузить на другом устройстве или удалить навсегда.',
          'Учащимся младше 16 лет нужно разрешение родителя или учителя.',
        ],
      },
    ],
  },
  kk: {
    title: 'Құпиялылық',
    lead: 'RoboEasy балаларға арналған, сондықтан біз деректерді барынша аз жинаймыз және оқушыларды бір-біріне көрсетпейміз.',
    draft: 'Жоба: мәтін заңгерлік тексеруден өтуде.',
    sections: [
      {
        title: 'Біз не сақтаймыз',
        items: [
          'Лақап ат, жас тобы, уақыт белдеуі, күнделікті мақсат және роботтың түрі — тек сенің браузеріңде.',
          'Прогресс: өтілген сабақтар, қателер, уақыт, жетістіктер — бұлар да тек браузерде.',
          'Біз аты-жөніңді, поштаңды, телефоныңды, фотоңды, дауысыңды және орныңды сұрамаймыз.',
        ],
      },
      {
        title: 'Серверге не жіберіледі',
        items: [
          'Тәлімгерге қойылған сұрақ пен ағымдағы бағдарлама — ЖИ (Google Gemini) кеңес ойлап табуы үшін. Біз оларды сақтамаймыз.',
          'Тәлімгер журналына тек сабақ пен қадам нөмірі, кеңес деңгейі және сұрақтың ұзындығы жазылады — мәтінсіз және IP-сіз.',
          'Сертификат: лақап ат, трек және күн сілтеменің өзінде шифрланып, қол қойылған — серверде сақталмайды.',
          'Шамадан тыс жүктемеден қорғау есептегіштері сервер жадында бір тәуліктен аспай сақталады.',
        ],
      },
      {
        title: 'Қауіпсіздік',
        items: [
          'Чаттар, пікірлер және ашық профильдер жоқ.',
          'Рейтингтер (аккаунттар пайда болғаннан кейін) — тек сынып ішінде немесе достар арасында, тек лақап аттар.',
          'ЖИ-тәлімгер дайын шешім емес, кеңес береді, жеке сұрақтар қоймайды және сабақ тақырыбынан ауытқымайды.',
          'Ешқандай сатып алу жоқ: роботқа арналғанның бәрі оқу арқылы ашылады.',
        ],
      },
      {
        title: 'Сенің деректерің — сенікі',
        items: [
          'Профиль → «Менің деректерім»: бәрін бір файлмен жүктеу, басқа құрылғыда ашу немесе біржола жою.',
          '16 жасқа толмаған оқушыларға ата-ананың немесе мұғалімнің рұқсаты керек.',
        ],
      },
    ],
  },
  en: {
    title: 'Privacy',
    lead: 'RoboEasy is made for children, so we collect as little data as possible and never show learners to each other.',
    draft: 'Draft: this text is under legal review.',
    sections: [
      {
        title: 'What we keep',
        items: [
          'Nickname, age range, time zone, daily goal and robot looks — only in your browser.',
          'Progress: lessons, mistakes, time and achievements — also only in your browser.',
          'We never ask for a real name, email, phone, photos, voice or location.',
        ],
      },
      {
        title: 'What goes to our server',
        items: [
          'A question to the mentor and your current program — so the AI (Google Gemini) can write a hint. We do not store them.',
          'The mentor log keeps only the lesson and step ids, hint level and question length — no text and no IP address.',
          'Certificates: the nickname, track and date are inside the signed link itself, not stored on the server.',
          'Overload-protection counters stay in server memory for at most a day.',
        ],
      },
      {
        title: 'Safety',
        items: [
          'No chats, comments or public profiles.',
          'Leaderboards (once accounts exist) — only inside a class or between friends, nicknames only.',
          'The AI mentor gives hints, not ready solutions, asks no personal questions and stays on the lesson.',
          'No purchases: everything for the robot is earned by learning.',
        ],
      },
      {
        title: 'Your data is yours',
        items: ['Profile → “My data”: download everything as one file, load it on another device, or delete it for good.', 'Learners under 16 need a parent’s or teacher’s permission.'],
      },
    ],
  },
}

const parents: Record<Locale, LegalPage> = {
  ru: {
    title: 'Для родителей',
    lead: 'RoboEasy учит робототехнике с нуля: короткие уроки, симулятор робота и программы для LEGO® Education SPIKE™ Prime. Вот что важно знать взрослым.',
    draft: 'Черновик: текст проходит юридическую проверку.',
    sections: [
      {
        title: 'Как это устроено',
        items: [
          'Уроки по 5–10 минут. Всё работает в симуляторе — набор SPIKE Prime нужен только для бонусных заданий.',
          'Ребёнок выбирает цель на день: 1 урок, 2 урока или 15 минут. Пропуск дня не наказывается.',
          'Достижения и вид робота открываются только за учёбу. Покупок и рекламы нет.',
        ],
      },
      {
        title: 'Данные ребёнка',
        items: [
          'Мы не собираем имя, почту, фото и местоположение — только ник и возрастную группу.',
          'Пока аккаунтов нет, весь прогресс хранится в этом браузере. Его можно скачать или удалить в профиле.',
          'Подробности — на странице «Конфиденциальность».',
        ],
      },
      {
        title: 'ИИ-наставник',
        items: [
          'Наставник подсказывает по шагам и не выдаёт готовое решение.',
          'Он говорит только об уроке и роботах, не задаёт личных вопросов. До 30 вопросов в день.',
          'Подсказки урока работают и без ИИ.',
        ],
      },
      {
        title: 'Ваше разрешение',
        items: [
          'Если ребёнку меньше 16 лет, при первом входе взрослый отмечает согласие.',
          'Напоминания выключены по умолчанию. Их можно включить в профиле и добавить в ваш календарь — мы не присылаем уведомлений.',
        ],
      },
    ],
  },
  kk: {
    title: 'Ата-аналарға',
    lead: 'RoboEasy робототехниканы нөлден үйретеді: қысқа сабақтар, робот симуляторы және LEGO® Education SPIKE™ Prime бағдарламалары. Ересектер білуі керек нәрселер.',
    draft: 'Жоба: мәтін заңгерлік тексеруден өтуде.',
    sections: [
      {
        title: 'Қалай жұмыс істейді',
        items: [
          'Сабақтар 5–10 минуттан. Бәрі симуляторда жұмыс істейді — SPIKE Prime жинағы тек бонус тапсырмаларға керек.',
          'Бала күндік мақсатты таңдайды: 1 сабақ, 2 сабақ немесе 15 минут. Күнді өткізіп алу жазаланбайды.',
          'Жетістіктер мен роботтың түрі тек оқу арқылы ашылады. Сатып алу мен жарнама жоқ.',
        ],
      },
      {
        title: 'Баланың деректері',
        items: [
          'Біз атын, поштасын, фотосын және орнын жинамаймыз — тек лақап ат пен жас тобы.',
          'Аккаунттар болмағанша, барлық прогресс осы браузерде сақталады. Оны профильде жүктеуге немесе жоюға болады.',
          'Толығырақ — «Құпиялылық» бетінде.',
        ],
      },
      {
        title: 'ЖИ-тәлімгер',
        items: ['Тәлімгер қадам-қадаммен кеңес береді және дайын шешімді бермейді.', 'Ол тек сабақ пен роботтар туралы сөйлейді, жеке сұрақтар қоймайды. Күніне 30 сұраққа дейін.', 'Сабақтың өз кеңестері ЖИ-сіз де жұмыс істейді.'],
      },
      {
        title: 'Сіздің рұқсатыңыз',
        items: [
          'Бала 16 жасқа толмаса, алғаш кіргенде ересек келісімін белгілейді.',
          'Еске салғыштар әдепкі бойынша өшірулі. Оларды профильде қосып, күнтізбеңізге қосуға болады — біз хабарлама жібермейміз.',
        ],
      },
    ],
  },
  en: {
    title: 'For parents',
    lead: 'RoboEasy teaches robotics from scratch: short lessons, a robot simulator and programs for LEGO® Education SPIKE™ Prime. Here is what grown-ups should know.',
    draft: 'Draft: this text is under legal review.',
    sections: [
      {
        title: 'How it works',
        items: [
          'Lessons take 5–10 minutes. Everything runs in the simulator — a SPIKE Prime kit is only needed for bonus tasks.',
          'Your child picks a daily goal: 1 lesson, 2 lessons or 15 minutes. Missing a day is never punished.',
          'Achievements and robot looks are earned only by learning. No purchases, no ads.',
        ],
      },
      {
        title: 'Your child’s data',
        items: [
          'We do not collect names, emails, photos or location — only a nickname and an age range.',
          'Until accounts exist, all progress stays in this browser. It can be downloaded or deleted in the profile.',
          'Details are on the Privacy page.',
        ],
      },
      {
        title: 'The AI mentor',
        items: ['The mentor gives step-by-step hints and never hands out the full solution.', 'It talks only about the lesson and robots and asks no personal questions. Up to 30 questions a day.', 'The lesson’s own hints work without the AI too.'],
      },
      {
        title: 'Your permission',
        items: [
          'If your child is under 16, a grown-up ticks the consent box on the first visit.',
          'Reminders are off by default. You can turn them on in the profile and add them to your own calendar — we never send notifications.',
        ],
      },
    ],
  },
}

export function getLegal(page: 'privacy' | 'parents', lang: Locale): LegalPage {
  return (page === 'privacy' ? privacy : parents)[lang]
}
