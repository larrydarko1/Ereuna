<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-content">
      <button class="close-x" @click="close" aria-label="Close">&times;</button>
      <h2>Edit Trade</h2>
      
      <div class="info-box">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 16H12V12H11M12 8H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div>
          Editing this trade will recalculate your entire portfolio from scratch to ensure accuracy.
        </div>
      </div>

      <form @submit.prevent="submitEdit">
        <div class="input-row input-row-flex">
          <div class="input-flex-vertical">
            <label for="edit-date">Date</label>
            <div class="custom-date-picker">
              <input
                id="edit-date"
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
            <label for="edit-symbol">Symbol (locked)</label>
            <input id="edit-symbol" :value="localTrade.Symbol" readonly class="symbol-locked" />
          </div>
        </div>

        <div class="input-row">
          <label>Action</label>
          <div style="display: flex; gap: 8px;">
            <button
              type="button"
              :class="['action-btn', localTrade.Action === 'Buy' ? 'active buy' : '']"
              @click="localTrade.Action = 'Buy'"
            >
              Buy
            </button>
            <button
              type="button"
              :class="['action-btn', localTrade.Action === 'Sell' ? 'active sell' : '']"
              @click="localTrade.Action = 'Sell'"
            >
              Sell
            </button>
          </div>
        </div>

        <div class="input-row">
          <label>Position Type</label>
          <div style="display: flex; gap: 8px;">
            <button
              type="button"
              :class="['position-type-btn', !localTrade.IsShort ? 'active' : '']"
              @click="localTrade.IsShort = false"
            >
              Long
            </button>
            <button
              type="button"
              :class="['position-type-btn', localTrade.IsShort ? 'active' : '']"
              @click="localTrade.IsShort = true"
            >
              Short
            </button>
          </div>
        </div>

        <div class="input-row">
          <label for="edit-shares">Shares</label>
          <input
            id="edit-shares"
            type="number"
            v-model.number="localTrade.Shares"
            min="0.00000001"
            step="any"
            required
            @input="updateTotal"
          />
          <small class="hint">Fractional shares supported (up to 8 decimals)</small>
        </div>

        <div class="input-row input-row-flex">
          <div class="input-flex-vertical">
            <label for="edit-price">Price</label>
            <input
              id="edit-price"
              type="number"
              v-model.number="localTrade.Price"
              min="0.0000000001"
              step="any"
              required
              @input="updateTotal"
            />
          </div>
          <div class="input-flex-vertical" style="margin-left: 12px;">
            <label for="edit-commission">Commission</label>
            <input
              id="edit-commission"
              type="number"
              v-model.number="localTrade.Commission"
              min="0"
              step="any"
              @input="updateTotal"
            />
          </div>
        </div>

        <div class="input-row">
          <label for="edit-leverage">Leverage</label>
          <input
            id="edit-leverage"
            type="number"
            v-model.number="localTrade.Leverage"
            min="1"
            max="10"
            step="0.5"
          />
          <small class="hint">Leverage multiplier (1x = no leverage, max 10x)</small>
        </div>

        <div class="calculated-info">
          <div class="info-item">
            <span class="info-label">Total:</span>
            <span class="info-value">${{ localTrade.Total?.toFixed(2) }}</span>
          </div>
          <div v-if="localTrade.Leverage && localTrade.Leverage > 1" class="info-item">
            <span class="info-label">Leverage:</span>
            <span class="info-value leverage-highlight">{{ localTrade.Leverage }}x</span>
          </div>
        </div>

        <div v-if="loading" class="loading-state">
          <div class="loader"></div>
          <span>Updating trade and recalculating portfolio...</span>
        </div>

        <div v-if="errorMsg" class="error-msg">
          {{ errorMsg }}
        </div>

        <div class="modal-actions">
          <button 
            type="submit" 
            class="save-btn" 
            :disabled="loading || !hasChanges"
          >
            <span v-if="!loading">Save Changes</span>
            <span v-else>Processing...</span>
          </button>
          <button type="button" class="cancel-btn" @click="close" :disabled="loading">Cancel</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

type Trade = {
  _id?: string;
  Date?: string;
  Symbol?: string;
  Action?: string;
  Shares?: number;
  Price?: number;
  Commission?: number;
  Total?: number;
  Leverage?: number;
  IsShort?: boolean;
}

const props = defineProps({
  trade: {
    type: Object as () => Trade,
    required: true
  },
  user: String,
  apiKey: String,
  portfolio: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['close', 'updated', 'notify'])

const loading = ref(false)
const errorMsg = ref('')
const today = new Date().toISOString().slice(0, 10)

// Custom calendar state
const showCalendar = ref(false)
const currentMonth = ref(new Date().getMonth())
const currentYear = ref(new Date().getFullYear())

const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

// Create a local copy of the trade for editing
const localTrade = ref<Trade>({
  ...props.trade,
  Date: props.trade.Date ? new Date(props.trade.Date).toISOString().slice(0, 10) : today,
  Commission: props.trade.Commission || 0,
  Leverage: props.trade.Leverage || 1,
  IsShort: props.trade.IsShort || false
})

const formattedDate = computed(() => {
  if (!localTrade.value.Date) return ''
  const date = new Date(localTrade.value.Date + 'T00:00:00')
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
      isSelected: localTrade.value.Date === dateStr,
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

// Track if there are changes
const hasChanges = computed(() => {
  return (
    localTrade.value.Date !== new Date(props.trade.Date || '').toISOString().slice(0, 10) ||
    localTrade.value.Action !== props.trade.Action ||
    localTrade.value.Shares !== props.trade.Shares ||
    localTrade.value.Price !== props.trade.Price ||
    localTrade.value.Commission !== props.trade.Commission ||
    localTrade.value.Leverage !== props.trade.Leverage ||
    localTrade.value.IsShort !== props.trade.IsShort
  )
})

function formatDateToISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toggleCalendar() {
  showCalendar.value = !showCalendar.value
  if (showCalendar.value && localTrade.value.Date) {
    const date = new Date(localTrade.value.Date + 'T00:00:00')
    currentMonth.value = date.getMonth()
    currentYear.value = date.getFullYear()
  }
}

function selectDate(dateStr: string) {
  localTrade.value.Date = dateStr
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

function updateTotal() {
  const shares = localTrade.value.Shares || 0
  const price = localTrade.value.Price || 0
  const commission = localTrade.value.Commission || 0
  localTrade.value.Total = Number((shares * price + commission).toFixed(10))
}

// Watch for changes in shares, price, or commission to update total
watch([
  () => localTrade.value.Shares,
  () => localTrade.value.Price,
  () => localTrade.value.Commission
], () => {
  updateTotal()
})

async function submitEdit() {
  if (!props.trade._id) {
    errorMsg.value = 'Trade ID is missing. Cannot edit.'
    emit('notify', errorMsg.value)
    return
  }

  if (!hasChanges.value) {
    emit('notify', 'No changes detected.')
    return
  }

  loading.value = true
  errorMsg.value = ''

  try {
    // Prepare the updated trade data
    const updatedTrade = {
      Date: new Date(localTrade.value.Date || '').toISOString(),
      Action: localTrade.value.Action,
      Shares: Number(localTrade.value.Shares),
      Price: Number(localTrade.value.Price),
      Commission: Number(localTrade.value.Commission || 0),
      Total: Number(localTrade.value.Total),
      Leverage: Number(localTrade.value.Leverage || 1),
      IsShort: Boolean(localTrade.value.IsShort)
    }

    const response = await fetch(`/api/trades/${props.trade._id}?username=${props.user}&portfolio=${props.portfolio}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': props.apiKey ?? ''
      } as Record<string, string>,
      body: JSON.stringify({ trade: updatedTrade })
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || 'Failed to update trade')
    }

    emit('notify', 'Trade updated successfully! Portfolio recalculated.')
    emit('updated')
    close()
  } catch (error) {
    errorMsg.value = error instanceof Error ? error.message : 'Failed to update trade'
    emit('notify', errorMsg.value)
  } finally {
    loading.value = false
  }
}

function close() {
  if (!loading.value) {
    emit('close')
  }
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--base1) 55%, transparent);
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
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px 0 rgba(0,0,0,0.18), 0 1.5px 8px 0 var(--accent4);
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: popup-in 0.18s cubic-bezier(.4,1.4,.6,1) backwards;
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

.close-x:hover {
  color: var(--accent1);
}

h2 {
  margin: 0 0 4px 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--accent1);
  letter-spacing: 0.01em;
}

.info-box {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  background: color-mix(in srgb, var(--accent1) 8%, transparent);
  border: 1.5px solid color-mix(in srgb, var(--accent1) 25%, transparent);
  border-radius: 10px;
  color: var(--accent1);
  font-size: 0.88rem;
  line-height: 1.4;
}

.info-box svg {
  flex-shrink: 0;
  margin-top: 2px;
}

form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

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

label {
  font-size: 0.92rem;
  color: var(--text2);
  font-weight: 500;
  letter-spacing: 0.01em;
}

input {
  padding: 8px 10px;
  border-radius: 7px;
  border: 1.5px solid var(--base3);
  background: var(--base1);
  color: var(--text1);
  font-size: 1rem;
  outline: none;
  transition: border-color 0.18s, background 0.18s;
}

input:focus {
  border-color: var(--accent1);
  background: var(--base4);
}

.symbol-locked {
  font-weight: 700;
  letter-spacing: 0.02em;
  opacity: 0.8;
  cursor: not-allowed;
}

.hint {
  font-size: 0.88em;
  color: var(--text2);
  margin-top: 4px;
}

.action-btn,
.position-type-btn {
  flex: 1;
  padding: 8px 14px;
  border-radius: 7px;
  border: 1.5px solid var(--base3);
  background: var(--base1);
  color: var(--text2);
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.18s;
}

.action-btn:hover,
.position-type-btn:hover {
  border-color: var(--accent1);
  color: var(--accent1);
}

.action-btn.active.buy {
  background: color-mix(in srgb, var(--positive) 15%, transparent);
  border-color: color-mix(in srgb, var(--positive) 35%, transparent);
  color: var(--positive);
}

.action-btn.active.sell {
  background: color-mix(in srgb, var(--negative) 15%, transparent);
  border-color: color-mix(in srgb, var(--negative) 35%, transparent);
  color: var(--negative);
}

.position-type-btn.active {
  background: var(--accent1);
  color: var(--text3);
  border-color: var(--accent1);
}

.calculated-info {
  background: var(--base1);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-weight: 500;
  color: var(--text2);
}

.info-value {
  font-weight: 600;
  color: var(--text1);
  font-size: 1rem;
}

.leverage-highlight {
  color: var(--accent2);
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--base1);
  border-radius: 8px;
  color: var(--accent1);
}

.loader {
  width: 20px;
  height: 20px;
  border: 2px solid var(--accent1);
  border-radius: 50%;
  border-top: 2px solid var(--base3);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-msg {
  padding: 10px 12px;
  background: color-mix(in srgb, var(--negative) 8%, transparent);
  border: 1.5px solid color-mix(in srgb, var(--negative) 25%, transparent);
  border-radius: 8px;
  color: var(--negative);
  font-size: 0.9rem;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 4px;
  justify-content: flex-end;
}

.save-btn {
  background: var(--accent1);
  color: var(--text3);
  border: none;
  border-radius: 7px;
  padding: 8px 20px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: opacity 0.18s;
}

.save-btn:hover:not(:disabled) {
  opacity: 0.85;
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

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

.cancel-btn:hover:not(:disabled) {
  border-color: var(--accent1);
  color: var(--accent1);
}

.cancel-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Custom Date Picker Styles */
.custom-date-picker {
  position: relative;
}

.date-input {
  cursor: pointer;
  user-select: none;
  width: 90%;
  background: var(--base1) url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>') no-repeat right 10px center;
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
