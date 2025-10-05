'use client';

import { useState, useEffect } from 'react';
import { Voice, VoicesResponse } from '../types/voice.types';

export function useVoices() {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVoices() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/elevenlabs/voices');

        if (!response.ok) {
          throw new Error('Failed to fetch voices');
        }

        const data: VoicesResponse = await response.json();
        setVoices(data.voices);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load voices');
      } finally {
        setIsLoading(false);
      }
    }

    fetchVoices();
  }, []);

  return { voices, isLoading, error };
}
