import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  adminGrantLogLine,
  grantAdminByEmail,
  normalizeAdminEmail,
  prismaAdminGrantStore,
} from "../src/lib/admin-bootstrap";

async function main() {
  const email = normalizeAdminEmail(process.argv[2]);
  if (!email) {
    console.error("Usage: npm run admin:grant -- <email>");
    process.exitCode = 1;
    return;
  }

  const result = await grantAdminByEmail(prismaAdminGrantStore(prisma), email);
  console.log(adminGrantLogLine(result));
  if (result.status !== "granted" && result.status !== "already") {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
