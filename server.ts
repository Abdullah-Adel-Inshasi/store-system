import express, { type Request, type Response } from "express";
import { pool } from "./db.ts";

const app = express();
app.use(express.json());

app.get("/health", async (req: Request, res: Response) => {
  const result = await pool.query("SELECT now()");
  res.json({ db_time: result.rows[0] });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
