import { createContext, useContext, useState } from 'react'

const LangContext = createContext(null)

export function LangProvider({ children }) {
  const [lang, setLang] = useState('en')
  const toggle = () => setLang(l => l === 'en' ? 'ml' : 'en')
  return <LangContext.Provider value={{ lang, toggle }}>{children}</LangContext.Provider>
}

export const useLang = () => useContext(LangContext)

// t(obj, lang) — pass a {en, ml} object or plain string
export function t(obj, lang) {
  if (!obj) return ''
  if (typeof obj === 'string') return obj
  return obj[lang] || obj.en || ''
}

// useT() — convenience hook; returns { lang, tr } where tr(obj) = t(obj, lang)
export function useT() {
  const { lang, toggle } = useContext(LangContext)
  return { lang, toggle, tr: (obj) => t(obj, lang) }
}
