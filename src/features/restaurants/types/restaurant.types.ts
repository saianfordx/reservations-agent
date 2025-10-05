import { Doc, Id } from '../../../../convex/_generated/dataModel';

export type Restaurant = Doc<'restaurants'>;

export type RestaurantFormData = {
  name: string;
  description?: string;
  cuisine?: string;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    timezone: string;
  };
  contact: {
    email: string;
    phone: string;
    website?: string;
  };
  operatingHours: {
    monday: DayHours;
    tuesday: DayHours;
    wednesday: DayHours;
    thursday: DayHours;
    friday: DayHours;
    saturday: DayHours;
    sunday: DayHours;
  };
  settings: {
    seatingCapacity: number;
    avgTableTurnoverMinutes: number;
    reservationBuffer: number;
    maxPartySize: number;
    minPartySize: number;
    advanceBookingDays: number;
    cancellationPolicy?: string;
  };
};

export type DayHours = {
  isOpen: boolean;
  open?: string;
  close?: string;
};

export const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];
