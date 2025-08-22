<template>
  <div class="import-modal-overlay" @click="$emit('close')">
    <div class="import-modal" @click.stop>
      <h3>Import Portfolio</h3>
      <p>Select a CSV file exported from Ereuna to import your portfolio, transaction history, and cash.</p>
      <input type="file" accept=".csv" @change="handleImportFile" />
      <div v-if="importError" class="import-error">{{ importError }}</div>
      <div class="import-actions">
        <button class="trade-btn" :disabled="loading" @click="$emit('close')">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  user: String,
  apiKey: String,
  portfolio: Number
});
const emit = defineEmits(['imported', 'close']);

const importError = ref('');
const loading = ref(false);

async function handleImportFile(event) {
  importError.value = '';
  const file = event.target.files[0];
  if (!file) return;
  // Security: limit file size to 1MB
  if (file.size > 1_000_000) {
    importError.value = 'File is too large.';
    return;
  }
  loading.value = true;
  try {
    const text = await file.text();
    const lines = text.split(/\r?\n/);

    // Find section indices
    const portfolioIdx = lines.findIndex(l => l.trim() === 'Portfolio');
    const txIdx = lines.findIndex(l => l.trim() === 'Transaction History');
    const cashIdx = lines.findIndex(l => l.trim().startsWith('Cash Balance'));

// --- Portfolio section ---
let portfolioData = [];
if (portfolioIdx !== -1 && txIdx !== -1) {
  // Find the header line (skip blank lines)
  let headerLine = portfolioIdx + 1;
  while (lines[headerLine] !== undefined && !lines[headerLine].trim()) headerLine++;
  const headers = lines[headerLine].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  // Data lines: from first non-empty after header to txIdx
  let i = headerLine + 1;
  while (i < txIdx) {
    if (!lines[i] || !lines[i].trim()) { i++; continue; }
    const values = lines[i].split(',').map(s => s.replace(/^"|"$/g, '').trim());
    if (values.length === headers.length) {
      const obj = {};
      headers.forEach((h, idx) => {
        if (h === 'Shares' || h === 'AvgPrice') {
          obj[h] = values[idx] === '-' ? '-' : Number(values[idx]);
        } else {
          obj[h] = values[idx];
        }
      });
      if (obj.Symbol) portfolioData.push(obj);
    }
    i++;
  }
}

// --- Transaction History section ---
let txData = [];
if (txIdx !== -1 && cashIdx !== -1) {
  let headerLine = txIdx + 1;
  while (lines[headerLine] !== undefined && !lines[headerLine].trim()) headerLine++;
  const headers = lines[headerLine].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  let i = headerLine + 1;
  while (i < cashIdx) {
    if (!lines[i] || !lines[i].trim()) { i++; continue; }
    const values = lines[i].split(',').map(s => s.replace(/^"|"$/g, '').trim());
    if (values.length === headers.length) {
      const obj = {};
      headers.forEach((h, idx) => {
        if (['Shares', 'Price', 'Commission', 'Total'].includes(h)) {
          obj[h] = values[idx] === '-' ? '-' : Number(values[idx]);
        } else if (h === 'Date') {
          const d = values[idx];
          obj[h] = /^\d{4}-\d{2}-\d{2}/.test(d) ? new Date(d).toISOString() : d;
        } else {
          obj[h] = values[idx];
        }
      });
      if (obj.Action) txData.push(obj);
    }
    i++;
  }
}
    // --- Cash section ---
    let cashValue = 0;
    if (cashIdx !== -1) {
      // Find the first non-empty line after the header for cash value
      let cashLine = cashIdx + 1;
      while (lines[cashLine] && !lines[cashLine].trim()) cashLine++;
      if (lines[cashLine]) {
        cashValue = Number(lines[cashLine].replace(/"/g, '').trim()) || 0;
      }
    }

    // Security: validate imported data for dangerous values (CSV injection)
    function isDangerousCSVValue(v) {
      return typeof v === 'string' && /^[=+\-@]/.test(v) && v.length > 1;
    }
    for (const row of [...portfolioData, ...txData]) {
      for (const v of Object.values(row)) {
        if (isDangerousCSVValue(v)) {
          throw new Error('Potentially dangerous value detected in CSV.');
        }
      }
    }

    // Build payload
    const payload = {
      username: props.user,
      portfolio: props.portfolio,
      portfolioData,
      txData,
      cash: cashValue
    };

    const response = await fetch('/api/portfolio/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': props.apiKey
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Failed to import portfolio');
    emit('imported');
    emit('close');
  } catch (error) {
    importError.value = error.message || 'Import failed.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.import-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(24, 25, 38, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(2px);
}
.import-modal {
  position: relative;
  background: var(--base2);
  color: var(--text1);
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
.import-modal h3 {
  margin: 0 0 12px 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--accent1);
  letter-spacing: 0.01em;
}
.import-modal p {
  color: var(--text2);
  font-size: 1rem;
  margin-bottom: 18px;
}
input[type="file"] {
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
}
input[type="file"]:focus {
  border-color: var(--accent1);
  background: var(--base4);
}
.import-error {
  color: var(--negative);
  margin-top: 12px;
  font-size: 1.05em;
}
.import-actions {
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
</style>
