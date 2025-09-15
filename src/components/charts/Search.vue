<template>
  <div id="searchtable">
    <input
      type="text"
      id="searchbar"
      name="search"
      placeholder="Search Ticker / ISIN"
      :value="modelValue"
      @input="onInput"
      @keydown.enter="onSearch"
    />
    <button
      class="wlbtn2"
      id="searchBtn"
      @click="onSearch"
      v-b-tooltip.hover
      title="Search Symbol"
    >
      <svg height="15" width="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M14.9536 14.9458L21 21M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
          stroke="var(--text3)"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  modelValue: {
    type: String,
    required: true
  }
});
const emit = defineEmits(['update:modelValue', 'search', 'input']);

function onInput(e: Event) {
  const input = e.target as HTMLInputElement;
  emit('update:modelValue', input.value.toUpperCase());
  emit('input', input.value.toUpperCase());
}

function onSearch() {
  emit('search');
}
</script>