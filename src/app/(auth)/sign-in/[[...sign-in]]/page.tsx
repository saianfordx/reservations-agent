import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Left Side - Testimonial */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />

        <div className="relative z-10">
          <h1 className="text-white text-3xl font-black mb-2">AI Reservations</h1>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                🍽️
              </div>
              <div>
                <h3 className="text-white font-bold text-lg mb-1">Restaurant Owner</h3>
                <p className="text-white/80 text-sm">Verified User</p>
              </div>
            </div>
            <blockquote className="text-white text-xl leading-relaxed font-medium">
              "This AI phone agent has completely transformed how we handle reservations.
              We never miss a call anymore, and our customers love the instant responses.
              Setup took literally 5 minutes!"
            </blockquote>
            <div className="mt-6 flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className="text-yellow-300 text-xl">★</span>
                ))}
              </div>
              <span className="text-white/90 text-sm font-semibold">5.0</span>
            </div>
          </div>

          <div className="text-white/70 text-sm">
            <p>Join hundreds of restaurants already using AI Reservations</p>
          </div>
        </div>
      </div>

      {/* Right Side - Sign In Form */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-md">
          <SignIn
            afterSignInUrl="/dashboard"
            signUpUrl="/sign-up"
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "shadow-none",
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
