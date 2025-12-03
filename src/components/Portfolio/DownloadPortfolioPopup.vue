<template>
  <div class="download-modal-overlay" @click="$emit('close')" aria-modal="true" role="dialog">
    <div class="download-modal" @click.stop>
      <h3 id="download-title">Download Portfolio</h3>
      <div class="download-options" role="group" aria-label="Download Options">
        <button class="input" @click="downloadPDF" aria-label="Download portfolio as PDF">PDF (for presentation and sharing.)</button>
        <button class="input" @click="exportPortfolioData" aria-label="Download portfolio as CSV">CSV (for import/export, data only.)</button>
      </div>
      <div v-if="error" class="download-error" aria-live="polite">{{ error }}</div>
      <div class="download-actions">
        <button class="trade-btn" @click="$emit('close')" aria-label="Cancel download">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import ereunaLogo from '@/assets/icons/ereuna.png';

const props = defineProps({
  user: String,
  apiKey: String,
  portfolio: {
    type: Number,
    required: true
  }
})
const error = ref('');

// Local state for fetched export data
interface ExportStats {
  [key: string]: any;
  biggestWinner?: { ticker?: string; amount?: string; tradeCount?: number };
  biggestLoser?: { ticker?: string; amount?: string; tradeCount?: number };
}
interface ExportData {
  portfolio: any[];
  transactionHistory: any[];
  stats: ExportStats;
  cash: number;
  biggestWinner: any;
  biggestLoser: any;
}
const exportData = ref<ExportData>({
  portfolio: [],
  transactionHistory: [],
  stats: {},
  cash: 0,
  biggestWinner: null,
  biggestLoser: null,
});

onMounted(async () => {
  error.value = '';
  try {
    const res = await fetch(`/api/portfolio/export?username=${encodeURIComponent(props.user ?? '')}&portfolio=${encodeURIComponent(String(props.portfolio ?? ''))}`, {
      method: 'GET',
      headers: {
        'x-api-key': props.apiKey ?? '',
        'Content-Type': 'application/json',
      } as Record<string, string>,
    });
    if (!res.ok) throw new Error('Failed to fetch export data');
    const data = await res.json();
    // Map BaseValue to baseValue if needed
    if (data.stats && data.stats.BaseValue !== undefined && data.stats.baseValue === undefined) {
      data.stats.baseValue = data.stats.BaseValue;
    }
    exportData.value = {
      portfolio: data.portfolio || [],
      transactionHistory: data.transactionHistory || [],
      stats: data.stats || {},
      cash: data.cash ?? 0,
      biggestWinner: data.biggestWinner ?? null,
      biggestLoser: data.biggestLoser ?? null,
    };
  } catch (e) {
    error.value = 'Failed to load export data.';
  }
});

async function downloadPDF() {
  error.value = '';
  try {
    // Color definitions from CSS variables
    const accent1 = rgb(0.549, 0.553, 0.996); // #8c8dfe
    const text1 = rgb(0.753, 0.792, 0.961);   // #c0caf5
    const text2 = rgb(0.663, 0.694, 0.839);   // #a9b1d6
    const base1 = rgb(0.102, 0.106, 0.149);   // #1a1b26
    const base2 = rgb(0.141, 0.157, 0.231);   // #24283b
    const positive = rgb(0.298, 0.686, 0.314); // #4caf50
    const negative = rgb(0.565, 0.749, 0.976); // #90bff9

    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([600, 800]);
    let y = 770;

    // Custom background
    page.drawRectangle({ x: 0, y: 0, width: 600, height: 800, color: base1 });

    // Add logo
    const logoImg = await fetch(ereunaLogo).then(res => res.arrayBuffer());
    const logo = await pdfDoc.embedPng(logoImg);
    page.drawImage(logo, { x: 30, y: 740, width: 160, height: 60 });

    // Add title and date
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    page.drawText('Portfolio Report', { x: 600 - 40 - font.widthOfTextAtSize('Portfolio Report', 15), y: 770, size: 15, font, color: accent1 });
    page.drawText(dateStr, { x: 600 - 40 - font.widthOfTextAtSize(dateStr, 11), y: 750, size: 11, font, color: text2 });

    // --- Stats as badges/cards ---
    y = 720;
    const statMap = {
      totalValue: 'Total Value',
      baseValue: 'Base Portfolio Value',
      activePositions: 'Active Positions',
      cash: 'Cash',
      totalPL: 'Total P/L',
      totalPLPercent: 'Total P/L %',
      unrealizedPL: 'Unrealized P/L',
      unrealizedPLPercent: 'Unrealized P/L %',
      realizedPL: 'Realized P/L',
      realizedPLPercent: 'Realized P/L %',
      avgPositionSize: 'Average Position Size',
      avgHoldTimeWinners: 'Avg Time Hold. Winners',
      avgHoldTimeLosers: 'Avg Time Hold. Losers',
      avgGain: 'Average Gain %',
      avgLoss: 'Average Loss %',
      avgGainAbs: 'Average Gain',
      avgLossAbs: 'Average Loss',
      gainLossRatio: 'Gain / Loss Ratio',
      riskRewardRatio: 'Risk / Reward Ratio',
      winnerCount: 'Winners',
      winnerPercent: 'Winners %',
      loserCount: 'Losers',
      loserPercent: 'Losers %',
      breakevenCount: 'Break-Even',
      breakevenPercent: 'Break-Evens %',
      profitFactor: 'Profit Factor',
      sortinoRatio: 'Sortino Ratio',
    };
    const statFormat: Record<string, (v: any) => string | number> = {
      totalValue: (v: any) => `$${parseFloat(v).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`,
      baseValue: (v: any) => `$${parseFloat(v).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`,
      activePositions: (v: any) => v,
      cash: (v: any) => `$${parseFloat(v).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`,
      totalPL: (v: any) => `$${parseFloat(v).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`,
      totalPLPercent: (v: any) => `${parseFloat(v).toFixed(2)}%`,
      unrealizedPL: (v: any) => `$${parseFloat(v).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`,
      unrealizedPLPercent: (v: any) => `${parseFloat(v).toFixed(2)}%`,
      realizedPL: (v: any) => `$${parseFloat(v).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`,
      realizedPLPercent: (v: any) => `${parseFloat(v).toFixed(2)}%`,
      avgPositionSize: (v: any) => `${parseFloat(v).toFixed(2)}%`,
      avgHoldTimeWinners: (v: any) => `${parseFloat(v).toFixed(2)} days`,
      avgHoldTimeLosers: (v: any) => `${parseFloat(v).toFixed(2)} days`,
      avgGain: (v: any) => `${parseFloat(v).toFixed(2)}%`,
      avgLoss: (v: any) => `${parseFloat(v).toFixed(2)}%`,
      avgGainAbs: (v: any) => `$${parseFloat(v).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`,
      avgLossAbs: (v: any) => `$${parseFloat(v).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`,
      gainLossRatio: (v: any) => `${parseFloat(v).toFixed(2)}`,
      riskRewardRatio: (v: any) => `${parseFloat(v).toFixed(2)}`,
      winnerCount: (v: any) => v,
      winnerPercent: (v: any) => `${parseFloat(v).toFixed(2)}%`,
      loserCount: (v: any) => v,
      loserPercent: (v: any) => `${parseFloat(v).toFixed(2)}%`,
      breakevenCount: (v: any) => v,
      breakevenPercent: (v: any) => `${parseFloat(v).toFixed(2)}%`,
      profitFactor: (v: any) => `${parseFloat(v).toFixed(2)}`,
      sortinoRatio: (v: any) => `${parseFloat(v).toFixed(2)}`,
    };
    const stats = exportData.value.stats || {};
    const statsExcluded = ['Username', 'Number', 'portfolioValueHistory', 'tradeReturnsChart'];
    const statEntries = Object.entries(stats).filter(([key, value]) => (statMap as Record<string, string>)[key] && !statsExcluded.includes(key) && typeof value !== 'object');
    const badgeWidth = 174;
    const badgeHeight = 40;
    const badgeMarginX = 0;
    const badgeMarginY = 0;
    const badgePaddingX = 16;
    const badgePaddingY = 16;
    let badgeX = 40;
    let badgeY = y;
    let badgeCount = 0;
    for (let idx = 0; idx < statEntries.length; idx++) {
      if (badgeY - badgeHeight < 60) {
        page = pdfDoc.addPage([600, 800]);
        page.drawRectangle({ x: 0, y: 0, width: 600, height: 800, color: base1 });
        badgeY = 720;
        badgeX = 40;
        badgeCount = 0;
      }
      const [key, value] = statEntries[idx];
      page.drawRectangle({
        x: badgeX,
        y: badgeY - badgeHeight,
        width: badgeWidth,
        height: badgeHeight,
        borderColor: base2,
        borderWidth: 1.5,
        color: undefined
      });
      page.drawText(`${(statMap as Record<string, string>)[key]}:`, {
        x: badgeX + badgePaddingX,
        y: badgeY - badgePaddingY,
        size: 11,
        font,
        color: text1
      });
      let valueColor = text2;
      const percentKeys = [
        'totalPL','totalPLPercent', 'unrealizedPLPercent', 'realizedPLPercent', 'avgGain', 'avgLoss', 'realizedPL', 'unrealizedPL'
      ];
      if (percentKeys.includes(key)) {
        const num = parseFloat(String(value));
        if (!isNaN(num)) {
          valueColor = num > 0 ? positive : (num < 0 ? negative : text2);
        }
      }
      page.drawText(`${(statFormat as Record<string, (v: any) => string | number>)[key] ? (statFormat as Record<string, (v: any) => string | number>)[key](value) : value}`, {
        x: badgeX + badgePaddingX,
        y: badgeY - badgePaddingY - 13,
        size: 11,
        font,
        color: valueColor
      });
      badgeX += badgeWidth + badgeMarginX;
      badgeCount++;
      if (badgeCount % 3 === 0) {
        badgeX = 40;
        badgeY -= badgeHeight + badgeMarginY;
      }
    }
  y = badgeY - 40; // Increased margin to prevent overlap with stats
  y -= 20; // Additional space before biggest winner/loser section

    // --- Biggest Winner/Loser Section ---
    const { biggestWinner, biggestLoser } = (exportData.value.stats as ExportStats);
  const winnerColor = positive;
  const loserColor = negative;
    const cardWidth = 240;
    const cardHeight = 48;
    const cardPaddingX = 18;
    const cardPaddingY = 14;
    let cardX = 40;
    let cardY = y;
    if (biggestWinner) {
      if (cardY - cardHeight < 60) {
        page = pdfDoc.addPage([600, 800]);
        page.drawRectangle({ x: 0, y: 0, width: 600, height: 800, color: base1 });
        cardY = 720;
        cardX = 40;
      }
      page.drawRectangle({
        x: cardX,
        y: cardY - cardHeight,
        width: cardWidth,
        height: cardHeight,
        borderColor: winnerColor,
        borderWidth: 2,
        color: undefined
      });
      page.drawText('Biggest Winner', {
        x: cardX + cardPaddingX,
        y: cardY - cardPaddingY,
        size: 12,
        font,
        color: winnerColor
      });
      page.drawText(`Ticker: ${biggestWinner.ticker || '-'}`, {
        x: cardX + cardPaddingX,
        y: cardY - cardPaddingY - 13,
        size: 11,
        font,
        color: text1
      });
      page.drawText(`Amount: $${parseFloat(String(biggestWinner.amount ?? '0')).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`, {
        x: cardX + cardPaddingX + 110,
        y: cardY - cardPaddingY - 13,
        size: 11,
        font,
        color: positive
      });
      page.drawText(`Trades: ${biggestWinner.tradeCount || '-'}`, {
        x: cardX + cardPaddingX,
        y: cardY - cardPaddingY - 26,
        size: 10,
        font,
        color: text2
      });
      cardX += cardWidth + 24;
    }
    if (biggestLoser) {
      if (cardX + cardWidth > 600) {
        cardX = 40;
        cardY -= cardHeight + 18;
        if (cardY - cardHeight < 60) {
          page = pdfDoc.addPage([600, 800]);
          page.drawRectangle({ x: 0, y: 0, width: 600, height: 800, color: base1 });
          cardY = 720;
          cardX = 40;
        }
      }
      page.drawRectangle({
        x: cardX,
        y: cardY - cardHeight,
        width: cardWidth,
        height: cardHeight,
        borderColor: loserColor,
        borderWidth: 2,
        color: undefined
      });
      page.drawText('Biggest Loser', {
        x: cardX + cardPaddingX,
        y: cardY - cardPaddingY,
        size: 12,
        font,
        color: loserColor
      });
      page.drawText(`Ticker: ${biggestLoser.ticker || '-'}`, {
        x: cardX + cardPaddingX,
        y: cardY - cardPaddingY - 13,
        size: 11,
        font,
        color: text1
      });
      page.drawText(`Amount: -$${parseFloat(String(biggestLoser.amount ?? '0')).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`, {
        x: cardX + cardPaddingX + 110,
        y: cardY - cardPaddingY - 13,
        size: 11,
        font,
        color: negative
      });
      page.drawText(`Trades: ${biggestLoser.tradeCount || '-'}`, {
        x: cardX + cardPaddingX,
        y: cardY - cardPaddingY - 26,
        size: 10,
        font,
        color: text2
      });
      cardX += cardWidth + 24;
    }
    y = cardY - cardHeight - 30;

    // --- Positions Table ---
    const positions = exportData.value.portfolio || [];
    const posExcluded = ['_id', 'Username', 'PortfolioNumber'];
  let posHeaders = positions.length > 0 ? Object.keys(positions[0]).filter(h => !posExcluded.includes(h)) : [];
  // Rename latestClose to Close in headers
    posHeaders = posHeaders.map(h => {
      if (h === 'latestClose') return 'Close';
      if (h === 'currentValue') return 'Current Value';
    if (h === 'unrealizedPL') return 'PL';
      return h;
    });
    page.drawText('Positions', { x: 40, y: y, size: 13, font, color: accent1 });
    y -= 32; // Increased margin between header and table
    page.drawRectangle({ x: 40, y: y, width: 520, height: 22, color: base2 });
    posHeaders.forEach((h, idx) => {
      page.drawText(h, { x: 40 + 10 + idx * 90, y: y + 6, size: 11, font, color: text1 }); // Reduced column margin
    });
    y -= 22;
    let posRowsOnPage = 0;
    for (let i = 0; i < positions.length; i++) {
      if (y < 60) {
        page = pdfDoc.addPage([600, 800]);
        page.drawRectangle({ x: 0, y: 0, width: 600, height: 800, color: base1 });
        y = 770;
        // No '(cont.)' header, just continue table
        page.drawRectangle({ x: 40, y: y - 32, width: 520, height: 22, color: base2 });
        posHeaders.forEach((h, idx) => {
          page.drawText(h, { x: 40 + 10 + idx * 120, y: y - 32 + 6, size: 11, font, color: text1 });
        });
        y -= 54;
        posRowsOnPage = 0;
      }
      posHeaders.forEach((h, idx) => {
        let value;
        if (h === 'Close') {
          value = positions[i]['latestClose'];
        } else if (h === 'Current Value') {
          value = positions[i]['currentValue'];
          if (value !== undefined) {
            value = parseFloat(value).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
          }
        } else if (h === 'PL') {
          value = positions[i]['unrealizedPL'];
          if (value !== undefined) {
            value = parseFloat(value).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
          }
        } else {
          value = positions[i][h];
        }
        page.drawText(String(value), { x: 40 + 10 + idx * 90, y: y + 6, size: 10, font, color: text2 });
      });
      y -= 22;
      posRowsOnPage++;
    }
    y -= 30;

    // --- Trades Table ---
    const trades = exportData.value.transactionHistory || [];
    const tradeExcluded = ['_id', 'Username', 'PortfolioNumber'];
    let tradeHeaders = trades.length > 0 ? Object.keys(trades[0]).filter(h => !tradeExcluded.includes(h)) : [];
    // Rename Commission to Comm. and move Total to end
    tradeHeaders = tradeHeaders.map(h => h === 'Commission' ? 'Comm.' : h);
    const totalIdx = tradeHeaders.indexOf('Total');
    if (totalIdx !== -1) {
      const [totalCol] = tradeHeaders.splice(totalIdx, 1);
      tradeHeaders.push(totalCol);
    }
    page.drawText('Trades', { x: 40, y: y, size: 13, font, color: accent1 });
    y -= 32; // Increased margin between header and table
    page.drawRectangle({ x: 40, y: y, width: 520, height: 22, color: base2 });
    tradeHeaders.forEach((h, idx) => {
      page.drawText(h, { x: 40 + 10 + idx * 80, y: y + 6, size: 11, font, color: text1 });
    });
    y -= 22;
    let tradeRowsOnPage = 0;
    for (let i = 0; i < trades.length; i++) {
      if (y < 60) {
        page = pdfDoc.addPage([600, 800]);
        page.drawRectangle({ x: 0, y: 0, width: 600, height: 800, color: base1 });
        y = 770;
        // No '(cont.)' header, just continue table
        page.drawRectangle({ x: 40, y: y - 32, width: 520, height: 22, color: base2 });
        tradeHeaders.forEach((h, idx) => {
          page.drawText(h, { x: 40 + 10 + idx * 80, y: y - 32 + 6, size: 11, font, color: text1 });
        });
        y -= 54;
        tradeRowsOnPage = 0;
      }
      tradeHeaders.forEach((h, idx) => {
        let value;
        // Map header back to original key if needed
        if (h === 'Comm.') {
          value = trades[i]['Commission'];
          if (value === undefined || value === null) value = '-';
        } else if (h === 'Total') {
          value = trades[i]['Total'];
        } else if (h === 'Date') {
          // Format BSON date string to DD/MM/YYYY or trim if needed
          let d = trades[i]['Date'];
          if (d && typeof d === 'string') {
            // Try to parse ISO string
            const dateObj = new Date(d);
            if (!isNaN(dateObj.getTime())) {
              const day = String(dateObj.getDate()).padStart(2, '0');
              const month = String(dateObj.getMonth() + 1).padStart(2, '0');
              const year = dateObj.getFullYear();
              value = `${day}/${month}/${year}`;
            } else {
              // Fallback: trim to first 10 chars and reformat
              const trimmed = typeof d === 'string' ? d.slice(0, 10) : '';
              const parts = trimmed.split('-');
              if (parts.length === 3) {
                value = `${parts[2]}/${parts[1]}/${parts[0]}`;
              } else {
                value = trimmed;
              }
            }
          } else {
            value = d;
          }
        } else {
          value = trades[i][h];
        }
        page.drawText(String(value), { x: 40 + 10 + idx * 80, y: y + 6, size: 10, font, color: text2 });
      });
      y -= 22;
      tradeRowsOnPage++;
    }
    y -= 30;

    // Add disclaimer to the bottom of the last page, ensuring it does not overlap with the table
    const disclaimerLines = [
      'Disclaimer: This report and all data herein are for informational and educational purposes only, and do not constitute real financial transactions or financial advice.',
      'Ereuna (whether operated as an incorporated or non-incorporated business) is not a financial institution and does not handle, process, or facilitate any actual trades or investments.',
      'No information in this report should be interpreted as investment advice, recommendation, or an offer to buy or sell any financial instrument.',
      'Neither Ereuna, its owners, developers, nor any individual associated with the project, whether as a business entity or as a private individual, assume any responsibility or liability for any actions, losses, or decisions made based on this report.',
      'By using this report, you acknowledge and agree that all risk remains with you, and you expressly waive any and all claims against Ereuna, its owners, and its developers, regardless of the business structure.'
    ];
    const disclaimerFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const disclaimerFontSize = 9;
    const pageWidth = 600;
    const margin = 36; // 36px margin on each side
    const maxWidth = pageWidth - margin * 2;
    function wrapText(
      line: string,
      font: typeof disclaimerFont,
      fontSize: number,
      maxWidth: number
    ): string[] {
      const words = line.split(' ');
      let lines: string[] = [];
      let currentLine = '';
      for (let i = 0; i < words.length; i++) {
        const testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
        const width = font.widthOfTextAtSize(testLine, fontSize);
        if (width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = words[i];
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
      return lines;
    }
    // Flatten all disclaimer lines into wrapped lines
    let wrappedDisclaimerLines: string[] = [];
    disclaimerLines.forEach(line => {
      wrappedDisclaimerLines.push(...wrapText(line, disclaimerFont, disclaimerFontSize, maxWidth));
    });
    // Calculate required height for disclaimer
    const disclaimerHeight = wrappedDisclaimerLines.length * (disclaimerFontSize + 3);
    // Get the last page and check available space
    let lastPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
    // Find the lowest y used on the last page (y is decremented as content is added)
    // We use y from the last table/trade section, which is already decremented to below the content
    // y is still in scope from above, and is the current vertical position after all content
    // If not, set y = 60 (bottom margin)
    let minY = typeof y === 'number' ? y : 60;
    // If not enough space, add a new page for the disclaimer
    if (minY < disclaimerHeight + 32) {
      lastPage = pdfDoc.addPage([pageWidth, 800]);
      lastPage.drawRectangle({ x: 0, y: 0, width: pageWidth, height: 800, color: base1 });
      minY = 60;
    }
    // Draw disclaimer at the bottom, spaced from the bottom margin
    let yPos = 32 + (wrappedDisclaimerLines.length - 1) * (disclaimerFontSize + 3);
    wrappedDisclaimerLines.forEach(line => {
      const disclaimerWidth = disclaimerFont.widthOfTextAtSize(line, disclaimerFontSize);
      lastPage.drawText(line, {
        x: (pageWidth - disclaimerWidth) / 2,
        y: yPos,
        size: disclaimerFontSize,
        font: disclaimerFont,
        color: text2
      });
      yPos -= (disclaimerFontSize + 3);
    });

    // Download PDF
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `portfolio_export_${new Date().toISOString().slice(0,10)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    error.value = 'Failed to generate PDF.';
  }
}

// --- Export Portfolio Data ---
function exportPortfolioData() {
  // Helper to escape CSV values
  function escapeCSV(v: unknown): string {
    let str = String(v ?? '');
    // Remove all '-' characters from the value
    str = str.replace(/-/g, '');
    return '"' + str.replace(/"/g, '""') + '"';
  }

  // --- Stats Section ---
  const stats = exportData.value.stats || {};
  // Exclude Username, Number, portfolioValueHistory, tradeReturnsChart, and computed fields
  const statsExcluded = ['Username', 'Number', 'portfolioValueHistory', 'tradeReturnsChart', 'totalValue', 'unrealizedPL', 'baseValue'];
  const statsRows: [string, string][] = [];
  
  // Add BaseValue first
  if (stats.hasOwnProperty('BaseValue')) {
    statsRows.push(['BaseValue', escapeCSV(stats.BaseValue)]);
  }
  // Add cash second
  if (stats.hasOwnProperty('cash')) {
    statsRows.push(['cash', escapeCSV(stats.cash)]);
  }
  
  // Add all other stats
  Object.entries(stats).forEach(([key, value]) => {
    if (statsExcluded.includes(key) || key === 'BaseValue' || key === 'cash') return;
    // For objects (biggestWinner/Loser), flatten
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.entries(value).forEach(([subKey, subValue]) => {
        statsRows.push([`${key}.${subKey}`, escapeCSV(subValue)]);
      });
    } else if (Array.isArray(value)) {
      // For arrays (benchmarks), export as indexed rows
      value.forEach((item, index) => {
        statsRows.push([`${key}.${index}`, escapeCSV(item)]);
      });
    } else {
      statsRows.push([key, escapeCSV(value)]);
    }
  });
  
  let statsCSV = 'Stats\n' + statsRows.map(row => row.join(',')).join('\n');

  // --- Trades Section ---
  const trades = exportData.value.transactionHistory || [];
  // Exclude _id, Username, PortfolioNumber
  const tradeExcluded = ['_id', 'Username', 'PortfolioNumber'];
  let tradeHeaders: string[] = [];
  if (trades.length > 0) {
    tradeHeaders = Object.keys(trades[0]).filter(h => !tradeExcluded.includes(h));
  }
  let tradesCSV = 'Trades\n' + tradeHeaders.join(',') + '\n' + trades.map(doc => tradeHeaders.map(h => escapeCSV(doc[h])).join(',')).join('\n');

  // --- Positions Section ---
  const positions = exportData.value.portfolio || [];
  // Exclude _id, Username, PortfolioNumber, and computed fields
  const posExcluded = ['_id', 'Username', 'PortfolioNumber', 'currentValue', 'latestClose', 'unrealizedPL'];
  let posHeaders: string[] = [];
  if (positions.length > 0) {
    posHeaders = Object.keys(positions[0]).filter(h => !posExcluded.includes(h));
  }
  let positionsCSV = 'Positions\n' + posHeaders.join(',') + '\n' + positions.map(doc => posHeaders.map(h => escapeCSV(doc[h])).join(',')).join('\n');

  // Combine all sections: Positions before Trades
  const csvContent = [
    statsCSV,
    '',
    positionsCSV,
    '',
    tradesCSV
  ].join('\n\n');

  // Download
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `portfolio_export_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
</script>

<style scoped>
.download-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(24, 25, 38, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(2px);
}
.download-modal {
  position: relative;
  background: var(--base2);
  color: var(--text3);
  border-radius: 18px;
  padding: 36px 32px 28px 32px;
  min-width: 340px;
  box-shadow: 0 8px 32px 0 rgba(0,0,0,0.18), 0 1.5px 8px 0 var(--accent4);
  display: flex;
  flex-direction: column;
  gap: 18px;
  animation: popup-in 0.18s cubic-bezier(.4,1.4,.6,1) backwards;
  text-align: center;
}
@keyframes popup-in {
  from { transform: translateY(30px) scale(0.98); opacity: 0; }
  to   { transform: none; opacity: 1; }
}
.download-modal h3 {
  margin: 0 0 12px 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--accent1);
  letter-spacing: 0.01em;
}
.download-modal p {
  color: var(--text2);
  font-size: 1rem;
  margin-bottom: 18px;
}
.download-options {
  display: flex;
  gap: 8px;
  justify-content: center;
}
.download-error {
  color: var(--negative);
  margin-top: 12px;
  font-size: 1.05em;
}
.download-actions {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  justify-content: flex-end;
}
.trade-btn {
  background: var(--accent1);
  color: var(--text3);
  border: none;
  border-radius: 7px;
  padding: 10px 24px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.18s;
}
.trade-btn:hover {
  background: var(--accent2);
}

.input {
  margin: 0 auto 18px auto;
  display: block;
  background: var(--base1);
  color: var(--text1);
  border-radius: 7px;
  border: 1.5px solid var(--base3);
  padding: 10px 12px;
  font-size: 1.08rem;
  outline: none;
  transition: border-color 0.18s;
  cursor: pointer;
}
.input:focus {
  border-color: var(--accent1);
  background: var(--base4);
}
</style>