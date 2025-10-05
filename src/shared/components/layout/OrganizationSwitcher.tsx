'use client';

import { useState } from 'react';
import { useOrganizationList, useOrganization, useUser } from '@clerk/nextjs';
import { ChevronDown, Settings, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomOrganizationSwitcherProps {
  onCreateOrganization?: () => void;
  isCollapsed?: boolean;
}

export function CustomOrganizationSwitcher({ onCreateOrganization, isCollapsed = false }: CustomOrganizationSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { organization } = useOrganization();
  const { user } = useUser();
  const {
    userMemberships,
    setActive,
    isLoaded
  } = useOrganizationList({
    userMemberships: {
      infinite: true,
    }
  });

  if (!isLoaded) {
    return (
      <div className="h-8 w-32 bg-white/10 rounded animate-pulse" />
    );
  }

  const handleOrganizationSwitch = async (orgId: string | null) => {
    if (!setActive) return;

    await setActive({ organization: orgId });
    setIsOpen(false);
  };

  const currentOrg = organization;
  const otherOrgs = userMemberships?.data?.filter(
    membership => membership.organization.id !== currentOrg?.id
  ) || [];

  return (
    <div className="relative flex-1 min-w-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 text-white hover:bg-white/10 rounded-lg transition-colors w-full",
          isCollapsed ? "px-2 py-2 justify-center" : "px-3 py-2"
        )}
        title={isCollapsed ? (currentOrg?.name || 'Personal account') : undefined}
      >
        {currentOrg ? (
          <>
            <div className="w-6 h-6 rounded bg-primary/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">
                {currentOrg.name.charAt(0).toUpperCase()}
              </span>
            </div>
            {!isCollapsed && <span className="text-sm font-medium truncate">{currentOrg.name}</span>}
          </>
        ) : (
          <>
            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
              <img
                src={user?.imageUrl}
                alt={user?.fullName || 'User'}
                className="w-full h-full object-cover"
              />
            </div>
            {!isCollapsed && <span className="text-sm font-medium truncate">Personal account</span>}
          </>
        )}
        {!isCollapsed && (
          <ChevronDown className={cn(
            "w-4 h-4 transition-transform flex-shrink-0",
            isOpen && "rotate-180"
          )} />
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
            {/* Current Organization */}
            {currentOrg && (
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-primary/30 flex items-center justify-center">
                      <span className="text-base font-bold text-white">
                        {currentOrg.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{currentOrg.name}</div>
                      <div className="text-xs text-gray-500">Admin</div>
                    </div>
                  </div>
                  <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
                    <Settings className="w-4 h-4" />
                    Manage
                  </button>
                </div>
              </div>
            )}

            {/* Personal Account */}
            <button
              onClick={() => handleOrganizationSwitch(null)}
              className={cn(
                "w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left",
                !currentOrg && "bg-gray-50"
              )}
            >
              <div className="w-10 h-10 rounded-full overflow-hidden">
                <img
                  src={user?.imageUrl}
                  alt={user?.fullName || 'User'}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-sm font-medium text-gray-900">Personal account</span>
            </button>

            {/* Other Organizations */}
            {otherOrgs.length > 0 && (
              <div className="border-t border-gray-200">
                {otherOrgs.map((membership) => (
                  <button
                    key={membership.organization.id}
                    onClick={() => handleOrganizationSwitch(membership.organization.id)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded bg-primary/30 flex items-center justify-center">
                      <span className="text-base font-bold text-white">
                        {membership.organization.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {membership.organization.name}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Create Organization */}
            <div className="border-t border-gray-200">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onCreateOrganization?.();
                }}
                className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-gray-400" />
                </div>
                <span className="text-sm font-medium text-gray-900">Create organization</span>
              </button>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <span>Secured by</span>
                <span className="font-semibold">Clerk</span>
              </div>
              <div className="text-center mt-1">
                <span className="text-xs text-orange-500 font-medium">Development mode</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
