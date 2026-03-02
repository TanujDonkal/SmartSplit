# SmartSplit – System Architecture Research

## 1. Overview

SmartSplit is a full-stack expense sharing system similar to Splitwise.

The system allows:
- User registration & authentication
- Group creation
- Adding shared expenses
- Automatic balance calculation
- Optimized settlement suggestions

---

## 2. Core Entities

### User
Represents an individual account holder.

Fields:
- id
- name
- email
- password_hash
- created_at

---

### Group
Represents a shared expense group.

Fields:
- id
- name
- created_by
- created_at

---

### Group Members
Maps users to groups.

Fields:
- group_id
- user_id
- joined_at

---

### Expense
Represents a shared expense inside a group.

Fields:
- id
- group_id
- payer_id
- amount
- description
- created_at

---

### Expense Split
Defines how much each user owes for an expense.

Fields:
- expense_id
- user_id
- amount_owed

---

## 3. System Architecture Layers

### Frontend Layer (Client)
- React application
- Sends API requests to backend
- Displays balances & settlements

### Backend Layer (Server)
- Node.js + Express
- REST API architecture
- Handles authentication & business logic

### Database Layer
- PostgreSQL
- Relational structure
- Stores users, groups, expenses, splits

---

## 4. Data Flow

1. User logs in
2. User creates or joins group
3. User adds expense
4. Backend calculates net balances
5. Settlement optimization algorithm runs
6. System suggests minimal transactions

---

## 5. Settlement Logic Concept (High-Level)

The system calculates:

- Each user's total paid
- Each user's total owed
- Net balance = paid - owed

Users are divided into:
- Creditors (positive balance)
- Debtors (negative balance)

The system matches largest debtor with largest creditor to minimize number of transactions.

---

## 6. Scalability Considerations (Future)

- Indexing group_id for faster queries
- Separate service layer for financial logic
- Caching group balances
- Pagination for expense history