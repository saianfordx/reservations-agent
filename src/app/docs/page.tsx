'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const features = [
  {
    id: 'ai-phone-agent',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
      </svg>
    ),
    title: 'AI Phone Agent',
    subtitle: 'Your 24/7 virtual receptionist',
    description: 'NerdVi provides each restaurant with a dedicated AI-powered phone agent that answers calls, handles reservations, takes to-go orders, and answers customer questions — all through natural voice conversations.',
    details: [
      'Answers every call instantly, even during peak hours',
      'Handles reservations, modifications, and cancellations automatically',
      'Takes to-go orders with full menu item customization',
      'Answers questions about your menu, hours, location, and policies',
      'Available 24/7/365 — no breaks, no sick days, no overtime',
      'Speaks naturally using advanced ElevenLabs voice technology',
    ],
    color: 'from-purple-500 to-indigo-600',
  },
  {
    id: 'voice-customization',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
      </svg>
    ),
    title: 'Voice Customization',
    subtitle: 'Choose the perfect voice for your brand',
    description: 'Select from a wide library of natural-sounding AI voices powered by ElevenLabs. Pick the voice that best matches your restaurant\'s personality — professional, friendly, warm, or casual.',
    details: [
      'Access a large library of premium AI voices',
      'Preview voices before selecting',
      'Choose voices by accent, gender, age, and tone',
      'Customize the greeting message your callers hear',
      'Set the conversation style (professional, friendly, casual)',
      'Change your voice anytime with just a few clicks',
    ],
    color: 'from-pink-500 to-rose-600',
  },
  {
    id: 'reservation-management',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    title: 'Smart Reservation Management',
    subtitle: 'Automated bookings with a beautiful calendar',
    description: 'NerdVi automatically creates, edits, and cancels reservations through phone conversations. Every booking is tracked in a clean calendar dashboard where you can manage everything at a glance.',
    details: [
      'AI automatically collects guest name, date, time, and party size',
      'Each reservation gets a unique 4-digit confirmation ID',
      'Guests can modify or cancel by calling back with their ID',
      'Visual calendar view with day, week, and month layouts',
      'Manually create or edit reservations from the dashboard',
      'Track reservation history and status changes',
      'Supports special requests and table preferences',
    ],
    color: 'from-blue-500 to-cyan-600',
  },
  {
    id: 'to-go-orders',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
    title: 'To-Go Order Taking',
    subtitle: 'Accept phone orders effortlessly',
    description: 'Your AI agent can take complete to-go orders over the phone, including item customizations and special instructions. Orders are tracked with status updates from pending through completion.',
    details: [
      'AI reads your full menu to customers and takes orders',
      'Handles item customizations and modifications',
      'Supports special dietary instructions and requests',
      'Customers choose their preferred pickup time',
      'Orders tracked through: pending, confirmed, preparing, ready, completed',
      'Each order gets a unique confirmation ID',
    ],
    color: 'from-orange-500 to-amber-600',
  },
  {
    id: 'knowledge-base',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    title: 'Knowledge Base',
    subtitle: 'Teach your agent everything about your restaurant',
    description: 'Upload your menu, policies, FAQs, and any other documents. NerdVi\'s AI instantly learns everything and can answer customer questions accurately using your own information.',
    details: [
      'Upload menus as PDF, text, or other document formats',
      'Create custom text snippets for specific information',
      'AI uses RAG (Retrieval Augmented Generation) to answer accurately',
      'Update your knowledge base anytime — changes take effect immediately',
      'Add restaurant policies, specials, event info, and more',
      'Your agent only shares information you\'ve provided — nothing made up',
    ],
    color: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'multi-restaurant',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
      </svg>
    ),
    title: 'Multi-Restaurant Support',
    subtitle: 'Manage all your locations from one account',
    description: 'Whether you have one restaurant or twenty, NerdVi scales with you. Each location gets its own dedicated AI agent with its own phone number, voice, knowledge base, and settings — all managed from a single dashboard.',
    details: [
      'One account manages unlimited restaurant locations',
      'Each restaurant gets a dedicated AI agent',
      'Separate phone numbers per location',
      'Independent knowledge bases — no data crossover between restaurants',
      'Unique settings per restaurant (hours, capacity, policies)',
      'Switch between restaurants instantly from the dashboard',
    ],
    color: 'from-violet-500 to-purple-600',
  },
  {
    id: 'team-management',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    title: 'Team & Permissions',
    subtitle: 'Collaborate with your staff securely',
    description: 'Invite your team members and control exactly what they can see and do. From owners to hosts, everyone gets the right level of access to manage reservations and restaurant settings.',
    details: [
      'Invite team members via email',
      'Role-based access: Owner, Manager, Host, Viewer',
      'Fine-grained permissions per restaurant',
      'Organization-level management for multi-location groups',
      'Secure single sign-on (SSO) support',
      'Activity tracking for accountability',
    ],
    color: 'from-sky-500 to-blue-600',
  },
  {
    id: 'pos-integration',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
    ),
    title: 'POS Integration',
    subtitle: 'Connect to your existing systems',
    description: 'NerdVi integrates with your point-of-sale system so phone orders flow directly into your kitchen workflow. Currently supporting The Account POS with more integrations coming soon.',
    details: [
      'Phone orders automatically sent to your POS system',
      'Menu syncs from your POS — no duplicate data entry',
      'Supports item modifiers, add-ons, and special instructions',
      'Real-time integration status monitoring',
      'Test your integration before going live',
      'More POS integrations coming soon',
    ],
    color: 'from-red-500 to-pink-600',
  },
  {
    id: 'call-analytics',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: 'Call Analytics & Insights',
    subtitle: 'Understand your call volume and performance',
    description: 'Track every call your AI agent handles. See total calls, conversation minutes, reservation success rates, and what your customers are asking about — all in real-time from your dashboard.',
    details: [
      'Track total calls handled per agent',
      'Monitor conversation minutes for billing transparency',
      'View call history with conversation details',
      'See reservation and order success rates',
      'Identify peak call hours and busy days',
      'Usage breakdown per restaurant for multi-location owners',
    ],
    color: 'from-cyan-500 to-teal-600',
  },
  {
    id: 'easy-setup',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: '5-Minute Setup',
    subtitle: 'No technical skills required',
    description: 'Getting started with NerdVi is incredibly simple. Create your account, add your restaurant details, pick a voice, upload your menu, and your AI agent is live and ready to take calls. The entire process takes under 5 minutes.',
    details: [
      'Step 1: Create your account (30 seconds)',
      'Step 2: Enter your restaurant name, address, and hours',
      'Step 3: Choose an AI voice from our library',
      'Step 4: Upload your menu and any policies',
      'Step 5: Your agent gets a dedicated phone number and goes live',
      'No coding, no technical knowledge, no complicated configuration',
    ],
    color: 'from-yellow-500 to-orange-600',
  },
  {
    id: 'email-notifications',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
    title: 'Email Notifications',
    subtitle: 'Stay informed after every call',
    description: 'Receive email summaries after every call your AI agent handles. Know exactly what was discussed, what reservations were made, and what orders were placed — without having to check the dashboard.',
    details: [
      'Automatic email notification after each completed call',
      'Includes call summary with key details',
      'Reservation and order confirmations sent to your inbox',
      'Configure which team members receive notifications',
      'Never miss an important call or booking',
    ],
    color: 'from-indigo-500 to-violet-600',
  },
  {
    id: 'multi-language',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
      </svg>
    ),
    title: 'Multi-Language Support',
    subtitle: 'Serve customers in their preferred language',
    description: 'Configure your AI agent to converse in multiple languages. Whether your customers speak English, Spanish, or other languages, NerdVi can handle the conversation naturally.',
    details: [
      'Set your agent\'s primary language',
      'Support for English, Spanish, and more',
      'Natural-sounding voice in each language',
      'Language-specific greetings and responses',
      'Serve diverse communities effortlessly',
    ],
    color: 'from-teal-500 to-emerald-600',
  },
];

const faqs = [
  {
    question: 'How does NerdVi work?',
    answer: 'NerdVi provides your restaurant with a dedicated AI phone agent powered by advanced voice technology. When a customer calls your NerdVi phone number, the AI answers immediately, has a natural conversation, and can take reservations, accept to-go orders, or answer questions about your restaurant — all without human intervention.',
  },
  {
    question: 'Do I need any technical knowledge to use NerdVi?',
    answer: 'Not at all. NerdVi is designed so that anyone can set it up in under 5 minutes. Just create your account, enter your restaurant details, pick a voice, upload your menu, and you\'re live. Everything is managed through a simple, intuitive dashboard.',
  },
  {
    question: 'Can customers tell they\'re talking to an AI?',
    answer: 'NerdVi uses ElevenLabs\' industry-leading voice technology, which produces incredibly natural-sounding conversations. While transparency is important, most callers are impressed by how smooth and helpful the experience is.',
  },
  {
    question: 'What happens if the AI can\'t handle a request?',
    answer: 'NerdVi is trained to handle standard reservation and order requests with high accuracy. For unusual requests outside its capabilities, the agent will politely let the caller know and suggest they contact the restaurant directly.',
  },
  {
    question: 'Can I use NerdVi for multiple restaurant locations?',
    answer: 'Yes. One NerdVi account can manage unlimited restaurant locations. Each location gets its own dedicated AI agent, phone number, voice, and knowledge base — completely independent from each other.',
  },
  {
    question: 'How do I update my menu or restaurant information?',
    answer: 'Simply log into your dashboard, navigate to your agent\'s knowledge base, and upload updated documents or edit your text snippets. Changes take effect immediately — no need to restart or reconfigure anything.',
  },
  {
    question: 'Does NerdVi integrate with my POS system?',
    answer: 'Yes. NerdVi currently integrates with The Account POS, allowing phone orders to flow directly into your kitchen workflow. More POS integrations are being added regularly.',
  },
  {
    question: 'Is my restaurant data secure?',
    answer: 'Absolutely. Each restaurant\'s data is completely isolated. Your agent cannot access another restaurant\'s information. All data is encrypted, and we use industry-standard security practices including secure authentication and webhook verification.',
  },
];

export default function DocsPage() {
  const [isVisible, setIsVisible] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    setIsVisible(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white antialiased" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <header
        className={`sticky top-0 z-50 bg-white transition-shadow duration-300 ${
          isScrolled ? 'shadow-[0_2px_8px_rgba(0,0,0,0.08)]' : ''
        }`}
      >
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-gray-900 tracking-tight">
            NerdVi
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/">
              <button className="px-5 py-2.5 text-[15px] font-medium text-gray-700 hover:text-gray-900 transition-colors">
                Home
              </button>
            </Link>
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

      <main>
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-8 pt-24 pb-20">
          <div className={`max-w-4xl mx-auto text-center transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 border border-gray-200">
              <span className="text-[15px] font-medium text-gray-700">Product Documentation</span>
            </div>
            <h1 className="mb-8 text-[56px] md:text-[72px] font-black tracking-[-0.04em] leading-[0.95] text-gray-900">
              Everything NerdVi
              <br />
              <span className="text-gray-400">Can Do For You</span>
            </h1>
            <p className="mx-auto mb-12 max-w-2xl text-[20px] md:text-[22px] text-gray-600 leading-[1.5] font-normal">
              A complete guide to every feature in NerdVi — your AI-powered phone agent platform built for restaurants.
            </p>
          </div>

          {/* Quick nav */}
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-wrap justify-center gap-3">
              {features.map((feature) => (
                <a
                  key={feature.id}
                  href={`#${feature.id}`}
                  className="px-4 py-2 text-[14px] font-medium text-gray-600 bg-gray-50 rounded-full border border-gray-200 hover:bg-gray-100 hover:text-gray-900 transition-all"
                >
                  {feature.title}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="pb-16">
          {features.map((feature, index) => (
            <div
              key={feature.id}
              id={feature.id}
              className={`py-24 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
            >
              <div className="max-w-7xl mx-auto px-8">
                <div className="max-w-6xl mx-auto grid gap-16 lg:grid-cols-2 items-center">
                  {/* Text content */}
                  <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} text-white mb-6`}>
                      {feature.icon}
                    </div>
                    <h2 className="text-[36px] md:text-[44px] font-black tracking-[-0.03em] leading-[1.1] text-gray-900 mb-3">
                      {feature.title}
                    </h2>
                    <p className="text-[18px] font-medium text-gray-500 mb-6">
                      {feature.subtitle}
                    </p>
                    <p className="text-[17px] text-gray-600 leading-[1.7] mb-8">
                      {feature.description}
                    </p>
                    <ul className="space-y-3">
                      {feature.details.map((detail, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="text-green-600 text-lg mt-0.5 shrink-0">&#10003;</span>
                          <span className="text-[15px] text-gray-700 leading-[1.5]">{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Visual card */}
                  <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                    <div
                      className={`p-12 rounded-[32px] bg-gradient-to-br ${feature.color} text-white transition-all duration-300 hover:scale-[1.02]`}
                      style={{
                        boxShadow: '0 215px 86px rgba(0,0,0,.01), 0 121px 73px rgba(0,0,0,.05), 0 54px 54px rgba(0,0,0,.09), 0 13px 30px rgba(0,0,0,.1)',
                      }}
                    >
                      <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-white/20 mb-8">
                        <div className="scale-150">{feature.icon}</div>
                      </div>
                      <h3 className="text-[28px] font-black text-white mb-4">{feature.title}</h3>
                      <p className="text-[17px] text-white/90 leading-[1.6]">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* How It Works */}
        <section className="bg-gray-900 py-32">
          <div className="max-w-7xl mx-auto px-8">
            <div className="max-w-3xl mx-auto text-center mb-20">
              <h2 className="mb-6 text-[48px] md:text-[56px] font-black tracking-[-0.03em] leading-[1.1] text-white">
                How It Works
              </h2>
              <p className="text-[20px] text-gray-300 leading-[1.6]">
                From sign-up to live AI phone agent in just 5 minutes. Here&apos;s the process.
              </p>
            </div>

            <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
              {[
                {
                  step: 1,
                  title: 'Create Your Account',
                  description: 'Sign up in 30 seconds with just your email. No credit card required to start your free trial.',
                },
                {
                  step: 2,
                  title: 'Set Up Your Restaurant',
                  description: 'Enter your restaurant name, address, operating hours, seating capacity, and contact information.',
                },
                {
                  step: 3,
                  title: 'Customize Your Agent',
                  description: 'Choose a voice, upload your menu and policies, and personalize your agent\'s greeting and conversation style.',
                },
                {
                  step: 4,
                  title: 'Go Live',
                  description: 'Your agent gets a dedicated phone number and is immediately ready to take calls. That\'s it — you\'re done.',
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white text-[22px] font-bold text-gray-900">
                    {item.step}
                  </div>
                  <h3 className="mb-3 text-[20px] font-bold text-white">
                    {item.title}
                  </h3>
                  <p className="text-[15px] text-gray-400 leading-[1.6]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What Callers Experience */}
        <section className="bg-white py-32">
          <div className="max-w-7xl mx-auto px-8">
            <div className="max-w-3xl mx-auto text-center mb-20">
              <h2 className="mb-6 text-[48px] md:text-[56px] font-black tracking-[-0.03em] leading-[1.1] text-gray-900">
                What Your Callers Experience
              </h2>
              <p className="text-[20px] text-gray-600 leading-[1.6]">
                When a customer calls your NerdVi number, here&apos;s what happens.
              </p>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">
              {[
                {
                  label: 'Customer Calls',
                  text: 'A customer dials your restaurant\'s NerdVi phone number.',
                },
                {
                  label: 'Instant Answer',
                  text: 'Your AI agent picks up immediately — no hold music, no waiting.',
                },
                {
                  label: 'Natural Conversation',
                  text: 'The agent greets the caller and asks how it can help, speaking naturally in the voice you selected.',
                },
                {
                  label: 'Request Handled',
                  text: 'Whether it\'s a reservation, a to-go order, or a question about the menu — the agent handles it completely.',
                },
                {
                  label: 'Confirmation',
                  text: 'The caller receives a confirmation ID and a summary of their request before hanging up.',
                },
                {
                  label: 'Dashboard Updated',
                  text: 'The reservation or order appears instantly in your dashboard. You get an email notification.',
                },
              ].map((step, index) => (
                <div key={index} className="flex gap-6 items-start">
                  <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-[14px] font-bold text-white">
                    {index + 1}
                  </div>
                  <div className="pt-1">
                    <h3 className="text-[18px] font-bold text-gray-900 mb-1">{step.label}</h3>
                    <p className="text-[16px] text-gray-600 leading-[1.6]">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-gray-50 py-32">
          <div className="max-w-7xl mx-auto px-8">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="mb-6 text-[48px] md:text-[56px] font-black tracking-[-0.03em] leading-[1.1] text-gray-900">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="max-w-3xl mx-auto space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden transition-all duration-200"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full px-8 py-6 text-left flex items-center justify-between gap-4"
                  >
                    <span className="text-[17px] font-semibold text-gray-900">{faq.question}</span>
                    <span className={`shrink-0 text-gray-400 transition-transform duration-200 ${expandedFaq === index ? 'rotate-180' : ''}`}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </button>
                  {expandedFaq === index && (
                    <div className="px-8 pb-6">
                      <p className="text-[16px] text-gray-600 leading-[1.7]">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gray-900 py-32">
          <div className="max-w-7xl mx-auto px-8 text-center">
            <h2 className="mb-6 text-[48px] md:text-[56px] font-black tracking-[-0.03em] leading-[1.1] text-white">
              Ready to Get Started?
            </h2>
            <p className="mb-4 text-[20px] text-gray-300 max-w-2xl mx-auto leading-[1.5]">
              Set up your AI phone agent in under 5 minutes and never miss a reservation again.
            </p>
            <p className="mb-12 text-[15px] text-gray-400 font-medium">
              Free trial &bull; No credit card required &bull; Cancel anytime
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/sign-up">
                <button className="px-12 py-4 text-[17px] font-semibold bg-white text-gray-900 rounded-full hover:bg-gray-100 transition-all shadow-lg">
                  Start Your Free Trial
                </button>
              </Link>
              <Link href="/">
                <button className="px-10 py-4 text-[17px] font-semibold border-2 border-white text-white rounded-full hover:bg-white/10 transition-all">
                  Back to Home
                </button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-12 bg-white">
        <div className="max-w-7xl mx-auto px-8 text-center text-[14px] text-gray-500">
          <p>&copy; 2025 NerdVi. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
