import { RestaurantWizard } from '@/features/restaurants/components/RestaurantWizard';
import { RestaurantFormData } from '@/features/restaurants/types/restaurant.types';
import { Check } from 'lucide-react';

interface RestaurantStepProps {
  organizationId: string;
  onCreateRestaurant: (data: RestaurantFormData) => Promise<void>;
  isCreating: boolean;
}

export function RestaurantStep({ organizationId, onCreateRestaurant, isCreating }: RestaurantStepProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-8">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
              <Check className="w-5 h-5" />
            </div>
            <div className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center font-bold">2</div>
            <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center font-bold">3</div>
          </div>
          <h2 className="text-3xl font-bold">Create Your Restaurant</h2>
          <p className="text-muted-foreground">
            Tell us about your business
          </p>
        </div>

        <RestaurantWizard
          onSubmit={onCreateRestaurant}
          onCancel={() => {}}
          isLoading={isCreating}
        />
      </div>
    </div>
  );
}
