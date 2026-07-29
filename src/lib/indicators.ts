export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Exponential Moving Average (EMA)
export function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;

  const multiplier = 2 / (period + 1);
  
  // Start with Simple Moving Average (SMA) for initial seed
  let ema = prices.slice(0, period).reduce((sum, p) => sum + p, 0) / period;

  // Calculate EMA for remaining prices
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return Math.round(ema * 100) / 100;
}

// Relative Strength Index (RSI - 14 Period)
export function calculateRSI(prices: number[], period = 14): number {
  if (prices.length <= period) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);

  return Math.round(rsi * 100) / 100;
}

// MACD (12, 26, 9)
export function calculateMACD(prices: number[]): { macd: number; signal: number } {
  if (prices.length < 26) return { macd: 0, signal: 0 };

  // Calculate 12 & 26 EMA series across history
  const macdLineSeries: number[] = [];
  
  for (let i = 26; i <= prices.length; i++) {
    const subPrices = prices.slice(0, i);
    const ema12 = calculateEMA(subPrices, 12);
    const ema26 = calculateEMA(subPrices, 26);
    macdLineSeries.push(ema12 - ema26);
  }

  const currentMacd = macdLineSeries[macdLineSeries.length - 1] || 0;
  const signalLine = calculateEMA(macdLineSeries, 9);

  return {
    macd: Math.round(currentMacd * 100) / 100,
    signal: Math.round(signalLine * 100) / 100,
  };
}

// Helper: Rolling Moving Average (RMA) specifically used by TradingView for ATR
function calculateRMA(values: number[], period: number): number[] {
  const rma = new Array(values.length).fill(0);
  if (values.length < period) return rma;
  
  // Initial SMA for the first seed value
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  rma[period - 1] = sum / period;

  // RMA formula: (prevRMA * (period - 1) + currentValue) / period
  for (let i = period; i < values.length; i++) {
    rma[i] = (rma[i - 1] * (period - 1) + values[i]) / period;
  }
  return rma;
}

// Supertrend (TradingView Exact Match Logic)
export function calculateSupertrend(
  candles: Candle[],
  period = 10,
  multiplier = 3
): { stUpperBand: number | null; stLowerBand: number | null; isUptrend: boolean } {
  if (candles.length <= period) {
    return { stUpperBand: null, stLowerBand: null, isUptrend: true };
  }

  // 1. Calculate True Range (TR)
  const tr = new Array(candles.length).fill(0);
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    tr[i] = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
  }

  // 2. Calculate ATR using Wilder's RMA (TradingView method)
  const atr = calculateRMA(tr, period);

  let prevUpper = 0;
  let prevLower = 0;
  let prevClose = candles[period - 1].close;
  let isUptrend = true;

  for (let i = period; i < candles.length; i++) {
    const hl2 = (candles[i].high + candles[i].low) / 2;
    const currentAtr = atr[i];

    const basicUpper = hl2 + multiplier * currentAtr;
    const basicLower = hl2 - multiplier * currentAtr;

    let upperBand = basicUpper < prevUpper || prevClose > prevUpper ? basicUpper : prevUpper;
    let lowerBand = basicLower > prevLower || prevClose < prevLower ? basicLower : prevLower;

    if (i === period) {
        upperBand = basicUpper;
        lowerBand = basicLower;
    }

    if (isUptrend && candles[i].close < lowerBand) {
      isUptrend = false;
    } else if (!isUptrend && candles[i].close > upperBand) {
      isUptrend = true;
    }

    prevUpper = upperBand;
    prevLower = lowerBand;
    prevClose = candles[i].close;
  }

  return {
    stUpperBand: !isUptrend ? Math.round(prevUpper * 100) / 100 : null,
    stLowerBand: isUptrend ? Math.round(prevLower * 100) / 100 : null,
    isUptrend: isUptrend,
  };
}