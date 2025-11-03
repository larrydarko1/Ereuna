<template>
  <div class="communications-page">
    <!-- Logo Section -->
    <div class="logo-section">
      <img class="logo-icon" src="@/assets/icons/ereuna.png" alt="Ereuna Logo" draggable="false">
    </div>

    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">Communications</h1>
        <p class="page-subtitle">Stay updated with the latest news and announcements</p>
      </div>

      <div v-if="communications.length === 0" class="empty-state">
        <h3>No communications found</h3>
        <p>Check back later for updates and announcements.</p>
      </div>

      <div v-else class="communications-grid">
        <article
          v-for="(comm, idx) in communications"
          :key="idx"
          class="communication-card"
          role="article"
          :aria-label="`Communication: ${comm.header}`"
        >
          <div class="card-date">
            <time class="comm-date" :datetime="new Date(comm.publishedDate).toISOString()">
              <svg class="date-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                  <path d="M10 21H6.2C5.0799 21 4.51984 21 4.09202 20.782C3.71569 20.5903 3.40973 20.2843 3.21799 19.908C3 19.4802 3 18.9201 3 17.8V8.2C3 7.0799 3 6.51984 3.21799 6.09202C3.40973 5.71569 3.71569 5.40973 4.09202 5.21799C4.51984 5 5.0799 5 6.2 5H17.8C18.9201 5 19.4802 5 19.908 5.21799C20.2843 5.40973 20.5903 5.71569 20.782 6.09202C21 6.51984 21 7.0799 21 8.2V10M7 3V5M17 3V5M3 9H21M13.5 13.0001L7 13M10 17.0001L7 17M14 21L16.025 20.595C16.2015 20.5597 16.2898 20.542 16.3721 20.5097C16.4452 20.4811 16.5147 20.4439 16.579 20.399C16.6516 20.3484 16.7152 20.2848 16.8426 20.1574L21 16C21.5523 15.4477 21.5523 14.5523 21 14C20.4477 13.4477 19.5523 13.4477 19 14L14.8426 18.1574C14.7152 18.2848 14.6516 18.3484 14.601 18.421C14.5561 18.4853 14.5189 18.5548 14.4903 18.6279C14.458 18.7102 14.4403 18.7985 14.405 18.975L14 21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                </g>
              </svg>
              {{ formatDate(comm.publishedDate) }}
            </time>
          </div>
          <div class="card-content">
            <h2 class="comm-title">{{ comm.header }}</h2>
            <p class="comm-message">{{ comm.message }}</p>
          </div>
        </article>
      </div>
    </div>

    <!-- Sphere Gradients for Background -->
    <div class="sphere-gradient"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

const apiKey = import.meta.env.VITE_EREUNA_KEY;

interface Communication {
  header: string;
  message: string;
  publishedDate: string | number | Date;
}

const communications = ref<Communication[]>([]); // list of communications as a ref

async function fetchCommunications() {
  try {
    const headers = {
      'x-api-key': apiKey
    };

    const response = await fetch(`/api/communications`, {
      headers: headers
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const communicationsList = await response.json();
    const commArray = Array.isArray(communicationsList)
      ? communicationsList
      : Array.isArray(communicationsList.communications)
        ? communicationsList.communications
        : [];
    const mappedList = commArray.map((comm: any) => ({
      ...comm,
      publishedDate:
        comm.publishedDate && typeof comm.publishedDate === 'object' && '$date' in comm.publishedDate
          ? comm.publishedDate.$date
          : comm.publishedDate
    }));
    communications.value = mappedList; // store in ref

  } catch (err) {
    if (typeof err === 'object' && err !== null && 'name' in err && (err as any).name === 'AbortError') {
      return;
    }
    console.error('Failed to load communications:', err);
    communications.value = [];
  }
}

function formatDate(bsonDate: string | number | Date) {
  const date = new Date(bsonDate);
  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

onMounted(() => {
  fetchCommunications();
});

</script>

<style scoped>

.communications-page {
  min-height: 100vh;
  background: var(--base4);
  position: relative;
  overflow-x: hidden;
}

.logo-section {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem 0 1rem 0;
  position: relative;
  z-index: 2;
}

.logo-icon {
  height: 80px;
  opacity: 0.8;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
}

.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem 4rem 2rem;
  position: relative;
  z-index: 2;
}

.page-header {
  text-align: center;
  margin-bottom: 3rem;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text1);
  margin: 0 0 0.5rem 0;
  background: linear-gradient(135deg, var(--accent1), var(--accent2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  font-size: 1.1rem;
  color: var(--text2);
  margin: 0;
  font-weight: 400;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: var(--base2);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--base3);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.6;
}

.empty-state h3 {
  color: var(--text1);
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  color: var(--text2);
  font-size: 1rem;
  margin: 0;
}

.communications-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit);
  gap: 2rem;
  margin-top: 2rem;
}

.communication-card {
  background: var(--base2);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--base3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.communication-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(90deg, var(--accent1), var(--accent2));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.communication-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  border-color: var(--accent1);
}

.communication-card:hover::before {
  opacity: 1;
}

.card-date {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  z-index: 1;
}

.comm-date {
  font-size: 1rem;
  color: var(--text2);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(var(--base4), 0.8);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  backdrop-filter: blur(10px);
  border: 1px solid var(--base3);
}

.date-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.card-content {
  padding-top: 1rem;
}

.comm-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text1);
  margin: 0 0 1rem 0;
  line-height: 1.3;
}

.comm-message {
  color: var(--text1);
  line-height: 1.7;
  font-size: 1rem;
  margin: 0;
  white-space: pre-line;
  word-wrap: break-word;
}

/* Sphere Gradients */
.sphere-gradient {
  position: absolute;
  top: 10%;
  left: 100%;
  transform: translate(-50%, -50%);
  width: 400px;
  height: 400px;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, #8c8dfe 0%, 
    #8c8dfe 30%, 
    #a3a4fe 50%, 
    #c5c6fe 70%, 
    #fff 100%);
  filter: blur(100px);
  z-index: 0;
  opacity: 0.20;
}

/* Responsive Design */
@media (max-width: 768px) {
  .logo-icon {
    height: 60px;
  }

  .page-container {
    padding: 0 1rem 3rem 1rem;
  }

  .page-title {
    font-size: 2rem;
  }

  .communications-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .communication-card {
    padding: 1.5rem;
  }

  .comm-title {
    font-size: 1.3rem;
  }

  .card-date {
    top: 1rem;
    right: 1rem;
  }

  .comm-date {
    font-size: 0.9rem;
    padding: 0.4rem 0.8rem;
  }

  .date-icon {
    width: 16px;
    height: 16px;
  }
}

@media (max-width: 480px) {
  .logo-section {
    padding: 1.5rem 0 0.5rem 0;
  }

  .logo-icon {
    height: 50px;
  }

  .page-title {
    font-size: 1.75rem;
  }

  .communication-card {
    padding: 1.25rem;
  }

  .comm-title {
    font-size: 1.2rem;
  }

  .comm-message {
    font-size: 0.95rem;
  }

  .card-date {
    top: 0.75rem;
    right: 0.75rem;
  }

  .comm-date {
    font-size: 0.8rem;
    padding: 0.3rem 0.6rem;
  }

  .date-icon {
    width: 14px;
    height: 14px;
  }
}

/* Animation for cards appearing */
.communication-card {
  animation: fadeInUp 0.6s ease-out forwards;
  opacity: 0;
  transform: translateY(20px);
}

.communication-card:nth-child(1) { animation-delay: 0.1s; }
.communication-card:nth-child(2) { animation-delay: 0.2s; }
.communication-card:nth-child(3) { animation-delay: 0.3s; }
.communication-card:nth-child(4) { animation-delay: 0.4s; }
.communication-card:nth-child(5) { animation-delay: 0.5s; }

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Focus states for accessibility */
.communication-card:focus-within {
  outline: 2px solid var(--accent1);
  outline-offset: 4px;
}
</style>