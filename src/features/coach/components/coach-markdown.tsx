import React from 'react';
import { cn } from '@/lib/utils';

export function renderInline(text: string, isUser: boolean): React.ReactNode {
  // Bold parsing
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className={isUser ? "font-black text-white" : "text-[#1A202C] font-bold font-heading"}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    // Inline code
    const codeParts = part.split(/(`[^`]+`)/g);
    return codeParts.map((cp, j) => {
      if (cp.startsWith('`') && cp.endsWith('`')) {
        return (
          <code key={`${i}-${j}`} className={cn("px-1.5 py-0.5 rounded-[6px] text-xs font-mono font-semibold", isUser ? "bg-white/20 text-white" : "bg-[#6C63FF]/10 text-[#6C63FF]")}>
            {cp.slice(1, -1)}
          </code>
        );
      }
      // Italic parsing
      const italicParts = cp.split(/(\*[^*]+\*)/g);
      return italicParts.map((ip, k) => {
        if (ip.startsWith('*') && ip.endsWith('*') && !ip.startsWith('**')) {
          return <em key={`${i}-${j}-${k}`} className={cn("italic", isUser ? "text-white/80" : "text-[#4A5568]")}>{ip.slice(1, -1)}</em>;
        }
        return <React.Fragment key={`${i}-${j}-${k}`}>{ip}</React.Fragment>;
      });
    });
  });
}

export function renderCoachMarkdown(text: string, isUser: boolean): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = (key: string) => {
    if (tableRows.length === 0) return;
    const headerRow = tableRows[0];
    const dataRows = tableRows.slice(1).filter(r => !r.every(c => c.trim().match(/^:?-+:?$/)));

    elements.push(
      <div key={key} className={cn("overflow-x-auto my-3 rounded-[16px]", isUser ? "bg-white/10" : "bg-[#E0E5EC]")}>
        <table className="w-full text-sm font-mono text-left border-collapse">
          <thead>
            <tr className={cn("border-b", isUser ? "border-white/20" : "border-[#A0AEC0]/30")}>
              {headerRow.map((cell, cIdx) => (
                <th key={cIdx} className={cn("p-2.5 font-bold", isUser ? "text-white" : "text-[#2D3748] font-heading")}>
                  {renderInline(cell.trim(), isUser)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, rIdx) => (
              <tr key={rIdx} className={cn("border-b last:border-0", isUser ? "border-white/10" : "border-[#A0AEC0]/15")}>
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className={cn("p-2.5", isUser ? "text-white/90" : "text-[#2D3748]")}>
                    {renderInline(cell.trim(), isUser)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();

    // Table row detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      const cells = trimmed.slice(1, -1).split('|');
      tableRows.push(cells);
      return;
    } else if (inTable) {
      flushTable(`table-${lineIdx}`);
    }

    // Headers
    if (line.startsWith('#### ')) {
      elements.push(
        <h4 key={lineIdx} className={cn("text-sm font-bold uppercase tracking-wider mt-3 mb-1", isUser ? "text-white" : "text-[#4A5568] font-heading")}>
          {renderInline(line.slice(5), isUser)}
        </h4>
      );
      return;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={lineIdx} className={cn("text-base md:text-lg font-bold mt-3.5 mb-1.5 flex items-center gap-1.5", isUser ? "text-white" : "text-[#2D3748] font-heading")}>
          {renderInline(line.slice(4), isUser)}
        </h3>
      );
      return;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={lineIdx} className={cn("text-lg md:text-xl font-bold mt-4 mb-2", isUser ? "text-white" : "text-[#2D3748] font-heading")}>
          {renderInline(line.slice(3), isUser)}
        </h2>
      );
      return;
    }

    // Blockquotes
    if (line.startsWith('> ')) {
      elements.push(
        <div key={lineIdx} className={cn("border-l-3 pl-3.5 py-1.5 my-2.5 rounded-r-[14px] text-sm leading-relaxed italic", isUser ? "border-white/60 bg-white/15 text-white" : "border-[#6C63FF] bg-[#6C63FF]/10 text-[#2D3748]")}>
          {renderInline(line.slice(2), isUser)}
        </div>
      );
      return;
    }

    // Bullet points
    if (line.startsWith('* ') || line.startsWith('- ')) {
      elements.push(
        <div key={lineIdx} className={cn("flex items-start gap-2 ml-1 my-1", isUser ? "text-white" : "text-[#2D3748]")}>
          <span className={cn("mt-0.5 shrink-0 font-bold text-base leading-none", isUser ? "text-white" : "text-[#6C63FF]")}>•</span>
          <span className="leading-relaxed text-sm">{renderInline(line.slice(2), isUser)}</span>
        </div>
      );
      return;
    }

    // Numbered list
    const numMatch = line.match(/^(\d+)\.\s+/);
    if (numMatch) {
      elements.push(
        <div key={lineIdx} className={cn("flex items-start gap-2 ml-1 my-1", isUser ? "text-white" : "text-[#2D3748]")}>
          <span className={cn("font-bold font-mono shrink-0 w-5 text-right text-sm", isUser ? "text-white" : "text-[#6C63FF]")}>{numMatch[1]}.</span>
          <span className="leading-relaxed text-sm">{renderInline(line.slice(numMatch[0].length), isUser)}</span>
        </div>
      );
      return;
    }

    // Empty lines
    if (line.trim() === '') {
      elements.push(<div key={lineIdx} className="h-1.5" />);
      return;
    }

    // Regular paragraph
    elements.push(
      <p key={lineIdx} className={cn("my-1 leading-relaxed text-sm", isUser ? "text-white" : "text-[#2D3748]")}>
        {renderInline(line, isUser)}
      </p>
    );
  });

  if (inTable) {
    flushTable('table-end');
  }

  return elements;
}
