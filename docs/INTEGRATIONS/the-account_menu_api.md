# Menu API for External Integrations

This endpoint allows external systems (like NerdVi) to retrieve the restaurant menu using their API key.

## Endpoint

```
GET https://{tenant_slug}.theaccount.app/api/v2/phone-orders/menu
```

## Authentication

Include the API key in the request header:

```
X-API-Key: your-api-key-here
```

## Request

No request body or query parameters required.

### Example Request

```bash
curl -X GET "https://demo.theaccount.app/api/v2/phone-orders/menu" \
  -H "X-API-Key: your-api-key-here"
```

## Response

### Success Response (200 OK)

```json
{
  "venue_id": "507f1f77bcf86cd799439011",
  "categories": [
    {
      "name": "Appetizers",
      "items": [
        {
          "id": "507f1f77bcf86cd799439012",
          "name": "Chicken Wings",
          "description": "Crispy fried chicken wings with your choice of sauce",
          "price": 1299,
          "active": true,
          "allergens": ["gluten"]
        },
        {
          "id": "507f1f77bcf86cd799439013",
          "name": "Mozzarella Sticks",
          "description": "Golden fried mozzarella with marinara sauce",
          "price": 899,
          "active": true,
          "allergens": ["dairy", "gluten"]
        }
      ]
    },
    {
      "name": "Entrees",
      "items": [
        {
          "id": "507f1f77bcf86cd799439014",
          "name": "Grilled Salmon",
          "description": "Fresh Atlantic salmon with lemon butter sauce",
          "price": 2499,
          "active": true,
          "allergens": ["fish"]
        }
      ]
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `venue_id` | string | The venue's unique identifier |
| `categories` | array | List of menu categories |
| `categories[].name` | string | Category name |
| `categories[].items` | array | List of menu items in this category |
| `categories[].items[].id` | string | **Use this as `menu_item_id` when submitting orders** |
| `categories[].items[].name` | string | Item name |
| `categories[].items[].description` | string | Item description (optional) |
| `categories[].items[].price` | integer | Price in cents (e.g., 1299 = $12.99) |
| `categories[].items[].active` | boolean | Whether the item is currently available |
| `categories[].items[].allergens` | array | List of allergens (optional) |

### Error Responses

| Status | Description |
|--------|-------------|
| 401 Unauthorized | Missing or invalid API key |
| 500 Internal Server Error | Server error retrieving menu |

```json
{
  "error": "API key required"
}
```

```json
{
  "error": "invalid API key"
}
```

## Notes

- Only **active** categories and items are returned
- Inactive items are filtered out automatically
- Prices are in **cents** (divide by 100 for dollars)
- The `id` field should be used as `menu_item_id` when submitting orders via the webhook
- Cache this data appropriately - menu changes are not frequent

## Usage with Phone Orders

When submitting a phone order via the webhook, use the `id` from this response as the `menu_item_id`:

```json
{
  "external_order_id": "nerdvi-order-123",
  "external_agent_id": "agent-456",
  "customer_name": "John Doe",
  "customer_phone": "+1-555-123-4567",
  "items": [
    {
      "menu_item_id": "507f1f77bcf86cd799439012",
      "name": "Chicken Wings",
      "quantity": 2,
      "special_instructions": "Extra crispy"
    }
  ],
  "pickup_time": "18:30",
  "order_notes": "Please include extra napkins"
}
```
