<template>
  <div v-if="showPopup" class="popup">
    <div class="popup-content">
      <div class="toggle-button-container">
        <button @click="toggleFinancials" class="toggle-button">
          {{ isAnnualFinancials ? 'Switch to Quarterly Reports' : 'Switch to Annual Reports' }}
        </button>
        <button class="toggle-button" @click="$emit('close')">Close</button>
      </div>
      <br>
      <div class="financials-header">
        <div class="attribute-name">Attribute</div>
        <div v-for="financial in currentFinancials" :key="financial.fiscalDateEnding" class="fiscal-year">
          {{ getQuarterAndYear(financial.fiscalDateEnding) }}
        </div>
      </div>
      <div
        v-for="(attribute, index) in Object.keys(currentFinancials[0]).filter(attr => attr !== 'fiscalDateEnding')"
        :key="index" class='financials-row'>
        <div class="attribute-name" style="display: grid; grid-template-columns: 1fr auto;">
          {{ attributeMap[attribute] || attribute }}
          <svg class="question-img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
            @mouseover="handleMouseOver($event, { attribute })" @mouseout="handleMouseOut">
            <path
              d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
              stroke="var(--text1)" stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round">
            </path>
            <path d="M9 9C9 5.49997 14.5 5.5 14.5 9C14.5 11.5 12 10.9999 12 13.9999" stroke="var(--text1)"
              stroke-width="2.088" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M12 18.01L12.01 17.9989" stroke="var(--text1)" stroke-width="2.088"
              stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        </div>
        <div v-for="financial in currentFinancials" :key="financial.fiscalDateEnding" class="financial-value">
          {{ isNaN(parseInt(financial[attribute])) ? '-' : parseInt(financial[attribute]).toLocaleString() }}
          <div class="percentage-box"
            :class="!isNaN(parseFloat(getPercentageDifference(financial, attribute))) && parseFloat(getPercentageDifference(financial, attribute)) > 0 ? 'positive' : 'negative'">
            {{ isNaN(parseFloat(getPercentageDifference(financial, attribute))) ? '-' :
              getPercentageDifference(financial, attribute) }}
            <span
              v-if="!isNaN(parseFloat(getPercentageDifference(financial, attribute))) && parseFloat(getPercentageDifference(financial, attribute)) > 0"
              class="arrow-up"></span>
            <span v-else-if="!isNaN(parseFloat(getPercentageDifference(financial, attribute)))"
              class="arrow-down"></span>
          </div>
        </div>
      </div>
      <div class="tooltip-container">
        <div class="tooltip" v-if="showTooltip" :style="{ top: tooltipTop + 'px', left: tooltipLeft + 'px' }">
          <span class="tooltip-text">{{ tooltipText }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  showPopup: Boolean,
  isAnnualFinancials: Boolean,
  currentFinancials: Array,
  attributeMap: Object,
  getQuarterAndYear: Function,
  getPercentageDifference: Function,
  toggleFinancials: Function,
  handleMouseOver: Function,
  handleMouseOut: Function,
});


// Tooltip state (these should be provided by parent or managed here if you want local tooltip)
const showTooltip = ref(false)
let tooltipText = ref('');
let tooltipLeft = ref();
let tooltipTop = ref();

function handleMouseOver(event, id) {
  showTooltip.value = true
  const element = event.target
  const rect = element.getBoundingClientRect()
  const svgRect = element.parentNode.getBoundingClientRect()
  tooltipTop.value = svgRect.top + window.scrollY + svgRect.height - 25;
  tooltipLeft.value = svgRect.left + window.scrollX + svgRect.width + 10;
  tooltipText.value = getTooltipText(id)
}

const attributeTooltips = {
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
};

function getTooltipText(id) {
  const attribute = id.attribute;
  return attributeTooltips[attribute] || `This is the ${attributeMap[attribute] || attribute} attribute.`;
}

function handleMouseOut() {
  showTooltip.value = false
}
</script>