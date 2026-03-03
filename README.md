# The Revenue Snapshot

Precision revenue diagnostics for appointment-based service professionals.

## Architecture

```
Client (Next.js on Vercel)          Server (API Routes)              Database (Supabase)
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│                     │     │                      │     │                     │
│  FREE (client-side) │     │  /api/checkout       │     │  profiles           │
│  • The Numbers      │     │  Creates Stripe      │     │  audits             │
│  • The Leak         │     │  checkout sessions   │     │  purchases ← RLS    │
│  • The Fix (#1 gap) │     │                      │     │  ai_generations     │
│                     │     │  /api/webhook        │     │                     │
│  PAID (server-fetch)│────▶│  Stripe writes       │────▶│  Row-level security │
│  • 45-Day Action    │     │  purchases to DB     │     │  on all tables      │
│  • Client Scripts   │     │                      │     │                     │
│  • Weekly Scorecard │     │  /api/paid-content   │     │                     │
│  • AI Engine        │     │  Checks entitlement  │     │                     │
│  • Export           │     │  before returning    │     │                     │
│                     │     │  paid data           │     │                     │
│                     │     │                      │     │                     │
│                     │     │  /api/ai-engine      │     │                     │
│                     │     │  Calls Claude API    │     │                     │
│                     │     │  (key never exposed) │     │                     │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
```

## Paywall Security

The free sections compute client-side — this is intentional. The hook spreads.

Paid content is **never** sent to the browser without a valid purchase:
- `/api/paid-content` checks `purchases` table before returning gap details, scripts, scorecard
- `/api/ai-engine` checks entitlement + generation count before calling Claude
- Stripe webhook is the **only** writer to the `purchases` table
- Supabase RLS ensures users can only read their own data
- Claude API key lives in Vercel env vars, never exposed

## Setup

### 1. Supabase

1. Create a new Supabase project
2. Run `supabase/schema.sql` in the SQL Editor
3. Enable Email auth in Authentication → Providers
4. Copy your project URL and keys

### 2. Stripe

1. Create 4 products/prices in your Stripe dashboard:
   - **The Lift Plan** — $147 one-time
   - **AI Execution Engine** — $27 one-time
   - **Unlimited Monthly** — $67/month recurring
   - **Unlimited Annual** — $597/year recurring
2. Copy the price IDs (starts with `price_...`)
3. Create a webhook endpoint pointing to `https://your-app.vercel.app/api/webhook`
4. Subscribe to events: `checkout.session.completed`, `customer.subscription.deleted`
5. Copy the webhook signing secret

### 3. Environment Variables

Copy `.env.example` to `.env.local` and fill in all values.

### 4. Deploy

```bash
npm install
npm run dev          # local development

# Deploy to Vercel
vercel deploy --prod
```

Add all env vars in Vercel → Settings → Environment Variables.

### 5. Stripe Webhook

After deploying, update your Stripe webhook URL to your production domain.

## File Structure

```
revenue-snapshot/
├── app/
│   ├── layout.js              # Root layout with fonts
│   ├── page.js                # Main page
│   └── api/
│       ├── audit/route.js     # Save/load audit data
│       ├── checkout/route.js  # Create Stripe checkout sessions
│       ├── webhook/route.js   # Stripe webhook → writes purchases
│       ├── paid-content/route.js  # Serves paid sections (entitlement-gated)
│       ├── ai-engine/route.js     # Claude API proxy (entitlement-gated)
│       └── entitlements/route.js  # Client polls for purchase status
├── components/
│   └── RevenueSnapshot.jsx    # The full UI component (cleaned, no test data)
├── lib/
│   ├── audit-engine.js        # Gap analysis engine (shared client/server)
│   ├── entitlements.js        # Server-side purchase verification
│   ├── stripe.js              # Stripe client + price mapping
│   └── supabase.js            # Supabase clients (browser + server)
├── supabase/
│   └── schema.sql             # Database schema + RLS policies
├── .env.example               # Environment variable template
├── .gitignore
├── next.config.js
├── package.json
└── README.md
```

## Tier Structure

| Tier | Price | Scope | What's Gated |
|------|-------|-------|-------------|
| **The Revenue Snapshot** | Free | — | Numbers, Leak, Fix (#1 gap summary only) |
| **The Lift Plan** | $147 | Per audit | Full gaps w/ fix+result, 45-day plan, scripts, scorecard, export |
| **AI Execution Engine** | $27 | Per audit | 3 AI generations per audit via Claude |
| **Unlimited Mode** | $67/mo or $597/yr | All audits | Everything, unlimited AI, no per-audit limits |

## Production Checklist

- [ ] Supabase schema deployed
- [ ] Stripe products/prices created
- [ ] Stripe webhook configured and tested
- [ ] All env vars set in Vercel
- [ ] Email verification flow connected (replace the stub in RevenueSnapshot.jsx with Supabase auth)
- [ ] Test full purchase flow end-to-end
- [ ] Remove any remaining placeholder Stripe URLs
