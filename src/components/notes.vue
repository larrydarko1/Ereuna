<template>
  <div class="notes-container">
    <div v-if="BeautifulNotes.length > 0">
      <div class="note" v-for="note in BeautifulNotes" :key="note.Date">
        <div class="inline-note">
          <img class="img" src="@/assets/icons/note.png" alt="">
        </div>
        <button class="notebtn" @click="$emit('remove-note', note._id)">
          <img class="imgdlt" src="@/assets/icons/close.png" alt="">
        </button>
        <p class="note-msg-date" style="color: whitesmoke; opacity: 0.60;">
          Created: {{ formatDate(note.Date) }}
        </p>
        <p class="note-msg">{{ note.Message }}</p>
      </div>
    </div>
    <div v-else>
     <p class="no-data">No notes available.</p>
    </div>
  </div>
</template>

<script setup>
defineProps(['BeautifulNotes', 'formatDate']);
</script>

<style lang="scss" scoped>
@use '../style.scss' as *;

.no-data {
  text-align: center;
  font-size: 1rem;
  color: var(--text2);
  background-color: transparent;
}

.notes-container{
    background-color: var(--base2);
}
</style>