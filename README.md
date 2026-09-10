# BiasX — Behavioral Trading Terminal & AI Trading Coach

BiasX is an institutional-grade behavioral finance trading platform and execution co-pilot designed to detect, diagnose, and eliminate psychological trading biases in real time.

Built with Next.js 15, TypeScript, Tailwind CSS, Prisma ORM, and integrated with Google Gemini & MetaTrader 5 statement ingestion.

---

## Key Capabilities

- **Real-Time Trading Terminal**: Clean TradingView charts with full-screen maximization, precise position sizing, dynamic lot calculation, automatic risk-to-reward ratios, and hard stop-loss/take-profit boundaries.
- **Behavioral Analytics Engine**: Deterministic behavioral detection algorithms identifying FOMO entries, revenge trading sequences, overtrading bursts, and risk expansion breaches without LLM hallucinations.
- **AI Trading Coach**: Streaming conversational AI copilot powered by Google Gemini, auditing your actual trade executions, diagnosing behavioral leaks, and citing specific trade data points.
- **Dynamic Rule Guardrails**: Customizable trading plan rules (Max risk cap, daily loss limit, max trades per day, cooldown enforcement, approved instruments). Dynamic on/off toggles with instant retrospective re-auditing.
- **Trade Journal & Audit Ledger**: In-depth trade history with lot sizes, exact holding duration, planned vs realized R:R, and granular rule violation breakdowns per trade.
- **MT5 & Multi-Broker Import**: Direct ingestion for raw MetaTrader 5 statements (.html, .xlsx, .xml) and broker CSV exports, mapping deal tickets, lots, commissions, and execution metrics.
- **Dusky Monochrome Design**: High-contrast institutional terminal theme with strict color restraint (green and red restricted strictly to financial P&L and directional indicators).

---

## Tech Stack

- **Framework**: Next.js 15 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Lucide Icons, Shadcn/UI primitives
- **Database**: SQLite / PostgreSQL with Prisma ORM
- **Charts**: TradingView Technical Analysis Charts & Custom SVG Equity Curves
- **AI**: Google Gemini API (gemini-2.5-flash / gemini-1.5-flash) with Server-Sent Events (SSE) streaming
- **State Management**: Zustand
- **Auth**: NextAuth.js v5

---

## Getting Started

### 1. Clone the repository
\\\ash
git clone https://github.com/RishabhSingh15/BiasX.git
cd BiasX
\\\

### 2. Install dependencies
\\\ash
npm install
\\\

### 3. Configure environment variables
Copy the example environment file:
\\\ash
cp .env.example .env
\\\

Add your credentials in \.env\:
\\\env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
GEMINI_API_KEY="your-gemini-api-key"
\\\

### 4. Initialize the Database
\\\ash
npx prisma generate
npx prisma db push
\\\

### 5. Launch the Development Server
\\\ash
npm run dev
\\\

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

\\\
biasx-app/
├── prisma/
│   └── schema.prisma           # Prisma database schema
├── public/                     # Static assets & backgrounds
├── src/
│   ├── app/
│   │   ├── (auth)/             # Login, signup, forgot password
│   │   ├── (dashboard)/        # Dashboard, terminal, history, behavior, rules, coach, accounts
│   │   ├── api/                # REST API endpoints & streaming AI coach
│   │   └── onboarding/         # Trader onboarding flow
│   ├── components/
│   │   ├── layout/             # Sidebar, top bar, navigation
│   │   ├── terminal/           # TradingView chart, trade panel
│   │   └── ui/                 # Accessible UI components
│   └── lib/
│       ├── engines/            # Deterministic quantitative & behavioral engines
│       ├── services/           # MT5 parser, broker sync, demo data generator
│       └── stores/             # Zustand state management
└── package.json
\\\

---

## License

MIT License.
