'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ConversationBehavior, DEFAULT_CONVERSATION_BEHAVIOR, Eagerness } from '../types/agent-config.types';
import { EAGERNESS_OPTIONS } from '../constants/llm-models';

interface ConversationSettingsProps {
  settings: ConversationBehavior;
  onChange: (settings: ConversationBehavior) => void;
  disabled?: boolean;
}

export function ConversationSettings({ settings, onChange, disabled }: ConversationSettingsProps) {
  const currentSettings = { ...DEFAULT_CONVERSATION_BEHAVIOR, ...settings };

  return (
    <div className="space-y-4">
      {/* Eagerness */}
      <div className="space-y-2">
        <Label>Response Eagerness</Label>
        <Select
          value={currentSettings.eagerness}
          onValueChange={(value) => onChange({ ...currentSettings, eagerness: value as Eagerness })}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select eagerness" />
          </SelectTrigger>
          <SelectContent>
            {EAGERNESS_OPTIONS.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                <div className="flex flex-col">
                  <span>{option.name}</span>
                  <span className="text-xs text-muted-foreground">{option.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Controls how quickly the agent responds after the user finishes speaking.
        </p>
      </div>

      {/* Turn Timeout */}
      <div className="space-y-2">
        <Label>Take Turn After Silence (seconds)</Label>
        <Input
          type="number"
          value={currentSettings.turnTimeout}
          onChange={(e) => onChange({
            ...currentSettings,
            turnTimeout: parseInt(e.target.value, 10) || 2,
          })}
          min={1}
          max={30}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Seconds of silence before the agent responds.
        </p>
      </div>

      {/* End Call After Silence */}
      <div className="space-y-2">
        <Label>End Conversation After Silence (seconds)</Label>
        <Input
          type="number"
          value={currentSettings.silenceEndCallTimeout === -1 ? '' : currentSettings.silenceEndCallTimeout}
          onChange={(e) => onChange({
            ...currentSettings,
            silenceEndCallTimeout: e.target.value === '' ? -1 : parseInt(e.target.value, 10),
          })}
          placeholder="-1 to disable"
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Seconds of silence before automatically ending the call. Set to -1 to disable.
        </p>
      </div>

      {/* Max Duration */}
      <div className="space-y-2">
        <Label>Max Conversation Duration (seconds)</Label>
        <Input
          type="number"
          value={currentSettings.maxDuration}
          onChange={(e) => onChange({
            ...currentSettings,
            maxDuration: parseInt(e.target.value, 10) || 600,
          })}
          min={60}
          max={3600}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Maximum length of a conversation in seconds (default: 600 = 10 minutes).
        </p>
      </div>

      {/* Soft Timeout */}
      <div className="space-y-3 p-4 border rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <Label>Soft Timeout</Label>
            <p className="text-xs text-muted-foreground">
              Provide feedback during longer LLM responses.
            </p>
          </div>
          <Switch
            checked={currentSettings.softTimeout?.enabled || false}
            onCheckedChange={(checked) => onChange({
              ...currentSettings,
              softTimeout: {
                enabled: checked,
                timeoutSeconds: currentSettings.softTimeout?.timeoutSeconds || 5,
                message: currentSettings.softTimeout?.message || 'Hmmm...yeah give me a second...',
              },
            })}
            disabled={disabled}
          />
        </div>

        {currentSettings.softTimeout?.enabled && (
          <>
            <div className="space-y-2">
              <Label>Timeout (seconds)</Label>
              <Input
                type="number"
                value={currentSettings.softTimeout?.timeoutSeconds || 5}
                onChange={(e) => onChange({
                  ...currentSettings,
                  softTimeout: {
                    ...currentSettings.softTimeout!,
                    timeoutSeconds: parseInt(e.target.value, 10) || 5,
                  },
                })}
                min={1}
                max={30}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={currentSettings.softTimeout?.message || ''}
                onChange={(e) => onChange({
                  ...currentSettings,
                  softTimeout: {
                    ...currentSettings.softTimeout!,
                    message: e.target.value,
                  },
                })}
                placeholder="e.g., Hmmm...give me a second..."
                disabled={disabled}
                rows={2}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
