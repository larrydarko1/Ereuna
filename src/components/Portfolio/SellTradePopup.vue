<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-content">
      <button class="close-x" @click="close" aria-label="Close">&times;</button>
      <h2>{{ isShort ? 'Buy' : 'Sell' }} {{ symbol }}</h2>
      <form @submit.prevent="submitSell">
        <div class="input-row input-row-flex">
          <div class="input-flex-vertical">
            <label for="date">Date</label>
            <div class="custom-date-picker">
              <input
                id="date"
                type="text"
                :value="formattedDate"
                @click="toggleCalendar"
                readonly
                required
                placeholder="Select a date"
                class="date-input"
              />
              <div v-if="showCalendar" class="calendar-dropdown">
                <div class="calendar-header">
                  <button type="button" @click="previousMonth" class="nav-btn">&lt;</button>
                  <div class="month-year">{{ currentMonthYear }}</div>
                  <button type="button" @click="nextMonth" class="nav-btn">&gt;</button>
                </div>
                <div class="calendar-grid">
                  <div class="weekday" v-for="day in weekdays" :key="day">{{ day }}</div>
                  <div
                    v-for="day in calendarDays"
                    :key="day.key"
                    :class="['calendar-day', {
                      'other-month': !day.isCurrentMonth,
                      'selected': day.isSelected,
                      'today': day.isToday,
                      'disabled': day.isDisabled
                    }]"
                    @click="!day.isDisabled && selectDate(day.date)"
                  >
                    {{ day.day }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="input-flex-vertical" style="margin-left: 12px;">
            <label for="symbol">Symbol</label>
            <input id="symbol" :value="symbol" readonly />
          </div>
        </div>
        <div class="input-row">
          <label for="shares">Shares</label>
          <input
            id="shares"
            type="number"
            v-model.number="sellShares"
            :max="maxShares"
            min="0.00000001"
            step="any"
            required
            :placeholder="`Max: ${maxShares}`"
          />
          <small class="hint">You own {{ maxShares }} shares (up to 8 decimals)</small>
        </div>
        <div class="input-row input-row-flex">
          <div class="input-flex-vertical">
            <label for="price">Price</label>
            <input
              id="price"
              type="number"
              v-model.number="sellPrice"
              min="0.0000000001"
              step="any"
              required
              :placeholder="currentPrice ? `$${Number(currentPrice).toFixed(currentPrice < 1 ? 8 : 2)}` : 'e.g. 185.00'"
            />
          </div>
          <div class="input-flex-vertical" style="margin-left: 12px;">
            <label for="commission">Commission <span style="font-weight:400; color:var(--text2); font-size:0.97em;">(optional)</span></label>
            <input id="commission" type="number" v-model.number="sellCommission" min="0" step="any" placeholder="e.g. 1.50" />
          </div>
        </div>
        <div class="input-row" style="margin-top: 8px;">
          <div>
            <strong>Total:</strong> ${{ sellTotal.toFixed(2) }}
            <span v-if="sellCommission"> (incl. ${{ sellCommission.toFixed(2) }} commission)</span>
          </div>
        </div>
        <div class="modal-actions">
          <button type="submit" class="trade-btn">Submit</button>
          <button type="button" class="cancel-btn" @click="close">Cancel</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
const props = defineProps({
  symbol: String,
  maxShares: Number,
  price: Number,
  currentPrice: Number,
  user: String,
  apiKey: String,
  portfolio: {
  type: Number,
  required: true
},
  isShort: {
    type: Boolean,
    default: false
  }
})
const emit = defineEmits(['close', 'sell', 'notify'])

const today = new Date().toISOString().slice(0, 10)
const sellDate = ref(today)
const sellShares = ref(1)
const sellPrice = ref(props.currentPrice || props.price || 0)
const sellCommission = ref(0)
const sellTotal = computed(() => Number((sellShares.value * sellPrice.value + (sellCommission.value || 0)).toFixed(10)))

// Custom calendar state
const showCalendar = ref(false)
const currentMonth = ref(new Date().getMonth())
const currentYear = ref(new Date().getFullYear())

const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const formattedDate = computed(() => {
  if (!sellDate.value) return ''
  const date = new Date(sellDate.value + 'T00:00:00')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
})

const currentMonthYear = computed(() => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${months[currentMonth.value]} ${currentYear.value}`
})

const calendarDays = computed(() => {
  const days = []
  const firstDay = new Date(currentYear.value, currentMonth.value, 1)
  const lastDay = new Date(currentYear.value, currentMonth.value + 1, 0)
  const prevLastDay = new Date(currentYear.value, currentMonth.value, 0)
  
  const firstDayOfWeek = firstDay.getDay()
  const lastDateOfMonth = lastDay.getDate()
  const prevLastDate = prevLastDay.getDate()
  
  const todayDate = new Date()
  const maxDate = new Date(today)
  
  // Previous month's trailing days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = prevLastDate - i
    const date = new Date(currentYear.value, currentMonth.value - 1, day)
    days.push({
      day,
      date: formatDateToISO(date),
      isCurrentMonth: false,
      isSelected: false,
      isToday: false,
      isDisabled: date > maxDate,
      key: `prev-${day}`
    })
  }
  
  // Current month's days
  for (let day = 1; day <= lastDateOfMonth; day++) {
    const date = new Date(currentYear.value, currentMonth.value, day)
    const dateStr = formatDateToISO(date)
    const isToday = date.toDateString() === todayDate.toDateString()
    days.push({
      day,
      date: dateStr,
      isCurrentMonth: true,
      isSelected: sellDate.value === dateStr,
      isToday,
      isDisabled: date > maxDate,
      key: `current-${day}`
    })
  }
  
  // Next month's leading days
  const remainingDays = 42 - days.length // 6 weeks * 7 days
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(currentYear.value, currentMonth.value + 1, day)
    days.push({
      day,
      date: formatDateToISO(date),
      isCurrentMonth: false,
      isSelected: false,
      isToday: false,
      isDisabled: date > maxDate,
      key: `next-${day}`
    })
  }
  
  return days
})

function formatDateToISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toggleCalendar() {
  showCalendar.value = !showCalendar.value
  if (showCalendar.value && sellDate.value) {
    const date = new Date(sellDate.value + 'T00:00:00')
    currentMonth.value = date.getMonth()
    currentYear.value = date.getFullYear()
  }
}

function selectDate(dateStr: string) {
  sellDate.value = dateStr
  showCalendar.value = false
}

function previousMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

// Clamp sellShares to maxShares only when greater than max
watch(sellShares, (val) => {
  if (props.maxShares !== undefined && val > props.maxShares) sellShares.value = props.maxShares
})

// Always update sellPrice if currentPrice changes
watch(() => props.currentPrice, (val) => { if (val) sellPrice.value = val })

function close() {
  emit('close')
}
const loading = ref(false)
const errorMsg = ref('')

function validateInputs() {
  if (!props.symbol || typeof props.symbol !== 'string') {
    errorMsg.value = 'Invalid symbol.'
    return false
  }
  if (!sellDate.value) {
    errorMsg.value = 'Date is required.'
    return false
  }
  if (isNaN(sellShares.value) || sellShares.value < 0.00000001 || (props.maxShares !== undefined && sellShares.value > props.maxShares)) {
    errorMsg.value = `Shares must be between 0.00000001 and ${props.maxShares}`
    return false
  }
  if (isNaN(sellPrice.value) || sellPrice.value <= 0) {
    errorMsg.value = 'Price must be greater than 0.'
    return false
  }
  if (isNaN(sellCommission.value) || sellCommission.value < 0) {
    errorMsg.value = 'Commission must be 0 or positive.'
    return false
  }
  errorMsg.value = ''
  return true
}

async function submitSell() {
  if (!validateInputs()) {
    emit('notify', errorMsg.value)
    return
  }
  loading.value = true
  
  // For short positions, we're buying back (closing), so action should be "Buy"
  // For long positions, we're selling, so action is "Sell"
  const action = props.isShort ? "Buy" : "Sell";
  
  console.log('SellTradePopup - isShort:', props.isShort, 'action:', action);  // Debug log
  
  const trade = {
    Symbol: props.symbol,
    Shares: sellShares.value,
    Action: action,
    Price: sellPrice.value,
    Date: sellDate.value, 
    Total: sellTotal.value,
    Commission: sellCommission.value || 0
  }
  try {
    const response = await fetch(`/api/trades/sell`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': props.apiKey ?? ''
      } as Record<string, string>,
      body: JSON.stringify({
        username: props.user,
        portfolio: props.portfolio, 
        trade
      })
    })
    if (!response.ok) {
      emit('notify', 'Failed to sell position')
      throw new Error('Failed to sell position')
    }
    emit('sell', trade)
    emit('notify', 'Trade added successfully!')
  } catch (error) {
    emit('notify', 'Error selling position')
  } finally {
    loading.value = false
    close()
  }
}
</script>

<style scoped>
/* Use the same styles as your trade popup for consistency */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(24, 25, 38, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(2px);
}
.modal-content {
  position: relative;
  background: var(--base2);
  color: var(--text1);
  border-radius: 18px;
  padding: 24px 28px 20px 28px;
  min-width: 340px;
  box-shadow: 0 8px 32px 0 rgba(0,0,0,0.18), 0 1.5px 8px 0 var(--accent4);
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: popup-in 0.18s cubic-bezier(.4,1.4,.6,1) backwards;
}
/* Loader styles from BaseValue */
.loader {
  display: inline-block;
  width: 28px;
  height: 28px;
  border: 3px solid var(--accent1);
  border-radius: 50%;
  border-top: 3px solid var(--base3);
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes popup-in {
  from { transform: translateY(30px) scale(0.98); opacity: 0; }
  to   { transform: none; opacity: 1; }
}
.close-x {
  position: absolute;
  top: 14px;
  right: 14px;
  background: none;
  border: none;
  color: var(--text2);
  font-size: 1.6rem;
  cursor: pointer;
  transition: color 0.15s;
  line-height: 1;
  padding: 0;
}
.close-x:hover { color: var(--accent1); }
h2 { margin: 0 0 4px 0; font-size: 1.25rem; font-weight: 700; color: var(--accent1); }
form { display: flex; flex-direction: column; gap: 12px; }
.input-row { display: flex; flex-direction: column; gap: 4px; }
.input-row-flex {
  display: flex;
  flex-direction: row;
  gap: 0;
  align-items: flex-start;
}

.input-flex-vertical {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}
label { font-size: 0.92rem; color: var(--text2); font-weight: 500; }
input {
  padding: 8px 10px;
  border-radius: 7px;
  border: 1.5px solid var(--base3);
  background: var(--base1);
  color: var(--text1);
  font-size: 1rem;
  outline: none;
  transition: border-color 0.18s;
}
input:focus { border-color: var(--accent1); background: var(--base4); }
.hint { color: var(--text2); font-size: 0.92em; margin-top: 2px; }
.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 4px;
  justify-content: flex-end;
}
.trade-btn {
  background: var(--accent1);
  color: var(--text3);
  border: none;
  border-radius: 7px;
  padding: 8px 20px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.18s;
}
.trade-btn:hover { background: var(--accent2); }
.cancel-btn {
  background: transparent;
  color: var(--text2);
  border: 1.5px solid var(--base3);
  border-radius: 7px;
  padding: 8px 20px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: border-color 0.18s, color 0.18s;
}
.cancel-btn:hover { border-color: var(--accent1); color: var(--accent1); }
.input-row-flex {
  display: flex;
  flex-direction: row;
  gap: 0;
  align-items: flex-start;
}
.input-flex-vertical {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

/* Custom Date Picker Styles */
.custom-date-picker {
  position: relative;
}

.date-input {
  cursor: pointer;
  user-select: none;
  background: var(--base1) url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>') no-repeat right 10px center;
  padding-right: 36px;
}

.date-input:focus {
  background-color: var(--base4);
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>') no-repeat right 10px center;
}

.calendar-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--base2);
  border-radius: 12px;
  border: 1.5px solid var(--base3);
  padding: 14px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25), 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  animation: calendar-appear 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes calendar-appear {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1.5px solid var(--base3);
}

.nav-btn {
  background: transparent;
  border: none;
  color: var(--accent1);
  font-size: 1.2rem;
  font-weight: 700;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: 6px;
  transition: all 0.18s;
  line-height: 1;
}

.nav-btn:hover {
  background: var(--base3);
  color: var(--accent2);
}

.month-year {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text1);
  letter-spacing: 0.01em;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.weekday {
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text2);
  padding: 6px 0;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.88rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.18s;
  color: var(--text1);
  font-weight: 500;
  position: relative;
}

.calendar-day:not(.disabled):not(.other-month):hover {
  background: var(--base3);
  color: var(--accent1);
  transform: scale(1.05);
}

.calendar-day.other-month {
  color: var(--text3);
  opacity: 0.4;
}

.calendar-day.disabled {
  color: var(--text3);
  opacity: 0.3;
  cursor: not-allowed;
}

.calendar-day.today {
  background: var(--base4);
  font-weight: 700;
}

.calendar-day.today::after {
  content: '';
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--accent1);
}

.calendar-day.selected {
  background: var(--accent1);
  color: var(--text3);
  font-weight: 700;
}

.calendar-day.selected:hover {
  background: var(--accent2);
  transform: scale(1.05);
}

.calendar-day.selected.today::after {
  background: var(--text3);
}
</style>