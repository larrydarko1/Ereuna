<template>
  <div class="documentation">
    <!-- Mobile Navigation Header -->
    <div class="mobile-nav" v-if="isMobile">
      <div class="nav-top">
        <img class="nav-logo" src="@/assets/icons/ereuna.png" alt="Ereuna" @click="router.push('/')">
        <div class="nav-buttons">
          <button 
            :class="{ active: mobileView === 'menu' }" 
            @click="mobileView = 'menu'"
          >
            Menu
          </button>
          <button 
            :class="{ active: mobileView === 'submenu' }" 
            @click="mobileView = 'submenu'"
          >
            Topics
          </button>
          <button 
            :class="{ active: mobileView === 'content' }" 
            @click="mobileView = 'content'"
          >
            Content
          </button>
        </div>
      </div>
      <div class="nav-title">
        <h1>Docs</h1>
        <span class="nav-version">v3.9.1</span>
      </div>
    </div>

    <div class="side1" :class="{ hidden: isMobile && mobileView !== 'menu' }">
      <img v-if="!isMobile" class="icon" src="@/assets/icons/ereuna.png" alt="Owl Icon" @click="router.push('/')">
      <p
        v-for="item in side1Items"
        :key="item"
        :class="{ active: selectedSide1 === item }"
        @click="() => { 
          selectedSide1 = item; 
          selectedSide2 = side2Items[item][0]; 
          if (isMobile) mobileView = 'submenu';
        }"
      >
        {{ item }}
      </p>
      <span class="version">Ereuna v3.9.1</span>
    </div>
    
    <div class="side2" :class="{ hidden: isMobile && mobileView !== 'submenu' }">
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
        @click="() => { 
          selectedSide2 = item; 
          if (isMobile) mobileView = 'content';
        }"
      >
        {{ item }}
      </p>
    </div>
    
    <div class="main" :class="{ hidden: isMobile && mobileView !== 'content' }">
      <component :is="getComponentName(selectedSide2)" v-if="selectedSide2" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()

// Mobile detection and navigation
const isMobile = ref(false)
const mobileView = ref<'menu' | 'submenu' | 'content'>('content')

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

// Import all documentation components
import WelcomeDoc from '@/components/Docs/WelcomeDoc.vue'
import SupportedAssetsDoc from '@/components/Docs/supportedAssets.vue'
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
  Introduction: ['Welcome', 'Supported Tickers', 'Create Account', 'Recover Password'],
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
  'Supported Tickers': SupportedAssetsDoc,
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
    height: 100vh;
    overflow: hidden;
  }

  .mobile-nav {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    background: $base4;
    align-items: center;
    border-bottom: 1px solid $base2;
    position: sticky;
    top: 0;
    z-index: 1000;
    
    .nav-top {
      display: flex;
      width: 100%;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      
      .nav-logo {
        height: 40px;
        width: auto;
        cursor: pointer;
        opacity: 0.8;
        transition: opacity 0.3s ease;
        &:hover {
          opacity: 1;
        }
      }
      
      .nav-buttons {
        display: flex;
        gap: 0.75rem;
        button {
          font-size: 1.1rem;
          font-weight: 600;
          background: $base2;
          color: $text2;
          border: 1px solid $base3;
          border-radius: 8px;
          padding: 0.875rem 1.25rem;
          cursor: pointer;
          transition: all 0.15s ease;
          flex: 1;
          max-width: 100px;
          
          /* Reset all default button styles */
          outline: none;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
          -webkit-user-select: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          text-decoration: none;
          box-shadow: none;
          
          &.active {
            background: $accent1 !important;
            color: $base4 !important;
            border-color: $accent1 !important;
          }
          
          &:hover {
            background: $base3;
            color: $text1;
          }
          
          &:focus {
            background: $base3;
            color: $text1;
          }
          
          &:active {
            background: $base2;
            color: $text2;
          }
          
          &.active:hover,
          &.active:focus {
            background: $accent1 !important;
            color: $base4 !important;
          }
        }
      }
    }
    
    .nav-title {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 0.5rem;
      
      h1 {
        font-size: 1.4rem;
        font-weight: 700;
        color: $text1;
        margin: 0;
        line-height: 1;
      }
      
      .nav-version {
        font-size: 0.8rem;
        color: $text2;
        font-weight: 500;
        opacity: 0.8;
      }
    }
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
    flex: none;
  }

  .side1 {
    background: $base2;
    height: calc(100vh - 80px);
    overflow-y: auto;
    padding: 1rem 0;
  }

  .side2 {
    background: $base1;
    height: calc(100vh - 80px);
    overflow-y: auto;
    padding: 1rem 0;
  }

  .main {
    padding: 1rem;
    overflow-y: auto;
    height: calc(100vh - 80px);
    background: $base4;
    flex: 1;
  }

  .side1.hidden,
  .side2.hidden,
  .main.hidden {
    display: none !important;
  }

  .side1 p {
    font-size: 1.6rem;
    font-weight: 600;
    padding: 1rem 1.5rem;
    margin: 0.5rem 1rem;
  }

  .side2 p {
    font-size: 1.5rem;
    font-weight: 500;
    padding: 0.75rem 1.5rem;
    margin: 0.25rem 1rem;
  }

  .icon {
    height: 40px;
    margin: 1rem;
  }

  .version {
    display: none;
  }
}

</style>