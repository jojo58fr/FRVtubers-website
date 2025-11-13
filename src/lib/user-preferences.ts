export type SupportedLanguage = 'fr' | 'en'
export type SupportedTheme = 'light' | 'dark'

export type UserPreferences = {
  language: SupportedLanguage
  theme: SupportedTheme
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  language: 'fr',
  theme: 'light',
}

const languageOptions: SupportedLanguage[] = ['fr', 'en']
const themeOptions: SupportedTheme[] = ['light', 'dark']

export function sanitizePreferences(input: Partial<UserPreferences>): UserPreferences {
  const language = languageOptions.includes(input.language as SupportedLanguage)
    ? (input.language as SupportedLanguage)
    : DEFAULT_PREFERENCES.language

  const theme = themeOptions.includes(input.theme as SupportedTheme)
    ? (input.theme as SupportedTheme)
    : DEFAULT_PREFERENCES.theme

  return { language, theme }
}

export function mergePreferences(
  current: UserPreferences | undefined,
  updates: Partial<UserPreferences>,
): UserPreferences {
  const base = current ?? DEFAULT_PREFERENCES
  return sanitizePreferences({ ...base, ...updates })
}
