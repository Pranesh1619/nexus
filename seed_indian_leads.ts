import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Connecting to Database...");

  // Get first user (or first sales agent) to attach the call logs to
  let user = await prisma.user.findFirst({
    where: { role: "SALES" }
  });

  if (!user) {
    user = await prisma.user.findFirst();
  }

  if (!user) {
    console.log("Error: No users found in database to attach call logs to!");
    return;
  }

  console.log(`Using user: ${user.name} (${user.email}) to attach calls`);

  const indianLeads = [
    {
      name: "Aarav Mehta",
      phone: "+91 98765 43210",
      email: "aarav.mehta@reliance.com",
      company: "Reliance Digital Ltd",
      source: "WEBSITE",
      status: "QUALIFIED"
    },
    {
      name: "Priya Sharma",
      phone: "+91 87654 32109",
      email: "priya.sharma@tcs.com",
      company: "Tata Consultancy Services",
      source: "REFERRAL",
      status: "QUALIFIED"
    },
    {
      name: "Rohan Das",
      phone: "+91 76543 21098",
      email: "rohan.das@infosys.com",
      company: "Infosys Tech",
      source: "COLD_CALL",
      status: "CONTACTED"
    }
  ];

  const callNotes = [
    {
      status: "CONNECTED",
      stage: "Qualified",
      duration: 340,
      aiScore: 88,
      notes: "Aarav was very impressed by our AI caller demo. Budget of 5 Lakhs INR is approved. Requested pricing brochure.",
      transcript: "Agent: Namaste, Aarav. This is Virpa CRM. Aarav: Hi, I've heard wonderful things. Yes, we need to automate our sales floor."
    },
    {
      status: "CONNECTED",
      stage: "Interested",
      duration: 180,
      aiScore: 75,
      notes: "Priya requested a personalized demo session with her operations team next Thursday. Highly potential lead.",
      transcript: "Agent: Hello Priya, hope you are doing well. Priya: Hi, yes. I am interested in how the automated call logging is done."
    },
    {
      status: "CONNECTED",
      stage: "Attempted Contact",
      duration: 240,
      aiScore: 65,
      notes: "Rohan answered during a busy slot, but mentioned he is interested in reducing call-handling latency. Follow up next Monday.",
      transcript: "Agent: Hello Rohan. Rohan: Hi, I am in a meeting, but yes we do have a BPO floor and would love to optimize it."
    }
  ];

  for (let i = 0; i < indianLeads.length; i++) {
    const leadData = indianLeads[i];
    const callData = callNotes[i];

    // Create lead
    const createdLead = await prisma.lead.upsert({
      where: { phone: leadData.phone },
      update: {},
      create: leadData
    });

    console.log(`Created/Ensured Lead: ${createdLead.name}`);

    // Create call log attached to this lead
    await prisma.callLog.create({
      data: {
        status: callData.status,
        stage: callData.stage,
        duration: callData.duration,
        aiScore: callData.aiScore,
        notes: callData.notes,
        transcript: callData.transcript,
        leadId: createdLead.id,
        userId: user.id
      }
    });

    console.log(`Created Call Log for lead: ${createdLead.name}`);
  }

  console.log("✅ Successfully seeded 3 beautiful Indian leads with 1 call log each!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
