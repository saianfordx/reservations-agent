'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useOrganization } from '@clerk/nextjs';
import { useRestaurants } from '@/features/restaurants/hooks/useRestaurants';
import Image from 'next/image';
import { CheckCircle, ArrowRight } from 'lucide-react';

/**
 * Invited Member Onboarding Page
 *
 * Shown after invited users complete sign-up
 * Following the same style as auth pages
 */
export default function InvitedOnboardingPage() {
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { restaurants, isLoading: restaurantsLoading } = useRestaurants();

  // Check if user is org admin
  const userMembership = user?.organizationMemberships?.find(
    (m) => m.organization.id === organization?.id
  );
  const isOrgAdmin = userMembership?.role === 'org:admin';

  // Auto-redirect after a few seconds
  useEffect(() => {
    if (!userLoaded || !orgLoaded || restaurantsLoading) return;

    const timer = setTimeout(() => {
      if (isOrgAdmin) {
        // Admin: check if they have restaurants
        if (!restaurants || restaurants.length === 0) {
          // No restaurants yet - stay on this page to show "create restaurant" message
          return;
        } else {
          // Has restaurants - go to dashboard
          router.push('/dashboard');
        }
      } else {
        // Member: go to redirect page (will handle restaurant access)
        router.push('/dashboard/redirect');
      }
    }, 5000); // 5 second delay to read the message

    return () => clearTimeout(timer);
  }, [userLoaded, orgLoaded, restaurantsLoading, isOrgAdmin, restaurants, router]);

  // Loading state
  if (!userLoaded || !orgLoaded || restaurantsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const hasRestaurants = restaurants && restaurants.length > 0;

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Image with Testimonial (matching auth pages) */}
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

      {/* Right Side - Welcome Message */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-4xl font-bold text-black">
              Welcome to {organization?.name}!
            </h2>
            <p className="mt-4 text-gray-600">
              Your account has been created successfully.
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
            {isOrgAdmin ? (
              /* Admin Message */
              <>
                <h3 className="text-lg font-semibold text-black">You&apos;re an Admin</h3>
                <p className="text-gray-600 text-sm">
                  As an administrator, you have full access to manage restaurants, team members, and all settings.
                </p>
                {!hasRestaurants ? (
                  <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mt-4">
                    <p className="text-black font-medium text-sm">🚀 Next step: Create your first restaurant</p>
                    <p className="text-gray-600 text-sm mt-1">
                      Click the button below to set up your first AI reservations agent.
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm">
                    You&apos;ll be redirected to the dashboard in a moment...
                  </p>
                )}
              </>
            ) : (
              /* Member Message */
              <>
                <h3 className="text-lg font-semibold text-black">You&apos;re a Team Member</h3>
                <p className="text-gray-600 text-sm">
                  Your administrator will grant you access to specific restaurants.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <p className="text-black font-medium text-sm">💡 What&apos;s next?</p>
                  <p className="text-gray-600 text-sm mt-1">
                    Contact your administrator to get restaurant access. You&apos;ll be redirected shortly...
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Continue Button */}
          <button
            onClick={() => {
              if (isOrgAdmin && !hasRestaurants) {
                // Admin with no restaurants - go to dashboard (can create from there)
                router.push('/dashboard');
              } else if (isOrgAdmin) {
                router.push('/dashboard');
              } else {
                router.push('/dashboard/redirect');
              }
            }}
            className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
          >
            <span>Continue to Dashboard</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          <p className="text-center text-sm text-gray-500">
            Redirecting automatically in 5 seconds...
          </p>
        </div>
      </div>
    </div>
  );
}
