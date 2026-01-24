# 🧠 Business Management System — Service Interaction Map

This document defines **how services talk to each other** and which module owns which business responsibility.

> Rule: Controllers never coordinate multi-step logic.  
> Only services orchestrate services.

---

# 🏗️ Core Services

## InventoryService

**Owns:** stock levels, valuation, stock movements

- increaseStock(itemId, qty, cost)
- decreaseStock(itemId, qty)
- getStockValue()
- getLowStock()

Never handles money. Never handles debts.

---

## CashService

**Owns:** cashbox, bank, transfers, balances

- cashIn(amount, source, refId)
- cashOut(amount, reason, refId)
- transfer(amount, fromAccount, toAccount)
- getBalances()

Never decides _why_ money moved — only records _that_ it moved.

---

## DebtService

**Owns:** who owes who, how much, and why

- createDebt(partyType, partyId, amount, source, refId)
- reduceDebt(debtId, amount)
- getReceivables()
- getPayables()

No inventory. No direct cash handling.

---

## PaymentService

**Owns:** settling obligations

- paySupplier()
- collectFromCustomer()
- payWorker()

Always coordinates:
→ CashService  
→ DebtService  
(sometimes WorkersService)

---

## PurchaseService

**Owns:** buying wood/products

Coordinates:
→ InventoryService  
→ DebtService  
→ CashService

Never edits cash or stock directly.

---

## SaleService

**Owns:** selling wood/products

Coordinates:
→ InventoryService  
→ DebtService  
→ CashService

---

## WorkerService

**Owns:** workers and daily wages

- createWorker()
- assignDailyWork()
- calculateWages()

No money leaves here.

---

## ReportService

**Owns:** business insight

Reads from:
→ InventoryService  
→ CashService  
→ DebtService  
→ SalesService  
→ PurchaseService

Never writes. Ever.

---

# 🔄 Transaction Flows

## 1. Purchase (Cash)

Supplier sells you wood. You pay immediately.

PurchaseService
→ InventoryService.increaseStock()
→ CashService.cashOut()

(No debt created)

---

## 2. Purchase (Credit)

Supplier sells you wood. You pay later.

PurchaseService
→ InventoryService.increaseStock()
→ DebtService.createDebt(type="supplier")
→ (optional) CashService.cashOut() if partial

---

## 3. Sale (Cash)

Customer buys wood. Pays immediately.

SaleService
→ InventoryService.decreaseStock()
→ CashService.cashIn()

---

## 4. Sale (Credit)

Customer buys wood. Pays later.

SaleService
→ InventoryService.decreaseStock()
→ DebtService.createDebt(type="customer")
→ (optional) CashService.cashIn() if partial

---

## 5. Collect debt from customer

PaymentService.collectFromCustomer()

→ CashService.cashIn()
→ DebtService.reduceDebt()

---

## 6. Pay supplier

PaymentService.paySupplier()

→ CashService.cashOut()
→ DebtService.reduceDebt()

---

## 7. Pay worker daily wage

PaymentService.payWorker()

→ CashService.cashOut()
→ WorkersService.markPaid()

(No debt unless delayed)

---

## 8. Transfer cash to bank

CashService.transfer()

Cash only. No other services involved.

---

# 🧩 Authority Map (who is allowed to do what)

| Action                | Allowed Service  |
| --------------------- | ---------------- |
| Create stock movement | InventoryService |
| Create cash movement  | CashService      |
| Create debt           | DebtService      |
| Business transactions | Sale / Purchase  |
| Settling obligations  | PaymentService   |
| Business insight      | ReportService    |

---

# 🧱 Hard architectural rules

- InventoryService ❌ cannot call CashService
- CashService ❌ cannot call DebtService
- DebtService ❌ cannot call InventoryService
- Only these may orchestrate multiple services:
  - PurchaseService
  - SaleService
  - PaymentService
  - ReportService (read-only)

---

# 🧠 Mental model

Sales & Purchases = events  
Inventory, Cash, Debt = ledgers  
Payments = settlement engine  
Reports = business intelligence

---

# 🏁 End goal

This structure guarantees:

- clean accounting
- audit-friendly flows
- no circular logic
- easy future expansion (tax, branches, multi-currency)

If this map is respected, the system can scale without rewrite.
