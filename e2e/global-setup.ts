import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { E2E } from "../playwright.config";

const ACCOUNTS = {
  member: "alex@example.com",
  provider: "maya@example.com",
};

/**
 * Resets the e2e database with the seed data, then signs in once per role through the API and
 * saves the result as browser storage, so most tests can start already signed in.
 */
export default async function globalSetup() {
  execFileSync("node", ["server/scripts/seed.js"], {
    stdio: "ignore",
    env: { ...process.env, MONGO_URI: E2E.mongo, JWT_SECRET: "e2e-secret" },
  });

  fs.mkdirSync("e2e/.auth", { recursive: true });
  for (const [role, email] of Object.entries(ACCOUNTS)) {
    const res = await fetch(`${E2E.api}/api/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "password123" }),
    });
    if (!res.ok) throw new Error(`Could not sign in ${email} for the e2e setup: ${res.status}`);
    const { token } = (await res.json()) as { token: string };
    fs.writeFileSync(
      path.join("e2e/.auth", `${role}.json`),
      JSON.stringify({ cookies: [], origins: [{ origin: E2E.web, localStorage: [{ name: "token", value: token }] }] })
    );
  }
}
