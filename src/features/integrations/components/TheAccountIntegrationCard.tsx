'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { CheckCircle, XCircle, Plug, Settings, RefreshCw, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface Integration {
  _id: Id<'integrations'>;
  tenantSlug?: string;
  apiKey?: string;
  status: string;
  lastTestedAt?: number;
  lastTestResult?: string;
}

interface TheAccountIntegrationCardProps {
  restaurantId: Id<'restaurants'>;
  integration?: Integration;
}

export function TheAccountIntegrationCard({
  restaurantId,
  integration,
}: TheAccountIntegrationCardProps) {
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [tenantSlug, setTenantSlug] = useState(integration?.tenantSlug || '');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const saveIntegration = useMutation(api.integrations.upsertTheAccount);
  const disconnectIntegration = useMutation(api.integrations.disconnect);

  const isConnected = integration?.status === 'connected';
  const hasError = integration?.status === 'error';

  // Validate API key format (should start with 'po_')
  const isValidApiKey = apiKey.startsWith('po_') && apiKey.length > 10;
  const isValidTenantSlug = /^[a-z0-9-]+$/.test(tenantSlug) && tenantSlug.length > 0;

  const handleOpenDialog = () => {
    setTenantSlug(integration?.tenantSlug || '');
    setApiKey('');
    setShowApiKey(false);
    setTestResult(null);
    setIsConfigDialogOpen(true);
  };

  const handleSave = async () => {
    if (!tenantSlug || !isValidApiKey) return;

    setIsSaving(true);
    try {
      await saveIntegration({
        restaurantId,
        tenantSlug,
        apiKey,
      });
      setIsConfigDialogOpen(false);
    } catch (error) {
      console.error('Failed to save integration:', error);
      setTestResult({
        success: false,
        message: 'Failed to save integration. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    const slugToTest = tenantSlug || integration?.tenantSlug;
    const keyToTest = apiKey || '';

    if (!slugToTest) {
      setTestResult({ success: false, message: 'Please enter a tenant slug' });
      return;
    }

    if (!keyToTest && !integration?.apiKey) {
      setTestResult({ success: false, message: 'Please enter an API key' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/integrations/the-account/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          tenantSlug: slugToTest,
          apiKey: keyToTest || 'use-existing',
        }),
      });

      const result = await response.json();
      setTestResult({
        success: response.ok,
        message: result.message || (response.ok ? 'Connection successful!' : 'Connection failed'),
      });
    } catch {
      setTestResult({
        success: false,
        message: 'Failed to test connection. Please check your network.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect The Account integration?')) return;

    try {
      await disconnectIntegration({ integrationId: integration!._id });
      setIsConfigDialogOpen(false);
    } catch (error) {
      console.error('Failed to disconnect:', error);
      alert('Failed to disconnect. Please try again.');
    }
  };

  return (
    <>
      <Card className="hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Plug className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">The Account</CardTitle>
                <CardDescription>POS phone order integration</CardDescription>
              </div>
            </div>

            {/* Status Badge */}
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                isConnected
                  ? 'bg-green-100 text-green-700'
                  : hasError
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600'
              }`}
            >
              {isConnected ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  Connected
                </>
              ) : hasError ? (
                <>
                  <AlertCircle className="w-3 h-3" />
                  Error
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3" />
                  Not Connected
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isConnected && integration?.tenantSlug && (
            <div className="text-sm">
              <span className="text-muted-foreground">Tenant: </span>
              <span className="font-mono text-black">{integration.tenantSlug}.theaccount.app</span>
            </div>
          )}

          {integration?.lastTestedAt && (
            <div className="text-xs text-muted-foreground">
              Last tested: {new Date(integration.lastTestedAt).toLocaleString()}
              {integration.lastTestResult && (
                <span
                  className={
                    integration.lastTestResult === 'success' ? ' text-green-600' : ' text-red-600'
                  }
                >
                  {' '}
                  ({integration.lastTestResult === 'success' ? 'Success' : integration.lastTestResult})
                </span>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleOpenDialog}>
              <Settings className="w-4 h-4 mr-2" />
              {isConnected ? 'Configure' : 'Connect'}
            </Button>

            {isConnected && (
              <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={isTesting}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isTesting ? 'animate-spin' : ''}`} />
                Test Connection
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure The Account Integration</DialogTitle>
            <DialogDescription>
              Connect your restaurant to The Account POS system for phone order integration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tenantSlug">Tenant Slug</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="tenantSlug"
                  placeholder="your-restaurant"
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value.toLowerCase())}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  .theaccount.app
                </span>
              </div>
              {tenantSlug && !isValidTenantSlug && (
                <p className="text-xs text-red-500">
                  Use lowercase letters, numbers, and hyphens only
                </p>
              )}
              <p className="text-xs text-muted-foreground">Your subdomain from The Account</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="po_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {apiKey && !isValidApiKey && (
                <p className="text-xs text-red-500">API key should start with &quot;po_&quot;</p>
              )}
              <p className="text-xs text-muted-foreground">
                Generate in The Account dashboard under Phone Orders settings
              </p>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg ${
                  testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}
              >
                {testResult.message}
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            {isConnected && (
              <Button variant="destructive" onClick={handleDisconnect} className="mr-auto">
                Disconnect
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={(!tenantSlug && !integration?.tenantSlug) || (!apiKey && !isConnected) || isTesting}
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isValidTenantSlug || !isValidApiKey || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
