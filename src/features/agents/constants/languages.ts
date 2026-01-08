/**
 * Supported Languages for ElevenLabs Agents
 * Based on ElevenLabs API documentation
 */

export interface Language {
  code: string;
  name: string;
  flag: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'es', name: 'Spanish', flag: '🇪🇸', nativeName: 'Español' },
  { code: 'en', name: 'English', flag: '🇺🇸', nativeName: 'English' },
  { code: 'fr', name: 'French', flag: '🇫🇷', nativeName: 'Français' },
  { code: 'de', name: 'German', flag: '🇩🇪', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', flag: '🇮🇹', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹', nativeName: 'Português' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱', nativeName: 'Polski' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳', nativeName: 'हिन्दी' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷', nativeName: '한국어' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳', nativeName: '中文' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦', nativeName: 'العربية' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱', nativeName: 'Nederlands' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪', nativeName: 'Svenska' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺', nativeName: 'Русский' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷', nativeName: 'Türkçe' },
];

export const USER_INPUT_AUDIO_FORMATS = [
  { id: 'ulaw_8000', name: 'μ-law 8000 Hz', description: 'Telephony (recommended)' },
  { id: 'pcm_8000', name: 'PCM 8000 Hz', description: 'Low quality' },
  { id: 'pcm_16000', name: 'PCM 16000 Hz', description: 'Standard quality' },
  { id: 'pcm_22050', name: 'PCM 22050 Hz', description: 'Medium quality' },
  { id: 'pcm_24000', name: 'PCM 24000 Hz', description: 'Good quality' },
  { id: 'pcm_44100', name: 'PCM 44100 Hz', description: 'CD quality' },
  { id: 'pcm_48000', name: 'PCM 48000 Hz', description: 'High quality' },
];

export function getLanguageByCode(code: string): Language | undefined {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
}

export function getLanguageName(code: string): string {
  const language = getLanguageByCode(code);
  return language?.name || code;
}
