'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { OrderForm } from './OrderForm';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';

interface OrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: Id<'restaurants'>;
  order?: {
    _id: Id<'orders'>;
    customerName: string;
    customerPhone: string;
    items: Array<{
      name: string;
      quantity: number;
      specialInstructions?: string;
    }>;
    orderNotes?: string;
    pickupTime?: string;
    pickupDate?: string;
  } | null;
  onSuccess?: () => void;
}

export function OrderDialog({
  isOpen,
  onClose,
  restaurantId,
  order,
  onSuccess,
}: OrderDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const createOrder = useMutation(api.orders.createManual);
  const updateOrder = useMutation(api.orders.updateManual);

  const handleSubmit = async (data: {
    customerName: string;
    customerPhone: string;
    items: Array<{
      name: string;
      quantity: number;
      specialInstructions?: string;
    }>;
    orderNotes?: string;
    pickupTime?: string;
    pickupDate?: string;
  }) => {
    setIsLoading(true);
    try {
      if (order && order._id) {
        // Update existing order
        await updateOrder({
          id: order._id,
          ...data,
        });
      } else {
        // Create new order
        await createOrder({
          restaurantId,
          ...data,
        });
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to save order:', error);
      alert('Failed to save order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {order ? 'Edit Order' : 'Create New Order'}
          </DialogTitle>
        </DialogHeader>

        <OrderForm
          initialData={order || undefined}
          onSubmit={handleSubmit}
          onCancel={onClose}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}