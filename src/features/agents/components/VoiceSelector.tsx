'use client';

import { useState, useRef } from 'react';
import { useVoices } from '../hooks/useVoices';
import { Voice } from '../types/voice.types';
import { Button } from '@/shared/components/ui/button';

interface VoiceSelectorProps {
  selectedVoiceId: string | null;
  onVoiceSelect: (voiceId: string, voiceName: string) => void;
}

export function VoiceSelector({
  selectedVoiceId,
  onVoiceSelect,
}: VoiceSelectorProps) {
  const { voices, isLoading, error } = useVoices();
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayPreview = async (voice: Voice) => {
    // Stop current audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (playingVoiceId === voice.voice_id) {
      setPlayingVoiceId(null);
      return;
    }

    // Use preview_url if available, otherwise generate preview
    if (voice.preview_url) {
      const audio = new Audio(voice.preview_url);
      audioRef.current = audio;
      setPlayingVoiceId(voice.voice_id);

      audio.onended = () => {
        setPlayingVoiceId(null);
      };

      try {
        await audio.play();
      } catch (err) {
        console.error('Error playing audio:', err);
        setPlayingVoiceId(null);
      }
    } else {
      // Generate a preview using text-to-speech
      try {
        const response = await fetch('/api/elevenlabs/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            voiceId: voice.voice_id,
            text: 'Thank you for calling. How may I help you today?',
          }),
        });

        if (!response.ok) throw new Error('Failed to generate preview');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        setPlayingVoiceId(voice.voice_id);

        audio.onended = () => {
          setPlayingVoiceId(null);
          URL.revokeObjectURL(url);
        };

        await audio.play();
      } catch (err) {
        console.error('Error generating preview:', err);
        setPlayingVoiceId(null);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground/80">Loading voices...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground/80">
        Select a voice for your AI assistant and listen to a preview
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
        {voices.map((voice) => (
          <div
            key={voice.voice_id}
            onClick={() => onVoiceSelect(voice.voice_id, voice.name)}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              selectedVoiceId === voice.voice_id
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="font-medium text-base">{voice.name}</div>

                {voice.labels && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {voice.labels.gender && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                        {voice.labels.gender}
                      </span>
                    )}
                    {voice.labels.accent && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                        {voice.labels.accent}
                      </span>
                    )}
                    {voice.labels.age && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                        {voice.labels.age}
                      </span>
                    )}
                  </div>
                )}

                {voice.labels?.description && (
                  <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-2">
                    {voice.labels.description}
                  </p>
                )}
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayPreview(voice);
                }}
                className="flex-shrink-0"
              >
                {playingVoiceId === voice.voice_id ? '⏸️' : '▶️'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
