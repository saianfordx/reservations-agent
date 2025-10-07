'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SelectedRestaurantContextType {
  selectedRestaurantId: string | null;
  setSelectedRestaurantId: (id: string | null) => void;
}

const SelectedRestaurantContext = createContext<SelectedRestaurantContextType | undefined>(
  undefined
);

const STORAGE_KEY = 'selectedRestaurantId';

export function SelectedRestaurantProvider({ children }: { children: ReactNode }) {
  const [selectedRestaurantId, setSelectedRestaurantIdState] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSelectedRestaurantIdState(stored);
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage whenever it changes
  const setSelectedRestaurantId = (id: string | null) => {
    setSelectedRestaurantIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Don't render children until hydrated to avoid hydration mismatch
  if (!isHydrated) {
    return null;
  }

  return (
    <SelectedRestaurantContext.Provider
      value={{ selectedRestaurantId, setSelectedRestaurantId }}
    >
      {children}
    </SelectedRestaurantContext.Provider>
  );
}

export function useSelectedRestaurant() {
  const context = useContext(SelectedRestaurantContext);
  if (context === undefined) {
    throw new Error('useSelectedRestaurant must be used within a SelectedRestaurantProvider');
  }
  return context;
}
