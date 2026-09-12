'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
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
  Trash2
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { useNotification } from '@/components/ui/notification';
import { fetchDashboardStats, invalidateDashboardStats } from '@/lib/services/dashboard-stats-cache';

export function AccountsView() {
  const { confirm, success, error } = useNotification();
  const [showConnect, setShowConnect] = useState(false);

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

  const loadAccountData = React.useCallback(() => {
    fetchDashboardStats(true)
      .then(d => setAccountData(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadAccountData();
  }, [importMode, loadAccountData]);

  useEffect(() => {
    const onMutate = () => loadAccountData();
    window.addEventListener('biasx:data-mutated', onMutate);
    window.addEventListener('focus', onMutate);
    return () => {
      window.removeEventListener('biasx:data-mutated', onMutate);
      window.removeEventListener('focus', onMutate);
    };
  }, [loadAccountData]);

  const handleClearHistory = async () => {
    const isConfirmed = await confirm({
      title: 'Reset Trade History & Account?',
      message: 'Are you sure you want to clear all previous trade history and behavioral data? Your account balance will be reset to the $2,000 baseline.',
      confirmText: 'Reset Account',
      cancelText: 'Cancel',
      variant: 'destructive',
    });
    if (!isConfirmed) return;

    setIsClearing(true);
    try {
      const res = await fetch('/api/trades', { method: 'DELETE' });
      if (res.ok) {
        invalidateDashboardStats();
        loadAccountData();
        success('Trade History Reset', 'All previous trade history has been cleared. Account reset to $2,000 baseline.');
      } else {
        error('Reset Failed', 'Could not clear trade history. Please try again.');
      }
    } catch (err) {
      console.error(err);
      error('Reset Error', 'A network error occurred while clearing trade history.');
    } finally {
      setIsClearing(false);
    }
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
      invalidateDashboardStats();
      loadAccountData();
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
    <div className="flex flex-col gap-8 max-w-[1600px] mx-auto pb-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-extrabold tracking-tight text-[#2D3748]">Connected Accounts</h1>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={handleClearHistory} 
            disabled={isClearing}
            variant="outline"
            className="border border-[#FF6B6B]/30 hover:border-[#FF6B6B]/60 text-[#FF6B6B] hover:bg-[#FF6B6B]/10 bg-[#E0E5EC] neu-raised-sm font-semibold text-sm px-4 py-2.5 rounded-[20px] flex items-center gap-2 cursor-pointer transition-all"
          >
            <Trash2 className="w-4 h-4 text-[#FF6B6B]" />
            <span>{isClearing ? "Clearing..." : "Clear Trade History"}</span>
          </Button>

          <Button 
            onClick={() => {
              setShowConnect(!showConnect);
              if (importMode !== 'idle') resetImport();
            }} 
            className="neu-btn-primary text-white font-semibold text-sm px-5 py-2.5 rounded-[22px] flex items-center gap-2 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Account</span>
          </Button>
        </div>
      </div>

      {/* Add New Connection Tray / Import Modal */}
      {showConnect && (
        <Card className="p-6 md:p-8 rounded-[32px] neu-raised bg-[#E0E5EC] border-0 animate-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#A0AEC0]/20">
            <div>
              <h3 className="text-lg font-heading font-bold text-[#2D3748] tracking-wide">
                {importMode === 'idle' && "Add New Account or Data Source"}
                {importMode === 'upload' && "Upload Statement (MT5 HTML / XML / CSV)"}
                {importMode === 'preview' && "Review & Confirm Trade Import"}
                {importMode === 'success' && "Trade Ingestion Complete"}
              </h3>
              <p className="text-sm text-[#4A5568] font-body mt-0.5">
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
              className="text-xs font-mono font-semibold text-[#4A5568] hover:text-[#2D3748] cursor-pointer px-3 py-1.5 rounded-[12px] bg-[#E0E5EC] neu-raised-sm hover:neu-inset-sm transition-all"
            >
              [Close]
            </button>
          </div>

          {/* Step 1: Initial Selection Grid */}
          {importMode === 'idle' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Option 1: Statement Import */}
              <div 
                onClick={() => setImportMode('upload')}
                className="p-6 rounded-[24px] border-2 border-dashed border-[#6C63FF]/50 hover:border-[#6C63FF] bg-[#E0E5EC] hover:neu-raised transition-all flex flex-col items-center justify-center text-center group cursor-pointer"
              >
                <div className="w-14 h-14 rounded-[20px] bg-[#E0E5EC] neu-inset-sm flex items-center justify-center mb-3 text-[#6C63FF] group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <h4 className="text-sm font-heading font-bold text-[#2D3748] tracking-wide">MT5 & CSV Statement Import</h4>
                  <Badge variant="outline" className="text-[10px] bg-[#6C63FF]/10 border-[#6C63FF]/20 text-[#6C63FF] font-mono rounded-[12px]">
                    Auto-Detect
                  </Badge>
                </div>
                <p className="text-xs text-[#4A5568] font-body leading-relaxed max-w-xs">
                  Directly upload raw <strong>.html</strong>, <strong>.xlsx</strong>, <strong>.xml</strong>, or <strong>.csv</strong> statements from MetaTrader 5, cTrader, or Prop Firms.
                </p>
              </div>

              {/* Option 2: Prop Firm Sync */}
              <div className="p-6 rounded-[24px] bg-[#E0E5EC] neu-raised opacity-60 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-[20px] bg-[#E0E5EC] neu-inset-sm flex items-center justify-center mb-3 text-[#A0AEC0]">
                  <Building2 className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-heading font-bold text-[#A0AEC0] mb-1.5 tracking-wide">Prop Firm Account Sync</h4>
                <p className="text-xs text-[#718096] font-body leading-relaxed max-w-xs">
                  Sync challenge or funded accounts from FTMO, FundedNext, Apex, or Topstep.
                </p>
                <Badge variant="outline" className="text-xs font-mono border-[#A0AEC0]/30 text-[#A0AEC0] mt-1.5 rounded-[12px]">
                  Coming Soon
                </Badge>
              </div>

              {/* Option 3: Institutional Broker */}
              <div className="p-6 rounded-[24px] bg-[#E0E5EC] neu-raised opacity-60 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-[20px] bg-[#E0E5EC] neu-inset-sm flex items-center justify-center mb-3 text-[#A0AEC0]">
                  <Server className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-heading font-bold text-[#A0AEC0] mb-1.5 tracking-wide">Interactive Brokers / Alpaca</h4>
                <Badge variant="outline" className="text-xs font-mono border-[#A0AEC0]/30 text-[#A0AEC0] mt-1 rounded-[12px]">
                  Coming Soon
                </Badge>
              </div>
            </div>
          )}

          {/* Step 2: Upload Dropzone */}
          {importMode === 'upload' && (
            <div className="space-y-5">
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
                  "border-2 border-dashed rounded-[28px] p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all",
                  isAnalyzingFile ? "border-[#6C63FF] bg-[#6C63FF]/5 neu-inset" : "border-[#A0AEC0]/40 hover:border-[#6C63FF] bg-[#E0E5EC] neu-inset hover:bg-white/20"
                )}
              >
                {isAnalyzingFile ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-[#6C63FF] animate-spin" />
                    <p className="text-sm font-heading font-bold text-[#2D3748]">Analyzing & Normalizing Statement...</p>
                    <p className="text-xs text-[#4A5568]">Detecting MT5 deals, lot sizes, and P&L...</p>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-[24px] bg-[#E0E5EC] neu-raised flex items-center justify-center mb-4 text-[#6C63FF]">
                      <UploadCloud className="w-8 h-8" />
                    </div>
                    <h4 className="text-base font-heading font-bold text-[#2D3748] mb-1">
                      Drag & Drop your MT5 Report or CSV file here
                    </h4>
                    <p className="text-xs text-[#4A5568] font-body max-w-md mb-5">
                      Supports direct <strong>.html</strong>, <strong>.xlsx</strong>, <strong>.xml</strong>, and <strong>.csv</strong> statements exported from MetaTrader 5 or brokers.
                    </p>
                    <Button 
                      type="button"
                      className="neu-btn-primary text-white text-xs font-semibold px-6 py-2.5 rounded-[20px]"
                    >
                      Browse Files
                    </Button>
                  </>
                )}
              </div>

              {errorMsg && (
                <div className="p-4 rounded-[20px] bg-[#FF6B6B]/10 border border-[#FF6B6B]/30 flex items-center gap-3 text-[#FF6B6B] text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex justify-start">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setImportMode('idle')}
                  className="bg-[#E0E5EC] neu-raised-sm hover:neu-inset-sm border-0 text-xs font-semibold text-[#4A5568] hover:text-[#2D3748] rounded-[16px] px-4 py-2"
                >
                  ← Back to Options
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Preview Trades */}
          {importMode === 'preview' && parsedData && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Status Header */}
              <div className="p-5 rounded-[24px] bg-[#E0E5EC] neu-inset flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-[16px] bg-[#E0E5EC] neu-raised flex items-center justify-center text-[#6C63FF]">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-heading font-bold text-[#2D3748]">
                        {parsedData.isMT5 ? "⚡ MetaTrader 5 Statement Detected" : "Standard CSV Detected"}
                      </span>
                      <Badge variant="outline" className="text-xs font-mono bg-[#6C63FF]/10 border-[#6C63FF]/20 text-[#6C63FF] rounded-[12px]">
                        {parsedData.tradeCount} Trades Ready
                      </Badge>
                    </div>
                    <p className="text-xs text-[#4A5568] mt-0.5 font-mono">
                      {parsedData.accountNumber ? `Statement Account: #${parsedData.accountNumber}` : `Format: ${parsedData.format.toUpperCase()}`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-[#4A5568] hover:text-[#2D3748] cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={replaceExisting} 
                      onChange={(e) => setReplaceExisting(e.target.checked)} 
                      className="rounded border-[#A0AEC0]/40 text-[#6C63FF] accent-[#6C63FF]"
                    />
                    <span className="font-semibold">Clean Slate (replace old trades)</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={resetImport}
                      className="bg-[#E0E5EC] neu-raised-sm hover:neu-inset-sm border-0 text-xs font-semibold text-[#4A5568] hover:text-[#2D3748] rounded-[16px] px-3.5 py-2"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={executeImport}
                      disabled={isImporting}
                      className="neu-btn-primary text-white text-xs font-semibold px-5 py-2 rounded-[18px] flex items-center gap-2 cursor-pointer"
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
              <div className="rounded-[24px] bg-[#E0E5EC] neu-inset p-1 overflow-hidden">
                <div className="px-5 py-3 bg-[#E0E5EC] border-b border-[#A0AEC0]/20 flex items-center justify-between text-xs text-[#4A5568] font-mono font-semibold">
                  <span>SAMPLE PREVIEW (FIRST 5 TRADES)</span>
                  <span className="text-[#2D3748] font-bold">TOTAL DETECTED: {parsedData.tradeCount}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left font-mono">
                    <thead className="text-[#4A5568] bg-[#E0E5EC]/60 border-b border-[#A0AEC0]/20 font-semibold">
                      <tr>
                        <th className="px-4 py-3">DATE / TIME</th>
                        <th className="px-4 py-3">SYMBOL</th>
                        <th className="px-4 py-3">DIRECTION</th>
                        <th className="px-4 py-3">VOLUME / LOTS</th>
                        <th className="px-4 py-3">ENTRY</th>
                        <th className="px-4 py-3">EXIT</th>
                        <th className="px-4 py-3 text-right">PROFIT / P&L</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#A0AEC0]/15">
                      {parsedData.preview?.map((t: any, idx: number) => {
                        const isWin = (t.pnl || 0) >= 0;
                        const dateStr = t.entryTime ? new Date(t.entryTime).toLocaleDateString() : 'N/A';
                        return (
                          <tr key={idx} className="hover:bg-white/30 transition-colors">
                            <td className="px-4 py-3 text-[#4A5568]">{dateStr}</td>
                            <td className="px-4 py-3 text-[#2D3748] font-bold">{t.symbol}</td>
                            <td className="px-4 py-3">
                              <span className={cn(
                                "px-2 py-0.5 rounded-[12px] text-[10px] font-bold",
                                (t.direction || '').toLowerCase().includes('sell') || (t.direction || '').toLowerCase().includes('short') 
                                  ? "bg-[#FF6B6B]/10 text-[#FF6B6B] border border-[#FF6B6B]/20" 
                                  : "bg-[#38B2AC]/10 text-[#38B2AC] border border-[#38B2AC]/20"
                              )}>
                                {(t.direction || 'LONG').toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[#2D3748] font-semibold">{t.quantity || 0.1}</td>
                            <td className="px-4 py-3 text-[#4A5568]">{t.entryPrice}</td>
                            <td className="px-4 py-3 text-[#4A5568]">{t.exitPrice || '—'}</td>
                            <td className={cn("px-4 py-3 text-right font-bold", isWin ? "text-[#38B2AC]" : "text-[#FF6B6B]")}>
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
                <div className="p-4 rounded-[20px] bg-[#FF6B6B]/10 border border-[#FF6B6B]/30 flex items-center gap-3 text-[#FF6B6B] text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Success Message */}
          {importMode === 'success' && importStats && (
            <div className="p-8 rounded-[32px] bg-[#E0E5EC] neu-inset flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-[24px] bg-[#38B2AC]/15 border border-[#38B2AC]/30 flex items-center justify-center text-[#38B2AC]">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-heading font-extrabold text-[#2D3748] tracking-wide">
                  Successfully Imported {importStats.count} Trades!
                </h3>
                <p className="text-xs text-[#4A5568] font-body mt-1">
                  All trade executions were normalized and added to your behavioral audit ledger.
                </p>
                <div className="inline-block mt-3 px-5 py-2 rounded-[16px] bg-[#E0E5EC] neu-raised font-mono text-sm">
                  <span className="text-[#4A5568]">Statement Realized P&L: </span>
                  <strong className={importStats.totalPnl >= 0 ? "text-[#38B2AC]" : "text-[#FF6B6B]"}>
                    {formatCurrency(importStats.totalPnl)}
                  </strong>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                <Link href="/history">
                  <Button className="neu-btn-primary text-white text-xs font-semibold px-5 py-2.5 rounded-[20px] flex items-center gap-2 cursor-pointer">
                    <History className="w-4 h-4" />
                    <span>View in Trade Journal</span>
                  </Button>
                </Link>
                <Link href="/coach">
                  <Button variant="outline" className="neu-btn-secondary bg-[#E0E5EC] border-0 text-[#2D3748] hover:text-[#6C63FF] text-xs font-semibold px-5 py-2.5 rounded-[20px] flex items-center gap-2 cursor-pointer">
                    <Sparkles className="w-4 h-4 text-[#6C63FF]" />
                    <span>Audit Behavioral Leaks (BiasX Intelligence)</span>
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setShowConnect(false);
                    resetImport();
                  }}
                  className="text-xs font-semibold text-[#4A5568] hover:text-[#2D3748] px-4 py-2"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Active Accounts List */}
      <div className="space-y-6">
        <Card className="p-6 md:p-8 rounded-[32px] neu-raised bg-[#E0E5EC] border-0 hover:translate-y-[-1px] transition-all">
          <div className="flex flex-col lg:flex-row justify-between gap-6">
            {/* Account Info */}
            <div className="flex gap-5 items-start">
              <div className="w-16 h-16 rounded-[24px] bg-[#6C63FF]/10 border border-[#6C63FF]/20 flex items-center justify-center shrink-0 neu-inset-sm">
                <span className="font-heading font-black text-xl text-[#6C63FF]">BX</span>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-heading font-bold text-[#2D3748] tracking-wide">BiasX Prop Challenge Terminal</h2>
                  <Badge variant="outline" className="text-[#38B2AC] border-[#38B2AC]/30 bg-[#38B2AC]/10 text-xs font-mono font-semibold flex items-center gap-1.5 px-3 py-1 rounded-[16px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#38B2AC] animate-pulse" />
                    <span>Live Connected</span>
                  </Badge>
                </div>
                <p className="text-sm text-[#4A5568] font-body">
                  Simulated multi-asset execution environment · Direct WebSocket feed.
                </p>

                {/* Account Financials Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 font-mono">
                  <div className="p-4 rounded-[20px] bg-[#E0E5EC] neu-inset">
                    <span className="text-xs font-semibold text-[#4A5568] block mb-1 uppercase tracking-wider">Account Balance</span>
                    <span className="text-2xl font-extrabold tracking-tight text-[#2D3748]">{formatCurrency(accountData?.account?.balance ?? 2000)}</span>
                  </div>
                  <div className="p-4 rounded-[20px] bg-[#E0E5EC] neu-inset">
                    <span className="text-xs font-semibold text-[#4A5568] block mb-1 uppercase tracking-wider">Current Equity</span>
                    <span className="text-2xl font-extrabold tracking-tight text-[#2D3748]">{formatCurrency(accountData?.account?.equity ?? accountData?.account?.balance ?? 2000)}</span>
                  </div>
                  <div className="p-4 rounded-[20px] bg-[#E0E5EC] neu-inset">
                    <span className="text-xs font-semibold text-[#4A5568] block mb-1 uppercase tracking-wider">Logged Trades</span>
                    <span className="text-2xl font-extrabold tracking-tight text-[#2D3748]">{accountData?.stats?.totalTrades ?? 0} Executions</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center border-t lg:border-t-0 lg:border-l border-[#A0AEC0]/20 pt-4 lg:pt-0 lg:pl-6 shrink-0">
              <Link href="/history" className="w-full lg:w-auto">
                <Button 
                  variant="outline"
                  className="w-full justify-center gap-2 text-sm font-semibold bg-[#E0E5EC] neu-raised-sm hover:neu-inset-sm border-0 text-[#4A5568] hover:text-[#2D3748] rounded-[20px] py-3 px-6 cursor-pointer transition-all"
                >
                  <History className="w-4 h-4 text-[#6C63FF]" />
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
