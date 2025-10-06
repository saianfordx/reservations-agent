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

interface Reservation {
  _id: string;
  customerName: string;
  customerPhone?: string;
  date: string;
  time: string;
  partySize: number;
  specialRequests?: string;
  status: string;
}

interface EditReservationDialogProps {
  reservation: Reservation;
  onSuccess?: () => void;
}

export function EditReservationDialog({
  reservation,
  onSuccess,
}: EditReservationDialogProps) {
  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState(reservation.customerName);
  const [customerPhone, setCustomerPhone] = useState(
    reservation.customerPhone || ''
  );
  const [date, setDate] = useState(reservation.date);
  const [time, setTime] = useState(reservation.time);
  const [partySize, setPartySize] = useState(reservation.partySize.toString());
  const [specialRequests, setSpecialRequests] = useState(
    reservation.specialRequests || ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateReservation = useMutation(api.reservations.updateManual);

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await updateReservation({
        id: reservation._id as Id<'reservations'>,
        customerName,
        date,
        time,
        partySize: parseInt(partySize),
        customerPhone: customerPhone || undefined,
        specialRequests: specialRequests || undefined,
      });

      setOpen(false);
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update reservation'
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
        setCustomerName(reservation.customerName);
        setCustomerPhone(reservation.customerPhone || '');
        setDate(reservation.date);
        setTime(reservation.time);
        setPartySize(reservation.partySize.toString());
        setSpecialRequests(reservation.specialRequests || '');
        setError(null);
      }
    }
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Reservation</DialogTitle>
          <DialogDescription>
            Update the reservation details.
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
            onClick={handleSave}
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
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
