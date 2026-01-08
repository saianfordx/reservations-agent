/**
 * ElevenLabs Agent Configuration Constants
 *
 * Note: LLM settings have been removed - ElevenLabs uses GPT-5.1 by default.
 * This file now only contains TTS and conversation behavior options.
 */

export const TTS_MODELS = [
  { id: 'eleven_flash_v2', name: 'Eleven Flash v2', description: 'Fastest, lowest latency' },
  { id: 'eleven_flash_v2_5', name: 'Eleven Flash v2.5', description: 'Updated Flash model' },
  { id: 'eleven_turbo_v2', name: 'Eleven Turbo v2', description: 'High quality, fast' },
  { id: 'eleven_turbo_v2_5', name: 'Eleven Turbo v2.5', description: 'Updated Turbo model' },
  { id: 'eleven_multilingual_v2', name: 'Eleven Multilingual v2', description: 'Best multilingual support' },
];

export const EAGERNESS_OPTIONS = [
  { id: 'patient', name: 'Patient', description: 'Waits longer for user to finish speaking' },
  { id: 'normal', name: 'Normal', description: 'Default response timing' },
  { id: 'eager', name: 'Eager', description: 'Responds quickly' },
];
