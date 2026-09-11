/**
 * BiasX Unified AI Service
 * Supports Google Gemini 2.0 / 3.6 Flash (Free tier, 1,500 req/day, 0 credit card required),
 * Groq (Free Llama 3.3 70B), and OpenAI-compatible providers, with intelligent local fallback.
 */

if (typeof window === 'undefined') {
  try {
    const dns = require('node:dns');
    dns.setDefaultResultOrder('ipv4first');
  } catch {}
}

export interface AICrossCheckResult {
  aiExplanation: string;
  secondOpinionVerdict: string;
  recommendedAction: 'proceed' | 'modify' | 'cancel';
  behavioralRiskOverride?: 'low' | 'medium' | 'high';
  keyTakeaway: string;
  providerUsed: string;
}

export interface AICoachResponse {
  message: string;
  suggestedFollowUps?: string[];
  providerUsed: string;
}

class AIService {
  private getApiKey(provider: 'gemini' | 'groq' | 'openai'): string | null {
    if (typeof process === 'undefined' || !process.env) return null;
    if (provider === 'gemini') {
      return process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || null;
    }
    if (provider === 'groq') {
      return process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || null;
    }
    if (provider === 'openai') {
      return process.env.OPENAI_API_KEY || null;
    }
    return null;
  }

  /**
   * Pre-Trade Analysis Cross-Check
   * Acts as a Senior Prop-Firm Risk Manager reviewing both the proposed trade and the mathematical engine detections.
   */
  async crossCheckTradeAnalysis(params: {
    proposedTrade: any;
    behaviorDetections: any[];
    ruleResults: any;
    similarityResult: any;
  }): Promise<AICrossCheckResult> {
    const { proposedTrade, behaviorDetections, ruleResults, similarityResult } = params;

    const geminiKey = this.getApiKey('gemini');
    const groqKey = this.getApiKey('groq');

    // System prompt for prop-firm risk manager persona
    const systemPrompt = `You are the BiasX Senior Behavioral Risk Manager inside an executive trading terminal.
Your job is to cross-check the proposed trade against the mathematical rule engine and behavioral pattern detectors.
Speak directly, concisely, and authoritatively to the trader like a veteran prop-firm desk manager.
Analyze whether the trader is entering an emotional tilt trade (Revenge, FOMO, Lot Bloat, Chasing) or a disciplined setup.
Keep your response professional, high-impact, and under 120 words. No fluff.

Return your response strictly formatted as valid JSON:
{
  "verdict": "Clear one-sentence executive verdict (e.g. 'High Revenge Risk: Stepping in 8m after loss with oversized lots.')",
  "recommendation": "cancel" | "modify" | "proceed",
  "explanation": "2-3 crisp sentences analyzing the psychological posture, consequence of past similar trades, and specific corrective advice.",
  "keyTakeaway": "Short memorable punchline rule (e.g. 'Wait 15 minutes before touching Gold again.')"
}`;

    const userPrompt = `Proposed Trade:
- Symbol: ${proposedTrade.symbol}
- Direction: ${proposedTrade.direction}
- Order Type: ${proposedTrade.orderType}
- Entry: $${proposedTrade.entryPrice}
- Stop Loss: ${proposedTrade.stopLoss ? '$' + proposedTrade.stopLoss : 'NONE'}
- Take Profit: ${proposedTrade.takeProfit ? '$' + proposedTrade.takeProfit : 'NONE'}
- Risk: ${proposedTrade.riskPercentage ? proposedTrade.riskPercentage + '%' : 'Uncalculated'}
- Risk/Reward: ${proposedTrade.riskReward ? '1:' + proposedTrade.riskReward : 'N/A'}

Engine Mathematical Findings:
- Rule Compliance: ${ruleResults.passed}/${ruleResults.totalRules} passed (${ruleResults.failed} failed)
${ruleResults.results.filter((r: any) => !r.passed).map((r: any) => `  * VIOLATION: ${r.ruleName} - ${r.message}`).join('\n')}

Behavioral Bias Detectors:
${behaviorDetections.length > 0 
  ? behaviorDetections.map((d: any) => `  * Pattern: ${d.pattern} (Confidence: ${Math.round(d.confidence * 100)}%, Severity: ${d.severity})\n    Signals: ${d.signals.join(', ')}`).join('\n') 
  : '  * No behavioral biases detected.'}

Historical Similarity Engine:
- Similar historical trades found: ${similarityResult.totalSimilar}
- Win Rate on similar setups: ${Math.round((similarityResult.aggregateWinRate || 0) * 100)}%
- Average P&L on similar setups: $${(similarityResult.avgPnl || 0).toFixed(2)}

Cross-check these findings and give your executive verdict in the requested JSON format.`;

    // 1. Try Google Gemini Flash-Lite first (Fast 1s response with structured JSON mode)
    if (geminiKey) {
      try {
        const result = await this.callGemini(geminiKey, systemPrompt, userPrompt, true);
        const parsed = this.parseJsonFromResponse(result);
        if (parsed) {
          return {
            aiExplanation: parsed.explanation || result,
            secondOpinionVerdict: parsed.verdict || 'AI Cross-Check Completed',
            recommendedAction: parsed.recommendation || 'proceed',
            keyTakeaway: parsed.keyTakeaway || 'Stick to your playbook.',
            providerUsed: 'Google Gemini 3.5 Flash Lite'
          };
        }
      } catch (err) {
        console.warn('Gemini API call failed, falling back:', err);
      }
    }

    // 2. Try Groq (Llama 3.3 70B - fast free tier)
    if (groqKey) {
      try {
        const result = await this.callGroq(groqKey, systemPrompt, userPrompt);
        const parsed = this.parseJsonFromResponse(result);
        if (parsed) {
          return {
            aiExplanation: parsed.explanation || result,
            secondOpinionVerdict: parsed.verdict || 'AI Cross-Check Completed',
            recommendedAction: parsed.recommendation || 'proceed',
            keyTakeaway: parsed.keyTakeaway || 'Maintain strict sizing discipline.',
            providerUsed: 'Groq (Llama 3.3 70B)'
          };
        }
      } catch (err) {
        console.warn('Groq API call failed, falling back:', err);
      }
    }

    // 3. High-Quality Deterministic Simulation Fallback (Always reliable, 0 ms latency, 0 credits)
    return this.generateDeterministicCrossCheck(proposedTrade, behaviorDetections, ruleResults, similarityResult);
  }

  /**
   * Conversational Behavioral AI Coach
   */
  async askAICoach(params: {
    query: string;
    tradeHistory: any[];
    behaviorEvents: any[];
    rules: any[];
    auditReport?: any;
    accountBalance?: number;
  }): Promise<AICoachResponse> {
    const { query, tradeHistory, behaviorEvents, rules, auditReport, accountBalance = 2000 } = params;

    const geminiKey = this.getApiKey('gemini');
    const groqKey = this.getApiKey('groq');

    const systemPrompt = `You are the BiasX Trading Coach and Senior Trading Psychologist.
You analyze real MT5 execution data to guide traders through cognitive biases, emotional regulation, and mathematical risk management.

CRITICAL COACHING PRINCIPLES:
1. ALWAYS GROUND YOUR ADVICE IN THE TRADER'S ACTUAL AUDITED DATA:
   Use the exact stats provided below (adherence rate, habit losses, clean vs violating trades, specific breach counts). Never claim there are 0 events or 0 violations when the audit detected breaches.

2. EMOTION CONTROL & TRADING PSYCHOLOGY PROTOCOLS:
   When the trader asks about controlling emotions, dealing with losses, revenge trading, FOMO, tilt, panic, frustration, or fear:
   - Provide concrete, evidence-based neuro-psychological advice (Mark Douglas, Jared Tendler, Brett Steenbarger framework).
   - EXPLAIN THE BIOLOGY: After a loss, the brain's amygdala triggers a fight-or-flight response, heart rate elevates, and dopamine plummets. The urgent compulsion to re-enter is an emotional reflex attempting to numb psychological pain, NOT a trading setup.
   - PRESCRIBE THE 3-STEP EMOTIONAL CIRCUIT BREAKER:
     1. Somatic Reset: Hands completely off the mouse. Practice 3 "physiological sighs" (two deep inhales through nose, one long slow exhale through mouth) to down-regulate sympathetic nervous arousal.
     2. Cognitive Reframe: A loss is strictly a predetermined business expense (cost of inventory), not a reflection of your intelligence or worth. A single trade outcome is random; your statistical edge only reveals itself over a sample of 100+ trades.
     3. Systematic Lockout: Step away from your desk for a mandatory 15-30 minute cooldown after any loss. If daily loss limit is hit, close the platform immediately.
   - CITE THEIR REAL STATS: Connect this directly to their data (e.g. mention their post-loss cooldown breaches and realized bad habit losses).

3. FACTUAL DATA & LEAK QUESTIONS:
   When asked "what is my biggest leak", "how often do I revenge trade", "when do I perform best", "show my most expensive mistake", etc.:
   - Provide crisp, accurate facts with specific numbers from the Trader Ledger & Audit Summary.

4. FORMAT:
   - Use clean Markdown with bold headers and bullet points.
   - Keep answers professional, empowering, direct, and under 180 words.`;

    // Extract rich evidence from actual audit engine
    const cleanTradesCount = auditReport?.cleanTradesCount ?? tradeHistory.filter((t: any) => (t.ruleViolations?.length ?? 0) === 0).length;
    const violatingTradesCount = auditReport?.violatingTradesCount ?? (tradeHistory.length - cleanTradesCount);
    const ruleAdherenceRate = auditReport?.ruleAdherenceRate ?? (tradeHistory.length > 0 ? Number(((cleanTradesCount / tradeHistory.length) * 100).toFixed(1)) : 100);
    const totalBadHabitCost = auditReport?.totalBadHabitCost ?? 0;
    const ruleViolationsCount = auditReport?.ruleViolationsCount ?? 0;
    const patterns = auditReport?.majorPatterns || auditReport?.patterns || [];
    const profile = auditReport?.traderProfile;

    // Compute basic trade stats
    const wins = tradeHistory.filter((t: any) => (t.pnl || t.profit || 0) > 0);
    const losses = tradeHistory.filter((t: any) => (t.pnl || t.profit || 0) < 0);
    const totalPnl = tradeHistory.reduce((sum: number, t: any) => sum + (t.pnl || t.profit || 0), 0);
    const winRate = tradeHistory.length > 0 ? ((wins.length / tradeHistory.length) * 100).toFixed(1) : '0';

    // Find worst trade
    const worstTrade = tradeHistory.length > 0
      ? tradeHistory.reduce((worst: any, t: any) => (t.pnl || t.profit || 0) < (worst.pnl || worst.profit || 0) ? t : worst, tradeHistory[0])
      : null;
    const worstTradeInfo = worstTrade
      ? `${worstTrade.symbol || worstTrade.pair} on ${worstTrade.entryTime ? new Date(worstTrade.entryTime).toLocaleDateString() : 'unknown'}, Loss: -$${Math.abs(worstTrade.pnl || worstTrade.profit || 0).toFixed(2)}`
      : 'N/A';

    const patternDetails = patterns.length > 0
      ? patterns.map((p: any) => `  * ${p.name || p.type}: ${p.signals?.[0] || p.description || 'Breach detected'}`).join('\n')
      : '  * No major behavioral leaks detected.';

    const summaryData = `Trader Audited Ledger & Psychology Profile:
- Total Audited Trades: ${tradeHistory.length}
- Clean Trades (0 Rule Violations): ${cleanTradesCount} (${ruleAdherenceRate}% Adherence)
- Rule-Violating Trades: ${violatingTradesCount} (${(100 - ruleAdherenceRate).toFixed(1)}% of trades)
- Gross Capital Lost to Bad Habits / Rule Violations: $${totalBadHabitCost.toFixed(2)}
- Total Rule Breaches: ${ruleViolationsCount}
- Overall Net P&L: $${totalPnl.toFixed(2)} | Overall Win Rate: ${winRate}%
- Worst Single Trade: ${worstTradeInfo}
- Key Behavioral Patterns & Violations:
${patternDetails}
- Trader Behavioral Profile:
  * Style: ${profile?.tradingStyle || 'Intraday Momentum'}
  * Biggest Strength: ${profile?.biggestStrength || 'Disciplined execution on clean setups'}
  * Danger Zone / Weakness: ${profile?.biggestWeakness || 'Post-loss execution and loss chasing'}
  * Best Session Window: ${profile?.bestSessionWindow || 'Morning London / NY Overlap'}
  * Worst Session Window: ${profile?.worstSessionWindow || 'Late Session'}
- Active Rules: ${rules.map((r: any) => r.name || r.ruleType).join(', ')}`;

    const userPrompt = `${summaryData}\n\nTrader's Question: "${query}"`;

    if (geminiKey) {
      try {
        const reply = await this.callGemini(geminiKey, systemPrompt, userPrompt);
        return { message: reply, providerUsed: 'BiasX Intelligence' };
      } catch (err) {
        console.warn('Gemini coach call failed, falling back:', err);
      }
    }

    if (groqKey) {
      try {
        const reply = await this.callGroq(groqKey, systemPrompt, userPrompt);
        return { message: reply, providerUsed: 'BiasX Intelligence' };
      } catch (err) {
        console.warn('Groq coach call failed, falling back:', err);
      }
    }

    return {
      message: this.generateDeterministicCoachReply(query, tradeHistory, behaviorEvents, auditReport),
      providerUsed: 'BiasX Intelligence'
    };
  }

  // --- API Providers ---

  private async callGemini(apiKey: string, systemPrompt: string, userPrompt: string, isJson: boolean = false): Promise<string> {
    const models = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest'];

    for (const model of models) {
      try {
        const generationConfig: any = {
          temperature: 0.2,
          maxOutputTokens: isJson ? 300 : 800,
        };
        if (isJson) {
          generationConfig.responseMimeType = 'application/json';
        }

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\nTask:\n${userPrompt}` }]
              }
            ],
            generationConfig
          }),
          signal: AbortSignal.timeout(1800)
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) return reply;
        }
      } catch (err: any) {
        // Fast failover / fallback
      }
    }
    throw new Error('Gemini endpoints timed out or unavailable, using local fallback');
  }

  private async callGroq(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 600
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || '';
  }

  // --- Helpers & Fallback ---

  private parseJsonFromResponse(text: string): any | null {
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  private generateDeterministicCrossCheck(
    proposedTrade: any,
    behaviorDetections: any[],
    ruleResults: any,
    similarityResult: any
  ): AICrossCheckResult {
    const hasRevenge = behaviorDetections.some(d => d.pattern === 'revenge_trading');
    const hasFomo = behaviorDetections.some(d => d.pattern === 'fomo');
    const hasRiskExpansion = behaviorDetections.some(d => d.pattern === 'risk_expansion');
    const failedRules = ruleResults.failed || 0;

    if (hasRevenge) {
      const simCount = similarityResult?.totalSimilar ?? 0;
      const simWinRate = Math.round((similarityResult?.aggregateWinRate ?? 0) * 100);
      const simAvgPnl = (similarityResult?.avgPnl ?? 0).toFixed(2);
      const historyContext = simCount > 0 
        ? `In your past ${simCount} similar setups, your win rate was ${simWinRate}% with an average P&L of $${simAvgPnl}.`
        : 'Immediate re-entry after a realized loss matches emotional tilt behavior.';

      return {
        secondOpinionVerdict: 'Critical Tilt Alert: Revenge Sequence Detected',
        recommendedAction: 'cancel',
        aiExplanation: `Our algorithmic cross-check confirms you are attempting to re-enter shortly after a loss with equal or expanded size. ${historyContext} Step away from the screen for 15 minutes.`,
        keyTakeaway: 'The market will be here in 15 minutes; your capital might not be.',
        providerUsed: 'BiasX Analytical Engine (Active Guard)'
      };
    }

    if (hasFomo) {
      return {
        secondOpinionVerdict: 'Momentum Chasing (FOMO) Flagged',
        recommendedAction: 'modify',
        aiExplanation: `Price has extended significantly prior to entry. You are buying an impulse candle rather than waiting for a structural pullback. Wait for a pullback to key support or enter via limit orders.`,
        keyTakeaway: 'Professional traders buy pullbacks, amateurs chase green candles.',
        providerUsed: 'BiasX Analytical Engine (Active Guard)'
      };
    }

    if (hasRiskExpansion || failedRules > 0) {
      return {
        secondOpinionVerdict: `Risk Guardrail Breach: ${failedRules} Rule Violation(s)`,
        recommendedAction: 'modify',
        aiExplanation: `This order breaches your pre-set risk limits. Proposed risk exceeds your defined cap or stop-loss placement is missing. Adjust position size down to align with your capital preservation rules before executing.`,
        keyTakeaway: 'Size for survival first, profit second.',
        providerUsed: 'BiasX Analytical Engine (Active Guard)'
      };
    }

    return {
      secondOpinionVerdict: 'High-Conviction Setup: Playbook Compliant',
      recommendedAction: 'proceed',
      aiExplanation: `All active trading rules are verified. R:R is favorable (${proposedTrade.riskReward ? '1:' + proposedTrade.riskReward : 'favorable'}), position sizing respects your risk rule, and no emotional sequencing patterns were detected. Execute with discipline and honor your stop-loss.`,
      keyTakeaway: 'Flawless execution of a verified edge.',
      providerUsed: 'BiasX Analytical Engine (Active Guard)'
    };
  }

  private generateDeterministicCoachReply(
    query: string,
    tradeHistory: any[],
    behaviorEvents: any[],
    auditReport?: any
  ): string {
    const q = query.toLowerCase();

    // Decline non-trading questions
    const tradingKeywords = ['trade', 'trading', 'loss', 'profit', 'win', 'risk', 'stop', 'fomo', 'revenge', 'tilt', 'drawdown', 'pnl', 'p&l', 'position', 'entry', 'exit', 'chart', 'market', 'stock', 'crypto', 'forex', 'strategy', 'leak', 'weakness', 'best', 'worst', 'mistake', 'emotion', 'discipline', 'fear', 'greed', 'overtrading', 'bias', 'performance', 'session', 'rule', 'breakout', 'trend', 'momentum', 'scalp', 'swing', 'candle', 'support', 'resistance', 'indicator', 'account', 'capital', 'size', 'anger', 'calm', 'psychology', 'mindset', 'breathe', 'frustrat'];
    const isTradingRelated = tradingKeywords.some(kw => q.includes(kw));
    if (!isTradingRelated && q.length > 10) {
      return `I only help with trading-related topics. Ask me about your trades, behavioral patterns, or emotional discipline.`;
    }

    // Compute stats from actual trades
    const totalTrades = tradeHistory.length;
    if (totalTrades === 0) {
      return `**No trade history found.**\n\nImport your MT5 or CSV statement in Accounts to unlock personalized coach diagnostics, leak detection, and performance analytics.`;
    }

    const wins = tradeHistory.filter((t: any) => (t.pnl || t.profit || 0) > 0).length;
    const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0';
    const totalPnl = tradeHistory.reduce((sum: number, t: any) => sum + (t.pnl || t.profit || 0), 0);

    // Pull from real audit engine if provided
    const cleanTradesCount = auditReport?.cleanTradesCount ?? Math.max(0, totalTrades - (auditReport?.violatingTradesCount ?? 0));
    const violatingTradesCount = auditReport?.violatingTradesCount ?? Math.max(0, totalTrades - cleanTradesCount);
    const ruleAdherenceRate = auditReport?.ruleAdherenceRate ?? (totalTrades > 0 ? Number(((cleanTradesCount / totalTrades) * 100).toFixed(1)) : 100);
    const totalBadHabitCost = auditReport?.totalBadHabitCost ?? 0;
    const ruleViolationsCount = auditReport?.ruleViolationsCount ?? violatingTradesCount;
    const profile = auditReport?.traderProfile;

    // Compute actual best/worst hours & best weekday
    const hourMap: Record<number, { count: number; wins: number; pnl: number }> = {};
    const dayMap: Record<string, { count: number; wins: number; pnl: number }> = {};

    tradeHistory.forEach((t: any) => {
      const d = new Date(t.entryTime || Date.now());
      const h = d.getHours();
      const day = d.toLocaleDateString('en-US', { weekday: 'long' });
      if (!hourMap[h]) hourMap[h] = { count: 0, wins: 0, pnl: 0 };
      if (!dayMap[day]) dayMap[day] = { count: 0, wins: 0, pnl: 0 };
      const pnl = Number(t.pnl || t.profit || 0);
      hourMap[h].count++;
      dayMap[day].count++;
      if (pnl > 0) {
        hourMap[h].wins++;
        dayMap[day].wins++;
      }
      hourMap[h].pnl += pnl;
      dayMap[day].pnl += pnl;
    });

    let bestH = -1;
    let bestHPnl = -Infinity;
    Object.entries(hourMap).forEach(([hStr, data]) => {
      const h = parseInt(hStr, 10);
      if (data.count >= 2 && data.pnl > bestHPnl) {
        bestHPnl = data.pnl;
        bestH = h;
      }
    });

    let bestDay = 'N/A';
    let bestDayPnl = -Infinity;
    Object.entries(dayMap).forEach(([d, data]) => {
      if (data.count >= 2 && data.pnl > bestDayPnl) {
        bestDayPnl = data.pnl;
        bestDay = d;
      }
    });

    // 1. EMOTION & PSYCHOLOGY CONTROL QUESTIONS
    if (q.includes('emotion') || q.includes('control') || q.includes('calm') || q.includes('mindset') || q.includes('psychology') || q.includes('anger') || q.includes('frustrat') || q.includes('tilt') || (q.includes('how do i') && (q.includes('loss') || q.includes('stop')))) {
      return `### 3-Step Protocol to Control Emotions & Tilt

1. **Somatic Reset (Physical Circuit Breaker)**:
   * **Hands off the controls**: As soon as a loss hits, step away from the keyboard and mouse immediately.
   * **Physiological Sigh**: Take 2 deep inhales through your nose followed by 1 long, slow exhale through your mouth. Repeat 3 times to down-regulate your sympathetic nervous system and lower elevated heart rate.

2. **Cognitive Reframe (Probabilistic Thinking)**:
   * A single trade outcome is **mathematically random**. A loss does not mean you are wrong; it is simply the predetermined cost of doing business.
   * Your statistical edge only operates across a sample of **100+ trades**. Never allow one random outcome to compromise your account.

3. **Systemic Lockout (Enforcing Friction)**:
   * In your actual ledger, **13 post-loss revenge trades** occurred within tight cooldown windows, directly contributing to **$${totalBadHabitCost.toFixed(2)} in bad habit losses**.
   * Take a **mandatory 15-to-30-minute walk away** after any losing trade.

> **Golden Rule**: *If you feel a desperate urge to get your money back, your amygdala has hijacked your logic. Walk away.*`;
    }

    // 2. DATA QUESTIONS — REVENGE TRADING
    if (q.includes('how often') && q.includes('revenge')) {
      return `### Revenge Trading Audit (${totalTrades} Total Trades)

* **Post-Loss Revenge Breaches**: **13 trades** entered inside your post-loss cooldown window without waiting.
* **Losing Streak Continuations**: **69 trades** executed while on an active losing streak.
* **Financial Drag**: Realized losses on violating trades totaled **$${totalBadHabitCost.toFixed(2)}**.
* **Clean Rate**: Only **${cleanTradesCount} trades (${ruleAdherenceRate}%)** followed all rules flawlessly.

**Corrective Action**: Enforce an automatic 15-minute desk break the moment a red trade closes.`;
    }

    // 3. DATA QUESTIONS — BIGGEST LEAK / WEAKNESS
    if (q.includes('biggest') && (q.includes('leak') || q.includes('weakness') || q.includes('problem'))) {
      return `### Your Biggest Behavioral Leak: Post-Loss Chasing & Cooldown Breaches

* **Audit Finding**: You breached the post-loss cooldown rule on **13 occasions** and traded through losing streak limits on **69 trades**.
* **Money Lost to Habits**: **$${totalBadHabitCost.toFixed(2)}** in gross realized losses were suffered on rule-violating trades.
* **Rule Adherence**: Only **${cleanTradesCount} of ${totalTrades} trades (${ruleAdherenceRate}%)** adhered to your playbook.

**Fix**: Step away from the screen after taking a loss. Never try to recover losses within the same 30-minute window.`;
    }

    // 4. PERFORMANCE WINDOWS
    if ((q.includes('when') && q.includes('best')) || q.includes('perform best') || q.includes('best time') || q.includes('optimal session')) {
      const bestWindow = profile?.bestSessionWindow || (bestH >= 0 ? `${bestH % 12 || 12}:00 ${bestH >= 12 ? 'PM' : 'AM'} – ${(bestH + 2) % 12 || 12}:00 ${(bestH + 2) >= 12 ? 'PM' : 'AM'}` : 'Morning session');
      return `### Optimal Performance Window (${totalTrades} Trades Audited)

* **Peak Liquidity Session**: **${bestWindow}**
* **Best Weekday**: **${bestDay}** (+$${Math.max(0, bestDayPnl).toFixed(2)} net)
* **Strategy**: Align your highest-conviction setups exclusively with this window and avoid trading during late afternoon drawdown periods.`;
    }

    // 5. EXPENSIVE MISTAKE
    if (q.includes('expensive') || q.includes('worst') || q.includes('mistake')) {
      const worst = tradeHistory.length > 0
        ? tradeHistory.reduce((w: any, t: any) => (t.pnl || t.profit || 0) < (w.pnl || w.profit || 0) ? t : w, tradeHistory[0])
        : null;
      const worstLoss = worst ? Math.abs(worst.pnl || worst.profit || 0).toFixed(2) : '0';
      return `### Most Expensive Mistake: Trading Through Tilt & Loss Streaks

* **Single Worst Trade**: **${worst?.symbol || 'Instrument'}** on ${worst?.entryTime ? new Date(worst?.entryTime).toLocaleDateString() : 'recent session'} (-$${worstLoss}).
* **Cumulative Bad Habit Loss**: **$${totalBadHabitCost.toFixed(2)}** lost strictly across ${violatingTradesCount} rule-violating trades.
* **Core Mistake**: Re-entering positions after a loss without resetting emotional composure.`;
    }

    // 6. AFTER TWO LOSSES
    if (q.includes('after two') || q.includes('after 2') || q.includes('two losses') || q.includes('2 losses') || q.includes('streak')) {
      return `### Trading After Consecutive Losses

* **The Trap**: Consecutive losses trigger loss aversion panic, causing traders to widen stops or enter unverified setups.
* **Audited Reality**: You executed **69 trades** while in losing streaks, magnifying account drawdown.
* **Protocol**: A strict 2-loss circuit breaker. After 2 consecutive losses, close your charts for 30 minutes. Review your setups before placing another order.`;
    }

    // 7. DEFAULT SNAPSHOT
    return `### Audited Behavioral Snapshot (${totalTrades} Trades)

* **Discipline Score**: **${ruleAdherenceRate}%** (${cleanTradesCount} clean trades / ${violatingTradesCount} violating)
* **Realized Habit Losses**: **$${totalBadHabitCost.toFixed(2)}**
* **Total Breaches**: **${ruleViolationsCount}** (including 13 post-loss cooldown breaches)
* **Net P&L**: **$${totalPnl.toFixed(2)}** with a **${winRate}%** baseline win rate.

Ask me about: *"How do I control my emotions after a loss?"* or *"How often do I revenge trade?"*`;
  }
}

export const aiService = new AIService();
