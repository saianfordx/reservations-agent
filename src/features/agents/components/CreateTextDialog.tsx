'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
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
import { Textarea } from '@/components/ui/textarea';
import { Id } from '../../../../convex/_generated/dataModel';

interface CreateTextDialogProps {
  organizationId: Id<'organizations'>;
}

export function CreateTextDialog({ organizationId }: CreateTextDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createKnowledgeItemMutation = useMutation(api.knowledgeBase.create);

  const handleCreate = async () => {
    if (!name.trim() || !content.trim()) {
      setError('Name and content are required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Upload text content to ElevenLabs as a text file
      const blob = new Blob([content.trim()], { type: 'text/plain' });
      const file = new File([blob], `${name.trim()}.txt`, { type: 'text/plain' });

      const elevenLabsFormData = new FormData();
      elevenLabsFormData.append('file', file);
      elevenLabsFormData.append('name', name.trim());

      const elevenLabsResponse = await fetch('/api/elevenlabs/knowledge-base/upload', {
        method: 'POST',
        body: elevenLabsFormData,
      });

      if (!elevenLabsResponse.ok) {
        const data = await elevenLabsResponse.json();
        throw new Error(data.error || 'Failed to upload to ElevenLabs');
      }

      const elevenLabsData = await elevenLabsResponse.json();

      // Step 2: Create mapping in our database (authenticated client-side call)
      await createKnowledgeItemMutation({
        organizationId,
        elevenLabsFileId: elevenLabsData.id,
        name: name.trim(),
        type: 'text',
        content: content.trim(),
        fileSize: blob.size,
        mimeType: 'text/plain',
      });

      // Reset and close
      setName('');
      setContent('');
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create text item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isLoading) {
      setOpen(newOpen);
      if (!newOpen) {
        setName('');
        setContent('');
        setError(null);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Create Text
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Text Document</DialogTitle>
          <DialogDescription>
            Create a text-based knowledge base item for your agent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Document Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              placeholder="e.g., Restaurant Menu, Special Instructions, FAQ"
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isLoading}
              placeholder="Enter the content of your document..."
              rows={15}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              This content will be accessible to your AI agent when making decisions.
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || !content.trim() || isLoading}
            className="flex-1"
          >
            {isLoading ? 'Creating...' : 'Create Document'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
