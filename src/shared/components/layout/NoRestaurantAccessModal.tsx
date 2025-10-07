'use client';

import { useOrganization, UserButton } from '@clerk/nextjs';
import { CustomOrganizationSwitcher } from './OrganizationSwitcher';
import { Building2 } from 'lucide-react';

export function NoRestaurantAccessModal() {
  const { organization } = useOrganization();

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header with profile */}
      <header className="h-16 border-b border-border flex items-center justify-end px-6">
        <UserButton afterSignOutUrl="/" />
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full text-center space-y-8">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
              <Building2 className="w-12 h-12 text-muted-foreground" />
            </div>
          </div>

          {/* Message */}
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-foreground">
              No Restaurant Access
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              You do not have access to any restaurants in{' '}
              <span className="font-semibold text-foreground">
                {organization?.name}
              </span>
            </p>
            <p className="text-base text-muted-foreground">
              Please request your administrator for access to a restaurant.
            </p>
          </div>

          {/* Organization Switcher */}
          <div className="pt-8">
            <p className="text-sm text-muted-foreground mb-4">
              Switch to a different organization:
            </p>
            <div className="flex justify-center">
              <div className="w-80">
                <CustomOrganizationSwitcher />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
