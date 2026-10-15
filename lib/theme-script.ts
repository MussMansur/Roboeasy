/**
 * Kept out of the 'use client' theme module so the server layout can inline
 * the script text (a client module would export a reference, not the string).
 */

export const THEME_KEY = 'theme'

/** Inline script for <head>: applies the theme before the first paint and follows OS changes. */
export const THEME_SCRIPT = `(function(){try{var d=document.documentElement,q=matchMedia('(prefers-color-scheme: light)');function a(){var p=localStorage.getItem('${THEME_KEY}');if(p!=='light'&&p!=='dark')p='system';d.setAttribute('data-theme-pref',p);d.setAttribute('data-theme',p==='system'?(q.matches?'light':'dark'):p)}a();q.addEventListener('change',a);window.__applyTheme=a}catch(e){}})()`
