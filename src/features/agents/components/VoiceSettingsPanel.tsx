'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';
import { VoiceSettings, AdditionalVoice, DEFAULT_VOICE_SETTINGS } from '../types/agent-config.types';
import { TTS_MODELS } from '../constants/llm-models';
import { SUPPORTED_LANGUAGES } from '../constants/languages';
import { VoiceSelector } from './VoiceSelector';

interface VoiceSettingsPanelProps {
  settings: VoiceSettings | undefined;
  onChange: (settings: VoiceSettings) => void;
  disabled?: boolean;
}

export function VoiceSettingsPanel({ settings, onChange, disabled }: VoiceSettingsPanelProps) {
  const currentSettings: VoiceSettings = settings || DEFAULT_VOICE_SETTINGS;
  const [showAddVoice, setShowAddVoice] = useState(false);

  const handlePrimaryVoiceSelect = (voiceId: string, voiceName: string) => {
    onChange({
      ...currentSettings,
      primaryVoice: {
        ...currentSettings.primaryVoice,
        voiceId,
        voiceName,
      },
    });
  };

  const handlePrimarySettingChange = (key: keyof typeof currentSettings.primaryVoice, value: number | string) => {
    onChange({
      ...currentSettings,
      primaryVoice: {
        ...currentSettings.primaryVoice,
        [key]: value,
      },
    });
  };

  const handleAddAdditionalVoice = (voiceId: string, voiceName: string, language: string) => {
    const newVoice: AdditionalVoice = {
      voiceId,
      voiceName,
      voiceLabel: `${SUPPORTED_LANGUAGES.find(l => l.code === language)?.name || language} Voice`,
      language,
      stability: 0.5,
      speed: 1.0,
      similarityBoost: 0.8,
    };
    onChange({
      ...currentSettings,
      additionalVoices: [...currentSettings.additionalVoices, newVoice],
    });
    setShowAddVoice(false);
  };

  const handleRemoveAdditionalVoice = (index: number) => {
    onChange({
      ...currentSettings,
      additionalVoices: currentSettings.additionalVoices.filter((_, i) => i !== index),
    });
  };

  const handleAdditionalVoiceChange = (index: number, updates: Partial<AdditionalVoice>) => {
    onChange({
      ...currentSettings,
      additionalVoices: currentSettings.additionalVoices.map((voice, i) =>
        i === index ? { ...voice, ...updates } : voice
      ),
    });
  };

  return (
    <div className="space-y-6">
      {/* TTS Model */}
      <div className="space-y-2">
        <Label>TTS Model</Label>
        <Select
          value={currentSettings.ttsModelId}
          onValueChange={(value) => onChange({ ...currentSettings, ttsModelId: value })}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select TTS model" />
          </SelectTrigger>
          <SelectContent>
            {TTS_MODELS.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex flex-col">
                  <span>{model.name}</span>
                  <span className="text-xs text-muted-foreground">{model.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Primary Voice */}
      <div className="space-y-4 p-4 border rounded-lg">
        <Label className="text-base font-medium">Primary Voice</Label>

        <VoiceSelector
          selectedVoiceId={currentSettings.primaryVoice.voiceId}
          onVoiceSelect={handlePrimaryVoiceSelect}
        />

        {/* Voice Settings Sliders */}
        <div className="grid gap-4 mt-4">
          {/* Stability */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-sm">Stability</Label>
              <span className="text-sm text-muted-foreground">{currentSettings.primaryVoice.stability.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Expressive</span>
              <Slider
                value={[currentSettings.primaryVoice.stability]}
                onValueChange={([value]) => handlePrimarySettingChange('stability', value)}
                min={0}
                max={1}
                step={0.1}
                disabled={disabled}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground">Consistent</span>
            </div>
          </div>

          {/* Speed */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-sm">Speed</Label>
              <span className="text-sm text-muted-foreground">{currentSettings.primaryVoice.speed.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Slower</span>
              <Slider
                value={[currentSettings.primaryVoice.speed]}
                onValueChange={([value]) => handlePrimarySettingChange('speed', value)}
                min={0.5}
                max={2}
                step={0.1}
                disabled={disabled}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground">Faster</span>
            </div>
          </div>

          {/* Similarity */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-sm">Similarity</Label>
              <span className="text-sm text-muted-foreground">{currentSettings.primaryVoice.similarityBoost.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Low</span>
              <Slider
                value={[currentSettings.primaryVoice.similarityBoost]}
                onValueChange={([value]) => handlePrimarySettingChange('similarityBoost', value)}
                min={0}
                max={1}
                step={0.1}
                disabled={disabled}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground">High</span>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Voices */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">Additional Voices</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddVoice(true)}
            disabled={disabled}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Voice
          </Button>
        </div>

        {currentSettings.additionalVoices.map((voice, index) => (
          <div key={index} className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">{voice.voiceLabel}</span>
                <span className="text-sm text-muted-foreground ml-2">({voice.voiceName})</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveAdditionalVoice(index)}
                disabled={disabled}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Language</Label>
                <Select
                  value={voice.language}
                  onValueChange={(value) => handleAdditionalVoiceChange(index, { language: value })}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Voice Label</Label>
                <Input
                  value={voice.voiceLabel}
                  onChange={(e) => handleAdditionalVoiceChange(index, { voiceLabel: e.target.value })}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        ))}

        {showAddVoice && (
          <AddVoiceDialog
            onAdd={handleAddAdditionalVoice}
            onCancel={() => setShowAddVoice(false)}
            usedLanguages={currentSettings.additionalVoices.map(v => v.language)}
          />
        )}
      </div>
    </div>
  );
}

// Dialog for adding additional voice
function AddVoiceDialog({
  onAdd,
  onCancel,
  usedLanguages,
}: {
  onAdd: (voiceId: string, voiceName: string, language: string) => void;
  onCancel: () => void;
  usedLanguages: string[];
}) {
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState('');
  const [selectedVoiceName, setSelectedVoiceName] = useState('');

  const availableLanguages = SUPPORTED_LANGUAGES.filter(
    (lang) => !usedLanguages.includes(lang.code)
  );

  return (
    <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
      <Label className="font-medium">Add Additional Voice</Label>

      <div className="space-y-2">
        <Label className="text-sm">Language</Label>
        <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
          <SelectTrigger>
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            {availableLanguages.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.flag} {lang.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedLanguage && (
        <div className="space-y-2">
          <Label className="text-sm">Voice</Label>
          <VoiceSelector
            selectedVoiceId={selectedVoiceId}
            onVoiceSelect={(id, name) => {
              setSelectedVoiceId(id);
              setSelectedVoiceName(name);
            }}
          />
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => onAdd(selectedVoiceId, selectedVoiceName, selectedLanguage)}
          disabled={!selectedLanguage || !selectedVoiceId}
        >
          Add Voice
        </Button>
      </div>
    </div>
  );
}
