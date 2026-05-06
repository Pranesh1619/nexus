import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Connecting to Supabase...");

  // First, get the first user and lead to attach the calls to
  const user = await prisma.user.findFirst();
  const lead = await prisma.lead.findFirst();

  if (!user || !lead) {
    console.log("Error: We need at least 1 User and 1 Lead in Supabase to attach calls to!");
    return;
  }

  console.log("Pushing sample call data to Supabase...");

  const mockCalls = [
    {
      status: "CONNECTED",
      stage: "Connected",
      duration: 345,
      aiScore: 85,
      notes: "Lead is very interested in the enterprise plan. Requested a follow-up email with pricing details.",
      transcript: "Agent: Hello, this is Nexus. Lead: Hi, I wanted to ask about your services..."
    },
    {
      status: "MISSED",
      stage: "Attempted Contact",
      duration: 0,
      aiScore: 0,
      notes: "Called at 2 PM, no answer. Left a voicemail.",
      transcript: ""
    },
    {
      status: "CONNECTED",
      stage: "Qualified",
      duration: 620,
      aiScore: 92,
      notes: "Great conversation. Lead has budget approved. Scheduling a demo for next Tuesday.",
      transcript: "Agent: How does your current workflow handle this? Lead: We struggle with manual entry..."
    }
  ];

  for (const call of mockCalls) {
    await prisma.callLog.create({
      data: {
        ...call,
        leadId: lead.id,
        userId: user.id,
      }
    });
  }

  console.log("✅ Successfully pushed 3 Call Logs to Supabase!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
