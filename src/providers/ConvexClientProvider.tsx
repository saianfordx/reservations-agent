'use client';

import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient, useMutation } from 'convex/react';
import { useAuth } from '@clerk/nextjs';
import { ReactNode, useEffect } from 'react';
import { api } from '../../convex/_generated/api';

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function StoreUserOnLoad() {
  const storeUser = useMutation(api.users.store);
  const { isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn) {
      storeUser();
    }
  }, [isSignedIn, storeUser]);

  return null;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <StoreUserOnLoad />
      {children}
    </ConvexProviderWithClerk>
  );
}
