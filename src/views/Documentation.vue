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
        <span class="nav-version">2025.248</span>
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
      <span class="version">Ereuna 2025.248</span>
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

.documentation {
  background: $base1;
  height: 100vh;
  width: 100%;
  display: grid;
  grid-template-columns: 280px 320px 1fr;
  grid-template-rows: 1fr;
  gap: 0;
  overflow: hidden;
}

.side1 {
  background: linear-gradient(135deg, $base2 0%, $base1 100%);
  display: flex;
  flex-direction: column;
  position: relative;
  border-right: 1px solid $base3;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  z-index: 5000;
}

.side1 .icon {
  height: auto;
  width: auto;
  max-width: 200px;
  margin: 20px;
  cursor: pointer;
}

.side1 p {
  font-size: 1rem;
  font-weight: 500;
  color: $text2;
  text-align: left;
  padding: 12px 20px;
  margin: 4px 12px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  font-weight: bold;
  
  &:hover {
    color: $text1;
    background: rgba(255, 255, 255, 0.05);
  }
  
  &.active {
    color: $text4;
    background: linear-gradient(135deg, $accent1 0%, $accent2 100%);
    box-shadow: 0 4px 12px rgba($accent1, 0.3);
  }
}

.side1 .version {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  font-size: 0.8rem;
  color: $text3;
  text-align: center;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  backdrop-filter: blur(10px);
}

.side2 {
  background: $base1;
  padding-top: 1rem;
  display: flex;
  flex-direction: column;
  position: relative;
  border-right: 1px solid $base3;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  overflow-y: auto;
  overflow-x: hidden;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: $base3;
    border-radius: 3px;
    
    &:hover {
      background: $accent1;
    }
  }
}

.side2 p {
  font-size: 0.95rem;
  font-weight: 400;
  color: $text2;
  text-align: left;
  padding: 10px 20px;
  margin: 2px 8px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
  
  &.bold {
    font-weight: 600;
    color: $text1;
  }
  
  &:hover {
    color: $text1;
    background: rgba(255, 255, 255, 0.05);
  }
  
  &.active {
    color: $text1;
    background: linear-gradient(135deg, rgba($accent1, 0.1) 0%, rgba($accent2, 0.1) 100%);
    font-weight: 500;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
  }
}

.main {
  background: linear-gradient(135deg, $base4 0%, $base1 100%);
  padding: 32px 40px;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: $base3;
    border-radius: 4px;
    
    &:hover {
      background: $accent1;
    }
  }
  
  // Add subtle pattern overlay for depth
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 600px; // After sidebars
    right: 0;
    bottom: 0;
    background-image: 
      radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.02) 0%, transparent 50%),
      radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.01) 0%, transparent 50%);
    background-size: 400px 400px;
    background-repeat: no-repeat;
    background-position: center;
    pointer-events: none;
    z-index: 1;
  }
  
  // Ensure content is above the overlay
  & > * {
    position: relative;
    z-index: 2;
  }
}

//mobile version
@media (max-width: 768px) {
  .documentation {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    grid-template-columns: none;
    gap: 0;
  }

  .mobile-nav {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
    background: linear-gradient(135deg, $base4 0%, $base2 100%);
    align-items: center;
    border-bottom: 1px solid $base3;
    position: sticky;
    top: 0;
    z-index: 1000;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    
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
        opacity: 0.9;
        transition: opacity 0.2s ease;
        
        &:hover {
          opacity: 1;
        }
      }
      
      .nav-buttons {
        display: flex;
        gap: 0.5rem;
        
        button {
          font-size: 0.9rem;
          font-weight: 600;
          background: $base2;
          color: $text2;
          border: 1px solid $base3;
          border-radius: 8px;
          padding: 0.75rem 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          flex: 1;
          max-width: 80px;
          
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
            background: linear-gradient(135deg, $accent1 0%, $accent2 100%) !important;
            color: $base4 !important;
            border-color: $accent1 !important;
            box-shadow: 0 4px 12px rgba($accent1, 0.3);
          }
          
          &:hover:not(.active) {
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
            transform: translateY(0);
          }
          
          &.active:hover,
          &.active:focus {
            background: linear-gradient(135deg, $accent1 0%, $accent2 100%) !important;
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
        font-size: 1.5rem;
        font-weight: 700;
        color: $text1;
        margin: 0;
        line-height: 1;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      }
      
      .nav-version {
        font-size: 0.85rem;
        color: $text2;
        font-weight: 500;
        opacity: 0.8;
        background: rgba(255, 255, 255, 0.1);
        padding: 2px 8px;
        border-radius: 10px;
        backdrop-filter: blur(10px);
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
    border-right: none;
    box-shadow: none;
  }

  .side1 {
    background: linear-gradient(135deg, $base2 0%, $base1 100%);
    height: calc(100vh - 120px);
    overflow-y: auto;
    padding: 1rem 0;
    
    &::-webkit-scrollbar {
      width: 6px;
    }
    
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    
    &::-webkit-scrollbar-thumb {
      background: $base3;
      border-radius: 3px;
    }
  }

  .side2 {
    background: $base1;
    height: calc(100vh - 120px);
    overflow-y: auto;
    padding: 1rem 0;
    
    &::-webkit-scrollbar {
      width: 6px;
    }
    
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    
    &::-webkit-scrollbar-thumb {
      background: $base3;
      border-radius: 3px;
    }
  }

  .main {
    padding: 1.5rem;
    overflow-y: auto;
    height: calc(100vh - 120px);
    background: linear-gradient(135deg, $base4 0%, $base1 100%);
    flex: 1;
    
    &::-webkit-scrollbar {
      width: 6px;
    }
    
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    
    &::-webkit-scrollbar-thumb {
      background: $base3;
      border-radius: 3px;
    }
  }

  .side1.hidden,
  .side2.hidden,
  .main.hidden {
    display: none !important;
  }

  .side1 p {
    font-size: 1.1rem;
    font-weight: 600;
    padding: 1rem 1.5rem;
    margin: 0.25rem 1rem;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .side2 p {
    font-size: 1rem;
    font-weight: 500;
    padding: 0.875rem 1.5rem;
    margin: 0.125rem 1rem;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .side1 .icon {
    height: 40px;
    width: auto;
    margin: 1rem;
  }

  .version {
    display: none;
  }
}

</style>