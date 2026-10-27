import { Check, Flame, Sparkles } from 'lucide-react'

import { Buddy } from '@/components/learn/buddy'
import { CoinIcon } from '@/components/learn/coin'
import { cn } from '@/lib/utils'

/**
 * The hero picture: the robot buddy on a yellow disc with turning gears,
 * twinkling sparks and floating progress stickers. Every moving piece is its
 * own element animated with transform/opacity only, so it stays on the
 * compositor and does not stutter; everything stops with reduced motion.
 */

function gearPath(teeth: number, r: number, depth: number): string {
  const pts: string[] = []
  const step = (Math.PI * 2) / (teeth * 4)
  for (let i = 0; i < teeth * 4; i++) {
    const rr = i % 4 < 2 ? r : r - depth
    const a = i * step
    pts.push(`${(50 + rr * Math.cos(a)).toFixed(2)} ${(50 + rr * Math.sin(a)).toFixed(2)}`)
  }
  return `M${pts.join(' L')} Z`
}

function Gear({ className, teeth, color }: { className?: string; teeth: number; color: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path d={gearPath(teeth, 46, 9)} fill={color} stroke="#1b1f2a" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="50" cy="50" r="14" fill="#fff7e8" stroke="#1b1f2a" strokeWidth="4" />
    </svg>
  )
}

function Spark({ className, delay }: { className?: string; delay: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('twinkle absolute', className)} style={{ ['--delay' as string]: delay }} aria-hidden="true">
      <path d="M12 1 L14.5 9.5 L23 12 L14.5 14.5 L12 23 L9.5 14.5 L1 12 L9.5 9.5 Z" fill="#fff" stroke="#1b1f2a" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}

function Sticker({ children, className, delay, tilt }: { children: React.ReactNode; className?: string; delay: string; tilt: string }) {
  return (
    <span
      className={cn(
        'float-y absolute z-10 inline-flex items-center gap-1.5 rounded-full border-(length:--stroke-thin) border-outline bg-card px-2.5 py-1.5 text-xs font-extrabold whitespace-nowrap shadow-(--shadow-press) sm:px-3 sm:text-sm',
        className,
      )}
      style={{ ['--delay' as string]: delay, ['--tilt' as string]: tilt }}
    >
      {children}
    </span>
  )
}

export function HeroScene({ stats }: { stats: { streak: string; coins: string; level: string; quest: string } }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[31rem]" aria-hidden="true">
      <Gear className="spin-slow absolute top-[2%] right-[4%] w-[22%]" teeth={10} color="#4a86f7" />
      <Gear className="spin-slow-back absolute top-[16%] right-[22%] w-[12%]" teeth={7} color="#2bb673" />
      <Gear className="spin-slow-back absolute bottom-[6%] left-[2%] w-[18%]" teeth={9} color="#e8442e" />
      <div className="absolute inset-[11%] rounded-full border-(length:--stroke) border-outline bg-primary shadow-(--shadow-hard)" />
      <div className="absolute inset-[16%] rounded-full bg-[radial-gradient(rgba(27,31,42,.18)_1.6px,transparent_2px)] bg-size-[18px_18px]" />
      <Spark className="top-[20%] left-[16%] w-[6%]" delay="0s" />
      <Spark className="top-[60%] right-[12%] w-[5%]" delay="0.8s" />
      <Spark className="bottom-[18%] left-[34%] w-[4%]" delay="1.6s" />
      <div className="absolute inset-x-[22%] top-[18%] bottom-[16%] grid place-items-center">
        <Buddy model="rover" color="sky" hat="cap" eyes="happy" sticker="star" tiers={{ motor: 2, cpu: 1 }} animate />
      </div>
      <Sticker className="top-[8%] left-0" delay="0s" tilt="-4deg">
        <Flame className="size-4 text-[#e8442e]" />
        {stats.streak}
      </Sticker>
      <Sticker className="top-[40%] right-0" delay="1.1s" tilt="3deg">
        <CoinIcon className="size-4" />
        {stats.coins}
      </Sticker>
      <Sticker className="bottom-[14%] left-0" delay="0.6s" tilt="2deg">
        <Sparkles className="size-4 text-[#c98a00]" />
        {stats.level}
      </Sticker>
      <Sticker className="right-[2%] bottom-[2%] bg-(--ok-bg)" delay="1.7s" tilt="-2deg">
        <Check className="size-4 text-success" />
        {stats.quest}
      </Sticker>
    </div>
  )
}
