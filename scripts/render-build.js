// scripts/render-build.js
// Automated build and migration handler for Render deployment

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("\n====================================================");
console.log("  AURALIS RENDER BUILD & DEPLOYMENT SCRIPT");
console.log("====================================================\n");

const dbUrl = process.env.DATABASE_URL || "";

// 1. Detect Database Provider
if (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://")) {
  console.log("[Render Build] PostgreSQL detected in DATABASE_URL.");
  console.log("[Render Build] Applying PostgreSQL schema (prisma/schema.postgresql.prisma)...");
  
  const postgresSchema = fs.readFileSync(
    path.join(__dirname, "..", "prisma", "schema.postgresql.prisma"),
    "utf-8"
  );
  fs.writeFileSync(
    path.join(__dirname, "..", "prisma", "schema.prisma"),
    postgresSchema,
    "utf-8"
  );
} else {
  console.log("[Render Build] No external PostgreSQL found; using default schema.");
}

// 2. Generate Prisma Client
console.log("[Render Build] Generating Prisma Client...");
try {
  execSync("npx prisma generate", { stdio: "inherit" });
} catch (err) {
  console.error("[Render Build] Failed to generate Prisma client:", err.message);
  process.exit(1);
}

// 3. Push Database Schema if DATABASE_URL is provided
if (dbUrl && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"))) {
  console.log("[Render Build] Synchronizing database tables with PostgreSQL...");
  try {
    execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });
    console.log("[Render Build] Database tables synchronized successfully.");
  } catch (err) {
    console.warn("[Render Build] Warning during prisma db push:", err.message);
  }
}

// 4. Build Next.js Production Bundle
console.log("\n[Render Build] Compiling Next.js production build...");
try {
  execSync("npx next build", { stdio: "inherit" });
} catch (err) {
  console.error("[Render Build] Next.js build failed:", err.message);
  process.exit(1);
}

console.log("\n====================================================");
console.log("  AURALIS BUILD COMPLETED SUCCESSFULLY FOR RENDER!");
console.log("====================================================\n");
