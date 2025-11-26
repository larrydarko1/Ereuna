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
      aria-label="Search ticker or ISIN"
    />
    <button
      class="wlbtn2"
      id="searchBtn"
      @click="onSearch"
      v-b-tooltip.hover
      title="Search Symbol"
      aria-label="Search for ticker or ISIN"
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

<style scoped>
/* div that contains input and button for searching symbols */
#searchtable {
  display: flex;
  align-items: center;
  background-color: var(--base2);
  position: relative;
  border-radius: 6px;
  margin: 0 5px 2px 5px;
}

/* input for searching symbols */
#searchbar {
  border-radius: 5px;
  padding: 10px 10px 10px 15px;
  margin: 7px;
  width: calc(100% - 30px);
  outline: none;
  color: var(--text2);
  transition: border-color 0.3s, box-shadow 0.3s;
  border: solid 1px var(--base1);
  background-color: var(--base4);
}

#searchbar:focus {
  border-color: var(--accent1);
  outline: none;
}

/* button for searching symbols, inside searchbar */
.wlbtn2 {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  flex-shrink: 0;
  color: var(--text1);
  background-color: var(--accent1);
  border: none;
  padding: 0;
  outline: none;
  cursor: pointer;
  height: 32px;
  width: 32px;
  border-top-right-radius: 5px;
  border-bottom-right-radius: 5px;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background-color 0.2s ease-in-out;
}

.wlbtn2:hover {
  background-color: var(--accent2);
  box-shadow: 0 0 5px rgba(140, 141, 254, 0.5);
  outline: none;
}

</style>