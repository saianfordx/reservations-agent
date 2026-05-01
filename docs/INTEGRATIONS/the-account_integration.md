# NerdVi Integration Guide

Integration guide for connecting NerdVi voice AI system with The Account phone ordering system.

---

## Overview

NerdVi (voice AI) submits phone orders to The Account via webhook. The Account processes orders, manages a queue for staff approval, and sends status updates back to NerdVi.

```
┌─────────────┐         webhook          ┌─────────────┐
│   NerdVi    │ ──────────────────────── │ The Account │
│  (Voice AI) │                          │   (POS)     │
└─────────────┘                          └─────────────┘
       │                                        │
       │  1. Customer calls restaurant          │
       │  2. NerdVi takes order                 │
       │  3. NerdVi POSTs to webhook ──────────│
       │                                        │
       │                          4. Order queued/auto-accepted
       │                          5. Staff accepts/rejects
       │                                        │
       │  6. Status callback (future) ─────────│
       └────────────────────────────────────────┘
```

---

## Terminology Mapping

| NerdVi Term | The Account Term | Description |
|-------------|------------------|-------------|
| Organization | Tenant | Business entity (e.g., "Tacos El Rey Inc.") |
| Restaurant | Venue | Physical location (e.g., "Tacos El Rey - Downtown") |
| Order ID | External Order ID | NerdVi's order reference |
| Agent ID | External Agent ID | NerdVi's AI agent reference |

---

## Configuration Requirements

### What NerdVi Must Store Per Restaurant

When a restaurant connects NerdVi to The Account, store these values:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `tenant_slug` | string | Tenant subdomain for URL | `tacos-el-rey` |
| `api_key` | string | Authentication key (identifies venue) | `po_d7b878496f8f4578a26e48a0b9d5b818` |

**Note:** The `venue_id` is NOT needed in the URL. The API key is tied to a specific venue, so we automatically determine which venue the order belongs to.

### How to Get These Values

The restaurant admin configures these in The Account dashboard:

1. **Tenant Slug**: Already known when restaurant signed up (their subdomain)
2. **API Key**: Generated in Phone Orders settings page (`PUT /config` with `api_key` field)

---

## Webhook Endpoint

### URL Structure

```
POST https://{tenant_slug}.theaccount.app/api/v2/phone-orders/webhook
```

### Example

```
POST https://tacos-el-rey.theaccount.app/api/v2/phone-orders/webhook
```

### Authentication

Include API key in the `X-API-Key` header:

```http
POST /api/v2/phone-orders/webhook HTTP/1.1
Host: tacos-el-rey.theaccount.app
Content-Type: application/json
X-API-Key: po_d7b878496f8f4578a26e48a0b9d5b818
```

**How It Works:**
1. NerdVi sends request with `X-API-Key` header
2. The Account looks up the API key in the database
3. If valid, the venue ID is retrieved from the API key record
4. Order is processed for that venue

**Security Notes:**
- Each API key is tied to exactly one venue
- Invalid API keys are rejected with 401 Unauthorized
- Store API keys securely (encrypted at rest)

---

## Request Payload

### Schema

```json
{
  "external_order_id": "string (required)",
  "external_agent_id": "string (required)",
  "customer_name": "string (required)",
  "customer_phone": "string (required)",
  "items": [
    {
      "menu_item_id": "string (required)",
      "name": "string (required)",
      "quantity": "integer (required, min: 1)",
      "special_instructions": "string (optional)"
    }
  ],
  "order_notes": "string (optional)",
  "pickup_time": "string (required, HH:MM 24-hour)",
  "pickup_date": "string (optional, YYYY-MM-DD, defaults to today)",
  "call_id": "string (optional)",
  "conversation_transcript": "string (optional)"
}
```

### Field Details

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `external_order_id` | string | Yes | NerdVi's unique order ID (for deduplication and callbacks) |
| `external_agent_id` | string | Yes | NerdVi's agent ID that took the order |
| `customer_name` | string | Yes | Customer's name |
| `customer_phone` | string | Yes | Customer's phone number (E.164 format preferred) |
| `items` | array | Yes | Array of order items (min 1 item) |
| `items[].menu_item_id` | string | Yes | Menu item ID from The Account's menu system |
| `items[].name` | string | Yes | Item name (for display, fallback if ID lookup fails) |
| `items[].quantity` | integer | Yes | Quantity ordered (min: 1) |
| `items[].special_instructions` | string | No | Special requests for this item |
| `order_notes` | string | No | General order notes |
| `pickup_time` | string | Yes | Requested pickup time (24-hour format: "14:30") |
| `pickup_date` | string | No | Pickup date (YYYY-MM-DD). Defaults to today if not provided |
| `call_id` | string | No | NerdVi call/session ID (for troubleshooting) |
| `conversation_transcript` | string | No | Full conversation transcript (for review) |

### Example Request

```json
{
  "external_order_id": "nerdvi-ord-20240115-001",
  "external_agent_id": "agent-tacos-downtown-01",
  "customer_name": "John Doe",
  "customer_phone": "+15551234567",
  "items": [
    {
      "menu_item_id": "menu-item-001",
      "name": "Carne Asada Burrito",
      "quantity": 2,
      "special_instructions": "No onions"
    },
    {
      "menu_item_id": "menu-item-015",
      "name": "Chips and Guacamole",
      "quantity": 1
    }
  ],
  "order_notes": "Extra napkins please",
  "pickup_time": "18:30",
  "pickup_date": "2024-01-15",
  "call_id": "call-abc123",
  "conversation_transcript": "Agent: Welcome to Tacos El Rey...\nCustomer: Hi, I'd like to place an order..."
}
```

---

## Response

### Success Response (201 Created)

```json
{
  "id": "507f1f77bcf86cd799439012",
  "venue_id": "6851e9ce2bf67f621fd0bb01",
  "external_order_id": "nerdvi-ord-20240115-001",
  "external_agent_id": "agent-tacos-downtown-01",
  "customer_name": "John Doe",
  "customer_phone": "+15551234567",
  "items": [
    {
      "menu_item_id": "menu-item-001",
      "name": "Carne Asada Burrito",
      "quantity": 2,
      "unit_price": 1299,
      "subtotal": 2598,
      "special_instructions": "No onions"
    },
    {
      "menu_item_id": "menu-item-015",
      "name": "Chips and Guacamole",
      "quantity": 1,
      "unit_price": 599,
      "subtotal": 599
    }
  ],
  "order_total": 3197,
  "order_notes": "Extra napkins please",
  "pickup_time": "18:30",
  "pickup_date": "2024-01-15",
  "queue_status": "pending",
  "auto_accepted": false,
  "created_at": "2024-01-15T17:45:00Z"
}
```

**Important Notes:**
- `order_total`, `unit_price`, and `subtotal` are in **cents** (e.g., $12.99 = 1299)
- Prices are fetched from The Account's menu system based on `menu_item_id`
- `queue_status` can be `"pending"` (awaiting staff review) or `"accepted"` (auto-accepted)
- `auto_accepted` is `true` if order was below auto-accept threshold

### Error Responses

| Status | Meaning | Example |
|--------|---------|---------|
| 400 | Invalid request | `{"error": "invalid request body"}` |
| 401 | Missing API key | `{"error": "API key required"}` |
| 401 | Invalid API key | `{"error": "invalid API key"}` |
| 403 | Wrong venue | `{"error": "API key not authorized for this venue"}` |
| 500 | Server error | `{"error": "failed to process order"}` |

---

## Order Flow

### Initial Status

After webhook submission, orders are either:

1. **Auto-Accepted** (`queue_status: "accepted"`, `auto_accepted: true`)
   - Order total is at or below venue's auto-accept threshold
   - Immediately sent to kitchen

2. **Pending** (`queue_status: "pending"`, `auto_accepted: false`)
   - Order requires manual staff review
   - Appears in staff queue dashboard

### Status Transitions

```
                   auto-accept threshold
                         ↓
┌──────────────┐    (below)     ┌─────────────┐
│   Webhook    │ ───────────────│  ACCEPTED   │───→ Kitchen
│   Received   │                │(auto_accept)│
└──────┬───────┘                └─────────────┘
       │
       │ (above threshold)
       ↓
┌──────────────┐                ┌─────────────┐
│   PENDING    │─── staff ──────│  ACCEPTED   │───→ Kitchen
│  (in queue)  │    accept      │             │
└──────┬───────┘                └─────────────┘
       │
       │ staff reject
       ↓
┌──────────────┐
│   REJECTED   │
│              │
└──────────────┘
```

---

## Status Callbacks (Future)

> **Note:** Status callbacks from The Account to NerdVi are planned for a future release.

When implemented, NerdVi will receive callbacks when:
- Order is accepted (manual)
- Order is rejected (with reason)

NerdVi should expose a callback endpoint:
```
POST https://api.nerdvi.com/callbacks/order-status
```

---

## Menu Item Mapping

### Getting Menu Items

NerdVi needs the restaurant's menu to map voice orders to `menu_item_id` values.

**Option 1: Manual Configuration**
Restaurant provides menu export from The Account dashboard.

**Option 2: API Integration (Future)**
```
GET https://{tenant_slug}.theaccount.app/api/v1/venues/{venue_id}/menu
```

### Menu Item ID

The `menu_item_id` should match items in The Account's menu system:
- Used to fetch current prices
- Used to validate item availability
- If not found, order still processes using provided `name` and estimated price

---

## Implementation Checklist

### NerdVi Setup

- [ ] Store `tenant_slug` and `api_key` per restaurant
- [ ] Build webhook URL: `https://{tenant_slug}.theaccount.app/api/v2/phone-orders/webhook`
- [ ] Include `X-API-Key` header in all webhook requests
- [ ] Map voice order items to `menu_item_id` values
- [ ] Handle all response status codes
- [ ] Implement retry logic for 5xx errors (with exponential backoff)
- [ ] Log `id` from response for order tracking

### The Account Setup (Restaurant Admin)

- [ ] Enable phone orders in venue settings
- [ ] Generate API key for NerdVi
- [ ] Configure auto-accept threshold (or 0 for manual review only)
- [ ] Ensure menu items are up-to-date
- [ ] Train staff on phone order queue workflow

---

## Testing

### Test Webhook

```bash
curl -X POST \
  "https://{tenant_slug}.theaccount.app/api/v2/phone-orders/webhook" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: {api_key}" \
  -d '{
    "external_order_id": "test-001",
    "external_agent_id": "test-agent",
    "customer_name": "Test Customer",
    "customer_phone": "+15551234567",
    "items": [
      {
        "menu_item_id": "test-item",
        "name": "Test Item",
        "quantity": 1
      }
    ],
    "pickup_time": "12:00"
  }'
```

### Verify Order

Check that the order appears in The Account's phone order queue dashboard.

---

## Support

For integration support:
- Technical issues: Contact The Account engineering team
- Restaurant setup: Contact restaurant admin or The Account support

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01 | Initial release |
