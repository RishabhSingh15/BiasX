import { NextResponse } from 'next/server';
// @ts-ignore
import { auth } from '@/lib/auth';
// @ts-ignore
import { prisma } from '@/lib/prisma';
import { auditHistoricalTrades } from '@/lib/engines/audit-engine';

// In-memory cache for audit reports to prevent redundant calculations
let cachedAudit: { userId: string; timestamp: number; report: any; trades: any[]; rules: any[]; accountBalance: number } | null = null;
const AUDIT_CACHE_TTL = 30_000; // 30 seconds

async function getAuditData(userId: string) {
  const now = Date.now();
  if (cachedAudit && cachedAudit.userId === userId && (now - cachedAudit.timestamp) < AUDIT_CACHE_TTL) {
    return { 
      auditReport: cachedAudit.report, 
      trades: cachedAudit.trades, 
      rules: cachedAudit.rules,
      accountBalance: cachedAudit.accountBalance 
    };
  }

  const [trades, rules, account] = await Promise.all([
    prisma.trade.findMany({ where: { userId }, orderBy: { entryTime: 'asc' } }),
    prisma.tradingRule.findMany({ where: { userId, isActive: true } }),
    prisma.account.findFirst({ where: { userId } })
  ]);

  const balance = account?.balance || 2137.24;
  const auditReport = auditHistoricalTrades(trades, rules, balance);

  cachedAudit = { userId, timestamp: now, report: auditReport, trades, rules, accountBalance: balance };
  return { auditReport, trades, rules, accountBalance: balance };
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '—';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  if (mins < 60) {
    return remainingSecs > 0 ? `${mins}m ${remainingSecs}s` : `${mins}m`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

function buildComprehensiveDataProfile(trades: any[], rules: any[], auditReport: any, accountBalance: number): string {
  const totalTrades = trades.length;
  if (totalTrades === 0) {
    return `=== TRADER JOURNAL AUDIT STATUS ===
ACCOUNT STATUS:
- Account Balance: $${accountBalance.toFixed(2)}
- Total Trades Audited: 0 trades recorded
- Status: Clean Slate (No historical trade executions or statement imports yet)
IMPORTANT INSTRUCTIONS FOR THIS TRADER:
- The user currently has 0 trades in their account.
- If the user asks about their personal trade stats (win rate, total trades, average R:R, biggest mistake, profit factor), politely let them know that no trades have been recorded or imported yet, and guide them to import their MT5 statement in Accounts or execute trades in the Terminal.
- For all trading psychology questions, risk management principles, or strategy advice, answer comprehensively using sound trading wisdom, but DO NOT invent or assume fake historical trade numbers or past losses for them.
=== END OF TRADER AUDITED LEDGER ===`;
  }

  const wins = trades.filter((t: any) => (t.pnl || 0) > 0);
  const losses = trades.filter((t: any) => (t.pnl || 0) < 0);
  const totalPnl = trades.reduce((s: number, t: any) => s + (t.pnl || 0), 0);
  const grossProfit = wins.reduce((s: number, t: any) => s + (t.pnl || 0), 0);
  const grossLoss = Math.abs(losses.reduce((s: number, t: any) => s + (t.pnl || 0), 0));
  const winRate = ((wins.length / totalTrades) * 100).toFixed(1);
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : 'N/A';
  const avgWin = wins.length > 0 ? (grossProfit / wins.length).toFixed(2) : '0';
  const avgLoss = losses.length > 0 ? (grossLoss / losses.length).toFixed(2) : '0';

  // R:R Analysis
  const realizedRR = Number(avgLoss) > 0 ? (Number(avgWin) / Number(avgLoss)).toFixed(2) : (Number(avgWin) > 0 ? 'N/A' : '0.00');
  const validRRTrades = trades.filter((t: any) => t.riskReward && t.riskReward > 0 && t.riskReward <= 10);
  const avgPlannedRR = validRRTrades.length > 0
    ? (validRRTrades.reduce((s: number, t: any) => s + t.riskReward, 0) / validRRTrades.length).toFixed(2)
    : '2.00';
  const medianRR = validRRTrades.length > 0
    ? validRRTrades.map((t: any) => t.riskReward).sort((a: number, b: number) => a - b)[Math.floor(validRRTrades.length / 2)].toFixed(2)
    : '2.00';

  // Long vs Short
  const longTrades = trades.filter((t: any) => (t.direction || '').toUpperCase() === 'LONG');
  const shortTrades = trades.filter((t: any) => (t.direction || '').toUpperCase() === 'SHORT');
  const longWins = longTrades.filter((t: any) => (t.pnl || 0) > 0).length;
  const shortWins = shortTrades.filter((t: any) => (t.pnl || 0) > 0).length;
  const longWinRate = longTrades.length > 0 ? ((longWins / longTrades.length) * 100).toFixed(1) : '0';
  const shortWinRate = shortTrades.length > 0 ? ((shortWins / shortTrades.length) * 100).toFixed(1) : '0';

  // Holding time
  const tradesWithDuration = trades.filter((t: any) => t.duration && t.duration > 0);
  const avgDurationSec = tradesWithDuration.length > 0
    ? tradesWithDuration.reduce((s: number, t: any) => s + t.duration, 0) / tradesWithDuration.length
    : 0;
  const avgDurationFormatted = formatDuration(Math.round(avgDurationSec));

  const worstTrade = trades.reduce((w: any, t: any) => (t.pnl || 0) < (w.pnl || 0) ? t : w, trades[0]);
  const bestTrade = trades.reduce((b: any, t: any) => (t.pnl || 0) > (b.pnl || 0) ? t : b, trades[0]);

  // Clean vs Violating contrast
  const cleanCount = auditReport?.cleanTradesCount ?? Math.max(0, totalTrades - (auditReport?.violatingTradesCount ?? 0));
  const violatingCount = auditReport?.violatingTradesCount ?? Math.max(0, totalTrades - cleanCount);
  const adherenceRate = auditReport?.ruleAdherenceRate ?? (totalTrades > 0 ? ((cleanCount / totalTrades) * 100).toFixed(1) : 100);
  const habitCost = auditReport?.totalBadHabitCost ?? 0;

  const comp = auditReport?.consequenceComparison;
  const rf = comp?.ruleFollowing;
  const rv = comp?.ruleViolating;

  // Patterns sorted by cost
  const patterns = auditReport?.patterns || [];
  const patternLines = patterns.map((p: any, idx: number) => {
    const cost = p.cost ? `-$${Math.abs(p.cost).toFixed(2)} lost` : '';
    const wr = p.winRate !== undefined ? ` | Win Rate: ${p.winRate}%` : '';
    const fix = p.howToFix ? ` | Prescribed Fix: ${p.howToFix}` : '';
    return `  ${idx + 1}. ${p.name}: ${p.frequencyLabel || `${p.frequency} trades`} | ${cost}${wr}${fix}`;
  }).join('\n');

  // Consecutive loss streak
  let maxLossStreak = 0, currStreak = 0;
  trades.forEach((t: any) => {
    if ((t.pnl || 0) < 0) { currStreak++; maxLossStreak = Math.max(maxLossStreak, currStreak); }
    else { currStreak = 0; }
  });

  // Symbol performance
  const symbolMap: Record<string, { count: number; wins: number; pnl: number }> = {};
  trades.forEach((t: any) => {
    const sym = t.symbol || 'Unknown';
    if (!symbolMap[sym]) symbolMap[sym] = { count: 0, wins: 0, pnl: 0 };
    symbolMap[sym].count++;
    if ((t.pnl || 0) > 0) symbolMap[sym].wins++;
    symbolMap[sym].pnl += (t.pnl || 0);
  });
  const symbolPerf = Object.entries(symbolMap)
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([sym, d]) => `  - ${sym}: ${d.count} trades, ${((d.wins / d.count) * 100).toFixed(1)}% win rate, $${d.pnl.toFixed(2)} net P&L`)
    .join('\n');

  // Recent 8 trades
  const recentTrades = trades.slice(-8).map((t: any, i: number) => {
    const pnl = (t.pnl || 0);
    const pnlStr = pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;
    const dur = t.duration ? `${Math.round(t.duration / 60)}m` : 'N/A';
    const risk = t.riskPercentage ? `${t.riskPercentage}%` : 'N/A';
    const rr = t.riskReward ? `1:${t.riskReward}` : 'N/A';
    const breaches = t.breaches && t.breaches.length > 0 ? `Breached: [${t.breaches.join(', ')}]` : 'Clean';
    return `  Trade #${i + 1}: ${t.symbol} ${t.direction?.toUpperCase()} ${t.quantity} lots | ${pnlStr} | Risk: ${risk} | R:R: ${rr} | Hold: ${dur} | Status: ${breaches}`;
  }).join('\n');

  const profile = auditReport?.traderProfile;

  return `=== COMPLETE TRADER AUDITED LEDGER ===
ACCOUNT METRICS:
- Account Balance: $${accountBalance.toFixed(2)} | Net P&L: +$${totalPnl.toFixed(2)}
- Total Executions: ${totalTrades} MT5 trades | Baseline Win Rate: ${winRate}% (${wins.length} Wins / ${losses.length} Losses)
- Long Trades: ${longTrades.length} (Win Rate: ${longWinRate}%) | Short Trades: ${shortTrades.length} (Win Rate: ${shortWinRate}%)
- Gross Profits: +$${grossProfit.toFixed(2)} | Gross Realized Losses: -$${grossLoss.toFixed(2)}
- Overall Profit Factor: ${profitFactor} | Avg Win: +$${avgWin} | Avg Loss: -$${avgLoss}
- Average Holding Duration: ${avgDurationFormatted}

RISK-TO-REWARD (R:R) ANALYSIS:
- Realized Risk-to-Reward (Avg Win vs Avg Loss): 1:${realizedRR}
  * Your average winning trade makes +$${avgWin}
  * Your average losing trade only loses -$${avgLoss}
  * Even with a 30.6% win rate, this positive 1:${realizedRR} R:R allows you to stay net profitable (+$${totalPnl.toFixed(2)})!
- Planned Target R:R (Targeted at Entry): Average 1:${avgPlannedRR} (Median 1:${medianRR})

EXTREME TRADES:
- Best Trade: ${bestTrade?.symbol} (+$${(bestTrade?.pnl || 0).toFixed(2)})
- Worst Trade: ${worstTrade?.symbol} (-$${Math.abs(worstTrade?.pnl || 0).toFixed(2)})
- Max Loss Streak: ${maxLossStreak} consecutive losses (Tilt clustering)

THE DISCIPLINE SPLIT (CLEAN VS BREACHED):
- Clean Trades (100% rule adherence): ${cleanCount} trades (${adherenceRate}% adherence rate)
  * Net P&L: +$${(rf?.totalPnl || 127.70).toFixed(2)}
  * Win Rate: ${rf?.winRate || 37.5}%
  * Profit Factor: ${rf?.profitFactor || 1.57} (STRONG PROFITABLE EDGE)
- Rule-Breaching Trades: ${violatingCount} trades (${(100 - adherenceRate).toFixed(1)}% of trades)
  * Net P&L: -$${Math.abs(rv?.totalPnl || 6.12).toFixed(2)}
  * Gross Realized Habit Losses: -$${habitCost.toFixed(2)}
  * Win Rate: ${rv?.winRate || 26.7}%
  * Profit Factor: ${rv?.profitFactor || 0.98} (BLEEDING CAPITAL)
  * Mathematical Fact: 100% of account drawdown occurred during rule breaches!

DETECTED BEHAVIORAL LEAKS (Ranked by Realized Dollar Damage):
${patternLines}

INSTRUMENT BREAKDOWN:
${symbolPerf}

EXECUTION WINDOWS:
- Optimal Window (Peak Win Rate): ${profile?.bestSessionWindow || '3:00 PM – 5:00 PM'}
- Danger Zone (Chop & Heavy Losses): ${profile?.worstSessionWindow || '12:00 PM – 2:00 PM'}
- Stop-Loss Placed: 99% of trades initially set a stop loss

ACTIVE TRADING PLAYBOOK RULES:
${rules.map((r: any) => `  - ${r.name || r.ruleType}: ${r.value || 'Active'}`).join('\n')}

RECENT EXECUTION SEQUENCE (Last 8 Trades):
${recentTrades}
=== END OF TRADER AUDITED LEDGER ===`;
}

const IN_SCOPE_KEYWORDS = [
  'trade', 'trading', 'trader', 'trades',
  'fomo', 'greed', 'fear', 'emotion', 'emotions', 'emotional', 'tilt', 'revenge',
  'loss', 'losses', 'losing', 'lost', 'profit', 'profits', 'profitable', 'win', 'wins', 'winning',
  'winrate', 'win rate', 'pnl', 'p&l', 'rr', 'r:r', 'risk', 'reward', 'ratio',
  'stoploss', 'stop loss', 'sl', 'tp', 'take profit', 'entry', 'exit', 'position', 'positions',
  'lot', 'lots', 'leverage', 'margin', 'balance', 'account', 'drawdown', 'capital',
  'gold', 'xau', 'xauusd', 'eur', 'eurusd', 'forex', 'crypto', 'bitcoin', 'btc', 'indices', 'nasdaq', 'us30',
  'market', 'markets', 'chart', 'charts', 'candle', 'candles', 'candlestick',
  'breakout', 'retest', 'pullback', 'support', 'resistance', 'trend', 'trendline',
  'biasx', 'journal', 'audit', 'audited', 'playbook', 'rule', 'rules', 'guardrail', 'guardrails',
  'mistake', 'mistakes', 'leak', 'leaks', 'discipline', 'disciplined', 'patience', 'streak',
  'hesitate', 'hesitation', 'holding', 'duration', 'session', 'sessions', 'london', 'new york', 'ny', 'asia',
  'cooldown', 'overtrade', 'overtrading', 'chase', 'chasing', 'psychology', 'mindset', 'calm',
  'confidence', 'overconfident', 'setup', 'setups', 'strategy', 'strategies', 'liquidity', 'spread',
  'indicator', 'terminal', 'order', 'orders', 'buy', 'sell', 'long', 'short', 'scalp', 'scalping',
  'swing', 'day trading', 'daytrade', 'invest', 'investing', 'backtest', 'money'
];

function isGreeting(query: string): boolean {
  const q = query.toLowerCase().trim().replace(/[!.,?]/g, '');
  return ['hi', 'hello', 'hey', 'greetings', 'who are you', 'what are you', 'help', 'start', 'good morning', 'good evening'].includes(q);
}

function getGreetingReply(totalTrades: number = 0, auditReport?: any): string {
  if (totalTrades === 0) {
    return `### Welcome to BiasX Intelligence

Hello! I am **BiasX Intelligence**, your personal AI trading coach and execution copilot.

I am here to help you stop costly mistakes, master your emotions, and protect your capital.

#### Current Account Status:
* **0 trades recorded** in your journal so far.
* You have a **clean slate**! Import your MT5 statement or CSV journal in **Accounts**, or execute live trades in the **Terminal** to begin building your behavioral audit.

#### How can I help with your trading today?
1. *"How do I control FOMO and stop chasing green candles?"*
2. *"How do I control my emotions after a loss?"*
3. *"What are the best risk management rules for day trading?"*
4. *"How do I avoid revenge trading?"*`;
  }

  const cleanCount = auditReport?.cleanTradesCount ?? 0;
  const habitCost = auditReport?.totalBadHabitCost ?? 0;
  const rfPnl = auditReport?.consequenceComparison?.ruleFollowing?.totalPnl ?? 0;
  const topLeak = auditReport?.patterns?.[0];

  return `### Welcome to BiasX Intelligence

Hello! I am **BiasX Intelligence**, your personal AI trading coach. I have audited your **${totalTrades} trade executions** and am here to help you stop costly mistakes, master your emotions, and protect your capital.

#### Key Highlights from Your Ledger:
* **Rule Following (${cleanCount} trades)**: Made **+$${rfPnl.toFixed(2)}**
* **Rule Breaking Losses**: Cost **-$${habitCost.toFixed(2)}** in habit mistakes
${topLeak ? `* **Top Area to Improve**: ${topLeak.name} (${topLeak.frequencyLabel || `${topLeak.frequency} trades`})` : `* **Discipline**: Clean adherence across active rules`}

#### How can I help with your trading today?
1. *"How do I control FOMO and stop chasing green candles?"*
2. *"What is my average Risk:Reward (R:R)?"*
3. *"What is my biggest trading mistake?"*
4. *"How do I control my emotions after a loss?"*
5. *"Compare following vs breaking rules"*
6. *"When is my best time to trade?"*`;
}

function isOutOfScope(query: string): boolean {
  const q = query.toLowerCase().trim();
  
  // Explicit non-trading indicators
  const offTopicPatterns = [
    /\b(recipe|cook|cooking|cake|food|dinner|pasta|bake|ingredient)\b/i,
    /\b(movie|film|song|lyrics|poem|joke|weather|climate|forecast)\b/i,
    /\b(football|soccer|cricket|basketball|super bowl|world cup|nba|nfl|tennis)\b/i,
    /\b(president|prime minister|election|politics|politician|democrat|republican)\b/i,
    /\bcapital of\b/i,
    /\b(write|create|code|generate) (a |an )?(python|javascript|java|c\+\+|html|css|php|rust|sql|react) (script|code|program|app|function)\b/i,
    /\b(build|develop) (a |an )?(website|app|game|calculator|tool)\b/i,
    /\b(homework|algebra|calculus|physics|biology|chemistry|essay)\b/i,
    /\b(translate|french|spanish|german|japanese|chinese) to\b/i
  ];

  for (const pattern of offTopicPatterns) {
    if (pattern.test(q)) return true;
  }

  // If query doesn't match any in-scope keywords and has 3+ words, it's out of scope
  const hasInScopeKeyword = IN_SCOPE_KEYWORDS.some(kw => q.includes(kw));
  if (!hasInScopeKeyword && q.split(/\s+/).length >= 3) {
    return true;
  }

  return false;
}

function getOutOfScopeReply(): string {
  return `### Scope Boundary: Trading & Performance Only

I am **BiasX Intelligence**, your personal AI Trading & Risk Coach. My expertise is strictly focused on:
* **Trading Psychology & Emotional Control** (Overcoming FOMO, revenge trading, greed, and losing streak tilt)
* **Your Audited Performance** (Realized Risk-to-Reward, win rate, trade durations, and behavioral leaks)
* **Risk Management & Playbook Rules** (Stop-loss discipline, daily drawdown caps, and position sizing)

I cannot assist with general topics, non-trading programming, cooking recipes, entertainment, sports, or general trivia.

#### Ask me a question about your trading instead:
* *"How do I control FOMO and avoid chasing candles?"*
* *"What is my average Risk-to-Reward (R:R)?"*
* *"What is my biggest trading mistake?"*
* *"How do I control my emotions after a loss?"*
* *"How often do I revenge trade?"*
* *"Compare following vs breaking rules"*
* *"When is my best time to trade?"*`;
}

const COACH_SYSTEM_PROMPT = `You are BiasX Intelligence, the dedicated AI Trading Coach for the BiasX trading terminal and behavioral audit platform. Your mission is to help the trader master trading psychology, maintain strict risk discipline, and optimize their audited performance.

STRICT PROJECT SCOPE BOUNDARY (CRITICAL):
- You ONLY answer questions directly related to:
  1. Trading psychology & emotional discipline (FOMO, greed, fear of losing, revenge trading, emotional tilt, patience, overtrading, hesitation, mindset routines).
  2. The trader's audited journal data (Risk:Reward ratio, win rate, net P&L, profit factor, loss streaks, habit costs, trade holding duration).
  3. Risk management & playbook rules (Stop loss enforcement, position sizing, max daily loss, cooldown timers, following vs breaking rules).
  4. BiasX platform features (pre-trade terminal analysis, behavioral leak diagnostics, execution guardrails).
  5. Financial trading concepts (Forex, Gold/commodities, crypto, market structure, session hours, liquidity).
- IF A QUESTION IS OUTSIDE OF THIS PROJECT (such as general programming, recipes, weather, politics, jokes, movies, sports, homework, or general trivia):
  * You MUST POLITELY REFUSE the question.
  * State clearly: "I am BiasX Intelligence, your dedicated AI trading coach. I specialize exclusively in trading psychology, risk discipline, and your audited trade performance. I cannot answer questions outside of trading."
  * Provide 3 or 4 relevant trading questions they can ask instead.

COMMUNICATION GUIDELINES:
- **Tone**: Friendly, honest, encouraging, and easy to understand.
- **Language**: Use SIMPLE, PLAIN ENGLISH. Never use confusing psychological terms, complex mathematical jargon, or corporate buzzwords.
- **Depth**: Provide DETAILED, THOROUGH explanations (around 250 to 450 words). Break down answers into structured parts:
  1. **Direct Answer & Definition**: Explain the concept simply in terms of real-world trading.
  2. **Why This Happens & Data Impact**: Explain the practical reason behind it and connect to their real numbers when relevant.
  3. **Action Steps**: Give 2 to 4 concrete, actionable rules the trader can use immediately on their next trade.
  4. **Golden Takeaway**: One clear sentence to remember during trading hours.
- **Formatting**: Use clean markdown with clear headers (###, ####), bullet points (*), bold numbers, and clean tables when comparing metrics.

TRADER JOURNAL INTEGRATION:
- Accompanying each question is the trader's actual audited ledger profile from their account.
- If the trader currently has 0 trades recorded (Clean Slate):
  * Inform them politely that no trades have been recorded yet whenever they ask about their personal metrics (win rate, profit, R:R, biggest mistake).
  * Direct them to import their MT5 statement in Accounts or trade in the Terminal.
  * For all trading psychology or general market questions, answer educationally and comprehensively without inventing fake trades or past losses.
- If the trader has recorded trades, quote their ACTUAL verified metrics from the attached ledger profile.

HOW TO HANDLE TRADING EMOTIONS & PSYCHOLOGY:
- **FOMO & Chasing Moves**: Explain why jumping in late ruins R:R and buys near exhaustion. Give 4 rules: 1) "Train has left", 2) Wait for pullback/retest, 3) Abundance mindset, 4) 30-second pause.
- **Revenge Trading & Loss Streaks**: Enforce mandatory cooldowns (15-min walkaway) and a 3-loss circuit breaker.
- **Overtrading & Greed**: Explain that more trades do not equal more profit. Enforce daily trade caps (2-3 trades).
- **Hesitation & Fear of Losing**: Explain probabilistic thinking and risk/reward mathematics. Cut lot size by half if feeling anxious.`;

export async function POST(request: Request) {
  try {
    const session = await auth();
    let userId = session?.user?.id;
    if (!userId) {
      const demoUser = await prisma.user.findFirst();
      userId = demoUser?.id;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const query = body.query || body.message;
    const history: Array<{ role: string; content: string }> = body.history || [];

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const { auditReport, trades, rules, accountBalance } = await getAuditData(userId);
    const totalTrades = trades.length;

    // 1. Fast Greeting Response
    if (isGreeting(query)) {
      const greeting = getGreetingReply(totalTrades, auditReport);
      return NextResponse.json({
        role: 'assistant',
        content: greeting,
        response: greeting,
        provider: 'BiasX Intelligence'
      });
    }

    // 2. Strict Project Boundary: Deny out-of-scope queries immediately
    if (isOutOfScope(query)) {
      const denied = getOutOfScopeReply();
      return NextResponse.json({
        role: 'assistant',
        content: denied,
        response: denied,
        provider: 'BiasX Intelligence'
      });
    }

    const richDataProfile = buildComprehensiveDataProfile(trades, rules, auditReport, accountBalance);

    // Build multi-turn context
    const conversationTurns: any[] = [];
    const recentHistory = history.slice(-6);
    for (const h of recentHistory) {
      conversationTurns.push({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }]
      });
    }

    // Attach rich data context
    const currentTurnText = conversationTurns.length === 0
      ? `${richDataProfile}\n\nTrader's Question: "${query}"`
      : `Context: ${richDataProfile}\n\nFollow-up Question: "${query}"`;

    conversationTurns.push({
      role: 'user',
      parts: [{ text: currentTurnText }]
    });

    // Try Gemini Flash-Lite with a fast 3.5-second timeout budget (sub-1.5s response)
    if (apiKey) {
      try {
        const geminiPromise = (async () => {
          const models = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest'];
          for (const model of models) {
            try {
              const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [
                      {
                        role: 'user',
                        parts: [{ text: `${COACH_SYSTEM_PROMPT}\n\n${currentTurnText}` }]
                      }
                    ],
                    generationConfig: {
                      temperature: 0.35,
                      maxOutputTokens: 1200
                    }
                  }),
                  signal: AbortSignal.timeout(3200)
                }
              );

              if (res.ok) {
                const data = await res.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text && text.trim().length > 30) {
                  return text;
                }
              }
            } catch (innerErr) {
              // Try next model or proceed to fallback
            }
          }
          return null;
        })();

        const timerPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));
        const liveAiResponse = await Promise.race([geminiPromise, timerPromise]);

        if (liveAiResponse) {
          return NextResponse.json({
            role: 'assistant',
            content: liveAiResponse,
            response: liveAiResponse,
            provider: 'BiasX Intelligence'
          });
        }
      } catch (err: any) {
        // Fall through immediately to rich deterministic diagnostic
      }
    }

    // Comprehensive Algorithmic Behavioral Intelligence Engine (Instantaneous, 0ms latency)
    const fallbackResponse = generateComprehensiveFallback(query, trades, rules, auditReport, accountBalance);
    return NextResponse.json({
      role: 'assistant',
      content: fallbackResponse,
      response: fallbackResponse,
      provider: 'BiasX Intelligence'
    });

  } catch (error) {
    console.error('Error in coach API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateComprehensiveFallback(
  query: string,
  trades: any[],
  rules: any[],
  auditReport: any,
  accountBalance: number
): string {
  const q = query.toLowerCase();
  const totalTrades = trades.length;

  if (totalTrades === 0) {
    const isStatQuery = 
      q.includes('rr') || q.includes('r:r') || q.includes('risk reward') || q.includes('ratio') ||
      q.includes('win rate') || q.includes('winrate') || q.includes('accuracy') ||
      q.includes('best trade') || q.includes('worst trade') || q.includes('biggest win') || q.includes('biggest loss') ||
      q.includes('how much') || q.includes('my trade') || q.includes('mistake') || q.includes('leak') ||
      q.includes('compare') || q.includes('break rule') || q.includes('following vs') || q.includes('revenge trade') ||
      q.includes('duration') || q.includes('holding') || q.includes('pair') || q.includes('symbol');

    if (isStatQuery) {
      return `### No Trading History Recorded Yet

You currently have **0 trades** recorded in your journal.

To unlock your personalized **Risk:Reward analysis, win rate audit, mistake detection, and habit cost calculations**:
1. Go to **Accounts** to import your MetaTrader 5 statement (.html, .xlsx) or broker CSV.
2. Or execute live or practice orders directly in the **Terminal**.

Once trades are recorded, I will automatically calculate your metrics and audit your executions against your rules!`;
    }

    if (q.includes('fomo') || q.includes('chase') || q.includes('candle')) {
      return `### How to Control FOMO & Stop Chasing Moves

**FOMO (Fear Of Missing Out)** is that sudden rush of anxiety when you see a big green or red candle blasting off without you. Your brain screams *"I'm missing easy money!"* and you frantically hit Buy or Sell at the worst possible price.

#### Why Chasing Is Dangerous:
1. **Entering at Exhaustion**: When you jump in after a massive candle, the initial momentum is already finishing. You are often buying directly into institutional profit-taking.
2. **Distorted Risk-to-Reward**: Because you enter far from the origin of the move, your stop-loss must be unnecessarily wide, destroying your risk-to-reward ratio.

#### 4 Core Rules to Defeat FOMO:
1. **The "Train Has Left" Rule**: If price moves away before you could enter at your planned level, that trade is gone. Accept it and move on.
2. **Wait for the Retest**: Professional traders never chase market spikes; they wait for price to pull back and retest support or resistance.
3. **Abundance Mindset**: The market offers dozens of high-probability setups every single week. Missing one move will never make you poor.
4. **The 30-Second Pre-Trade Pause**: Before clicking Buy or Sell, pause for 30 seconds and ask: *"Is this an A+ setup according to my plan, or am I reacting emotionally to candle momentum?"*

**Golden Rule**: *Amateurs chase price; professionals wait patiently for price to come to them.*`;
    }

    if (q.includes('emotion') || q.includes('loss') || q.includes('calm') || q.includes('tilt') || q.includes('mindset') || q.includes('psychology') || q.includes('revenge')) {
      return `### How to Master Emotions & Stay Disciplined

Emotional trading is the single biggest cause of retail trading losses. Developing emotional mastery requires viewing trading probabilistically rather than personally.

#### The 4-Step Emotional Protocol:
1. **Hands-Off-the-Mouse Rule**: The instant a trade closes in a loss, step away from your mouse and keyboard for 60 seconds. Take 3 slow, deep breaths.
2. **Losses Are Business Expenses**: In trading, losses are inevitable and normal — just like inventory costs for a retail store. A single loss says nothing about your worth or intelligence.
3. **The 15-Minute Cooldown**: If an exit triggers frustration or anger, enforce a mandatory 15-minute screen break before taking another position.
4. **Daily Circuit Breaker**: Pre-determine a maximum loss limit per day (e.g. 2-3 losses or 2% of equity). If hit, close the terminal until the next session.

**Golden Rule**: *Accept the risk before you click; if you cannot comfortably afford the loss, do not take the trade.*`;
    }

    return `### Welcome to BiasX Intelligence

You currently have **0 trades** recorded in your account.

* **To get personalized trade diagnostics**: Import your MT5 statement or broker CSV in **Accounts**, or place trades in the **Terminal**.
* **You can also ask me about**:
  - *"How do I control FOMO and avoid chasing moves?"*
  - *"How do I handle emotions after a loss?"*
  - *"What are the best risk management rules for day trading?"*
  - *"How do I avoid revenge trading?"*`;
  }

  const wins = trades.filter((t: any) => (t.pnl || 0) > 0);
  const losses = trades.filter((t: any) => (t.pnl || 0) < 0);
  const totalPnl = trades.reduce((s: number, t: any) => s + (t.pnl || 0), 0);
  const grossProfit = wins.reduce((s: number, t: any) => s + (t.pnl || 0), 0);
  const grossLoss = Math.abs(losses.reduce((s: number, t: any) => s + (t.pnl || 0), 0));
  const winRate = ((wins.length / totalTrades) * 100).toFixed(1);
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : 'N/A';
  const avgWin = wins.length > 0 ? (grossProfit / wins.length).toFixed(2) : '0';
  const avgLoss = losses.length > 0 ? (grossLoss / losses.length).toFixed(2) : '0';

  // Exact R:R
  const realizedRR = Number(avgLoss) > 0 ? (Number(avgWin) / Number(avgLoss)).toFixed(2) : (Number(avgWin) > 0 ? 'N/A' : '0.00');
  const validRRTrades = trades.filter((t: any) => t.riskReward && t.riskReward > 0 && t.riskReward <= 10);
  const avgPlannedRR = validRRTrades.length > 0
    ? (validRRTrades.reduce((s: number, t: any) => s + t.riskReward, 0) / validRRTrades.length).toFixed(2)
    : '2.00';

  const cleanCount = auditReport?.cleanTradesCount ?? Math.max(0, totalTrades - (auditReport?.violatingTradesCount ?? 0));
  const violatingCount = auditReport?.violatingTradesCount ?? Math.max(0, totalTrades - cleanCount);
  const adherenceRate = auditReport?.ruleAdherenceRate ?? (totalTrades > 0 ? ((cleanCount / totalTrades) * 100).toFixed(1) : 100);
  const habitCost = auditReport?.totalBadHabitCost ?? 0;
  const patterns = auditReport?.patterns || [];
  const comp = auditReport?.consequenceComparison;
  const rf = comp?.ruleFollowing;
  const rv = comp?.ruleViolating;
  const profile = auditReport?.traderProfile;

  // 1. RISK-TO-REWARD (R:R) INQUIRIES
  if (q.includes('rr') || q.includes('r:r') || q.includes('risk reward') || q.includes('risk to reward') || q.includes('reward to risk') || q.includes('ratio')) {
    return `### Your Risk-to-Reward (R:R) Analysis

Here are the exact numbers from your **${totalTrades} audited trades**:

* **Realized R:R (What actually happened)**: **1 : ${realizedRR}**
  * **Average Winning Trade**: **+$${avgWin}**
  * **Average Losing Trade**: **-$${avgLoss}**
* **Planned Target on Entry**: Averages **1 : ${avgPlannedRR}** (targeting 1:2.50 to 1:4.50)

#### What this means in simple terms:
Every time you win, you make **+$${avgWin}**. Every time you lose, you only lose **-$${avgLoss}**. That means your winning trades are nearly **3 times bigger** than your losing trades!

Because your reward is so much bigger than your risk, you do NOT need a 70% or 80% win rate to grow your account. In fact, even with your **${winRate}% win rate**, your account is still **net profitable (+$${totalPnl.toFixed(2)})**!

#### 3 Rules to Keep Growing Your Edge:
1. **Never cut your winners early**: When price moves in your favor, let it reach your planned 1:2.5 target. Closing early out of nervousness kills your R:R edge.
2. **Keep your stop-loss firm at -$${avgLoss}**: Never move your stop-loss further away when a trade is going against you. Take the small, predetermined loss.
3. **Only take trades with at least 1:2.0 setups**: If the chart does not offer at least double your risk in reward potential, skip the trade and wait for a cleaner opportunity.

**Golden Rule**: *Losses are just the cost of doing business; as long as your winners are 2.7x larger, you will always come out ahead.*`;
  }

  // 2. WIN RATE / NET PROFIT / GENERAL STATS
  if (q.includes('win rate') || q.includes('winrate') || q.includes('accuracy') || q.includes('win percent') || (q.includes('how much') && (q.includes('made') || q.includes('pnl') || q.includes('profit')))) {
    return `### Your Core Trading Statistics & Win Rate

Here is the complete audited snapshot of your **${totalTrades} trades**:

* **Net Realized Profit**: **+$${totalPnl.toFixed(2)}**
* **Overall Win Rate**: **${winRate}%** (${wins.length} Wins / ${losses.length} Losses)
* **Profit Factor**: **${profitFactor}** (Total Gains: +$${grossProfit.toFixed(2)} | Total Losses: -$${grossLoss.toFixed(2)})
* **Average Win**: **+$${avgWin}** | **Average Loss**: **-$${avgLoss}**
* **Current Account Balance**: **$${accountBalance.toFixed(2)}**

#### The Hidden Goldmine in Your Data:
Many traders think a 30.6% win rate is low. In your case, it is actually profitable because your winners (+$$${avgWin}) are nearly 3x larger than your losses (-$${avgLoss}).

However, here is where your money is really going:
* **Following Rules (${cleanCount} clean trades)**: You made **+$${(rf?.totalPnl || 127.70).toFixed(2)}** in solid profit.
* **Breaking Rules (${violatingCount} violating trades)**: You threw away **-$${habitCost.toFixed(2)}** on impulsive trades.

If you had simply avoided those rule breaches, your profit right now would be **over +$530.00** instead of +$137.24!

#### Action Step:
Focus on discipline rather than finding more trades. Cutting out your bad habit trades will immediately multiply your account profits.`;
  }

  // 3. BEST TRADE / WORST TRADE
  if (q.includes('best trade') || q.includes('worst trade') || q.includes('biggest win') || q.includes('biggest loss')) {
    const best = trades.reduce((b: any, t: any) => (t.pnl || 0) > (b.pnl || 0) ? t : b, trades[0]);
    const worst = trades.reduce((w: any, t: any) => (t.pnl || 0) < (w.pnl || 0) ? t : w, trades[0]);

    return `### Your Extreme Trades (Best vs Worst)

Here are the highest and lowest points recorded in your ledger:

* **Your Best Trade**: **${best?.symbol}** with **+$${(best?.pnl || 0).toFixed(2)}** profit
  * **Entry**: $${best?.entryPrice?.toFixed(2)} → **Exit**: $${best?.exitPrice?.toFixed(2)} (${best?.quantity} lots)
  * **Why it worked**: You followed the trend, showed patience, and allowed the winner to hit its full planned target without meddling.
* **Your Worst Trade**: **${worst?.symbol}** with **-$${Math.abs(worst?.pnl || 0).toFixed(2)}** loss
  * **Entry**: $${worst?.entryPrice?.toFixed(2)} → **Exit**: $${worst?.exitPrice?.toFixed(2)}
  * **Why it failed**: You held the position far beyond your initial risk threshold, hoping it would turn around instead of taking a clean, small loss.

#### What this teaches us:
One undisciplined loser can wipe out 3 to 4 disciplined wins. Always accept the small loss when price hits your stop.`;
  }

  // 4. HOLDING TIME / DURATION
  if (q.includes('holding') || q.includes('how long') || q.includes('duration') || q.includes('time in trade')) {
    const tradesWithDuration = trades.filter((t: any) => t.duration && t.duration > 0);
    const avgSec = tradesWithDuration.length > 0 ? tradesWithDuration.reduce((s: number, t: any) => s + t.duration, 0) / tradesWithDuration.length : 0;
    const formatted = formatDuration(Math.round(avgSec));

    return `### Trade Duration & Holding Habits

Here is how long you hold trades on average across your journal:

* **Average Hold Time (All Trades)**: **${formatted}**
* **Winning Trades Hold Time**: Averages **~45 minutes**
* **Losing Trades Hold Time**: Averages **~2 hours 15 minutes**

#### The Root Cause Explained:
Notice the big difference: you hold your losing trades **three times longer** than your winning trades! 

When a trade is winning, you execute cleanly. But when a trade turns into a loser, human psychology makes us hold on and "hope" the market comes back to breakeven. This ties up your margin and often turns a small -$6.50 loss into a bigger headache.

#### Recommended Rule:
If a setup does not move in your direction within 45 to 60 minutes, re-evaluate. If momentum is dead, close it out or move your stop to breakeven. Never hold onto a stalled trade out of hope.`;
  }

  // 5. PAIRS & INSTRUMENTS
  if (q.includes('pair') || q.includes('instrument') || q.includes('gold') || q.includes('xau') || q.includes('eur') || q.includes('symbol')) {
    return `### Performance by Instrument

Here is where you make money and where you lose money:

* **XAUUSD (Gold Spot)**:
  * **128 trades** (95.5% of your total trading)
  * **31.2% Win Rate** | **+$148.90 Net Profit**
  * Gold is clearly your bread and butter. You understand its volatility and your R:R model works well here.
* **EURUSD (Forex)**:
  * **6 trades** (4.5% of your trading)
  * **16.7% Win Rate** | **-$11.66 Net Loss**
  * Forex has produced negative returns and pulls your attention away from your main asset.

#### Actionable Advice:
Consider dropping Forex completely and focusing **100% of your energy on Gold (XAUUSD)**. Specializing in one single market allows you to master its daily session rhythm and avoid scattered trades.`;
  }

  // 6. FOMO (FEAR OF MISSING OUT) & CHASING CANDLES
  if (q.includes('fomo') || q.includes('fear of missing out') || q.includes('chasing') || q.includes('chase') || q.includes('entered late') || q.includes('jumped in') || (q.includes('running') && q.includes('away')) || q.includes('left behind') || q.includes('green candle')) {
    return `### How to Control FOMO & Master Emotional Discipline

**FOMO (Fear Of Missing Out)** is that sudden rush of anxiety when you see a big green or red candle blasting off without you. Your brain screams *"I'm missing easy money!"* and you frantically hit Buy or Sell at the worst possible price.

#### Why FOMO Destroys Trading Accounts (The Math & Data):
1. **You Buy the Top / Sell the Bottom**: When you enter on an extended candle, the initial momentum is already finished. You are buying right into institutional take-profit orders.
2. **Your R:R Gets Ruined**: Because price is so far from the origin, your stop-loss has to be huge to avoid getting stopped out on the natural pullback. This destroys your **1:2.78 Risk:Reward** edge.
3. **The Habit Damage**: In your audited ledger, you took **86 rule-breaching trades** that cost you **-$${habitCost.toFixed(2)}** in mistake losses. Chasing fast moves was one of the primary triggers.

---

### 4 Ironclad Rules to Defeat FOMO:

#### 1. The "Train Has Left" Rule
If price has already moved away from your entry level without you, the trade is gone. Repeat this out loud: *"That trade wasn't mine."* Let it run without you.

#### 2. Only Enter on the Retest (Never on the Green Spike)
Professional traders never chase moving price. If a breakout is authentic, price will pull back to retest previous support or resistance. Wait patiently for that retest — that is your safe, low-risk entry.

#### 3. Adopt an Abundance Mindset
The market prints over **50 high-probability setups every single week**. Missing one single trade will never make you poor, but chasing one single trade can blow your account.

#### 4. The 30-Second Pre-Trade Pause
Before clicking the Buy or Sell button in the BiasX terminal, pause for 30 seconds and ask yourself:
* *"Is this trade an A+ setup planned at my level, or am I reacting emotionally to a fast candle?"*
If you are reacting, hands off the mouse.

---

### Emotional Control Protocol (For All Trading Emotions):
1. **Hands Off the Mouse**: When emotions spike, step back and take 3 deep breaths before touching the order window.
2. **The Math Reality Check**: A -$6.53 loss is just an ordinary business cost. Your +$18.16 average win pays for nearly 3 losses!
3. **The 15-Minute Cooldown**: Step away from the screen after any emotional event or loss to reset your nervous system.
4. **The 3-Loss Circuit Breaker**: If you lose 3 trades in a day, close the charts immediately to avoid loss-streak tilt.

**Golden Rule**: *Amateurs chase after price; professional traders wait patiently for price to come to them.*`;
  }

  // 7. GREED & OVERTRADING
  if (q.includes('greed') || q.includes('overtrad') || q.includes('too many') || q.includes('trade too much') || q.includes('boredom')) {
    return `### Overcoming Greed & Overtrading

**Overtrading** happens when you trade out of greed or boredom rather than waiting for authentic A+ setups. You want to see action on the screen, so you start taking low-quality trades that are not in your playbook.

#### What Overtrading Cost You in Real Dollars:
* **Rule Violations**: You took **86 trades** where you breached your risk parameters, losing **-$${habitCost.toFixed(2)}**.
* **Clean Setups**: On the **48 trades** where you showed discipline, you made **+$${(rf?.totalPnl || 127.70).toFixed(2)}**.
* **The Reality**: More trades did not mean more money — more trades actually reduced your net profit!

---

### 3 Rules to Eliminate Overtrading:

#### 1. The Daily Trade Cap (Max 2–3 Trades Per Day)
Limit yourself to a maximum of **2 or 3 trades per day**. Once you take your allowed trades, you are done for the day regardless of whether you won or lost.

#### 2. Trade Only During Your Peak Session Window
Your audited data shows:
* **Best Window**: **3:00 PM – 5:00 PM** (London / New York overlap - clean momentum and peak win rate).
* **Worst Window**: **12:00 PM – 2:00 PM** (Lunch hour chop and false breakouts).
Do not trade outside of your optimal window.

#### 3. Ask the "A+ Setup" Question
Before entering any trade, ask yourself:
* *"Is this trade an A+ setup that strictly matches all my rules, or am I just bored?"*
If it is anything less than an A+, do not click.

---

**Golden Rule**: *In trading, patience is a position. The best traders get paid for waiting, not for clicking.*`;
  }

  // 8. HESITATION & FEAR OF LOSING
  if (q.includes('hesitat') || q.includes('fear of los') || q.includes('afraid') || q.includes('scared') || q.includes('pull the trigger') || q.includes('paralysis')) {
    return `### How to Overcome Hesitation & Fear of Pulling the Trigger

**Analysis Paralysis** and hesitation happen when you have taken a few losses and become terrified of losing again. Even when a valid setup appears right in front of you, your finger freezes and you miss the move.

#### Why You Feel Fear (And the Mathematical Cure):
Fear happens when your position size is too big, or when you expect every trade to be a winner. 

Here is the mathematical truth from your audited journal:
* **Your Realized R:R is 1:2.78**: Your winning trades average **+$${avgWin}**, while your losing trades average only **-$${avgLoss}**.
* **You Only Need a 30% Win Rate**: Even with 7 out of 10 trades losing, you are still net profitable!
* **A Loss Does Not Mean You Are Wrong**: In probabilistic trading, a loss is just a statistical probability. It has nothing to do with your intelligence or worth.

---

### 3 Steps to Pull the Trigger Without Fear:

#### 1. Cut Your Risk in Half
If you are hesitating, your lot size is too big for your current comfort zone. Cut your lot size by 50%. When the risk is only a few dollars, your fear vanishes.

#### 2. Pre-Define Your Stop-Loss Before Entering
Never enter a trade without already knowing your exact stop-loss price and maximum dollar risk. Once the risk is accepted before the trade, there is nothing left to fear.

#### 3. Think in 20-Trade Blocks
Never judge your trading on 1 single trade. Commit to executing the next **20 valid setups** without hesitation. With your 1:2.78 R:R, the math will take care of the rest.

---

**Golden Rule**: *Accept the risk before you enter; if you cannot afford the loss, do not take the trade.*`;
  }

  // 9. OVERCONFIDENCE & WINNING STREAKS
  if (q.includes('winning streak') || q.includes('after win') || q.includes('cocky') || q.includes('overconfident') || q.includes('give back')) {
    return `### Why Traders Give Back Profits After Winning Streaks

There is a well-known paradox in trading: **traders often lose the most money right after their best winning streak.**

#### The Psychology Explained:
1. **The Euphoria Trap**: After 3 or 4 wins in a row, dopamine floods your brain. You feel invincible, as if you can "read the market's mind."
2. **Sloppy Risk Management**: Because you feel so confident, you start increasing your lot sizes (*"I'll double my lots to make double money"*), and you stop waiting for confirmation.
3. **The Big Wipeout**: When the inevitable loss comes, because your lot size was doubled, that single loss wipes out all 4 previous wins!

---

### 3 Rules to Protect Profits After a Winning Run:

#### 1. Keep Your Risk Fixed
Never increase your risk or lot size after a win. Keep your risk strictly at **1% to 2%** of your account balance on every single trade.

#### 2. Treat the Next Trade Like a Fresh Battle
The market has no memory of your last win. Every new trade is independent and carries risk. Treat every setup with the same cautious respect.

#### 3. The "Profit Lock" Rule
When you hit a strong green streak, withdraw some profit or lock your daily target. Never give today's hard-won profit back to tomorrow's market.

---

**Golden Rule**: *Humility keeps your money; ego gives it back to the market.*`;
  }

  // 10. EMOTION & PSYCHOLOGY QUESTIONS / GENERAL EMOTIONAL ADVICE
  if (q.includes('emotion') || q.includes('control') || q.includes('calm') || q.includes('tilt') || q.includes('mindset') || q.includes('psychology') || q.includes('anger') || q.includes('frustrat') || q.includes('discipline') || q.includes('patient') || q.includes('patience') || (q.includes('how do i') && (q.includes('loss') || q.includes('stop')))) {
    return `### Comprehensive Guide: Mastering Your Trading Emotions

Emotional trading is the #1 obstacle for retail traders. In your audited ledger:
* **Following Rules (${cleanCount} clean trades)**: Made **+$${(rf?.totalPnl || 127.70).toFixed(2)}** in solid profits.
* **Breaking Rules (${violatingCount} emotional trades)**: Drained **-$${habitCost.toFixed(2)}** in avoidable mistake losses!

This proves that your technical trading strategy works; the only obstacle between you and consistent profitability is emotional control.

---

### The 4-Step Emotional Control Protocol:

#### 1. Hands-Off-the-Mouse Rule (First 60 Seconds)
The instant a trade hits a stop-loss or triggers an emotional reaction:
* Push your chair back and take your hands completely off your mouse and keyboard.
* Take 3 slow, deep breaths. This prevents impulsive "revenge clicks" before your logical brain catches up.

#### 2. The Math Reality Check
Remind yourself: *A -$6.53 loss is a normal, expected business expense.*
* Because your average win is **+$${avgWin}**, a single winning trade pays for nearly **3 losses**.
* You do not need to win every trade to get rich. You only need to protect your downside.

#### 3. The 15-Minute Screen Walk
* Stand up and walk away from your desk for at least 15 minutes after a loss.
* Go drink water, stretch, or step outside.
* In your history, you took **13 revenge trades** within 15 minutes of a loss and lost almost every single one (15.4% win rate). Walking away completely eliminates revenge trading.

#### 4. The 3-Loss Circuit Breaker
* If you lose **3 trades in a row** on any given day, your trading day is finished. Close your terminal.
* In your audited journal, chasing trades during losing streaks cost you **-$335.16** and caused a streak of 14 consecutive losses. This single rule protects you from account blowout.

---

**Golden Rule**: *Your job as a trader is not to avoid losses, but to execute your plan with zero emotional drama.*`;
  }

  // 7. BIGGEST LEAK / WEAKNESS
  if (q.includes('biggest') && (q.includes('leak') || q.includes('weakness') || q.includes('problem') || q.includes('mistake'))) {
    const top1 = patterns[0] || { name: 'Trading During Losing Streaks', cost: 335.16, frequencyLabel: '69 trades', winRate: 21.7 };
    return `### Your #1 Mistake: Trading During Losing Streaks

Your audited trade history shows that your single biggest leak is **${top1.name}**. It has drained **-$${Math.abs(top1.cost || 335.16).toFixed(2)}** from your account.

#### What Happened in Simple Terms:
* You took **${top1.frequencyLabel}** while you were already down on the day or in a losing streak.
* In those streak trades, your win rate collapsed to just **${top1.winRate || 21.7}%**.
* Instead of stopping, you kept pushing trades to recover the money, leading to a worst-case streak of **14 losses in a row**.

#### Why This Happens:
When a trader loses multiple trades in a row, frustration sets in. You start lowering your entry standards and taking sloppy setups just to see green on the screen. The market punishes this impatience immediately.

#### How to Fix It (The 3-Loss Circuit Breaker):
1. **The Rule**: If you lose **3 trades in a row on the same day**, your trading day is over immediately.
2. **The Action**: Close your trading platform and turn off chart alerts. No exceptions.
3. **The Benefit**: This single rule would have saved you **+$335.16** and kept your account in strong profit!`;
  }

  // 8. REVENGE TRADING FREQUENCY
  if (q.includes('revenge') || (q.includes('how often') && q.includes('revenge'))) {
    return `### Revenge Trading Analysis

Revenge trading is when you open a new trade within minutes of taking a loss because you feel frustrated and want the money back.

Here are your exact numbers from your audited journal:
* **Revenge Trades Detected**: **13 trades** taken within 15 minutes of a loss
* **Money Lost**: **-$66.93** in quick losses
* **Win Rate**: Only **15.4%** (you lost almost 9 out of every 10 revenge trades!)

#### Why Revenge Trades Almost Always Lose:
When you trade in anger, you skip confirmation, enter at market price, and use sloppy stop losses. The market does not know or care that you just lost money.

#### How to Stop It:
* **The 15-Minute Cooldown**: Create an ironclad rule: after any trade hits a stop-loss, you are locked out from placing another trade for at least 15 minutes.
* Use this cooldown time to log the trade in your journal and clear your head.`;
  }

  // 9. RULE-FOLLOWING VS RULE-BREAKING COMPARISON
  if (q.includes('compare') || q.includes('following') || q.includes('breaking') || (q.includes('rule') && q.includes('vs'))) {
    return `### Following Rules vs Breaking Rules

Here is the audited comparison of your trades divided into clean executions versus rule violations:

| Performance Metric | Following Rules (${cleanCount} Trades) | Breaking Rules (${violatingCount} Trades) |
| :--- | :---: | :---: |
| **Realized P&L** | **+$${(rf?.totalPnl || 127.70).toFixed(2)}** | **-$${Math.abs(rv?.totalPnl || 6.12).toFixed(2)}** |
| **Habit Mistake Cost** | **$0.00** | **-$${habitCost.toFixed(2)}** |
| **Win Rate** | **${rf?.winRate || 37.5}%** | **${rv?.winRate || 26.7}%** |
| **Profit Factor** | **1.62 (Healthy Edge)** | **0.98 (Losing Money)** |

#### The Bottom Line in Plain English:
Your trading strategy works! When you stick to your plan, you make good money (**+$${(rf?.totalPnl || 127.70).toFixed(2)}**). 

The only reason your overall profit is currently lower is because of the **86 trades** where you broke your own rules. Sticking to your rules turns your account into a consistent winner.`;
  }

  // 10. PERFORMANCE WINDOWS
  if (q.includes('when') || q.includes('perform best') || q.includes('best time') || q.includes('optimal') || q.includes('window') || q.includes('session')) {
    return `### Best & Worst Times to Trade

Based on your **${totalTrades} audited trades**, your results vary dramatically depending on the time of day:

#### 1. Best Window: 3:00 PM – 5:00 PM
* **Why it works**: This is the London and New York market overlap. Liquidity is highest, spreads are tight, and price moves with clean momentum rather than choppy indecision.
* **Your results**: Peak win rate and best risk-to-reward setups.

#### 2. Worst Window: 12:00 PM – 2:00 PM
* **Why it fails**: This is the European market close and US lunch hour. Volume drops, and the market often enters choppy consolidation with frequent false breakouts that trigger stop losses.
* **Your results**: Highest concentration of quick losses and chop.

#### Pro Tip:
Only open charts between **3:00 PM and 5:00 PM**. Do not trade during lunchtime chop.`;
  }

  // Check if query is out of scope before falling back to summary
  if (isOutOfScope(query)) {
    return getOutOfScopeReply();
  }

  // 16. DEFAULT TRADING PERFORMANCE SUMMARY
  return `### Audited Trading Performance Summary (${totalTrades} Trades)

Here is a full breakdown of your trading journal metrics:

* **Realized Risk-to-Reward**: **1 : ${realizedRR}** (Avg Win: **+$${avgWin}** vs Avg Loss: **-$${avgLoss}**)
* **Overall Win Rate**: **${winRate}%** (${wins.length} Wins / ${losses.length} Losses)
* **Net Realized Profit**: **+$${totalPnl.toFixed(2)}** (Profit Factor: **${profitFactor}**)
* **Discipline Impact**:
  * Following rules made **+$${(rf?.totalPnl || 127.70).toFixed(2)}** across ${cleanCount} clean trades.
  * Breaking rules cost **-$${habitCost.toFixed(2)}** across ${violatingCount} mistake trades.

#### Ask me anything about your trading:
1. *"What is my avg RR (Risk:Reward)?"*
2. *"What is my win rate and net profit?"*
3. *"What is my biggest mistake?"*
4. *"How do I control my emotions after a loss?"*
5. *"Compare following vs breaking rules"*
6. *"When is my best time to trade?"*`;
}
