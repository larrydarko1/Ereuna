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

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps({
  user: String,
  apiKey: String,
  portfolio: Number
});
const emit = defineEmits(['imported', 'close']);

const importError = ref('');
const loading = ref(false);

async function handleImportFile(event: Event) {
  importError.value = '';
  const file = (event.target as HTMLInputElement).files?.[0];
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
    const statsIdx = lines.findIndex((l: string) => l.trim() === 'Stats');
    const positionsIdx = lines.findIndex((l: string) => l.trim() === 'Positions');
    const tradesIdx = lines.findIndex((l: string) => l.trim() === 'Trades');

    // --- Stats section ---
    let stats: Record<string, string> = {};
    if (statsIdx !== -1 && positionsIdx !== -1) {
      let i = statsIdx + 1;
      while (i < positionsIdx) {
        if (!lines[i] || !lines[i].trim()) { i++; continue; }
        const [key, value] = lines[i].split(',');
        if (key && value !== undefined) {
          let v = value.replace(/^"|"$/g, '').trim();
          // Unescape single quote prefix
          if (v.startsWith("'")) v = v.slice(1);
          stats[key.trim()] = v;
        }
        i++;
      }
    }

    // --- Positions section ---
    let positions: Record<string, string>[] = [];
    if (positionsIdx !== -1 && tradesIdx !== -1) {
      let headerLine = positionsIdx + 1;
      while (lines[headerLine] !== undefined && !lines[headerLine].trim()) headerLine++;
      const headers = lines[headerLine].split(',').map((h: string) => h.trim().replace(/^"|"$/g, ''));
      let i = headerLine + 1;
      while (i < tradesIdx) {
        if (!lines[i] || !lines[i].trim()) { i++; continue; }
        const values = lines[i].split(',').map((s: string) => s.replace(/^"|"$/g, '').trim());
        if (values.length === headers.length) {
          const obj: Record<string, string> = {};
          headers.forEach((h: string, idx: number) => {
            let v = values[idx];
            // Unescape single quote prefix
            if (typeof v === 'string' && v.startsWith("'")) v = v.slice(1);
            obj[h] = v;
          });
          positions.push(obj);
        }
        i++;
      }
    }

    // --- Trades section ---
    let trades: Record<string, string>[] = [];
    if (tradesIdx !== -1) {
      let headerLine = tradesIdx + 1;
      while (lines[headerLine] !== undefined && !lines[headerLine].trim()) headerLine++;
      const headers = lines[headerLine].split(',').map((h: string) => h.trim().replace(/^"|"$/g, ''));
      let i = headerLine + 1;
      while (i < lines.length) {
        if (!lines[i] || !lines[i].trim()) { i++; continue; }
        const values = lines[i].split(',').map((s: string) => s.replace(/^"|"$/g, '').trim());
        if (values.length === headers.length) {
          const obj: Record<string, string> = {};
          headers.forEach((h: string, idx: number) => {
            let v = values[idx];
            if (typeof v === 'string' && v.startsWith("'")) v = v.slice(1);
            obj[h] = v;
          });
          trades.push(obj);
        }
        i++;
      }
    }

    // Security: validate imported data for dangerous values (CSV injection)
    function isDangerousCSVValue(v: unknown): boolean {
      if (typeof v === 'string' && v.startsWith("'")) v = v.slice(1);
      return typeof v === 'string' && /^[=+\-@]/.test(v) && v.length > 1;
    }
    for (const row of [...positions, ...trades]) {
      for (let v of Object.values(row)) {
        if (isDangerousCSVValue(v)) {
          throw new Error('Potentially dangerous value detected in CSV.');
        }
      }
    }
    for (let v of Object.values(stats)) {
      if (isDangerousCSVValue(v)) {
        throw new Error('Potentially dangerous value detected in CSV.');
      }
    }

    // Build payload
    const payload = {
      username: props.user,
      portfolio: props.portfolio,
      stats,
      positions,
      trades
    };

    const response = await fetch('/api/portfolio/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': props.apiKey ?? ''
      } as Record<string, string>,
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Failed to import portfolio');
    emit('imported');
    emit('close');
  } catch (error) {
    importError.value = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : 'Import failed.';
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
