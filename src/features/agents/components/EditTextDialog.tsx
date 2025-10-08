'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
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

interface KnowledgeBaseItem {
  _id: string;
  name: string;
  type: string;
  content?: string;
  elevenLabsFileId: string;
}

interface EditTextDialogProps {
  item: KnowledgeBaseItem;
}

export function EditTextDialog({ item }: EditTextDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(item.name);
  const [content, setContent] = useState(item.content || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateKnowledgeItemMutation = useMutation(api.knowledgeBase.update);

  const handleUpdate = async () => {
    if (!name.trim() || !content.trim()) {
      setError('Name and content are required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Delete old file from ElevenLabs
      await fetch(`/api/elevenlabs/knowledge-base/${item.elevenLabsFileId}/delete`, {
        method: 'DELETE',
      });

      // Step 2: Upload new content to ElevenLabs
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
        throw new Error(data.error || 'Failed to upload updated text to ElevenLabs');
      }

      const elevenLabsData = await elevenLabsResponse.json();

      // Step 3: Update our database with new ElevenLabs file ID (authenticated client-side call)
      await updateKnowledgeItemMutation({
        id: item._id as Id<'knowledgeBaseItems'>,
        name: name.trim(),
        content: content.trim(),
        elevenLabsFileId: elevenLabsData.id,
      });

      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update text item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isLoading) {
      setOpen(newOpen);
      if (!newOpen) {
        setName(item.name);
        setContent(item.content || '');
        setError(null);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Text Document</DialogTitle>
          <DialogDescription>
            Update the content of your text-based knowledge base item.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">Document Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              placeholder="e.g., Restaurant Menu, Special Instructions, FAQ"
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="edit-content">Content</Label>
            <Textarea
              id="edit-content"
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
            onClick={handleUpdate}
            disabled={!name.trim() || !content.trim() || isLoading}
            className="flex-1"
          >
            {isLoading ? 'Updating...' : 'Update Document'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
