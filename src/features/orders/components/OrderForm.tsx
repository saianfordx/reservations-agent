'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash } from 'lucide-react';

interface OrderItem {
  name: string;
  quantity: number;
  specialInstructions?: string;
}

interface OrderFormProps {
  initialData?: {
    customerName: string;
    customerPhone: string;
    items: OrderItem[];
    orderNotes?: string;
    pickupTime?: string;
    pickupDate?: string;
  };
  onSubmit: (data: {
    customerName: string;
    customerPhone: string;
    items: OrderItem[];
    orderNotes?: string;
    pickupTime?: string;
    pickupDate?: string;
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function OrderForm({ initialData, onSubmit, onCancel, isLoading }: OrderFormProps) {
  const [customerName, setCustomerName] = useState(initialData?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(initialData?.customerPhone || '');
  const [items, setItems] = useState<OrderItem[]>(initialData?.items || [{ name: '', quantity: 1 }]);
  const [orderNotes, setOrderNotes] = useState(initialData?.orderNotes || '');
  const [pickupTime, setPickupTime] = useState(initialData?.pickupTime || '');
  const [pickupDate, setPickupDate] = useState(initialData?.pickupDate || '');

  const handleAddItem = () => {
    setItems([...items, { name: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
    };
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Filter out empty items
    const validItems = items.filter(item => item.name.trim() !== '');

    if (validItems.length === 0) {
      alert('Please add at least one item to the order');
      return;
    }

    onSubmit({
      customerName,
      customerPhone,
      items: validItems,
      orderNotes: orderNotes || undefined,
      pickupTime: pickupTime || undefined,
      pickupDate: pickupDate || undefined,
    });
  };

  // Get today's date for the date picker min value
  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Customer Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer Name *</Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="John Doe"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerPhone">Phone Number *</Label>
            <Input
              id="customerPhone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="(555) 123-4567"
              required
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Order Items</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            disabled={isLoading}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="flex gap-3 p-4 border rounded-lg bg-muted/20">
              <div className="flex-1 space-y-2">
                <Input
                  value={item.name}
                  onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                  placeholder="Item name"
                  disabled={isLoading}
                />
                <div className="flex gap-2">
                  <div className="w-24">
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                      placeholder="Qty"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      value={item.specialInstructions || ''}
                      onChange={(e) => handleItemChange(index, 'specialInstructions', e.target.value)}
                      placeholder="Special instructions (optional)"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
              {items.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveItem(index)}
                  disabled={isLoading}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pickup Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Pickup Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pickupDate">Pickup Date</Label>
            <Input
              id="pickupDate"
              type="date"
              min={today}
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickupTime">Pickup Time</Label>
            <Input
              id="pickupTime"
              type="time"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Order Notes */}
      <div className="space-y-2">
        <Label htmlFor="orderNotes">Order Notes (Optional)</Label>
        <Textarea
          id="orderNotes"
          value={orderNotes}
          onChange={(e) => setOrderNotes(e.target.value)}
          placeholder="Any special requests or notes..."
          rows={3}
          disabled={isLoading}
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : initialData ? 'Update Order' : 'Create Order'}
        </Button>
      </div>
    </form>
  );
}