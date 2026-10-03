# Diagrama entidad-relación

```mermaid
erDiagram
    Category {
        uuid id PK
        string name UK
        string description
        timestamp created_at
        timestamp updated_at
    }

    Supplier {
        uuid id PK
        string name
        string contact_name
        string email UK
        string phone
        timestamp created_at
        timestamp updated_at
    }

    Product {
        uuid id PK
        string name
        string description
        string reference UK
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
        string email UK
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

## Notas

- Valores de `role`: `ADMIN`, `OPERATOR`
- Valores de `type`: `IN`, `OUT`, `ADJUSTMENT`
- `reference` es opcional (puede ser nula) y única cuando tiene valor (dos productos no pueden compartirla)
- Todas las claves foráneas usan `RESTRICT` al borrar: no se puede borrar una categoría o un proveedor con productos asignados, ni un producto o un usuario con movimientos de stock
- `StockMovement` no tiene `updated_at`: los movimientos no se modifican una vez creados
