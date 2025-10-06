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

interface CreateReservationDialogProps {
  restaurantId: Id<'restaurants'>;
  onSuccess?: () => void;
}

export function CreateReservationDialog({
  restaurantId,
  onSuccess,
}: CreateReservationDialogProps) {
  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [partySize, setPartySize] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createReservation = useMutation(api.reservations.createManual);

  const handleCreate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await createReservation({
        restaurantId,
        customerName,
        date,
        time,
        partySize: parseInt(partySize),
        customerPhone: customerPhone || undefined,
        specialRequests: specialRequests || undefined,
      });

      // Reset form
      setCustomerName('');
      setCustomerPhone('');
      setDate('');
      setTime('');
      setPartySize('');
      setSpecialRequests('');

      setOpen(false);
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create reservation'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isLoading) {
      setOpen(newOpen);
      if (!newOpen) {
        // Reset form when closing
        setCustomerName('');
        setCustomerPhone('');
        setDate('');
        setTime('');
        setPartySize('');
        setSpecialRequests('');
        setError(null);
      }
    }
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>New Reservation</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Reservation</DialogTitle>
          <DialogDescription>
            Add a new reservation for your restaurant.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Customer Name */}
          <div className="space-y-2">
            <Label htmlFor="customerName">
              Customer Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              disabled={isLoading}
              placeholder="e.g., John Smith"
            />
          </div>

          {/* Customer Phone */}
          <div className="space-y-2">
            <Label htmlFor="customerPhone">Customer Phone</Label>
            <Input
              id="customerPhone"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              disabled={isLoading}
              placeholder="e.g., (555) 123-4567"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isLoading}
                min={today}
              />
            </div>

            {/* Time */}
            <div className="space-y-2">
              <Label htmlFor="time">
                Time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Party Size */}
          <div className="space-y-2">
            <Label htmlFor="partySize">
              Party Size <span className="text-destructive">*</span>
            </Label>
            <Input
              id="partySize"
              type="number"
              value={partySize}
              onChange={(e) => setPartySize(e.target.value)}
              disabled={isLoading}
              placeholder="e.g., 4"
              min="1"
            />
          </div>

          {/* Special Requests */}
          <div className="space-y-2">
            <Label htmlFor="specialRequests">Special Requests</Label>
            <Textarea
              id="specialRequests"
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              disabled={isLoading}
              placeholder="e.g., Window seat, birthday celebration"
              rows={3}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-2">
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
            disabled={
              !customerName ||
              !date ||
              !time ||
              !partySize ||
              parseInt(partySize) < 1 ||
              isLoading
            }
            className="flex-1"
          >
            {isLoading ? 'Creating...' : 'Create Reservation'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
