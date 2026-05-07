// Seeds the two admin users with strong random passwords.
// Idempotent — re-running won't duplicate users; it will reset their passwords if --reset is passed.
//
// Usage:
//   npm run db:seed-admins          (creates users if missing, prints existing if not)
//   npm run db:seed-admins -- --reset   (force-resets passwords for all listed admins)

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const prisma = new PrismaClient();

const ADMINS = [
  { email: "jissojose@gmail.com", name: "Jisso Jose" },
  { email: "nanzwilly@gmail.com", name: "Nanz Willy" },
];

// 16 chars: upper/lower/digits — easy to type but strong enough as a temporary password.
function genPassword(len = 16) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

async function main() {
  const reset = process.argv.includes("--reset");
  const printed = [];

  for (const a of ADMINS) {
    const existing = await prisma.user.findUnique({ where: { email: a.email } });

    if (existing && !reset) {
      printed.push({ email: a.email, status: "already exists (password unchanged)" });
      continue;
    }

    const password = genPassword();
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.upsert({
      where: { email: a.email },
      update: { passwordHash, role: "ADMIN", isActive: true, name: a.name },
      create: { email: a.email, name: a.name, passwordHash, role: "ADMIN", isActive: true },
    });

    printed.push({ email: a.email, status: existing ? "password reset" : "created", password });
  }

  console.log("\n=== Admin users ===\n");
  for (const p of printed) {
    console.log(`  ${p.email}`);
    console.log(`    status:   ${p.status}`);
    if (p.password) console.log(`    password: ${p.password}`);
    console.log();
  }
  console.log("Sign in at:  http://localhost:3000/admin/login\n");
  console.log("Save these passwords now — they are not stored anywhere else and cannot be recovered.");
  console.log("Each user can change their password later (once we ship the user-settings page).");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
