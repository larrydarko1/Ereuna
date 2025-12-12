<template>
  <div v-if="showPopup" class="popup" @click.self="$emit('close')">
    <div class="popup-content">
      <div class="header-controls">
        <h2 class="popup-title">Financial Reports - {{ ticker }}</h2>
        <div class="button-group">
          <button @click="toggleFinancials" class="toggle-button" :class="{ active: isAnnualFinancials }" :aria-label="isAnnualFinancials ? 'Switch to quarterly financial reports' : 'Switch to annual financial reports'">
            Annual
          </button>
          <button @click="toggleFinancials" class="toggle-button" :class="{ active: !isAnnualFinancials }" :aria-label="isAnnualFinancials ? 'Switch to quarterly financial reports' : 'Switch to annual financial reports'">
            Quarterly
          </button>
          <button class="close-button" @click="$emit('close')" aria-label="Close financials popup">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div class="financials-table-wrapper">
        <template v-if="currentFinancials && currentFinancials.length">
          <div class="table-container">
            <table class="financials-table">
              <thead>
                <tr>
                  <th class="sticky-col">Attribute</th>
                  <th v-for="financial in currentFinancials" :key="financial.fiscalDateEnding">
                    {{ getQuarterAndYear(financial.fiscalDateEnding) }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(attribute, index) in Object.keys(currentFinancials[0]).filter(attr => attr !== 'fiscalDateEnding')"
                    :key="index">
                  <td class="sticky-col attribute-cell">
                    <span class="attribute-label">{{ attributeMap[attribute] || attribute }}</span>
                    <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                      @mouseover="handleMouseOver($event, { attribute })" @mouseout="handleMouseOut"
                      :aria-label="'Show info for ' + (attributeMap[attribute] || attribute)">
                      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M12 18.01L12.01 17.9989" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </td>
                  <td v-for="financial in currentFinancials" :key="financial.fiscalDateEnding" class="value-cell">
                    <div class="value-content">
                      <span class="value">
                        {{ isNaN(parseFloat(String(financial[attribute]))) ? '-' : attribute === 'reportedEPS' ? parseFloat(String(financial[attribute])).toFixed(2) : parseInt(String(financial[attribute])).toLocaleString() }}
                      </span>
                      <span class="change-badge" v-if="getPercentageDifference(financial, attribute) !== '-'"
                        :class="parseFloat(getPercentageDifference(financial, attribute)) > 0 ? 'positive' : 'negative'">
                        {{ getPercentageDifference(financial, attribute) }}
                        <span v-if="parseFloat(getPercentageDifference(financial, attribute)) > 0" class="arrow-up"></span>
                        <span v-else class="arrow-down"></span>
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
        <template v-else>
          <div class="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 17H7V10H9V17ZM13 17H11V7H13V17ZM17 17H15V13H17V17ZM19.5 19.1H4.5V5H19.5V19.1ZM19.5 3H4.5C3.4 3 2.5 3.9 2.5 5V19C2.5 20.1 3.4 21 4.5 21H19.5C20.6 21 21.5 20.1 21.5 19V5C21.5 3.9 20.6 3 19.5 3Z" fill="var(--text1)" opacity="0.3"/>
            </svg>
            <p>No financial data available</p>
          </div>
        </template>
      </div>
      
      <div class="tooltip" v-if="showTooltip" :style="{ top: tooltipTop + 'px', left: tooltipLeft + 'px' }">
        <span class="tooltip-text">{{ tooltipText }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';

interface Financial {
  fiscalDateEnding: string;
  [key: string]: string | number;
}

const props = defineProps({
  showPopup: Boolean,
  ticker: {
    type: String,
    required: true
  },
  apiKey: {
    type: String,
    required: true
  }
});

const attributeMap: Record<string, string> = {
  rps: 'Revenue Per Share',
  roa: 'Return on Assets ROA',
  assetTurnover: 'Asset Turnover',
  bookVal: 'Book Value',
  bvps: 'Book Value Per Share',
  totalRevenue: 'Revenue',
  epsDil: 'Earnings Per Share Diluted',
  netIncome: 'Net Income',
  profitMargin: 'Profit Margin',
  revenueQoQ: 'Revenue QoQ Growth',
  debtEquity: 'Debt to Equity Ratio',
  grossMargin: 'Gross Margin',
  roe: 'Return on Equity ROE',
  currentRatio: 'Current Ratio',
  fxRate: 'FX Rate',
  sharesBasic: 'Shares Outstanding',
  piotroskiFScore: 'Piotroski F-Score',
  longTermDebtEquity: 'Long-term Debt to Equity',
  opMargin: 'Operating Margin',
  epsQoQ: 'Earnings Per Share QoQ Growth',
  peRatio: 'Price to Earnings Ratio',
  shareswaDil: 'Weighted Average Shares Diluted',
  eps: 'Earnings Per Share',
  ppeq: 'Property, Plant & Equipment',
  ebitda: 'EBITDA',
  freeCashFlow: 'Free Cash Flow',
  issrepayDebt: 'Issuance or Repayment of Debt Securities',
  capex: 'Capital Expenditure',
  rnd: 'Research & Development',
  sga: 'Selling, General & Administrative',
  investmentsCurrent: 'Current Investments',
  payDiv: 'Payment of Dividends & Other Cash Distributions',
  investmentsAcqDisposals: 'Investment Acquisitions & Disposals',
  taxLiabilities: 'Tax Liabilities',
  ncff: 'Net Cash Flow from Financing',
  opinc: 'Operating Income',
  nonControllingInterests: 'Net Income to Non-Controlling Interests',
  assetsNonCurrent: 'Other Assets',
  taxAssets: 'Tax Assets',
  issrepayEquity: 'Issuance or Repayment of Equity',
  ncfx: 'Effect of Exchange Rate Changes on Cash',
  ncfo: 'Net Cash Flow from Operations',
  grossProfit: 'Gross Profit',
  debtCurrent: 'Current Debt',
  retainedEarnings: 'Accumulated Retained Earnings or Deficit',
  liabilitiesNonCurrent: 'Other Liabilities',
  sbcomp: 'Shared-based Compensation',
  businessAcqDisposals: 'Business Acquisitions & Disposals',
  liabilitiesCurrent: 'Current Liabilities',
  acctRec: 'Accounts Receivable',
  cashAndEq: 'Cash and Equivalents',
  accoci: 'Accumulated Other Comprehensive Income',
  depamor: 'Depreciation, Amortization & Accretion',
  assetsCurrent: 'Current Assets',
  shareswa: 'Weighted Average Shares',
  investments: 'Investments',
  prefDVDs: 'Preferred Dividends Income Statement Impact',
  intangibles: 'Intangible Assets',
  opex: 'Operating Expenses',
  inventory: 'Inventory',
  deposits: 'Deposits',
  ebt: 'Earnings before tax',
  netMargin: 'Net Margin',
  investmentsNonCurrent: 'Non-Current Investments',
  totalAssets: 'Total Assets',
  deferredRev: 'Deferred Revenue',
  taxExp: 'Tax Expense',
  debt: 'Total Debt',
  costRev: 'Cost of Revenue',
  acctPay: 'Accounts Payable',
  ncf: 'Net Cash Flow to Change in Cash & Cash Equivalents',
  netIncDiscOps: 'Net Income from Discontinued Operations',
  totalLiabilities: 'Total Liabilities',
  ncfi: 'Net Cash Flow from Investing',
  debtNonCurrent: 'Non-Current Debt',
  ebit: 'Earning Before Interest & Taxes EBIT',
  netIncComStock: 'Net Income Common Stock',
  intexp: 'Interest Expense',
  consolidatedIncome: 'Consolidated Income',
  equity: 'Shareholders Equity',
  marketCap: 'Market Capitalization',
  enterpriseVal: 'Enterprise Value',
  shareFactor: 'Share Factor',
  trailingPEG1Y: 'PEG Ratio',
  pbRatio: 'Price to Book Ratio',
  reportedEPS: 'EPS',
};

const AnnualFinancials = ref<Financial[]>([]);
const QuarterlyFinancials = ref<Financial[]>([]);
const isAnnualFinancials = ref<boolean>(true);

const currentFinancials = computed<Financial[]>(() => {
  return isAnnualFinancials.value ? AnnualFinancials.value : QuarterlyFinancials.value;
});

async function fetchFinancials() {
  try {
    const headers = {
      'x-api-key': props.apiKey
    };
    const response = await fetch(`/api/${props.ticker}/financials`, {
      headers: headers
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const newFinancials = await response.json();
  AnnualFinancials.value = newFinancials.annualFinancials as Financial[];
  QuarterlyFinancials.value = newFinancials.quarterlyFinancials as Financial[];

  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'AbortError') {
      return;
    }
  }
}

function toggleFinancials(): void {
  isAnnualFinancials.value = !isAnnualFinancials.value;
}

function getQuarterAndYear(dateString: string): string | number {
  const date = new Date(dateString);
  if (isAnnualFinancials.value) {
    return date.getFullYear();
  } else {
    const quarter = Math.floor((date.getMonth() + 3) / 3);
    return `Q${quarter} ${date.getFullYear()}`;
  }
}

function getPercentageDifference(financial: Financial, attribute: string): string {
  const currentIndex = currentFinancials.value.findIndex(f => f.fiscalDateEnding === financial.fiscalDateEnding);
  if (currentIndex < currentFinancials.value.length - 1) {
    const nextFinancial = currentFinancials.value[currentIndex + 1];
    const currVal = Number(financial[attribute]);
    const nextVal = Number(nextFinancial[attribute]);
    const change = currVal - nextVal;
    let percentageDifference: number;
    if (nextVal < 0) {
      percentageDifference = (change / Math.abs(nextVal)) * 100;
    } else {
      percentageDifference = (change / nextVal) * 100;
    }
    if (isNaN(percentageDifference) || !isFinite(percentageDifference)) {
      return '-';
    } else {
      return percentageDifference.toFixed(2) + '%';
    }
  } else {
    return '-';
  }
}

watch(() => props.showPopup, (val: boolean) => {
  if (val) {
    fetchFinancials();
  }
});

watch(() => props.ticker, (newTicker: string, oldTicker: string) => {
  if (props.showPopup && newTicker !== oldTicker) {
    fetchFinancials();
  }
});

// Tooltip state (these should be provided by parent or managed here if you want local tooltip)

const showTooltip = ref<boolean>(false);
const tooltipText = ref<string>('');
const tooltipLeft = ref<number>(0);
const tooltipTop = ref<number>(0);


function handleMouseOver(event: MouseEvent, id: { attribute: string }): void {
  showTooltip.value = true;
  const element = event.target as HTMLElement;
  const svgRect = (element.parentNode as HTMLElement).getBoundingClientRect();
  tooltipTop.value = svgRect.top + window.scrollY + svgRect.height - 25;
  tooltipLeft.value = svgRect.left + window.scrollX + svgRect.width + 10;
  tooltipText.value = getTooltipText(id);
}

const attributeTooltips: Record<string, string> = {
  rps: 'Revenue Per Share is a measure of a company\'s revenue divided by the number of outstanding shares.',
  roa: 'Return on Assets (ROA) is a measure of a company\'s profitability, calculated by dividing its net income by its total assets.',
  assetTurnover: 'Asset Turnover is a measure of a company\'s efficiency in using its assets to generate revenue.',
  bookVal: 'Book Value is a company\'s total assets minus its total liabilities, which represents the company\'s net worth.',
  bvps: 'Book Value Per Share is a measure of a company\'s book value divided by the number of outstanding shares.',
  totalRevenue: 'Revenue is the total amount of money earned by a company from its sales of goods or services.',
  epsDil: 'Earnings Per Share Diluted is a measure of a company\'s profitability, calculated by dividing its net income by the number of outstanding shares, including dilutive securities.',
  netIncome: 'Net Income is a company\'s total earnings, calculated by subtracting its total expenses from its total revenue.',
  profitMargin: 'Profit Margin is a measure of a company\'s profitability, calculated by dividing its net income by its total revenue.',
  revenueQoQ: 'Revenue QoQ Growth is a measure of a company\'s revenue growth from one quarter to the next.',
  debtEquity: 'Debt to Equity Ratio is a measure of a company\'s leverage, calculated by dividing its total debt by its total shareholder equity.',
  grossMargin: 'Gross Margin is a measure of a company\'s profitability, calculated by dividing its gross profit by its total revenue.',
  roe: 'Return on Equity (ROE) is a measure of a company\'s profitability, calculated by dividing its net income by its total shareholder equity.',
  currentRatio: 'Current Ratio is a measure of a company\'s liquidity, calculated by dividing its current assets by its current liabilities.',
  fxRate: 'FX Rate is the exchange rate between two currencies.',
  sharesBasic: 'Shares Outstanding is the total number of shares of a company\'s stock that are currently owned by investors.',
  piotroskiFScore: 'Piotroski F-Score is a measure of a company\'s financial health, calculated by evaluating its profitability, leverage, liquidity, and efficiency.',
  longTermDebtEquity: 'Long-term Debt to Equity is a measure of a company\'s leverage, calculated by dividing its long-term debt by its total shareholder equity.',
  opMargin: 'Operating Margin is a measure of a company\'s profitability, calculated by dividing its operating income by its total revenue.',
  epsQoQ: 'Earnings Per Share QoQ Growth is a measure of a company\'s earnings growth from one quarter to the next.',
  peRatio: 'Price to Earnings Ratio is a measure of a company\'s valuation, calculated by dividing its current stock price by its earnings per share.',
  shareswaDil: 'Weighted Average Shares Diluted is a measure of a company\'s average number of outstanding shares, including dilutive securities.',
  eps: 'Earnings Per Share is a measure of a company\'s profitability, calculated by dividing its net income by the number of outstanding shares.',
  ppeq: 'Property, Plant & Equipment is a company\'s tangible assets, such as buildings, machinery, and equipment.',
  ebitda: 'EBITDA is a measure of a company\'s profitability, calculated by adding its net income, interest expense, taxes, depreciation, and amortization.',
  freeCashFlow: 'Free Cash Flow is a measure of a company\'s ability to generate cash from its operations, calculated by subtracting its capital expenditures from its operating cash flow.',
  issrepayDebt: 'Issuance or Repayment of Debt Securities is a company\'s issuance or repayment of debt securities, such as bonds or loans.',
  capex: 'Capital Expenditure is a company\'s investment in new assets, such as property, plant, and equipment.',
  rnd: 'Research & Development is a company\'s investment in research and development activities.',
  sga: 'Selling, General & Administrative is a company\'s expenses related to selling, general, and administrative activities.',
  investmentsCurrent: 'Current Investments is a company\'s investments in current assets, such as cash, accounts receivable, and inventory.',
  payDiv: 'Payment of Dividends & Other Cash Distributions is a company\'s payment of dividends and other cash distributions to its shareholders.',
  investmentsAcqDisposals: 'Investment Acquisitions & Disposals is a company\'s acquisition or disposal of investments, such as stocks, bonds, or real estate.',
  taxLiabilities: 'Tax Liabilities is a company\'s tax obligations, including income taxes, payroll taxes, and other taxes.',
  ncff: 'Net Cash Flow from Financing is a company\'s net cash flow from financing activities, such as issuing debt or equity.',
  opinc: 'Operating Income is a company\'s income from its core business operations.',
  nonControllingInterests: 'Net Income to Non-Controlling Interests is a company\'s net income attributable to non-controlling interests.',
  assetsNonCurrent: 'Other Assets is a company\'s non-current assets, such as investments, intangible assets, and other assets.',
  taxAssets: 'Tax Assets is a company\'s tax assets, including deferred tax assets and other tax assets.',
  issrepayEquity: 'Issuance or Repayment of Equity is a company\'s issuance or repayment of equity, such as common stock or preferred stock.',
  ncfx: 'Effect of Exchange Rate Changes on Cash is a company\'s gain or loss from changes in exchange rates.',
  ncfo: 'Net Cash Flow from Operations is a company\'s net cash flow from its core business operations.',
  grossProfit: 'Gross Profit is a company\'s revenue minus its cost of goods sold.',
  debtCurrent: 'Current Debt is a company\'s short-term debt obligations, such as accounts payable and short-term loans.',
  retainedEarnings: 'Accumulated Retained Earnings or Deficit is a company\'s accumulated earnings or losses over time.',
  liabilitiesNonCurrent: 'Other Liabilities is a company\'s non-current liabilities, such as long-term debt and other liabilities.',
  sbcomp: 'Shared-based Compensation is a company\'s compensation expenses related to stock options and other equity-based compensation.',
  businessAcqDisposals: 'Business Acquisitions & Disposals is a company\'s acquisition or disposal of businesses, including mergers and acquisitions.',
  liabilitiesCurrent: 'Current Liabilities is a company\'s short-term liabilities, such as accounts payable and short-term loans.',
  acctRec: 'Accounts Receivable is a company\'s outstanding invoices and other amounts owed to it by customers.',
  cashAndEq: 'Cash and Equivalents is a company\'s cash and other liquid assets, such as commercial paper and treasury bills.',
  accoci: 'Accumulated Other Comprehensive Income is a company\'s accumulated other comprehensive income, including gains and losses from foreign currency translation and other items.',
  depamor: 'Depreciation, Amortization & Accretion is a company\'s depreciation, amortization, and accretion expenses related to its assets.',
  assetsCurrent: 'Current Assets is a company\'s short-term assets, such as cash, accounts receivable, and inventory.',
  shareswa: 'Weighted Average Shares is a company\'s average number of outstanding shares, weighted by the number of shares outstanding during each period.',
  investments: 'Investments is a company\'s investments in other companies, including stocks, bonds, and other securities.',
  prefDVDs: 'Preferred Dividends Income Statement Impact is a company\'s preferred dividends expense, which is subtracted from its net income.',
  intangibles: 'Intangible Assets is a company\'s intangible assets, such as patents, trademarks, and copyrights.',
  opex: 'Operating Expenses is a company\'s expenses related to its core business operations, including salaries, rent, and other expenses.',
  inventory: 'Inventory is a company\'s goods or materials that are held for sale or in production.',
  deposits: 'Deposits is a company\'s deposits, including customer deposits and other deposits.',
  ebt: 'Earnings before tax is a company\'s earnings before income taxes.',
  netMargin: 'Net Margin is a company\'s net income divided by its total revenue.',
  investmentsNonCurrent: 'Non-Current Investments is a company\'s non-current investments, including investments in other companies and other non-current assets.',
  totalAssets: 'Total Assets is a company\'s total assets, including current and non-current assets.',
  deferredRev: 'Deferred Revenue is a company\'s deferred revenue, which is revenue that has been earned but not yet recognized.',
  taxExp: 'Tax Expense is a company\'s tax expense, including income taxes and other taxes.',
  debt: 'Total Debt is a company\'s total debt, including current and non-current debt.',
  costRev: 'Cost of Revenue is a company\'s cost of goods sold and other costs related to its revenue.',
  acctPay: 'Accounts Payable is a company\'s outstanding invoices and other amounts owed to its suppliers.',
  ncf: 'Net Cash Flow to Change in Cash & Cash Equivalents is a company\'s net cash flow from its core business operations, investing activities, and financing activities.',
  netIncDiscOps: 'Net Income from Discontinued Operations is a company\'s net income from discontinued operations, including gains and losses from the sale of discontinued operations.',
  totalLiabilities: 'Total Liabilities is a company\'s total liabilities, including current and non-current liabilities.',
  ncfi: 'Net Cash Flow from Investing is a company\'s net cash flow from its investing activities, including purchases and sales of assets.',
  debtNonCurrent: 'Non-Current Debt is a company\'s non-current debt, including long-term debt and other non-current debt.',
  ebit: 'Earning Before Interest & Taxes EBIT is a company\'s earnings before interest and taxes.',
  netIncComStock: 'Net Income Common Stock is a company\'s net income attributable to common stockholders.',
  intexp: 'Interest Expense is a company\'s interest expense, including interest on debt and other interest expenses.',
  consolidatedIncome: 'Consolidated Income is a company\'s consolidated income, including income from its subsidiaries and other consolidated entities.',
  equity: 'Shareholders Equity is a company\'s shareholders\' equity, including common stock, preferred stock, and retained earnings.',
  marketCap: 'Market Capitalization is a company\'s market capitalization, which is the total value of its outstanding shares.',
  enterpriseVal: 'Enterprise Value is a company\'s enterprise value, which is its market capitalization plus its total debt minus its cash and cash equivalents.',
  shareFactor: 'Share Factor is a company\'s share factor, which is used to calculate its earnings per share.',
  trailingPEG1Y: 'PEG Ratio is a company\'s price-to-earnings growth ratio, which is used to evaluate its valuation.',
  pbRatio: 'Price to Book Ratio is a company\'s price-to-book ratio, which is used to evaluate its valuation.',
  reportedEPS: 'Earnings Per Share (EPS) is a company\'s net income divided by its outstanding shares, representing the portion of profit allocated to each share of common stock.',
};


function getTooltipText(id: { attribute: string }): string {
  const attribute = id.attribute;
  return attributeTooltips[attribute] || `This is the ${attributeMap[attribute] || attribute} attribute.`;
}


function handleMouseOut(): void {
  showTooltip.value = false;
}
</script>

<style scoped>
.popup {
  position: fixed;
  top: 0; 
  left: 0; 
  right: 0; 
  bottom: 0;
  background: color-mix(in srgb, var(--base1) 85%, transparent);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.popup-content {
  background: var(--base2);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 1400px;
  height: 85vh;
  max-height: 900px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { 
    transform: translateY(20px);
    opacity: 0;
  }
  to { 
    transform: translateY(0);
    opacity: 1;
  }
}

.header-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  border-bottom: 1px solid color-mix(in srgb, var(--text1) 10%, transparent);
  background: var(--base2);
}

.popup-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text1);
  margin: 0;
}

.button-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.toggle-button {
  padding: 8px 20px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--text1) 15%, transparent);
  background: transparent;
  color: var(--text1);
  font-weight: 500;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-button:hover {
  background: color-mix(in srgb, var(--accent1) 15%, transparent);
  border-color: var(--accent1);
}

.toggle-button.active {
  background: var(--accent1);
  color: var(--text3);
  border-color: var(--accent1);
}

.close-button {
  padding: 8px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--text1) 15%, transparent);
  background: transparent;
  color: var(--text1);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  margin-left: 8px;
}

.close-button:hover {
  background: color-mix(in srgb, var(--negative) 15%, transparent);
  border-color: var(--negative);
  color: var(--negative);
}

.financials-table-wrapper {
  flex: 1;
  overflow: hidden;
  padding: 20px 28px;
  display: flex;
  flex-direction: column;
}

.table-container {
  overflow: auto;
  flex: 1;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--text1) 8%, transparent);
  background: var(--base1);
}

.financials-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.9rem;
}

.financials-table thead {
  position: sticky;
  top: 0;
  z-index: 20;
}

.financials-table thead th {
  background: var(--base2);
  color: var(--text1);
  font-weight: 600;
  text-align: center;
  padding: 16px 12px;
  border-bottom: 2px solid var(--accent1);
  white-space: nowrap;
  font-size: 0.95rem;
}

.financials-table thead th.sticky-col {
  position: sticky;
  left: 0;
  z-index: 21;
  text-align: left;
  min-width: 280px;
  background: linear-gradient(135deg, var(--base2) 0%, color-mix(in srgb, var(--base2) 95%, var(--accent1)) 100%);
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
}

.financials-table tbody tr {
  transition: background 0.15s ease;
}

.financials-table tbody tr:hover {
  background: color-mix(in srgb, var(--accent1) 5%, transparent);
}

.financials-table tbody tr:nth-child(even) {
  background: color-mix(in srgb, var(--text1) 2%, transparent);
}

.financials-table tbody tr:nth-child(even):hover {
  background: color-mix(in srgb, var(--accent1) 8%, transparent);
}

.financials-table td {
  padding: 14px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--text1) 5%, transparent);
  color: var(--text1);
}

.sticky-col {
  position: sticky;
  left: 0;
  background: linear-gradient(135deg, var(--base1) 0%, color-mix(in srgb, var(--base1) 95%, var(--accent1)) 100%);
  z-index: 10;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
}

.attribute-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-weight: 500;
  min-width: 280px;
  height: 100%;
}

.attribute-label {
  flex: 1;
}

.question-img {
  width: 18px;
  height: 18px;
  cursor: pointer;
  color: color-mix(in srgb, var(--text1) 50%, transparent);
  transition: color 0.2s ease;
  flex-shrink: 0;
}

.question-img:hover {
  color: var(--accent1);
}

.value-cell {
  text-align: center;
  white-space: nowrap;
  min-width: 140px;
}

.value-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  max-height: 20px;
  justify-content: center;
}

.value {
  font-weight: 500;
  font-size: 0.95rem;
}

.change-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
}

.change-badge.positive {
  background: color-mix(in srgb, var(--positive) 15%, transparent);
  color: var(--positive);
}

.change-badge.negative {
  background: color-mix(in srgb, var(--negative) 15%, transparent);
  color: var(--negative);
}

.arrow-up {
  font-size: 0.75em;
  line-height: 0.8em;
  display: inline-block;
  vertical-align: middle;
  position: relative;
  margin-left: 4px;
}

.arrow-up::after {
  content: "\25B2";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.arrow-down {
  font-size: 0.75em;
  line-height: 0.1em;
  display: inline-block;
  vertical-align: middle;
  position: relative;
  margin-left: 4px;
}

.arrow-down::after {
  content: "\25BC";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
  color: color-mix(in srgb, var(--text1) 50%, transparent);
}

.empty-state p {
  font-size: 1.1rem;
  margin: 0;
}

.tooltip {
  position: fixed;
  background: var(--base2);
  border: 1px solid var(--accent1);
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  z-index: 100000;
  max-width: 280px;
  pointer-events: none;
  animation: tooltipFade 0.2s ease;
}

@keyframes tooltipFade {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.tooltip-text {
  color: var(--text1);
  font-size: 0.9rem;
  line-height: 1.5;
  display: block;
}

/* Scrollbar styling */
.table-container::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.table-container::-webkit-scrollbar-track {
  background: var(--base2);
  border-radius: 5px;
}

.table-container::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--text1) 30%, transparent);
  border-radius: 5px;
}

.table-container::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--accent1) 50%, transparent);
}
</style>