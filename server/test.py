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

# Example usage:
# update_all_portfolios_for_user("LarryDarko")

update_all_portfolios_for_user("LarryDarko")