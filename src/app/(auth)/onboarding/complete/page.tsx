'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import Image from 'next/image';
import { CheckCircle, Phone, ArrowRight } from 'lucide-react';

/**
 * Onboarding Complete Page Content
 * Shows success message and agent phone number after setup
 */
function OnboardingCompleteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [agentId, setAgentId] = useState<Id<'agents'> | null>(null);

  useEffect(() => {
    const id = searchParams.get('agentId');
    if (id) {
      setAgentId(id as Id<'agents'>);
    }
  }, [searchParams]);

  // Fetch agent details
  const agent = useQuery(
    api.agents.get,
    agentId ? { id: agentId } : 'skip'
  );

  const isLoading = agentId && agent === undefined;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Image with Testimonial */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <Image
          src="/auth.png"
          alt="Success"
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

      {/* Right Side - Success Message */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-4xl font-bold text-black">
              You&apos;re All Set!
            </h2>
            <p className="mt-4 text-gray-600">
              Your AI agent is ready to handle reservations 24/7
            </p>
          </div>

          {/* Phone Number Section */}
          {agent?.phoneNumber ? (
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Phone className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-black">Your AI Agent Number</h3>
                  <p className="text-sm text-gray-600">Call to test your agent</p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-primary/20">
                <a
                  href={`tel:${agent.phoneNumber}`}
                  className="text-2xl font-bold text-primary hover:text-primary/80 transition-colors"
                >
                  {agent.phoneNumber}
                </a>
              </div>

              <p className="text-sm text-gray-600">
                📞 Call this number right now to experience your AI agent in action!
              </p>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Phone className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-black">Phone Number Pending</h3>
                  <p className="text-sm text-gray-600">We&apos;re setting up your number</p>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                Your phone number will be ready shortly. We&apos;ll notify you once it&apos;s active and ready to receive calls.
              </p>
            </div>
          )}

          {/* What's Next */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-black">What&apos;s Next?</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Your AI agent is trained and ready to take calls</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Monitor all reservations in your dashboard</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Review call recordings and transcripts</span>
              </li>
            </ul>
          </div>

          {/* Continue Button */}
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
          >
            <span>Navigate Through the App</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Onboarding Complete Page Wrapper
 */
export default function OnboardingCompletePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <OnboardingCompleteContent />
    </Suspense>
  );
}
