"""
Signal Analyzer Module for Technical Trading Signals
Generates buy/sell signals based on classic technical indicators:
- RSI (Relative Strength Index)
- MACD (Moving Average Convergence Divergence)
- Moving Average Crossovers (50/200 day)
- Volume Spike Detection
"""

import asyncio
import logging
import time
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from pymongo import UpdateOne
from pymongo.errors import BulkWriteError

logger = logging.getLogger("signal_analyzer")
logger.setLevel(logging.INFO)


class SignalAnalyzer:
    """Analyzes technical indicators and generates trading signals"""
    
    def __init__(self, db):
        self.db = db
        self.asset_info = db['AssetInfo']
        
    def calculate_rsi(self, prices: pd.Series, period: int = 14) -> pd.Series:
        """Calculate Relative Strength Index"""
        if len(prices) < period + 1:
            return pd.Series([None] * len(prices))
        
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi
    
    def calculate_macd(self, prices: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> Dict:
        """Calculate MACD, Signal Line, and Histogram"""
        if len(prices) < slow:
            return {'macd': None, 'signal': None, 'histogram': None}
        
        exp1 = prices.ewm(span=fast, adjust=False).mean()
        exp2 = prices.ewm(span=slow, adjust=False).mean()
        macd = exp1 - exp2
        signal_line = macd.ewm(span=signal, adjust=False).mean()
        histogram = macd - signal_line
        
        return {
            'macd': macd.iloc[-1] if len(macd) > 0 else None,
            'signal': signal_line.iloc[-1] if len(signal_line) > 0 else None,
            'histogram': histogram.iloc[-1] if len(histogram) > 0 else None,
            'macd_series': macd,
            'signal_series': signal_line
        }
    
    def calculate_moving_averages(self, prices: pd.Series) -> Dict:
        """Calculate 50-day and 200-day moving averages"""
        ma50 = prices.rolling(window=50).mean()
        ma200 = prices.rolling(window=200).mean()
        
        return {
            'ma50': ma50.iloc[-1] if len(ma50) > 0 else None,
            'ma200': ma200.iloc[-1] if len(ma200) > 0 else None,
            'ma50_series': ma50,
            'ma200_series': ma200
        }
    
    def detect_volume_spike(self, volumes: pd.Series, threshold: float = 2.0) -> bool:
        """Detect if today's volume is significantly higher than average"""
        if len(volumes) < 20:
            return False
        
        avg_volume = volumes.iloc[:-1].tail(20).mean()
        current_volume = volumes.iloc[-1]
        
        return current_volume > (avg_volume * threshold)
    
    def generate_signals(self, symbol: str, ohlcv_data: pd.DataFrame, current_price: float) -> List[Dict]:
        """
        Generate trading signals based on technical indicators
        Returns list of signal dictionaries
        """
        signals = []
        today = datetime.now().strftime('%Y-%m-%d')
        
        if len(ohlcv_data) < 200:
            logger.debug(f"{symbol}: Insufficient data for analysis (need 200 days, have {len(ohlcv_data)})")
            return signals
        
        # Ensure data is sorted by date
        ohlcv_data = ohlcv_data.sort_values('date')
        closes = ohlcv_data['close']
        volumes = ohlcv_data['volume']
        
        # Calculate indicators
        rsi = self.calculate_rsi(closes)
        macd_data = self.calculate_macd(closes)
        ma_data = self.calculate_moving_averages(closes)
        volume_spike = self.detect_volume_spike(volumes)
        
        current_rsi = rsi.iloc[-1] if not rsi.isna().all() else None
        
        # RSI Signals
        if current_rsi is not None:
            if current_rsi < 30:
                signals.append({
                    'date': today,
                    'type': 'BUY',
                    'strategy': 'RSI_Oversold',
                    'indicator_value': round(float(current_rsi), 2),
                    'price': current_price,
                    'description': f'RSI at {round(float(current_rsi), 2)} (oversold < 30)'
                })
            elif current_rsi > 70:
                signals.append({
                    'date': today,
                    'type': 'SELL',
                    'strategy': 'RSI_Overbought',
                    'indicator_value': round(float(current_rsi), 2),
                    'price': current_price,
                    'description': f'RSI at {round(float(current_rsi), 2)} (overbought > 70)'
                })
        
        # MACD Signals (Crossover)
        if macd_data['macd'] is not None and macd_data['signal'] is not None:
            macd_series = macd_data['macd_series']
            signal_series = macd_data['signal_series']
            
            if len(macd_series) >= 2 and len(signal_series) >= 2:
                # Check for crossover in last 2 days
                prev_macd = macd_series.iloc[-2]
                prev_signal = signal_series.iloc[-2]
                curr_macd = macd_series.iloc[-1]
                curr_signal = signal_series.iloc[-1]
                
                # Bullish crossover: MACD crosses above signal
                if prev_macd <= prev_signal and curr_macd > curr_signal:
                    signals.append({
                        'date': today,
                        'type': 'BUY',
                        'strategy': 'MACD_Bullish_Cross',
                        'indicator_value': round(float(curr_macd - curr_signal), 4),
                        'price': current_price,
                        'description': f'MACD crossed above signal line'
                    })
                # Bearish crossover: MACD crosses below signal
                elif prev_macd >= prev_signal and curr_macd < curr_signal:
                    signals.append({
                        'date': today,
                        'type': 'SELL',
                        'strategy': 'MACD_Bearish_Cross',
                        'indicator_value': round(float(curr_macd - curr_signal), 4),
                        'price': current_price,
                        'description': f'MACD crossed below signal line'
                    })
        
        # Moving Average Crossover (Golden Cross / Death Cross)
        if ma_data['ma50'] is not None and ma_data['ma200'] is not None:
            ma50_series = ma_data['ma50_series']
            ma200_series = ma_data['ma200_series']
            
            if len(ma50_series) >= 2 and len(ma200_series) >= 2:
                prev_ma50 = ma50_series.iloc[-2]
                prev_ma200 = ma200_series.iloc[-2]
                curr_ma50 = ma50_series.iloc[-1]
                curr_ma200 = ma200_series.iloc[-1]
                
                # Golden Cross: 50-day MA crosses above 200-day MA
                if prev_ma50 <= prev_ma200 and curr_ma50 > curr_ma200:
                    signals.append({
                        'date': today,
                        'type': 'BUY',
                        'strategy': 'Golden_Cross',
                        'indicator_value': round(float(curr_ma50 - curr_ma200), 2),
                        'price': current_price,
                        'description': f'50-day MA crossed above 200-day MA'
                    })
                # Death Cross: 50-day MA crosses below 200-day MA
                elif prev_ma50 >= prev_ma200 and curr_ma50 < curr_ma200:
                    signals.append({
                        'date': today,
                        'type': 'SELL',
                        'strategy': 'Death_Cross',
                        'indicator_value': round(float(curr_ma50 - curr_ma200), 2),
                        'price': current_price,
                        'description': f'50-day MA crossed below 200-day MA'
                    })
        
        # Volume Spike with Price Movement
        if volume_spike and len(closes) >= 2:
            price_change_pct = ((closes.iloc[-1] - closes.iloc[-2]) / closes.iloc[-2]) * 100
            
            if price_change_pct > 3:  # Price up more than 3% with volume spike
                signals.append({
                    'date': today,
                    'type': 'BUY',
                    'strategy': 'Volume_Breakout',
                    'indicator_value': round(float(price_change_pct), 2),
                    'price': current_price,
                    'description': f'Volume spike with +{round(float(price_change_pct), 2)}% price movement'
                })
            elif price_change_pct < -3:  # Price down more than 3% with volume spike
                signals.append({
                    'date': today,
                    'type': 'SELL',
                    'strategy': 'Volume_Breakdown',
                    'indicator_value': round(float(price_change_pct), 2),
                    'price': current_price,
                    'description': f'Volume spike with {round(float(price_change_pct), 2)}% price drop'
                })
        
        return signals
    
    async def fetch_ohlcv_data(self, symbol: str, days: int = 200) -> Optional[pd.DataFrame]:
        """Fetch OHLCV data for a symbol from the database"""
        try:
            # Fetch daily candles from the OHCLVData collection
            ohlcv_collection = self.db['OHCLVData']
            
            # Get last 200+ days of data
            cursor = ohlcv_collection.find(
                {'tickerID': symbol},
                {'_id': 0, 'timestamp': 1, 'open': 1, 'high': 1, 'low': 1, 'close': 1, 'volume': 1}
            ).sort('timestamp', -1).limit(days + 20)  # Get extra in case of gaps
            
            data = await cursor.to_list(length=days + 20)
            
            if not data or len(data) < 50:
                return None
            
            df = pd.DataFrame(data)
            
            # Rename timestamp to date for consistency in processing
            if 'timestamp' in df.columns:
                df['date'] = pd.to_datetime(df['timestamp'])
                df = df.drop('timestamp', axis=1)
            
            # Sort by date ascending
            df = df.sort_values('date').reset_index(drop=True)
            
            return df
            
        except Exception as e:
            logger.error(f"Error fetching OHLCV data for {symbol}: {e}")
            return None
    
    async def analyze_symbol(self, symbol: str, current_price: Optional[float] = None) -> List[Dict]:
        """
        Analyze a single symbol and generate signals
        """
        try:
            # Fetch OHLCV data
            ohlcv_data = await self.fetch_ohlcv_data(symbol)
            
            if ohlcv_data is None or len(ohlcv_data) < 50:
                return []
            
            # Use latest close price if current_price not provided
            if current_price is None:
                current_price = float(ohlcv_data.iloc[-1]['close'])
            
            # Generate signals
            signals = self.generate_signals(symbol, ohlcv_data, current_price)
            
            return signals
            
        except Exception as e:
            logger.error(f"Error analyzing {symbol}: {e}")
            return []
    
    async def update_signals_for_symbols(self, symbols: List[str], batch_size: int = 100):
        """
        Analyze multiple symbols and update their signals in AssetInfo collection
        Processes in batches for efficiency
        """
        total = len(symbols)
        processed = 0
        updated = 0
        with_signals = 0
        
        logger.info(f"Starting signal analysis for {total} symbols...")
        start_time = time.time()
        
        for i in range(0, total, batch_size):
            batch = symbols[i:i + batch_size]
            batch_updates = []
            
            # Process batch concurrently
            tasks = [self.analyze_symbol(symbol) for symbol in batch]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for symbol, signals in zip(batch, results):
                processed += 1
                
                if isinstance(signals, Exception):
                    logger.error(f"Exception analyzing {symbol}: {signals}")
                    continue
                
                # Only update if we have signals for today
                today = datetime.now().strftime('%Y-%m-%d')
                today_signals = [s for s in signals if s.get('date') == today]
                
                # Always update the Signals field (empty array if no signals)
                batch_updates.append(
                    UpdateOne(
                        {'Symbol': symbol},
                        {'$set': {'Signals': today_signals}}
                    )
                )
                
                if today_signals:
                    with_signals += 1
                    signal_types = [s['strategy'] for s in today_signals]
                    logger.debug(f"{symbol}: Found {len(today_signals)} signals - {', '.join(signal_types)}")
            
            # Execute batch update
            if batch_updates:
                try:
                    result = await self.asset_info.bulk_write(batch_updates, ordered=False)
                    updated += result.modified_count
                    if result.matched_count != len(batch_updates):
                        logger.warning(f"Batch: {result.matched_count}/{len(batch_updates)} documents matched")
                except BulkWriteError as e:
                    logger.error(f"Bulk write error: {e.details}")
                    updated += len(batch_updates) - len(e.details.get('writeErrors', []))
                except Exception as e:
                    logger.error(f"Unexpected error in bulk write: {e}")
            
            # Progress update
            elapsed = time.time() - start_time
            rate = processed / elapsed if elapsed > 0 else 0
            eta = (total - processed) / rate if rate > 0 else 0
            
            logger.info(
                f"Progress: {processed}/{total} ({(processed/total)*100:.1f}%) | "
                f"With Signals: {with_signals} | "
                f"Rate: {rate:.1f} symbols/sec | "
                f"ETA: {eta/60:.1f} min"
            )
        
        elapsed_time = time.time() - start_time
        logger.info(
            f"✓ Signal analysis complete: {processed} symbols processed, "
            f"{with_signals} with signals, {updated} documents updated "
            f"in {elapsed_time/60:.2f} minutes"
        )
        
        return {
            'processed': processed,
            'with_signals': with_signals,
            'updated': updated,
            'elapsed_time': elapsed_time
        }
    
    async def analyze_all_active_symbols(self):
        """
        Analyze all non-delisted symbols and update their signals
        Main entry point for daily signal generation
        """
        try:
            # Get all active (non-delisted) symbols with specific asset types
            cursor = self.asset_info.find(
                {
                    'Delisted': {'$ne': True},
                    'AssetType': {'$in': ['Stock', 'ETF', 'Crypto']}
                },
                {'Symbol': 1, '_id': 0}
            )
            
            symbols = [doc['Symbol'] async for doc in cursor]
            
            if not symbols:
                logger.warning("No active symbols found in database")
                return
            
            logger.info(f"Found {len(symbols)} active symbols to analyze")
            
            # Update signals for all symbols
            result = await self.update_signals_for_symbols(symbols, batch_size=100)
            
            return result
            
        except Exception as e:
            logger.error(f"Error in analyze_all_active_symbols: {e}")
            raise


async def run_signal_analysis(db):
    """
    Main function to run signal analysis
    To be called from Daily() function in organizer.py
    """
    analyzer = SignalAnalyzer(db)
    result = await analyzer.analyze_all_active_symbols()
    return result


# For standalone testing
if __name__ == '__main__':
    import motor.motor_asyncio
    import os
    from dotenv import load_dotenv
    import sys
    
    # Setup logging to console
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    load_dotenv()
    mongo_uri = os.getenv('MONGODB_URI')
    
    if not mongo_uri:
        print("ERROR: MONGODB_URI not found in environment variables")
        sys.exit(1)
    
    print("=" * 80)
    print("TRADING SIGNAL ANALYZER - FULL RUN")
    print("=" * 80)
    print(f"MongoDB URI: {mongo_uri[:30]}...")
    print(f"Database: EreunaDB")
    print(f"Target: Stock, ETF, Crypto (non-delisted)")
    print("=" * 80)
    print()
    
    client = motor.motor_asyncio.AsyncIOMotorClient(
        mongo_uri,
        serverSelectionTimeoutMS=30000
    )
    db = client['EreunaDB']
    
    async def run_full_analysis():
        try:
            # Test connection first
            print("Testing database connection...")
            await db.command('ping')
            print("✓ Database connected successfully\n")
            
            # Run full analysis
            print("Starting full signal analysis for all eligible symbols...")
            print("-" * 80)
            result = await run_signal_analysis(db)
            
            # Print summary
            print("\n" + "=" * 80)
            print("ANALYSIS COMPLETE - SUMMARY")
            print("=" * 80)
            print(f"Symbols Processed: {result['processed']}")
            print(f"Symbols with Signals: {result['with_signals']}")
            print(f"Documents Updated: {result['updated']}")
            print(f"Total Time: {result['elapsed_time']/60:.2f} minutes")
            print(f"Average Rate: {result['processed']/result['elapsed_time']:.2f} symbols/sec")
            print("=" * 80)
            
            # Close connection
            client.close()
            print("\n✓ Database connection closed")
            
        except Exception as e:
            print(f"\n✗ ERROR: {e}")
            import traceback
            traceback.print_exc()
            client.close()
            sys.exit(1)
    
    asyncio.run(run_full_analysis())
