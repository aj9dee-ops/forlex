/**
 * GOLDVISION PRO - Advanced Multi-Asset Forex & Gold Analysis Platform
 * Features:
 * 1. 1M (1 Minute) Scalping Engine (สไนเปอร์เทรดสั้น 1 นาที)
 * 2. Real-Time Chart Indicator Customizer & Presets
 * 3. Trend, Optimal Entry, Dynamic ATR SL/TP, R:R, Confidence Score
 * 4. SMC Strategy: Order Block (OB), Fair Value Gap (FVG), Liquidity Sweep, BOS/CHoCH
 * 5. Divergence Engine: RSI & MACD Regular & Hidden Divergence
 * 6. Dow Theory & Fibonacci Retracement (Golden Pocket 50% - 61.8%)
 * 7. Thai AI Voice Alerts (SpeechSynthesis) & Telegram Bot Integration
 * 8. High-Impact Economic News Calendar & Warning System
 * 9. Multi-Asset Support (XAU/USD, BTC/USD, EUR/USD, GBP/USD)
 * 10. Trade Journal & Win-Rate Tracker
 */

// Asset Definitions
const ASSETS = {
  'XAUUSD': {
    name: 'XAU/USD (Gold Spot)',
    shortName: 'ทองคำ (XAU/USD)',
    binanceSymbol: 'PAXGUSDT',
    tvSymbol: 'OANDA:XAUUSD',
    decimals: 2,
    pipMultiplier: 10, // 1 USD = 10 pips (100 points)
    contractSize: 100, // 1 standard lot = 100 oz ($100 per $1 move)
    minAtr: 2.5,
    minAtr1m: 0.8, // 1M scalping ATR
    unit: 'USD'
  },
  'BTCUSD': {
    name: 'BTC/USD (Bitcoin)',
    shortName: 'บิตคอยน์ (BTC/USD)',
    binanceSymbol: 'BTCUSDT',
    tvSymbol: 'BINANCE:BTCUSDT',
    decimals: 2,
    pipMultiplier: 1,
    contractSize: 1,
    minAtr: 250,
    minAtr1m: 45,
    unit: 'USD'
  },
  'EURUSD': {
    name: 'EUR/USD (Euro / US Dollar)',
    shortName: 'ยูโร/ดอลลาร์ (EUR/USD)',
    binanceSymbol: 'EURUSDT',
    tvSymbol: 'FX:EURUSD',
    decimals: 4,
    pipMultiplier: 10000,
    contractSize: 100000,
    minAtr: 0.0030,
    minAtr1m: 0.0006,
    unit: 'Pips'
  },
  'GBPUSD': {
    name: 'GBP/USD (Pound / US Dollar)',
    shortName: 'ปอนด์/ดอลลาร์ (GBP/USD)',
    binanceSymbol: 'GBPUSDT',
    tvSymbol: 'FX:GBPUSD',
    decimals: 4,
    pipMultiplier: 10000,
    contractSize: 100000,
    minAtr: 0.0040,
    minAtr1m: 0.0008,
    unit: 'Pips'
  }
};

// Application State
const state = {
  currentAssetKey: 'XAUUSD',
  timeframe: '1h', // '1m', '5m', '15m', '1h', '4h', '1d'
  livePrice: 2650.00,
  priceChange24h: 0.55,
  high24h: 2664.20,
  low24h: 2638.50,
  volume24h: 14200.0,
  candles: [],
  analysis: null,
  autoRefresh: true,
  refreshInterval: null,
  customMode: false,
  soundToneEnabled: true,
  voiceSpeechEnabled: true,
  fontSize: 'normal',
  telegramSettings: {
    enabled: false,
    botToken: '',
    chatId: ''
  },
  journal: [],
  history: [],
  lastSignalType: null,

  // Customizable Indicators on Real Chart & Engine
  indicators: {
    emaFastEnabled: true,
    emaFastPeriod: 9,
    emaSlowEnabled: true,
    emaSlowPeriod: 21,
    emaTrendEnabled: true,
    emaTrendPeriod: 50,
    rsiEnabled: true,
    rsiPeriod: 14,
    macdEnabled: true,
    bbEnabled: false,
    bbPeriod: 20,
    bbDev: 2,
    volumeEnabled: true,
    vwapEnabled: false
  }
};

// Technical Engine (Standard Indicators)
class TechnicalEngine {
  static SMA(data, period) {
    const sma = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        sma.push(null);
        continue;
      }
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  static EMA(data, period) {
    const ema = [];
    const multiplier = 2 / (period + 1);
    let prevEma = null;

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        ema.push(null);
        continue;
      }
      if (prevEma === null) {
        const sum = data.slice(0, period).reduce((a, b) => a + b, 0);
        prevEma = sum / period;
        ema.push(prevEma);
      } else {
        const currentEma = (data[i] - prevEma) * multiplier + prevEma;
        ema.push(currentEma);
        prevEma = currentEma;
      }
    }
    return ema;
  }

  static RSI(closes, period = 14) {
    if (closes.length < period + 1) return Array(closes.length).fill(50);
    const rsi = Array(period).fill(null);
    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    const firstRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + firstRS)));

    for (let i = period + 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      const gain = diff >= 0 ? diff : 0;
      const loss = diff < 0 ? Math.abs(diff) : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    }
    return rsi;
  }

  static ATR(highs, lows, closes, period = 14) {
    const tr = [highs[0] - lows[0]];
    for (let i = 1; i < closes.length; i++) {
      const hl = highs[i] - lows[i];
      const hc = Math.abs(highs[i] - closes[i - 1]);
      const lc = Math.abs(lows[i] - closes[i - 1]);
      tr.push(Math.max(hl, hc, lc));
    }

    const atr = Array(period - 1).fill(null);
    let firstATR = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
    atr.push(firstATR);

    let prevATR = firstATR;
    for (let i = period; i < tr.length; i++) {
      const currentATR = (prevATR * (period - 1) + tr[i]) / period;
      atr.push(currentATR);
      prevATR = currentATR;
    }
    return atr;
  }

  static MACD(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const fastEMA = this.EMA(closes, fastPeriod);
    const slowEMA = this.EMA(closes, slowPeriod);
    const macdLine = [];

    for (let i = 0; i < closes.length; i++) {
      if (fastEMA[i] === null || slowEMA[i] === null) {
        macdLine.push(null);
      } else {
        macdLine.push(fastEMA[i] - slowEMA[i]);
      }
    }

    const validMacd = macdLine.filter(val => val !== null);
    const validSignal = this.EMA(validMacd, signalPeriod);
    const signalLine = Array(macdLine.length - validMacd.length).fill(null).concat(validSignal);

    const histogram = [];
    for (let i = 0; i < closes.length; i++) {
      if (macdLine[i] !== null && signalLine[i] !== null) {
        histogram.push(macdLine[i] - signalLine[i]);
      } else {
        histogram.push(null);
      }
    }

    return { macdLine, signalLine, histogram };
  }

  static BollingerBands(closes, period = 20, multiplier = 2) {
    const sma = this.SMA(closes, period);
    const upper = [];
    const lower = [];

    for (let i = 0; i < closes.length; i++) {
      if (sma[i] === null) {
        upper.push(null);
        lower.push(null);
        continue;
      }
      const slice = closes.slice(i - period + 1, i + 1);
      const mean = sma[i];
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const stdDev = Math.sqrt(variance);
      upper.push(mean + multiplier * stdDev);
      lower.push(mean - multiplier * stdDev);
    }

    return { middle: sma, upper, lower };
  }
}

// Advanced Strategies: SMC, Divergence, Dow Theory & Fibonacci
class AdvancedStrategyEngine {
  static scanSMC(candles) {
    const len = candles.length;
    if (len < 20) return null;

    const orderBlocks = [];
    const fvgs = [];
    let liquiditySweep = null;
    let structureBreak = null;

    const startIdx = Math.max(3, len - 35);
    const currentPrice = candles[len - 1].close;

    for (let i = startIdx; i < len - 2; i++) {
      const cCurr = candles[i];
      const cNext = candles[i + 1];
      const cNext2 = candles[i + 2];

      // Bullish FVG
      if (cNext2.low > cCurr.high && (cNext.close > cNext.open)) {
        const gapSize = cNext2.low - cCurr.high;
        if (gapSize > 0.2) {
          const isMitigated = currentPrice < cCurr.high;
          fvgs.push({
            type: 'BULLISH',
            top: cNext2.low,
            bottom: cCurr.high,
            gap: gapSize,
            status: isMitigated ? 'Mitigated (ถูกทดสอบแล้ว)' : 'Open (รอเติมเต็ม)'
          });
        }
      }

      // Bearish FVG
      if (cNext2.high < cCurr.low && (cNext.close < cNext.open)) {
        const gapSize = cCurr.low - cNext2.high;
        if (gapSize > 0.2) {
          const isMitigated = currentPrice > cCurr.low;
          fvgs.push({
            type: 'BEARISH',
            top: cCurr.low,
            bottom: cNext2.high,
            gap: gapSize,
            status: isMitigated ? 'Mitigated (ถูกทดสอบแล้ว)' : 'Open (รอเติมเต็ม)'
          });
        }
      }

      // Bullish Order Block (OB)
      if (cCurr.close < cCurr.open && cNext.close > cNext.open && (cNext.close > cCurr.high)) {
        const impulse = (cNext.close - cNext.open) / (cCurr.open - cCurr.close || 1);
        if (impulse > 1.2) {
          orderBlocks.push({
            type: 'BULLISH_OB',
            zoneTop: Math.max(cCurr.open, cCurr.close),
            zoneBottom: cCurr.low,
            candleTime: new Date(cCurr.openTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
            mitigated: currentPrice < cCurr.low
          });
        }
      }

      // Bearish Order Block (OB)
      if (cCurr.close > cCurr.open && cNext.close < cNext.open && (cNext.close < cCurr.low)) {
        const impulse = (cNext.open - cNext.close) / (cCurr.close - cCurr.open || 1);
        if (impulse > 1.2) {
          orderBlocks.push({
            type: 'BEARISH_OB',
            zoneTop: cCurr.high,
            zoneBottom: Math.min(cCurr.open, cCurr.close),
            candleTime: new Date(cCurr.openTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
            mitigated: currentPrice > cCurr.high
          });
        }
      }
    }

    const recentCandles = candles.slice(-12);
    const priorHigh = Math.max(...candles.slice(-30, -12).map(c => c.high));
    const priorLow = Math.min(...candles.slice(-30, -12).map(c => c.low));

    for (const c of recentCandles) {
      if (c.high > priorHigh && c.close < priorHigh) {
        liquiditySweep = {
          type: 'BEARISH_SWEEP',
          price: c.high,
          description: `กวาดสภาพคล่องฝั่งซื้อ (Buy-side Liquidity Swept at $${c.high.toFixed(2)}) แล้วทิ้งไส้กลับลงมา`
        };
      }
      if (c.low < priorLow && c.close > priorLow) {
        liquiditySweep = {
          type: 'BULLISH_SWEEP',
          price: c.low,
          description: `กวาดสภาพคล่องฝั่งขาย (Sell-side Liquidity Swept at $${c.low.toFixed(2)}) แล้วดีดกลับขึ้นมา`
        };
      }
    }

    const midPriorHigh = Math.max(...candles.slice(-25, -10).map(c => c.high));
    const midPriorLow = Math.min(...candles.slice(-25, -10).map(c => c.low));

    if (currentPrice > midPriorHigh) {
      structureBreak = {
        type: 'BOS_BULLISH',
        label: 'BOS (Break of Structure ขาขึ้น)',
        level: midPriorHigh,
        desc: `ราคาทะลุ High เดิม $${midPriorHigh.toFixed(2)} ยืนยันการดำเนินต่อของเทรนด์ขึ้น`
      };
    } else if (currentPrice < midPriorLow) {
      structureBreak = {
        type: 'BOS_BEARISH',
        label: 'BOS (Break of Structure ขาลง)',
        level: midPriorLow,
        desc: `ราคาหลุด Low เดิม $${midPriorLow.toFixed(2)} ยืนยันโครงสร้างขาลงต่อเนื่อง`
      };
    }

    return {
      orderBlocks: orderBlocks.slice(-3),
      fvgs: fvgs.slice(-3),
      liquiditySweep,
      structureBreak
    };
  }

  static detectDivergence(candles, rsiArr, macdData) {
    const len = candles.length;
    if (len < 20) return null;

    const divergences = [];
    const closes = candles.map(c => c.close);
    const rsi = rsiArr;
    const macdHist = macdData.histogram;

    const p1Price = closes[len - 1];
    const p1RSI = rsi[len - 1];
    const p1MACD = macdHist[len - 1];

    let minLowIdx = len - 15;
    let minLowVal = closes[minLowIdx];
    let maxHighIdx = len - 15;
    let maxHighVal = closes[maxHighIdx];

    for (let i = len - 18; i < len - 4; i++) {
      if (closes[i] < minLowVal) {
        minLowVal = closes[i];
        minLowIdx = i;
      }
      if (closes[i] > maxHighVal) {
        maxHighVal = closes[i];
        maxHighIdx = i;
      }
    }

    if (p1Price <= minLowVal * 1.002 && p1RSI > rsi[minLowIdx] + 2.5 && p1RSI < 50) {
      divergences.push({
        type: 'REGULAR_BULLISH',
        indicator: 'RSI Divergence',
        desc: `ตรวจพบ Regular Bullish Divergence (ราคาทำ Lower Low แต่ RSI ยกฐาน Higher Low ที่ ${p1RSI.toFixed(1)}) ส่งสัญญาณกลับตัวขึ้น`
      });
    }

    if (p1Price >= maxHighVal * 0.998 && p1RSI < rsi[maxHighIdx] - 2.5 && p1RSI > 50) {
      divergences.push({
        type: 'REGULAR_BEARISH',
        indicator: 'RSI Divergence',
        desc: `ตรวจพบ Regular Bearish Divergence (ราคาทำ Higher High แต่ RSI ทำ Lower High ที่ ${p1RSI.toFixed(1)}) เตือนการกลับตัวลง`
      });
    }

    if (p1Price <= minLowVal && p1MACD > macdHist[minLowIdx] && p1MACD < 0) {
      divergences.push({
        type: 'MACD_BULLISH',
        indicator: 'MACD Divergence',
        desc: `ตรวจพบ MACD Bullish Divergence (แรงขายใน Histogram ชะลอตัวลงอย่างเห็นได้ชัด)`
      });
    } else if (p1Price >= maxHighVal && p1MACD < macdHist[maxHighIdx] && p1MACD > 0) {
      divergences.push({
        type: 'MACD_BEARISH',
        indicator: 'MACD Divergence',
        desc: `ตรวจพบ MACD Bearish Divergence (แรงซื้อใน Histogram เริ่มหมดกำลัง)`
      });
    }

    return divergences;
  }

  static calculateDowTheoryAndFibonacci(candles) {
    const len = candles.length;
    if (len < 25) return null;

    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const currentPrice = candles[len - 1].close;

    const lookback = Math.min(50, len);
    const lookbackCandles = candles.slice(-lookback);

    let swingHigh = Math.max(...lookbackCandles.map(c => c.high));
    let swingLow = Math.min(...lookbackCandles.map(c => c.low));
    let swingHighIdx = lookbackCandles.findIndex(c => c.high === swingHigh);
    let swingLowIdx = lookbackCandles.findIndex(c => c.low === swingLow);

    const isUptrendLeg = swingLowIdx < swingHighIdx;
    const diff = swingHigh - swingLow;

    let fib = {};
    if (isUptrendLeg) {
      fib = {
        fib0: swingHigh,
        fib236: swingHigh - 0.236 * diff,
        fib382: swingHigh - 0.382 * diff,
        fib500: swingHigh - 0.500 * diff,
        fib618: swingHigh - 0.618 * diff,
        fib786: swingHigh - 0.786 * diff,
        fib100: swingLow
      };
    } else {
      fib = {
        fib0: swingLow,
        fib236: swingLow + 0.236 * diff,
        fib382: swingLow + 0.382 * diff,
        fib500: swingLow + 0.500 * diff,
        fib618: swingLow + 0.618 * diff,
        fib786: swingLow + 0.786 * diff,
        fib100: swingHigh
      };
    }

    const goldenTop = Math.max(fib.fib500, fib.fib618);
    const goldenBottom = Math.min(fib.fib500, fib.fib618);
    const inGoldenPocket = currentPrice >= goldenBottom && currentPrice <= goldenTop;

    return {
      isUptrendLeg,
      swingHigh,
      swingLow,
      fib,
      inGoldenPocket,
      goldenTop,
      goldenBottom,
      dowStructure: isUptrendLeg ? 'Higher Highs & Higher Lows (ขาขึ้นตาม Dow Theory)' : 'Lower Highs & Lower Lows (ขาลงตาม Dow Theory)'
    };
  }
}

// Master Analysis Engine
class MasterMarketAnalyzer {
  static analyze(candles, assetKey = 'XAUUSD', is1mScalp = false) {
    const asset = ASSETS[assetKey] || ASSETS['XAUUSD'];
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const currentPrice = closes[closes.length - 1];

    // Read user custom indicator settings
    const ind = state.indicators;
    const emaFastPeriod = is1mScalp ? Math.min(9, ind.emaFastPeriod) : ind.emaFastPeriod;
    const emaSlowPeriod = is1mScalp ? Math.min(21, ind.emaSlowPeriod) : ind.emaSlowPeriod;
    const emaTrendPeriod = is1mScalp ? Math.min(50, ind.emaTrendPeriod) : ind.emaTrendPeriod;
    const rsiPeriod = is1mScalp ? Math.min(9, ind.rsiPeriod) : ind.rsiPeriod;

    // Calculate Indicators with user-defined parameters
    const emaFastArr = TechnicalEngine.EMA(closes, emaFastPeriod);
    const emaSlowArr = TechnicalEngine.EMA(closes, emaSlowPeriod);
    const emaTrendArr = TechnicalEngine.EMA(closes, emaTrendPeriod);
    const rsiArr = TechnicalEngine.RSI(closes, rsiPeriod);
    const atrPeriod = is1mScalp ? 10 : 14;
    const atrArr = TechnicalEngine.ATR(highs, lows, closes, atrPeriod);
    const macdData = TechnicalEngine.MACD(closes, 12, 26, 9);
    const bb = TechnicalEngine.BollingerBands(closes, ind.bbPeriod, ind.bbDev);

    const emaFast = emaFastArr[emaFastArr.length - 1] || currentPrice;
    const emaSlow = emaSlowArr[emaSlowArr.length - 1] || currentPrice;
    const emaTrend = emaTrendArr[emaTrendArr.length - 1] || currentPrice;
    const rsi = rsiArr[rsiArr.length - 1] || 50;
    
    // Scale ATR for 1M scalping (tighter stops)
    const baseMinAtr = is1mScalp ? asset.minAtr1m : asset.minAtr;
    const atr = Math.max(baseMinAtr, atrArr[atrArr.length - 1] || baseMinAtr);
    const macdHist = macdData.histogram[macdData.histogram.length - 1] || 0;
    const macdLine = macdData.macdLine[macdData.macdLine.length - 1] || 0;
    const signalLine = macdData.signalLine[macdData.signalLine.length - 1] || 0;

    // Advanced Strategy Components
    const smc = AdvancedStrategyEngine.scanSMC(candles);
    const divergences = AdvancedStrategyEngine.detectDivergence(candles, rsiArr, macdData) || [];
    const fibData = AdvancedStrategyEngine.calculateDowTheoryAndFibonacci(candles);

    // Scoring Engine
    let bullScore = 0;
    let bearScore = 0;
    const reasons = [];
    const entryReasons = [];

    // 1. Moving Averages Stack
    if (currentPrice > emaFast && emaFast > emaSlow) {
      bullScore += 25;
      reasons.push(`ราคาเคลื่อนไหวอยู่เหนือเส้น EMA ${emaFastPeriod} และ EMA ${emaSlowPeriod} แสดงถึงโมเมนตัมขาขึ้นระยะสั้นที่แข็งแกร่ง`);
    } else if (currentPrice < emaFast && emaFast < emaSlow) {
      bearScore += 25;
      reasons.push(`ราคาเคลื่อนไหวอยู่ใต้เส้น EMA ${emaFastPeriod} และ EMA ${emaSlowPeriod} สะท้อนแรงขายกดดันระยะสั้น`);
    }

    if (emaSlow > emaTrend) {
      bullScore += 15;
      reasons.push(`โครงสร้างแนวโน้มเป็นบวก (EMA ${emaSlowPeriod} > EMA ${emaTrendPeriod}) สนับสนุนการเข้าเทรดฝั่ง BUY`);
    } else if (emaSlow < emaTrend) {
      bearScore += 15;
      reasons.push(`โครงสร้างแนวโน้มเป็นลบ (EMA ${emaSlowPeriod} < EMA ${emaTrendPeriod}) ยืนยันฝั่ง SELL ได้เปรียบ`);
    }

    // 2. RSI Momentum
    const rsiBullMin = is1mScalp ? 50 : 52;
    const rsiBearMax = is1mScalp ? 50 : 48;
    if (rsi > rsiBullMin && rsi < 75) bullScore += 20;
    else if (rsi < rsiBearMax && rsi > 25) bearScore += 20;

    // 3. MACD
    if (macdHist > 0 && macdLine > signalLine) bullScore += 15;
    else if (macdHist < 0 && macdLine < signalLine) bearScore += 15;

    // 4. SMC Confluence
    if (smc) {
      if (smc.liquiditySweep?.type === 'BULLISH_SWEEP') {
        bullScore += 20;
        reasons.push(`SMC: ${smc.liquiditySweep.description}`);
      } else if (smc.liquiditySweep?.type === 'BEARISH_SWEEP') {
        bearScore += 20;
        reasons.push(`SMC: ${smc.liquiditySweep.description}`);
      }

      if (smc.structureBreak?.type === 'BOS_BULLISH') {
        bullScore += 15;
        reasons.push(`SMC: ${smc.structureBreak.desc}`);
      } else if (smc.structureBreak?.type === 'BOS_BEARISH') {
        bearScore += 15;
        reasons.push(`SMC: ${smc.structureBreak.desc}`);
      }
    }

    // 5. Divergence Confluence
    if (divergences.length > 0) {
      for (const d of divergences) {
        if (d.type.includes('BULLISH')) {
          bullScore += 25;
          reasons.push(d.desc);
        } else if (d.type.includes('BEARISH')) {
          bearScore += 25;
          reasons.push(d.desc);
        }
      }
    }

    // 6. Fibonacci Golden Pocket Confluence
    if (fibData?.inGoldenPocket) {
      if (fibData.isUptrendLeg) {
        bullScore += 20;
        reasons.push(`Fibonacci: ราคาย่อตัวแตะ Golden Pocket (50% - 61.8%) โซน Reversal คุณภาพสูง`);
      } else {
        bearScore += 20;
        reasons.push(`Fibonacci: ราคารีบาวด์ชน Golden Pocket (50% - 61.8%) พร้อมติดแรงต้าน`);
      }
    }

    // Trend & Signal Decision
    let trend = 'SIDEWAY';
    let signal = 'WAIT';
    let confidence = 50;

    if (bullScore >= 50 && bullScore > bearScore) {
      trend = 'UPTREND';
      signal = 'BUY';
      confidence = Math.min(95, Math.max(68, 50 + (bullScore * 0.4)));
    } else if (bearScore >= 50 && bearScore > bullScore) {
      trend = 'DOWNTREND';
      signal = 'SELL';
      confidence = Math.min(95, Math.max(68, 50 + (bearScore * 0.4)));
    } else {
      trend = 'SIDEWAY';
      signal = Math.abs(bullScore - bearScore) > 18 ? (bullScore > bearScore ? 'BUY' : 'SELL') : 'WAIT';
      confidence = Math.min(65, 45 + Math.abs(bullScore - bearScore));
    }

    // Stop Loss & Take Profit Modeling
    // In 1M Scalping: Tight sniper stops (~1.5x ATR of 1m)
    const riskMultiplier = is1mScalp ? 1.3 : 1.5;
    let riskDist = atr * riskMultiplier;

    if (assetKey === 'XAUUSD') {
      if (is1mScalp) {
        // Gold 1M Scalp: Risk typically $1.80 - $3.20 (18 - 32 pips)
        riskDist = Math.max(1.80, Math.min(3.50, riskDist));
      } else {
        // Standard Gold: Risk typically $5.00 - $12.00
        riskDist = Math.max(5.00, riskDist);
      }
    }

    let entryPrice = currentPrice;
    let sl = 0;
    let tp1 = 0;
    let tp2 = 0;
    let tp3 = 0;

    if (signal === 'BUY') {
      if (is1mScalp) {
        // Fast 1M pullback entry: near EMA fast/slow
        entryPrice = Number(currentPrice.toFixed(asset.decimals));
      } else if (fibData?.inGoldenPocket) {
        entryPrice = Number(currentPrice.toFixed(asset.decimals));
      } else {
        const pull = (currentPrice + emaFast) / 2;
        entryPrice = Number(pull.toFixed(asset.decimals));
      }

      const recentMin = Math.min(...candles.slice(is1mScalp ? -6 : -10).map(c => c.low));
      sl = Number((Math.min(recentMin - (atr * 0.3), entryPrice - riskDist)).toFixed(asset.decimals));
      riskDist = entryPrice - sl;
      if (riskDist <= 0) riskDist = is1mScalp ? baseMinAtr * 1.5 : baseMinAtr * 2.0;

      tp1 = Number((entryPrice + riskDist * 1.5).toFixed(asset.decimals));
      tp2 = Number((entryPrice + riskDist * 2.5).toFixed(asset.decimals));
      tp3 = Number((entryPrice + riskDist * 4.0).toFixed(asset.decimals));

      if (is1mScalp) {
        entryReasons.push(`⚡ [1M สไนเปอร์ Scalping]: ตรวจพบสัญญาณเข้าเทรดสั้น 1 นาที บนแนวโน้มขาขึ้น`);
        entryReasons.push(`1. จุดเข้าซื้อ ($${entryPrice.toFixed(asset.decimals)}): ราคาทำ Micro-Pullback ทดสอบ EMA ${emaFastPeriod} แล้วเกิดแรงดีดกลับทันที`);
        entryReasons.push(`2. Stop Loss คมและแคบ ($${sl.toFixed(asset.decimals)}): ระยะเสี่ยงเพียง ${riskDist.toFixed(asset.decimals)} ${asset.unit} (-${(riskDist * asset.pipMultiplier).toFixed(0)} pips) เหมาะกับสไตล์ Scalper`);
        entryReasons.push(`3. เป้าหมายกำไรสั้นและคม: TP1 ($${tp1.toFixed(asset.decimals)}) เน้นปิดเก็บรอบไว และ TP2/TP3 ตามโมเมนตัม`);
      } else {
        entryReasons.push(`1. โครงสร้างตลาด: เทรนด์ขาขึ้น ${fibData ? fibData.dowStructure : ''} ยืนยันด้วย EMA Alignment`);
        entryReasons.push(`2. จุดเข้าซื้อ ($${entryPrice.toFixed(asset.decimals)}): ได้เปรียบต้นทุนจากการย่อตัวพักฐานทดสอบแนวรับสำคัญ`);
        if (fibData?.inGoldenPocket) {
          entryReasons.push(`3. Fibonacci Golden Pocket: อยู่ในโซนกลับตัว 50% - 61.8% มีโอกาสเด้งตัวทำ New High สูง`);
        }
        if (smc?.orderBlocks?.length) {
          entryReasons.push(`4. Smart Money (SMC): มี Bullish Order Block หนุนราคาฝั่งซื้อ คุ้มครองการเปิดออเดอร์`);
        }
        if (divergences.length) {
          entryReasons.push(`5. Divergence: ${divergences[0].desc}`);
        }
        entryReasons.push(`6. การบริหารความเสี่ยง: SL ($${sl.toFixed(asset.decimals)}) วางใต้ Swing Low ชัดเจน คุม R:R คุ้มค่าสูงสุด 1:4`);
      }

    } else if (signal === 'SELL') {
      if (is1mScalp) {
        entryPrice = Number(currentPrice.toFixed(asset.decimals));
      } else if (fibData?.inGoldenPocket) {
        entryPrice = Number(currentPrice.toFixed(asset.decimals));
      } else {
        const pull = (currentPrice + emaFast) / 2;
        entryPrice = Number(pull.toFixed(asset.decimals));
      }

      const recentMax = Math.max(...candles.slice(is1mScalp ? -6 : -10).map(c => c.high));
      sl = Number((Math.max(recentMax + (atr * 0.3), entryPrice + riskDist)).toFixed(asset.decimals));
      riskDist = sl - entryPrice;
      if (riskDist <= 0) riskDist = is1mScalp ? baseMinAtr * 1.5 : baseMinAtr * 2.0;

      tp1 = Number((entryPrice - riskDist * 1.5).toFixed(asset.decimals));
      tp2 = Number((entryPrice - riskDist * 2.5).toFixed(asset.decimals));
      tp3 = Number((entryPrice - riskDist * 4.0).toFixed(asset.decimals));

      if (is1mScalp) {
        entryReasons.push(`⚡ [1M สไนเปอร์ Scalping]: ตรวจพบสัญญาณเปิด Short สั้น 1 นาที บนแนวโน้มขาลง`);
        entryReasons.push(`1. จุดเข้าเปิดเซลล์ ($${entryPrice.toFixed(asset.decimals)}): ราคารีบาวด์ขึ้นทดสอบ EMA ${emaFastPeriod} แล้วทิ้งไส้บนสะท้อนแรงกดขาย`);
        entryReasons.push(`2. Stop Loss สไนเปอร์ ($${sl.toFixed(asset.decimals)}): คุมความเสี่ยงแคบเพียง ${riskDist.toFixed(asset.decimals)} ${asset.unit} ปลอดภัยจากสไปค์สั้น`);
        entryReasons.push(`3. เป้าหมายกำไร: TP1 ($${tp1.toFixed(asset.decimals)}) มุ่งเก็บรอบไวตามโมเมนตัมแท่งเทียน 1M`);
      } else {
        entryReasons.push(`1. โครงสร้างตลาด: เทรนด์ขาลงต่อเนื่อง เกิดแท่งเทียน Lower High และหลุดแนวรับ`);
        entryReasons.push(`2. จุดเข้าขาย ($${entryPrice.toFixed(asset.decimals)}): ดักจังหวะรีบาวด์ทดสอบแนวต้าน ไม่ไล่ราคาที่ Low`);
        if (fibData?.inGoldenPocket) {
          entryReasons.push(`3. Fibonacci Confluence: ชนระดับ Fibonacci 50%-61.8% แล้วเกิดแรงปฏิเสธราคา`);
        }
        if (smc?.orderBlocks?.length) {
          entryReasons.push(`4. Smart Money (SMC): ชนแนวต้าน Bearish Order Block สถาบันดักเทขาย`);
        }
        if (divergences.length) {
          entryReasons.push(`5. Divergence: ${divergences[0].desc}`);
        }
        entryReasons.push(`6. การบริหารความเสี่ยง: SL ($${sl.toFixed(asset.decimals)}) วางเหนือสวิงไฮ ป้องกันสไปค์ราคา`);
      }

    } else {
      entryPrice = Number(currentPrice.toFixed(asset.decimals));
      sl = Number((entryPrice - riskDist).toFixed(asset.decimals));
      tp1 = Number((entryPrice + riskDist * 1.5).toFixed(asset.decimals));
      tp2 = Number((entryPrice + riskDist * 2.5).toFixed(asset.decimals));
      tp3 = Number((entryPrice + riskDist * 4.0).toFixed(asset.decimals));

      entryReasons.push(`1. สภาวะตลาดกำลังพักตัวในกรอบ Sideway แคบ ${is1mScalp ? 'ในระดับ 1 นาที' : ''} ไม่ควรเปิด Position เสี่ยง`);
      entryReasons.push(`2. แนะนำ WAIT & SEE เพื่อรอการเบรกเอาต์กรอบหรือเกิดการกวาดสภาพคล่อง Liquidity Sweep ที่ชัดเจนก่อน`);
    }

    const rr1 = (Math.abs(tp1 - entryPrice) / riskDist).toFixed(2);
    const rr2 = (Math.abs(tp2 - entryPrice) / riskDist).toFixed(2);
    const rr3 = (Math.abs(tp3 - entryPrice) / riskDist).toFixed(2);
    const avgRR = `1 : ${((parseFloat(rr1) + parseFloat(rr2) + parseFloat(rr3)) / 3).toFixed(2)}`;
    const pipsRisk = (riskDist * asset.pipMultiplier).toFixed(0);

    return {
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      assetKey,
      assetName: asset.name,
      timeframe: state.timeframe,
      is1mScalp,
      currentPrice,
      trend,
      trendTh: trend === 'UPTREND' ? (is1mScalp ? 'ขาขึ้นเร็ว (1M BUY Scalp)' : 'ขาขึ้น (BUY / Bullish)') : trend === 'DOWNTREND' ? (is1mScalp ? 'ขาลงเร็ว (1M SELL Scalp)' : 'ขาลง (SELL / Bearish)') : 'ไซด์เวย์ (SIDEWAY / รอจังหวะ)',
      signal,
      signalTh: signal === 'BUY' ? (is1mScalp ? 'BUY (สไนเปอร์ 1 นาที)' : 'BUY (เข้าซื้อ)') : signal === 'SELL' ? (is1mScalp ? 'SELL (สไนเปอร์ 1 นาที)' : 'SELL (เปิดชอร์ต)') : 'WAIT (รอจังหวะ)',
      entryPrice,
      sl,
      tp1,
      tp2,
      tp3,
      riskDistance: riskDist.toFixed(asset.decimals),
      riskPips: pipsRisk,
      rr1: `1 : ${rr1}`,
      rr2: `1 : ${rr2}`,
      rr3: `1 : ${rr3}`,
      rrRatio: avgRR,
      confidence: Math.round(confidence),
      indicators: {
        rsi: rsi.toFixed(1),
        ema20: emaFast.toFixed(asset.decimals),
        ema50: emaSlow.toFixed(asset.decimals),
        ema200: emaTrend.toFixed(asset.decimals),
        atr: atr.toFixed(asset.decimals),
        macdHist: macdHist.toFixed(asset.decimals)
      },
      smc,
      divergences,
      fibData,
      marketReasons: reasons,
      entryReasons
    };
  }
}

// Market Data Fetching Service
class MarketDataService {
  static async fetchKlines(assetKey = 'XAUUSD', timeframe = '1h', limit = 100) {
    const asset = ASSETS[assetKey] || ASSETS['XAUUSD'];
    const url = `https://api.binance.com/api/v3/klines?symbol=${asset.binanceSymbol}&interval=${timeframe}&limit=${limit}`;

    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const raw = await response.json();
      return raw.map(item => ({
        openTime: item[0],
        open: parseFloat(item[1]),
        high: parseFloat(item[2]),
        low: parseFloat(item[3]),
        close: parseFloat(item[4]),
        volume: parseFloat(item[5])
      }));
    } catch (err) {
      console.warn("Binance API offline or blocked, generating realistic simulated data:", err);
      return this.generateSimulatedData(assetKey, timeframe, limit);
    }
  }

  static async fetchTicker(assetKey = 'XAUUSD') {
    const asset = ASSETS[assetKey] || ASSETS['XAUUSD'];
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${asset.binanceSymbol}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Ticker error");
      const d = await response.json();
      return {
        price: parseFloat(d.lastPrice),
        change: parseFloat(d.priceChangePercent),
        high: parseFloat(d.highPrice),
        low: parseFloat(d.lowPrice),
        volume: parseFloat(d.volume)
      };
    } catch (err) {
      const def = state.livePrice || (assetKey === 'XAUUSD' ? 2650 : assetKey === 'BTCUSD' ? 68000 : 1.0850);
      return {
        price: def,
        change: state.priceChange24h,
        high: state.high24h || def * 1.01,
        low: state.low24h || def * 0.99,
        volume: state.volume24h
      };
    }
  }

  static generateSimulatedData(assetKey, timeframe = '1h', count = 100) {
    const asset = ASSETS[assetKey];
    let base = assetKey === 'XAUUSD' ? 2650 : assetKey === 'BTCUSD' ? 67500 : assetKey === 'EURUSD' ? 1.0820 : 1.2950;
    const candles = [];
    const now = Date.now();
    const intervalMs = timeframe === '1m' ? 60000 : timeframe === '5m' ? 300000 : 3600000;
    const baseAtr = timeframe === '1m' ? asset.minAtr1m : asset.minAtr;

    for (let i = 0; i < count; i++) {
      const time = now - (count - i) * intervalMs;
      const volStep = baseAtr * 0.8;
      const change = (Math.random() - 0.48) * volStep;
      const open = base;
      base = open + change;
      const high = Math.max(open, base) + Math.random() * (volStep * 0.4);
      const low = Math.min(open, base) - Math.random() * (volStep * 0.4);

      candles.push({
        openTime: time,
        open: Number(open.toFixed(asset.decimals)),
        high: Number(high.toFixed(asset.decimals)),
        low: Number(low.toFixed(asset.decimals)),
        close: Number(base.toFixed(asset.decimals)),
        volume: 300 + Math.random() * 800
      });
    }
    return candles;
  }
}

// Economic News Calendar Service
class EconomicNewsService {
  static getSchedule() {
    return [
      {
        id: 1,
        time: '19:30',
        date: 'วันนี้',
        currency: 'USD',
        event: 'US Core CPI (ดัชนีราคาผู้บริโภคพื้นฐาน)',
        impact: 'HIGH',
        forecast: '0.3%',
        previous: '0.3%',
        warning: 'ส่งผลรุนแรงมากต่อราคาทองคำ XAU/USD อาจผันผวน 20-40 USD ทันทีที่ตัวเลขออก'
      },
      {
        id: 2,
        time: '19:30',
        date: 'วันศุกร์นี้',
        currency: 'USD',
        event: 'Non-Farm Payrolls (NFP การจ้างงานนอกภาคเกษตร)',
        impact: 'HIGH',
        forecast: '145K',
        previous: '142K',
        warning: 'ข่าวกล่องแดงสำคัญที่สุดประจำเดือน กราฟทองมักกระชากแรงทั้งสองฝั่ง'
      },
      {
        id: 3,
        time: '01:00',
        date: 'วันพฤหัสบดี',
        currency: 'USD',
        event: 'FOMC Statement & Fed Interest Rate Decision (ดอกเบี้ย Fed)',
        impact: 'HIGH',
        forecast: '4.75%',
        previous: '5.00%',
        warning: 'แถลงการณ์ประธานเฟด (Powell) มีอิทธิพลต่อดัชนีดอลลาร์และทองคำโดยตรง'
      },
      {
        id: 4,
        time: '19:30',
        date: 'วันพฤหัสบดี',
        currency: 'USD',
        event: 'Initial Jobless Claims (จำนวนผู้ขอรับสวัสดิการว่างงาน)',
        impact: 'MEDIUM',
        forecast: '221K',
        previous: '219K',
        warning: 'กระทบความผันผวนระยะสั้นในกรอบ 5-10 USD'
      },
      {
        id: 5,
        time: '21:00',
        date: 'วันพรุ่งนี้',
        currency: 'USD',
        event: 'ISM Manufacturing PMI (ดัชนีภาคการผลิต)',
        impact: 'HIGH',
        forecast: '47.6',
        previous: '47.2',
        warning: 'สะท้อนภาวะเศรษฐกิจถดถอย ส่งผลต่อความต้องการทองคำในฐานะ Safe Haven'
      }
    ];
  }

  static renderNewsTable() {
    const tbody = document.getElementById('newsTableBody');
    if (!tbody) return;

    const list = this.getSchedule();
    tbody.innerHTML = list.map(item => `
      <tr class="border-b border-gray-800/80 hover:bg-gray-800/30 transition-colors text-xs">
        <td class="py-3 px-3">
          <span class="font-mono text-amber-300 font-bold">${item.time}</span>
          <div class="text-[10px] text-gray-500">${item.date}</div>
        </td>
        <td class="py-3 px-3">
          <span class="px-2 py-0.5 rounded font-bold text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30">
            ${item.currency}
          </span>
        </td>
        <td class="py-3 px-3 font-medium text-gray-200">
          <div class="flex items-center gap-2">
            <span>${item.event}</span>
          </div>
          <div class="text-[11px] text-gray-400 mt-0.5">${item.warning}</div>
        </td>
        <td class="py-3 px-3">
          <span class="px-2 py-0.5 rounded font-bold text-[10px] ${
            item.impact === 'HIGH' ? 'impact-high' : 'impact-medium'
          }">
            <i class="fas fa-circle text-[8px] mr-1"></i> ${item.impact === 'HIGH' ? 'กล่องแดง (รุนแรง)' : 'กล่องส้ม (ปานกลาง)'}
          </span>
        </td>
        <td class="py-3 px-3 font-mono text-gray-300">${item.forecast}</td>
        <td class="py-3 px-3 font-mono text-gray-400">${item.previous}</td>
      </tr>
    `).join('');
  }
}

// Notification & Voice Engine
class NotificationService {
  static speakThai(text) {
    if (!state.voiceSpeechEnabled || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'th-TH';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const thaiVoice = voices.find(v => v.lang.includes('th') || v.lang.includes('TH'));
      if (thaiVoice) utterance.voice = thaiVoice;

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech error:", e);
    }
  }

  static async sendTelegram(message) {
    const { enabled, botToken, chatId } = state.telegramSettings;
    if (!enabled || !botToken || !chatId) return false;

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        })
      });
      const data = await res.json();
      return data.ok;
    } catch (err) {
      console.error("Telegram send error:", err);
      return false;
    }
  }
}

// Trade Journal & Win Rate Engine
class TradeJournalService {
  static load() {
    try {
      const saved = localStorage.getItem('goldvision_trade_journal');
      if (saved) state.journal = JSON.parse(saved);
    } catch(e) {}
    this.render();
  }

  static save() {
    try {
      localStorage.setItem('goldvision_trade_journal', JSON.stringify(state.journal));
    } catch(e) {}
    this.render();
  }

  static addTradeFromSignal() {
    if (!state.analysis) return;
    const a = state.analysis;
    const newTrade = {
      id: Date.now(),
      date: new Date().toLocaleDateString('th-TH') + ' ' + a.timestamp,
      asset: state.currentAssetKey,
      tf: state.timeframe,
      signal: a.signal,
      entry: a.entryPrice,
      sl: a.sl,
      tp1: a.tp1,
      rr: a.rrRatio,
      status: 'OPEN',
      pnl: 0,
      notes: a.is1mScalp ? '1M Sniper Scalp' : 'Swing Confluence'
    };
    state.journal.unshift(newTrade);
    this.save();
    UIController.showToast("บันทึกการเทรดลง Trade Journal เรียบร้อย!");
  }

  static deleteTrade(id) {
    state.journal = state.journal.filter(t => t.id !== id);
    this.save();
  }

  static render() {
    const list = document.getElementById('journalTableBody');
    if (!list) return;

    const total = state.journal.length;
    const wins = state.journal.filter(t => t.status === 'WIN').length;
    const losses = state.journal.filter(t => t.status === 'LOSS').length;
    const closed = wins + losses;
    const winRate = closed > 0 ? ((wins / closed) * 100).toFixed(1) : 0;
    const netPnl = state.journal.reduce((acc, t) => acc + (t.pnl || 0), 0);

    document.getElementById('metricWinRate').innerText = `${winRate}%`;
    document.getElementById('metricTotalTrades').innerText = `${total} ไม้`;
    document.getElementById('metricWinsLosses').innerText = `ชนะ ${wins} | แพ้ ${losses}`;
    const pnlElem = document.getElementById('metricNetProfit');
    if (pnlElem) {
      pnlElem.innerText = `${netPnl >= 0 ? '+' : ''}$${netPnl.toFixed(2)}`;
      pnlElem.className = `text-lg font-bold font-mono ${netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
    }

    if (total === 0) {
      list.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-xs text-gray-500">ยังไม่มีรายการบันทึกการเทรด กดปุ่ม "+ บันทึกไม้ปัจจุบันจากสัญญาณ" ได้เลย</td></tr>`;
      return;
    }

    list.innerHTML = state.journal.map(t => `
      <tr class="border-b border-gray-800 text-xs hover:bg-gray-800/20">
        <td class="py-2.5 px-3 font-mono text-gray-400">
          <div>${t.date}</div>
          <div class="text-[10px] text-gray-500">TF: ${t.tf || '1H'}</div>
        </td>
        <td class="py-2.5 px-3 font-bold text-amber-400">${t.asset}</td>
        <td class="py-2.5 px-3">
          <span class="px-2 py-0.5 rounded font-bold text-[10px] ${
            t.signal === 'BUY' ? 'badge-buy' : t.signal === 'SELL' ? 'badge-sell' : 'badge-wait'
          }">${t.signal}</span>
        </td>
        <td class="py-2.5 px-3 font-mono text-gray-200">
          <div>เข้า: $${t.entry.toFixed(2)}</div>
          <div class="text-[10px] text-gray-500">SL: $${t.sl.toFixed(2)} | TP: $${t.tp1.toFixed(2)}</div>
        </td>
        <td class="py-2.5 px-3">
          <select onchange="TradeJournalService.handleStatusChange(${t.id}, this.value)" class="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white">
            <option value="OPEN" ${t.status === 'OPEN' ? 'selected' : ''}>⏳ กำลังวิ่ง (OPEN)</option>
            <option value="WIN" ${t.status === 'WIN' ? 'selected' : ''}>🎯 ชนะ (WIN TP)</option>
            <option value="LOSS" ${t.status === 'LOSS' ? 'selected' : ''}>🛑 แพ้ (SL)</option>
            <option value="BE" ${t.status === 'BE' ? 'selected' : ''}>🛡️ กันทุน (BE)</option>
          </select>
        </td>
        <td class="py-2.5 px-3 font-mono font-bold ${
          t.pnl > 0 ? 'text-emerald-400' : t.pnl < 0 ? 'text-rose-400' : 'text-gray-400'
        }">
          <input type="number" step="1" value="${t.pnl || 0}" onchange="TradeJournalService.handlePnlChange(${t.id}, this.value)" class="w-20 bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 text-xs text-right font-mono text-white"> $
        </td>
        <td class="py-2.5 px-3 text-center">
          <button onclick="TradeJournalService.deleteTrade(${t.id})" class="text-gray-500 hover:text-rose-400 transition-colors" title="ลบรายการ">
            <i class="fas fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }

  static handleStatusChange(id, val) {
    const trade = state.journal.find(t => t.id === id);
    if (!trade) return;
    trade.status = val;
    this.save();
  }

  static handlePnlChange(id, val) {
    const trade = state.journal.find(t => t.id === id);
    if (!trade) return;
    trade.pnl = parseFloat(val) || 0;
    this.save();
  }
}

// UI Master Controller
class UIController {
  static init() {
    this.bindEvents();
    this.loadSettings();
    this.syncIndicatorInputsUI();
    EconomicNewsService.renderNewsTable();
    TradeJournalService.load();
    this.initTradingViewWidget();
    this.refreshAllData();
    this.startAutoRefresh();
  }

  static bindEvents() {
    // Asset Switcher
    document.querySelectorAll('.asset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.asset-btn').forEach(b => b.classList.remove('active', 'bg-amber-500/20', 'text-amber-400', 'border-amber-500/50'));
        btn.classList.add('active', 'bg-amber-500/20', 'text-amber-400', 'border-amber-500/50');
        const asset = btn.getAttribute('data-asset');
        state.currentAssetKey = asset;
        this.updateTradingViewWidget();
        this.refreshAllData(true);
      });
    });

    // Timeframe Buttons (includes 1m scalping)
    document.querySelectorAll('.tf-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active', 'bg-amber-500/20', 'text-amber-400', 'border-amber-500/50', 'bg-purple-600/30', 'text-purple-300', 'border-purple-500/50'));
        const tf = btn.getAttribute('data-tf');
        state.timeframe = tf;

        if (tf === '1m') {
          btn.classList.add('active', 'bg-purple-600/30', 'text-purple-300', 'border-purple-500/50');
          document.getElementById('scalp1mBadge')?.classList.remove('hidden');
        } else {
          btn.classList.add('active', 'bg-amber-500/20', 'text-amber-400', 'border-amber-500/50');
          document.getElementById('scalp1mBadge')?.classList.add('hidden');
        }

        // Re-initialize Auto Refresh (1m uses faster 5s refresh)
        this.startAutoRefresh();
        this.updateTradingViewWidget();
        this.refreshAllData(true);
      });
    });

    // Strategy Sub-tabs
    document.querySelectorAll('.sub-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active', 'border-amber-500', 'text-amber-400'));
        btn.classList.add('active', 'border-amber-500', 'text-amber-400');
        const tab = btn.getAttribute('data-tab');
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
        document.getElementById(`tab-${tab}`)?.classList.remove('hidden');
      });
    });

    // Chart Indicator Preset Buttons
    document.getElementById('btnPresetScalp1M')?.addEventListener('click', () => {
      state.indicators.emaFastEnabled = true;
      state.indicators.emaFastPeriod = 9;
      state.indicators.emaSlowEnabled = true;
      state.indicators.emaSlowPeriod = 21;
      state.indicators.emaTrendEnabled = true;
      state.indicators.emaTrendPeriod = 50;
      state.indicators.rsiEnabled = true;
      state.indicators.rsiPeriod = 9;
      state.indicators.macdEnabled = true;
      state.indicators.bbEnabled = false;
      state.indicators.volumeEnabled = true;
      this.syncIndicatorInputsUI();
      this.applyIndicators();
      this.showToast("ปรับเป็น Preset สไนเปอร์ 1M (EMA 9/21/50 + RSI 9) แล้ว!");
    });

    document.getElementById('btnPresetDayTrade')?.addEventListener('click', () => {
      state.indicators.emaFastEnabled = true;
      state.indicators.emaFastPeriod = 20;
      state.indicators.emaSlowEnabled = true;
      state.indicators.emaSlowPeriod = 50;
      state.indicators.emaTrendEnabled = true;
      state.indicators.emaTrendPeriod = 200;
      state.indicators.rsiEnabled = true;
      state.indicators.rsiPeriod = 14;
      state.indicators.macdEnabled = true;
      state.indicators.bbEnabled = false;
      state.indicators.volumeEnabled = true;
      this.syncIndicatorInputsUI();
      this.applyIndicators();
      this.showToast("ปรับเป็น Preset Day Trade (EMA 20/50/200 + RSI 14 + MACD) แล้ว!");
    });

    document.getElementById('btnPresetSMC')?.addEventListener('click', () => {
      state.indicators.emaFastEnabled = true;
      state.indicators.emaFastPeriod = 50;
      state.indicators.emaSlowEnabled = true;
      state.indicators.emaSlowPeriod = 200;
      state.indicators.emaTrendEnabled = false;
      state.indicators.rsiEnabled = true;
      state.indicators.rsiPeriod = 14;
      state.indicators.bbEnabled = true;
      state.indicators.bbPeriod = 20;
      state.indicators.bbDev = 2;
      state.indicators.macdEnabled = true;
      state.indicators.volumeEnabled = true;
      this.syncIndicatorInputsUI();
      this.applyIndicators();
      this.showToast("ปรับเป็น Preset SMC / Swing (EMA 50/200 + Bollinger Bands) แล้ว!");
    });

    // Custom Indicator Form Apply Button
    document.getElementById('btnApplyCustomIndicators')?.addEventListener('click', () => {
      this.readIndicatorInputsUI();
      this.applyIndicators();
      this.showToast("อัปเดตอินดิเคเตอร์บนกราฟจริงและคำนวณใหม่แล้ว!");
    });

    // Toggle Indicator Panel visibility
    document.getElementById('btnToggleIndicatorPanel')?.addEventListener('click', () => {
      const panel = document.getElementById('indicatorControlPanel');
      panel?.classList.toggle('hidden');
    });

    // Refresh Button
    document.getElementById('btnRefresh')?.addEventListener('click', () => {
      this.refreshAllData(true);
    });

    // Font Size Switches
    document.querySelectorAll('.font-size-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.font-size-btn').forEach(b => b.classList.remove('bg-gray-700', 'text-white'));
        btn.classList.add('bg-gray-700', 'text-white');
        const size = btn.getAttribute('data-size');
        state.fontSize = size;
        document.documentElement.className = size === 'large' ? 'font-large' : size === 'xlarge' ? 'font-xlarge' : '';
        localStorage.setItem('goldvision_font_size', size);
      });
    });

    // Sound Tone & Voice Toggles
    document.getElementById('btnSoundToggle')?.addEventListener('click', () => {
      state.soundToneEnabled = !state.soundToneEnabled;
      const icon = document.querySelector('#btnSoundToggle i');
      if (icon) {
        icon.className = state.soundToneEnabled ? 'fas fa-bell text-amber-400' : 'fas fa-bell-slash text-gray-500';
      }
      this.showToast(state.soundToneEnabled ? "เปิดเสียงเตือนแล้ว" : "ปิดเสียงเตือนแล้ว");
    });

    document.getElementById('btnVoiceToggle')?.addEventListener('click', () => {
      state.voiceSpeechEnabled = !state.voiceSpeechEnabled;
      const icon = document.querySelector('#btnVoiceToggle i');
      if (icon) {
        icon.className = state.voiceSpeechEnabled ? 'fas fa-bullhorn text-cyan-400' : 'fas fa-comment-slash text-gray-500';
      }
      if (state.voiceSpeechEnabled) {
        NotificationService.speakThai("เปิดระบบเสียงพูด AI ภาษาไทย แจ้งเตือนสัญญาณอัตโนมัติ");
      }
      this.showToast(state.voiceSpeechEnabled ? "เปิดเสียงพูด AI แล้ว" : "ปิดเสียงพูด AI แล้ว");
    });

    document.getElementById('btnTestVoice')?.addEventListener('click', () => {
      NotificationService.speakThai(state.timeframe === '1m' ? 
        "ทดสอบเสียงพูด เอไอ สัญญาณสไนเปอร์ 1 นาที พร้อมเข้าออเดอร์ทำกำไรระยะสั้น" : 
        "ทดสอบเสียงพูด เอไอ ระบบวิเคราะห์การเทรดทองคำและฟอเร็กซ์ พร้อมแจ้งเตือนสัญญาณ บาย และ เซลล์"
      );
    });

    // Copy Signal Buttons
    document.getElementById('btnCopySignal')?.addEventListener('click', () => {
      this.copySignalToClipboard();
    });

    document.getElementById('btnCopyPromptFormat')?.addEventListener('click', () => {
      this.copyPromptFormatToClipboard();
    });

    // Telegram Settings Modal
    document.getElementById('btnOpenTelegramSettings')?.addEventListener('click', () => {
      document.getElementById('modalTelegram')?.classList.remove('hidden');
    });

    document.getElementById('btnCloseTelegramModal')?.addEventListener('click', () => {
      document.getElementById('modalTelegram')?.classList.add('hidden');
    });

    document.getElementById('formTelegramSettings')?.addEventListener('submit', (e) => {
      e.preventDefault();
      state.telegramSettings.enabled = document.getElementById('tgEnabled').checked;
      state.telegramSettings.botToken = document.getElementById('tgBotToken').value.trim();
      state.telegramSettings.chatId = document.getElementById('tgChatId').value.trim();
      localStorage.setItem('goldvision_tg_settings', JSON.stringify(state.telegramSettings));
      document.getElementById('modalTelegram')?.classList.add('hidden');
      this.showToast("บันทึกการตั้งค่า Telegram Bot สำเร็จ");
    });

    document.getElementById('btnTestTelegram')?.addEventListener('click', async () => {
      const token = document.getElementById('tgBotToken').value.trim();
      const chat = document.getElementById('tgChatId').value.trim();
      if (!token || !chat) {
        alert("กรุณากรอก Bot Token และ Chat ID ก่อนทดสอบ");
        return;
      }
      const testMsg = `🔔 <b>[GOLDVISION PRO - ทดสอบการเชื่อมต่อ]</b>\nระบบแจ้งเตือน Telegram Bot ใช้งานได้สมบูรณ์แบบ! ✅\nเวลา: ${new Date().toLocaleTimeString('th-TH')}`;
      const ok = await NotificationService.sendTelegram(testMsg);
      if (ok) {
        alert("ส่งข้อความทดสอบสำเร็จ! ตรวจสอบใน Telegram ของคุณ");
      } else {
        alert("ส่งข้อความล้มเหลว กรุณาตรวจสอบ Bot Token และ Chat ID");
      }
    });

    // Add to Journal
    document.getElementById('btnLogTrade')?.addEventListener('click', () => {
      TradeJournalService.addTradeFromSignal();
    });

    // Lot Size Calculator Inputs
    ['calcBalance', 'calcRiskPercent'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => {
        this.updateLotCalculation();
      });
    });

    // Custom Mode
    document.getElementById('formCustomAnalysis')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.runCustomAnalysis();
    });

    document.getElementById('btnResetCustom')?.addEventListener('click', () => {
      state.customMode = false;
      document.getElementById('customBanner')?.classList.add('hidden');
      this.refreshAllData();
    });
  }

  static syncIndicatorInputsUI() {
    const ind = state.indicators;
    const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };

    setCheck('indEmaFastEnabled', ind.emaFastEnabled);
    setVal('indEmaFastPeriod', ind.emaFastPeriod);
    setCheck('indEmaSlowEnabled', ind.emaSlowEnabled);
    setVal('indEmaSlowPeriod', ind.emaSlowPeriod);
    setCheck('indEmaTrendEnabled', ind.emaTrendEnabled);
    setVal('indEmaTrendPeriod', ind.emaTrendPeriod);
    setCheck('indRsiEnabled', ind.rsiEnabled);
    setVal('indRsiPeriod', ind.rsiPeriod);
    setCheck('indMacdEnabled', ind.macdEnabled);
    setCheck('indBbEnabled', ind.bbEnabled);
    setVal('indBbPeriod', ind.bbPeriod);
    setVal('indBbDev', ind.bbDev);
    setCheck('indVolumeEnabled', ind.volumeEnabled);

    // Update active badges strip
    const badgesContainer = document.getElementById('activeIndicatorsStrip');
    if (badgesContainer) {
      const activeList = [];
      if (ind.emaFastEnabled) activeList.push(`EMA ${ind.emaFastPeriod}`);
      if (ind.emaSlowEnabled) activeList.push(`EMA ${ind.emaSlowPeriod}`);
      if (ind.emaTrendEnabled) activeList.push(`EMA ${ind.emaTrendPeriod}`);
      if (ind.rsiEnabled) activeList.push(`RSI (${ind.rsiPeriod})`);
      if (ind.macdEnabled) activeList.push('MACD');
      if (ind.bbEnabled) activeList.push(`BB (${ind.bbPeriod}, ${ind.bbDev})`);
      if (ind.volumeEnabled) activeList.push('Volume');

      badgesContainer.innerHTML = activeList.map(b => `
        <span class="px-2 py-0.5 rounded-md text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
          ${b}
        </span>
      `).join('');
    }
  }

  static readIndicatorInputsUI() {
    const ind = state.indicators;
    const getCheck = (id) => document.getElementById(id)?.checked || false;
    const getVal = (id, def) => parseInt(document.getElementById(id)?.value, 10) || def;
    const getFloat = (id, def) => parseFloat(document.getElementById(id)?.value) || def;

    ind.emaFastEnabled = getCheck('indEmaFastEnabled');
    ind.emaFastPeriod = getVal('indEmaFastPeriod', 9);
    ind.emaSlowEnabled = getCheck('indEmaSlowEnabled');
    ind.emaSlowPeriod = getVal('indEmaSlowPeriod', 21);
    ind.emaTrendEnabled = getCheck('indEmaTrendEnabled');
    ind.emaTrendPeriod = getVal('indEmaTrendPeriod', 50);
    ind.rsiEnabled = getCheck('indRsiEnabled');
    ind.rsiPeriod = getVal('indRsiPeriod', 14);
    ind.macdEnabled = getCheck('indMacdEnabled');
    ind.bbEnabled = getCheck('indBbEnabled');
    ind.bbPeriod = getVal('indBbPeriod', 20);
    ind.bbDev = getFloat('indBbDev', 2.0);
    ind.volumeEnabled = getCheck('indVolumeEnabled');

    this.syncIndicatorInputsUI();
    try {
      localStorage.setItem('goldvision_custom_indicators', JSON.stringify(ind));
    } catch(e) {}
  }

  static applyIndicators() {
    this.updateTradingViewWidget();
    this.refreshAllData(false);
  }

  static loadSettings() {
    try {
      const savedTg = localStorage.getItem('goldvision_tg_settings');
      if (savedTg) {
        state.telegramSettings = JSON.parse(savedTg);
        const tgCheck = document.getElementById('tgEnabled');
        const tgBot = document.getElementById('tgBotToken');
        const tgChat = document.getElementById('tgChatId');
        if (tgCheck) tgCheck.checked = state.telegramSettings.enabled;
        if (tgBot) tgBot.value = state.telegramSettings.botToken || '';
        if (tgChat) tgChat.value = state.telegramSettings.chatId || '';
      }

      const savedFont = localStorage.getItem('goldvision_font_size');
      if (savedFont) {
        state.fontSize = savedFont;
        document.documentElement.className = savedFont === 'large' ? 'font-large' : savedFont === 'xlarge' ? 'font-xlarge' : '';
        document.querySelectorAll('.font-size-btn').forEach(b => {
          if (b.getAttribute('data-size') === savedFont) b.classList.add('bg-gray-700', 'text-white');
          else b.classList.remove('bg-gray-700', 'text-white');
        });
      }

      const savedInd = localStorage.getItem('goldvision_custom_indicators');
      if (savedInd) {
        state.indicators = Object.assign(state.indicators, JSON.parse(savedInd));
      }
    } catch (e) {}
  }

  static async refreshAllData(playAlert = false) {
    const loading = document.getElementById('loadingIndicator');
    if (loading) loading.classList.remove('hidden');

    try {
      const is1mScalp = state.timeframe === '1m';
      const [ticker, candles] = await Promise.all([
        MarketDataService.fetchTicker(state.currentAssetKey),
        MarketDataService.fetchKlines(state.currentAssetKey, state.timeframe, 120)
      ]);

      state.livePrice = ticker.price;
      state.priceChange24h = ticker.change;
      state.high24h = ticker.high;
      state.low24h = ticker.low;
      state.volume24h = ticker.volume;
      state.candles = candles;

      this.updateTickerUI();

      if (!state.customMode) {
        const analysis = MasterMarketAnalyzer.analyze(candles, state.currentAssetKey, is1mScalp);
        state.analysis = analysis;
        this.renderAnalysis(analysis);

        if (analysis.signal !== 'WAIT' && analysis.signal !== state.lastSignalType) {
          state.lastSignalType = analysis.signal;

          const thaiAsset = ASSETS[state.currentAssetKey].shortName;
          const speechMsg = is1mScalp ?
            `สัญญาณสไนเปอร์ 1 นาที ${analysis.signal} สำหรับ ${thaiAsset} ราคาเข้าที่ ${analysis.entryPrice} จุดตัดขาดทุน ${analysis.sl} เป้าหมายกำไร ${analysis.tp1}` :
            `ตรวจพบสัญญาณ ${analysis.signal} สำหรับ ${thaiAsset} ราคาเข้าที่ ${analysis.entryPrice} จุดตัดขาดทุน ${analysis.sl} เป้าหมายกำไร ${analysis.tp1} ความมั่นใจ ${analysis.confidence} เปอร์เซ็นต์`;
          NotificationService.speakThai(speechMsg);

          if (state.telegramSettings.enabled) {
            const tgMsg = `🚨 <b>[${is1mScalp ? '⚡ 1M SCALP SIGNAL' : 'NEW SIGNAL'}] ${thaiAsset}</b>\n\n🎯 <b>สัญญาณ: ${analysis.signal}</b>\n📍 Entry: $${analysis.entryPrice}\n🛑 SL: $${analysis.sl} (${analysis.riskDistance} / -${analysis.riskPips} pips)\n🎯 TP1: $${analysis.tp1}\n🎯 TP2: $${analysis.tp2}\n🎯 TP3: $${analysis.tp3}\n⚖️ R:R: ${analysis.rrRatio}\n🔥 ความมั่นใจ: ${analysis.confidence}%\n\n💡 <i>เหตุผล: ${analysis.entryReasons[0]}</i>`;
            NotificationService.sendTelegram(tgMsg);
          }
        }
      }

    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      if (loading) loading.classList.add('hidden');
      const timeElem = document.getElementById('lastUpdatedTime');
      if (timeElem) timeElem.innerText = new Date().toLocaleTimeString('th-TH');
    }
  }

  static updateTickerUI() {
    const asset = ASSETS[state.currentAssetKey];
    const priceElem = document.getElementById('liveGoldPrice');
    const changeElem = document.getElementById('priceChange24h');
    const highElem = document.getElementById('high24h');
    const lowElem = document.getElementById('low24h');
    const currentAssetTitle = document.getElementById('currentAssetTitle');

    if (currentAssetTitle) currentAssetTitle.innerText = `${asset.name} (${state.timeframe.toUpperCase()}):`;

    if (priceElem) {
      priceElem.innerText = `$${state.livePrice.toLocaleString('en-US', { minimumFractionDigits: asset.decimals, maximumFractionDigits: asset.decimals })}`;
    }

    if (changeElem) {
      const isPos = state.priceChange24h >= 0;
      changeElem.className = `font-mono text-sm px-2.5 py-0.5 rounded-full flex items-center gap-1 ${isPos ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`;
      changeElem.innerHTML = `<i class="fas fa-caret-${isPos ? 'up' : 'down'}"></i> ${isPos ? '+' : ''}${state.priceChange24h.toFixed(2)}%`;
    }

    if (highElem) highElem.innerText = `$${state.high24h.toFixed(asset.decimals)}`;
    if (lowElem) lowElem.innerText = `$${state.low24h.toFixed(asset.decimals)}`;
  }

  static renderAnalysis(analysis) {
    const asset = ASSETS[state.currentAssetKey];
    const signalCard = document.getElementById('mainSignalCard');
    const signalBadge = document.getElementById('signalBadge');
    const trendBadge = document.getElementById('trendBadge');
    const trendDesc = document.getElementById('trendDescription');

    signalCard?.classList.remove('glow-buy', 'glow-sell', 'glow-gold');

    if (analysis.signal === 'BUY') {
      signalCard?.classList.add('glow-buy');
      if (signalBadge) {
        signalBadge.className = 'px-5 py-2 rounded-full font-bold text-base badge-buy flex items-center gap-2 shadow-lg';
        signalBadge.innerHTML = `<i class="fas fa-arrow-trend-up"></i> ${analysis.is1mScalp ? '⚡ 1M BUY (สไนเปอร์)' : 'BUY (เข้าซื้อ)'}`;
      }
      if (trendBadge) {
        trendBadge.className = 'px-3 py-1 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
        trendBadge.innerHTML = `<i class="fas fa-circle-arrow-up mr-1"></i> ${analysis.is1mScalp ? '1M ขาขึ้นสั้น (Scalp Up)' : 'ขาขึ้น (UPTREND)'}`;
      }
    } else if (analysis.signal === 'SELL') {
      signalCard?.classList.add('glow-sell');
      if (signalBadge) {
        signalBadge.className = 'px-5 py-2 rounded-full font-bold text-base badge-sell flex items-center gap-2 shadow-lg';
        signalBadge.innerHTML = `<i class="fas fa-arrow-trend-down"></i> ${analysis.is1mScalp ? '⚡ 1M SELL (สไนเปอร์)' : 'SELL (เปิดชอร์ต)'}`;
      }
      if (trendBadge) {
        trendBadge.className = 'px-3 py-1 rounded-md text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30';
        trendBadge.innerHTML = `<i class="fas fa-circle-arrow-down mr-1"></i> ${analysis.is1mScalp ? '1M ขาลงสั้น (Scalp Down)' : 'ขาลง (DOWNTREND)'}`;
      }
    } else {
      signalCard?.classList.add('glow-gold');
      if (signalBadge) {
        signalBadge.className = 'px-5 py-2 rounded-full font-bold text-base badge-wait flex items-center gap-2 shadow-lg';
        signalBadge.innerHTML = `<i class="fas fa-hand text-amber-200"></i> WAIT (รอจังหวะ)`;
      }
      if (trendBadge) {
        trendBadge.className = 'px-3 py-1 rounded-md text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30';
        trendBadge.innerHTML = `<i class="fas fa-arrows-left-right mr-1"></i> ไซด์เวย์ (SIDEWAY)`;
      }
    }

    if (trendDesc) trendDesc.innerText = analysis.trendTh;

    // Levels
    document.getElementById('valEntry').innerText = `$${analysis.entryPrice.toFixed(asset.decimals)}`;
    document.getElementById('valSL').innerText = `$${analysis.sl.toFixed(asset.decimals)}`;
    document.getElementById('valTP1').innerText = `$${analysis.tp1.toFixed(asset.decimals)}`;
    document.getElementById('valTP2').innerText = `$${analysis.tp2.toFixed(asset.decimals)}`;
    document.getElementById('valTP3').innerText = `$${analysis.tp3.toFixed(asset.decimals)}`;
    document.getElementById('valRR').innerText = analysis.rrRatio;
    document.getElementById('valConfidence').innerText = `${analysis.confidence}%`;

    document.getElementById('distSL').innerText = `-${analysis.riskDistance} ${asset.unit} (-${analysis.riskPips} pips)`;
    document.getElementById('distTP1').innerText = `+${Math.abs(analysis.tp1 - analysis.entryPrice).toFixed(asset.decimals)} (${analysis.rr1})`;
    document.getElementById('distTP2').innerText = `+${Math.abs(analysis.tp2 - analysis.entryPrice).toFixed(asset.decimals)} (${analysis.rr2})`;
    document.getElementById('distTP3').innerText = `+${Math.abs(analysis.tp3 - analysis.entryPrice).toFixed(asset.decimals)} (${analysis.rr3})`;

    // Confidence Bar
    const confBar = document.getElementById('confidenceBar');
    if (confBar) {
      confBar.style.width = `${analysis.confidence}%`;
      confBar.className = `h-full rounded-full transition-all duration-700 ${
        analysis.confidence >= 75 ? 'bg-gradient-to-r from-emerald-500 to-green-400' :
        analysis.confidence >= 60 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
        'bg-gradient-to-r from-rose-500 to-red-400'
      }`;
    }

    // Reasons List
    const entryReasonsList = document.getElementById('entryReasonsList');
    if (entryReasonsList) {
      entryReasonsList.innerHTML = analysis.entryReasons.map(r => `
        <li class="flex items-start gap-2.5 p-2.5 rounded-lg bg-gray-800/40 border border-gray-700/40 text-sm leading-relaxed text-gray-200">
          <i class="fas fa-check-circle text-amber-400 mt-1 flex-shrink-0"></i>
          <span>${r}</span>
        </li>
      `).join('');
    }

    // Dynamic Indicator readings
    document.getElementById('valRSI').innerText = analysis.indicators.rsi;
    document.getElementById('valEMA20').innerText = `$${analysis.indicators.ema20}`;
    document.getElementById('valEMA50').innerText = `$${analysis.indicators.ema50}`;
    document.getElementById('valEMA200').innerText = `$${analysis.indicators.ema200}`;
    document.getElementById('valATR').innerText = `$${analysis.indicators.atr}`;
    document.getElementById('valMACD').innerText = analysis.indicators.macdHist;

    // Strategy Tabs
    this.renderSMCTab(analysis.smc);
    this.renderDivergenceAndDowTab(analysis.divergences, analysis.fibData);

    // Exact Prompt Format Box
    const exactTemplate = document.getElementById('exactTemplateContent');
    if (exactTemplate) {
      exactTemplate.innerHTML = `
<div class="font-mono text-sm leading-relaxed text-gray-200 select-all">
<span class="text-amber-400 font-bold">สัญญาณ</span>       : <span class="${analysis.signal === 'BUY' ? 'text-emerald-400 font-bold' : analysis.signal === 'SELL' ? 'text-rose-400 font-bold' : 'text-amber-400 font-bold'}">${analysis.signal} ${analysis.is1mScalp ? '(1M Scalp)' : ''}</span>
<span class="text-gray-400">Entry</span>          : <span class="text-white font-bold">$${analysis.entryPrice.toFixed(asset.decimals)}</span>
<span class="text-gray-400">SL</span>             : <span class="text-rose-400 font-bold">$${analysis.sl.toFixed(asset.decimals)}</span> (-${analysis.riskDistance} ${asset.unit} / -${analysis.riskPips} pips)
<span class="text-gray-400">TP1</span>            : <span class="text-emerald-400 font-bold">$${analysis.tp1.toFixed(asset.decimals)}</span> (${analysis.rr1})
<span class="text-gray-400">TP2</span>            : <span class="text-emerald-400 font-bold">$${analysis.tp2.toFixed(asset.decimals)}</span> (${analysis.rr2})
<span class="text-gray-400">TP3</span>            : <span class="text-emerald-400 font-bold">$${analysis.tp3.toFixed(asset.decimals)}</span> (${analysis.rr3})
<span class="text-gray-400">R</span>              : <span class="text-amber-300 font-bold">${analysis.rrRatio}</span>
<span class="text-gray-400">ความมั่นใจ</span>     : <span class="text-cyan-300 font-bold">${analysis.confidence}%</span>
</div>
<div class="mt-3 pt-3 border-t border-gray-700/60 text-xs text-gray-300">
<p class="font-semibold text-amber-400 mb-1.5"><i class="fas fa-circle-info mr-1"></i> เหตุผลที่เลือกจุด ${analysis.signal}:</p>
<ul class="space-y-1 pl-1">
  ${analysis.entryReasons.map(r => `<li class="text-gray-300">${r}</li>`).join('')}
</ul>
</div>
      `;
    }

    this.updateLotCalculation();
  }

  static renderSMCTab(smc) {
    const obContainer = document.getElementById('smcOrderBlocks');
    const fvgContainer = document.getElementById('smcFVGs');
    const sweepContainer = document.getElementById('smcEvents');

    if (obContainer) {
      if (!smc?.orderBlocks?.length) {
        obContainer.innerHTML = `<div class="text-xs text-gray-500">ไม่พบ Order Block ชัดเจนในช่วงสวิงปัจจุบัน</div>`;
      } else {
        obContainer.innerHTML = smc.orderBlocks.map(ob => `
          <div class="p-2.5 rounded-lg ${ob.type === 'BULLISH_OB' ? 'ob-bullish' : 'ob-bearish'} text-xs">
            <div class="flex justify-between font-bold mb-1">
              <span>${ob.type === 'BULLISH_OB' ? '🟢 Bullish Order Block' : '🔴 Bearish Order Block'}</span>
              <span class="text-[10px] text-gray-400">${ob.candleTime}</span>
            </div>
            <div class="font-mono text-xs">โซนราคา: $${ob.zoneBottom.toFixed(2)} - $${ob.zoneTop.toFixed(2)}</div>
            <div class="text-[10px] ${ob.mitigated ? 'text-gray-400' : 'text-emerald-400 font-semibold'} mt-0.5">
              สถานะ: ${ob.mitigated ? 'Mitigated (ถูกทดสอบแล้ว)' : '⚡ Unmitigated (ยังไม่ทดสอบ - โซนเฝ้ารอ)'}
            </div>
          </div>
        `).join('');
      }
    }

    if (fvgContainer) {
      if (!smc?.fvgs?.length) {
        fvgContainer.innerHTML = `<div class="text-xs text-gray-500">ไม่พบ Fair Value Gap ตกค้าง</div>`;
      } else {
        fvgContainer.innerHTML = smc.fvgs.map(f => `
          <div class="p-2.5 rounded-lg ${f.type === 'BULLISH' ? 'fvg-bullish' : 'fvg-bearish'} text-xs">
            <div class="flex justify-between font-bold mb-0.5">
              <span>${f.type === 'BULLISH' ? '🟦 Bullish FVG (Imbalance)' : '🟪 Bearish FVG (Imbalance)'}</span>
              <span class="font-mono text-[10px]">${f.gap.toFixed(2)} USD</span>
            </div>
            <div class="font-mono text-xs">โซนช่องว่าง: $${f.bottom.toFixed(2)} - $${f.top.toFixed(2)}</div>
            <div class="text-[10px] text-gray-400 mt-0.5">${f.status}</div>
          </div>
        `).join('');
      }
    }

    if (sweepContainer) {
      let events = [];
      if (smc?.liquiditySweep) events.push(`<div class="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs"><b>💧 Liquidity Sweep:</b> ${smc.liquiditySweep.description}</div>`);
      if (smc?.structureBreak) events.push(`<div class="p-2 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs"><b>⚡ Structure Break:</b> ${smc.structureBreak.desc}</div>`);
      sweepContainer.innerHTML = events.length ? events.join('') : `<div class="text-xs text-gray-500">ยังไม่มีเหตุการณ์ Sweep หรือ BOS ใหม่ในรอบสวิงปัจจุบัน</div>`;
    }
  }

  static renderDivergenceAndDowTab(divergences, fibData) {
    const divContainer = document.getElementById('divList');
    const fibContainer = document.getElementById('fibList');

    if (divContainer) {
      if (!divergences || divergences.length === 0) {
        divContainer.innerHTML = `<div class="p-3 bg-gray-900/60 rounded-lg text-xs text-gray-400"><i class="fas fa-check text-emerald-400 mr-2"></i>ไม่พบสัญญาณ Divergence ที่ขัดแย้งกับทิศทางราคาหลักในขณะนี้</div>`;
      } else {
        divContainer.innerHTML = divergences.map(d => `
          <div class="p-3 rounded-lg border text-xs ${
            d.type.includes('BULLISH') ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }">
            <div class="font-bold flex items-center gap-2 mb-1">
              <i class="fas fa-triangle-exclamation"></i>
              <span>${d.indicator}: ${d.type}</span>
            </div>
            <p class="leading-relaxed text-gray-200">${d.desc}</p>
          </div>
        `).join('');
      }
    }

    if (fibContainer && fibData) {
      const f = fibData.fib;
      fibContainer.innerHTML = `
        <div class="p-3 bg-gray-900/80 rounded-xl border border-gray-800 text-xs space-y-2">
          <div class="flex justify-between items-center pb-2 border-b border-gray-800">
            <span class="text-gray-400">โครงสร้าง Dow Theory:</span>
            <span class="font-bold text-amber-300">${fibData.dowStructure}</span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div class="p-1.5 rounded bg-gray-800/40">Swing High: <span class="text-emerald-400 font-bold">$${fibData.swingHigh.toFixed(2)}</span></div>
            <div class="p-1.5 rounded bg-gray-800/40">Swing Low: <span class="text-rose-400 font-bold">$${fibData.swingLow.toFixed(2)}</span></div>
          </div>
          <div class="space-y-1 font-mono text-[11px] pt-1">
            <div class="flex justify-between"><span>Fib 0.0%:</span> <span>$${f.fib0.toFixed(2)}</span></div>
            <div class="flex justify-between"><span>Fib 23.6%:</span> <span>$${f.fib236.toFixed(2)}</span></div>
            <div class="flex justify-between"><span>Fib 38.2%:</span> <span>$${f.fib382.toFixed(2)}</span></div>
            <div class="flex justify-between p-1 rounded ${fibData.inGoldenPocket ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40' : 'text-gray-300'}">
              <span>⭐ Fib 50.0% - 61.8% (Golden Pocket):</span> 
              <span>$${f.fib500.toFixed(2)} - $${f.fib618.toFixed(2)}</span>
            </div>
            <div class="flex justify-between"><span>Fib 78.6%:</span> <span>$${f.fib786.toFixed(2)}</span></div>
            <div class="flex justify-between"><span>Fib 100.0%:</span> <span>$${f.fib100.toFixed(2)}</span></div>
          </div>
          ${fibData.inGoldenPocket ? `
            <div class="mt-2 p-2 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
              <i class="fas fa-bullseye text-amber-400 text-sm"></i>
              <span><b>ราคาปัจจุบันอยู่ใน Golden Pocket:</b> ได้เปรียบต้นทุนสูงสำหรับแผนกลับตัวตามเทรนด์</span>
            </div>
          ` : ''}
        </div>
      `;
    }
  }

  static updateLotCalculation() {
    if (!state.analysis) return;
    const asset = ASSETS[state.currentAssetKey];
    const balance = parseFloat(document.getElementById('calcBalance')?.value) || 1000;
    const riskPercent = parseFloat(document.getElementById('calcRiskPercent')?.value) || 1.5;
    const riskUSD = balance * (riskPercent / 100);
    const stopDistance = parseFloat(state.analysis.riskDistance) || 10.0;

    let lot = 0.01;
    if (state.currentAssetKey === 'XAUUSD') {
      lot = riskUSD / (stopDistance * 100);
    } else if (state.currentAssetKey === 'BTCUSD') {
      lot = riskUSD / stopDistance;
    } else {
      lot = riskUSD / (stopDistance * 100000);
    }

    lot = Math.max(0.01, Math.floor(lot * 100) / 100);

    const valRiskUSD = document.getElementById('calcRiskUSD');
    const valLot = document.getElementById('calcLotSize');
    const valProfitTP1 = document.getElementById('calcProfitTP1');
    const valProfitTP2 = document.getElementById('calcProfitTP2');
    const valProfitTP3 = document.getElementById('calcProfitTP3');

    if (valRiskUSD) valRiskUSD.innerText = `$${riskUSD.toFixed(2)}`;
    if (valLot) valLot.innerText = `${lot.toFixed(2)} Lot`;

    const tp1Dist = Math.abs(state.analysis.tp1 - state.analysis.entryPrice);
    const tp2Dist = Math.abs(state.analysis.tp2 - state.analysis.entryPrice);
    const tp3Dist = Math.abs(state.analysis.tp3 - state.analysis.entryPrice);

    const mult = state.currentAssetKey === 'XAUUSD' ? 100 : state.currentAssetKey === 'BTCUSD' ? 1 : 100000;

    if (valProfitTP1) valProfitTP1.innerText = `+$${(lot * tp1Dist * mult).toFixed(2)}`;
    if (valProfitTP2) valProfitTP2.innerText = `+$${(lot * tp2Dist * mult).toFixed(2)}`;
    if (valProfitTP3) valProfitTP3.innerText = `+$${(lot * tp3Dist * mult).toFixed(2)}`;
  }

  static copySignalToClipboard() {
    if (!state.analysis) return;
    const a = state.analysis;
    const asset = ASSETS[state.currentAssetKey];
    const text = `🔱 [${asset.shortName} TRADING SIGNAL - ${a.timeframe.toUpperCase()}] 🔱
-------------------------------------
📅 เวลา: ${a.timestamp} ${a.is1mScalp ? '(⚡ 1M สไนเปอร์ Scalping)' : ''}
📈 แนวโน้ม: ${a.trendTh}
🎯 สัญญาณ: ${a.signal}
📍 Entry : $${a.entryPrice.toFixed(asset.decimals)}
🛑 SL    : $${a.sl.toFixed(asset.decimals)} (-${a.riskDistance} / -${a.riskPips} pips)
🎯 TP1   : $${a.tp1.toFixed(asset.decimals)} (${a.rr1})
🎯 TP2   : $${a.tp2.toFixed(asset.decimals)} (${a.rr2})
🎯 TP3   : $${a.tp3.toFixed(asset.decimals)} (${a.rr3})
⚖️ Risk/Reward : ${a.rrRatio}
🔥 ความมั่นใจ : ${a.confidence}%
-------------------------------------
💡 เหตุผลการวิเคราะห์ & SMC Confluence:
${a.entryReasons.join('\n')}
-------------------------------------
⚠️ คำเตือน: ควบคุมความเสี่ยงตามหลัก Money Management (เสี่ยง 1-2% ต่อไม้เสมอ)`;

    navigator.clipboard.writeText(text).then(() => {
      this.showToast("คัดลอกสัญญาณเทรดสำหรับ LINE/Telegram แล้ว!");
    });
  }

  static copyPromptFormatToClipboard() {
    if (!state.analysis) return;
    const a = state.analysis;
    const asset = ASSETS[state.currentAssetKey];
    const text = `สัญญาณ: ${a.signal} ${a.is1mScalp ? '(1M Scalp)' : ''}
Entry: $${a.entryPrice.toFixed(asset.decimals)}
SL: $${a.sl.toFixed(asset.decimals)}
TP1: $${a.tp1.toFixed(asset.decimals)}
TP2: $${a.tp2.toFixed(asset.decimals)}
TP3: $${a.tp3.toFixed(asset.decimals)}
R: ${a.rrRatio}
ความมั่นใจ: ${a.confidence}%
เหตุผลที่เลือกจุด ${a.signal}:
${a.entryReasons.join('\n')}`;

    navigator.clipboard.writeText(text).then(() => {
      this.showToast("คัดลอกฟอร์แมตตามโจทย์เรียบร้อยแล้ว!");
    });
  }

  static showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = msg;
    toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
    toast.classList.add('opacity-100', 'translate-y-0');
    setTimeout(() => {
      toast.classList.remove('opacity-100', 'translate-y-0');
      toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
    }, 2800);
  }

  static initTradingViewWidget() {
    this.updateTradingViewWidget();
  }

  static updateTradingViewWidget() {
    const container = document.getElementById('tradingview_container');
    if (!container) return;
    container.innerHTML = '';

    const asset = ASSETS[state.currentAssetKey];
    const tfMap = { 
      '1m': '1',
      '5m': '5', 
      '15m': '15', 
      '1h': '60', 
      '4h': '240', 
      '1d': 'D' 
    };
    const interval = tfMap[state.timeframe] || '60';

    // Construct studies array according to user indicator settings
    const ind = state.indicators;
    const tvStudies = [];

    if (ind.emaFastEnabled) tvStudies.push("MAExp@tv-basicstudies");
    if (ind.emaSlowEnabled) tvStudies.push("MAExp@tv-basicstudies");
    if (ind.emaTrendEnabled) tvStudies.push("MAExp@tv-basicstudies");
    if (ind.rsiEnabled) tvStudies.push("RSI@tv-basicstudies");
    if (ind.macdEnabled) tvStudies.push("MACD@tv-basicstudies");
    if (ind.bbEnabled) tvStudies.push("BB@tv-basicstudies");
    if (ind.volumeEnabled) tvStudies.push("Volume@tv-basicstudies");

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (typeof TradingView !== 'undefined') {
        new TradingView.widget({
          "autosize": true,
          "symbol": asset.tvSymbol,
          "interval": interval,
          "timezone": "Asia/Bangkok",
          "theme": "dark",
          "style": "1",
          "locale": "th_TH",
          "toolbar_bg": "#080c14",
          "enable_publishing": false,
          "hide_top_toolbar": false, // Enabled top toolbar so user can click 'Indicators (fx)' to add any TradingView indicators!
          "hide_legend": false,
          "save_image": true,
          "withdateranges": true,
          "allow_symbol_change": true,
          "container_id": "tradingview_container",
          "studies": tvStudies
        });
      }
    };
    document.head.appendChild(script);
  }

  static startAutoRefresh() {
    this.stopAutoRefresh();
    // 1m scalping refreshes every 5 seconds for rapid action; other timeframes refresh every 10 seconds
    const intervalMs = state.timeframe === '1m' ? 5000 : 10000;
    state.refreshInterval = setInterval(() => {
      if (state.autoRefresh && !state.customMode) {
        this.refreshAllData(false);
      }
    }, intervalMs);
  }

  static stopAutoRefresh() {
    if (state.refreshInterval) {
      clearInterval(state.refreshInterval);
      state.refreshInterval = null;
    }
  }
}

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  UIController.init();
});
