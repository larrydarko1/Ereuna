# News Collection

**Purpose**: Stores news articles related to stocks and financial markets. Data sourced from Tiingo News endpoint.

## Structure

- `_id`: ObjectId
- `publishedDate`: Date - Article publication timestamp
- `title`: String - Article headline
- `url`: String - Full URL to the article
- `description`: String - Article excerpt or summary
- `source`: String - News source domain (e.g., "gurufocus.com")
- `tickers`: Array[String] - Stock symbols mentioned in the article

## Example Document

[News.example.json](./sample-data/News.example.json)
