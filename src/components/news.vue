<template>
  <div class="news-container">
    <div v-if="BeautifulNews.length > 0">
      <div
        class="news"
        v-for="news in BeautifulNews.slice(0, 5)"
        :key="news.publishedDate"
      >
        <div class="inline-note">
          <svg class="img" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M3 5a1 1 0 0 0 0 2h18a1 1 0 1 0 0-2H3ZM6 9a1 1 0 0 0 0 2h12a1 1 0 1 0 0-2H6ZM2 14a1 1 0 0 1 1-1h18a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1ZM6 17a1 1 0 1 0 0 2h12a1 1 0 1 0 0-2H6Z" fill="var(--text1)"></path></g></svg>
        </div>
        <p class="news-msg-date" style="color: var(--text1); opacity: 0.60;">
          {{ formatDate(news.publishedDate) }}
        </p>
        <h3 class="news-msg-title">{{ news.title }}</h3>
        <p class="news-msg">{{ news.source }}</p>
        <p class="news-msg">{{ news.description }}</p>
        <a :href="news.url" target="_blank" rel="noopener noreferrer">Read More</a>
      </div>
    </div>
    <div v-else>
      <p class="no-data">No news available.</p>
    </div>
  </div>
  </template>

<script setup>
defineProps(['BeautifulNews', 'formatDate']);
</script>

<style lang="scss" scoped>
@use '../style.scss' as *;

.no-data {
  text-align: center;
  font-size: 1rem;
  color: var(--text2);
  background-color: transparent;
}

.news-container{
    background-color: var(--base2);
}

.news {
  background: var(--base1);
  width: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  border: 1px solid var(--base4);
  padding: 1.5rem 1.5rem 1rem 1.5rem;
  box-sizing: border-box; // ensures padding doesn't cause overflow
  overflow-wrap: break-word; // prevents text overflow
}

.inline-note {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  .img {
    width: 1.5rem;
    height: 1.5rem;
    opacity: 0.7;
  }
}

.news-msg-date {
  font-size: 0.9rem;
  margin-bottom: 0.2rem;
}

.news-msg-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--accent1);
  margin: 0.2rem 0 0.5rem 0;
}

.news-msg {
  font-size: 1rem;
  color: var(--text2);
  margin: 0.1rem 0;
}

a {
  color: var(--accent2);
  text-decoration: underline;
  font-weight: 500;
  margin-top: 0.5rem;
  align-self: flex-start;
  transition: color 0.2s;
  &:hover {
    color: var(--accent1);
  }
}
</style>