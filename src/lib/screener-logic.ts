import {
  calculateEMA,
  calculateMACD,
  calculateSupertrend,
  calculateRSI,
  Candle
} from './indicators';

export interface TimeframeEvaluation {
  ema: 'Bearish' | 'Bullish';
  macd: 'Bearish' | 'Bullish';
  st: 'Bearish' | 'Bullish';
  rsi: 'Bearish' | 'Bullish';
  isDowntrend: boolean; // True if at least 3 out of 4 conditions are Bearish
}

export function evaluateDowntrend(candles: Candle[]): TimeframeEvaluation {
  if (!candles || candles.length === 0) {
    return { ema: 'Bullish', macd: 'Bullish', st: 'Bullish', rsi: 'Bullish', isDowntrend: false };
  }

  // Extract closing prices for indicator calculations
  const closePrices = candles.map((c) => c.close);

  // 1. Calculate Indicators
  const ema5 = calculateEMA(closePrices, 5);
  const ema13 = calculateEMA(closePrices, 13);
  
  const { macd, signal } = calculateMACD(closePrices);
  
  const { isUptrend } = calculateSupertrend(candles, 10, 3);
  
  const rsi = calculateRSI(closePrices, 14);

  // 2. Evaluate Individual Conditions based on your exact rules
  const isEmaBearish = ema5 < ema13;
  const isMacdBearish = macd < signal;
  const isStBearish = !isUptrend; // Red Supertrend means it is NOT an uptrend
  const isRsiBearish = rsi < 55;

  // 3. Apply the "3 out of 4" Rule
  const bearishCount = [isEmaBearish, isMacdBearish, isStBearish, isRsiBearish].filter(Boolean).length;
  
  return {
    ema: isEmaBearish ? 'Bearish' : 'Bullish',
    macd: isMacdBearish ? 'Bearish' : 'Bullish',
    st: isStBearish ? 'Bearish' : 'Bullish',
    rsi: isRsiBearish ? 'Bearish' : 'Bullish',
    isDowntrend: bearishCount >= 3, // Passes if 3 or 4 conditions fail
  };
}

export function evaluateUptrend(candles: Candle[]) {
  if (!candles || candles.length === 0) {
    return { ema: 'Bearish', macd: 'Bearish', st: 'Bearish', rsi: 'Bearish', bullishCount: 0 };
  }

  const closePrices = candles.map((c) => c.close);

  const ema5 = calculateEMA(closePrices, 5);
  const ema13 = calculateEMA(closePrices, 13);
  const { macd, signal } = calculateMACD(closePrices);
  const { isUptrend } = calculateSupertrend(candles, 10, 3);
  const rsi = calculateRSI(closePrices, 14);

  // Bullish Conditions
  const isEmaBullish = ema5 > ema13;
  const isMacdBullish = macd > signal;
  const isStBullish = isUptrend;
  const isRsiBullish = rsi > 55;

  const bullishCount = [isEmaBullish, isMacdBullish, isStBullish, isRsiBullish].filter(Boolean).length;
  
  return {
    ema: isEmaBullish ? 'Bullish' : 'Bearish',
    macd: isMacdBullish ? 'Bullish' : 'Bearish',
    st: isStBullish ? 'Bullish' : 'Bearish',
    rsi: isRsiBullish ? 'Bullish' : 'Bearish',
    bullishCount,
  };
}

export function get52WeekHigh(weeklyCandles: Candle[]): number {
  // Take up to 52 historical weeks, excluding the current active week
  const historicalWeeks = weeklyCandles.slice(-53, -1);
  if (historicalWeeks.length === 0) return 0;
  
  // Find the absolute highest high in that 1-year window
  return Math.max(...historicalWeeks.map(c => c.high));
}
export function evaluateLookbackReversal(candles: Candle[]) {
  // We need at least enough history to check 4 months back
  if (!candles || candles.length < 5) {
    return { isReversal: false, reversalType: 'None' };
  }

  // Helper function: Calculates indicators for a specific point in time
  const evalAtHistoricalOffset = (offset: number) => {
    // If offset is 0, use all candles. If 1, remove the last candle, etc.
    const slicedCandles = offset === 0 ? candles : candles.slice(0, candles.length - offset);
    const closePrices = slicedCandles.map(c => c.close);
    
    const ema5 = calculateEMA(closePrices, 5);
    const ema13 = calculateEMA(closePrices, 13);
    const { macd, signal } = calculateMACD(closePrices);
    const { isUptrend } = calculateSupertrend(slicedCandles, 10, 3);
    
    return {
      ema: ema5 > ema13,      // true if Bullish
      macd: macd > signal,    // true if Bullish
      st: isUptrend           // true if Bullish
    };
  };

  // Get indicator states for Current (0), and previous 3 months (1, 2, 3)
  const current = evalAtHistoricalOffset(0);
  const m1 = evalAtHistoricalOffset(1);
  const m2 = evalAtHistoricalOffset(2);
  const m3 = evalAtHistoricalOffset(3);

  // Check for fresh reversals (Current is Bullish, previous 3 were Bearish)
  const isEmaReversal = current.ema === true && m1.ema === false && m2.ema === false && m3.ema === false;
  const isMacdReversal = current.macd === true && m1.macd === false && m2.macd === false && m3.macd === false;
  const isStReversal = current.st === true && m1.st === false && m2.st === false && m3.st === false;

  return {
    isReversal: isEmaReversal || isMacdReversal || isStReversal,
    reversalType: isEmaReversal ? 'EMA' : isMacdReversal ? 'MACD' : isStReversal ? 'Supertrend' : 'Multiple'
  };
}