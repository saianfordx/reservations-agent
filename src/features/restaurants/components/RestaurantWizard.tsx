'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { RestaurantFormData, DAYS_OF_WEEK } from '../types/restaurant.types';

interface RestaurantWizardProps {
  onSubmit: (data: RestaurantFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

type WizardStep = 'basic' | 'location' | 'contact' | 'hours' | 'settings';

const STEPS: { id: WizardStep; title: string; description: string }[] = [
  { id: 'basic', title: 'Basic Information', description: 'Tell us about your business' },
  { id: 'location', title: 'Location', description: 'Where is your business located?' },
  { id: 'contact', title: 'Contact', description: 'How can customers reach you?' },
  { id: 'hours', title: 'Operating Hours', description: 'When are you open?' },
  { id: 'settings', title: 'Reservation Settings', description: 'Configure your reservation preferences' },
];

export function RestaurantWizard({ onSubmit, onCancel, isLoading }: RestaurantWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  const [formData, setFormData] = useState<RestaurantFormData>({
    name: '',
    description: '',
    cuisine: '',
    location: {
      address: '',
      city: '',
      state: '',
      country: 'United States',
      zipCode: '',
      timezone: 'America/New_York',
    },
    contact: {
      email: '',
      phone: '',
      website: '',
    },
    operatingHours: {
      monday: { isOpen: true, open: '11:00', close: '22:00' },
      tuesday: { isOpen: true, open: '11:00', close: '22:00' },
      wednesday: { isOpen: true, open: '11:00', close: '22:00' },
      thursday: { isOpen: true, open: '11:00', close: '22:00' },
      friday: { isOpen: true, open: '11:00', close: '23:00' },
      saturday: { isOpen: true, open: '11:00', close: '23:00' },
      sunday: { isOpen: true, open: '11:00', close: '21:00' },
    },
    settings: {
      seatingCapacity: 50,
      avgTableTurnoverMinutes: 90,
      reservationBuffer: 15,
      maxPartySize: 12,
      minPartySize: 1,
      advanceBookingDays: 30,
      cancellationPolicy: '',
    },
  });

  const getCurrentStepIndex = () => STEPS.findIndex((step) => step.id === currentStep);
  const isFirstStep = getCurrentStepIndex() === 0;
  const isLastStep = getCurrentStepIndex() === STEPS.length - 1;

  const handleNext = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1].id);
    }
  };

  const handleBack = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLastStep) {
      await onSubmit(formData);
    } else {
      handleNext();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
        <div className="max-w-5xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-black">Create New Business</h1>
              <p className="text-muted-foreground mt-1">
                {STEPS[getCurrentStepIndex()].description}
              </p>
            </div>
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${
                      index <= getCurrentStepIndex()
                        ? 'bg-primary text-black'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div
                      className={`text-sm font-medium ${
                        index <= getCurrentStepIndex() ? 'text-black' : 'text-muted-foreground'
                      }`}
                    >
                      {step.title}
                    </div>
                  </div>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 w-full mx-2 ${
                      index < getCurrentStepIndex() ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-8 py-12">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Basic Information */}
            {currentStep === 'basic' && (
              <div className="space-y-6">
                <div className="rounded-xl bg-white p-8 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-black">
                        Business Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full rounded-xl px-4 py-3 bg-muted/30 text-black focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="e.g., The Golden Spoon"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-black">
                        Cuisine Type
                      </label>
                      <input
                        type="text"
                        value={formData.cuisine}
                        onChange={(e) => setFormData({ ...formData, cuisine: e.target.value })}
                        className="w-full rounded-xl px-4 py-3 bg-muted/30 text-black focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="e.g., Italian, Japanese, French"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-black">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        rows={4}
                        className="w-full rounded-xl px-4 py-3 bg-muted/30 text-black focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        placeholder="Tell us about your business..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Location */}
            {currentStep === 'location' && (
              <div className="space-y-6">
                <div className="rounded-xl bg-white p-8 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-black">
                        Street Address *
                      </label>
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
                        className="w-full rounded-xl px-4 py-3 bg-muted/30 text-black focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="123 Main Street"
                      />
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-black">
                          City *
                        </label>
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
                          className="w-full rounded-xl px-4 py-3 bg-muted/30 text-black focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="New York"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 text-black">
                          State *
                        </label>
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
                          className="w-full rounded-xl px-4 py-3 bg-muted/30 text-black focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="NY"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 text-black">
                          ZIP Code *
                        </label>
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
                          className="w-full rounded-xl px-4 py-3 bg-muted/30 text-black focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="10001"
                        />
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-black">
                          Country *
                        </label>
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
                          className="w-full rounded-xl px-4 py-3 bg-muted/30 text-black focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 text-black">
                          Timezone *
                        </label>
                        <select
                          required
                          value={formData.location.timezone}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              location: { ...formData.location, timezone: e.target.value },
                            })
                          }
                          className="w-full rounded-xl px-4 py-3 bg-muted/30 text-black focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="America/New_York">Eastern Time</option>
                          <option value="America/Chicago">Central Time</option>
                          <option value="America/Denver">Mountain Time</option>
                          <option value="America/Los_Angeles">Pacific Time</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Contact */}
            {currentStep === 'contact' && (
              <div className="space-y-6">
                <div className="rounded-xl bg-white p-8 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-black">
                        Email Address *
                      </label>
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
                        className="w-full rounded-xl px-4 py-3 bg-muted/30 text-black focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="contact@yourbusiness.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-black">
                        Phone Number *
                      </label>
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
                        className="w-full rounded-xl px-4 py-3 bg-muted/30 text-black focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-black">
                        Website
                      </label>
                      <input
                        type="url"
                        value={formData.contact.website}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            contact: { ...formData.contact, website: e.target.value },
                          })
                        }
                        className="w-full rounded-xl px-4 py-3 bg-muted/30 text-black focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="https://yourbusiness.com"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Operating Hours */}
            {currentStep === 'hours' && (
              <div className="space-y-6">
                <div className="rounded-xl bg-white p-8 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
                  <div className="space-y-4">
                    {DAYS_OF_WEEK.map((day) => (
                      <div
                        key={day}
                        className="flex items-center gap-4 p-4 rounded-xl bg-muted/20"
                      >
                        <div className="w-28">
                          <span className="capitalize font-medium text-black">{day}</span>
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer">
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
                            className="rounded w-4 h-4"
                          />
                          <span className="text-sm text-black">Open</span>
                        </label>

                        {formData.operatingHours[day].isOpen && (
                          <div className="flex items-center gap-3 flex-1">
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
                              className="rounded-xl px-4 py-2 bg-muted/30 text-black focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <span className="text-sm text-muted-foreground">to</span>
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
                              className="rounded-xl px-4 py-2 bg-muted/30 text-black focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Settings */}
            {currentStep === 'settings' && (
              <div className="space-y-6">
                <div className="rounded-xl bg-white p-8 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
                  <div className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-3">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-black">
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
                          className="w-full rounded-xl px-4 py-3 bg-muted/30 text-black focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 text-black">
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
                          className="w-full rounded-xl px-4 py-3 bg-muted/30 text-black focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 text-black">
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
                          className="w-full rounded-xl px-4 py-3 bg-muted/30 text-black focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-black">
                          Table Turnover (minutes) *
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
                          className="w-full rounded-xl px-4 py-3 bg-muted/30 text-black focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 text-black">
                          Reservation Buffer (minutes) *
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
                          className="w-full rounded-xl px-4 py-3 bg-muted/30 text-black focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 text-black">
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
                          className="w-full rounded-xl px-4 py-3 bg-muted/30 text-black focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-black">
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
                        rows={4}
                        className="w-full rounded-xl px-4 py-3 bg-muted/30 text-black focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        placeholder="e.g., Please cancel at least 24 hours in advance..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isFirstStep || isLoading}
                size="lg"
              >
                Back
              </Button>

              <div className="flex items-center gap-2">
                {STEPS.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 rounded-full transition-all ${
                      index === getCurrentStepIndex()
                        ? 'w-8 bg-primary'
                        : index < getCurrentStepIndex()
                        ? 'w-2 bg-primary/60'
                        : 'w-2 bg-muted'
                    }`}
                  />
                ))}
              </div>

              <Button type="submit" disabled={isLoading} size="lg">
                {isLoading ? 'Creating...' : isLastStep ? 'Create Business' : 'Next'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
