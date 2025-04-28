v1.0.2
- renamed index names from index funds with proper index (but kept index fund data which closely resembles indexes)
- bug fixes: loader position on daily chart in screener, margin parameters are now divided by 100 as they should, autoplay button css class can be toggled now, alert for maximum screeners is now accessable, alert per note ora non ha più messaggio generico, Technical Score bug now includes 1 and 100 in parameters, non compare piu un div vuoto quando non ci sono piu watchlists o screeners, now combined list updates results dynamically when i include / exclude screeners.
- consolidated alerts on dashboard section
- max-height on dropdown menus in charts and screener now is shorter and overflow-y is handles by scroll.
- redesigned UI a bit
------
v1.0.1:
- fixed overflow of question mark tooltips on screener.
- added sector, industry, country, exchange, ADV inside screener tables 
- added visual cue error on screener when you don’t select a screener name a try to set a param
- fixed fastAPI bugs for data integrity
- added percentage with arrow on financial statements 
- fixed annoying table overlap css bug in screener
- added new screener parameters: Average Daily Volatility (ADV), PS ratio, Gap %, ROA, ROE, Current Ratio, Current Assets, Current Liabilities, Current Debt, Cash & Equivalents, Free Cash Flow, Profit Margin, Gross Margin, Debt to Equity ratio, Book Value, EV (enterprise value), RSI.
- inserted formulas to calculate RSI and Gap % internally 
- added question tooltips on financial statements in charts section


Ereuna Platform / Developed with 🤬 by Lorenzo Mazzola
https://github.com/larrydarko1