# Redsmith - Prompt Injection Test Case Generator

A web application for security researchers to create, manage, and test prompt injection attack vectors. Generate variations using multiple LLM providers (OpenAI, Anthropic, Gemini) and apply programmatic mutations to test guardrail robustness.

## Features

- ✅ **Seed Prompt Management**: Create and organize prompt injection test cases with metadata
- ✅ **Dashboard & Analytics**: Track prompts, variations, and generation jobs
- ✅ **Search & Filter**: Find prompts by text, type, goal, and attack vector
- ✅ **Authentication**: Secure email/password auth with manual user provisioning
- ✅ **Real-time Sync**: Multi-device synchronization via Supabase Realtime
- ⏳ **Multi-LLM Generation**: Generate variations using OpenAI, Anthropic, and Gemini *(Coming Soon)*
- ⏳ **Programmatic Mutations**: Apply obfuscation techniques *(Coming Soon)*

## Tech Stack

- **Frontend**: React 19 + TypeScript 5.9 + Vite 7
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand
- **Database & Auth**: Supabase (PostgreSQL + Auth + Realtime)
- **Package Manager**: pnpm 10+

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 10+ (install with `npm install -g pnpm` if needed)
- Supabase account (free tier)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Save your **Project URL** and **Anon Key** from **Settings** → **API**

### 3. Configure Environment

```bash
# Copy example file
cp .env.example .env.local

# Edit .env.local with your Supabase credentials
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Apply Database Migrations

**Option A: Using Supabase CLI**

```bash
# Install CLI
npm install -g supabase

# Login and link
supabase login
supabase link --project-ref your-project-id

# Push migrations
supabase db push
```

**Option B: Manual (SQL Editor)**

Run each file in `supabase/migrations/` in order via Supabase Dashboard → SQL Editor

### 5. Create Test User

1. Supabase Dashboard → **Authentication** → **Users** → **Add User**
2. Enter email and password
3. Click **Create user**

> **Note**: All authenticated users can see all data (shared workspace)

### 6. Start Development Server

```bash
pnpm run dev
```

Open http://localhost:5173 and login with your test user credentials.

## Usage

### Create a Seed Prompt

1. Click **+ New Seed Prompt**
2. Fill in the form with:
   - Title, description, and prompt text
   - Classification metadata (type, goal, attack vector, obfuscation level)
3. Click **Create Prompt**

### View All Prompts

1. Navigate to **Prompts** in sidebar
2. Use search and filters to find specific prompts
3. Click any prompt to view details

### Dashboard

View statistics and recent activity on the main dashboard.

## Project Structure

```
src/
├── components/       # React components (Sidebar, etc.)
├── lib/
│   ├── supabase/     # Supabase client and types
│   └── mutations/    # Mutation engine
├── pages/            # Page components (Dashboard, PromptList, etc.)
├── stores/           # Zustand stores (auth, prompts, generation, etc.)
└── App.tsx           # Main app with auth routing

supabase/
└── migrations/       # Database schema and RLS policies
```

## Database Schema

- **seed_prompts**: Original prompts with metadata
- **generated_variations**: LLM-generated variations *(not yet used)*
- **mutated_variations**: Programmatically mutated versions *(not yet used)*
- **generation_jobs**: Track generation progress *(not yet used)*
- **llm_provider_configs**: LLM API keys and settings *(not yet used)*

**RLS**: All authenticated users can view/edit all data (shared workspace model)

## Development

```bash
pnpm run dev        # Start dev server
pnpm run build      # Build for production
pnpm run lint       # Lint code
pnpm run typecheck  # Type check
```

## Troubleshooting

### "Supabase URL not configured"
- Check `.env.local` exists and has correct values
- Restart dev server

### "Table 'seed_prompts' does not exist"
- Run migrations: `supabase db push`
- Or execute SQL files manually in Supabase Dashboard

### "Authentication error"
- Verify you copied the **anon public** key (not service_role key)
- Check Settings → API in Supabase Dashboard

### "RLS policy violation"
- Log out and back in
- Verify migrations created RLS policies: Supabase Dashboard → Authentication → Policies

## What's Next?

The following features are planned but not yet implemented:

- **LLM Generation**: Generate variations using OpenAI, Anthropic, and Gemini
- **Mutations**: Apply programmatic obfuscation techniques
- **Settings Page**: Configure LLM providers and API keys
- **Export**: Download test cases in various formats

## Contributing

This is feature branch `001-prompt-injection-generator`. Create sub-branches for contributions.

---

Built for security researchers testing LLM guardrails.
