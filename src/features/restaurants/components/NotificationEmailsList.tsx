'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Trash2, Plus } from 'lucide-react';

interface NotificationEmailsListProps {
  restaurantId: Id<'restaurants'>;
  currentEmails?: string[];
}

export function NotificationEmailsList({
  restaurantId,
  currentEmails = [],
}: NotificationEmailsListProps) {
  const [emails, setEmails] = useState<string[]>(currentEmails);
  const [newEmail, setNewEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateNotificationEmails = useMutation(api.restaurants.updateNotificationEmails);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleAddEmail = () => {
    const trimmedEmail = newEmail.trim().toLowerCase();

    if (!trimmedEmail) {
      alert('Please enter an email address');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      alert('Please enter a valid email address');
      return;
    }

    if (emails.includes(trimmedEmail)) {
      alert('This email is already in the list');
      return;
    }

    const updatedEmails = [...emails, trimmedEmail];
    setEmails(updatedEmails);
    setNewEmail('');
    handleSaveEmails(updatedEmails);
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    const updatedEmails = emails.filter(email => email !== emailToRemove);
    setEmails(updatedEmails);
    handleSaveEmails(updatedEmails);
  };

  const handleSaveEmails = async (updatedEmails: string[]) => {
    try {
      setIsSubmitting(true);
      await updateNotificationEmails({
        restaurantId,
        emails: updatedEmails,
      });
    } catch (error) {
      console.error('Failed to update notification emails:', error);
      alert('Failed to update email list. Please try again.');
      // Revert to current emails on error
      setEmails(currentEmails);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Notification Email List</h3>
        <p className="text-sm text-muted-foreground">
          Additional email addresses that will receive reservation notifications. Organization owners and restaurant managers are automatically included.
        </p>
      </div>

      {/* Add Email Input */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="email"
            placeholder="Enter email address..."
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isSubmitting}
          />
        </div>
        <Button
          onClick={handleAddEmail}
          disabled={isSubmitting || !newEmail.trim()}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Email
        </Button>
      </div>

      {/* Email List */}
      <div className="border rounded-lg divide-y">
        {emails.length > 0 ? (
          emails.map((email) => (
            <div
              key={email}
              className="p-4 flex items-center justify-between hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium">{email}</div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveEmail(email)}
                disabled={isSubmitting}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            No additional notification emails configured.
            <br />
            <span className="text-sm">
              Add email addresses above to receive reservation notifications.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
