'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VoiceSelector } from './VoiceSelector';
import { useCreateAgent } from '../hooks/useCreateAgent';
import { useRestaurant } from '@/features/restaurants/hooks/useRestaurants';
import { Id } from '../../../../convex/_generated/dataModel';

interface CreateAgentModalProps {
  restaurantId: Id<'restaurants'>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'config' | 'voice' | 'documents' | 'review';

export function CreateAgentModal({
  restaurantId,
  open,
  onOpenChange,
}: CreateAgentModalProps) {
  const { restaurant } = useRestaurant(restaurantId);
  const { createAgent, isCreating, error } = useCreateAgent();

  const [step, setStep] = useState<Step>('config');
  const [agentName, setAgentName] = useState('');
  const [greeting, setGreeting] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<File[]>([]);

  const steps: Step[] = ['config', 'voice', 'documents', 'review'];
  const currentStepIndex = steps.indexOf(step);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    }
  };

  const handleCreate = async () => {
    if (!restaurant || !selectedVoiceId || !selectedVoiceName) {
      return;
    }

    try {
      const result = await createAgent({
        restaurantId,
        restaurantName: restaurant.name,
        agentName: agentName || `${restaurant.name} Assistant`,
        voiceId: selectedVoiceId,
        voiceName: selectedVoiceName,
        greeting: greeting || `Thank you for calling ${restaurant.name}. How may I help you today?`,
        documents: uploadedDocs,
      });

      console.log('Agent created successfully:', result);

      // Reset form
      setStep('config');
      setAgentName('');
      setGreeting('');
      setSelectedVoiceId(null);
      setSelectedVoiceName(null);
      setUploadedDocs([]);

      onOpenChange(false);
    } catch (err) {
      console.error('Failed to create agent:', err);
      // Error is handled by the hook
    }
  };

  const handleVoiceSelect = (voiceId: string, voiceName: string) => {
    setSelectedVoiceId(voiceId);
    setSelectedVoiceName(voiceName);
  };

  const renderStepContent = () => {
    switch (step) {
      case 'config':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agent-name">Agent Name</Label>
              <Input
                id="agent-name"
                placeholder="e.g., Downtown Bistro Assistant"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
              />
              <p className="text-sm text-muted-foreground/80">
                A friendly name for this AI assistant
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="greeting">Greeting Message</Label>
              <Input
                id="greeting"
                placeholder="e.g., Thank you for calling! How may I help you?"
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
              />
              <p className="text-sm text-muted-foreground/80">
                The first message callers will hear
              </p>
            </div>
          </div>
        );

      case 'voice':
        return (
          <VoiceSelector
            selectedVoiceId={selectedVoiceId}
            onVoiceSelect={handleVoiceSelect}
          />
        );

      case 'documents':
        return (
          <div className="space-y-4">
            <div>
              <Label>Upload Knowledge Base Documents</Label>
              <p className="text-sm text-muted-foreground/80 mt-1">
                Upload your menu, policies, and other restaurant information
              </p>
            </div>

            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                type="file"
                multiple
                accept=".pdf,.txt,.doc,.docx"
                onChange={(e) => {
                  if (e.target.files) {
                    setUploadedDocs(Array.from(e.target.files));
                  }
                }}
                className="hidden"
                id="document-upload"
              />
              <label
                htmlFor="document-upload"
                className="cursor-pointer space-y-2"
              >
                <div className="text-4xl">📄</div>
                <div className="text-sm font-medium">
                  Click to upload or drag and drop
                </div>
                <div className="text-xs text-muted-foreground/80">
                  PDF, TXT, DOC, DOCX (max 10MB)
                </div>
              </label>
            </div>

            {uploadedDocs.length > 0 && (
              <div className="space-y-2">
                <Label>Uploaded Files ({uploadedDocs.length})</Label>
                {uploadedDocs.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded border"
                  >
                    <span className="text-sm truncate">{file.name}</span>
                    <button
                      onClick={() =>
                        setUploadedDocs(uploadedDocs.filter((_, i) => i !== idx))
                      }
                      className="text-red-500 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'review':
        return (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <div>
                <div className="text-sm text-muted-foreground/80">
                  Agent Name
                </div>
                <div className="font-medium">{agentName}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground/80">Greeting</div>
                <div className="font-medium">{greeting}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground/80">Voice</div>
                <div className="font-medium">{selectedVoiceName || 'Not selected'}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground/80">
                  Documents
                </div>
                <div className="font-medium">
                  {uploadedDocs.length} file(s) uploaded
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-primary/10 p-4">
              <p className="text-sm">
                Your AI assistant will be created with ElevenLabs and a phone
                number will be provisioned. This may take a few seconds.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create AI Assistant</DialogTitle>
          <DialogDescription>
            Step {currentStepIndex + 1} of {steps.length}:{' '}
            {step === 'config' && 'Configuration'}
            {step === 'voice' && 'Voice Selection'}
            {step === 'documents' && 'Knowledge Base'}
            {step === 'review' && 'Review & Create'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-3">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}
          {renderStepContent()}
        </div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStepIndex === 0 || isCreating}
          >
            Back
          </Button>

          {currentStepIndex < steps.length - 1 ? (
            <Button onClick={handleNext} disabled={isCreating}>
              Next
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={isCreating || !selectedVoiceId}>
              {isCreating ? 'Creating...' : 'Create Assistant'}
            </Button>
          )}
        </div>

        {/* Progress indicator */}
        <div className="flex gap-2 justify-center">
          {steps.map((s, idx) => (
            <div
              key={s}
              className={`h-2 w-2 rounded-full ${
                idx <= currentStepIndex ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
