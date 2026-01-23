# systemSettings Collection

**Purpose**: Controls application-wide settings and maintenance mode. Contains a single document for system configuration.

## Structure

- `_id`: ObjectId
- `maintenance`: Boolean - Whether maintenance mode is active
- `name`: String - Application name (fixed value: "EreunaApp")
- `lastUpdated`: Date - Last configuration change timestamp
- `type`: String - Maintenance type (dictates user-facing message)
  - Possible values: "regular" or "extraordinary"
  - Determines which maintenance message is displayed to users

## Example Document

[systemSettings.example.json](./sample-data/systemSettings.example.json)

## Notes

- This collection contains exactly **one document** for system-wide configuration
- When `maintenance: true`, users are shown a maintenance message based on the `type` field
- The `type` field allows for different maintenance scenarios with tailored user messaging
