/**
 * Looks for the virtual robot. Everything is earned by learning (levels and
 * achievements); there is nothing to buy.
 */

type L = { ru: string; kk: string; en: string }
export type CosmeticKind = 'color' | 'sticker' | 'wheels'
export type Unlock = { level: number } | { achievement: string } | null

export interface Cosmetic {
  kind: CosmeticKind
  id: string
  /** Colour hex (colours), emoji (stickers). */
  value: string
  title: L
  unlock: Unlock
}

export const COSMETICS: Cosmetic[] = [
  { kind: 'color', id: 'sun', value: '#ffc531', title: { ru: 'Солнце', kk: 'Күн', en: 'Sun' }, unlock: null },
  { kind: 'color', id: 'sky', value: '#4a86f7', title: { ru: 'Небо', kk: 'Аспан', en: 'Sky' }, unlock: null },
  { kind: 'color', id: 'leaf', value: '#2bb673', title: { ru: 'Лист', kk: 'Жапырақ', en: 'Leaf' }, unlock: { level: 1 } },
  { kind: 'color', id: 'brick', value: '#e8442e', title: { ru: 'Кирпич', kk: 'Кірпіш', en: 'Brick' }, unlock: { level: 2 } },
  { kind: 'color', id: 'grape', value: '#b26ef0', title: { ru: 'Виноград', kk: 'Жүзім', en: 'Grape' }, unlock: { achievement: 'streak-7' } },
  { kind: 'color', id: 'rose', value: '#f06fb4', title: { ru: 'Роза', kk: 'Раушан', en: 'Rose' }, unlock: { achievement: 'reviewer' } },
  { kind: 'sticker', id: 'none', value: '', title: { ru: 'Без наклейки', kk: 'Жапсырмасыз', en: 'No sticker' }, unlock: null },
  { kind: 'sticker', id: 'star', value: '⭐', title: { ru: 'Звезда', kk: 'Жұлдыз', en: 'Star' }, unlock: null },
  { kind: 'sticker', id: 'bolt', value: '⚡', title: { ru: 'Молния', kk: 'Найзағай', en: 'Bolt' }, unlock: { achievement: 'first-try' } },
  { kind: 'sticker', id: 'rocket', value: '🚀', title: { ru: 'Ракета', kk: 'Зымыран', en: 'Rocket' }, unlock: { achievement: 'first-project' } },
  { kind: 'sticker', id: 'flag', value: '🏁', title: { ru: 'Флаг', kk: 'Жалау', en: 'Flag' }, unlock: { achievement: 'track-start' } },
  { kind: 'sticker', id: 'gem', value: '💎', title: { ru: 'Кристалл', kk: 'Кристалл', en: 'Gem' }, unlock: { achievement: 'clean-project' } },
  { kind: 'wheels', id: 'classic', value: '', title: { ru: 'Обычные', kk: 'Қарапайым', en: 'Classic' }, unlock: null },
  { kind: 'wheels', id: 'racing', value: '', title: { ru: 'Гоночные', kk: 'Жарыс', en: 'Racing' }, unlock: { level: 1 } },
  { kind: 'wheels', id: 'offroad', value: '', title: { ru: 'Вездеход', kk: 'Бәріне жүргіш', en: 'Off-road' }, unlock: { achievement: 'real-robot' } },
]

export function isUnlocked(c: Cosmetic, level: number, achievements: Set<string>): boolean {
  if (!c.unlock) return true
  if ('level' in c.unlock) return level >= c.unlock.level
  return achievements.has(c.unlock.achievement)
}

export function stickerEmoji(id: string): string {
  return COSMETICS.find((c) => c.kind === 'sticker' && c.id === id)?.value ?? ''
}
