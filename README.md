# Ereuna Platform

A modern, full-stack platform for financial data analysis, charting, portfolio management, and screening. Built with Node.js (Express), Vue.js, Python (FastAPI), and MongoDB. 

---

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Development](#development)
- [Contributing](#contributing)
- [Author](#author)

---


## Features
### Dashboard
 - Market Index summary performance (SPY, QQQ, DIA) for 1d, 1m, 1q, 1y, and YTD.
 - SMA Distribution: percentage of financial assets above and below key moving averages (10, 20, 50, 200).
 - Quarterly sector and industry strengths and weaknesses (top 3 best/worst performing sectors and industries).
 - Daily top movers: top 10 gainers and losers by percentage return.

### Account
 - Basic account settings (change username, change password, recovery key, delete account).
 - Subscription status (renew subscription, request refund, view time and credits left, download receipts as PDF).
 - 45 different themes to choose from.
 - 2FA authentication (authenticator app only, with device pairing QR code and 6-digit code).
 - Standard communication from main app (news, new features, etc.).

### Portfolio
 - 10 portfolio simulation slots per user (add cash, simulate trades, set base value).
 - Import/export portfolio data in both CSV and PDF formats.
 - Pie chart for active positions (up to 500 per user).
 - Bar chart for trade distribution.
 - Line chart for portfolio P/L.
 - Basic portfolio statistics.
 - Simulated transaction history (up to 1000 per portfolio slot).

### Charts
 - Lightweight TradingView chart (timeframes: 1m, 5m, 30m, 1h, 1d, 1w), intrinsic value display, and up to 4 basic MA indicators (SMA/EMA) with customizable visibility and timeframes.
 - Watchlist feature (up to 100 symbols per watchlist, 10 watchlists per user).
 - Sortable symbols within watchlists (drag and drop).
 - Autoplay feature (cycles through watchlist symbols every 5 seconds).
 - Basic watchlist features (CRUD).
 - Note features (CRUD).
 - Left panel with financial information, customizable in visibility and order.
 - Add to watchlist features.

### Screener
 - 45 screening parameters.
 - Custom formulas for market strength.
 - Hidden list features (users can customize visibility of assets in screener results).
 - One-click multi-screener feature (users can select and run screeners simultaneously, with duplicate values automatically highlighted and sorted).
 - Add to watchlist features.
 - Basic screener features (CRUD).

## Tech Stack
- **Frontend:** Vue.js, Vite
- **Backend:** Node.js (Express), Python (FastAPI)
- **Database:** MongoDB
- **Containerization:** Docker, Docker Compose

## Getting Started

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- MongoDB (local or Docker)
- Python 3.10+

### Installation
1. Clone the repository
2. Copy `.env.example` to `.env` and fill in required variables
3. Install dependencies:
   ```sh
   npm install
   ```
4. Start with Docker Compose:
   ```sh
   docker-compose up --build
   ```

## Project Structure
- `api/` - Node.js backend (Express)
- `server/` - Python backend (FastAPI, data aggregation, websocket)
- `src/` - Vue.js frontend
- `db/` - Database initialization scripts
- `public/` - Static assets

## Configuration
- Environment variables are managed via `.env` files
- MongoDB URI, API keys, and other secrets must be set in `.env`
- SSL certificates in `certs/` for local HTTPS

## Development
- `sudo npm run dev` - Start frontend (Vite)
- `npm run backend` - Start Node.js backend
- `npm run docker` - Start all services with Docker Compose
- `npm run websocket` - Start Python FastAPI websocket server

## Contributing
- Fork the repo and create a feature branch
- Follow code style and commit conventions
- Open a pull request for review

## Author
Developed with 🤬 by Lorenzo Mazzola  
[GitHub](https://github.com/larrydarko1)