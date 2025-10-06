'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';

export default function LandingPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setIsVisible(true);

    // Handle scroll for header shadow
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);

  // Show loading while checking auth
  if (!isLoaded) {
    return null;
  }

  // If signed in, don't render landing page (redirecting)
  if (isSignedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white antialiased" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <header
        className={`sticky top-0 z-50 bg-white transition-shadow duration-300 ${
          isScrolled
            ? 'shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
            : ''
        }`}
      >
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            AI Reservations
          </div>
          <nav className="flex items-center gap-3">
            <Link href="/sign-in">
              <button className="px-5 py-2.5 text-[15px] font-medium text-gray-700 hover:text-gray-900 transition-colors">
                Sign In
              </button>
            </Link>
            <Link href="/sign-up">
              <button className="px-6 py-2.5 text-[15px] font-semibold bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-all">
                Get Started
              </button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="max-w-7xl mx-auto px-8 pt-24 pb-32">
          <div className={`max-w-4xl mx-auto text-center transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 border border-gray-200">
              <span className="text-[15px] font-medium text-gray-700">Built for Restaurants</span>
            </div>

            <h1 className="mb-8 text-[64px] md:text-[80px] font-black tracking-[-0.04em] leading-[0.95] text-gray-900">
              Manage Reservations
              <br />
              <span className="text-gray-400">Effortlessly with AI</span>
            </h1>

            <p className="mx-auto mb-10 max-w-2xl text-[20px] md:text-[22px] text-gray-600 leading-[1.5] font-normal">
              The fully customizable AI phone agent for your restaurant. Set up in minutes,
              customize everything, and never miss another reservation.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mb-12 text-[15px] font-medium text-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-green-600 text-lg">✓</span>
                <span>No technical knowledge required</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600 text-lg">✓</span>
                <span>Fully customizable</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600 text-lg">✓</span>
                <span>Live in 5 minutes</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <Link href="/sign-up">
                <button className="px-10 py-4 text-[17px] font-semibold bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-all shadow-sm">
                  Start Free Trial
                </button>
              </Link>
              <Link href="#features">
                <button className="px-10 py-4 text-[17px] font-semibold border-2 border-gray-900 text-gray-900 rounded-full hover:bg-gray-50 transition-all">
                  See How It Works
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="bg-gray-50 py-32">
          <div className="max-w-7xl mx-auto px-8">
            <div className="max-w-3xl mx-auto text-center mb-20">
              <h2 className="mb-6 text-[48px] md:text-[56px] font-black tracking-[-0.03em] leading-[1.1] text-gray-900">
                Why Restaurant Owners Love Us
              </h2>
              <p className="text-[20px] text-gray-600 leading-[1.6]">
                Powerful features that are incredibly easy to use. Customize every detail to match your restaurant&apos;s unique needs.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              {[
                {
                  color: "bg-gradient-to-br from-purple-500 to-purple-600",
                  title: "Fully Customizable",
                  description: "Choose your agent's voice, personality, and responses. Tailor everything to match your restaurant's brand—no coding required."
                },
                {
                  color: "bg-gradient-to-br from-blue-500 to-blue-600",
                  title: "Simple Setup",
                  description: "Get started in just 5 minutes. Our intuitive dashboard makes it easy to manage reservations and customize settings."
                },
                {
                  color: "bg-gradient-to-br from-cyan-500 to-cyan-600",
                  title: "Natural AI Conversations",
                  description: "Powered by ElevenLabs voice technology. Your customers will love talking to an AI that sounds human."
                },
                {
                  color: "bg-gradient-to-br from-pink-500 to-pink-600",
                  title: "Smart Reservation Management",
                  description: "Automatically create, edit, and cancel bookings. View all reservations in a beautiful calendar interface."
                },
                {
                  color: "bg-gradient-to-br from-orange-500 to-orange-600",
                  title: "Your Restaurant, Your Rules",
                  description: "Upload your menu, policies, and special instructions. The AI learns everything about your restaurant."
                },
                {
                  color: "bg-gradient-to-br from-teal-500 to-teal-600",
                  title: "Easy to Manage",
                  description: "No technical skills needed. Update your agent's knowledge, voice, or settings anytime with just a few clicks."
                }
              ].map((feature, index) => (
                <div
                  key={index}
                  className={`group p-10 rounded-[32px] ${feature.color} text-white transition-all duration-300 cursor-pointer hover:scale-[1.02]`}
                  style={{
                    boxShadow: '0 215px 86px rgba(0,0,0,.01), 0 121px 73px rgba(0,0,0,.05), 0 54px 54px rgba(0,0,0,.09), 0 13px 30px rgba(0,0,0,.1)'
                  }}
                >
                  <h3 className="mb-4 text-[24px] font-black text-white leading-tight">
                    {feature.title}
                  </h3>
                  <p className="text-[16px] text-white/90 leading-[1.6]">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-white py-32">
          <div className="max-w-7xl mx-auto px-8">
            <div className="max-w-3xl mx-auto text-center mb-20">
              <h2 className="mb-6 text-[48px] md:text-[56px] font-black tracking-[-0.03em] leading-[1.1] text-gray-900">
                So Easy, You&apos;ll Be Live in 5 Minutes
              </h2>
              <p className="text-[20px] text-gray-600 leading-[1.6]">
                No complicated setup. No technical headaches. Just four simple steps and your AI agent is ready to take calls.
              </p>
            </div>

            <div className="grid gap-12 md:grid-cols-4 max-w-5xl mx-auto">
              {[
                { step: 1, title: "Create Account", description: "Sign up in 30 seconds—no credit card needed" },
                { step: 2, title: "Customize Your Agent", description: "Choose a voice, add your restaurant details, and personalize responses" },
                { step: 3, title: "Upload Your Menu", description: "Simple drag & drop. Your AI instantly learns your menu and policies" },
                { step: 4, title: "Go Live!", description: "That's it! Start taking reservations immediately, 24/7" }
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-[20px] font-bold text-white">
                    {item.step}
                  </div>
                  <h3 className="mb-3 text-[18px] font-bold text-gray-900">
                    {item.title}
                  </h3>
                  <p className="text-[15px] text-gray-600 leading-[1.6]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="bg-gray-50 py-32">
          <div className="max-w-7xl mx-auto px-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="mb-16 text-center text-[48px] font-black tracking-[-0.03em] text-gray-900">
                Perfect for Restaurants of All Sizes
              </h2>

              <div className="grid gap-8 md:grid-cols-2">
                {[
                  { color: "bg-gradient-to-br from-emerald-500 to-emerald-600", title: "Save Time & Money", description: "No more missed calls or lost reservations. Your AI agent works 24/7 without breaks or wages." },
                  { color: "bg-gradient-to-br from-violet-500 to-violet-600", title: "Never Miss a Call", description: "Your AI agent answers every call instantly, even during peak hours when your staff is busy." },
                  { color: "bg-gradient-to-br from-amber-500 to-amber-600", title: "Better Customer Experience", description: "Customers get instant answers about your menu, policies, and availability—anytime, day or night." },
                  { color: "bg-gradient-to-br from-rose-500 to-rose-600", title: "Full Control & Insights", description: "Track all reservations in one place. Update settings instantly. See what customers are asking about." }
                ].map((benefit, index) => (
                  <div
                    key={index}
                    className={`p-10 rounded-[32px] ${benefit.color} text-white transition-all duration-300 cursor-pointer hover:scale-[1.02]`}
                    style={{
                      boxShadow: '0 215px 86px rgba(0,0,0,.01), 0 121px 73px rgba(0,0,0,.05), 0 54px 54px rgba(0,0,0,.09), 0 13px 30px rgba(0,0,0,.1)'
                    }}
                  >
                    <h3 className="text-[20px] font-black text-white mb-3">{benefit.title}</h3>
                    <p className="text-[16px] text-white/90 leading-[1.6]">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gray-900 py-32">
          <div className="max-w-7xl mx-auto px-8 text-center">
            <h2 className="mb-6 text-[48px] md:text-[56px] font-black tracking-[-0.03em] leading-[1.1] text-white">
              Transform Your Restaurant Today
            </h2>
            <p className="mb-4 text-[20px] text-gray-300 max-w-2xl mx-auto leading-[1.5]">
              Join hundreds of restaurants using AI to handle reservations effortlessly
            </p>
            <p className="mb-12 text-[15px] text-gray-400 font-medium">
              Free trial • No credit card required • Cancel anytime
            </p>
            <Link href="/sign-up">
              <button className="px-12 py-4 text-[17px] font-semibold bg-white text-gray-900 rounded-full hover:bg-gray-100 transition-all shadow-lg">
                Start Your Free Trial
              </button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-12 bg-white">
        <div className="max-w-7xl mx-auto px-8 text-center text-[14px] text-gray-500">
          <p>&copy; 2025 AI Reservations. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
