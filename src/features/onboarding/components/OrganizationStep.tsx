import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight } from 'lucide-react';

interface OrganizationStepProps {
  onCreateOrganization: (name: string) => Promise<void>;
  isCreating: boolean;
}

export function OrganizationStep({ onCreateOrganization, isCreating }: OrganizationStepProps) {
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organizationName.trim()) {
      setError('Please enter an organization name');
      return;
    }

    try {
      setError('');
      await onCreateOrganization(organizationName);
    } catch (err) {
      setError('Failed to create organization. Please try again.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center font-bold">1</div>
            <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center font-bold">2</div>
            <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center font-bold">3</div>
          </div>
          <h2 className="text-3xl font-bold">Welcome to AI Reservations!</h2>
          <p className="text-muted-foreground">
            Let's start by creating your organization
          </p>
        </div>

        <div className="rounded-2xl border-2 border-primary/20 p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="organizationName">Organization Name</Label>
              <Input
                id="organizationName"
                placeholder="e.g., My Restaurant Group"
                value={organizationName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrganizationName(e.target.value)}
                disabled={isCreating}
                className="text-lg"
                autoFocus
              />
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isCreating || !organizationName.trim()}
            >
              {isCreating ? (
                'Creating...'
              ) : (
                <>
                  Continue to Restaurant Setup
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
