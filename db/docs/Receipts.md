# Receipts Collection

**Purpose**: Discontinued/testing collection for payment receipts from when the project planned to become a commercial service. Not a professional standard.

## Structure

- `_id`: ObjectId
- `UserID`: ObjectId - Reference to user document
- `Amount`: Number - Payment amount (in cents)
- `Date`: Date - Receipt/payment timestamp
- `Method`: String - Payment method (e.g., "Credit Card")
- `Subscription`: Number - Subscription tier/level
- `PROMOCODE`: String - Promotional code used (or "None")
- `VAT`: Number - VAT rate (e.g., 0.18 = 18%)
- `Country`: String - Country code (ISO 2-letter)
- `PaymentIntentId`: String - Stripe payment intent identifier

## Example Document

[Receipts.example.json](./sample-data/Receipts.example.json)
