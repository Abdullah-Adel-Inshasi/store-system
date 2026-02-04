import "dotenv/config";
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: [
    "./db/schema.ts",
    "./src/database/scheme/*.schema.ts",
  ],
  out: "./src/database",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
