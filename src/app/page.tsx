import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="text-xl font-bold">AI Reservations</div>
          <nav className="flex items-center gap-4">
            <Link href="/sign-in">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-20 text-center">
          <h1 className="mb-6 text-5xl font-bold tracking-tight">
            AI-Powered Phone Agents
            <br />
            <span className="text-primary/90">For Your Restaurant</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground/80">
            Handle reservations 24/7 with intelligent AI agents. No missed calls,
            no busy signals, just seamless customer service.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/sign-up">
              <Button size="lg" className="text-lg">
                Start Free Trial
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="text-lg">
                Learn More
              </Button>
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="border-t bg-muted/50 py-20">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">
              Everything You Need
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="rounded-lg border bg-background p-6">
                <div className="mb-4 text-4xl">🤖</div>
                <h3 className="mb-2 text-xl font-semibold">AI-Powered Agents</h3>
                <p className="text-muted-foreground">
                  Natural voice conversations powered by ElevenLabs. Each agent is
                  specialized for your restaurant.
                </p>
              </div>
              <div className="rounded-lg border bg-background p-6">
                <div className="mb-4 text-4xl">📅</div>
                <h3 className="mb-2 text-xl font-semibold">
                  Smart Reservations
                </h3>
                <p className="text-muted-foreground">
                  Create, edit, and cancel reservations automatically. View
                  everything in a clean calendar interface.
                </p>
              </div>
              <div className="rounded-lg border bg-background p-6">
                <div className="mb-4 text-4xl">📚</div>
                <h3 className="mb-2 text-xl font-semibold">Custom Knowledge</h3>
                <p className="text-muted-foreground">
                  Upload your menu and policies. Your AI agent knows everything
                  about your restaurant.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">
              Get Started in Minutes
            </h2>
            <div className="grid gap-8 md:grid-cols-4">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  1
                </div>
                <h3 className="mb-2 font-semibold">Create Account</h3>
                <p className="text-sm text-muted-foreground">
                  Sign up in seconds
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  2
                </div>
                <h3 className="mb-2 font-semibold">Setup Your Agent</h3>
                <p className="text-sm text-muted-foreground">
                  Add restaurant details & choose a voice
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  3
                </div>
                <h3 className="mb-2 font-semibold">Upload Menu</h3>
                <p className="text-sm text-muted-foreground">
                  Drag & drop your menu PDF
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  4
                </div>
                <h3 className="mb-2 font-semibold">Go Live</h3>
                <p className="text-sm text-muted-foreground">
                  Start taking calls immediately
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t bg-primary py-20 text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="mb-4 text-3xl font-bold">
              Ready to Transform Your Restaurant?
            </h2>
            <p className="mb-8 text-lg opacity-90">
              Join hundreds of restaurants using AI to handle reservations 24/7
            </p>
            <Link href="/sign-up">
              <Button size="lg" variant="secondary" className="text-lg">
                Get Started Now
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 AI Reservations. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
