# Entity-Relationship Diagram

```mermaid
erDiagram
    Category {
        uuid id PK
        string name
        string description
        timestamp created_at
        timestamp updated_at
    }

    Supplier {
        uuid id PK
        string name
        string contact_name
        string email
        string phone
        timestamp created_at
        timestamp updated_at
    }

    Product {
        uuid id PK
        string name
        string description
        string reference
        decimal purchase_price
        decimal sale_price
        int current_stock
        int min_stock
        uuid category_id FK
        uuid supplier_id FK
        timestamp created_at
        timestamp updated_at
    }

    User {
        uuid id PK
        string name
        string email
        string password_hash
        string role
        timestamp created_at
        timestamp updated_at
    }

    StockMovement {
        uuid id PK
        uuid product_id FK
        string type
        int quantity
        string notes
        uuid user_id FK
        timestamp created_at
    }

    Category ||--o{ Product : "has"
    Supplier ||--o{ Product : "supplies"
    Product ||--o{ StockMovement : "has"
    User ||--o{ StockMovement : "registers"
```

## Notes

- `role` values: `admin`, `operator`
- `type` values: `IN`, `OUT`, `ADJUSTMENT`
- `reference` is optional (nullable)
- All FK relations use `RESTRICT` on delete — a category or supplier cannot be deleted if it has products assigned; a product or user cannot be deleted if it has stock movements
- `StockMovement` has no `updated_at` — movements are immutable
