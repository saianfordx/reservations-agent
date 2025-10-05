'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { RestaurantFormData, DAYS_OF_WEEK } from '../types/restaurant.types';

interface RestaurantFormProps {
  onSubmit: (data: RestaurantFormData) => Promise<void>;
  initialData?: Partial<RestaurantFormData>;
  isLoading?: boolean;
}

export function RestaurantForm({
  onSubmit,
  initialData,
  isLoading,
}: RestaurantFormProps) {
  const [formData, setFormData] = useState<RestaurantFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    cuisine: initialData?.cuisine || '',
    location: {
      address: initialData?.location?.address || '',
      city: initialData?.location?.city || '',
      state: initialData?.location?.state || '',
      country: initialData?.location?.country || 'United States',
      zipCode: initialData?.location?.zipCode || '',
      timezone: initialData?.location?.timezone || 'America/New_York',
    },
    contact: {
      email: initialData?.contact?.email || '',
      phone: initialData?.contact?.phone || '',
      website: initialData?.contact?.website || '',
    },
    operatingHours: initialData?.operatingHours || {
      monday: { isOpen: true, open: '11:00', close: '22:00' },
      tuesday: { isOpen: true, open: '11:00', close: '22:00' },
      wednesday: { isOpen: true, open: '11:00', close: '22:00' },
      thursday: { isOpen: true, open: '11:00', close: '22:00' },
      friday: { isOpen: true, open: '11:00', close: '23:00' },
      saturday: { isOpen: true, open: '11:00', close: '23:00' },
      sunday: { isOpen: true, open: '11:00', close: '21:00' },
    },
    settings: {
      seatingCapacity: initialData?.settings?.seatingCapacity || 50,
      avgTableTurnoverMinutes: initialData?.settings?.avgTableTurnoverMinutes || 90,
      reservationBuffer: initialData?.settings?.reservationBuffer || 15,
      maxPartySize: initialData?.settings?.maxPartySize || 12,
      minPartySize: initialData?.settings?.minPartySize || 1,
      advanceBookingDays: initialData?.settings?.advanceBookingDays || 30,
      cancellationPolicy: initialData?.settings?.cancellationPolicy || '',
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-2">
              Restaurant Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full rounded-md border border-input px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Cuisine</label>
            <input
              type="text"
              value={formData.cuisine}
              onChange={(e) =>
                setFormData({ ...formData, cuisine: e.target.value })
              }
              className="w-full rounded-md border border-input px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={3}
            className="w-full rounded-md border border-input px-3 py-2"
          />
        </div>
      </div>

      {/* Location */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Location</h3>

        <div>
          <label className="block text-sm font-medium mb-2">Address *</label>
          <input
            type="text"
            required
            value={formData.location.address}
            onChange={(e) =>
              setFormData({
                ...formData,
                location: { ...formData.location, address: e.target.value },
              })
            }
            className="w-full rounded-md border border-input px-3 py-2"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium mb-2">City *</label>
            <input
              type="text"
              required
              value={formData.location.city}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  location: { ...formData.location, city: e.target.value },
                })
              }
              className="w-full rounded-md border border-input px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">State *</label>
            <input
              type="text"
              required
              value={formData.location.state}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  location: { ...formData.location, state: e.target.value },
                })
              }
              className="w-full rounded-md border border-input px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">ZIP Code *</label>
            <input
              type="text"
              required
              value={formData.location.zipCode}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  location: { ...formData.location, zipCode: e.target.value },
                })
              }
              className="w-full rounded-md border border-input px-3 py-2"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-2">Country *</label>
            <input
              type="text"
              required
              value={formData.location.country}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  location: { ...formData.location, country: e.target.value },
                })
              }
              className="w-full rounded-md border border-input px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Timezone *</label>
            <select
              required
              value={formData.location.timezone}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  location: { ...formData.location, timezone: e.target.value },
                })
              }
              className="w-full rounded-md border border-input px-3 py-2"
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Contact Information</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-2">Email *</label>
            <input
              type="email"
              required
              value={formData.contact.email}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contact: { ...formData.contact, email: e.target.value },
                })
              }
              className="w-full rounded-md border border-input px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Phone *</label>
            <input
              type="tel"
              required
              value={formData.contact.phone}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  contact: { ...formData.contact, phone: e.target.value },
                })
              }
              className="w-full rounded-md border border-input px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Website</label>
          <input
            type="url"
            value={formData.contact.website}
            onChange={(e) =>
              setFormData({
                ...formData,
                contact: { ...formData.contact, website: e.target.value },
              })
            }
            className="w-full rounded-md border border-input px-3 py-2"
          />
        </div>
      </div>

      {/* Operating Hours */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Operating Hours</h3>

        <div className="space-y-3">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="flex items-center gap-4">
              <div className="w-24 capitalize">{day}</div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.operatingHours[day].isOpen}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      operatingHours: {
                        ...formData.operatingHours,
                        [day]: {
                          ...formData.operatingHours[day],
                          isOpen: e.target.checked,
                        },
                      },
                    })
                  }
                  className="rounded border-input"
                />
                <span className="text-sm">Open</span>
              </label>

              {formData.operatingHours[day].isOpen && (
                <>
                  <input
                    type="time"
                    value={formData.operatingHours[day].open || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        operatingHours: {
                          ...formData.operatingHours,
                          [day]: {
                            ...formData.operatingHours[day],
                            open: e.target.value,
                          },
                        },
                      })
                    }
                    className="rounded-md border border-input px-3 py-1"
                  />
                  <span className="text-sm">to</span>
                  <input
                    type="time"
                    value={formData.operatingHours[day].close || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        operatingHours: {
                          ...formData.operatingHours,
                          [day]: {
                            ...formData.operatingHours[day],
                            close: e.target.value,
                          },
                        },
                      })
                    }
                    className="rounded-md border border-input px-3 py-1"
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Reservation Settings</h3>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium mb-2">
              Seating Capacity *
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.settings.seatingCapacity}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  settings: {
                    ...formData.settings,
                    seatingCapacity: parseInt(e.target.value),
                  },
                })
              }
              className="w-full rounded-md border border-input px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Min Party Size *
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.settings.minPartySize}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  settings: {
                    ...formData.settings,
                    minPartySize: parseInt(e.target.value),
                  },
                })
              }
              className="w-full rounded-md border border-input px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Max Party Size *
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.settings.maxPartySize}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  settings: {
                    ...formData.settings,
                    maxPartySize: parseInt(e.target.value),
                  },
                })
              }
              className="w-full rounded-md border border-input px-3 py-2"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium mb-2">
              Table Turnover (min) *
            </label>
            <input
              type="number"
              required
              min="15"
              step="15"
              value={formData.settings.avgTableTurnoverMinutes}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  settings: {
                    ...formData.settings,
                    avgTableTurnoverMinutes: parseInt(e.target.value),
                  },
                })
              }
              className="w-full rounded-md border border-input px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Reservation Buffer (min) *
            </label>
            <input
              type="number"
              required
              min="0"
              step="5"
              value={formData.settings.reservationBuffer}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  settings: {
                    ...formData.settings,
                    reservationBuffer: parseInt(e.target.value),
                  },
                })
              }
              className="w-full rounded-md border border-input px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Advance Booking (days) *
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.settings.advanceBookingDays}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  settings: {
                    ...formData.settings,
                    advanceBookingDays: parseInt(e.target.value),
                  },
                })
              }
              className="w-full rounded-md border border-input px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Cancellation Policy
          </label>
          <textarea
            value={formData.settings.cancellationPolicy}
            onChange={(e) =>
              setFormData({
                ...formData,
                settings: {
                  ...formData.settings,
                  cancellationPolicy: e.target.value,
                },
              })
            }
            rows={3}
            className="w-full rounded-md border border-input px-3 py-2"
            placeholder="e.g., Please cancel at least 24 hours in advance..."
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={isLoading} size="lg">
          {isLoading ? 'Creating...' : 'Create Restaurant'}
        </Button>
      </div>
    </form>
  );
}
