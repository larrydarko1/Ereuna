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
      <span class="version">Ereuna v1.0.5</span>
    </div>
  <div class="side2">
  <p
    v-for="item in side2Items[selectedSide1]"
    :key="item"
    :class="[
      { active: selectedSide2 === item },
      { bold: [
          'One-Click Multi-Screener',
          'Hide Stock Feature'
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

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()

// Import all documentation components
import WelcomeDoc from '@/components/Docs/WelcomeDoc.vue'
import CreateAccountDoc from '@/components/Docs/createAccount.vue'
import RecoverPasswordDoc from '@/components/Docs/RecoverPassword.vue'
import ChangeUsernameDoc from '@/components/Docs/ChangeUsername.vue'
import ChangePasswordDoc from '@/components/Docs/ChangePassword.vue'
import RecoveryKeyDoc from '@/components/Docs/RecoveryKey.vue'
import DeleteAccountDoc from '@/components/Docs/DeleteAccount.vue'
import SubscriptionDoc from '@/components/Docs/Subscriptions.vue'
import ThemesDoc from '@/components/Docs/Themes.vue'
import Security from '@/components/Docs/Security.vue'
import EditPanel from '@/components/Docs/EditPanel.vue'
import SummaryTable from '@/components/Docs/SummaryTable.vue'
import GrowthTables from '@/components/Docs/GrowthTables.vue'
import SplitDivTable from '@/components/Docs/SplitDivTable.vue'
import FinancialsTable from '@/components/Docs/FinancialsTable.vue'
import Notes from '@/components/Docs/Notes.vue'
import Benchmarks from '@/components/Docs/Benchmarks.vue'
import Legends from '@/components/Docs/Legends.vue'
import Indicators from '@/components/Docs/Indicators.vue'
import CreateWatchlist from '@/components/Docs/CreateWatchlist.vue'
import RenameWatchlist from '@/components/Docs/RenameWatchlist.vue'
import AddSymbol from '@/components/Docs/AddSymbol.vue'
import RemoveSymbol from '@/components/Docs/RemoveSymbol.vue'
import OrderSymbols from '@/components/Docs/OrderSymbols.vue'
import SortSymbols from '@/components/Docs/SortSymbols.vue'
import CreateNote from '@/components/Docs/CreateNote.vue'
import AutoplayWatchlist from '@/components/Docs/AutoplayWatchlist.vue'
import CreateScreener from '@/components/Docs/CreateScreener.vue'
import SelectScreener from '@/components/Docs/SelectScreener.vue'
import RenameScreener from '@/components/Docs/RenameScreener.vue'
import DeleteScreener from '@/components/Docs/DeleteScreener.vue'
import SaveScreener from '@/components/Docs/SaveScreener.vue'
import ResetScreener from '@/components/Docs/ResetScreener.vue'
import MultiScreener from '@/components/Docs/MultiScreener.vue'
import AutoplayScreener from '@/components/Docs/AutoPlayScreener.vue'
import HideStock from '@/components/Docs/HideStock.vue'
import MiniCharts from '@/components/Docs/MiniCharts.vue'

const side1Items = ['Introduction', 'Account', 'Charts', 'Screener']
const side2Items = {
  Introduction: ['Welcome', 'Create Account', 'Recover Password'],
  Account: ['Change Username', 'Change Password', 'Generate Recovery Key','Delete Account', 'Subscription', 'Themes', 'Security / 2FA'],
  Charts: ['Edit Panel', 'Summary Table', 'EPS / Sales / Earning Tables', 'Dividends / Splits Tables', 'Financial Statements',
    'Notes', 'Benchmarks section', 'Legends / Buttons', 'Chart Indicators', 'Create a Watchlist', 'Rename a Watchlist', 'Add a Symbol',
    'Remove a Symbol', 'Reorder Symbols', 'Sort Watchlist Elements', 'Create a Note', 'Autoplay Watchlist'
  ],
 Screener: [
  'Create a Screener',
  'Select a Screener',
  'Rename a Screener',
  'Delete a Screener',
  'Save / Update a Screener',
  'Reset a Screener',
  'One-Click Multi-Screener',
  'Autoplay Results',
  'Hide Stock Feature',
  'Mini-Charts / Screener Summary',
]
}
const selectedSide1 = ref(side1Items[0])
const selectedSide2 = ref(side2Items[selectedSide1.value][0])

// Example: map side2 values to component names
const componentMap = {
  'Welcome': WelcomeDoc,
  'Create Account': CreateAccountDoc,
  'Recover Password': RecoverPasswordDoc,
  'Change Username': ChangeUsernameDoc,
  'Change Password': ChangePasswordDoc,
  'Generate Recovery Key': RecoveryKeyDoc,
  'Delete Account': DeleteAccountDoc,
  'Subscription': SubscriptionDoc,
  'Themes': ThemesDoc,
  'Security / 2FA': Security,
  'Edit Panel': EditPanel,
  'Summary Table': SummaryTable,
  'EPS / Sales / Earning Tables': GrowthTables,
  'Dividends / Splits Tables': SplitDivTable,
  'Financial Statements': FinancialsTable,
  'Notes': Notes,
  'Benchmarks section': Benchmarks,
  'Legends / Buttons': Legends,
  'Chart Indicators': Indicators,
  'Create a Watchlist': CreateWatchlist,
  'Rename a Watchlist': RenameWatchlist,
  'Add a Symbol': AddSymbol,
  'Remove a Symbol': RemoveSymbol,
  'Reorder Symbols': OrderSymbols,
  'Sort Watchlist Elements': SortSymbols,
  'Create a Note': CreateNote,
  'Autoplay Watchlist': AutoplayWatchlist,
  'Create a Screener': CreateScreener,
  'Select a Screener': SelectScreener,
  'Rename a Screener': RenameScreener,
  'Delete a Screener': DeleteScreener,
  'Save / Update a Screener': SaveScreener,
  'Reset a Screener': ResetScreener,
  'One-Click Multi-Screener': MultiScreener,
  'Autoplay Results': AutoplayScreener,
  'Hide Stock Feature': HideStock,
  'Mini-Charts / Screener Summary': MiniCharts,
  // ...add all other mappings here
}

function getComponentName(item) {
  return componentMap[item]
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
  background: $base4;
  flex-direction: column;
  height: 100vh;
  min-width: 300px;
  position: relative;
  overflow-y: scroll;
  z-index: 1000;
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
  background-color: $base1;
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
  max-width: 700px;
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