'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TestCallDialogProps {
  agentId: string;
  phoneNumberId?: string;
}

export function TestCallDialog({ agentId, phoneNumberId }: TestCallDialogProps) {
  const [open, setOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleTestCall = async () => {
    if (!phoneNumberId) {
      setError('No phone number configured for this agent');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/elevenlabs/agents/${agentId}/test-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberId,
          toNumber: phoneNumber,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to initiate test call');
      }

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setPhoneNumber('');
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate test call');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex-1">
          📞 Test Call
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Test Agent Call</DialogTitle>
          <DialogDescription>
            Enter your phone number to receive a test call from the AI agent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1234567890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Use E.164 format (e.g., +1234567890)
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-primary/10 p-3 text-sm text-primary">
              ✓ Test call initiated! You should receive a call shortly.
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleTestCall}
            disabled={!phoneNumber || isLoading}
            className="flex-1"
          >
            {isLoading ? 'Calling...' : 'Initiate Call'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
