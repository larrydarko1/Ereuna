<template>
  <div class="doc-content">
    <h1>Changelog</h1>
    <p>Track all the updates and changes across different versions.</p>
    
    <div class="changelog-section">
      <div v-for="version in changelog" :key="version.version" class="note-box">
        <h3>{{ version.version }}</h3>
        <p>{{ version.description }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface VersionChangelog {
  version: string;
  description: string;
}

const changelog = ref<VersionChangelog[]>([
    {
    version: '2026.3',
    description: 'Bug fixes',
  },
  {
    version: '2026.2',
    description: 'Bug & Security fixes',
  },
  {
    version: '2026.1',
    description: 'Added price-level markers feature in charts toolbox, added Hindi and Turkish as supported languages, small bug fixes.',
  },
]);
</script>

<style scoped>
.doc-content {
  max-width: 900px;
  color: var(--brand-text-primary);
  line-height: 1.8;
}

h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--brand-text-primary);
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, var(--brand-gradient-start) 0%, var(--brand-gradient-end) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.doc-content > p {
  font-size: 1rem;
  color: var(--brand-text-secondary);
  margin-bottom: 2rem;
}

.changelog-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.note-box {
  background: linear-gradient(135deg, rgba(122, 162, 247, 0.08) 0%, rgba(137, 221, 255, 0.08) 100%);
  border: 1px solid var(--brand-glass-border);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.note-box h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: var(--brand-gradient-start);
  font-size: 1.3rem;
  font-weight: 600;
}

.version-date {
  color: var(--brand-text-secondary);
  font-size: 0.85rem;
  opacity: 0.8;
  display: block;
  margin-bottom: 0.75rem;
}

.note-box p {
  margin-bottom: 0;
  font-size: 1rem;
  color: var(--brand-text-secondary);
  line-height: 1.6;
}
</style>
