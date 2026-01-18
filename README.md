# TradeMarket

A Next.js web application built with TypeScript. A trading simulator for beginner traders to learn how to trade using real-time USA stock market prices.

## Features

- User authentication (Login/Signup) with Supabase
- Real-time stock market price integration
- Trading simulator for risk-free practice
- Modern UI with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier available)

### Setup

1. **Install dependencies:**

```bash
npm install
```

2. **Set up Supabase:**

   - Create a new project at [supabase.com](https://supabase.com)
   - Go to Settings → API in your Supabase dashboard
   - Copy your Project URL and anon/public key

3. **Configure environment variables:**

   - Copy `env.example` to `.env.local`
   - Fill in your Supabase credentials:

```bash
cp env.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key
```

**Get Alpha Vantage API Key** (for stock market data):
- Sign up for free at [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
- Copy your API key and add it to `.env.local`
- Note: Free tier allows 5 API calls per minute and 500 calls per day

4. **Run the development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Database

This app uses Supabase as the main database source. User authentication (login/signup) is handled through Supabase Auth.

### Setting up Supabase Authentication

1. In your Supabase dashboard, go to Authentication → Providers
2. Enable Email provider
3. Configure email templates if needed

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Supabase Documentation](https://supabase.com/docs) - learn about Supabase features.
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - learn about Tailwind CSS.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new). Remember to add your environment variables in the Vercel project settings.
