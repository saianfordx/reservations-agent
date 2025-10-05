'use client';

export function DashboardContainer() {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-2 text-2xl font-bold">Welcome to AI Reservations</h2>
        <p className="text-muted-foreground">
          Manage your restaurant AI agents and reservations from this dashboard.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Agents
              </p>
              <p className="text-3xl font-bold">0</p>
            </div>
            <div className="text-4xl">🤖</div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Reservations Today
              </p>
              <p className="text-3xl font-bold">0</p>
            </div>
            <div className="text-4xl">📅</div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Minutes This Month
              </p>
              <p className="text-3xl font-bold">0</p>
            </div>
            <div className="text-4xl">⏱️</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Quick Actions</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <a
            href="/dashboard/restaurants/create"
            className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent"
          >
            <div className="text-3xl">🍽️</div>
            <div>
              <p className="font-medium">Create Restaurant</p>
              <p className="text-sm text-muted-foreground/80">
                Add a new restaurant location
              </p>
            </div>
          </a>

          <a
            href="/dashboard/agents/create"
            className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent"
          >
            <div className="text-3xl">🤖</div>
            <div>
              <p className="font-medium">Create AI Agent</p>
              <p className="text-sm text-muted-foreground/80">
                Set up an AI agent for reservations
              </p>
            </div>
          </a>
        </div>
      </div>

      {/* Getting Started */}
      <div className="rounded-lg border bg-muted p-6">
        <h3 className="mb-4 text-lg font-semibold">Getting Started</h3>
        <ol className="space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              1
            </div>
            <div>
              <p className="font-medium">Create your first restaurant</p>
              <p className="text-muted-foreground">
                Add your restaurant details and operating hours
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              2
            </div>
            <div>
              <p className="font-medium">Set up your AI agent</p>
              <p className="text-muted-foreground">
                Choose a voice and upload your menu
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              3
            </div>
            <div>
              <p className="font-medium">Go live</p>
              <p className="text-muted-foreground">
                Get your phone number and start taking calls
              </p>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}
