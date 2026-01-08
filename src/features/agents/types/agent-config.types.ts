/**
 * Agent Configuration Types for ElevenLabs Integration
 */

// Language Settings
export interface LanguageSettings {
  defaultLanguage: string; // 'en', 'es', etc.
  additionalLanguages: string[];
}

// Voice Settings
export interface VoiceConfig {
  voiceId: string;
  voiceName: string;
  language: string;
  stability: number; // 0-1
  speed: number; // 0.5-2
  similarityBoost: number; // 0-1
}

export interface AdditionalVoice extends VoiceConfig {
  voiceLabel: string; // e.g., "English Voice"
}

export interface VoiceSettings {
  primaryVoice: VoiceConfig;
  additionalVoices: AdditionalVoice[];
  ttsModelId: string; // 'eleven_flash_v2', 'eleven_turbo_v2', etc.
}

// LLM Settings
export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'custom';
export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high';

export interface BackupLLM {
  enabled: boolean;
  model: string;
}

export interface LLMSettings {
  provider: LLMProvider;
  model: string; // 'gpt-4o', 'claude-3-5-sonnet', 'gemini-2.0-flash', etc.
  temperature: number; // 0-1
  reasoningEffort?: ReasoningEffort;
  maxTokens: number; // -1 for unlimited
  backupLlm?: BackupLLM;
}

// Conversational Behavior
export type Eagerness = 'patient' | 'normal' | 'eager';

export interface SoftTimeout {
  enabled: boolean;
  timeoutSeconds: number;
  message: string;
}

export interface ConversationBehavior {
  eagerness: Eagerness;
  turnTimeout: number; // seconds
  silenceEndCallTimeout: number; // -1 for disabled
  maxDuration: number; // seconds
  softTimeout?: SoftTimeout;
}

// First Message Settings
export interface LanguageMessage {
  language: string;
  message: string;
}

export interface FirstMessageSettings {
  defaultMessage: string;
  interruptible: boolean;
  translateToAll: boolean;
  perLanguageMessages?: LanguageMessage[];
}

// Audio Settings
export type UserInputAudioFormat = 'pcm_16000' | 'pcm_8000' | 'ulaw_8000' | 'pcm_22050' | 'pcm_24000' | 'pcm_44100' | 'pcm_48000';

export interface AudioSettings {
  userInputFormat: UserInputAudioFormat;
  agentOutputFormat?: string;
}

// Full Agent Configuration
export interface AgentConfiguration {
  languages?: LanguageSettings;
  voiceSettings?: VoiceSettings;
  llmSettings?: LLMSettings;
  conversationBehavior?: ConversationBehavior;
  firstMessageSettings?: FirstMessageSettings;
  audioSettings?: AudioSettings;
}

// Default values
export const DEFAULT_LANGUAGE_SETTINGS: LanguageSettings = {
  defaultLanguage: 'es',
  additionalLanguages: ['en'],
};

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  voiceId: '',
  voiceName: '',
  language: 'es',
  stability: 0.5,
  speed: 1.0,
  similarityBoost: 0.8,
};

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  primaryVoice: DEFAULT_VOICE_CONFIG,
  additionalVoices: [],
  ttsModelId: 'eleven_flash_v2_5', // v2.5 required for non-English agents
};

// LLM settings are not user-configurable - ElevenLabs defaults to GPT-5.1
// Keep type for backwards compatibility but don't expose in UI
export const DEFAULT_LLM_SETTINGS: LLMSettings = {
  provider: 'openai',
  model: 'gpt-5.1', // ElevenLabs default - not sent to API, just for reference
  temperature: 0,
  maxTokens: -1,
  // Note: reasoningEffort removed - not all models support it
};

export const DEFAULT_CONVERSATION_BEHAVIOR: ConversationBehavior = {
  eagerness: 'patient',
  turnTimeout: 2,
  silenceEndCallTimeout: -1,
  maxDuration: 600,
  softTimeout: {
    enabled: false,
    timeoutSeconds: -1,
    message: 'Hmmm...yeah give me a second...',
  },
};

export const DEFAULT_FIRST_MESSAGE_SETTINGS: FirstMessageSettings = {
  defaultMessage: 'Hola, gracias por llamar a Los Tóxicos Mariscos. ¿En qué le puedo ayudar?',
  interruptible: true,
  translateToAll: true,
};

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  userInputFormat: 'ulaw_8000',
};
