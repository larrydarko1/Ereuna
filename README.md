![Ereuna Header](public/Basic/banner.png)

<div align="center">

### Portfolio Project — Proof of Work

**This repository is open-sourced as a portfolio demonstration only.**  
⚠️ **Non-commercial use only** — See [LICENSE.md](LICENSE.md) for terms.

</div>

---

![Ereuna Demo](public/Basic/heroAnimation.gif)

Ereuna was my first project—I learned how to code using it. It took me months of refactoring and learning to pull it off. Even though the startup project eventually didn't go as planned, I don't regret spending so much time on it, because it allowed me to grow as a developer and I've built something I need.

The application itself is designed to aggregate financial markets data using aggregation methods that when used correctly, can save up to 80% of time in the screening routine. At its peak it **supported 60k+ financial instruments** between Stock, ETF, Mutual Funds and Crypto, database contained around **450M documents**, and the websocket infrastructure used to process between **10-20M messages every day**. Deployment was done using a single VPS running multiple docker containers using docker compose and Traefik as reverse proxy. I wanted to develop it further using Kubernetes (multi node cluster) and implementing a CI/CD Pipeline, but unfortunately I didn't have the chance.

In production it held 14 containers unified in a network (the deployment architecture diagram is shown below).

**Core Features:**
- **Dashboard** - Market outlook general overview
- **Account Settings** - Basic CRUD, Recovery Code, Security / 2FA, 50 custom themes, support for 18 languages
- **Portfolio Simulations** - Support for 10 different portfolios, benchmarks and performance tracking, simulation for cash deposits, withdraws, long and short positions, fractional shares and leverage up to 10x, with CRUD functionalities for each, retroactive balancing (meaning portfolio automatically rebuilds itself after edit)
- **Charts** - Fork of Lightweight Charts by TradingView, Watchlists / Watchpanel, simple fundamental data for in depth analysis
- **Screener** - 40+ filters, 2 mini charts and customizable tables + Multi screener and hidden list

In-depth documentation with visual tutorials is available at `/Documentation` once the app is running.

## Tech Stack

**MEVN + Python Microservices**

- **Frontend:** Vue.js 3 + TypeScript + Vite
- **Backend API:** Node.js + Express + TypeScript
- **Database:** MongoDB (450M+ documents at peak)
- **Cache & Streaming:** Redis (pub/sub, caching, data streaming)
- **Microservices:** Python + FastAPI (WebSocket server, data ingestor, aggregator)
- **Infrastructure:** Docker + Docker Compose + Traefik
- **Monitoring:** Prometheus + Grafana + Loki + Promtail

# Why I Built It

To speed up and optimize my weekly screening routine.

### The Problem

Before this project, I was running multiple screeners sequentially, because if I applied too many filters on a single screener, it would've cut out opportunities because it didn't check all the boxes (my strategy is running more screeners with less filters and then look for overlaps—the more duplicated values, the stronger the signal, assuming the filters are strong and the strategies are aligned of course, this was my case).

The problem with this approach was:
- **Time consuming** - Running screeners sequentially and checking for overlaps manually across multiple lists was inefficient
- **Human error** - Some things were easily missed when comparing results manually
- **Noise** - I was stuck seeing irrelevant results I didn't care about even though it technically passed my criteria (example: I don't care about small pharmaceutical companies, or meme coins, etc.)

**Old Workflow:**
```
Screener 1 → Results A (200 stocks)
Screener 2 → Results B (180 stocks)  } Manual comparison
Screener 3 → Results C (150 stocks)  } Look for overlaps
Screener 4 → Results D (220 stocks)  } Human error prone
              ↓
      Final list (maybe 30-40 stocks)
      Time: Hours of work
```

### The Solution

With the new workflow, I'm simply selecting screeners, pressing a button, and the system runs them simultaneously. I get a compacted unified list of results, with duplicates automatically sorted from most duplicated to least duplicated, strongest signals on top.

**New Workflow:**
```
Screener 1 + 2 + 3 + 4 → [Multi-Screener Engine]
                              ↓
                    Automatic overlap detection
                    Sort by duplicate count
                    Apply hidden list filter
                              ↓
                    Final list (30-40 stocks)
                    Strongest signals first
                    Time: Minutes
```

**Key Benefits:**
-  **80% time reduction** - From hours to minutes (1/5 of the original time)
-  **Smart filtering** - Duplicate detection automatically identifies strongest signals
-  **No manual errors** - Automated overlap detection eliminates human mistakes

Each user gets to customize visibility of certain assets. Don't want to see meme coins or penny stocks for zombie companies? Just hide them from your profile and they won't appear on query results unless you manually reinsert them again. You can still research them in the Charts section (it will remind you that they are in your hidden list), but they won't appear in query results in the screener.

# How to use it

There are three ways of running this project, in all cases you need:
- MongoDB installed
- Redis (optional on local machine)
- Docker Engine (optional, if you want to run locally)

## Local Development

For local development (how I run it most of the time), simply spin up the frontend:
```bash
npm run dev
```

And the backend (rest api):
```bash
npm run backend
```

Make sure the database is available, then go to localhost:3500. Websocket won't work with this method. 

## Docker (Development Build)

You can try building using docker, make sure to type:
```bash
npm run dbup
```
So that it dumps all collections into the proper folder db/dump, for the mongodb container to restore later.

Then type:
```bash
npm run docker:dev
```

This will provide a local Docker version of the full app, including WebSocket and all the other containers. Note that you need a Tiingo premium API key to update new data and access the real-time data feed.

**Important notes:**
- As of today, only crypto allows for intraday volume data / FULL TOPS. I didn't have the time to code an ingestor for crypto; only IEX data is currently available.
- Since February 2025, IEX changed rules and to have access to FULL TOPS Data you need a deal directly with them. I couldn't afford to pay an extra $500/month, so I used Tiingo reference price using their infrastructure (no intraday volume). 

About the WebSocket, without a solid infrastructure, there are probably memory leaks when it uploads intraday data into the database. I've never had issues with daily or weekly data updates though in weeks of testing. 

**CAREFUL:** Tiingo Websocket infrastructure seems to have a weird issue where if there's an outage, it can create a dangling subscription that drains your monthly bandwidth, and you can't close it on your end. Make sure you have a solid internet connection and contact Tiingo support if you encounter issues.

- Running messages from 8000+ stock symbols can drain at least 1GB every work day
- If it resets many times, a standard account with 40GB will certainly encounter issues
- **Use at your own risk.** I couldn't fix it, but since the VPS had a solid connection and redistribution plan had plently of bandwidth, I've never had that issue in production.

## Docker (Production Build)

Simply setup your VPS node, transfer the project folder (make sure you have db dump filled with database data), then configure your environment variables properly.

**Required Environment Variables:**

Create a `.env` file in the root directory with:

```bash
#payment processing (discountinued)
STRIPE_SECRET_KEY=your_key_here 
VITE_STRIPE_PUBLISHABLE_KEY=your_key_here

MONGODB_URI=mongodb://localhost:27017/
TIINGO_KEY=your_tiingo_premium_key_here
VITE_EREUNA_KEY=frontend_key_for_validation_here
GF_SECURITY_ADMIN_PASSWORD=grafana_password_here
CLOUDFLARE_EMAIL=email@example.com
CF_DNS_API_TOKEN=your_key_here

REDIS_URL=redis://localhost:6379
```

**Cloudflare Setup for SSL/TLS:**

1. Point your domain DNS to your server IP in Cloudflare
2. Get your Cloudflare API token (needs Zone:Read and DNS:Edit permissions)
3. Create a `.env` file with your Cloudflare credentials for Traefik to use:
```
CLOUDFLARE_EMAIL=your@email.com
CLOUDFLARE_API_TOKEN=your_api_token_here
```

4. Make sure your `docker/traefik.yml` is configured with your domain and Cloudflare as the certificate resolver (it should be already if you're using my config, but double check the acme email and domain settings match yours)

5. Ensure ports 80 and 443 are open on your server firewall

Then build the project:

```bash
npm run docker:prod
```

If done right, the services will spin up behind Traefik and be accessible through your domain. Traefik will automatically handle the SSL/TLS certificates via Let's Encrypt using Cloudflare's DNS challenge, so you don't need to worry about certificate renewal, it's automatic. The certificates get stored in `docker/acme.json` (don't delete this file or you'll have to regenerate certificates).

First startup will take a few minutes while containers initialize and MongoDB restores the database dump. You can monitor the logs to see what's happening:
```bash
docker-compose -f docker/docker-compose.prod.yml logs -f
```

Once everything is up, your app should be accessible at your domain, and Grafana monitoring at your monitoring subdomain (if configured). 


# Architecture

```
Ereuna/
├── api/                          # Node.js/TypeScript REST API
│   ├── routes/                   # API route handlers
│   │   ├── Charts.ts            # Chart data endpoints
│   │   ├── Dashboard.ts         # Dashboard endpoints
│   │   ├── Maintenance.ts       # Maintenance mode control
│   │   ├── Notes.ts             # User notes management
│   │   ├── Portfolio.ts         # Portfolio tracking
│   │   ├── Screener.ts          # Stock screener
│   │   ├── Users.ts             # Authentication & user management
│   │   └── Watchlists.ts        # Watchlist management
│   ├── utils/                    # Utility modules
│   │   ├── cache.ts             # Redis caching layer
│   │   ├── config.ts            # Configuration management
│   │   ├── dividends.ts         # Dividend calculations
│   │   ├── logger.ts            # Structured logging
│   │   ├── portfolioStats.ts    # Portfolio analytics
│   │   ├── priceVolumeUtils.ts  # Price/volume utilities
│   │   └── validationUtils.ts   # Input validation & sanitization
│   └── server.ts                 # Express server entry point
│
├── server/                       # Python backend services (websocket + aggregator)
│   ├── aggregator/              # Data aggregation service
│   │   ├── aggregator.py        # Real-time candle aggregator
│   │   ├── app.py               # FastAPI application
│   │   ├── delist.py            # Delisting scanner
│   │   ├── helper.py            # Maintenance utilities
│   │   ├── ipo.py               # New ticker onboarding
│   │   ├── organizer.py         # Daily data orchestrator
│   │   └── signal_analyzer.py   # Technical trading signals
│   ├── ingestor/                # Data ingestion service
│   │   └── ingestor.py          # Tiingo data stream consumer
│   └── websocket/               # WebSocket server
│       └── websocket.py         # Real-time price streaming
│
├── src/                         # Vue.js frontend application
│   ├── assets/                  # Static assets
│   │   ├── icons/              # SVG icons
│   │   └── images/             # Images
│   ├── components/              # Vue components
│   │   ├── blog/               # Blog components
│   │   ├── charts/             # Charting components
│   │   ├── Docs/               # Documentation components
│   │   ├── Portfolio/          # Portfolio views
│   │   ├── Screener/           # Screener components
│   │   ├── sidebar/            # Navigation sidebar
│   │   └── User/               # User profile components
│   ├── composables/            # Vue composables
│   ├── config/                 # Frontend configuration
│   ├── constants/              # Constants & enums
│   ├── i18n/                   # Internationalization
│   │   └── locales/           # Translation files
│   ├── lib/                    # Third-party libraries
│   │   └── lightweight-charts/ # TradingView Lightweight Charts
│   ├── router/                 # Vue Router configuration
│   ├── store/                  # Pinia state management
│   ├── types/                  # TypeScript type definitions
│   ├── views/                  # Page components
│   ├── App.vue                 # Root component
│   ├── main.ts                 # Application entry point
│   └── style.scss              # Global styles
│
├── docker/                      # Docker & orchestration
│   ├── docker-compose.dev.yml  # Development environment
│   ├── docker-compose.prod.yml # Production environment
│   ├── Dockerfile.*            # Service dockerfiles
│   ├── nginx.conf              # Nginx reverse proxy
│   ├── traefik.yml             # Traefik edge router
│   ├── prometheus.yml          # Metrics configuration
│   ├── loki.yml                # Log aggregation
│   └── dashboards.yml          # Grafana dashboards
│
├── public/                      # Public static files
│   ├── Basic/                  # Basic asset data
│   ├── CRYPTO/                 # Crypto listings
│   ├── NASDAQ/                 # NASDAQ listings
│   ├── NYSE/                   # NYSE listings
│   ├── docs/                   # Documentation files
│   ├── robots.txt              # SEO configuration
│   └── sitemap.xml             # Sitemap
│
├── db/                         # Database utilities & documentation
│   ├── dump/                   # Database backups
│   └── docs/                   # MongoDB schema documentation → [see DATABASE.md](db/docs/DATABASE.md)
│
├── index.html                  # HTML entry point
├── package.json                # Node.js dependencies
├── vite.config.ts              # Vite build configuration
├── tsconfig.json               # TypeScript configuration
├── requirements.txt            # Python dependencies
└── README.md                   # Project summary documentation
```
----

Docker Deployment Architecture
═══════════════════════════════════════════════════════════════════════════════

                                   Internet
                                      │
                                      ▼
                            ┌─────────────────┐
                            │    Traefik      │  Port 80/443
                            │  Reverse Proxy  │  (HTTPS/TLS)
                            └────────┬────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
          ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
          │   Frontend   │  │   Grafana    │  │  WebSocket   │
          │  (Vue.js)    │  │ Monitoring   │  │   Server     │
          │  Port 3500   │  │  Port 3000   │  │  Port 8000   │
          └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
                 │                 │                 │
                 └────────┬────────┴────────┬────────┘
                          │                 │
            ┌─────────────┼─────────────────┼─────────────────┐
            │             │                 │                 │
            ▼             ▼                 ▼                 ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │   Backend    │ │  Aggregator  │ │   Ingestor   │ │ Prometheus   │
    │  (Node.js)   │ │  (FastAPI)   │ │  (FastAPI)   │ │   Metrics    │
    │  Port 5500   │ │  Port 8002   │ │  Port 8001   │ │  Port 9090   │
    └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────────────┘
           │                │                │
           └────────────────┼────────────────┘
                            │
            ┌───────────────┼────────────────┐
            │               │                │
            ▼               ▼                ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │   MongoDB    │ │     Redis    │ │     Loki     │
    │   Database   │ │     Cache    │ │  Log Storage │
    │  Port 27017  │ │  Port 6379   │ │  Port 3100   │
    └──────┬───────┘ └──────┬───────┘ └──────────────┘
           │                │
           ▼                ▼
    ┌──────────────┐ ┌──────────────┐
    │   MongoDB    │ │    Redis     │
    │   Exporter   │ │   Exporter   │
    │  Port 9216   │ │  Port 9121   │
    └──────────────┘ └──────────────┘

═══════════════════════════════════════════════════════════════════════════════

Networks:
----------
• ereuna-network          - External network (Traefik → Services)
• ereuna-network-internal - Internal network (Services ↔ Databases)

Service Dependencies:
---------------------
Frontend  → Backend, Redis, MongoDB
Backend   → MongoDB, Redis
WebSocket → Redis, MongoDB
Ingestor  → Redis, MongoDB
Aggregator→ Redis, MongoDB
Grafana   → Prometheus, Loki
Prometheus→ All services (metrics)
Promtail  → Loki (logs)

Data Flow:
----------
1. Client → Traefik (HTTPS termination)
2. Traefik → Frontend/WebSocket (based on path)
3. Frontend → Backend API (REST)
4. Frontend → WebSocket (Real-time data)
5. WebSocket ↔ Redis (Pub/Sub)
6. Ingestor → Redis Stream (Market data)
7. Aggregator → Redis → MongoDB (Candle aggregation)
8. Backend → MongoDB (User data, portfolios)
9. Promtail → Docker logs → Loki
10. Prometheus → Service metrics → Grafana

Volumes:
--------
• mongodb_data    - Persistent database storage
• prometheus_data - Metrics time-series storage
• grafana_data    - Dashboards and configurations
• logs_volume     - Aggregated application logs

Health Checks:
--------------
MongoDB    - mongosh ping
Redis      - redis-cli ping
Aggregator - /ready endpoint
Ingestor   - /ready endpoint
WebSocket  - /ready endpoint

# Dependencies

### Frontend (Vue.js/TypeScript)
- **Vue 3** - Progressive JavaScript framework
- **Vite** - Next-generation frontend build tool
- **TypeScript** - Type-safe JavaScript
- **Pinia** - State management
- **Vuex** - Legacy state management
- **Vue Router** - Client-side routing
- **Vue I18n** - Internationalization (17+ languages)
- **TradingView Lightweight Charts** - Financial charting (It's a forked version with more features built on top of it)
- **Chart.js** - Additional charting library (Portfolio Simulator)
- **Chartjs Plugin Annotation** - Chart annotations
- **Sortable.js** - Drag-and-drop lists (for watchlist sorting mainly)
- **QRCode.vue** - QR code generation 
- **DOMPurify** - XSS sanitization
- **JS Cookie** - Cookie management
- **Stripe.js** - Payment integration

### Backend API (Node.js/TypeScript)
- **Express** - Web framework
- **MongoDB** - Database driver (v6.8.0)
- **Mongosh** - MongoDB shell
- **Redis & IORedis** - Caching clients
- **Argon2, Bcrypt, Bcryptjs** - Password hashing
- **JWT (jsonwebtoken)** - Authentication tokens
- **Helmet** - Security headers
- **Express Rate Limit** - DDoS protection
- **Express Validator** - Input validation
- **Validator** - String validation
- **CORS** - Cross-origin resource sharing
- **Cookie Parser** - Cookie parsing
- **Pino** - Structured logging
- **Pino HTTP** - HTTP request logging
- **Pino Pretty** - Log formatting
- **Express Prom Bundle** - Prometheus metrics
- **Prom Client** - Metrics collection
- **Node Cron** - Task scheduling
- **Dotenv** - Environment management
- **Speakeasy & OTPAuth** - 2FA/TOTP
- **QRCode** - QR code generation
- **PDF-lib** - PDF generation
- **JSRsaSign** - Cryptographic operations
- **Stripe** - Payment processing

### Python Services (Backend)
- **FastAPI** - Modern async web framework
- **Motor** - Async MongoDB driver
- **PyMongo** - MongoDB operations
- **aioredis** - Async Redis client
- **Pandas & NumPy** - Data processing & analytics
- **Uvicorn** - ASGI server
- **Python-dotenv** - Environment management
- **Requests** - HTTP library

### Infrastructure & DevOps
- **Docker & Docker Compose** - Containerization
- **Traefik** - Reverse proxy & HTTPS/TLS
- **MongoDB** - Primary database
- **Redis** - Caching, pub/sub & streaming
- **Prometheus** - Metrics collection
- **Grafana** - Monitoring dashboards
- **Loki** - Log aggregation
- **Promtail** - Log shipping
- **Percona MongoDB Exporter** - Database metrics
- **Redis Exporter** - Cache metrics

### Browser Polyfills
- **assert, buffer, process** - Node.js compatibility
- **browserify-zlib** - Compression
- **https-browserify** - HTTPS
- **os-browserify** - OS utilities
- **stream-browserify, stream-http** - Streams
- **tty-browserify** - TTY
- **url, util** - Node utilities
- **readable-stream** - Stream implementation

### External APIs & Services
- **Tiingo API** - Market data (EOD, real-time, fundamentals, crypto)
- **Stripe API** - Payment processing
- **Cloudflare** - DNS & SSL/TLS certificates

### Development Tools
- **Nodemon** - Auto-reload server
- **TypeScript** - Type system (v5.9.2)
- **ts-node** - TypeScript execution
- **Vite Plugin Node Polyfills** - Node.js polyfills for browser
- **Sass Embedded** - SCSS compilation
- **Various @types packages** - TypeScript definitions

---

## Acknowledgments

This project was built using amazing open-source tools and third-party services:

- **TradingView** - For the Lightweight Charts library (forked and extended)
- **Tiingo** - For providing comprehensive financial market data APIs
- **Vue.js, Node.js, and MongoDB communities** - For excellent documentation and support
- All the open-source maintainers of the dependencies listed above

## Contact

For questions, collaboration, or commercial licensing inquiries:
- **GitHub:** [@larrydarko1](https://github.com/larrydarko1)
- **Email:** Open an issue on GitHub for contact

## License

⚠️ **This project is licensed under CC BY-NC-SA 4.0 — Non-commercial use only.**

You may **NOT** use this code for:
- Commercial products or services
- SaaS platforms or hosted services
- Revenue-generating applications
- Reselling, repackaging, or sublicensing

You **MAY** use this code for:
- Learning and educational purposes
- Portfolio review and technical interviews
- Personal, non-commercial projects
- Contributing improvements back via pull requests

See [LICENSE.md](LICENSE.md) for complete terms.

For commercial licensing inquiries, please open an issue on GitHub.

---

*Built with 🖤 as a learning journey into full-stack development*

