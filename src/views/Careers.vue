<template>
  <div class="careers-page">
    <!-- Simple Navigation -->
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
          <router-link to="/about" class="nav-link">About</router-link>
          <router-link to="/documentation" class="nav-link">Documentation</router-link>
        </div>
      </div>
    </nav>

    <section class="hero">
      <div class="container">
        <div class="hero-content">
          <div class="hero-text">
            <h1 class="hero-title">Careers at Ereuna</h1>
            <p class="hero-subtitle">Join us in building the future of financial intelligence.</p>
          </div>
        </div>
      </div>
    </section>

    <div class="careers-row">
      <section class="jobs-section">
        <div class="container">
          <div class="section-header">
           
            <h2 class="section-title">Job Openings</h2>
          </div>
          <div class="jobs-card">
            <div class="job-status">
              <div class="status-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1" opacity="0.3"/>
                  <path d="M9 12L11 14L15 10" stroke="currenColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>
                </svg>
              </div>
              <h3 class="status-title">No Current Openings</h3>
              <p class="status-description">
                We're always looking for talented individuals to join our team. While we don't have any open positions right now, we welcome unsolicited applications.
              </p>
            </div>
            <div class="application-cta">
              <div class="cta-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <polyline points="22,6 12,13 2,6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="cta-content">
                <h4 class="cta-title">Send Us Your CV</h4>
                <p class="cta-text">Drop us a line at <a href="mailto:careers@ereuna.io" class="email-link">careers@ereuna.io</a></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="agents-section">
        <div class="container">
          <div class="section-header">
            <h2 class="section-title">Agents Program <span class="coming-soon-badge">Coming Soon</span></h2>
          </div>
          <div class="agents-card">
            <div class="agents-intro">
              <div class="intro-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <h3 class="intro-title">Revenue Sharing Partnership</h3>
              <p class="intro-description">
                Join our influencer partnership program and earn a share of our net income from users you bring. Commissions apply to both initial signups and all recurring subscriptions/renewals.
              </p>
            </div>

            <div class="commission-showcase">
              <div class="commission-header">
                <div class="commission-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 1V23M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <h4 class="commission-title">Commission Structure</h4>
              </div>

              <div class="commission-tiers">
                <div class="tier">
                  <div class="tier-range">1-100 users</div>
                  <div class="tier-rate">5%</div>
                </div>
                <div class="tier">
                  <div class="tier-range">101-200 users</div>
                  <div class="tier-rate">10%</div>
                </div>
                <div class="tier">
                  <div class="tier-range">201-300 users</div>
                  <div class="tier-rate">15%</div>
                </div>
                <div class="tier">
                  <div class="tier-range">301-400 users</div>
                  <div class="tier-rate">20%</div>
                </div>
                <div class="tier">
                  <div class="tier-range">401-500 users</div>
                  <div class="tier-rate">25%</div>
                </div>
                <div class="tier">
                  <div class="tier-range">501-600 users</div>
                  <div class="tier-rate">30%</div>
                </div>
                <div class="tier">
                  <div class="tier-range">601-700 users</div>
                  <div class="tier-rate">35%</div>
                </div>
                <div class="tier">
                  <div class="tier-range">701-800 users</div>
                  <div class="tier-rate">40%</div>
                </div>
                <div class="tier">
                  <div class="tier-range">801-900 users</div>
                  <div class="tier-rate">45%</div>
                </div>
                <div class="tier">
                  <div class="tier-range">901-1000 users</div>
                  <div class="tier-rate">50%</div>
                </div>
                <div class="tier featured">
                  <div class="tier-range">1000+ users</div>
                  <div class="tier-rate">50% Fixed</div>
                </div>
              </div>
            </div>

            <div class="agents-footer">
              <div class="coming-soon-notice">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="var(--text2)" stroke-width="1" opacity="0.5"/>
                  <polyline points="12,6 12,12 16,14" stroke="var(--text2)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>
                </svg>
                <span>More details and sign-up coming soon</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.careers-page {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--brand-bg-primary) 0%, var(--brand-bg-secondary) 100%);
  color: var(--brand-text-primary);
  position: relative;
  overflow-x: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.careers-page::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 20% 80%, color-mix(in srgb, var(--brand-primary) calc(var(--brand-sphere-opacity) * 100%), transparent) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, color-mix(in srgb, var(--brand-secondary) calc(var(--brand-sphere-opacity) * 100%), transparent) 0%, transparent 50%);
  pointer-events: none;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
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

/* Hero Section */
.hero {
  padding: 8rem 2rem 6rem;
  background: var(--brand-bg-primary);
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 30% 20%, rgba(122, 162, 247, 0.08) 0%, transparent 50%),
    radial-gradient(circle at 70% 80%, rgba(187, 154, 247, 0.08) 0%, transparent 50%);
  pointer-events: none;
}

.hero-content {
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--brand-text-primary), var(--brand-primary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 1.5rem;
  line-height: 1.1;
}

.hero-subtitle {
  font-size: 1.4rem;
  color: var(--brand-text-secondary);
  line-height: 1.6;
  opacity: 0.9;
}

/* Careers Row */
.careers-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  min-height: auto;
}

.jobs-section, .agents-section {
  padding: 4rem;
  display: flex;
  justify-content: center;
}

.jobs-section {
  background: var(--brand-bg-secondary);
  border-right: 1px solid var(--brand-glass-border);
}

.agents-section {
  background: linear-gradient(135deg, var(--brand-bg-card) 0%, var(--brand-bg-secondary) 100%);
  position: relative;
}

/* Section Headers */
.section-header {
  text-align: center;
  margin-bottom: 3rem;
}

.section-icon {
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

.section-icon svg {
  opacity: 0.8;
}

/* Section Titles */
.section-title {
  font-size: 2.5rem;
  font-weight: 600;
  text-align: center;
  margin-bottom: 1rem;
  color: var(--brand-text-primary);
  position: relative;
  display: inline-block;
}

.section-title::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 3px;
  background: linear-gradient(90deg, var(--brand-primary), var(--brand-secondary));
  border-radius: 2px;
}

.coming-soon-badge {
  font-size: 1rem;
  color: var(--brand-text-secondary);
  font-weight: 500;
  opacity: 0.8;
  margin-left: 0.5rem;
  background: rgba(122, 162, 247, 0.1);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  border: 1px solid rgba(122, 162, 247, 0.2);
}

.jobs-card, .agents-card {
  background: var(--brand-bg-card);
  border-radius: 20px;
  border: 1px solid var(--brand-glass-border);
  padding: 3rem;
  width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

/* Job Status */
.job-status {
  text-align: center;
  margin-bottom: 3rem;
}

.status-icon {
  margin-bottom: 2rem;
  display: flex;
  justify-content: center;
}

.status-title {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--brand-text-primary);
  margin-bottom: 1rem;
}

.status-description {
  font-size: 1.1rem;
  color: var(--brand-text-secondary);
  line-height: 1.6;
  opacity: 0.9;
  max-width: 400px;
  margin: 0 auto;
}

/* Application CTA */
.application-cta {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  background: linear-gradient(135deg, rgba(122, 162, 247, 0.05), rgba(187, 154, 247, 0.05));
  border: 1px solid rgba(122, 162, 247, 0.1);
  border-radius: 16px;
  padding: 2rem;
}

.cta-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  color: var(--brand-bg-primary);
}

.cta-content {
  flex: 1;
}

.cta-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--brand-text-primary);
  margin-bottom: 0.5rem;
}

.cta-text {
  font-size: 1rem;
  color: var(--brand-text-secondary);
  opacity: 0.9;
}

.email-link {
  color: var(--brand-primary);
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
  position: relative;
}

.email-link:hover {
  color: var(--brand-secondary);
}

.email-link::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--brand-primary), var(--brand-secondary));
  transition: width 0.3s ease;
}

.email-link:hover::after {
  width: 100%;
}

/* Agents Intro */
.agents-intro {
  text-align: center;
  margin-bottom: 3rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--brand-glass-border);
}

.intro-icon {
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: center;
}

.intro-title {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--brand-text-primary);
  margin-bottom: 1rem;
}

.intro-description {
  font-size: 1.1rem;
  color: var(--brand-text-secondary);
  line-height: 1.6;
  opacity: 0.9;
  max-width: 500px;
  margin: 0 auto;
}

/* Commission Showcase */
.commission-showcase {
  margin-bottom: 2rem;
}

.commission-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.commission-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  color: var(--brand-bg-primary);
}

.commission-title {
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--brand-text-primary);
}

.commission-tiers {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
}

.tier {
  background: var(--brand-bg-secondary);
  border: 1px solid var(--brand-glass-border);
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
  position: relative;
}

.tier.featured {
  background: linear-gradient(135deg, rgba(122, 162, 247, 0.05), rgba(187, 154, 247, 0.05));
  border-color: var(--brand-primary);
  position: relative;
}

.tier.featured::before {
  content: '★';
  position: absolute;
  top: -8px;
  right: -8px;
  background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
  color: var(--brand-bg-primary);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.tier-range {
  font-size: 0.9rem;
  color: var(--brand-text-primary);
  margin-bottom: 0.5rem;
  opacity: 1;
}

.tier-rate {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--brand-primary);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

/* Agents Footer */
.agents-footer {
  padding-top: 2rem;
  border-top: 1px solid var(--brand-glass-border);
}

.coming-soon-notice {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: var(--brand-text-secondary);
  font-size: 1rem;
  opacity: 0.8;
  font-style: italic;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .careers-row {
    grid-template-columns: 1fr;
    min-height: auto;
    padding-bottom: 2rem;
  }

  .jobs-section {
    border-right: none;
    border-bottom: 1px solid var(--brand-glass-border);
  }

  .jobs-section, .agents-section {
    min-height: 60vh;
  }

  .hero {
    padding: 6rem 2rem 4rem;
  }

  .hero-title {
    font-size: 3rem;
  }

  .hero-subtitle {
    font-size: 1.3rem;
  }

  .section-title {
    font-size: 2.2rem;
  }

  .jobs-card, .agents-card {
    padding: 2.5rem;
  }

  .commission-tiers {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.75rem;
  }
}

@media (max-width: 768px) {
  .hero {
    padding: 5rem 1.5rem 3rem;
  }

  .hero-title {
    font-size: 2.5rem;
  }

  .hero-subtitle {
    font-size: 1.2rem;
  }

  .section-title {
    font-size: 2rem;
  }

  .jobs-section, .agents-section {
    padding: 2rem 1.5rem;
    min-height: 50vh;
  }

  .jobs-card, .agents-card {
    padding: 2rem;
  }

  .section-icon svg {
    width: 40px;
    height: 40px;
  }

  .status-title, .intro-title {
    font-size: 1.6rem;
  }

  .status-description, .intro-description {
    font-size: 1rem;
  }

  .application-cta {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }

  .commission-tiers {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .tier {
    padding: 0.75rem;
  }

  .tier-range {
    font-size: 0.8rem;
  }

  .tier-rate {
    font-size: 1.1rem;
  }

  .coming-soon-notice {
    flex-direction: column;
    gap: 0.5rem;
  }

  .simple-nav {
    padding: 2rem 1.5rem;
  }

  .nav-logo img {
    height: 50px;
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
    background-color: var(--brand-bg-card);
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

  .hero {
    padding: 6rem 1.5rem 3rem;
  }

  .jobs-card, .agents-card {
    width: 300px;
    padding: 1.5rem;
  }
}
</style>
