from pymongo import MongoClient
from datetime import datetime
from collections import defaultdict
import math
import random
from datetime import datetime, timedelta

# --- CONFIG ---
MONGO_URI = "mongodb://localhost:27017"  # Update if needed
DB_NAME = "EreunaDB"


def update_portfolio_stats(username, portfolio_number):
    """
    Calculate and update static summary statistics in the Portfolios collection for a user and portfolio number.
    Args:
        username (str): Username
        portfolio_number (int): Portfolio number
    """
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    trades = list(db["Trades"].find({"Username": username, "PortfolioNumber": portfolio_number}))
    positions = list(db["Positions"].find({"Username": username, "PortfolioNumber": portfolio_number}))
    debug_trades(trades)
    portfolio_doc = db["Portfolios"].find_one({"Username": username, "Number": portfolio_number})
    cash = portfolio_doc["cash"] if portfolio_doc and "cash" in portfolio_doc else 0.0
    base_value = portfolio_doc["BaseValue"] if portfolio_doc and "BaseValue" in portfolio_doc else 0.0

    def compute_realizedPL(trades):
        txs = sorted([tx for tx in trades if tx.get("Date") and tx.get("Symbol") and tx.get("Action")], key=lambda x: x["Date"])
        realized = 0
        lots = defaultdict(list)
        for tx in txs:
            if tx["Action"] == "Buy":
                lots[tx["Symbol"]].append({"shares": tx["Shares"], "price": tx["Price"]})
            elif tx["Action"] == "Sell":
                shares_to_sell = tx["Shares"]
                while shares_to_sell > 0 and lots[tx["Symbol"]]:
                    lot = lots[tx["Symbol"]][0]
                    sell_shares = min(lot["shares"], shares_to_sell)
                    realized += (tx["Price"] - lot["price"]) * sell_shares
                    lot["shares"] -= sell_shares
                    shares_to_sell -= sell_shares
                    if lot["shares"] == 0:
                        lots[tx["Symbol"]].pop(0)
        return realized

    def get_closed_positions(trades):
        txs = sorted([tx for tx in trades if tx.get("Date")], key=lambda x: x["Date"])
        positions = []
        lots = defaultdict(list)
        for tx in txs:
            if not tx.get("Symbol") or not tx.get("Action"):
                continue
            if tx["Action"] == "Buy":
                lots[tx["Symbol"]].append({"shares": tx["Shares"], "price": tx["Price"], "date": tx["Date"]})
            elif tx["Action"] == "Sell":
                shares_to_sell = tx["Shares"]
                while shares_to_sell > 0 and lots[tx["Symbol"]]:
                    lot = lots[tx["Symbol"]][0]
                    sell_shares = min(lot["shares"], shares_to_sell)
                    pnl = ((tx["Price"] - lot["price"]) / lot["price"]) * 100 if lot["price"] else 0
                    hold_days = max(0, round((datetime.fromisoformat(tx["Date"].replace('Z', '+00:00')) - datetime.fromisoformat(lot["date"].replace('Z', '+00:00'))).days))
                    positions.append({
                        "symbol": tx["Symbol"],
                        "buyDate": lot["date"],
                        "sellDate": tx["Date"],
                        "buyPrice": lot["price"],
                        "sellPrice": tx["Price"],
                        "shares": sell_shares,
                        "pnl": pnl,
                        "holdDays": hold_days
                    })
                    lot["shares"] -= sell_shares
                    shares_to_sell -= sell_shares
                    if lot["shares"] == 0:
                        lots[tx["Symbol"]].pop(0)
        return positions

    def safe_div(a, b):
        return a / b if b else 0

    # Sort trades by symbol, then by date ascending
    trades_sorted = sorted(trades, key=lambda x: (x.get("Symbol", ""), x.get("Date", "")))
    closed_positions = get_closed_positions(trades_sorted)
    print('Closed positions:', closed_positions)
    print('P&Ls:', [p['pnl'] for p in closed_positions])
    winner_positions = [p for p in closed_positions if p["pnl"] > 0]
    loser_positions = [p for p in closed_positions if p["pnl"] < 0]
    breakeven_positions = [p for p in closed_positions if p["pnl"] == 0]
    total_closed = len(closed_positions)

    winner_count = len(winner_positions)
    loser_count = len(loser_positions)
    breakeven_count = len(breakeven_positions)

    winner_percent = safe_div(winner_count * 100, total_closed)
    loser_percent = safe_div(loser_count * 100, total_closed)
    breakeven_percent = safe_div(breakeven_count * 100, total_closed)

    avgHoldTimeWinners = safe_div(sum(p["holdDays"] for p in winner_positions), winner_count)
    avgHoldTimeLosers = safe_div(sum(p["holdDays"] for p in loser_positions), loser_count)

    avgGain = safe_div(sum(p["pnl"] for p in winner_positions), winner_count)
    avgLoss = safe_div(sum(p["pnl"] for p in loser_positions), loser_count)
    avgGainAbs = safe_div(sum((p["sellPrice"] - p["buyPrice"]) * p["shares"] for p in winner_positions), winner_count)
    avgLossAbs = safe_div(sum(abs((p["sellPrice"] - p["buyPrice"]) * p["shares"]) for p in loser_positions), loser_count)

    gainLossRatio = safe_div(abs(avgGain), abs(avgLoss)) if avgLoss != 0 else None
    riskRewardRatio = safe_div(abs(avgLoss), abs(avgGain)) if avgGain != 0 else None

    grossProfit = sum((p["sellPrice"] - p["buyPrice"]) * p["shares"] for p in winner_positions)
    grossLoss = sum(abs((p["sellPrice"] - p["buyPrice"]) * p["shares"]) for p in loser_positions)
    profitFactor = safe_div(grossProfit, grossLoss) if grossLoss != 0 else None

    # Sortino ratio (riskFreeRate = 0.02)
    riskFreeRate = 0.02
    returns = [p["pnl"] / 100 for p in closed_positions]
    avgReturn = safe_div(sum(returns), len(returns)) if returns else 0
    downsideReturns = [r for r in returns if r < riskFreeRate]
    downsideDev = math.sqrt(safe_div(sum((r - riskFreeRate) ** 2 for r in downsideReturns), len(downsideReturns))) if downsideReturns else 0
    sortinoRatio = safe_div(avgReturn - riskFreeRate, downsideDev) if downsideDev != 0 else None

    # Biggest winner/loser
    pl_by_ticker = defaultdict(float)
    trade_counts = defaultdict(int)
    for p in closed_positions:
        pl_by_ticker[p["symbol"]] += (p["sellPrice"] - p["buyPrice"]) * p["shares"]
        trade_counts[p["symbol"]] += 1
    biggestWinner = None
    biggestLoser = None
    if pl_by_ticker:
        max_ticker = max(pl_by_ticker, key=lambda k: pl_by_ticker[k])
        min_ticker = min(pl_by_ticker, key=lambda k: pl_by_ticker[k])
        biggestWinner = {
            "ticker": max_ticker,
            "amount": round(pl_by_ticker[max_ticker], 2),
            "tradeCount": trade_counts[max_ticker]
        }
        biggestLoser = {
            "ticker": min_ticker,
            "amount": abs(round(pl_by_ticker[min_ticker], 2)),
            "tradeCount": trade_counts[min_ticker]
        }

    # Avg position size (as percent of portfolio value at buy)
    def compute_avg_position_size(trades, base_value):
        buys = [tx for tx in trades if tx.get("Action") == "Buy" and tx.get("Total")]
        if not buys or base_value <= 0:
            return 0.0
        avg_percents = [(tx["Total"] / base_value) * 100 for tx in buys]
        return round(sum(avg_percents) / len(avg_percents), 2)

    avgPositionSize = compute_avg_position_size(trades, base_value)

    realizedPL = compute_realizedPL(trades)
    realizedPLPercent = safe_div(realizedPL * 100, base_value) if base_value else 0

    stats = {
        "realizedPL": round(realizedPL, 2),
        "realizedPLPercent": round(realizedPLPercent, 2),
        "avgPositionSize": round(avgPositionSize, 2),
        "avgHoldTimeWinners": round(avgHoldTimeWinners, 1),
        "avgHoldTimeLosers": round(avgHoldTimeLosers, 1),
        "avgGain": round(avgGain, 2),
        "avgLoss": round(avgLoss, 2),
        "avgGainAbs": round(avgGainAbs, 2),
        "avgLossAbs": round(avgLossAbs, 2),
        "gainLossRatio": round(gainLossRatio, 2) if gainLossRatio is not None else None,
        "riskRewardRatio": round(riskRewardRatio, 2) if riskRewardRatio is not None else None,
        "winnerCount": winner_count,
        "winnerPercent": round(winner_percent, 2),
        "loserCount": loser_count,
        "loserPercent": round(loser_percent, 2),
        "breakevenCount": breakeven_count,
        "breakevenPercent": round(breakeven_percent, 2),
        "profitFactor": round(profitFactor, 2) if profitFactor is not None else None,
        "sortinoRatio": round(sortinoRatio, 2) if sortinoRatio is not None else None,
        "biggestWinner": biggestWinner,
        "biggestLoser": biggestLoser
    }

    db["Portfolios"].update_one(
        {"Username": username, "Number": portfolio_number},
        {"$set": stats}
    )
    client.close()
    print(f"Updated portfolio {portfolio_number} for {username} with stats.")


def update_all_portfolios_for_user(username):
    """
    Update stats for all portfolios (0-9) for a given user.
    Args:
        username (str): Username
    """
    for portfolio_number in range(10):
        update_portfolio_stats(username, portfolio_number)

def debug_trades(trades):
    print(f"Total trades fetched: {len(trades)}")
    buy_count = sum(1 for t in trades if str(t.get("Action")).lower() == "buy")
    sell_count = sum(1 for t in trades if str(t.get("Action")).lower() == "sell")
    actions = set(str(t.get("Action")).lower() for t in trades)
    print(f"Buy trades: {buy_count}, Sell trades: {sell_count}")
    print(f"Actions found: {actions}")
    # Print a few sample trades for inspection
    for t in trades[:5]:
        print(t)

def generate_matched_trades(username, portfolio_number, num_trades=250):
    """
    Generate and insert random Buy trades, then matching Sell trades at a later date for each symbol.
    """
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    asset_info = db["AssetInfo"]
    trades = db["Trades"]
    positions = db["Positions"]

    # Get unique symbols
    symbols = list(asset_info.distinct("Symbol"))
    if len(symbols) < num_trades:
        print(f"Not enough symbols in AssetInfo (found {len(symbols)})")
        client.close()
        return
    selected_symbols = random.sample(symbols, num_trades)

    base_date = datetime(2025, 1, 1)
    for i, symbol in enumerate(selected_symbols):
        shares = random.randint(1, 100)
        buy_price = round(random.uniform(10, 500), 2)
        sell_price = round(buy_price * random.uniform(0.8, 1.2), 2)  # +/- 20% from buy
        buy_date = base_date + timedelta(days=i)
        sell_date = buy_date + timedelta(days=random.randint(1, 30))
        total_buy = round(shares * buy_price + 1, 2)
        total_sell = round(shares * sell_price - 1, 2)
        # Insert Buy trade
        trade_doc_buy = {
            "Date": buy_date.isoformat() + "Z",
            "Symbol": symbol,
            "Action": "Buy",
            "Shares": shares,
            "Price": buy_price,
            "Total": total_buy,
            "Commission": 1,
            "Username": username,
            "PortfolioNumber": portfolio_number
        }
        trades.insert_one(trade_doc_buy)
        # Insert Sell trade
        trade_doc_sell = {
            "Date": sell_date.isoformat() + "Z",
            "Symbol": symbol,
            "Action": "Sell",
            "Shares": shares,
            "Price": sell_price,
            "Total": total_sell,
            "Commission": 1,
            "Username": username,
            "PortfolioNumber": portfolio_number
        }
        trades.insert_one(trade_doc_sell)
        # Insert position (after buy)
        position_doc = {
            "Username": username,
            "PortfolioNumber": portfolio_number,
            "Symbol": symbol,
            "Shares": 0,
            "AvgPrice": buy_price
        }
        positions.insert_one(position_doc)
    client.close()
    print(f"Inserted {num_trades} matched buy/sell trades for {username}, portfolio {portfolio_number}")

def generate_realistic_portfolio(username, portfolio_number, num_closed=250, num_active=10, initial_cash=1_000_000):
    """
    Generate a portfolio with closed positions (buy+sell), active positions (buy only), and initial cash. Updates cash for each trade.
    """
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    asset_info = db["AssetInfo"]
    trades = db["Trades"]
    positions = db["Positions"]
    portfolios = db["Portfolios"]

    # Get unique symbols
    symbols = list(asset_info.distinct("Symbol"))
    if len(symbols) < num_closed + num_active:
        print(f"Not enough symbols in AssetInfo (found {len(symbols)})")
        client.close()
        return
    closed_symbols = random.sample(symbols, num_closed)
    active_symbols = random.sample([s for s in symbols if s not in closed_symbols], num_active)

    base_date = datetime(2025, 1, 1)
    cash = initial_cash

    # Insert portfolio doc with initial cash
    portfolios.update_one(
        {"Username": username, "Number": portfolio_number},
        {"$set": {"cash": cash, "BaseValue": initial_cash}},
        upsert=True
    )
    # Insert cash deposit trade
    cash_deposit_doc = {
        "Date": base_date.isoformat() + "Z",
        "Symbol": "-",
        "Action": "Cash Deposit",
        "Shares": "-",
        "Price": "-",
        "Total": initial_cash,
        "Username": username,
        "PortfolioNumber": portfolio_number
    }
    trades.insert_one(cash_deposit_doc)

    # Closed positions: Buy then Sell
    for i, symbol in enumerate(closed_symbols):
        shares = random.randint(1, 100)
        buy_price = round(random.uniform(10, 500), 2)
        sell_price = round(buy_price * random.uniform(0.8, 1.2), 2)
        buy_date = base_date + timedelta(days=i)
        sell_date = buy_date + timedelta(days=random.randint(1, 30))
        total_buy = round(shares * buy_price + 1, 2)
        total_sell = round(shares * sell_price - 1, 2)
        # Buy trade
        trade_doc_buy = {
            "Date": buy_date.isoformat() + "Z",
            "Symbol": symbol,
            "Action": "Buy",
            "Shares": shares,
            "Price": buy_price,
            "Total": total_buy,
            "Commission": 1,
            "Username": username,
            "PortfolioNumber": portfolio_number
        }
        trades.insert_one(trade_doc_buy)
        cash -= total_buy
        # Sell trade
        trade_doc_sell = {
            "Date": sell_date.isoformat() + "Z",
            "Symbol": symbol,
            "Action": "Sell",
            "Shares": shares,
            "Price": sell_price,
            "Total": total_sell,
            "Commission": 1,
            "Username": username,
            "PortfolioNumber": portfolio_number
        }
        trades.insert_one(trade_doc_sell)
        cash += total_sell
    # Active positions: Buy only
    for i, symbol in enumerate(active_symbols):
        shares = random.randint(1, 100)
        buy_price = round(random.uniform(10, 500), 2)
        buy_date = base_date + timedelta(days=num_closed + i)
        total_buy = round(shares * buy_price + 1, 2)
        trade_doc_buy = {
            "Date": buy_date.isoformat() + "Z",
            "Symbol": symbol,
            "Action": "Buy",
            "Shares": shares,
            "Price": buy_price,
            "Total": total_buy,
            "Commission": 1,
            "Username": username,
            "PortfolioNumber": portfolio_number
        }
        trades.insert_one(trade_doc_buy)
        cash -= total_buy
        position_doc = {
            "Username": username,
            "PortfolioNumber": portfolio_number,
            "Symbol": symbol,
            "Shares": shares,
            "AvgPrice": buy_price
        }
        positions.insert_one(position_doc)
    # Update cash in portfolio doc
    portfolios.update_one(
        {"Username": username, "Number": portfolio_number},
        {"$set": {"cash": cash}},
        upsert=True
    )
    client.close()
    print(f"Inserted {num_closed} closed and {num_active} active positions for {username}, portfolio {portfolio_number}. Final cash: {cash}")

def insert_vat_rates():
    """
    Insert or update VAT rates for countries in the Stats collection.
    """
    countries = [
        {"code": "AT", "name": "Austria", "vat": 0.20},
        {"code": "BE", "name": "Belgium", "vat": 0.21},
        {"code": "BG", "name": "Bulgaria", "vat": 0.20},
        {"code": "HR", "name": "Croatia", "vat": 0.25},
        {"code": "CY", "name": "Cyprus", "vat": 0.19},
        {"code": "CZ", "name": "Czech Republic", "vat": 0.21},
        {"code": "DK", "name": "Denmark", "vat": 0.25},
        {"code": "EE", "name": "Estonia", "vat": 0.20},
        {"code": "FI", "name": "Finland", "vat": 0.24},
        {"code": "FR", "name": "France", "vat": 0.20},
        {"code": "DE", "name": "Germany", "vat": 0.19},
        {"code": "GR", "name": "Greece", "vat": 0.24},
        {"code": "HU", "name": "Hungary", "vat": 0.27},
        {"code": "IE", "name": "Ireland", "vat": 0.23},
        {"code": "IT", "name": "Italy", "vat": 0.22},
        {"code": "LV", "name": "Latvia", "vat": 0.21},
        {"code": "LT", "name": "Lithuania", "vat": 0.21},
        {"code": "LU", "name": "Luxembourg", "vat": 0.16},
        {"code": "MT", "name": "Malta", "vat": 0.18},
        {"code": "NL", "name": "Netherlands", "vat": 0.21},
        {"code": "NO", "name": "Norway", "vat": 0.25},
        {"code": "PL", "name": "Poland", "vat": 0.23},
        {"code": "PT", "name": "Portugal", "vat": 0.23},
        {"code": "RO", "name": "Romania", "vat": 0.19},
        {"code": "SK", "name": "Slovakia", "vat": 0.20},
        {"code": "SI", "name": "Slovenia", "vat": 0.22},
        {"code": "ES", "name": "Spain", "vat": 0.21},
        {"code": "SE", "name": "Sweden", "vat": 0.25},
        {"code": "CH", "name": "Switzerland", "vat": 0.08},
        {"code": "GB", "name": "United Kingdom", "vat": 0.20},
        {"code": "UA", "name": "Ukraine", "vat": 0.20},
        {"code": "AL", "name": "Albania", "vat": 0.20},
        {"code": "AM", "name": "Armenia", "vat": 0.20},
        {"code": "AZ", "name": "Azerbaijan", "vat": 0.18},
        {"code": "BY", "name": "Belarus", "vat": 0.20},
        {"code": "BA", "name": "Bosnia and Herzegovina", "vat": 0.17},
        {"code": "GE", "name": "Georgia", "vat": 0.18},
        {"code": "KA", "name": "Kazakhstan", "vat": 0.12},
        {"code": "KG", "name": "Kyrgyzstan", "vat": 0.12},
        {"code": "MD", "name": "Moldova", "vat": 0.20},
        {"code": "ME", "name": "Montenegro", "vat": 0.21},
        {"code": "MK", "name": "North Macedonia", "vat": 0.18},
        {"code": "RS", "name": "Serbia", "vat": 0.20},
        {"code": "TJ", "name": "Tajikistan", "vat": 0.18},
        {"code": "UZ", "name": "Uzbekistan", "vat": 0.12},
        {"code": "AF", "name": "Afghanistan", "vat": 0.10},
        {"code": "SA", "name": "Saudi Arabia", "vat": 0.15},
        {"code": "AE", "name": "United Arab Emirates", "vat": 0.05},
        {"code": "BH", "name": "Bahrain", "vat": 0.05},
        {"code": "BD", "name": "Bangladesh", "vat": 0.15},
        {"code": "BT", "name": "Bhutan", "vat": 0.05},
        {"code": "BN", "name": "Brunei", "vat": 0.08},
        {"code": "KH", "name": "Cambodia", "vat": 0.10},
        {"code": "CN", "name": "China", "vat": 0.13},
        {"code": "HK", "name": "Hong Kong", "vat": 0.00},
        {"code": "IN", "name": "India", "vat": 0.18},
        {"code": "ID", "name": "Indonesia", "vat": 0.10},
        {"code": "IR", "name": "Iran", "vat": 0.09},
        {"code": "IQ", "name": "Iraq", "vat": 0.05},
        {"code": "IL", "name": "Israel", "vat": 0.17},
        {"code": "JP", "name": "Japan", "vat": 0.10},
        {"code": "JO", "name": "Jordan", "vat": 0.16},
        {"code": "KP", "name": "North Korea", "vat": 0.05},
        {"code": "KR", "name": "South Korea", "vat": 0.10},
        {"code": "KW", "name": "Kuwait", "vat": 0.05},
        {"code": "LA", "name": "Laos", "vat": 0.10},
        {"code": "LB", "name": "Lebanon", "vat": 0.11},
        {"code": "MO", "name": "Macau", "vat": 0.00},
        {"code": "MY", "name": "Malaysia", "vat": 0.06},
        {"code": "MV", "name": "Maldives", "vat": 0.15},
        {"code": "MM", "name": "Myanmar", "vat": 0.05},
        {"code": "NP", "name": "Nepal", "vat": 0.13},
        {"code": "OM", "name": "Oman", "vat": 0.05},
        {"code": "PK", "name": "Pakistan", "vat": 0.17},
        {"code": "PH", "name": "Philippines", "vat": 0.12},
        {"code": "QA", "name": "Qatar", "vat": 0.05},
        {"code": "SG", "name": "Singapore", "vat": 0.08},
        {"code": "LK", "name": "Sri Lanka", "vat": 0.15},
        {"code": "SY", "name": "Syria", "vat": 0.10},
        {"code": "TW", "name": "Taiwan", "vat": 0.05},
        {"code": "TH", "name": "Thailand", "vat": 0.07},
        {"code": "TL", "name": "Timor-Leste", "vat": 0.10},
        {"code": "TR", "name": "Turkey", "vat": 0.18},
        {"code": "TM", "name": "Turkmenistan", "vat": 0.10},
        {"code": "UY", "name": "Uruguay", "vat": 0.22},
        {"code": "VN", "name": "Vietnam", "vat": 0.10},
        {"code": "YE", "name": "Yemen", "vat": 0.05},
        {"code": "ZW", "name": "Zimbabwe", "vat": 0.15},
        {"code": "AO", "name": "Angola", "vat": 0.14},
        {"code": "BJ", "name": "Benin", "vat": 0.18},
        {"code": "BW", "name": "Botswana", "vat": 0.12},
        {"code": "BF", "name": "Burkina Faso", "vat": 0.18},
        {"code": "BI", "name": "Burundi", "vat": 0.18},
        {"code": "CM", "name": "Cameroon", "vat": 0.19},
        {"code": "CV", "name": "Cape Verde", "vat": 0.15},
        {"code": "CF", "name": "Central African Republic", "vat": 0.19},
        {"code": "TD", "name": "Chad", "vat": 0.19},
        {"code": "KM", "name": "Comoros", "vat": 0.05},
        {"code": "CG", "name": "Congo", "vat": 0.20},
        {"code": "CI", "name": "Côte d'Ivoire", "vat": 0.18},
        {"code": "DJ", "name": "Djibouti", "vat": 0.10},
        {"code": "EG", "name": "Egypt", "vat": 0.14},
        {"code": "GQ", "name": "Equatorial Guinea", "vat": 0.15},
        {"code": "ER", "name": "Eritrea", "vat": 0.15},
        {"code": "ET", "name": "Ethiopia", "vat": 0.15},
        {"code": "GA", "name": "Gabon", "vat": 0.20},
        {"code": "GM", "name": "Gambia", "vat": 0.15},
        {"code": "GH", "name": "Ghana", "vat": 0.12},
        {"code": "GN", "name": "Guinea", "vat": 0.18},
        {"code": "GW", "name": "Guinea-Bissau", "vat": 0.15},
        {"code": "KE", "name": "Kenya", "vat": 0.16},
        {"code": "LS", "name": "Lesotho", "vat": 0.15},
        {"code": "LR", "name": "Liberia", "vat": 0.10},
        {"code": "LY", "name": "Libya", "vat": 0.10},
        {"code": "MG", "name": "Madagascar", "vat": 0.20},
        {"code": "MW", "name": "Malawi", "vat": 0.16},
        {"code": "ML", "name": "Mali", "vat": 0.18},
        {"code": "MR", "name": "Mauritania", "vat": 0.18},
        {"code": "MU", "name": "Mauritius", "vat": 0.15},
        {"code": "MA", "name": "Morocco", "vat": 0.20},
        {"code": "MZ", "name": "Mozambique", "vat": 0.17},
        {"code": "NA", "name": "Namibia", "vat": 0.15},
        {"code": "NE", "name": "Niger", "vat": 0.19},
        {"code": "NG", "name": "Nigeria", "vat": 0.07},
        {"code": "RE", "name": "Réunion", "vat": 0.08},
        {"code": "RW", "name": "Rwanda", "vat": 0.18},
        {"code": "ST", "name": "São Tomé and Príncipe", "vat": 0.15},
        {"code": "SN", "name": "Senegal", "vat": 0.18},
        {"code": "SC", "name": "Seychelles", "vat": 0.15},
        {"code": "SL", "name": "Sierra Leone", "vat": 0.15},
        {"code": "SO", "name": "Somalia", "vat": 0.10},
        {"code": "ZA", "name": "South Africa", "vat": 0.15},
        {"code": "SS", "name": "South Sudan", "vat": 0.10},
        {"code": "SD", "name": "Sudan", "vat": 0.10},
        {"code": "SZ", "name": "Swaziland", "vat": 0.15},
        {"code": "TZ", "name": "Tanzania", "vat": 0.18},
        {"code": "TG", "name": "Togo", "vat": 0.18},
        {"code": "TN", "name": "Tunisia", "vat": 0.19},
        {"code": "UG", "name": "Uganda", "vat": 0.18},
        {"code": "ZM", "name": "Zambia", "vat": 0.16},
        {"code": "ZW", "name": "Zimbabwe", "vat": 0.15},
        {"code": "AR", "name": "Argentina", "vat": 0.21},
        {"code": "BO", "name": "Bolivia", "vat": 0.13},
        {"code": "BR", "name": "Brazil", "vat": 0.12},
        {"code": "CL", "name": "Chile", "vat": 0.19},
        {"code": "CO", "name": "Colombia", "vat": 0.19},
        {"code": "EC", "name": "Ecuador", "vat": 0.12},
        {"code": "FK", "name": "Falkland Islands", "vat": 0.00},
        {"code": "GF", "name": "French Guiana", "vat": 0.08},
        {"code": "GY", "name": "Guyana", "vat": 0.14},
        {"code": "PY", "name": "Paraguay", "vat": 0.10},
        {"code": "PE", "name": "Peru", "vat": 0.18},
        {"code": "SR", "name": "Suriname", "vat": 0.20},
        {"code": "UY", "name": "Uruguay", "vat": 0.22},
        {"code": "VE", "name": "Venezuela", "vat": 0.16},
        {"code": "AW", "name": "Aruba", "vat": 0.06},
        {"code": "BS", "name": "Bahamas", "vat": 0.07},
        {"code": "BB", "name": "Barbados", "vat": 0.17},
        {"code": "BZ", "name": "Belize", "vat": 0.12},
        {"code": "BM", "name": "Bermuda", "vat": 0.07},
        {"code": "CA", "name": "Canada", "vat": 0.05},
        {"code": "KY", "name": "Cayman Islands", "vat": 0.00},
        {"code": "CR", "name": "Costa Rica", "vat": 0.13},
        {"code": "CU", "name": "Cuba", "vat": 0.10},
        {"code": "DM", "name": "Dominica", "vat": 0.15},
        {"code": "DO", "name": "Dominican Republic", "vat": 0.18},
        {"code": "SV", "name": "El Salvador", "vat": 0.13},
        {"code": "GL", "name": "Greenland", "vat": 0.25},
        {"code": "GD", "name": "Grenada", "vat": 0.15},
        {"code": "GT", "name": "Guatemala", "vat": 0.12},
        {"code": "HT", "name": "Haiti", "vat": 0.15},
        {"code": "HN", "name": "Honduras", "vat": 0.15},
        {"code": "JM", "name": "Jamaica", "vat": 0.16},
        {"code": "MQ", "name": "Martinique", "vat": 0.08},
        {"code": "MX", "name": "Mexico", "vat": 0.16},
        {"code": "MS", "name": "Montserrat", "vat": 0.15},
        {"code": "NI", "name": "Nicaragua", "vat": 0.15},
        {"code": "PA", "name": "Panama", "vat": 0.07},
        {"code": "BL", "name": "Saint Barthélemy", "vat": 0.08},
        {"code": "KN", "name": "Saint Kitts and Nevis", "vat": 0.17},
        {"code": "LC", "name": "Saint Lucia", "vat": 0.15},
        {"code": "MF", "name": "Saint Martin", "vat": 0.08},
        {"code": "PM", "name": "Saint Pierre and Miquelon", "vat": 0.08},
        {"code": "VC", "name": "Saint Vincent and the Grenadines", "vat": 0.15},
        {"code": "SR", "name": "Suriname", "vat": 0.20},
        {"code": "TT", "name": "Trinidad and Tobago", "vat": 0.12},
        {"code": "TC", "name": "Turks and Caicos Islands", "vat": 0.00},
        {"code": "US", "name": "United States", "vat": 0.00},
        {"code": "VI", "name": "U.S. Virgin Islands", "vat": 0.05},
        {"code": "UZ", "name": "Uzbekistan", "vat": 0.12},
        {"code": "AS", "name": "American Samoa", "vat": 0.04},
        {"code": "AU", "name": "Australia", "vat": 0.10},
        {"code": "CK", "name": "Cook Islands", "vat": 0.15},
        {"code": "FJ", "name": "Fiji", "vat": 0.09},
        {"code": "GU", "name": "Guam", "vat": 0.04},
        {"code": "KI", "name": "Kiribati", "vat": 0.12},
        {"code": "MH", "name": "Marshall Islands", "vat": 0.05},
        {"code": "FM", "name": "Micronesia", "vat": 0.05},
        {"code": "NR", "name": "Nauru", "vat": 0.15},
        {"code": "NC", "name": "New Caledonia", "vat": 0.08},
        {"code": "NZ", "name": "New Zealand", "vat": 0.15},
        {"code": "NU", "name": "Niue", "vat": 0.15},
        {"code": "NF", "name": "Norfolk Island", "vat": 0.10},
        {"code": "MP", "name": "Northern Mariana Islands", "vat": 0.05},
        {"code": "PW", "name": "Palau", "vat": 0.10},
        {"code": "PG", "name": "Papua New Guinea", "vat": 0.10},
        {"code": "PN", "name": "Pitcairn Islands", "vat": 0.00},
        {"code": "WS", "name": "Samoa", "vat": 0.15},
        {"code": "SB", "name": "Solomon Islands", "vat": 0.10},
        {"code": "TK", "name": "Tokelau", "vat": 0.15},
        {"code": "TO", "name": "Tonga", "vat": 0.15},
        {"code": "TV", "name": "Tuvalu", "vat": 0.15},
        {"code": "VU", "name": "Vanuatu", "vat": 0.15},
        {"code": "WF", "name": "Wallis and Futuna", "vat": 0.08},
        {"code": "AQ", "name": "Antarctica", "vat": 0.00},
        {"code": "BV", "name": "Bouvet Island", "vat": 0.00},
        {"code": "CX", "name": "Christmas Island", "vat": 0.00},
        {"code": "CC", "name": "Cocos (Keeling) Islands", "vat": 0.00},
        {"code": "HM", "name": "Heard Island and McDonald Islands", "vat": 0.00},
        {"code": "NF", "name": "Norfolk Island", "vat": 0.00},
        {"code": "AK", "name": "Azerbaijan", "vat": 0.18},
        {"code": "PS", "name": "Palestine", "vat": 0.16},
        {"code": "TL", "name": "Timor-Leste", "vat": 0.10},
        {"code": "EH", "name": "Western Sahara", "vat": 0.20},
        {"code": "AX", "name": "Åland Islands", "vat": 0.24}
    ]
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    db["Stats"].update_one(
        {"_id": "vat_rates"},
        {"$set": {"countries": countries, "lastUpdated": datetime.utcnow()}},
        upsert=True
    )
    print("VAT rates inserted/updated.")


# --- EDGE CASE TEST: Add up to 98 new tickers to Watchlist ---
def add_symbols_to_watchlist():
    """
    Add up to 98 new tickers from AssetInfo to the 'Index Funds' watchlist for 'LarryDarko', respecting the 100-symbol cap.
    """
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    watchlists = db["Watchlists"]
    asset_info = db["AssetInfo"]

    # Find the target watchlist
    watchlist = watchlists.find_one({"Name": "Index Funds", "UsernameID": "LarryDarko"})
    if not watchlist:
        print("Watchlist not found.")
        client.close()
        return

    current_list = watchlist.get("List", [])
    current_count = len(current_list)
    symbols_needed = 100 - current_count
    if symbols_needed <= 0:
        print("Watchlist already has 100 symbols.")
        client.close()
        return

    # Get all unique symbols not already in the list
    existing_tickers = set(item["ticker"] for item in current_list)
    asset_cursor = asset_info.find({}, {"Symbol": 1, "Exchange": 1, "_id": 0})
    new_items = []
    for asset in asset_cursor:
        symbol = asset.get("Symbol")
        exchange = asset.get("Exchange")
        if symbol and exchange and symbol not in existing_tickers:
            new_items.append({"ticker": symbol, "exchange": exchange})
            if len(new_items) >= symbols_needed:
                break

    if not new_items:
        print("No new symbols to add.")
        client.close()
        return

    # Update the watchlist
    updated_list = current_list + new_items
    watchlists.update_one(
        {"_id": watchlist["_id"]},
        {"$set": {"List": updated_list}}
    )
    print(f"Added {len(new_items)} new symbols to the watchlist. Total now: {len(updated_list)}")
    client.close()

# Example usage:
# update_all_portfolios_for_user("LarryDarko")
#add_symbols_to_watchlist()
