<template>
  <div class="mission-page">
    <!-- Simple Navigation -->

    <!-- Vision Section -->
    <section class="vision-section">
       <nav class="simple-nav">
      <div class="nav-content">
        <router-link to="/" class="nav-logo">
          <img src="@/assets/icons/ereuna.png" alt="Ereuna" />
        </router-link>
        <!-- Hidden checkbox toggler for mobile dropdown -->
        <input type="checkbox" id="nav-toggle" class="nav-toggle" />
        <label for="nav-toggle" class="nav-toggle-label" aria-label="Toggle navigation menu">
          <span></span>
          <span></span>
        </label>
        <div class="nav-links">
          <router-link to="/documentation" class="nav-link">Documentation</router-link>
        </div>
      </div>
    </nav>
      <div class="container">
        <div class="vision-content">
         
          <h2 class="section-title" style="padding-top: 80px;">Mission</h2>
          <p class="vision-text">
            Ereuna began as a passion project by a full-stack developer with a profound interest
            in finance and trading. The goal is to create cheaper and more efficient tools for analyzing financial
            markets. The project will also evolve to include experimental AI features designed to boost productivity in investment research.
          </p>
          <div class="mission-stats">
            <div class="stat-item">
              <div class="stat-number">450M+</div>
              <div class="stat-label">Documents</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">60.000+</div>
              <div class="stat-label">Financial Assets Covered</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Timeline Section -->
    <section class="timeline-section">
      <div class="container">
        <h2 class="section-title">Timeline</h2>
        <div class="timeline">
          <div class="timeline-item">
            <div class="timeline-left">
              <div class="timeline-date">19/06/2024</div>
            </div>
            <div class="timeline-center">
              <div class="timeline-dot"></div>
            </div>
            <div class="timeline-right">
              <div class="timeline-title">Foundation</div>
            </div>
          </div>

          <div class="timeline-item">
            <div class="timeline-left">
              <div class="timeline-date">07/02/2025</div>
            </div>
            <div class="timeline-center">
              <div class="timeline-dot"></div>
            </div>
            <div class="timeline-right">
              <div class="timeline-title">POC Completed</div>
            </div>
          </div>

          <div class="timeline-item">
            <div class="timeline-left">
              <div class="timeline-date">14/04/2025</div>
            </div>
            <div class="timeline-center">
              <div class="timeline-dot"></div>
            </div>
            <div class="timeline-right">
              <div class="timeline-title">First Deployment</div>
            </div>
          </div>

          <div class="timeline-item">
            <div class="timeline-left">
              <div class="timeline-date">02/05/2025</div>
            </div>
            <div class="timeline-center">
              <div class="timeline-dot"></div>
            </div>
            <div class="timeline-right">
              <div class="timeline-title">First Invite-Only Beta</div>
            </div>
          </div>

          <div class="timeline-item">
            <div class="timeline-left">
              <div class="timeline-date">29/05/2025</div>
            </div>
            <div class="timeline-center">
              <div class="timeline-dot"></div>
            </div>
            <div class="timeline-right">
              <div class="timeline-title">Second Invite-Only Beta</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>

</script>

<style lang="scss" scoped>
.mission-page {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--brand-bg-primary) 0%, var(--brand-bg-secondary) 100%);
  color: var(--brand-text-primary);
  position: relative;
  overflow-x: hidden;
}

.mission-page::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 20% 80%, rgba(125, 207, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(137, 221, 255, 0.1) 0%, transparent 50%);
  pointer-events: none;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 600;
  text-align: center;
  margin-bottom: 3rem;
  color: var(--brand-text-primary);
}

.vision-section {
  padding: 5rem 2rem;
  background: var(--brand-bg-primary);
}

.vision-content {
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
}

.logo-container {
  margin-bottom: 2rem;
}

.ereuna-logo {
  width: 120px
}

.vision-text {
  font-size: 1.25rem;
  line-height: 1.7;
  color: var(--brand-text-secondary);
  margin-bottom: 3rem;
}

.mission-stats {
  display: flex;
  justify-content: center;
  gap: 3rem;
  margin-top: 3rem;
  flex-wrap: wrap;
}

.stat-item {
  text-align: center;
  padding: 1.5rem;
  background: var(--brand-bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--brand-glass-border);
  min-width: 120px;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: var(--brand-primary);
  margin-bottom: 0.5rem;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--brand-text-secondary);
  font-weight: 500;
}

/* Timeline Section */
.timeline-section {
  padding: 5rem 2rem;
  background: var(--brand-bg-secondary);
}

.timeline {
  position: relative;
  max-width: 600px;
  margin: 0 auto;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, var(--brand-primary), var(--brand-secondary));
  transform: translateX(-50%);
  border-radius: 1px;
}

.timeline-item {
  display: flex;
  align-items: center;
  margin-bottom: 3rem;
  position: relative;
  opacity: 0;
  animation: fadeInUp 0.6s ease forwards;
}

.timeline-item:nth-child(1) { animation-delay: 0.1s; }
.timeline-item:nth-child(2) { animation-delay: 0.2s; }
.timeline-item:nth-child(3) { animation-delay: 0.3s; }
.timeline-item:nth-child(4) { animation-delay: 0.4s; }
.timeline-item:nth-child(5) { animation-delay: 0.5s; }

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.timeline-left {
  flex: 1;
  text-align: right;
  padding-right: 1rem;
}

.timeline-center {
  flex: 0 0 20px;
  position: relative;
  z-index: 2;
}

.timeline-right {
  flex: 1;
  padding-left: 1rem;
}

.timeline-dot {
  width: 16px;
  height: 16px;
  background: var(--brand-primary);
  border: 3px solid var(--brand-bg-primary);
  border-radius: 50%;
  margin: 0 auto;
  box-shadow: 0 0 0 4px rgba(125, 207, 255, 0.2);
  transition: all 0.3s ease;
}

.timeline-item:hover .timeline-dot {
  background: var(--brand-secondary);
  transform: scale(1.2);
  box-shadow: 0 0 0 6px rgba(137, 221, 255, 0.3);
}

.timeline-date {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--brand-text-secondary);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background: var(--brand-bg-secondary);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  border: 1px solid var(--brand-glass-border);
}

.timeline-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--brand-text-primary);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background: var(--brand-bg-secondary);
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  border: 1px solid var(--brand-glass-border);
  transition: all 0.3s ease;
}

.timeline-item:hover .timeline-title {
  background: var(--brand-bg-card-hover);
  border-color: var(--brand-primary);
}

/* Simple Navigation */
.simple-nav {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: transparent;
  padding: 2.5rem 2rem;
}

.nav-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-logo img {
  height: 60px;
  width: auto;
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.nav-logo:hover img {
  opacity: 1;
}

.nav-links {
  display: flex;
  gap: 4rem;
}

.nav-link {
  color: var(--brand-text-secondary);
  text-decoration: none;
  font-size: 1.3rem;
  font-weight: 500;
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.nav-link:hover {
  opacity: 1;
}

/* Hide the checkbox input */
.nav-toggle {
  display: none;
}

/* Label styling */
.nav-toggle-label {
  display: none;
  flex-direction: column;
  justify-content: space-around;
  width: 25px;
  height: 25px;
  cursor: pointer;
  margin-left: auto;
  margin-right: 20px;
  user-select: none;
  gap: 5px;
}

/* The two bars */
.nav-toggle-label span {
  display: block;
  height: 3px;
  background: var(--brand-text-secondary);
  border-radius: 2px;
  transition: all 0.3s ease;
  /* Set transform origin near the left edge for better rotation pivot */
  transform-origin: 1.5px center;
}

/* Each bar full width */
.nav-toggle-label span:nth-child(1),
.nav-toggle-label span:nth-child(2) {
  width: 25px;
}

/* Toggle to cross when checked */
#nav-toggle:checked + .nav-toggle-label span:nth-child(1) {
  transform: rotate(45deg);
}

#nav-toggle:checked + .nav-toggle-label span:nth-child(2) {
  transform: rotate(-45deg);
}

/* Section Divider */
.section-divider {
  padding: 2rem 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.divider-line {
  width: 60px;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--brand-primary), transparent);
  border-radius: 1px;
}

/* CTA Section */
.cta-section {
  padding: 6rem 2rem;
  background: linear-gradient(135deg, var(--brand-bg-secondary) 0%, var(--brand-bg-primary) 100%);
  position: relative;
  overflow: hidden;
  border-top: 1px solid var(--brand-glass-border);
}

.cta-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 30% 20%, rgba(125, 207, 255, 0.08) 0%, transparent 50%),
    radial-gradient(circle at 70% 80%, rgba(137, 221, 255, 0.08) 0%, transparent 50%);
  pointer-events: none;
}

.cta-content {
  max-width: 700px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.cta-title {
  font-size: 3.2rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--brand-text-primary), var(--brand-primary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 1.5rem;
  line-height: 1.1;
}

.cta-text {
  font-size: 1.3rem;
  color: var(--brand-text-secondary);
  margin-bottom: 3rem;
  line-height: 1.6;
  opacity: 0.9;
}

.cta-button {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
  color: var(--brand-bg-primary);
  text-decoration: none;
  padding: 1.5rem 3rem;
  border-radius: 14px;
  font-size: 1.3rem;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 10px 30px rgba(125, 207, 255, 0.5);
  border: none;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.cta-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent);
  transition: left 0.5s ease;
}

.cta-button:hover::before {
  left: 100%;
}

.cta-button:hover {
  transform: translateY(-4px);
  box-shadow: 0 15px 40px rgba(125, 207, 255, 0.7);
}

.cta-button:active {
  transform: translateY(-2px);
}

/* Responsive Design */
@media (max-width: 768px) {
  .timeline-item {
    flex-direction: column;
    text-align: center;
    margin-bottom: 2rem;
  }

  .timeline-left,
  .timeline-right {
    padding: 0;
    margin-bottom: 0.5rem;
  }

  .timeline-left {
    text-align: center;
  }

  .timeline-right {
    text-align: center;
  }

  .timeline::before {
    left: 50px;
  }

  .timeline-center {
    order: -1;
    margin-bottom: 0.5rem;
  }

  .section-title {
    font-size: 2rem;
  }

  .mission-stats {
    gap: 1.5rem;
  }

  .stat-item {
    min-width: 100px;
    padding: 1rem;
  }

  .stat-number {
    font-size: 1.5rem;
  }

  .ereuna-logo {
    width: 100px;
    height: 100px;
  }

  .simple-nav {
    padding: 2rem 1.5rem;
  }

  .nav-logo img {
    height: 50px;
  }

  .nav-text-links {
    gap: 2.5rem;
  }

  .nav-text-link {
    font-size: 1.1rem;
  }

  .cta-title {
    font-size: 2.5rem;
  }

  .cta-text {
    font-size: 1.2rem;
  }

  .cta-button {
    padding: 1.25rem 2.5rem;
    font-size: 1.2rem;
  }
}

/* Mobile version */
@media (max-width: 700px) {
  .nav-toggle-label {
    display: flex;
  }

  .nav-links {
    position: absolute;
    top: 60px;
    right: 10px;
    background-color: var(--brand-bg-secondary);
    flex-direction: column;
    width: 120px;
    border-radius: 5px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
    box-shadow: 0 8px 16px rgba(0,0,0,0.2);
    z-index: 1000;
    gap: 0;
    text-align: center;
    padding: 10px 0;
  }

  .nav-link {
    padding: 10px 0;
    font-size: 1.1rem;
    width: 100%;
  }

  /* Show hamburger menu */
  #nav-toggle:checked ~ .nav-links {
    opacity: 1;
    pointer-events: auto;
  }

  .timeline::before {
    left: 50%;
    top: 0;
    bottom: 0;
    width: 2px;
    height: 100%;
    background: linear-gradient(to bottom, var(--brand-primary), var(--brand-secondary));
    transform: translateX(-50%);
  }

  .timeline-item {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    text-align: left;
  }

  .timeline-left {
    flex: 1;
    text-align: left;
    padding-right: 0.5rem;
    margin-bottom: 0;
  }

  .timeline-center {
    flex: 0 0 20px;
    order: 0;
    margin-bottom: 0;
  }

  .timeline-right {
    flex: 1;
    text-align: right;
    padding-left: 0.5rem;
    margin-bottom: 0;
  }

  .section-title {
    font-size: 2rem;
  }

  .mission-stats {
    gap: 1.5rem;
  }

  .stat-item {
    min-width: 100px;
    padding: 1rem;
  }

  .stat-number {
    font-size: 1.5rem;
  }

  .simple-nav {
    padding: 2rem 1.5rem;
  }

  .nav-logo img {
    height: 50px;
  }

  .nav-link {
    font-size: 1.1rem;
  }

  .cta-title {
    font-size: 2.5rem;
  }

  .cta-text {
    font-size: 1.2rem;
  }

  .cta-button {
    padding: 1.25rem 2.5rem;
    font-size: 1.2rem;
  }
}
</style>