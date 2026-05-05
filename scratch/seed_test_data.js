const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find first user
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("No user found! Please register a user first.");
    return;
  }

  const dummyLeads = [
    {
      name: "Michael Scott",
      phone: "+1-570-555-0123",
      email: "m.scott@dundermifflin.com",
      company: "Dunder Mifflin",
      status: "QUALIFIED",
      source: "REFERRAL"
    },
    {
      name: "Pam Beesly",
      phone: "+1-570-555-0456",
      email: "pam@dundermifflin.com",
      company: "Dunder Mifflin",
      status: "CONTACTED",
      source: "WEBSITE"
    },
    {
      name: "Dwight Schrute",
      phone: "+1-570-555-0789",
      email: "dwight@schrutefarms.com",
      company: "Schrute Farms",
      status: "NEW",
      source: "COLD_CALL"
    }
  ];

  console.log("Creating dummy leads...");
  for (const leadData of dummyLeads) {
    const lead = await prisma.lead.upsert({
      where: { phone: leadData.phone },
      update: leadData,
      create: leadData,
    });

    // Create a call for each lead at different stages
    const stages = ["Interested", "Connected", "New Lead"];
    const stage = stages[dummyLeads.indexOf(leadData)];
    
    await prisma.callLog.create({
      data: {
        leadId: lead.id,
        userId: user.id,
        stage: stage,
        status: "CONNECTED",
        duration: 120 + Math.floor(Math.random() * 300),
        aiScore: 75 + Math.floor(Math.random() * 20),
        analysis: `AI Analysis for ${lead.name}: Strong interest in managed services. Recommended follow-up in 2 days.`,
      }
    });
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
