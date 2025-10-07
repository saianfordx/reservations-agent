'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, useOrganization } from '@clerk/nextjs';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

/**
 * Sync Page Content Component
 * Separated to handle useSearchParams with Suspense boundary
 */
function SyncPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded: userLoaded } = useUser();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'success' | 'error'>('syncing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const storeUser = useMutation(api.users.store);
  const syncOrganization = useMutation(api.organizations.syncOrganization);
  const syncMembership = useMutation(api.organizations.syncOrganizationMembership);

  // Get redirect destination from query params (default to /dashboard)
  const redirectTo = searchParams?.get('redirectTo') || '/dashboard';

  useEffect(() => {
    async function performSync() {
      // Wait for Clerk to load
      if (!userLoaded || !orgLoaded) {
        return;
      }

      // User must be present
      if (!user) {
        setSyncStatus('error');
        setErrorMessage('No user found. Please try signing in again.');
        return;
      }

      // Wait for organization memberships to load (critical for invited users)
      if (organization && (!user.organizationMemberships || user.organizationMemberships.length === 0)) {
        console.log('Waiting for organization memberships to load...');
        return;
      }

      try {
        setSyncStatus('syncing');

        // Step 1: Sync user
        console.log('Syncing user...');
        await storeUser();

        // Step 2: If user has organization, sync organization and membership
        if (organization) {
          console.log('Syncing organization...');
          await syncOrganization({
            clerkOrganizationId: organization.id,
            name: organization.name,
            slug: organization.slug!,
            imageUrl: organization.imageUrl,
            clerkUserId: user.id,
          });

          // Step 3: Get membership data
          const userMembership = user.organizationMemberships.find(
            (m) => m.organization.id === organization.id
          );

          if (!userMembership) {
            throw new Error('Organization membership not found');
          }

          console.log('Syncing membership...');
          await syncMembership({
            clerkOrganizationId: organization.id,
            clerkUserId: user.id,
            role: userMembership.role,
            permissions: userMembership.permissions || [],
          });
        }

        console.log('Sync completed successfully');
        setSyncStatus('success');

        // Wait a brief moment to ensure database consistency
        await new Promise(resolve => setTimeout(resolve, 500));

        // Redirect to destination
        router.push(redirectTo);
      } catch (error) {
        console.error('Sync error:', error);
        setSyncStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Failed to sync your account');
      }
    }

    performSync();
  }, [user, organization, userLoaded, orgLoaded, storeUser, syncOrganization, syncMembership, router, redirectTo]);

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <Image
          src="/auth.png"
          alt="Welcome"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 flex flex-col justify-end p-12 bg-gradient-to-t from-black/60 via-black/20 to-transparent">
          <div className="relative z-10 max-w-2xl">
            <div className="space-y-4">
              <svg className="w-10 h-10 text-white/80" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
              </svg>
              <blockquote className="text-white text-2xl md:text-3xl font-semibold leading-relaxed">
                Never miss a reservation again. Our AI handles every call perfectly, 24/7. Setup is effortless.
              </blockquote>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl">
                  🍽️
                </div>
                <div>
                  <p className="text-white font-semibold">Restaurant Owner</p>
                  <p className="text-white/70 text-sm">Verified Customer</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Sync Status */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-md space-y-8">
          {syncStatus === 'syncing' && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <h2 className="text-4xl font-bold text-black mb-4">
                Setting up your account
              </h2>
              <p className="text-gray-600">
                Please wait while we prepare your dashboard...
              </p>
              <div className="mt-8 space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                  <span>Syncing user profile</span>
                </div>
                {organization && (
                  <>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                      <span>Syncing organization</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                      <span>Setting up permissions</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {syncStatus === 'error' && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-4xl font-bold text-black mb-4">
                Sync Failed
              </h2>
              <p className="text-gray-600 mb-6">
                {errorMessage || 'Something went wrong while setting up your account.'}
              </p>
              <button
                onClick={() => router.push('/sign-in')}
                className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                Return to Sign In
              </button>
            </div>
          )}

          {syncStatus === 'success' && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-4xl font-bold text-black mb-4">
                All set!
              </h2>
              <p className="text-gray-600">
                Redirecting to your dashboard...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Sync Page
 *
 * Ensures user and organization data is synced to Convex before redirecting
 * This prevents race conditions where dashboard loads before data is ready
 */
export default function SyncPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    }>
      <SyncPageContent />
    </Suspense>
  );
}
