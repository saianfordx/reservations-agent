'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { LanguageSettings as LanguageSettingsType, DEFAULT_LANGUAGE_SETTINGS } from '../types/agent-config.types';
import { SUPPORTED_LANGUAGES } from '../constants/languages';

interface LanguageSettingsProps {
  settings: LanguageSettingsType;
  onChange: (settings: LanguageSettingsType) => void;
  disabled?: boolean;
}

export function LanguageSettings({ settings, onChange, disabled }: LanguageSettingsProps) {
  const currentSettings = { ...DEFAULT_LANGUAGE_SETTINGS, ...settings };

  const availableAdditionalLanguages = SUPPORTED_LANGUAGES.filter(
    (lang) => lang.code !== currentSettings.defaultLanguage &&
      !currentSettings.additionalLanguages.includes(lang.code)
  );

  const handleAddLanguage = (code: string) => {
    if (!currentSettings.additionalLanguages.includes(code)) {
      onChange({
        ...currentSettings,
        additionalLanguages: [...currentSettings.additionalLanguages, code],
      });
    }
  };

  const handleRemoveLanguage = (code: string) => {
    onChange({
      ...currentSettings,
      additionalLanguages: currentSettings.additionalLanguages.filter((c) => c !== code),
    });
  };

  const getLanguageInfo = (code: string) => {
    return SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
  };

  return (
    <div className="space-y-4">
      {/* Default Language */}
      <div className="space-y-2">
        <Label>Default Language</Label>
        <Select
          value={currentSettings.defaultLanguage}
          onValueChange={(value) => {
            // Remove from additional languages if it was there
            const newAdditional = currentSettings.additionalLanguages.filter((c) => c !== value);
            onChange({
              ...currentSettings,
              defaultLanguage: value,
              additionalLanguages: newAdditional,
            });
          }}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select default language" />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                <div className="flex items-center gap-2">
                  <span>{lang.flag}</span>
                  <span>{lang.name}</span>
                  <span className="text-xs text-muted-foreground">({lang.nativeName})</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          The primary language the agent will speak in.
        </p>
      </div>

      {/* Additional Languages */}
      <div className="space-y-2">
        <Label>Additional Languages</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {currentSettings.additionalLanguages.map((code) => {
            const lang = getLanguageInfo(code);
            return (
              <Badge key={code} variant="secondary" className="flex items-center gap-1">
                {lang?.flag} {lang?.name}
                <button
                  type="button"
                  onClick={() => handleRemoveLanguage(code)}
                  className="ml-1 hover:text-destructive"
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
        {availableAdditionalLanguages.length > 0 && (
          <Select
            value=""
            onValueChange={handleAddLanguage}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Add additional language" />
            </SelectTrigger>
            <SelectContent>
              {availableAdditionalLanguages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  <div className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-xs text-muted-foreground">
          The agent can automatically detect and switch to these languages.
        </p>
      </div>
    </div>
  );
}
