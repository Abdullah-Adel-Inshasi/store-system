import express from "express";
import { getSalesController, sellCashController } from "./modules/sales/sales.controller";
import { purchaseItemController } from "./modules/purchases/purchase.controller";
import { createAccountController } from "./modules/cash/cash.controller";
import { createItem, getItems } from "./modules/inventory/inventory.controller";

const app = express();
app.use(express.json());
const router = app.router;


app.get('/items',getItems)
app.post('/items',createItem)
app.post("/items/:itemId/sell", sellCashController);
app.post("/items/:itemId/buy", purchaseItemController);
app.post("/accounts",createAccountController)
app.get("/sales",getSalesController)
app.get('/purchases')
app.get('/accounts/balances')
app.get('/inventory/balances')

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
