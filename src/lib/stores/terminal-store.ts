import { create } from 'zustand'

export interface TradeAnalysisResult {
  ruleCompliance: {
    totalRules: number
    passed: number
    failed: number
    results: Array<{ ruleName: string; passed: boolean; severity: string; message: string }>
  }
  behavioralRisk: 'low' | 'medium' | 'high'
  behavioralSignals: string[]
  detections: Array<{ pattern: string; confidence: number; severity: string; signals: string[] }>
  similarTrades: {
    total: number
    winRate: number
    avgPnl: number
    avgHoldingTime: number
  }
  consequence: {
    description: string
    historicalLosses: number
    historicalWins: number
    avgLoss: number
  } | null
  recommendation: 'cancel' | 'modify' | 'proceed'
  aiExplanation: string
  verdict: string
}

interface TerminalState {
  activeSymbol: string
  activeTimeframe: string
  watchlist: Array<{ symbol: string; price: number; change: number; changePercent: number; behavioralRisk?: string }>
  tradeForm: {
    direction: 'long' | 'short'
    orderType: 'market' | 'limit'
    entryPrice: number
    stopLoss: number | null
    takeProfit: number | null
    quantity: number
    positionSize: number
    riskPercentage: number | null
    riskReward: number | null
  }
  analysisResult: TradeAnalysisResult | null
  isAnalyzing: boolean
  showAnalysis: boolean
  
  setActiveSymbol: (symbol: string) => void
  setActiveTimeframe: (timeframe: string) => void
  updateTradeForm: (updates: Partial<TerminalState['tradeForm']>) => void
  setAnalysisResult: (result: TradeAnalysisResult | null) => void
  setIsAnalyzing: (analyzing: boolean) => void
  setShowAnalysis: (show: boolean) => void
  resetTradeForm: () => void
}

const initialWatchlist = [
  { symbol: 'BTC/USDT', price: 104250, change: 1459.5, changePercent: 1.42 },
  { symbol: 'ETH/USDT', price: 4020, change: 33.7, changePercent: 0.84 },
  { symbol: 'AAPL', price: 231.20, change: -0.74, changePercent: -0.32 },
  { symbol: 'TSLA', price: 342.12, change: 3.82, changePercent: 1.13 },
  { symbol: 'SPY', price: 583.50, change: 1.63, changePercent: 0.28 },
  { symbol: 'EUR/USD', price: 1.0892, change: -0.0016, changePercent: -0.15 },
]

const initialTradeForm = {
  direction: 'long' as const,
  orderType: 'market' as const,
  entryPrice: 104250,
  stopLoss: null,
  takeProfit: null,
  quantity: 1,
  positionSize: 104250,
  riskPercentage: null,
  riskReward: null,
}

export const useTerminalStore = create<TerminalState>((set) => ({
  activeSymbol: 'BTC/USDT',
  activeTimeframe: '15m',
  watchlist: initialWatchlist,
  tradeForm: initialTradeForm,
  analysisResult: null,
  isAnalyzing: false,
  showAnalysis: false,
  
  setActiveSymbol: (symbol) => set({ activeSymbol: symbol }),
  setActiveTimeframe: (timeframe) => set({ activeTimeframe: timeframe }),
  updateTradeForm: (updates) => set((state) => ({ tradeForm: { ...state.tradeForm, ...updates } })),
  setAnalysisResult: (result) => set({ analysisResult: result }),
  setIsAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),
  setShowAnalysis: (show) => set({ showAnalysis: show }),
  resetTradeForm: () => set({ tradeForm: initialTradeForm }),
}))
