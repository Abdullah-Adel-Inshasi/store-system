import express, { type Request, type Response } from "express";
import { pool } from "./db.ts";

const app = express();
app.use(express.json());

app.get("/health", async (req: Request, res: Response) => {
  const result = await pool.query("SELECT now()");
  res.json({ db_time: result.rows[0] });
});

app.post("/api/sales", async (req: Request, res: Response) => {
  const { product_id, quantity } = req.body;

  // validate user input
  if (!product_id || !Number.isInteger(quantity) || quantity < 0) {
    res.status(400).json({ error: "Invalid product_id or quantity" });
  }

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
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
