import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RoboEasy AI — Программируй роботов с помощью ИИ',
  description: 'AI-платформа для начинающих: опиши задачу — получи готовую программу для LEGO Spike Prime. Скачай и запусти!',
  icons: {
    icon: [
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/icon.svg',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

import { Outfit, JetBrains_Mono } from 'next/font/google'

const sans = Outfit({ 
  subsets: ['latin', 'cyrillic'], 
  variable: '--font-sans',
  display: 'swap',
})

const mono = JetBrains_Mono({ 
  subsets: ['latin', 'cyrillic'], 
  variable: '--font-mono',
  display: 'swap',
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} bg-background`}>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
