# Refunds Collection

**Purpose**: Discontinued/testing collection for tracking refund requests from when the project planned to become a commercial service. Stores automatic refund requests submitted by users within the 14-day window.

## Structure

- `_id`: ObjectId
- `Username`: String - User requesting refund
- `UserID`: ObjectId - Reference to user document
- `Amount`: Number - Refund amount (in cents)
- `PurchaseDate`: Date - Original purchase/receipt date
- `RequestDate`: Date - When refund was requested
- `MaxRefundDate`: Date - Latest date eligible for refund (14 days after purchase)
- `StaffDeadlineDate`: Date - Deadline for staff to process (5 business days after request)
- `PaymentIntentId`: String - Stripe payment intent identifier
- `Status`: String - Refund status: "pending", "approved", "rejected", or "refunded"
- `StaffNotes`: String - Internal notes from staff review
- `ProcessedDate`: Date or null - When refund was processed by staff

**Note**: Business day calculation skips weekends (Saturday/Sunday) for `StaffDeadlineDate`. User access is immediately revoked upon request submission.

## Example Document

[Refunds.example.json](./sample-data/Refunds.example.json)
