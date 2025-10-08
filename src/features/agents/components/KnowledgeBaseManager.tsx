'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/components/ui/input';
import { CreateTextDialog } from './CreateTextDialog';
import { EditTextDialog } from './EditTextDialog';

interface KnowledgeBaseManagerProps {
  agentId: Id<'agents'>;
  organizationId: Id<'organizations'>;
  onSelectedItemsChange?: (items: Set<{ _id: string; elevenLabsFileId: string; name: string }>) => void;
}

export function KnowledgeBaseManager({ agentId, organizationId, onSelectedItemsChange }: KnowledgeBaseManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<{ _id: string; elevenLabsFileId: string; name: string }>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Get all knowledge base items for the organization
  const allItems = useQuery(api.knowledgeBase.getByOrganization, {
    organizationId,
  });

  // Get items currently attached to this agent
  const agentItems = useQuery(api.knowledgeBase.getByAgent, {
    agentId,
  });

  // Check for query errors
  useEffect(() => {
    if (allItems === null) {
      setError('Failed to load knowledge base items');
    }
  }, [allItems]);

  const createKnowledgeItemMutation = useMutation(api.knowledgeBase.create);
  const deleteKnowledgeItemMutation = useMutation(api.knowledgeBase.deleteItem);

  // Initialize selected items based on agent's current knowledge base
  useEffect(() => {
    if (agentItems) {
      const items = agentItems.map((item) => ({
        _id: item._id,
        elevenLabsFileId: item.elevenLabsFileId,
        name: item.name,
      }));
      const newSet = new Set(items);
      setSelectedItems(newSet);
      // Notify parent of initial selection
      onSelectedItemsChange?.(newSet);
    }
  }, [agentItems, onSelectedItemsChange]);

  const filteredItems = allItems?.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      // Step 1: Upload to ElevenLabs
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);

      const elevenLabsResponse = await fetch('/api/elevenlabs/knowledge-base/upload', {
        method: 'POST',
        body: formData,
      });

      if (!elevenLabsResponse.ok) {
        const data = await elevenLabsResponse.json();
        throw new Error(data.error || 'Failed to upload document');
      }

      const elevenLabsData = await elevenLabsResponse.json();

      // Step 2: Create mapping in our database (authenticated client-side call)
      await createKnowledgeItemMutation({
        organizationId,
        elevenLabsFileId: elevenLabsData.id,
        name: file.name,
        type: 'document',
        fileSize: file.size,
        mimeType: file.type,
      });

      // Reset file input
      e.target.value = '';
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleItem = (item: { _id: string; elevenLabsFileId: string; name: string }) => {
    const newSelected = new Set(selectedItems);

    // Find if item is already selected
    const existingItem = Array.from(newSelected).find(i => i._id === item._id);

    if (existingItem) {
      newSelected.delete(existingItem);
    } else {
      newSelected.add(item);
    }

    console.log('Knowledge base selection changed:', {
      item,
      newSelectedSize: newSelected.size,
      newSelectedArray: Array.from(newSelected),
    });

    setSelectedItems(newSelected);
    // Notify parent of the change
    onSelectedItemsChange?.(newSelected);
  };


  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <div className="text-sm font-medium text-destructive">{error}</div>
      </div>
    );
  }

  if (!allItems || !agentItems) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading knowledge base...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <div className="flex gap-2">
          <CreateTextDialog organizationId={organizationId} />
          <Button variant="outline" size="sm" disabled={isUploading} asChild>
            <label className="cursor-pointer">
              {isUploading ? 'Uploading...' : 'Add Files'}
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                accept=".txt,.pdf,.doc,.docx"
                disabled={isUploading}
              />
            </label>
          </Button>
        </div>
      </div>

      {uploadError && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {uploadError}
        </div>
      )}

      {/* Knowledge Base Items */}
      <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
        {filteredItems && filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <div
              key={item._id}
              className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
            >
              <input
                type="checkbox"
                checked={Array.from(selectedItems).some(i => i._id === item._id)}
                onChange={() => handleToggleItem({
                  _id: item._id,
                  elevenLabsFileId: item.elevenLabsFileId,
                  name: item.name,
                })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{item.name}</span>
                  <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                    {item.type}
                  </span>
                </div>
                {item.fileSize && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {(item.fileSize / 1024).toFixed(1)} KB
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                {item.type === 'text' && <EditTextDialog item={item} />}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (confirm(`Delete "${item.name}"?`)) {
                      try {
                        // Delete from ElevenLabs
                        await fetch(`/api/elevenlabs/knowledge-base/${item.elevenLabsFileId}/delete`, {
                          method: 'DELETE',
                        });

                        // Delete from our database (authenticated client-side call)
                        await deleteKnowledgeItemMutation({
                          id: item._id as Id<'knowledgeBaseItems'>,
                        });
                      } catch (err) {
                        console.error('Failed to delete:', err);
                        alert('Failed to delete item');
                      }
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-4xl mb-3">📄</div>
            <div className="text-sm font-medium text-black">No documents yet</div>
            <div className="text-xs text-muted-foreground mt-1">
              Upload documents or create text snippets to add to your knowledge base
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="text-xs text-muted-foreground text-center pt-2 border-t">
        {selectedItems.size} of {allItems.length} documents selected
      </div>
    </div>
  );
}
