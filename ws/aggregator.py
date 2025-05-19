from datetime import datetime

class Aggregator:
    def __init__(self, symbols):
        self.symbols = symbols
        self.data = {symbol: self._empty_ohlcv() for symbol in symbols}

    def _empty_ohlcv(self):
        return {
            "open": None,
            "high": None,
            "low": None,
            "close": None,
            "volume": 0,
            "date": datetime.utcnow().date().isoformat()
        }

    def process(self, msg):
        # Example assumes Tiingo trade message format
        if isinstance(msg, list):
            for item in msg:
                self._process_item(item)
        else:
            self._process_item(msg)

    def _process_item(self, item):
        symbol = item.get("data", {}).get("ticker")
        price = item.get("data", {}).get("last")
        volume = item.get("data", {}).get("lastSize", 0)
        if symbol not in self.data or price is None:
            return
        ohlcv = self.data[symbol]
        if ohlcv["open"] is None:
            ohlcv["open"] = price
        ohlcv["high"] = max(ohlcv["high"], price) if ohlcv["high"] else price
        ohlcv["low"] = min(ohlcv["low"], price) if ohlcv["low"] else price
        ohlcv["close"] = price
        ohlcv["volume"] += volume

    def get_eod_data(self):
        return self.data

    def reset(self):
        self.data = {symbol: self._empty_ohlcv() for symbol in self.symbols}
