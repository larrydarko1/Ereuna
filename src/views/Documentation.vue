<template>
  <div class="documentation">
    <div class="side1">
      <img class="icon" src="@/assets/icons/ereuna.png" alt="Owl Icon" @click="router.push('/')">
      <p
        v-for="item in side1Items"
        :key="item"
        :class="{ active: selectedSide1 === item }"
        @click="() => { selectedSide1 = item; selectedSide2 = side2Items[item][0]; }"
      >
        {{ item }}
      </p>
      <span class="version">Ereuna v3.8.9</span>
    </div>
  <div class="side2">
  <p
    v-for="item in side2Items[selectedSide1]"
    :key="item"
    :class="[
      { active: selectedSide2 === item },
      { bold: [
          'One-Click Multi-Screener',
          'Hide Feature'
        ].includes(item)
      }
    ]"
    @click="selectedSide2 = item"
  >
    {{ item }}
  </p>
</div>
    <div class="main">
      <component :is="getComponentName(selectedSide2)" v-if="selectedSide2" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()

// Import all documentation components
import WelcomeDoc from '@/components/Docs/WelcomeDoc.vue'
import CreateAccountDoc from '@/components/Docs/createAccount.vue'
import RecoverPasswordDoc from '@/components/Docs/RecoverPassword.vue'
import ArchieDoc from '@/components/Docs/archie.vue'
import DashboardDoc from '@/components/Docs/dashboard.vue'
import Renew from '@/components/Docs/Renew.vue'
import Refund from '@/components/Docs/Refund.vue'
import ChangeUsernameDoc from '@/components/Docs/ChangeUsername.vue'
import ChangePasswordDoc from '@/components/Docs/ChangePassword.vue'
import RecoveryKeyDoc from '@/components/Docs/RecoveryKey.vue'
import DeleteAccountDoc from '@/components/Docs/DeleteAccount.vue'
import SubscriptionDoc from '@/components/Docs/Subscriptions.vue'
import ThemesDoc from '@/components/Docs/Themes.vue'
import Security from '@/components/Docs/Security.vue'
import PortfolioOverview from '@/components/Docs/PortfolioOverview.vue'
import SwitchPortfolio from '@/components/Docs/SwitchPortfolio.vue'
import ResetPortfolio from '@/components/Docs/ResetPortfolio.vue'
import AddPosition from '@/components/Docs/AddPosition.vue'
import SellPosition from '@/components/Docs/SellPosition.vue'
import AddCash from '@/components/Docs/AddCash.vue'
import BaseValue from '@/components/Docs/BaseValue.vue'
import ExportPortfolio from '@/components/Docs/ExportPortfolio.vue'
import ImportPortfolio from '@/components/Docs/ImportPortfolio.vue'
import EditPanel from '@/components/Docs/EditPanel.vue'
import SummaryTable from '@/components/Docs/SummaryTable.vue'
import GrowthTables from '@/components/Docs/GrowthTables.vue'
import SplitDivTable from '@/components/Docs/SplitDivTable.vue'
import FinancialsTable from '@/components/Docs/FinancialsTable.vue'
import Notes from '@/components/Docs/Notes.vue'
import News from '@/components/Docs/News.vue'
import Watchpanel from '@/components/Docs/Watchpanel.vue'
import MainChart from '@/components/Docs/MainChart.vue'
import Watchlist from '@/components/Docs/Watchlist.vue'
import ManageSymbols from '@/components/Docs/ManageSymbols.vue'
import AutoplayWatchlist from '@/components/Docs/AutoplayWatchlist.vue'
import ManageScreener from '@/components/Docs/ManageScreener.vue'
import EditTable from '@/components/Docs/EditTable.vue'
import MultiScreener from '@/components/Docs/MultiScreener.vue'
import AutoplayScreener from '@/components/Docs/AutoPlayScreener.vue'
import HideStock from '@/components/Docs/HideStock.vue'
import DownloadResults from '@/components/Docs/DownloadResults.vue'
import MiniCharts from '@/components/Docs/MiniCharts.vue'

const side1Items = ['Introduction', 'Dashboard', 'Account', 'Portfolio', 'Charts', 'Screener']
const side2Items: Record<string, string[]> = {
  Introduction: ['Welcome', 'Create Account', 'Recover Password'],
  Dashboard: ['Archie AI (In Development)', 'Dashboard Overview'],
  Account: ['Change Username', 'Change Password', 'Generate Recovery Key','Delete Account', 'Subscription', 'Renew Subscription', 'Ask For Refund', 'Themes', 'Security / 2FA'],
  Portfolio: [
  'Portfolio Overview',
  'Switching Portfolios',
  'Resetting Portfolio',
  'Add a Position',
  'Selling Positions',
  'Adding Cash',
  'Setting Base Value',
  'Exporting Portfolio',
  'Importing Portfolio',
],
  Charts: ['Watchpanel','Edit Left Panel', 'Summary Table', 'EPS / Sales / Earning Tables', 'Dividends / Splits Tables', 'Financial Statements',
    'Notes', 'News', 'Main Chart', 'Managing Watchlists', 'Managing Symbols', 'Autoplay'
  ],
  Screener: [
    'Managing Screeners',
    'Edit Table Columns',
    'Hide Feature',
    'One-Click Multi-Screener',
    'Autoplay Results',
    'Downloading Screener Results',
    'Mini-Charts / Screener Summary',
  ]
};
const selectedSide1 = ref<string>(side1Items[0]);
const selectedSide2 = ref<string>(side2Items[selectedSide1.value][0]);

// Example: map side2 values to component names
const componentMap: Record<string, any> = {
  'Welcome': WelcomeDoc,
  'Create Account': CreateAccountDoc,
  'Recover Password': RecoverPasswordDoc,
  'Archie AI (In Development)': ArchieDoc,
  'Dashboard Overview': DashboardDoc,
  'Change Username': ChangeUsernameDoc,
  'Change Password': ChangePasswordDoc,
  'Generate Recovery Key': RecoveryKeyDoc,
  'Delete Account': DeleteAccountDoc,
  'Subscription': SubscriptionDoc,
  'Renew Subscription': Renew,
  'Ask For Refund': Refund,
  'Themes': ThemesDoc,
  'Security / 2FA': Security,
  'Portfolio Overview': PortfolioOverview,
  'Switching Portfolios': SwitchPortfolio,
  'Resetting Portfolio': ResetPortfolio,
  'Add a Position': AddPosition,
  'Selling Positions': SellPosition,
  'Adding Cash': AddCash,
  'Setting Base Value': BaseValue,
  'Exporting Portfolio': ExportPortfolio,
  'Importing Portfolio': ImportPortfolio,
  'Watchpanel': Watchpanel,
  'Edit Left Panel': EditPanel,
  'Main Chart': MainChart,
  'Summary Table': SummaryTable,
  'EPS / Sales / Earning Tables': GrowthTables,
  'Dividends / Splits Tables': SplitDivTable,
  'Financial Statements': FinancialsTable,
  'Notes': Notes,
  'News': News,
  'Managing Watchlists': Watchlist,
  'Managing Symbols': ManageSymbols,
  'Autoplay': AutoplayWatchlist,
  'Managing Screeners': ManageScreener,
  'Edit Table Columns': EditTable,
  'One-Click Multi-Screener': MultiScreener,
  'Autoplay Results': AutoplayScreener,
  'Hide Feature': HideStock,
  'Downloading Screener Results': DownloadResults,
  'Mini-Charts / Screener Summary': MiniCharts,
}

function getComponentName(item: string) {
  return componentMap[item];
}
</script>

<style scoped lang="scss">
@use '../style.scss' as *;

.main {
  height: 100vh;    // Fill vertical space
  overflow-y: auto; // Enable vertical scroll only
  overflow-x: wrap; // Prevent horizontal scroll
  box-sizing: border-box;
}

.side1 {
  background: $base2;
  flex-direction: column;
  height: 100vh;
  position: relative;
  z-index: 5000;
  flex: 0 0 15%;
}

.side1 p {
  font-size: 1.5rem;
  color: $text2;
  text-align: left;
  padding-left: 2rem;
  padding-top: 1rem;
  padding-bottom: 1rem;
  cursor: pointer;
  margin: 1rem;
  border-radius: 10px;
}

.side1 p.active {
  color: $text1;
  background-color: $base4;
}

.side1 span {
  position: absolute;
  bottom: 1%;
  left: 30%;
}

.side1 p:hover {
  color: $text1;
  background-color: $base4;
}

.side1 p.active {
  color: $text1;
  background-color: $base1;
}

.side2 {
  background: $base1;
  flex-direction: column;
  height: 100vh;
  min-width: 300px;
  position: relative;
  overflow-y: scroll;
  z-index: 1000;
  flex: 0 0 25%;
}

.side2 p {
  font-size: 1.3rem;
  color: $text2;
  text-align: left;
  padding-left: 2rem;
  padding-right: 2rem;
  padding-top: 1rem;
  padding-bottom: 1rem;
  cursor: pointer;
  margin: 2rem;
  border-radius: 10px;
}

.side2 p.bold {
  font-weight: bold;
}

.side2 p:hover {
  color: $text1;
  background-color: $base2;
}

.side2 p.active {
  color: $text1;
  background-color: $base2;
}

.documentation {
  background: $base1;
  height: 100%;
  width: 100%;
  display: flex;
}

.icon {
  height: 50px;
  margin: 20px;
  cursor: pointer;
}

.main {
  padding: 3rem;
  overflow-y: scroll;
  flex: 0 0 60%;
  background: $base4;
}

//mobile version
@media (max-width: 768px) {
  .documentation {
    flex-direction: column;
    height: auto;
  }
  .side1,
  .side2,
  .main {
    max-width: 100vw;
    width: 100vw;
    min-width: 0;
    height: auto;
    position: static;
    z-index: auto;
    padding: 0;
    margin: 0;
  }

  .main {
    padding: 1rem;
    overflow-y: auto;
    max-height: calc(100vh - 60px); // Adjust for mobile header
  }

  .side1.mobile,
  .side2.mobile {
    display: block;
    background: $base2;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    border-radius: 0;
    padding: 0.5rem 0;
  }

   .side1.hidden,
  .side2.hidden {
    display: none !important;
  }
  .main.mobile {
    padding: 1rem;
    max-width: 100vw;
    overflow-y: visible;
  }
  .mobile-nav {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: $base4;
    justify-content: flex-start;
    align-items: center;
    border-bottom: 1px solid $base2;
    button {
      font-size: 1.1rem;
      background: $base2;
      color: $text1;
      border: none;
      border-radius: 6px;
      padding: 0.5rem 1rem;
      cursor: pointer;
    }
  }

  .version{
    display:none;
  }
}

</style>