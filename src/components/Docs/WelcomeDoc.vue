<template>
   <div class="center-container">
    <h1>Welcome to the Ereuna Screener Documentation!</h1>
    <p>Use this documentation to learn how to navigate the application.</p>
</div>
<div class="section-separator"></div>
<div class="features-section">
    <h2>Upcoming Features</h2>
    <div class="features-grid">
        <div v-for="feature in features" :key="feature._id" class="feature-badge" :class="getProgressClass(feature.Progress)">
            <h3>{{ feature.Title }}</h3>
            <p>{{ feature.Description }}</p>
            <span class="progress">{{ feature.Progress }}</span>
        </div>
    </div>
</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface Feature {
    _id: string;
    Title: string;
    Description: string;
    Progress: string;
}

const apiKey = import.meta.env.VITE_EREUNA_KEY;
const features = ref<Feature[]>([]);

async function fetchFeatures() {
    try {
        const response = await fetch('/api/docs-features', {
            headers: {
                'X-API-KEY': apiKey,
            }
        });
        if (response.ok) {
            const data = await response.json();
            features.value = data.features;
            features.value.sort((a, b) => {
                const priority = (progress: string) => {
                    switch (progress.toLowerCase()) {
                        case 'in progress': return 1;
                        case 'planned': return 2;
                        default: return 3;
                    }
                };
                return priority(a.Progress) - priority(b.Progress);
            });
        } else {
            console.error('Failed to fetch features');
        }
    } catch (error) {
        console.error('Error fetching features:', error);
    }
}

function getProgressClass(progress: string) {
    switch (progress.toLowerCase()) {
        case 'in progress':
            return 'in-progress';
        case 'planned':
            return 'planned';
        default:
            return 'default';
    }
}

onMounted(fetchFeatures);
</script>

<style scoped lang="scss">
@use '@/style.scss' as *;

.center-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    width: 100%;
    min-width: 650px;
}

.center-container h1 {
    font-size: 2rem;
    color: $accent1;
    margin-bottom: 1rem;
}

.center-container p {
    font-size: 1.2rem;
    color: $text2;
    margin-bottom: 1rem;
    overflow-wrap: anywhere;
}

.welcome-gif {
    width: 100%;
    max-width: 200px;
    height: auto;
    margin-bottom: 1.5rem;
}

//mobile version
@media (max-width: 768px) {
   .center-container {
    margin-left: 0;
    min-width: 10px;
}
}

.section-separator {
    width: 100%;
    height: 1px;
    background: linear-gradient(90deg, transparent, $accent1, transparent);
    margin: 3rem 0;
    opacity: 0.6;
}

.features-section {
    margin-top: 0;
    text-align: center;
}

.features-section h2 {
    color: $accent1;
    margin-bottom: 2rem;
    font-size: 2.2rem;
    font-weight: 600;
}

.features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 1.5rem;
    margin-top: 2rem;
}

.feature-badge {
    background: $base2;
    border: 1px solid $base1;
    border-radius: 12px;
    padding: 1.5rem;
    text-align: left;
    position: relative;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.feature-badge h3 {
    color: $text1;
    margin-bottom: 0.75rem;
    font-size: 1.2rem;
    font-weight: 600;
    line-height: 1.3;
}

.feature-badge p {
    color: $text2;
    margin-bottom: 1rem;
    font-size: 0.95rem;
    line-height: 1.5;
    opacity: 0.9;
}

.progress {
    position: absolute;
    top: 1rem;
    right: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.8rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
}

.progress::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
}

.in-progress .progress::before {
    background: #62ff00;
    box-shadow: 0 0 6px rgba(0, 123, 255, 0.5);
}

.planned .progress::before {
    background: #eeff07;
    box-shadow: 0 0 6px rgba(255, 193, 7, 0.5);
}

</style>