const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const call = await prisma.callLog.findUnique({
    where: {
      id: "cmpm8vw2e0009tz406ohf0ioi"
    }
  });
  console.log("Call Log:", JSON.stringify(call, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
