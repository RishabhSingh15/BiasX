import * as XLSX from 'xlsx';

export interface MT5ParsedTrade {
  symbol: string;
  assetClass: 'crypto' | 'forex' | 'equity' | 'commodity' | 'indices';
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  positionSize: number;
  stopLoss?: number;
  takeProfit?: number;
  riskPercentage?: number;
  riskReward?: number;
  entryTime: Date;
  exitTime: Date;
  duration: number; // in seconds
  pnl: number;
  pnlPercentage: number;
  fees: number;
  status: 'closed';
  orderType: 'market' | 'limit';
  notes?: string;
}

export interface MT5ParseResult {
  isMT5: boolean;
  format: 'mt5_html' | 'mt5_xml' | 'mt5_xlsx' | 'unknown';
  accountNumber?: string;
  brokerName?: string;
  currency?: string;
  trades: MT5ParsedTrade[];
  rawRowCount: number;
}

/**
 * Determine asset class based on symbol name
 */
export function inferAssetClass(symbol: string): 'crypto' | 'forex' | 'equity' | 'commodity' | 'indices' {
  const s = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.includes('BTC') || s.includes('ETH') || s.includes('SOL') || s.includes('XRP') || s.includes('USDT')) {
    return 'crypto';
  }
  if (s.includes('XAU') || s.includes('GOLD') || s.includes('XAG') || s.includes('SILVER') || s.includes('OIL') || s.includes('WTI') || s.includes('BRENT')) {
    return 'commodity';
  }
  if (s.includes('US500') || s.includes('SPX') || s.includes('NAS') || s.includes('US30') || s.includes('GER') || s.includes('DAX') || s.includes('NDX')) {
    return 'indices';
  }
  return 'forex';
}

/**
 * Get contract multiplier (units per 1 standard lot) for accurate risk calculation
 */
export function getContractMultiplier(symbol: string): number {
  const s = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.includes('XAU') || s.includes('GOLD')) return 100; // Gold: 1 lot = 100 oz
  if (s.includes('XAG') || s.includes('SILVER')) return 5000; // Silver: 1 lot = 5000 oz
  if (s.includes('OIL') || s.includes('WTI') || s.includes('BRENT')) return 100; // Oil: 1 lot = 100 barrels
  if (s.includes('BTC') || s.includes('ETH') || s.includes('SOL') || s.includes('XRP') || s.includes('USDT')) return 1; // Crypto
  if (s.includes('US500') || s.includes('SPX') || s.includes('NAS') || s.includes('US30') || s.includes('GER') || s.includes('DAX')) return 1; // Indices
  // Standard Forex pairs (EURUSD, GBPUSD, USDJPY, AUDUSD, etc.): 100,000 units
  if (s.length === 6 || s.includes('USD') || s.includes('EUR') || s.includes('GBP') || s.includes('JPY') || s.includes('AUD') || s.includes('CAD') || s.includes('CHF') || s.includes('NZD')) {
    return 100000;
  }
  return 1;
}

/**
 * Calculate actual dollar risk from stop-loss distance
 */
export function calculateDollarRisk(
  symbol: string,
  entryPrice: number,
  stopLoss: number | null | undefined,
  quantity: number
): number {
  if (!stopLoss || entryPrice <= 0 || quantity <= 0) return 0;
  const mult = getContractMultiplier(symbol);
  const riskDist = Math.abs(entryPrice - stopLoss);
  return Number((riskDist * quantity * mult).toFixed(2));
}

/**
 * Calculate planned Risk to Reward ratio
 */
export function calculateRiskRewardRatio(
  entryPrice: number,
  stopLoss: number | null | undefined,
  takeProfit: number | null | undefined
): number | null {
  if (!stopLoss || !takeProfit || entryPrice <= 0) return null;
  const riskDist = Math.abs(entryPrice - stopLoss);
  const rewardDist = Math.abs(takeProfit - entryPrice);
  if (riskDist <= 0) return null;
  return Number((rewardDist / riskDist).toFixed(2));
}

/**
 * Parse date strings from MT5 format "YYYY.MM.DD HH:MM:SS" or ISO
 */
export function parseMT5Date(dateVal: any): Date {
  if (!dateVal) return new Date();
  if (dateVal instanceof Date) return dateVal;
  const str = String(dateVal).trim().replace(/\./g, '-');
  // If format is YYYY-MM-DD HH:MM:SS, parse as UTC so dates don't shift across midnight
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?/.test(str)) {
    const parts = str.split(/\s+/);
    const timePart = parts[1].length === 5 ? `${parts[1]}:00` : parts[1];
    const isoStr = `${parts[0]}T${timePart}Z`;
    const d = new Date(isoStr);
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Strip HTML tags and clean text
 */
function cleanCell(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .trim();
}

/**
 * Parse MT5 HTML Statement (supports UTF-16LE, UTF-8, hidden tree tags, and Orders SL/TP mapping)
 */
export function parseMT5Html(rawText: string): MT5ParseResult {
  const result: MT5ParseResult = {
    isMT5: false,
    format: 'mt5_html',
    trades: [],
    rawRowCount: 0,
  };

  if (!rawText) return result;

  const lowerContent = rawText.toLowerCase();
  const hasMT5Signatures =
    lowerContent.includes('positions') ||
    lowerContent.includes('deals') ||
    lowerContent.includes('metatrader') ||
    lowerContent.includes('metaquotes') ||
    lowerContent.includes('statement:') ||
    lowerContent.includes('trade history report');

  if (!hasMT5Signatures) {
    return result;
  }

  result.isMT5 = true;

  // Extract Account Number if available
  const accMatch = rawText.match(/Account:\s*([0-9A-Za-z_-]+)/i) || rawText.match(/Statement:\s*([0-9A-Za-z_-]+)/i);
  if (accMatch) {
    result.accountNumber = accMatch[1].replace(/&nbsp;/gi, ' ').split(' ')[0].trim();
  }

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  let currentSection: 'header' | 'positions' | 'orders' | 'deals' = 'header';
  const ordersMap = new Map<string, { sl?: number; tp?: number; price?: number }>();
  const positionRows: string[][] = [];

  while ((match = rowRegex.exec(rawText)) !== null) {
    const rowHtml = match[1];

    if (rowHtml.includes('Positions</b>') || rowHtml.includes('<b>Positions</b>')) {
      currentSection = 'positions';
      continue;
    }
    if (rowHtml.includes('Orders</b>') || rowHtml.includes('<b>Orders</b>')) {
      currentSection = 'orders';
      continue;
    }
    if (rowHtml.includes('Deals</b>') || rowHtml.includes('<b>Deals</b>') || rowHtml.includes('Working Orders</b>')) {
      currentSection = 'deals';
      continue;
    }
    if (rowHtml.includes('<b>Time</b>') || rowHtml.includes('<b>Position</b>') || rowHtml.includes('<b>Order</b>')) {
      continue;
    }

    // Extract td cells, filtering out MT5 hidden tree spacer cells
    const cellRegex = /<td([^>]*)>([\s\S]*?)<\/td>/gi;
    let cellMatch;
    const cells: string[] = [];

    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      const attr = cellMatch[1];
      const val = cleanCell(cellMatch[2]);
      if (attr.includes('class="hidden"') || attr.includes("class='hidden'") || attr.includes('colspan="8"')) {
        continue;
      }
      cells.push(val);
    }

    if (currentSection === 'orders' && cells.length >= 8) {
      const posId = cells[1]?.trim();
      const slStr = cells[6]?.replace(/[^0-9.]/g, '');
      const tpStr = cells[7]?.replace(/[^0-9.]/g, '');
      const priceStr = cells[5]?.replace(/[^0-9.]/g, '');
      const sl = slStr ? parseFloat(slStr) : undefined;
      const tp = tpStr ? parseFloat(tpStr) : undefined;
      const price = priceStr ? parseFloat(priceStr) : undefined;
      if (posId && (sl !== undefined || tp !== undefined)) {
        if (!ordersMap.has(posId)) ordersMap.set(posId, { sl, tp, price });
      }
    } else if (currentSection === 'positions' && cells.length >= 10) {
      positionRows.push(cells);
    }
  }

  for (const cells of positionRows) {
    // Columns:
    // 0: Open Time
    // 1: Position ID
    // 2: Symbol
    // 3: Type (buy/sell)
    // 4: Volume
    // 5: Open Price
    // 6: S/L
    // 7: T/P
    // 8: Close Time
    // 9: Close Price
    // 10: Commission
    // 11: Swap
    // 12: Profit
    const openTimeStr = cells[0];
    const posId = cells[1]?.trim();
    const symbol = cells[2]?.trim().toUpperCase();
    const typeStr = cells[3]?.trim().toLowerCase();
    const volumeStr = cells[4]?.replace(/[^0-9.]/g, '');
    const openPriceStr = cells[5]?.replace(/[^0-9.]/g, '');
    const slStr = cells[6]?.replace(/[^0-9.]/g, '');
    const tpStr = cells[7]?.replace(/[^0-9.]/g, '');
    const closeTimeStr = cells[8];
    const closePriceStr = cells[9]?.replace(/[^0-9.]/g, '');
    const commStr = cells[10]?.replace(/[^0-9.-]/g, '');
    const swapStr = cells[11]?.replace(/[^0-9.-]/g, '');
    const profitStr = cells[cells.length - 1]?.replace(/[^0-9.-]/g, '');

    if (symbol && (typeStr === 'buy' || typeStr === 'sell')) {
      const openPrice = parseFloat(openPriceStr || '0');
      const closePrice = parseFloat(closePriceStr || openPriceStr || '0');
      const quantity = parseFloat(volumeStr || '0.1');
      const profit = parseFloat(profitStr || '0');
      const comm = parseFloat(commStr || '0');
      const swap = parseFloat(swapStr || '0');
      const fees = Math.abs(comm) + Math.abs(swap);

      let sl = slStr ? parseFloat(slStr) : undefined;
      let tp = tpStr ? parseFloat(tpStr) : undefined;

      // Check if original Order had planned SL/TP
      if (posId && ordersMap.has(posId)) {
        const ord = ordersMap.get(posId)!;
        if (ord.sl !== undefined) {
          // If position SL was moved into profit or missing, use original planned SL for risk calculation
          if (typeStr === 'buy' && (sl === undefined || sl >= openPrice)) {
            sl = ord.sl;
          } else if (typeStr === 'sell' && (sl === undefined || sl <= openPrice)) {
            sl = ord.sl;
          } else if (sl === undefined) {
            sl = ord.sl;
          }
        }
        if (ord.tp !== undefined && tp === undefined) {
          tp = ord.tp;
        }
      }

      const openDate = parseMT5Date(openTimeStr);
      const closeDate = closeTimeStr ? parseMT5Date(closeTimeStr) : new Date(openDate.getTime() + 3600000);
      const durationSecs = Math.max(1, Math.round((closeDate.getTime() - openDate.getTime()) / 1000));

      const dir: 'long' | 'short' = typeStr === 'sell' ? 'short' : 'long';
      const assetClass = inferAssetClass(symbol);
      const mult = getContractMultiplier(symbol);
      const positionSize = Number((openPrice * quantity * mult).toFixed(2));
      const pnlPercentage = positionSize > 0 ? Number(((profit / positionSize) * 100).toFixed(2)) : 0;

      let riskPercentage: number | undefined = undefined;
      let riskReward: number | undefined = undefined;

      if (sl !== undefined && openPrice > 0) {
        const dollarRisk = calculateDollarRisk(symbol, openPrice, sl, quantity);
        riskPercentage = Number(((dollarRisk / 2000) * 100).toFixed(2));
      }
      if (sl !== undefined && tp !== undefined && openPrice > 0) {
        const rr = calculateRiskRewardRatio(openPrice, sl, tp);
        if (rr !== null) riskReward = rr;
      }

      result.trades.push({
        symbol,
        assetClass,
        direction: dir,
        entryPrice: openPrice,
        exitPrice: closePrice,
        quantity,
        positionSize: positionSize > 0 ? positionSize : Number((openPrice * quantity).toFixed(2)),
        stopLoss: sl,
        takeProfit: tp,
        riskPercentage,
        riskReward,
        entryTime: openDate,
        exitTime: closeDate,
        duration: durationSecs,
        pnl: Number(profit.toFixed(2)),
        pnlPercentage,
        fees,
        status: 'closed',
        orderType: 'market',
        notes: 'Imported via MT5 HTML Report',
      });
    }
  }

  result.rawRowCount = result.trades.length;
  return result;
}

/**
 * Parse MT5 XLSX / XLS Spreadsheet (supports Orders section SL/TP mapping)
 */
export function parseMT5Xlsx(buffer: ArrayBuffer | Buffer): MT5ParseResult {
  const result: MT5ParseResult = {
    isMT5: false,
    format: 'mt5_xlsx',
    trades: [],
    rawRowCount: 0,
  };

  try {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    if (!wb.SheetNames || wb.SheetNames.length === 0) return result;

    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    let inSection: 'header' | 'positions' | 'orders' | 'deals' = 'header';
    const ordersMap = new Map<string, { sl?: number; tp?: number; price?: number }>();
    const positionRows: any[][] = [];

    for (const row of rows) {
      if (!row || row.length === 0) continue;
      const first = String(row[0] || '').trim();

      // Check Account header
      if (first === 'Account:' || first.toLowerCase().includes('account:')) {
        const val = String(row[1] || row[2] || row[3] || '');
        const match = val.match(/([0-9A-Za-z_-]+)/);
        if (match) result.accountNumber = match[1];
        result.isMT5 = true;
      }

      if (first === 'Positions' || first.toLowerCase() === 'positions') {
        inSection = 'positions';
        result.isMT5 = true;
        continue;
      }
      if (first === 'Orders' || first.toLowerCase() === 'orders') {
        inSection = 'orders';
        continue;
      }
      if (first === 'Deals' || first.toLowerCase() === 'deals' || first === 'Summary') {
        inSection = 'deals';
        continue;
      }
      if (first === 'Time' || first.toLowerCase().includes('time')) continue;

      if (inSection === 'orders' && row.length >= 8) {
        const posId = String(row[1] || '').trim();
        const sl = row[6] ? parseFloat(String(row[6]).replace(/[^0-9.]/g, '')) : undefined;
        const tp = row[7] ? parseFloat(String(row[7]).replace(/[^0-9.]/g, '')) : undefined;
        const price = row[5] ? parseFloat(String(row[5]).replace(/[^0-9.]/g, '')) : undefined;
        if (posId && (sl !== undefined || tp !== undefined)) {
          if (!ordersMap.has(posId)) ordersMap.set(posId, { sl, tp, price });
        }
      } else if (inSection === 'positions' && row.length >= 10) {
        positionRows.push(row);
      }
    }

    for (const row of positionRows) {
      // Position Row:
      // 0: Time, 1: Position, 2: Symbol, 3: Type, 4: Volume, 5: Price, 6: S/L, 7: T/P, 8: Close Time, 9: Close Price, 10: Commission, 11: Swap, 12: Profit
      const openTime = row[0];
      const posId = String(row[1] || '').trim();
      const symbol = String(row[2] || '').trim();
      const typeStr = String(row[3] || '').trim().toLowerCase();
      const volume = parseFloat(row[4]) || 0;
      const openPrice = parseFloat(row[5]) || 0;
      let sl = row[6] ? parseFloat(String(row[6]).replace(/[^0-9.]/g, '')) : undefined;
      let tp = row[7] ? parseFloat(String(row[7]).replace(/[^0-9.]/g, '')) : undefined;
      const closeTime = row[8];
      const closePrice = parseFloat(row[9]) || openPrice;
      const comm = parseFloat(row[10]) || 0;
      const swap = parseFloat(row[11]) || 0;
      const profit = parseFloat(row[12]) || 0;

      if (symbol && (typeStr === 'buy' || typeStr === 'sell') && openPrice > 0) {
        const openDate = parseMT5Date(openTime);
        const closeDate = closeTime ? parseMT5Date(closeTime) : new Date(openDate.getTime() + 3600000);
        const durationSecs = Math.max(1, Math.round((closeDate.getTime() - openDate.getTime()) / 1000));
        const dir: 'long' | 'short' = typeStr === 'sell' ? 'short' : 'long';
        const assetClass = inferAssetClass(symbol);
        const mult = getContractMultiplier(symbol);
        const positionSize = Number((openPrice * volume * mult).toFixed(2));
        const pnlPercentage = positionSize > 0 ? Number(((profit / positionSize) * 100).toFixed(2)) : 0;

        // Check if initial Order had planned SL/TP
        if (posId && ordersMap.has(posId)) {
          const ord = ordersMap.get(posId)!;
          if (ord.sl !== undefined) {
            if (dir === 'long' && (sl === undefined || sl >= openPrice)) {
              sl = ord.sl;
            } else if (dir === 'short' && (sl === undefined || sl <= openPrice)) {
              sl = ord.sl;
            } else if (sl === undefined) {
              sl = ord.sl;
            }
          }
          if (ord.tp !== undefined && tp === undefined) {
            tp = ord.tp;
          }
        }

        let riskPercentage: number | undefined = undefined;
        let riskReward: number | undefined = undefined;

        if (sl !== undefined && openPrice > 0) {
          const dollarRisk = calculateDollarRisk(symbol, openPrice, sl, volume);
          riskPercentage = Number(((dollarRisk / 2000) * 100).toFixed(2));
        }
        if (sl !== undefined && tp !== undefined && openPrice > 0) {
          const rr = calculateRiskRewardRatio(openPrice, sl, tp);
          if (rr !== null) riskReward = rr;
        }

        result.trades.push({
          symbol: symbol.toUpperCase(),
          assetClass,
          direction: dir,
          entryPrice: openPrice,
          exitPrice: closePrice,
          quantity: volume,
          positionSize: positionSize > 0 ? positionSize : Number((openPrice * volume).toFixed(2)),
          stopLoss: sl,
          takeProfit: tp,
          riskPercentage,
          riskReward,
          entryTime: openDate,
          exitTime: closeDate,
          duration: durationSecs,
          pnl: Number(profit.toFixed(2)),
          pnlPercentage,
          fees: Math.abs(comm) + Math.abs(swap),
          status: 'closed',
          orderType: 'market',
          notes: 'Imported via MT5 Excel Report',
        });
      }
    }

    result.rawRowCount = result.trades.length;
    return result;
  } catch (err) {
    console.error('Error parsing MT5 XLSX:', err);
    return result;
  }
}

/**
 * Universal Entry Point
 */
export function parseMT5Report(input: string | Buffer | ArrayBuffer, fileName?: string): MT5ParseResult {
  const name = (fileName || '').toLowerCase();

  // If XLSX / XLS
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    if (typeof input === 'string') {
      const buf = Buffer.from(input, 'binary');
      return parseMT5Xlsx(buf);
    }
    return parseMT5Xlsx(input as any);
  }

  // If HTML or XML
  let text = '';
  if (typeof input === 'string') {
    text = input;
  } else {
    const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
    const isUtf16 = buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe;
    const decoder = isUtf16 ? new TextDecoder('utf-16le') : new TextDecoder('utf-8');
    text = decoder.decode(buf);
  }

  const htmlRes = parseMT5Html(text);
  if (htmlRes.trades.length > 0) return htmlRes;

  return htmlRes;
}
