# AI Reservations Platform

AI-powered phone agents for restaurants. Handle reservations 24/7 with intelligent voice assistants powered by ElevenLabs.

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Clerk account (for authentication)
- Convex account (for backend/database)
- ElevenLabs API key (for AI agents)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ai-reservations
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   ```

4. Configure Convex:
   ```bash
   npx convex dev
   ```
   This will output your `NEXT_PUBLIC_CONVEX_URL`. Add it to `.env.local`.

5. Configure Clerk:
   - Create a Clerk application at https://clerk.com
   - Add your keys to `.env.local`:
     ```
     NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
     CLERK_SECRET_KEY=sk_...
     ```

6. Add ElevenLabs API key:
   ```
   ELEVENLABS_API_KEY=your_api_key_here
   ```

7. Run the development server:
   ```bash
   npm run dev
   ```

8. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
ai-reservations/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Authentication routes
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (dashboard)/         # Dashboard routes
│   │   └── dashboard/
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Landing page
│
├── convex/                  # Convex backend
│   ├── schema.ts           # Database schema
│   ├── users.ts            # User queries/mutations
│   └── README.md           # Convex setup guide
│
├── features/               # Feature modules
│   └── dashboard/
│       └── components/
│
├── shared/                 # Shared components
│   ├── components/
│   │   ├── ui/            # shadcn/ui components
│   │   └── layout/        # Layout components
│   └── hooks/             # Shared hooks
│
├── lib/                   # Utilities
│   └── utils.ts          # Helper functions
│
├── providers/            # React providers
│   └── ConvexClientProvider.tsx
│
└── docs/                 # Documentation
    ├── RULES.md         # Development rules
    ├── technical.md     # Technical spec
    └── requirements.md  # Requirements
```

## Features

### Phase 1 (Current)
- ✅ Landing page
- ✅ Authentication (Clerk)
- ✅ Dashboard layout
- ✅ Convex backend setup
- ⏳ Agent creation wizard
- ⏳ Restaurant management

### Phase 2 (Upcoming)
- Reservation system
- Calendar view
- ElevenLabs integration
- Phone number provisioning

### Phase 3 (Future)
- Usage tracking
- Analytics
- Document management
- Billing integration

## Development Rules

**Read `/docs/RULES.md` before making any changes.**

Key rules:
- 100% TypeScript (no JavaScript)
- Feature-based organization
- Extract logic into custom hooks
- Use shadcn/ui components only
- TailwindCSS for styling
- Write tests for critical code

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS
- **Backend**: Convex
- **Auth**: Clerk
- **AI**: ElevenLabs Conversational AI
- **UI**: shadcn/ui components

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npx convex dev       # Start Convex development
npx convex deploy    # Deploy Convex to production
```

## Environment Variables

See `.env.local.example` for required environment variables.

## Contributing

1. Read `/docs/RULES.md`
2. Create a feature branch
3. Follow the coding standards
4. Write tests
5. Submit a pull request

## Support

For issues and questions:
- Technical docs: `/docs/technical.md`
- Architecture guide: `/docs/REACT.md`
- Requirements: `/docs/requirements.md`

## License

Proprietary - All rights reserved
