import { NextResponse } from 'next/server';
// @ts-ignore
import { auth, getEffectiveUserId, ensureUserHasAccount } from '@/lib/auth';
// @ts-ignore
import { prisma } from '@/lib/prisma';
import { ensureUserHasDefaultRules } from '@/lib/services/default-rules';
import Papa from 'papaparse';
import { parseMT5Report, getContractMultiplier, calculateDollarRisk, calculateRiskRewardRatio, inferAssetClass } from '@/lib/services/mt5-parser';

export async function POST(request: Request) {
  try {
    const userId = await getEffectiveUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file.name || '';
    const lowerName = fileName.toLowerCase();

    // 1. Check if XLSX or XLS
    if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
      const mt5Result = parseMT5Report(buffer, fileName);
      if (mt5Result.trades.length > 0) {
        return NextResponse.json({
          format: 'mt5_xlsx',
          detectedBroker: 'MetaTrader 5 Statement (Excel)',
          accountNumber: mt5Result.accountNumber || 'MT5 Account',
          tradeCount: mt5Result.trades.length,
          preview: mt5Result.trades.slice(0, 5),
          trades: mt5Result.trades,
          isMT5: true,
        });
      }
    }

    // 2. Decode text safely (handles MT5 UTF-16LE and UTF-8)
    const isUtf16 = buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe;
    const decoder = isUtf16 ? new TextDecoder('utf-16le') : new TextDecoder('utf-8');
    const text = decoder.decode(buffer);

    // 3. Check if MT5 HTML or XML
    const isHtml = lowerName.endsWith('.html') || lowerName.endsWith('.htm') || text.includes('<html') || text.includes('<!DOCTYPE') || text.includes('Trade History Report');
    const isXml = lowerName.endsWith('.xml') || text.trim().startsWith('<?xml');

    if (isHtml || isXml) {
      const mt5Result = parseMT5Report(text, fileName);
      if (mt5Result.trades.length > 0) {
        return NextResponse.json({
          format: mt5Result.format,
          detectedBroker: 'MetaTrader 5 Statement (HTML)',
          accountNumber: mt5Result.accountNumber || 'MT5 Account',
          tradeCount: mt5Result.trades.length,
          preview: mt5Result.trades.slice(0, 5),
          trades: mt5Result.trades,
          isMT5: true,
        });
      }
    }

    // Standard CSV Fallback
    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      preview: 5 // Return 5 rows for mapping preview
    });

    const headers = parsed.meta.fields || [];
    
    // Auto-detect columns
    const mapping: Record<string, string> = {};
    headers.forEach(h => {
      const lower = h.toLowerCase();
      if (lower.includes('sym') || lower.includes('asset') || lower.includes('pair')) mapping.symbol = h;
      else if (lower.includes('side') || lower.includes('dir') || lower.includes('type')) mapping.direction = h;
      else if (lower.includes('entry') && lower.includes('price')) mapping.entryPrice = h;
      else if (lower.includes('exit') && lower.includes('price')) mapping.exitPrice = h;
      else if (lower.includes('qty') || lower.includes('quant') || lower.includes('size') || lower.includes('vol') || lower.includes('lot')) mapping.quantity = h;
      else if (lower.includes('pnl') || lower.includes('profit') || lower.includes('net')) mapping.pnl = h;
      else if (lower.includes('time') || lower.includes('date')) {
        if (!mapping.entryTime) mapping.entryTime = h;
        else if (!mapping.exitTime) mapping.exitTime = h;
      }
    });

    return NextResponse.json({
      format: 'csv',
      detectedBroker: 'Standard CSV Export',
      headers,
      tradeCount: parsed.data.length,
      preview: parsed.data,
      suggestedMapping: mapping,
      isMT5: false,
    });
  } catch (error) {
    console.error('Error in import preview:', error);
    return NextResponse.json({ error: 'Failed to parse trade statement' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getEffectiveUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accountId, trades, fileContent, mapping } = body;
    
    let targetAccountId = accountId;
    let userAccount = null;
    if (targetAccountId) {
      userAccount = await prisma.account.findUnique({ where: { id: targetAccountId } });
    }
    if (!userAccount) {
      userAccount = await ensureUserHasAccount(userId);
      targetAccountId = userAccount.id;
    }

    let tradesData: any[] = [];
    const accountBal = (userAccount as any)?.startingBalance || userAccount?.balance || 2000;

    // Case 1: Pre-parsed MT5 Trades
    if (trades && Array.isArray(trades) && trades.length > 0) {
      tradesData = trades.map((t: any) => {
        const symbol = (t.symbol || 'UNKNOWN').toUpperCase().replace('/', '').trim();
        const entryPrice = parseFloat(t.entryPrice) || 0;
        const quantity = parseFloat(t.quantity) || 0.01;
        const stopLoss = t.stopLoss !== undefined && t.stopLoss !== null ? parseFloat(t.stopLoss) : null;
        const takeProfit = t.takeProfit !== undefined && t.takeProfit !== null ? parseFloat(t.takeProfit) : null;

        let riskPercentage = t.riskPercentage !== undefined && t.riskPercentage !== null ? parseFloat(t.riskPercentage) : null;
        let riskReward = t.riskReward !== undefined && t.riskReward !== null ? parseFloat(t.riskReward) : null;

        if (riskPercentage === null && stopLoss !== null && entryPrice > 0) {
          const dollarRisk = calculateDollarRisk(symbol, entryPrice, stopLoss, quantity);
          if (accountBal > 0) {
            riskPercentage = Number(((dollarRisk / accountBal) * 100).toFixed(2));
          }
        }

        if (riskReward === null && stopLoss !== null && takeProfit !== null && entryPrice > 0) {
          riskReward = calculateRiskRewardRatio(entryPrice, stopLoss, takeProfit);
        }

        const mult = getContractMultiplier(symbol);
        const positionSize = parseFloat(t.positionSize) || (entryPrice * quantity * mult);

        return {
          accountId: targetAccountId,
          userId,
          symbol,
          assetClass: t.assetClass || inferAssetClass(symbol),
          direction: (t.direction || 'long').toLowerCase(),
          entryPrice,
          exitPrice: t.exitPrice ? parseFloat(t.exitPrice) : null,
          quantity,
          positionSize,
          stopLoss,
          takeProfit,
          riskPercentage,
          riskReward,
          entryTime: t.entryTime ? new Date(t.entryTime) : new Date(),
          exitTime: t.exitTime ? new Date(t.exitTime) : null,
          duration: parseInt(t.duration) || 3600,
          pnl: t.pnl !== undefined ? parseFloat(t.pnl) : null,
          pnlPercentage: t.pnlPercentage ? parseFloat(t.pnlPercentage) : null,
          fees: parseFloat(t.fees) || 0,
          status: 'closed',
          orderType: t.orderType || 'market',
          notes: t.notes || 'Imported via MT5 Statement',
          isDemo: false,
        };
      });
    } 
    // Case 2: Raw CSV content with mapping
    else if (fileContent && mapping) {
      const parsed = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
      });

      tradesData = parsed.data.map((row: any) => {
        const symbol = (row[mapping.symbol] || 'UNKNOWN').toUpperCase().replace('/', '').trim();
        const entryP = parseFloat(row[mapping.entryPrice]) || 0;
        const qty = parseFloat(row[mapping.quantity]) || 0.01;
        const pnl = mapping.pnl ? parseFloat(row[mapping.pnl]) : null;
        const sl = mapping.stopLoss && row[mapping.stopLoss] ? parseFloat(row[mapping.stopLoss]) : null;
        const tp = mapping.takeProfit && row[mapping.takeProfit] ? parseFloat(row[mapping.takeProfit]) : null;

        let riskPercentage = null;
        let riskReward = null;

        if (sl !== null && entryP > 0) {
          const dollarRisk = calculateDollarRisk(symbol, entryP, sl, qty);
          if (accountBal > 0) {
            riskPercentage = Number(((dollarRisk / accountBal) * 100).toFixed(2));
          }
        }

        if (sl !== null && tp !== null && entryP > 0) {
          riskReward = calculateRiskRewardRatio(entryP, sl, tp);
        }

        const mult = getContractMultiplier(symbol);

        return {
          accountId: targetAccountId,
          userId,
          symbol,
          assetClass: inferAssetClass(symbol),
          direction: (row[mapping.direction] || 'long').toLowerCase().includes('sell') ? 'short' : 'long',
          entryPrice: entryP,
          exitPrice: mapping.exitPrice ? parseFloat(row[mapping.exitPrice]) : null,
          quantity: qty,
          positionSize: entryP * qty * mult,
          stopLoss: sl,
          takeProfit: tp,
          riskPercentage,
          riskReward,
          entryTime: mapping.entryTime && row[mapping.entryTime] ? new Date(row[mapping.entryTime]) : new Date(),
          exitTime: mapping.exitTime && row[mapping.exitTime] ? new Date(row[mapping.exitTime]) : null,
          pnl,
          duration: 3600,
          fees: 0,
          status: (mapping.exitPrice && row[mapping.exitPrice]) ? 'closed' : 'open',
          orderType: 'market',
          notes: 'Imported via CSV',
          isDemo: false,
        };
      });
    } else {
      return NextResponse.json({ error: 'No trade data or valid mapping provided' }, { status: 400 });
    }

    if (tradesData.length === 0) {
      return NextResponse.json({ error: 'No valid trades extracted' }, { status: 400 });
    }

    if (body.replaceExisting !== false) {
      await prisma.behaviorEvent.deleteMany({ where: { userId } });
      await prisma.ruleViolation.deleteMany({ where: { userId } });
      await prisma.tradeAnalysis.deleteMany({ where: { userId } });
      await prisma.trade.deleteMany({ where: { userId } });
    }

    // Bulk insert into database
    const created = await prisma.trade.createMany({
      data: tradesData
    });

    // Ensure user has default trading rules so behavioral engine can audit immediately
    await ensureUserHasDefaultRules(userId);

    // Calculate total imported PnL and update account balance
    const totalPnl = tradesData.reduce((acc, t) => acc + (t.pnl || 0), 0);
    const existingAccount = await prisma.account.findUnique({ where: { id: targetAccountId } });
    if (existingAccount) {
      const startingBase = (body.replaceExisting !== false) ? 2000 : existingAccount.balance;
      const newBal = Number((startingBase + totalPnl).toFixed(2));
      await prisma.account.update({
        where: { id: targetAccountId },
        data: {
          balance: newBal,
          equity: newBal,
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      count: created.count,
      totalPnl: Number(totalPnl.toFixed(2)),
      accountBalance: existingAccount ? Number((existingAccount.balance + totalPnl).toFixed(2)) : undefined
    });
  } catch (error) {
    console.error('Error importing trades:', error);
    return NextResponse.json({ error: 'Internal server error while saving trades' }, { status: 500 });
  }
}
