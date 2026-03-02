# SmartSplit – Relational Database Schema Design

## 1. Overview

The database is designed using a relational model (PostgreSQL).

The schema supports:
- User authentication
- Group-based expense sharing
- Expense tracking
- Settlement calculation

---

# 2. Tables

---

## Users

| Field | Type | Constraints |
|-------|------|------------|
| id | UUID | Primary Key |
| name | VARCHAR(100) | NOT NULL |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password_hash | TEXT | NOT NULL |
| created_at | TIMESTAMP | DEFAULT NOW() |

---

## Groups

| Field | Type | Constraints |
|-------|------|------------|
| id | UUID | Primary Key |
| name | VARCHAR(100) | NOT NULL |
| created_by | UUID | FK → users(id) |
| created_at | TIMESTAMP | DEFAULT NOW() |

---

## Group Members

| Field | Type | Constraints |
|-------|------|------------|
| id | UUID | Primary Key |
| group_id | UUID | FK → groups(id) |
| user_id | UUID | FK → users(id) |
| joined_at | TIMESTAMP | DEFAULT NOW() |

Constraint:
- UNIQUE(group_id, user_id)

Purpose:
Prevents duplicate membership.

---

## Expenses

| Field | Type | Constraints |
|-------|------|------------|
| id | UUID | Primary Key |
| group_id | UUID | FK → groups(id) |
| payer_id | UUID | FK → users(id) |
| amount | DECIMAL(10,2) | NOT NULL |
| description | TEXT | |
| created_at | TIMESTAMP | DEFAULT NOW() |

---

## Expense Splits

| Field | Type | Constraints |
|-------|------|------------|
| id | UUID | Primary Key |
| expense_id | UUID | FK → expenses(id) |
| user_id | UUID | FK → users(id) |
| amount_owed | DECIMAL(10,2) | NOT NULL |

Purpose:
Defines how much each user owes for a specific expense.

---

# 3. Relationships Overview

Users ↔ Groups  
Many-to-Many (through Group Members)

Groups ↔ Expenses  
One-to-Many

Expenses ↔ Expense Splits  
One-to-Many

Users ↔ Expense Splits  
One-to-Many

---

# 4. Indexing Strategy (Future Optimization)

- Index on group_id in expenses
- Index on expense_id in expense_splits
- Index on user_id in group_members

This improves query performance when calculating balances.

---

# 5. Support for Settlement Algorithm

The schema supports:

1. Fetching all expenses by group
2. Summing total paid per user
3. Summing total owed per user
4. Calculating net balance
5. Generating optimized settlement plan

---

# 6. Academic Justification

This schema demonstrates:

- Relational database modeling
- Foreign key constraints
- Many-to-many relationships
- Financial data structuring
- Query optimization planning