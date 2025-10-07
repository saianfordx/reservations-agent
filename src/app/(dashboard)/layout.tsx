import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { SelectedRestaurantProvider } from '@/contexts/SelectedRestaurantContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SelectedRestaurantProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </SelectedRestaurantProvider>
  );
}
