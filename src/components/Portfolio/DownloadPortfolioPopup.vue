<template>
  <div class="download-modal-overlay" @click="$emit('close')">
    <div class="download-modal" @click.stop>
      <h3>Download Portfolio</h3>
      <div class="download-options">
        <button class="input" @click="downloadPDF">PDF (for presentation and sharing.)</button>
        <button class="input" @click="downloadCSV">CSV (for import/export, data only.)</button>
      </div>
      <div v-if="error" class="download-error">{{ error }}</div>
      <div class="download-actions">
        <button class="trade-btn" @click="$emit('close')">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import ereunaLogo from '@/assets/icons/ereuna.png';

const props = defineProps({
  portfolio: Array,
  transactionHistory: Array,
  cash: Number,
  stats: Object,
  biggestWinner: Object,
  biggestLoser: Object
});
const error = ref('');

async function downloadPDF() {
  error.value = '';
  try {
    // Color definitions from CSS variables
    const accent1 = rgb(0.549, 0.553, 0.996); // #8c8dfe
    const text1 = rgb(0.753, 0.792, 0.961);   // #c0caf5
    const text2 = rgb(0.663, 0.694, 0.839);   // #a9b1d6
    const base1 = rgb(0.102, 0.106, 0.149);   // #1a1b26

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);

    // Custom background
    page.drawRectangle({
      x: 0,
      y: 0,
      width: 600,
      height: 800,
      color: base1
    });

    // Add logo (original width, not squashed, previous position)
    const logoImg = await fetch(ereunaLogo).then(res => res.arrayBuffer());
    const logo = await pdfDoc.embedPng(logoImg);
    // Use original width, scale height proportionally, position at x:30, y:740
    page.drawImage(logo, {
      x: 30,
      y: 740,
      width: 160,
      height: 60,
    });

    // Add title (top right)
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const title = 'Portfolio Report';
    const titleSize = 15;
    // Calculate text width for right alignment
    const titleWidth = font.widthOfTextAtSize(title, titleSize);
    // Date string
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const dateStr = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const dateFontSize = 11;
    const dateWidth = font.widthOfTextAtSize(dateStr, dateFontSize);
    // Draw title
    page.drawText(title, {
      x: 600 - 40 - titleWidth,
      y: 770,
      size: titleSize,
      font,
      color: accent1
    });
    // Draw date to the right of the title, with a small gap
    page.drawText(dateStr, {
      x: 600 - 40 - dateWidth,
      y: 750,
      size: dateFontSize,
      font,
      color: text2
    });

    // Stats as badges (first section)
    let y = 720;
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
    const statFormat = {
      totalValue: v => `$${parseFloat(v).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`,
      baseValue: v => `$${parseFloat(v).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`,
      activePositions: v => v,
      cash: v => `$${parseFloat(v).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`,
      totalPL: v => `$${parseFloat(v).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`,
      totalPLPercent: v => `${parseFloat(v).toFixed(2)}%`,
      unrealizedPL: v => `$${parseFloat(v).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`,
      unrealizedPLPercent: v => `${parseFloat(v).toFixed(2)}%`,
      realizedPL: v => `$${parseFloat(v).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`,
      realizedPLPercent: v => `${parseFloat(v).toFixed(2)}%`,
      avgPositionSize: v => `${parseFloat(v).toFixed(2)}%`,
      avgHoldTimeWinners: v => `${parseFloat(v).toFixed(2)} days`,
      avgHoldTimeLosers: v => `${parseFloat(v).toFixed(2)} days`,
      avgGain: v => `${parseFloat(v).toFixed(2)}%`,
      avgLoss: v => `${parseFloat(v).toFixed(2)}%`,
      avgGainAbs: v => `$${parseFloat(v).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`,
      avgLossAbs: v => `$${parseFloat(v).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`,
      gainLossRatio: v => `${parseFloat(v).toFixed(2)}`,
      riskRewardRatio: v => `${parseFloat(v).toFixed(2)}`,
      winnerCount: v => v,
      winnerPercent: v => `${parseFloat(v).toFixed(2)}%`,
      loserCount: v => v,
      loserPercent: v => `${parseFloat(v).toFixed(2)}%`,
      breakevenCount: v => v,
      breakevenPercent: v => `${parseFloat(v).toFixed(2)}%`,
      profitFactor: v => `${parseFloat(v).toFixed(2)}`,
      sortinoRatio: v => `${parseFloat(v).toFixed(2)}`,
    };
  const base2 = rgb(0.141, 0.157, 0.231); // #24283b
  const positive = rgb(0.298, 0.686, 0.314); // #4caf50
  const negative = rgb(0.565, 0.749, 0.976); // #90bff9
    // Prepare stat entries
    const statEntries = Object.entries(props.stats || {}).filter(([key, value]) => statMap[key] && typeof value !== 'object');
    const badgeWidth = 174;
    const badgeHeight = 40;
    const badgeMarginX = 0;
    const badgeMarginY = 0;
    const badgePaddingX = 16;
    const badgePaddingY = 16;
    let badgeX = 40;
    let badgeY = y;
    let badgeCount = 0;
    statEntries.forEach(([key, value], idx) => {
      // Draw badge border
      page.drawRectangle({
        x: badgeX,
        y: badgeY - badgeHeight,
        width: badgeWidth,
        height: badgeHeight,
        borderColor: base2,
        borderWidth: 1.5,
        color: undefined
      });
      // Draw attribute label
      page.drawText(`${statMap[key]}:`, {
        x: badgeX + badgePaddingX,
        y: badgeY - badgePaddingY,
        size: 11,
        font,
        color: text1
      });
      // Determine value color for percentage attributes
      let valueColor = text2;
      const percentKeys = [
        'totalPL','totalPLPercent', 'unrealizedPLPercent', 'realizedPLPercent', 'avgGain', 'avgLoss', 'realizedPL', 'unrealizedPL'
      ];
      if (percentKeys.includes(key)) {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          valueColor = num > 0 ? positive : (num < 0 ? negative : text2);
        }
      }
      // Draw value
      page.drawText(`${statFormat[key] ? statFormat[key](value) : value}`, {
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
    });
  // Update y for next section (reduce gap between tables)
  y = badgeY - 5; // Use a small gap (5px)

    // Special row for biggest winner/loser (after stats)
    if (props.biggestWinner && props.biggestLoser) {
      const winner = props.biggestWinner;
      const loser = props.biggestLoser;
      const rowY = y;
      const badgeWidth = 261;
      const badgeHeight = 70;
      const badgePaddingX = 16;
      const badgePaddingY = 16;
      // Winner badge
      page.drawRectangle({
        x: 40,
        y: rowY - badgeHeight,
        width: badgeWidth,
        height: badgeHeight,
        borderColor: base2,
        borderWidth: 1.5,
        color: undefined
      });
      page.drawText('Biggest Winner:', {
        x: 40 + badgePaddingX,
        y: rowY - badgePaddingY,
        size: 11,
        font,
        color: positive
      });
      let attrY = rowY - badgePaddingY - 15;
      page.drawText('Ticker:', { x: 40 + badgePaddingX, y: attrY, size: 10, font, color: text2 });
      page.drawText(`${winner.ticker || ''}`, { x: 40 + badgePaddingX + 60, y: attrY, size: 10, font, color: positive });
      attrY -= 13;
      page.drawText('Amount:', { x: 40 + badgePaddingX, y: attrY, size: 10, font, color: text2 });
      page.drawText(`$${winner.amount?.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) || ''}`, { x: 40 + badgePaddingX + 60, y: attrY, size: 10, font, color: positive });
      attrY -= 13;
      page.drawText('Trades:', { x: 40 + badgePaddingX, y: attrY, size: 10, font, color: text2 });
      page.drawText(`${winner.tradeCount || ''}`, { x: 40 + badgePaddingX + 60, y: attrY, size: 10, font, color: text2 });
      // Loser badge
      page.drawRectangle({
        x: 40 + badgeWidth + 0,
        y: rowY - badgeHeight,
        width: badgeWidth,
        height: badgeHeight,
        borderColor: base2,
        borderWidth: 1.5,
        color: undefined
      });
      page.drawText('Biggest Loser:', {
        x: 40 + badgeWidth + badgePaddingX,
        y: rowY - badgePaddingY,
        size: 11,
        font,
        color: negative
      });
      attrY = rowY - badgePaddingY - 15;
      page.drawText('Ticker:', { x: 40 + badgeWidth + badgePaddingX, y: attrY, size: 10, font, color: text2 });
      page.drawText(`${loser.ticker || ''}`, { x: 40 + badgeWidth + badgePaddingX + 60, y: attrY, size: 10, font, color: negative });
      attrY -= 13;
      page.drawText('Amount:', { x: 40 + badgeWidth + badgePaddingX, y: attrY, size: 10, font, color: text2 });
      page.drawText(`-$${loser.amount?.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) || ''}`, { x: 40 + badgeWidth + badgePaddingX + 60, y: attrY, size: 10, font, color: negative });
      attrY -= 13;
      page.drawText('Trades:', { x: 40 + badgeWidth + badgePaddingX, y: attrY, size: 10, font, color: text2 });
      page.drawText(`${loser.tradeCount || ''}`, { x: 40 + badgeWidth + badgePaddingX + 60, y: attrY, size: 10, font, color: text2 });
      y = rowY - badgeHeight - 12;
    }
    y -= 18;
    // Portfolio Positions Table (moved up)
    page.drawText('Active Positions:', { x: 40, y, size: 15, font, color: accent1 });
    y -= 18;
    const headers = ['Symbol', 'Shares', 'Avg Price', 'Current Price', 'Total Value', 'PnL ($)', 'PnL (%)'];
    let xStart = 40;
    let colWidths = [70, 60, 70, 90, 90, 70, 70];
    headers.forEach((h, i) => {
      page.drawText(h, { x: xStart + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, size: 11, font, color: text1 });
    });
    y -= 14;
    props.portfolio.forEach((item, idx) => {
      const symbol = item.Symbol || item.ticker || '-';
      const shares = item.Shares !== undefined ? item.Shares : '-';
      const avgPrice = item.AvgPrice !== undefined ? `$${Number(item.AvgPrice).toFixed(2)}` : '-';
      const currentPrice = item.CurrentPrice !== undefined ? `$${Number(item.CurrentPrice).toFixed(2)}` : '-';
      const totalValue = item.TotalValue !== undefined ? `$${Number(item.TotalValue).toFixed(2)}` : '-';
      const pnlDollar = item.PnLDollar !== undefined ? `$${Number(item.PnLDollar).toFixed(2)}` : '-';
      const pnlPercent = item.PnLPercent !== undefined ? `${Number(item.PnLPercent).toFixed(2)}%` : '-';
      const row = [symbol, shares, avgPrice, currentPrice, totalValue, pnlDollar, pnlPercent];
      row.forEach((v, i) => {
        page.drawText(String(v), { x: xStart + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, size: 10, font, color: text2 });
      });
      y -= 13;
      if (y < 60) return;
    });
    y -= 10;
    // Transaction History Table (last, sorted by most recent)
    page.drawText('Transaction History:', { x: 40, y, size: 15, font, color: accent1 });
    y -= 18;
    const txHeaders = ['Date', 'Symbol', 'Action', 'Shares', 'Price', 'Commission', 'Total'];
    txHeaders.forEach((h, i) => {
      page.drawText(h, { x: xStart + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, size: 11, font, color: text1 });
    });
    y -= 14;
    // Sort transactionHistory by date descending
    const sortedTx = [...(props.transactionHistory || [])].sort((a, b) => {
      const dateA = new Date(a.Date);
      const dateB = new Date(b.Date);
      return dateB - dateA;
    });
    sortedTx.forEach((tx, idx) => {
      const date = tx.Date ? tx.Date.slice(0, 10) : '-';
      const symbol = tx.Symbol || '-';
      const action = tx.Action || '-';
      const shares = tx.Shares !== undefined ? tx.Shares : '-';
      const price = tx.Price !== undefined ? `$${Number(tx.Price).toFixed(2)}` : '-';
      const commission = tx.Commission !== undefined ? `$${Number(tx.Commission).toFixed(2)}` : '-';
      const total = tx.Total !== undefined ? `$${Number(tx.Total).toFixed(2)}` : '-';
      const row = [date, symbol, action, shares, price, commission, total];
      row.forEach((v, i) => {
        page.drawText(String(v), { x: xStart + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, size: 10, font, color: text2 });
      });
      y -= 13;
      if (y < 40) return;
    });

    // Download PDF
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'portfolio_report.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    error.value = 'Failed to generate PDF.';
  }
}

function downloadCSV() {
  error.value = '';
  alert('CSV download will be implemented here.');
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