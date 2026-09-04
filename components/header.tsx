'use client'

import { useEffect, useState } from 'react'
import { CircuitBoard, Moon, Sun } from 'lucide-react'
import Link from 'next/link'

interface HeaderProps {
  language: 'en' | 'ru'
  onLanguageChange: (lang: 'en' | 'ru') => void
  dark: boolean
  onDarkChange: (dark: boolean) => void
  /** Optional right-side nav links */
  navLinks?: { label: string; href: string }[]
  /** Show "Start" / workspace button */
  showWorkspaceLink?: boolean
}

export default function Header({
  language,
  onLanguageChange,
  dark,
  onDarkChange,
  navLinks,
  showWorkspaceLink,
}: HeaderProps) {
  return (
    <header className="topbar">
      <Link className="brand" href="/">
        <span className="brand-mark">
          <CircuitBoard size={19} />
        </span>
        <span>
          RoboEasy <b>AI</b>
        </span>
      </Link>

      {navLinks && (
        <nav>
          {navLinks.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
      )}

      {showWorkspaceLink && (
        <nav>
          <Link href="/workspace" className="topbar-workspace-link">
            {language === 'ru' ? 'Открыть платформу' : 'Open Platform'}
          </Link>
        </nav>
      )}

      <div className="language-switcher" aria-label="Language">
        <button
          className={language === 'en' ? 'active' : ''}
          onClick={() => onLanguageChange('en')}
        >
          EN
        </button>
        <button
          className={language === 'ru' ? 'active' : ''}
          onClick={() => onLanguageChange('ru')}
        >
          RU
        </button>
      </div>

      <button
        className="icon-button"
        aria-label="Toggle color theme"
        onClick={() => onDarkChange(!dark)}
      >
        {dark ? <Sun size={17} /> : <Moon size={17} />}
      </button>
    </header>
  )
}
