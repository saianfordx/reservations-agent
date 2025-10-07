/**
 * Invitation Sign-Up Hook
 *
 * Following Custom Hooks Pattern from REACT.md
 * Handles invitation detection and sign-up logic
 */

import { useState, useEffect } from 'react';
import { useSignUp } from '@clerk/nextjs';
import { useSearchParams, useRouter } from 'next/navigation';

export function useInvitationSignUp() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [invitationTicket, setInvitationTicket] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const [isInvited, setIsInvited] = useState(false);

  // Detect invitation on mount
  useEffect(() => {
    const ticket = searchParams.get('__clerk_ticket');
    const status = searchParams.get('__clerk_status');

    if (ticket && status === 'sign_up') {
      setInvitationTicket(ticket);
      setIsInvited(true);

      // Try to decode invitation info from URL or Clerk
      // Clerk will auto-fill email if it's an invitation
      const emailParam = searchParams.get('email');
      if (emailParam) {
        setInvitedEmail(emailParam);
      }
    }
  }, [searchParams]);

  return {
    isLoaded,
    signUp,
    setActive,
    router,
    invitationTicket,
    organizationName,
    invitedEmail,
    isInvited,
  };
}
