'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  RefreshCw, 
  Wallet,
  History, 
  FileSpreadsheet, 
  Building2, 
  Server,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  FileText,
  Sparkles,
  Loader2,
  X,
  Trash2
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import Link from 'next/link';

export default function AccountsPage() {
  const [showConnect, setShowConnect] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Import flow state
  const [importMode, setImportMode] = useState<'idle' | 'upload' | 'preview' | 'success'>('idle');
  const [isAnalyzingFile, setIsAnalyzingFile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [importStats, setImportStats] = useState<{ count: number; totalPnl: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch live account data
  const [accountData, setAccountData] = useState<any>(null);
  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(r => r.json())
      .then(d => setAccountData(d))
      .catch(() => {});
  }, [importMode]); // refetch after import

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear all previous trade history and behavioral data?')) return;
    setIsClearing(true);
    try {
      const res = await fetch('/api/trades', { method: 'DELETE' });
      if (res.ok) {
        alert('All previous trade history has been cleared. Account reset to $2,000 baseline.');
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsClearing(false);
    }
  };

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 1200);
  };

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setIsAnalyzingFile(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/trades/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse trade statement');
      }

      setParsedData(data);
      setImportMode('preview');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing file. Please ensure it is a valid MT5 or CSV export.');
    } finally {
      setIsAnalyzingFile(false);
    }
  };

  const executeImport = async () => {
    if (!parsedData) return;
    setIsImporting(true);
    setErrorMsg(null);

    try {
      const payload: any = {};
      if (parsedData.trades && parsedData.trades.length > 0) {
        payload.trades = parsedData.trades;
      } else {
        payload.fileContent = JSON.stringify(parsedData.preview);
        payload.mapping = parsedData.suggestedMapping;
      }
      payload.replaceExisting = replaceExisting;

      const res = await fetch('/api/trades/import', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save trades to database');
      }

      setImportStats({
        count: data.count || parsedData.tradeCount || 0,
        totalPnl: data.totalPnl ?? 0,
      });
      setImportMode('success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to import trades');
    } finally {
      setIsImporting(false);
    }
  };

  const resetImport = () => {
    setImportMode('idle');
    setParsedData(null);
    setImportStats(null);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#2a2a2a] animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#2a2a2a]">Broker & Account Gateways</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Connected Accounts</h1>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={handleClearHistory} 
            disabled={isClearing}
            variant="outline"
            className="border-red-500/30 hover:border-red-500/60 text-red-400 hover:bg-red-500/10 font-semibold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition-all"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            <span>{isClearing ? "Clearing..." : "Clear Trade History"}</span>
          </Button>

          <Button 
            onClick={() => {
              setShowConnect(!showConnect);
              if (importMode !== 'idle') resetImport();
            }} 
            className="bg-[#2a2a2a] hover:bg-[#333333] text-white font-semibold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Account</span>
          </Button>
        </div>
      </div>

      {/* Add New Connection Tray / Import Modal */}
      {showConnect && (
        <Card className="p-6 border border-[#2a2a2a]/40 shadow-2xl animate-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between pb-3 mb-5 border-b border-white/10">
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                {importMode === 'idle' && "Add New Account or Data Source"}
                {importMode === 'upload' && "Upload Statement (MT5 HTML / XML / CSV)"}
                {importMode === 'preview' && "Review & Confirm Trade Import"}
                {importMode === 'success' && "Trade Ingestion Complete"}
              </h3>
              <p className="text-sm text-slate-400 mt-0.5">
                {importMode === 'idle' && "Select a broker or upload historical trade files to audit behavioral performance."}
                {importMode === 'upload' && "Drag and drop your raw MT5 statement file or standard broker CSV."}
                {importMode === 'preview' && "Verify the extracted trade history before adding to your behavioral ledger."}
                {importMode === 'success' && "Your trades have been normalized and added to your portfolio."}
              </p>
            </div>
            <button 
              onClick={() => {
                setShowConnect(false);
                resetImport();
              }}
              className="text-xs font-mono text-slate-400 hover:text-white cursor-pointer px-2 py-1 rounded bg-white/[0.04]"
            >
              [Close]
            </button>
          </div>

          {/* Step 1: Initial Selection Grid */}
          {importMode === 'idle' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Option 1: Statement Import */}
              <div 
                onClick={() => setImportMode('upload')}
                className="p-6 rounded-2xl border border-dashed border-[#2a2a2a]/60 hover:border-[#2a2a2a] bg-[#2a2a2a]/5 hover:bg-[#2a2a2a]/10 transition-all flex flex-col items-center justify-center text-center group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#2a2a2a]/20 border border-[#2a2a2a]/40 flex items-center justify-center mb-3 text-[#2a2a2a] group-hover:scale-105 transition-transform shadow-[0_0_12px_rgba(255,255,255,0.1)]">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-1.5 mb-1">
                  <h4 className="text-sm font-bold text-white tracking-wide">MT5 & CSV Statement Import</h4>
                  <Badge variant="outline" className="text-[10px] bg-neutral-800/60 border-neutral-700 text-neutral-300 font-mono">
                    Auto-Detect
                  </Badge>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Directly upload raw <strong>.html</strong>, <strong>.xlsx</strong>, <strong>.xml</strong>, or <strong>.csv</strong> statements from MetaTrader 5, cTrader, or Prop Firms.
                </p>
              </div>

              {/* Option 2: Prop Firm Sync */}
              <div className="p-6 rounded-2xl border border-white/10 bg-black/20 hover:border-[#2a2a2a] hover:bg-white/[0.04] transition-all flex flex-col items-center justify-center text-center group cursor-pointer">
                <div className="w-12 h-12 rounded-2xl bg-[#2a2a2a]/10 border border-[#2a2a2a]/30 flex items-center justify-center mb-3 text-[#2a2a2a] group-hover:scale-105 transition-transform shadow-[0_0_12px_rgba(255,255,255,0.1)]">
                  <Building2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1 tracking-wide">Prop Firm Account Sync</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Sync challenge or funded accounts from FTMO, FundedNext, Apex, or Topstep.
                </p>
              </div>

              {/* Option 3: Institutional Broker */}
              <div className="p-6 rounded-2xl border border-white/10 bg-black/20 opacity-60 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-3 text-slate-400">
                  <Server className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-400 mb-1 tracking-wide">Interactive Brokers / Alpaca</h4>
                <Badge variant="outline" className="text-xs font-mono border-white/10 text-slate-400 mt-1">
                  Coming Soon
                </Badge>
              </div>
            </div>
          )}

          {/* Step 2: Upload Dropzone */}
          {importMode === 'upload' && (
            <div className="space-y-4">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileInputChange} 
                accept=".html,.htm,.xml,.csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" 
                className="hidden" 
              />

              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all",
                  isAnalyzingFile ? "border-[#2a2a2a] bg-[#2a2a2a]/10" : "border-[#2a2a2a]/40 hover:border-[#2a2a2a] bg-black/30 hover:bg-[#2a2a2a]/5"
                )}
              >
                {isAnalyzingFile ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-[#2a2a2a] animate-spin" />
                    <p className="text-sm font-semibold text-white">Analyzing & Normalizing Statement...</p>
                    <p className="text-xs text-slate-400">Detecting MT5 deals, lot sizes, and P&L...</p>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-[#2a2a2a]/10 border border-[#2a2a2a]/30 flex items-center justify-center mb-4 text-[#2a2a2a] shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                      <UploadCloud className="w-7 h-7" />
                    </div>
                    <h4 className="text-base font-bold text-white mb-1">
                      Drag & Drop your MT5 Report or CSV file here
                    </h4>
                    <p className="text-xs text-slate-300 max-w-md mb-4">
                      Supports direct <strong>.html</strong>, <strong>.xlsx</strong>, <strong>.xml</strong>, and <strong>.csv</strong> statements exported from MetaTrader 5 or brokers.
                    </p>
                    <Button 
                      type="button"
                      className="bg-[#2a2a2a] hover:bg-[#333333] text-white text-xs font-semibold px-5 py-2 rounded-xl"
                    >
                      Browse Files
                    </Button>
                  </>
                )}
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex justify-start">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setImportMode('idle')}
                  className="border-white/10 text-xs text-slate-400 hover:text-white"
                >
                  ← Back to Options
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Preview Trades */}
          {importMode === 'preview' && parsedData && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Status Header */}
              <div className="p-4 rounded-xl bg-neutral-800/50 border border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#2a2a2a]/20 border border-[#2a2a2a]/40 flex items-center justify-center text-[#2a2a2a]">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {parsedData.isMT5 ? "⚡ MetaTrader 5 Statement Detected" : "Standard CSV Detected"}
                      </span>
                      <Badge variant="outline" className="text-xs font-mono bg-[#2a2a2a]/20 border-[#2a2a2a]/40 text-neutral-300">
                        {parsedData.tradeCount} Trades Ready
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      {parsedData.accountNumber ? `Statement Account: #${parsedData.accountNumber}` : `Format: ${parsedData.format.toUpperCase()}`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-slate-400 hover:text-white cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={replaceExisting} 
                      onChange={(e) => setReplaceExisting(e.target.checked)} 
                      className="rounded border-white/20 bg-white/5 text-[#2a2a2a]"
                    />
                    <span>Clean Slate (replace old trades)</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={resetImport}
                      className="border-white/10 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={executeImport}
                      disabled={isImporting}
                      className="bg-[#2a2a2a] hover:bg-[#333333] text-white text-xs font-semibold px-5 py-2 rounded-xl flex items-center gap-2 shadow-lg cursor-pointer"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Importing...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Import All {parsedData.tradeCount} Trades</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Trade Preview Table */}
              <div className="border border-white/10 rounded-xl overflow-hidden bg-black/20">
                <div className="px-4 py-2.5 bg-white/[0.03] border-b border-white/10 flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>SAMPLE PREVIEW (FIRST 5 TRADES)</span>
                  <span>TOTAL DETECTED: {parsedData.tradeCount}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left font-mono">
                    <thead className="text-slate-400 bg-white/[0.01] border-b border-white/5">
                      <tr>
                        <th className="px-4 py-2.5">DATE / TIME</th>
                        <th className="px-4 py-2.5">SYMBOL</th>
                        <th className="px-4 py-2.5">DIRECTION</th>
                        <th className="px-4 py-2.5">VOLUME / LOTS</th>
                        <th className="px-4 py-2.5">ENTRY</th>
                        <th className="px-4 py-2.5">EXIT</th>
                        <th className="px-4 py-2.5 text-right">PROFIT / P&L</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {parsedData.preview?.map((t: any, idx: number) => {
                        const isWin = (t.pnl || 0) >= 0;
                        const dateStr = t.entryTime ? new Date(t.entryTime).toLocaleDateString() : 'N/A';
                        return (
                          <tr key={idx} className="hover:bg-white/[0.02]">
                            <td className="px-4 py-2.5 text-slate-400">{dateStr}</td>
                            <td className="px-4 py-2.5 text-white font-bold">{t.symbol}</td>
                            <td className="px-4 py-2.5">
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-bold",
                                (t.direction || '').toLowerCase().includes('sell') || (t.direction || '').toLowerCase().includes('short') 
                                  ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                                  : "bg-neutral-800 text-emerald-400 border border-neutral-700"
                              )}>
                                {(t.direction || 'LONG').toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-white">{t.quantity || 0.1}</td>
                            <td className="px-4 py-2.5 text-slate-400">{t.entryPrice}</td>
                            <td className="px-4 py-2.5 text-slate-400">{t.exitPrice || '—'}</td>
                            <td className={cn("px-4 py-2.5 text-right font-bold", isWin ? "text-emerald-400" : "text-red-400")}>
                              {formatCurrency(t.pnl || 0)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Success Message */}
          {importMode === 'success' && importStats && (
            <div className="p-6 rounded-2xl bg-neutral-800/50 border border-neutral-700 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-[#2a2a2a]/20 border border-[#2a2a2a]/40 flex items-center justify-center text-[#2a2a2a] shadow-[0_0_18px_rgba(255,255,255,0.1)]">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-wide">
                  Successfully Imported {importStats.count} Trades!
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  All trade executions were normalized and added to your behavioral audit ledger.
                </p>
                <div className="inline-block mt-3 px-4 py-1.5 rounded-xl bg-black/40 border border-white/10 font-mono text-sm">
                  <span className="text-slate-400">Statement Realized P&L: </span>
                  <strong className={importStats.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                    {formatCurrency(importStats.totalPnl)}
                  </strong>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link href="/history">
                  <Button className="bg-[#2a2a2a] hover:bg-[#333333] text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer">
                    <History className="w-4 h-4" />
                    <span>View in Trade Journal</span>
                  </Button>
                </Link>
                <Link href="/coach">
                  <Button variant="outline" className="border-white/10 text-white hover:bg-white/[0.06] text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 cursor-pointer">
                    <Sparkles className="w-4 h-4 text-[#2a2a2a]" />
                    <span>Audit Behavioral Leaks (AI Coach)</span>
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setShowConnect(false);
                    resetImport();
                  }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Active Accounts List */}
      <div className="space-y-5">
        {/* Account 1: BiasX Prop Demo Account */}
        <Card className="p-6 md:p-7 hover:border-neutral-700 transition-all">
          <div className="flex flex-col lg:flex-row justify-between gap-6">
            {/* Account Info */}
            <div className="flex gap-5 items-start">
              <div className="w-14 h-14 rounded-2xl bg-[#2a2a2a]/20 border border-[#2a2a2a]/40 flex items-center justify-center shrink-0 shadow-[0_0_14px_rgba(255,255,255,0.1)]">
                <span className="font-mono font-black text-lg text-[#2a2a2a]">BX</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-bold text-white tracking-wide">BiasX Prop Challenge Terminal</h2>
                  <Badge variant="outline" className="text-neutral-300 border-[#262626] bg-[#141414] text-xs font-mono flex items-center gap-1.5 px-2.5 py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                    <span>Live Connected</span>
                  </Badge>
                </div>
                <p className="text-sm text-slate-300">
                  Simulated multi-asset execution environment · Direct WebSocket feed.
                </p>

                {/* Account Financials Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-3 font-mono">
                  <div>
                    <span className="text-xs font-medium text-slate-400 block mb-1">Account Balance</span>
                    <span className="text-2xl font-bold tracking-tight text-white">{formatCurrency(accountData?.account?.balance ?? 2000)}</span>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-400 block mb-1">Current Equity</span>
                    <span className="text-2xl font-bold tracking-tight text-white">{formatCurrency(accountData?.account?.equity ?? accountData?.account?.balance ?? 2000)}</span>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-400 block mb-1">Logged Trade Sample</span>
                    <span className="text-2xl font-bold tracking-tight text-white">{accountData?.stats?.totalTrades ?? 0} Executions</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-row lg:flex-col gap-3 justify-center border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-6 shrink-0">
              <Button 
                onClick={handleSync}
                disabled={isSyncing}
                className="flex-1 lg:flex-none justify-center gap-2 text-sm font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white rounded-xl py-2.5 px-4 cursor-pointer transition-all"
              >
                <RefreshCw className={cn("w-4 h-4 text-[#2a2a2a]", isSyncing && "animate-spin")} />
                <span>{isSyncing ? "Syncing..." : "Sync Trades"}</span>
              </Button>

              <Link href="/history" className="flex-1 lg:flex-none">
                <Button 
                  variant="outline"
                  className="w-full justify-center gap-2 text-sm font-semibold border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.06] rounded-xl py-2.5 px-4 cursor-pointer"
                >
                  <History className="w-4 h-4" />
                  <span>View Journal</span>
                </Button>
              </Link>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
