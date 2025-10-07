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

  // Detect invitation on mount and fetch invitation details
  useEffect(() => {
    const ticket = searchParams.get('__clerk_ticket');
    const status = searchParams.get('__clerk_status');

    if (ticket && status === 'sign_up') {
      setInvitationTicket(ticket);
      setIsInvited(true);

      // Fetch invitation details from our API
      fetch('/api/invitations/details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.email) {
            setInvitedEmail(data.email);
          }
          if (data.organizationName) {
            setOrganizationName(data.organizationName);
          }
        })
        .catch((error) => {
          console.error('Error fetching invitation details:', error);
        });
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
