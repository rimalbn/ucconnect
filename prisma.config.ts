import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Only include datasource when URL is available (not needed for prisma generate)
  ...(process.env.DATABASE_URL && {
    datasource: {
      url: process.env.DATABASE_URL,
      directUrl: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  }),
});
