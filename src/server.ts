import express, { type Request, type Response } from "express";
import { pool } from "@/db/db.ts";
import {
  StockAdjustmentInput,
  stockAdjustmentSchema,
} from "@/schemas/stockAdjustments.schema.ts";
import { validate } from "@/middlewares/validate.ts";
import {
  salesSchema,
  SalesSchemaInput,
} from "@/modules/sales/sales.schema.ts";

const app = express();
app.use(express.json());

app.get("/health", async (req: Request, res: Response) => {
  const result = await pool.query("SELECT now()");
  res.json({ db_time: result.rows[0] });
});

app.post(
  "/api/sales",
  validate(salesSchema),
  async (req: Request<{}, {}, SalesSchemaInput>, res: Response) => {
    const { product_id, quantity } = req.body;

    // connect to db
    const client = await pool.connect();

    try {
      // start db transaction
      await client.query("BEGIN;");

      //check if product exists and check available quantity
      const productQuery = await client.query(
        "SELECT id, quantity, price FROM products WHERE id = $1",
        [product_id],
      );

      // no product where id = product_id
      if (productQuery.rowCount === 0) {
        await client.query("ROLLBACK;");
        return res.status(404).json({ error: "product not found" });
      }

      const currentStock = productQuery.rows[0].quantity;
      if (currentStock < quantity) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "Not enough stock" });
      }

      //insert sale
      const saleResult = await client.query(
        "INSERT INTO sales (product_id, quantity) VALUES($1,$2) RETURNING *",
        [product_id, quantity],
      );

      await client.query(
        "UPDATE products SET quantity = quantity - $1 WHERE id = $2",
        [quantity, product_id],
      );

      await client.query("COMMIT");

      return res.status(201).json({
        sale_id: saleResult.rows[0].id,
        product_id,
        quantity,
        sold_at: saleResult.rows[0].sold_at,
        unit_price: productQuery.rows[0].price,
        total: quantity * productQuery.rows[0].price,
      });
    } catch (e) {
      await client.query("ROLLBACK");
      console.error(e);

      return res.status(500).json({ error: "Server Error" });
    } finally {
      client.release();
    }
  },
);

app.post(
  "/api/stock-adjustments",
  validate(stockAdjustmentSchema),
  async (req: Request<{}, {}, StockAdjustmentInput>, res: Response) => {
    const { product_id, quantity_change, reason } = req.body;
    const client = await pool.connect();

    try {
      // 2) begin transaction
      await client.query("BEGIN");

      // 3) check if product exists
      const product = await client.query(
        "SELECT * from products WHERE id = $1",
        [product_id],
      );

      if (product.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Product doesn't exist" });
      }

      // 4) check if quantity won't go under 0
      if (product.rows[0].quantity + quantity_change < 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "Not enough stock" });
      }
      // 5) change quantity
      const updatedProduct = await client.query(
        "UPDATE products SET quantity = quantity + $1 WHERE id = $2 RETURNING *",
        [quantity_change, product_id],
      );
      // 6) create stock_adjustments row
      await client.query(
        "INSERT INTO stock_adjustments (product_id, quantity_change, reason) VALUES($1,$2,$3)",
        [product_id, quantity_change, reason],
      );
      // 7) commit changes
      await client.query("COMMIT");
      // 8) return success response
      return res.status(201).json(updatedProduct.rows[0]);
    } catch (err) {
      // 9) Rollback
      await client.query("ROLLBACK");
      // 10) return 500
      return res.status(500).json({ error: "error from server" });
    } finally {
      // 11) release client
      await client.release();
    }
  },
);

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
