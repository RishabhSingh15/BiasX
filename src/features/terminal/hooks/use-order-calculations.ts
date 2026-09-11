import { useMemo } from 'react';
import { TradeDirection, OrderCalculationResults } from '../types';
import { SYMBOL_CONTRACT_SIZES } from '../constants/symbols';

interface UseOrderCalculationsParams {
  selectedSymbol: string;
  direction: TradeDirection;
  lots: string;
  entryPrice: string | number;
  stopLoss: string | number;
  takeProfit: string | number;
  accountBalance: number;
  maxRiskLimit?: number;
}

export function useOrderCalculations({
  selectedSymbol,
  direction,
  lots,
  entryPrice,
  stopLoss,
  takeProfit,
  accountBalance,
  maxRiskLimit = 1.0,
}: UseOrderCalculationsParams): OrderCalculationResults {
  return useMemo(() => {
    const numLots = Math.max(0.001, parseFloat(lots) || 0.01);
    const numEntryPrice = typeof entryPrice === 'string' ? parseFloat(entryPrice) || 0 : (entryPrice || 0);
    const numStopLoss = typeof stopLoss === 'string' ? parseFloat(stopLoss) || 0 : (stopLoss || 0);
    const numTakeProfit = typeof takeProfit === 'string' ? parseFloat(takeProfit) || 0 : (takeProfit || 0);

    const contractInfo = SYMBOL_CONTRACT_SIZES[selectedSymbol] || { size: 1, label: 'units' };
    const contractMultiplier = contractInfo.size;
    const isJpyQuote = selectedSymbol.endsWith('/JPY') || selectedSymbol.includes('JPY');

    // Direction-aware validations
    const isSlValid = direction === 'BUY'
      ? (numEntryPrice > 0 && numStopLoss > 0 && numStopLoss < numEntryPrice)
      : (numEntryPrice > 0 && numStopLoss > 0 && numStopLoss > numEntryPrice);

    const isTpValid = direction === 'BUY'
      ? (numEntryPrice > 0 && numTakeProfit > 0 && numTakeProfit > numEntryPrice)
      : (numEntryPrice > 0 && numTakeProfit > 0 && numTakeProfit < numEntryPrice);

    // Error messages for user guidance
    let slError: string | null = null;
    if (numEntryPrice > 0 && numStopLoss > 0) {
      if (direction === 'BUY' && numStopLoss >= numEntryPrice) {
        slError = `SL must be below entry ($${numEntryPrice}) for BUY`;
      } else if (direction === 'SELL' && numStopLoss <= numEntryPrice) {
        slError = `SL must be above entry ($${numEntryPrice}) for SELL`;
      }
    } else if (numStopLoss <= 0) {
      slError = 'Set Stop Loss';
    }

    let tpError: string | null = null;
    if (numEntryPrice > 0 && numTakeProfit > 0) {
      if (direction === 'BUY' && numTakeProfit <= numEntryPrice) {
        tpError = `TP must be above entry ($${numEntryPrice}) for BUY`;
      } else if (direction === 'SELL' && numTakeProfit >= numEntryPrice) {
        tpError = `TP must be below entry ($${numEntryPrice}) for SELL`;
      }
    } else if (numTakeProfit <= 0) {
      tpError = 'Set Take Profit';
    }

    // Price difference calculations (always computed using distance)
    const slPriceDiff = (numEntryPrice > 0 && numStopLoss > 0)
      ? Math.abs(numEntryPrice - numStopLoss)
      : 0;

    const tpPriceDiff = (numEntryPrice > 0 && numTakeProfit > 0)
      ? Math.abs(numTakeProfit - numEntryPrice)
      : 0;

    // Price distance percentages relative to entry price
    const slPricePct = numEntryPrice > 0 && slPriceDiff > 0
      ? ((slPriceDiff / numEntryPrice) * 100).toFixed(2)
      : '0.00';
    const tpPricePct = numEntryPrice > 0 && tpPriceDiff > 0
      ? ((tpPriceDiff / numEntryPrice) * 100).toFixed(2)
      : '0.00';

    // Position dollar values (always calculated from price distance)
    let dollarRisk = 0;
    if (slPriceDiff > 0) {
      dollarRisk = isJpyQuote && numEntryPrice > 0
        ? (slPriceDiff * numLots * contractMultiplier) / numEntryPrice
        : slPriceDiff * numLots * contractMultiplier;
    }

    let dollarProfit = 0;
    if (tpPriceDiff > 0) {
      dollarProfit = isJpyQuote && numEntryPrice > 0
        ? (tpPriceDiff * numLots * contractMultiplier) / numEntryPrice
        : tpPriceDiff * numLots * contractMultiplier;
    }

    // Account portfolio risk & reward percentages
    const riskPct = accountBalance > 0 && dollarRisk > 0
      ? (dollarRisk / accountBalance) * 100
      : 0;
    const rewardPct = accountBalance > 0 && dollarProfit > 0
      ? (dollarProfit / accountBalance) * 100
      : 0;

    // Accurate Risk/Reward Ratio
    let rrRatio = '—';
    if (dollarRisk > 0 && dollarProfit > 0) {
      rrRatio = (dollarProfit / dollarRisk).toFixed(2);
    } else if (dollarRisk > 0) {
      rrRatio = '1.00';
    }

    const maxAllowedRiskDollar = accountBalance * (maxRiskLimit / 100);
    const isRiskSafe = isSlValid && riskPct <= maxRiskLimit && riskPct > 0;

    return {
      numLots,
      contractMultiplier,
      contractInfo,
      slPriceDiff,
      tpPriceDiff,
      slPricePct,
      tpPricePct,
      dollarRisk,
      dollarProfit,
      riskPct,
      rewardPct,
      rrRatio,
      isRiskSafe,
      maxAllowedRiskDollar,
      isSlValid,
      isTpValid,
      slError,
      tpError,
    };
  }, [selectedSymbol, direction, lots, entryPrice, stopLoss, takeProfit, accountBalance, maxRiskLimit]);
}
