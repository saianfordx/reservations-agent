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

interface Reservation {
  _id: string;
  customerName: string;
  date: string;
  time: string;
  partySize: number;
  reservationId: string;
}

interface DeleteReservationDialogProps {
  reservation: Reservation;
  onSuccess?: () => void;
}

export function DeleteReservationDialog({
  reservation,
  onSuccess,
}: DeleteReservationDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteReservation = useMutation(api.reservations.deleteReservation);

  const handleDelete = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await deleteReservation({
        id: reservation._id as Id<'reservations'>,
      });

      setOpen(false);
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete reservation'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isLoading) {
      setOpen(newOpen);
      if (!newOpen) {
        setError(null);
      }
    }
  };

  // Format time for display
  const [hours, minutes] = reservation.time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  const formattedTime = `${displayHour}:${minutes} ${ampm}`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive">
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Reservation</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this reservation? This action cannot
            be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-black">
                {reservation.customerName}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {reservation.date} at {formattedTime}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                {reservation.partySize} people
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              ID: {reservation.reservationId}
            </div>
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
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? 'Deleting...' : 'Delete Reservation'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
