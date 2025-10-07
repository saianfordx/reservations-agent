'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import {
  useRestaurantMembers,
  useRestaurantAccessManagement,
} from '../hooks/useRestaurantAccess';
import { useRestaurant } from '../hooks/useRestaurants';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, Trash2, Shield } from 'lucide-react';

interface RestaurantMembersManagementProps {
  restaurantId: Id<'restaurants'>;
}

interface MemberWithAccess {
  _id: Id<'restaurantAccess'>;
  userId: Id<'users'>;
  role: string;
  permissions: string[];
  user: {
    _id: Id<'users'>;
    name?: string;
    email: string;
    [key: string]: unknown;
  } | null;
}

// Restaurant role definitions
const RESTAURANT_ROLES = [
  {
    value: 'restaurant:owner',
    label: 'Owner',
    description: 'Full control over restaurant',
  },
  {
    value: 'restaurant:manager',
    label: 'Manager',
    description: 'Manage restaurant, agents, and reservations',
  },
  {
    value: 'restaurant:host',
    label: 'Host',
    description: 'View and manage reservations',
  },
  {
    value: 'restaurant:viewer',
    label: 'Viewer',
    description: 'Read-only access',
  },
];

export function RestaurantMembersManagement({
  restaurantId,
}: RestaurantMembersManagementProps) {
  const { restaurant } = useRestaurant(restaurantId);
  const { members, isLoading } = useRestaurantMembers(restaurantId);
  const { grantAccess, revokeAccess } = useRestaurantAccessManagement();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberWithAccess | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('restaurant:host');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get organization members using the Convex organization ID
  // Always call useQuery (React Hooks must be called unconditionally)
  const orgMembers = useQuery(
    api.organizations.getOrganizationMembers,
    restaurant?.organizationId ? { organizationId: restaurant.organizationId } : 'skip'
  );

  const handleGrantAccess = async () => {
    if (!selectedUserId || !selectedRole) return;

    try {
      setIsSubmitting(true);
      await grantAccess({
        restaurantId,
        userId: selectedUserId as Id<'users'>,
        role: selectedRole,
      });

      setIsAddDialogOpen(false);
      setSelectedUserId('');
      setSelectedRole('restaurant:host');
    } catch (error) {
      console.error('Failed to grant access:', error);
      alert('Failed to grant access. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditRole = (member: MemberWithAccess) => {
    setEditingMember(member);
    setSelectedRole(member.role);
    setIsEditDialogOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!editingMember || !selectedRole) return;

    try {
      setIsSubmitting(true);
      await grantAccess({
        restaurantId,
        userId: editingMember.userId as Id<'users'>,
        role: selectedRole,
      });

      setIsEditDialogOpen(false);
      setEditingMember(null);
      setSelectedRole('restaurant:host');
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('Failed to update role. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeAccess = async (userId: Id<'users'>) => {
    if (!confirm('Are you sure you want to revoke access for this user?')) {
      return;
    }

    try {
      await revokeAccess({
        restaurantId,
        userId,
      });
    } catch (error) {
      console.error('Failed to revoke access:', error);
      alert('Failed to revoke access. Please try again.');
    }
  };

  const formatRole = (role: string) => {
    const roleInfo = RESTAURANT_ROLES.find((r) => r.value === role);
    return roleInfo?.label || role;
  };

  // Filter out users who already have access
  const memberIds = new Set(members?.map((m) => m.userId));
  const availableUsers =
    orgMembers?.filter((m) => !memberIds.has(m._id as Id<'users'>)) || [];

  if (isLoading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading members...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Restaurant Members</h3>
          <p className="text-sm text-muted-foreground">
            Manage who can access this restaurant
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add Member
        </Button>
      </div>

      <div className="border rounded-lg divide-y">
        {members && members.length > 0 ? (
          members.map((member) => (
            <div
              key={member._id}
              className="p-4 flex items-center justify-between hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-sm font-semibold">
                    {member.user?.name?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <div>
                  <div className="font-medium">{member.user?.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {member.user?.email}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleEditRole(member)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-md transition-colors cursor-pointer"
                  title="Click to change role"
                >
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {formatRole(member.role)}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRevokeAccess(member.userId)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            No members assigned to this restaurant yet.
            <br />
            <span className="text-sm">
              Organization admins have access to all restaurants.
            </span>
          </div>
        )}
      </div>

      {/* Add Member Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Restaurant Member</DialogTitle>
            <DialogDescription>
              Grant access to an organization member for this restaurant.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select User</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user._id} value={user._id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableUsers.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  All organization members already have access to this
                  restaurant.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESTAURANT_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div>
                        <div className="font-medium">{role.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {role.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGrantAccess}
              disabled={!selectedUserId || isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Member Role</DialogTitle>
            <DialogDescription>
              Change the role for {editingMember?.user?.name || 'this user'}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESTAURANT_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div>
                        <div className="font-medium">{role.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {role.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingMember(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRole}
              disabled={!selectedRole || isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
