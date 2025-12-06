<template>
  <div class="summary-row">
    <div class="category">Website</div>
    <div class="response">
      <span v-if="!assetInfo.companyWebsite || !assetInfo.companyWebsite.trim() || assetInfo.companyWebsite.trim() === '-'">-</span>
      <a 
        v-else 
        :href="formatUrl(assetInfo.companyWebsite)" 
        target="_blank" 
        rel="noopener noreferrer"
        class="website-link"
        @click.stop
      >
        {{ displayUrl(assetInfo.companyWebsite) }}
        <svg class="external-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps(['assetInfo', 'formatDate', 'showAllDescription']);

// Ensure URL has proper protocol
const formatUrl = (url: string): string => {
  if (!url || url.trim() === '' || url === '-') return '';
  const trimmedUrl = url.trim();
  // If URL doesn't start with http:// or https://, add https://
  if (!/^https?:\/\//i.test(trimmedUrl)) {
    return `https://${trimmedUrl}`;
  }
  return trimmedUrl;
};

// Display a clean version of the URL (without protocol)
const displayUrl = (url: string): string => {
  if (!url || url.trim() === '' || url === '-') return '-';
  const trimmedUrl = url.trim();
  // Remove protocol for display
  return trimmedUrl.replace(/^https?:\/\//i, '');
};
</script>

<style lang="scss" scoped>
.response {
  display: flex;
  align-items: flex-start;
}

.website-link {
  color: var(--accent1);
  text-decoration: none;
  display: flex;
  align-items: left;
  gap: 4px;
  transition: color 0.2s ease;
  
  &:hover {
    color: var(--accent2);
    text-decoration: underline;
  }
}

.external-icon {
  flex-shrink: 0;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.website-link:hover .external-icon {
  opacity: 1;
}
</style>
