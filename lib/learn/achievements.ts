/**
 * Achievements, computed from the event log. Hidden ones are shown as "?"
 * until earned. When one is earned, an `achievement` event is recorded
 * (components/learn/achievement-watcher.tsx), which keeps its date.
 */

import type { Course } from './schema'
import { type LearnState, completedLessons } from './state'
import { trackComplete } from './progress'
import { streakInfo } from './streak'
import { levelFor, totalXp } from './xp'

type L = { ru: string; kk: string; en: string }

export interface Achievement {
  id: string
  icon: string
  hidden: boolean
  title: L
  description: L
}

interface Ctx {
  state: LearnState
  done: Set<string>
  course: Course
  bestStreak: number
}

const DEFS: (Achievement & { earned: (c: Ctx) => boolean })[] = [
  {
    id: 'first-lesson',
    icon: '🚀',
    hidden: false,
    title: { ru: 'Первый шаг', kk: 'Алғашқы қадам', en: 'First step' },
    description: { ru: 'Пройди первый урок.', kk: 'Алғашқы сабақты өт.', en: 'Finish your first lesson.' },
    earned: (c) => c.state.events.some((e) => e.kind === 'lesson_done'),
  },
  {
    id: 'five-lessons',
    icon: '🧩',
    hidden: false,
    title: { ru: 'Разогнался', kk: 'Екпін алдым', en: 'Picking up speed' },
    description: { ru: 'Пройди 5 уроков.', kk: '5 сабақ өт.', en: 'Finish 5 lessons.' },
    earned: (c) => c.state.events.filter((e) => e.kind === 'lesson_done').length >= 5,
  },
  {
    id: 'first-try',
    icon: '🎯',
    hidden: false,
    title: { ru: 'Снайпер', kk: 'Мерген', en: 'Sharpshooter' },
    description: { ru: 'Реши 5 заданий с кодом с первой попытки и без подсказок.', kk: '5 код тапсырмасын бірінші әрекеттен, кеңессіз шеш.', en: 'Solve 5 coding tasks on the first try without hints.' },
    earned: (c) => c.state.events.filter((e) => e.kind === 'step_done' && e.firstTry && e.hints === 0 && ['code', 'debug', 'project'].includes(e.stepType)).length >= 5,
  },
  {
    id: 'first-project',
    icon: '🏗️',
    hidden: false,
    title: { ru: 'Проектировщик', kk: 'Жобалаушы', en: 'Project maker' },
    description: { ru: 'Сделай первый проект.', kk: 'Алғашқы жобаны жаса.', en: 'Finish your first project.' },
    earned: (c) => c.state.events.some((e) => e.kind === 'lesson_done' && e.project),
  },
  {
    id: 'track-start',
    icon: '🏁',
    hidden: false,
    title: { ru: 'Старт взят', kk: 'Старт алынды', en: 'Off the line' },
    description: { ru: 'Пройди весь трек «Старт».', kk: '«Старт» трегін толық өт.', en: 'Finish the whole Start track.' },
    earned: (c) => {
      const t = c.course.tracks.find((x) => x.id === 'start')
      return !!t && trackComplete(c.done, t)
    },
  },
  {
    id: 'real-robot',
    icon: '🤖',
    hidden: false,
    title: { ru: 'Из экрана в жизнь', kk: 'Экраннан өмірге', en: 'Off the screen' },
    description: { ru: 'Запусти программу на настоящем роботе.', kk: 'Бағдарламаны нағыз роботта іске қос.', en: 'Run a program on a real robot.' },
    earned: (c) => c.state.events.some((e) => e.kind === 'real_robot'),
  },
  {
    id: 'streak-3',
    icon: '🔥',
    hidden: false,
    title: { ru: 'Три дня подряд', kk: 'Қатарынан үш күн', en: 'Three in a row' },
    description: { ru: 'Выполни цель дня 3 дня подряд.', kk: 'Күн мақсатын 3 күн қатарынан орында.', en: 'Meet your daily goal 3 days in a row.' },
    earned: (c) => c.bestStreak >= 3,
  },
  {
    id: 'streak-7',
    icon: '📅',
    hidden: false,
    title: { ru: 'Неделя', kk: 'Апта', en: 'A whole week' },
    description: { ru: 'Серия 7 дней.', kk: '7 күндік серия.', en: 'A 7-day streak.' },
    earned: (c) => c.bestStreak >= 7,
  },
  {
    id: 'streak-30',
    icon: '🏆',
    hidden: false,
    title: { ru: 'Месяц с роботом', kk: 'Роботпен бір ай', en: 'A month of robots' },
    description: { ru: 'Серия 30 дней.', kk: '30 күндік серия.', en: 'A 30-day streak.' },
    earned: (c) => c.bestStreak >= 30,
  },
  {
    id: 'reviewer',
    icon: '🔁',
    hidden: false,
    title: { ru: 'Повторюшка', kk: 'Қайталаушы', en: 'Reviewer' },
    description: { ru: 'Пройди 3 повторения.', kk: '3 қайталау өт.', en: 'Do 3 reviews.' },
    earned: (c) => c.state.events.filter((e) => e.kind === 'review_done').length >= 3,
  },
  {
    id: 'challenge',
    icon: '⭐',
    hidden: false,
    title: { ru: 'Вызов принят', kk: 'Шақыру қабылданды', en: 'Challenge accepted' },
    description: { ru: 'Реши задание недели.', kk: 'Апта тапсырмасын шеш.', en: 'Solve a weekly challenge.' },
    earned: (c) => c.state.events.some((e) => e.kind === 'challenge_done'),
  },
  {
    id: 'level-2',
    icon: '🔧',
    hidden: false,
    title: { ru: 'Конструктор', kk: 'Құрастырушы', en: 'Builder' },
    description: { ru: 'Дойди до второго уровня.', kk: 'Екінші деңгейге жет.', en: 'Reach level 2.' },
    earned: (c) => levelFor(totalXp(c.state)).index >= 1,
  },
  // Hidden
  {
    id: 'shorter',
    icon: '✂️',
    hidden: true,
    title: { ru: 'Короче нашего', kk: 'Біздікінен қысқа', en: 'Shorter than ours' },
    description: { ru: 'Реши задание меньшим числом блоков, чем в нашем решении.', kk: 'Тапсырманы біздің шешімнен азырақ блокпен шеш.', en: 'Solve a task with fewer blocks than our solution.' },
    earned: (c) => c.state.events.some((e) => e.kind === 'step_done' && e.blocks !== undefined && e.referenceBlocks !== undefined && e.blocks < e.referenceBlocks),
  },
  {
    id: 'clean-project',
    icon: '💎',
    hidden: true,
    title: { ru: 'Чистая работа', kk: 'Таза жұмыс', en: 'Clean job' },
    description: { ru: 'Сделай проект с первой попытки и без подсказок.', kk: 'Жобаны бірінші әрекеттен, кеңессіз жаса.', en: 'Finish a project on the first try without hints.' },
    earned: (c) => c.state.events.some((e) => e.kind === 'step_done' && e.stepType === 'project' && e.firstTry && e.hints === 0),
  },
  {
    id: 'comeback',
    icon: '👋',
    hidden: true,
    title: { ru: 'С возвращением', kk: 'Қайта оралуың құтты болсын', en: 'Welcome back' },
    description: { ru: 'Вернись к урокам после перерыва в неделю.', kk: 'Бір апталық үзілістен кейін сабаққа орал.', en: 'Come back to lessons after a week-long break.' },
    earned: (c) => {
      const times = c.state.events.filter((e) => e.kind === 'lesson_done').map((e) => e.at)
      return times.some((t, i) => i > 0 && t - times[i - 1] >= 7 * 24 * 3600 * 1000)
    },
  },
  {
    id: 'skipper',
    icon: '🦘',
    hidden: true,
    title: { ru: 'Я это знаю!', kk: 'Мен мұны білемін!', en: 'I know this!' },
    description: { ru: 'Пропусти раздел, сдав тест «Я уже это знаю».', kk: '«Мен мұны білемін» тестін тапсырып, бөлімді өткізіп жібер.', en: 'Skip a unit by passing an “I already know this” test.' },
    earned: (c) => c.state.events.some((e) => e.kind === 'known' && e.lessons.length > 0),
  },
]

export const ACHIEVEMENTS: Achievement[] = DEFS.map((d) => ({ id: d.id, icon: d.icon, hidden: d.hidden, title: d.title, description: d.description }))

export function earnedAchievements(state: LearnState, course: Course, now = Date.now()): string[] {
  const ctx: Ctx = { state, done: completedLessons(state), course, bestStreak: streakInfo(state, now).best }
  return DEFS.filter((d) => d.earned(ctx)).map((d) => d.id)
}

/** Earned but not yet recorded: these get the unlock screen. */
export function newAchievements(state: LearnState, course: Course, now = Date.now()): string[] {
  const recorded = new Set(state.events.flatMap((e) => (e.kind === 'achievement' ? [e.achievement] : [])))
  return earnedAchievements(state, course, now).filter((id) => !recorded.has(id))
}

export function recordedAchievements(state: LearnState): Map<string, number> {
  return new Map(state.events.flatMap((e) => (e.kind === 'achievement' ? [[e.achievement, e.at] as const] : [])))
}
