'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { Check, Phone, ArrowRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

export default function OnboardingCompletePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const agentId = searchParams.get('agentId') as Id<'agents'> | null;
  const restaurantId = searchParams.get('restaurantId') as Id<'restaurants'> | null;

  const agent = useQuery(
    api.agents.get,
    agentId ? { id: agentId } : 'skip'
  );

  if (!agentId || !restaurantId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-500">Invalid onboarding data</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading agent details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Success Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500 mb-4">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold">You&apos;re All Set! 🎉</h1>
          <p className="text-xl text-muted-foreground">
            Your AI assistant is ready to take calls
          </p>
        </div>

        {/* Phone Number Card */}
        <div className="rounded-2xl border-2 border-primary bg-primary/5 p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-2">
              <Phone className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Your AI Phone Number</h2>
            <p className="text-muted-foreground">
              People can now call this number to make reservations
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-primary mb-2">
              {agent.phoneNumber || 'Provisioning...'}
            </div>
            {!agent.phoneNumber && (
              <p className="text-sm text-muted-foreground">
                Phone number is being set up. This usually takes a few seconds.
              </p>
            )}
          </div>

          {/* Quick Setup Summary */}
          <div className="space-y-3">
            <h3 className="font-semibold">What&apos;s configured:</h3>
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white">
                <Check className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <div className="font-medium">AI Assistant Created</div>
                  <div className="text-sm text-muted-foreground">{agent.name}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white">
                <Check className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <div className="font-medium">Voice Configured</div>
                  <div className="text-sm text-muted-foreground">
                    Professional AI voice selected
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white">
                <Check className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <div className="font-medium">24/7 Availability</div>
                  <div className="text-sm text-muted-foreground">
                    Your assistant never misses a call
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h3 className="font-semibold text-lg">Next Steps:</h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">1.</span>
              <span>Test your AI assistant by calling the number above</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">2.</span>
              <span>Share this number on your website and marketing materials</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">3.</span>
              <span>Monitor reservations and calls from your dashboard</span>
            </li>
          </ul>
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-4 justify-center">
          <Button
            size="lg"
            onClick={() => router.push(`/dashboard/${restaurantId}`)}
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
