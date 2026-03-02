# SmartSplit – Settlement Optimization Algorithm Research

## 1. Problem Definition

In an expense sharing system, multiple users share expenses.

After multiple transactions, each user may either:
- Owe money (debtor)
- Be owed money (creditor)

The goal is to minimize the number of transactions required to settle all debts.

---

## 2. Net Balance Calculation

For each user:

Net Balance = Total Paid − Total Owed

If:
- Net Balance > 0 → User is a Creditor
- Net Balance < 0 → User is a Debtor
- Net Balance = 0 → Settled

---

## 3. Example Scenario

Users: A, B, C

Expenses:
- A paid $60 (split equally)
- B paid $30 (split equally)

Total per person = $30

Final balances:
- A paid 60, owes 30 → +30
- B paid 30, owes 30 → 0
- C paid 0, owes 30 → -30

Result:
C pays A $30

Only one transaction required.

---

## 4. Optimization Strategy

### Step 1: Separate users into two lists
- Debtors (negative balances)
- Creditors (positive balances)

### Step 2: Sort
- Sort debtors ascending (most negative first)
- Sort creditors descending (highest positive first)

### Step 3: Greedy Matching Algorithm

While both lists are not empty:

1. Take largest debtor
2. Take largest creditor
3. Settle the minimum of:
   min(abs(debtor_balance), creditor_balance)

4. Reduce balances
5. Remove settled users
6. Continue

---

## 5. Why This Works

This greedy strategy reduces:
- Number of transactions
- Complexity of settlement
- Circular payments

Time Complexity:
O(n log n) due to sorting

---

## 6. Future Implementation Plan

In backend:

1. Fetch all expenses in group
2. Calculate net balance per user
3. Build debtors & creditors arrays
4. Apply greedy matching
5. Return settlement plan as API response

---

## 7. Academic Value

This approach demonstrates:

- Algorithm design
- Financial data modeling
- Optimization logic
- Greedy strategy application
- Real-world system thinking