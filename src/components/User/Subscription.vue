<template>
  <div>
    <div class="subscription-meter">
  <h1 class="subscription-title">{{ t('subscription.title') }}</h1>
      <div class="meter-labels">
        <span><strong>{{ t('subscription.username') }}:</strong> {{ user }}</span>
        <span><strong>{{ t('subscription.daysLeft') }}:</strong> {{ expirationDays !== null ? expirationDays : t('common.loading') }}</span>
  <span><strong>{{ t('subscription.moneyLeft') }}:</strong> {{ expirationDays !== null ? ((14.99 / 30) * expirationDays).toFixed(2) : '0.00' }}€</span>
      </div>
      <div class="subscription-actions" style="margin-top: 18px;">
  <button class="userbtn" @click="showRenew = true" :aria-label="t('subscription.renew')">{{ t('subscription.renew') }}</button>
  <button class="userbtn refund-btn" @click="handleRefundClick" :aria-label="t('subscription.askForRefund')">{{ t('subscription.askForRefund') }}</button>
      </div>
      <RenewPopup 
        v-if="showRenew" 
        :user="user" 
        :apiKey="apiKey" 
        @close="showRenew = false" 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="renew-title"
      />
      <RefundPopup
        v-if="showRefund && refundProps"
        v-bind="refundProps"
        @close="showRefund = false"
        role="dialog"
        aria-modal="true"
        aria-labelledby="refund-title"
      />
  <NotificationPopup ref="notification" role="alert" aria-live="polite" />
    </div>
    <div class="receipts">
      <h1>{{ t('receipts.title') }}</h1>
      <div class="receipt-header">
        <p class="receipt-header-date" style="flex:1; font-weight: bold;">{{ t('receipts.paymentDate') }}</p>
        <p class="receipt-header-amount" style="flex:1; font-weight: bold;">{{ t('receipts.amount') }}</p>
        <p class="receipt-header-method" style="flex:1; font-weight: bold;">{{ t('receipts.paidWith') }}</p>
        <p class="receipt-header-plan" style="flex:1; font-weight: bold;">{{ t('receipts.subscriptionPlan') }}</p>
        <p class="receipt-header-download" style="flex:1; font-weight: bold;">{{ t('receipts.download') }}</p>
      </div>
      <div v-if="loading">{{ t('receipts.loading') }}</div>
      <div style="background-color: var(--base2); padding: 3px;" v-if="receipts.length === 0">
        <p>{{ t('receipts.noReceipts') }}</p>
      </div>
      <div v-else>
  <div v-for="receipt in receipts" :key="(receipt as Receipt)._id" class="receipt-item">
  <p class="receipt-date receipt-date-desktop" style="flex:1; text-align: center;">{{ formatDate(receipt.Date) }}</p>
  <p class="receipt-date receipt-date-mobile" style="flex:1; text-align: center;">{{ formatShortDate(receipt.Date) }}</p>
    <p class="receipt-amount" style="flex:1; text-align: center;">{{ (receipt.Amount) / 100 }}€</p>
    <p class="receipt-method" style="flex:1; text-align: center;">{{ formatMethod(receipt.Method) }}</p>
    <p class="receipt-plan" style="flex:1; text-align: center;">{{ formatShortSubscription(receipt.Subscription) }}</p>
  <div class="download-cell receipt-download">
    <button
      class="downloadbtn"
      @click="downloadReceipt(receipt)"
      :aria-label="`Download receipt ${receipt._id}`"
      :disabled="!!downloading[(receipt as Receipt)._id]"
    >
      <template v-if="downloading[(receipt as Receipt)._id]">
        <span class="loader4" aria-hidden="true">
          <svg class="spinner" viewBox="0 0 50 50">
            <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5" />
          </svg>
        </span>
      </template>
      <template v-else>
        <svg class="icon3" viewBox="0 0 24.00 24.00" fill="var(--text3)" xmlns="http://www.w3.org/2000/svg" stroke="var(--text3)" stroke-width="0.696">
          <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
          <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
          <g id="SVGRepo_iconCarrier">
            <path d="M12.5535 16.5061C12.4114 16.6615 12.2106 16.75 12 16.75C11.7894 16.75 11.5886 16.6615 11.4465 16.5061L7.44648 12.1311C7.16698 11.8254 7.18822 11.351 7.49392 11.0715C7.79963 10.792 8.27402 10.8132 8.55352 11.1189L11.25 14.0682V3C11.25 2.58579 11.5858 2.25 12 2.25C12.4142 2.25 12.75 2.58579 12.75 3V14.0682L15.4465 11.1189C15.726 10.8132 16.2004 10.792 16.5061 11.0715C16.8118 11.351 16.833 11.8254 16.5535 12.1311L12.5535 16.5061Z" fill="var(--text3)"/>
            <path d="M3.75 15C3.75 14.5858 3.41422 14.25 3 14.25C2.58579 14.25 2.25 14.5858 2.25 15V15.0549C2.24998 16.4225 2.24996 17.5248 2.36652 18.3918C2.48754 19.2919 2.74643 20.0497 3.34835 20.6516C3.95027 21.2536 4.70814 21.5125 5.60825 21.6335C6.47522 21.75 7.57754 21.75 8.94513 21.75H15.0549C16.4225 21.75 17.5248 21.75 18.3918 21.6335C19.2919 21.5125 20.0497 21.2536 20.6517 20.6516C21.2536 20.0497 21.5125 19.2919 21.6335 18.3918C21.75 17.5248 21.75 16.4225 21.75 15.0549V15C21.75 14.5858 21.4142 14.25 21 14.25C20.5858 14.25 20.25 14.5858 20.25 15C20.25 16.4354 20.2484 17.4365 20.1469 18.1919C20.0482 18.9257 19.8678 19.3142 19.591 19.591C19.3142 19.8678 18.9257 20.0482 18.1919 20.1469C17.4365 20.2484 16.4354 20.25 15 20.25H9C7.56459 20.25 6.56347 20.2484 5.80812 20.1469C5.07435 20.0482 4.68577 19.8678 4.40901 19.591C4.13225 19.3142 3.9518 18.9257 3.85315 18.1919C3.75159 17.4365 3.75 16.4354 3.75 15Z" fill="var(--text3)"/>
          </g>
        </svg>
      </template>
    </button>
  </div>
        </div>
      </div>
       <div class="mobile-download-info">
        {{ t('receipts.downloadDesktopOnly') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import ereunaLogoSvg from '@/assets/icons/ereuna.svg';
import RenewPopup from './Renew.vue';
import RefundPopup from './Refund.vue';
import NotificationPopup from '@/components/NotificationPopup.vue';

const { t } = useI18n();

interface Receipt {
  _id: string;
  Date: string;
  Amount: number;
  Method: string;
  Subscription: number;
  VAT?: number;
  Country?: string;
  PaymentIntentId: string;
}


const expirationDays = ref<number | null>(null);
const receipts = ref<Receipt[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const showRenew = ref(false);
const showRefund = ref(false);
const notification = ref<InstanceType<typeof NotificationPopup> | null>(null);
// Track per-receipt download/loading state to prevent double-clicks
const downloading = ref<Record<string, boolean>>({});

// Convert SVG to PNG for PDF embedding with fixed dark color for receipts (white background)
async function embedSvgAsImage(pdfDoc: any, svgUrl: string): Promise<any> {
  return new Promise(async (resolve, reject) => {
    try {
      // Fetch the SVG as text
      const response = await fetch(svgUrl);
      const svgText = await response.text();
      
      // Replace the fill color with our fixed dark color #16161e
      const darkSvg = svgText.replace(/fill="#F0F2F5"/g, 'fill="#16161e"');
      
      // Create a blob and object URL from the modified SVG
      const blob = new Blob([darkSvg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(async (pngBlob) => {
          URL.revokeObjectURL(url);
          if (!pngBlob) {
            reject(new Error('Could not convert canvas to blob'));
            return;
          }
          const arrayBuffer = await pngBlob.arrayBuffer();
          try {
            const embeddedImage = await pdfDoc.embedPng(arrayBuffer);
            resolve(embeddedImage);
          } catch (err) {
            reject(err);
          }
        }, 'image/png');
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load SVG image'));
      };
      img.src = url;
    } catch (err) {
      reject(err);
    }
  });
}

const props = defineProps({
  user: {
    type: String,
    required: true
  },
  apiKey: {
    type: String,
    required: true
  },
  formatDate: {
    type: Function,
    required: true
  }
  ,
  // Optional prop to allow callers to set logo width; height will scale
  logoWidth: {
    type: Number,
    required: false
  }
});

// Create a function to get the expiration date
async function getExpirationDate() {
  try {
    const response = await fetch(`/api/get-expiration-date/?user=${encodeURIComponent(props.user)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': props.apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
  expirationDays.value = null;
      return;
    }

    const data = await response.json();

    if (data.expirationDays !== undefined) {
      expirationDays.value = data.expirationDays; // Set the number of days remaining
    } else {
  expirationDays.value = null;
    }
  } catch (err) {
    let errorMsg = 'Unknown error';
    if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as any).message === 'string') {
      errorMsg = (err as any).message;
    } else if (typeof err === 'string') {
      errorMsg = err;
    }
    error.value = errorMsg;
    expirationDays.value = null;
  }
}

let selectedOption = ref(1);
let selectedpay = ref();

function selectOption(option: number) {
  selectedOption.value = option;
}

function selectPay(option: number) {
  selectedpay.value = option;
}

onMounted(() => {
  selectOption(1); // Set default subscription option
  selectPay(4);
});

// Add this function in the script section
async function GetReceipts() {
  loading.value = true;
  error.value = null;
  try {
    const response = await fetch(`/api/get-receipts/${props.user}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': props.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch receipts');
    }

    const data = await response.json();
    receipts.value = data.receipts;
  } catch (err) {
    let errorMsg = 'Unknown error';
    if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as any).message === 'string') {
      errorMsg = (err as any).message;
    } else if (typeof err === 'string') {
      errorMsg = err;
    }
    error.value = errorMsg;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  getExpirationDate();
  GetReceipts();
});

// Format date as DD/MM/YY
const formatShortDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

// Shorten method label for mobile
const formatMethod = (method: string) => {
  if (method.toLowerCase().includes('credit')) return t('receipts.paymentMethod.card');
  if (method.toLowerCase().includes('crypto')) return t('receipts.paymentMethod.crypto');
  return method;
};

// Shorten subscription plan for mobile
const formatShortSubscription = (subscriptionValue: number) => {
  return (subscriptionValue === 1 ? t('subscription.duration.oneMonthShort')
    : subscriptionValue === 4 ? t('subscription.duration.fourMonthsShort')
    : subscriptionValue === 6 ? t('subscription.duration.sixMonthsShort')
    : subscriptionValue === 12 ? t('subscription.duration.oneYearShort')
    : t('subscription.duration.unknown'));
};

// Refund eligibility logic
const getMostRecentReceipt = () => {
  if (!receipts.value.length) return null;
  // Sort by date descending
  return receipts.value.slice().sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime())[0];
};

const isRefundEligible = computed(() => {
  const receipt = getMostRecentReceipt();
  if (!receipt) return false;
  const purchaseDate = new Date(receipt.Date);
  const now = new Date();
  const diffDays = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 14;
});

const refundProps = computed(() => {
  const receipt = getMostRecentReceipt();
  if (!receipt) return null;
  return {
    amountPaid: receipt.Amount / 100,
    daysLeft: expirationDays.value ?? 0,
    purchaseDate: receipt.Date,
    vatPercent: receipt.VAT || 0,
    eligible: isRefundEligible.value,
    user: props.user,
    apiKey: props.apiKey,
    paymentIntentId: receipt.PaymentIntentId // Use lowercase for backend contract
  };
});

function handleRefundClick() {
  if (!isRefundEligible.value) {
    if (notification.value) {
      notification.value.show(t('refund.notEligible'));
    }
    return;
  }
  showRefund.value = true;
}

// Generate a simple receipt PDF client-side and trigger download
async function downloadReceipt(receipt: Receipt) {
  try {
    // A4 portrait in points (approx 595 x 842)
    const pageWidth = 595;
    const pageHeight = 842;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([pageWidth, pageHeight]);

  // Colors (print-friendly: white background, dark text)
  const accent = rgb(0.2, 0.25, 0.9);
  const text = rgb(0.07, 0.07, 0.08);
  const muted = rgb(0.38, 0.42, 0.5);
  const background = rgb(1, 1, 1);

  // White background for easy printing
  page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: background });

    // Fonts
      const rAny: any = receipt as any;
      const id = typeof rAny._id === 'string' ? rAny._id : (rAny._id && (rAny._id.$oid || String(rAny._id))) || String(rAny._id);
      if (downloading.value[id]) return; // already generating
      // mark as downloading
      downloading.value = { ...downloading.value, [id]: true };
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Try to add logo (non-fatal). Compute height from intrinsic image size so
    // the image keeps its aspect ratio when we specify a target width.
    // Convert SVG to PNG for PDF embedding with fixed dark color
    try {
      const logoImg: any = await embedSvgAsImage(pdfDoc, ereunaLogoSvg);
  // Allow manual width via prop; fallback to 140 if not provided
  const logoWidth = Number(props.logoWidth ?? 140);
      // pdf-lib image objects expose width/height; fallback safely if not present
      const origW = (logoImg && (logoImg.width || (logoImg.scale ? logoImg.scale(1).width : undefined))) as number | undefined;
      const origH = (logoImg && (logoImg.height || (logoImg.scale ? logoImg.scale(1).height : undefined))) as number | undefined;
      let logoHeight = 50; // sensible default if we can't read intrinsic size
      if (origW && origH) {
        logoHeight = Math.round(origH * (logoWidth / origW));
      }
      // Position the logo near the top of the page
      const logoTop = pageHeight - 40;
      const logoY = logoTop - logoHeight;
      page.drawImage(logoImg, { x: 20, y: logoY, width: logoWidth, height: logoHeight });
    } catch (e) {
      // ignore image embedding errors (non-fatal)
    }

    // Seller info (left) and receipt title (right)
  const sellerName = 'Ereuna';
  const sellerContact = 'contact@ereuna.io';
    const sellerAddress = 'Online Service';
    const sellerVAT = 'N/A';

  // Defensive extraction for IDs: server may return BSON-like objects ({ $oid }) or plain strings
  const r: any = receipt as any;
  const receiptId = typeof r._id === 'string' ? r._id : (r._id && (r._id.$oid || String(r._id))) || String(r._id);
  const userId = r.UserID ? (typeof r.UserID === 'string' ? r.UserID : (r.UserID.$oid || String(r.UserID))) : '';

    // Title block
    page.drawText(sellerName, { x: 40, y: pageHeight - 140, size: 12, font: fontBold, color: text });
    page.drawText(sellerContact, { x: 40, y: pageHeight - 156, size: 9, font, color: muted });
    page.drawText(sellerAddress, { x: 40, y: pageHeight - 170, size: 9, font, color: muted });
    page.drawText(`VAT: ${sellerVAT}`, { x: 40, y: pageHeight - 184, size: 9, font, color: muted });

    // Right column: Receipt title & meta
    const d = new Date(receipt.Date);
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

    // meta-area drawing moved below where tableX/descMaxWidth and wrapText are declared

  // Draw a section separator
  page.drawLine({ start: { x: 36, y: pageHeight - 196 }, end: { x: pageWidth - 36, y: pageHeight - 196 }, thickness: 0.5, color: muted });

    // Itemised table header
    const tableX = 40;
    let tableY = pageHeight - 220;
    page.drawText('Description', { x: tableX, y: tableY, size: 11, font: fontBold, color: text });
    page.drawText('Qty', { x: tableX + 300, y: tableY, size: 11, font: fontBold, color: text });
    page.drawText('Unit Price', { x: tableX + 340, y: tableY, size: 11, font: fontBold, color: text });
    page.drawText('Total', { x: tableX + 460, y: tableY, size: 11, font: fontBold, color: text });

    tableY -= 18;

    // Utility to convert subscription numeric values to human-friendly labels
    function subscriptionFullLabel(value: number) {
      return value === 1 ? t('subscription.duration.oneMonth')
        : value === 4 ? t('subscription.duration.fourMonths')
        : value === 6 ? t('subscription.duration.sixMonths')
        : value === 12 ? t('subscription.duration.oneYear')
        : String(value);
    }

    // Text wrapping helper
    function wrapText(line: string, fontRef: any, fontSize: number, maxWidth: number) {
      const words = line.split(' ');
      const lines: string[] = [];
      let current = '';
      for (let i = 0; i < words.length; i++) {
        const test = current ? current + ' ' + words[i] : words[i];
        const w = fontRef.widthOfTextAtSize(test, fontSize);
        if (w > maxWidth && current) {
          lines.push(current);
          current = words[i];
        } else {
          current = test;
        }
      }
      if (current) lines.push(current);
      return lines;
    }

    // Single line item for subscription
    const description = `Subscription - ${subscriptionFullLabel(Number(receipt.Subscription))}`;
    const qty = 1;
    const gross = (Number(receipt.Amount) || 0) / 100; // assume cents
    const vatRate = (typeof receipt.VAT === 'number') ? receipt.VAT : (typeof receipt.VAT === 'string' ? Number(receipt.VAT) : 0);

    // Assume Amount is gross (paid total). Compute VAT portion and net (safe default)
    const vatPortion = vatRate > 0 ? (gross * vatRate) / (1 + vatRate) : 0;
    const net = gross - vatPortion;

    // Wrap description to available width (unit column starts at 300)
    const descMaxWidth = 300; // space before qty column
    const descLines = wrapText(description, font, 11, descMaxWidth);
    let lineY = tableY;
    for (const ln of descLines) {
      page.drawText(ln, { x: tableX, y: lineY, size: 11, font, color: muted });
      lineY -= 14;
    }
    // Draw qty/unit/total aligned with first description line
    page.drawText(String(qty), { x: tableX + 300, y: tableY, size: 11, font, color: muted });
    page.drawText(`${net.toFixed(2)} €`, { x: tableX + 340, y: tableY, size: 11, font, color: muted });
    page.drawText(`${gross.toFixed(2)} €`, { x: tableX + 460, y: tableY, size: 11, font, color: muted });

    // Move totals down by number of wrapped lines
    const wrappedLineCount = Math.max(1, descLines.length);

    // Totals block
  let totalsY = tableY - 40 - (wrappedLineCount - 1) * 14;
    page.drawText('Subtotal:', { x: tableX + 340, y: totalsY, size: 11, font, color: muted });
    page.drawText(`${net.toFixed(2)} €`, { x: tableX + 460, y: totalsY, size: 11, font, color: muted });
    totalsY -= 16;
    page.drawText(`VAT (${(vatRate * 100).toFixed(0)}%):`, { x: tableX + 340, y: totalsY, size: 11, font, color: muted });
    page.drawText(`${vatPortion.toFixed(2)} €`, { x: tableX + 460, y: totalsY, size: 11, font, color: muted });
    totalsY -= 18;
    page.drawText('Total Paid:', { x: tableX + 340, y: totalsY, size: 13, font: fontBold, color: text });
    page.drawText(`${gross.toFixed(2)} €`, { x: tableX + 460, y: totalsY, size: 13, font: fontBold, color: text });

    // Payment details
    let detailY = totalsY - 40;
    page.drawText(`${t('subscription.paymentMethod')}: ${formatMethod(receipt.Method)}`, { x: tableX, y: detailY, size: 10, font, color: muted });
    detailY -= 14;
    page.drawText(`${t('subscription.paymentIntent')}: ${receipt.PaymentIntentId || '-'}`, { x: tableX, y: detailY, size: 10, font, color: muted });
    detailY -= 14;
    page.drawText(`${t('subscription.country')}: ${receipt.Country || '-'}`, { x: tableX, y: detailY, size: 10, font, color: muted });

    // Compute layout bounds so long IDs don't overflow the page. We'll place metadata in the
    // central/right area and wrap lines if necessary instead of truncating.
    const leftColumnEnd = tableX + descMaxWidth; // align with descMaxWidth used above
    const pageRightMargin = 36;
    const metaAreaX = leftColumnEnd + 20;
    const metaAreaWidth = Math.max(120, pageWidth - metaAreaX - pageRightMargin);

    const metaFontSize = 9;

    // Helper to draw wrapped metadata lines in the meta area
    function drawMetaWrapped(textLine: string, startY: number) {
      const wrapped = wrapText(textLine, font, metaFontSize, metaAreaWidth);
      let y = startY;
      for (const wln of wrapped) {
        page.drawText(wln, { x: metaAreaX, y, size: metaFontSize, font, color: muted });
        y -= metaFontSize + 2;
      }
      return y; // return last y position (bottom of block)
    }

  // Draw payment date and long IDs in meta area so they don't overflow the page width
  page.drawText(`Payment Date: ${dateStr}`, { x: metaAreaX, y: pageHeight - 140, size: metaFontSize, font, color: muted });
    let metaY = pageHeight - 156;
    metaY = drawMetaWrapped(`Receipt #: ${receiptId}`, metaY);
    if (userId) {
      metaY = drawMetaWrapped(`User ID: ${userId}`, metaY - 6);
    }

    // Refund instructions and footer (use wrapped lines)
    const footerY = 80;
    const footerLines = [
      t('receipts.pdfFooter.refundInfo'),
      t('receipts.pdfFooter.disclaimer')
    ];
    let fy = footerY + 10;
    // draw from bottom up to keep spacing consistent
    for (let i = footerLines.length - 1; i >= 0; i--) {
      const wrapped = wrapText(footerLines[i], font, 9, pageWidth - 80);
      for (let j = wrapped.length - 1; j >= 0; j--) {
        page.drawText(wrapped[j], { x: tableX, y: fy, size: 9, font, color: muted });
        fy += 12; // increase downward since we're starting low
      }
      fy += 6;
    }

      // clear downloading
      downloading.value = { ...downloading.value, [id]: false };
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    const link = document.createElement('a');
      try {
        const rAny: any = receipt as any;
        const id = typeof rAny._id === 'string' ? rAny._id : (rAny._id && (rAny._id.$oid || String(rAny._id))) || String(rAny._id);
        downloading.value = { ...downloading.value, [id]: false };
      } catch (e) {
        // ignore
      }
    link.href = URL.createObjectURL(blob);
    const safeDate = new Date(receipt.Date).toISOString().slice(0,10);
    link.download = `receipt_${props.user ?? 'user'}_${safeDate}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    if (notification.value) notification.value.show(t('receipts.downloadFailed'));
  }
}
</script>

<style scoped>

.payment-form,
.subscription-form {
  text-align: center;
  align-items: center;
  align-self: center;
  border: none;
}

.subscription-meter {
  background: var(--base2);
  padding: 18px 10px 10px 10px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 5px;
  margin-left: 5px;
  color: var(--text1);
}
.meter-labels {
  display: flex;
  gap: 30px;
  margin-bottom: 10px;
  margin-left: 10px;
  flex-wrap: wrap;
}

.meter-labels span, .meter-labels strong{
  font-size: 1.3rem;
}

.meter-bar-container {
  display: flex;
  align-items: center;
}

.subscription-actions {
  display: flex;
  gap: 12px;
  margin-top: 10px;
}

.receipts {
  padding: 20px;
  background: var(--base2);
  margin-left: 5px;
  min-height: 350px;
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  height: 100vh;
  color: var(--text1);
}

h1 {
  font-size: 2rem;
}
.subscription-title {
  font-size: 2rem;
  text-align: center;
  width: 100%;
  margin-bottom: 20px;
}

.receipt-header {
  background-color: var(--base1);
  padding: 10px 3px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  border-radius: 8px;
  font-size: 15px;
  color: var(--accent1);
  font-weight: bold;
  letter-spacing: 0.5px;
}

.receipt-item {
  background-color: var(--base2);
  padding: 10px 3px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(140,141,254,0.05);
  transition: background 0.2s;
}

.receipt-item:hover {
  background: var(--base3);
}

.receipt-item p {
  margin: 0;
  font-size: 14px;
  color: var(--text1);
  text-align: center;
}

.downloadbtn {
  background-color: var(--accent1);
  border: none;
  border-radius: 5px;
  padding: 6px 10px;
  color: var(--text1);
  opacity: 0.85;
  transition: background 0.2s, opacity 0.2s;
  cursor: pointer;
  display: flex;
  margin: 0 auto;
}
.download-cell {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.downloadbtn:hover {
  background: var(--accent2);
  opacity: 1;
}

.userbtn.refund-btn {
  background: var(--negative);
  color: var(--text3);
}
.userbtn.refund-btn:hover {
  background: var(--negative);
}

.userbtn {
  background-color: var(--accent1);
  color: var(--text3);
  border-radius: 5px;
  border: none;
  outline: none;
  padding: 10px;
  margin: 5px;
  font-weight: bold;
  width: 150px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.userbtn:disabled , .userbtn:disabled:hover {
  cursor: not-allowed;
  background-color: var(--base3);
}

.userbtn:hover {
  background-color: var(--accent2);
}

.icon3 {
  width: 15px;
  height: 15px;
}

/* Compact loader (based on Renew.vue) sized to fit inside the download button */
.loader4 {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 16px;
  margin: 0; /* don't increase button size */
}
.downloadbtn .spinner {
  animation: rotate 1.2s linear infinite;
  width: 14px;
  height: 14px;
}
.downloadbtn .path {
  stroke: var(--text3);
  stroke-linecap: round;
  animation: dash 1.1s ease-in-out infinite;
  stroke-width: 2;
}
@keyframes rotate {
  100% { transform: rotate(360deg); }
}
@keyframes dash {
  0% {
    stroke-dasharray: 1, 150;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -35;
  }
  100% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -124;
  }
}

.mobile-download-info {
  display: none;
  color: var(--accent1);
  background: var(--base1);
  padding: 10px 12px;
  border-radius: 8px;
  margin-top: 12px;
  font-size: 1rem;
  text-align: center;
}

@media (max-width: 1150px) {
  .meter-labels {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 10px;
  margin-left: 10px;
  flex-wrap: wrap;
  text-align: left;
}
.subscription-actions {
  display: flex;
  gap: 0px;
  margin-top: 10px;
}
  /* Receipt table mobile adjustments */
  .receipt-header-download {
    display: none !important;
  }
  .receipt-download {
    display: none !important;
  }
  .receipt-header-date {
    font-size: 0;
  }
  .receipt-header-date::after {
    content: 'Date';
    font-size: 15px;
    font-weight: bold;
  }
  .receipt-date-desktop {
    display: none !important;
  }
  .receipt-date-mobile {
    display: block !important;
  }
  .receipt-header-method {
    font-size: 0;
  }
  .receipt-header-amount {
    font-size: 0;
  }
  .receipt-header-amount::after {
    content: 'Amount';
    font-size: 15px;
    font-weight: bold;
  }
  .receipt-header-method::after {
    content: 'Card';
    font-size: 15px;
    font-weight: bold;
  }
  .receipt-header-plan {
    font-size: 0;
  }
  .receipt-header-plan::after {
    content: 'Plan';
    font-size: 15px;
    font-weight: bold;
  }
  .receipt-date, .receipt-method, .receipt-plan, .receipt-amount {
    font-size: 14px;
  }
   .mobile-download-info {
    display: block;
  }
}

@media (min-width: 1151px) {
  .receipt-date-desktop {
    display: block !important;
  }
  .receipt-date-mobile {
    display: none !important;
  }
  .mobile-download-info {
    display: none !important;
  }
}

</style>