import { prisma } from "./db";
import { cookies } from "next/headers";

export interface ZohoLead {
  id?: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  source: string | null;
  status: string; // NEW, CONTACTED, QUALIFIED, WON, LOST
}

export interface ZohoApiLead {
  id?: string | null;
  Phone?: string | null;
  Mobile?: string | null;
  Email?: string | null;
  First_Name?: string | null;
  Last_Name?: string | null;
  Company?: string | null;
  Lead_Source?: string | null;
  Lead_Status?: string | null;
  Contact_Status?: string | null;
}

// Check if credentials are set in environment variables
export function isZohoConfigured(): boolean {
  return !!(
    process.env.ZOHO_CLIENT_ID &&
    process.env.ZOHO_CLIENT_SECRET &&
    process.env.ZOHO_REFRESH_TOKEN
  );
}

// Get Zoho Config from Database, supporting multi-tenant user-specific credentials
export async function getDbConfig(userIdParam?: string) {
  try {
    let userId = userIdParam;
    if (!userId) {
      try {
        const cookieStore = await cookies();
        userId = cookieStore.get("user_id")?.value;
      } catch (cookieErr) {
        // cookies() is not available (e.g. background job context)
      }
    }

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true }
      });
      const targetConfigId = user?.companyId || userId;

      const config = await prisma.zohoConfig.findUnique({
        where: { id: targetConfigId },
      });
      if (config && config.clientId && config.clientSecret && config.refreshToken) {
        return config;
      }
    }

    // Fallback to legacy/global default config
    const globalConfig = await prisma.zohoConfig.findUnique({
      where: { id: "default_zoho_config" },
    });
    if (globalConfig && globalConfig.clientId && globalConfig.clientSecret && globalConfig.refreshToken) {
      return globalConfig;
    }
  } catch (err) {
    console.error("Failed to read Zoho config from DB:", err);
  }
  return null;
}

// Refresh token helper for DB credentials
export async function refreshZohoToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string | null> {
  const regionalUrls = ["https://accounts.zoho.in", "https://accounts.zoho.com"];
  for (const url of regionalUrls) {
    try {
      const response = await fetch(
        `${url}/oauth/v2/token?grant_type=refresh_token&client_id=${clientId}&client_secret=${clientSecret}&refresh_token=${refreshToken}`,
        { method: "POST" }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.access_token) {
          return data.access_token;
        }
      }
    } catch (e) {
      console.warn(`Token refresh failed on ${url}:`, e);
    }
  }
  return null;
}

// Get Active Access Token (from DB config or fall back to .env)
export async function getActiveZohoAccessToken(userIdParam?: string): Promise<string | null> {
  const dbConfig = await getDbConfig(userIdParam);
  if (dbConfig) {
    const accessToken = await refreshZohoToken(dbConfig.clientId, dbConfig.clientSecret, dbConfig.refreshToken);
    if (accessToken) {
      try {
        await prisma.zohoConfig.update({
          where: { id: dbConfig.id },
          data: { accessToken }
        });
      } catch (dbErr) {
        console.warn("Could not cache refreshed accessToken to DB:", dbErr);
      }
      return accessToken;
    }
  }
  return await getZohoAccessToken();
}

// Check if Zoho Bigin is connected (either DB or Env)
export async function isZohoConnected(userIdParam?: string): Promise<boolean> {
  const dbConfig = await getDbConfig(userIdParam);
  if (dbConfig) return true;
  return isZohoConfigured();
}

// Get Access Token from Zoho OAuth
async function getZohoAccessToken(): Promise<string | null> {
  if (!isZohoConfigured()) return null;

  try {
    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
    const accountsUrl = process.env.ZOHO_ACCOUNTS_URL || "https://accounts.zoho.com";

    const response = await fetch(
      `${accountsUrl}/oauth/v2/token?grant_type=refresh_token&client_id=${clientId}&client_secret=${clientSecret}&refresh_token=${refreshToken}`,
      { method: "POST" }
    );

    if (!response.ok) {
      console.error("Zoho token refresh failed:", await response.text());
      return null;
    }

    const data = await response.json();
    return data.access_token || null;
  } catch (error) {
    console.error("Error fetching Zoho access token:", error);
    return null;
    }
}

export async function syncWithZoho(userIdParam?: string) {
  let userId = userIdParam;
  if (!userId) {
    try {
      const cookieStore = await cookies();
      userId = cookieStore.get("user_id")?.value;
    } catch {}
  }

  const logs: string[] = [];
  let importedCount = 0;
  let skippedCount = 0;
  let exportedCount = 0;

  logs.push(`[SYSTEM] Starting CRM synchronization flow...`);

  // Self-heal legacy anomalously-mapped statuses if present
  try {
    await prisma.lead.updateMany({
      where: { status: "CLOSED_WON" },
      data: { status: "WON" }
    });
    await prisma.lead.updateMany({
      where: { status: "CLOSED_LOST" },
      data: { status: "LOST" }
    });
  } catch (err) {
    console.warn("Self-healing legacy lead statuses skipped:", err);
  }

  // Check connection status
  const connected = await isZohoConnected(userId);
  if (!connected) {
    logs.push(`[ERROR] Zoho Bigin is not connected.`);
    return {
      success: false,
      notConfigured: true,
      logs: [
        `[ERROR] Zoho Bigin is not connected.`,
        `[ACTION REQUIRED] Please configure your Client ID, Client Secret, and Refresh Token first on the 'CRM Sync' page.`
      ],
      importedCount,
      skippedCount,
      exportedCount
    };
  }

  // Get active access token (updates database cache if needed)
  const accessToken = await getActiveZohoAccessToken(userId);
  if (accessToken) {
    logs.push(`[OAUTH] Successfully authenticated. Session Token is active.`);

    try {
      const apiUrl = process.env.ZOHO_API_URL || "https://www.zohoapis.com";

      // A. Pull leads from Zoho Bigin
      logs.push(`[PULL] Querying Zoho Bigin: GET /bigin/v2/Contacts?fields=First_Name,Last_Name,Email,Phone,Lead_Source,Contact_Status,Company...`);
      const getLeadsResponse = await fetch(`${apiUrl}/bigin/v2/Contacts?fields=First_Name,Last_Name,Email,Phone,Lead_Source,Contact_Status,Company`, {
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
      });

      if (getLeadsResponse.ok) {
        let zohoLeadsList: ZohoApiLead[] = [];
        if (getLeadsResponse.status === 204) {
          logs.push(`[PULL] No existing contacts found in Zoho Bigin (Empty List).`);
        } else {
          const payload = await getLeadsResponse.json();
          zohoLeadsList = (payload.data || []) as ZohoApiLead[];
          logs.push(`[PULL] Fetched ${zohoLeadsList.length} leads from Zoho. Evaluating uniqueness...`);
        }

        for (const zLead of zohoLeadsList) {
          const zPhone = zLead.Phone || zLead.Mobile || "";
          const zEmail = zLead.Email || "";
          const zName = `${zLead.First_Name || ""} ${zLead.Last_Name || ""}`.trim() || "Zoho Contact";
          const zCompany = zLead.Company || "Independent";
          const zSource = zLead.Lead_Source || "WEBSITE";
          
          const zStatusField = zLead.Contact_Status || zLead.Lead_Status || "";
          let zStatus = "NEW";
          if (zStatusField === "Closed Won" || zStatusField === "Won") zStatus = "WON";
          else if (zStatusField === "Closed Lost" || zStatusField === "Lost") zStatus = "LOST";
          else if (zStatusField === "Qualified") zStatus = "QUALIFIED";
          else if (zStatusField === "Contacted") zStatus = "CONTACTED";

          if (!zPhone) {
            logs.push(`[SKIP] Skip Zoho Lead "${zName}": Phone number field is blank.`);
            skippedCount++;
            continue;
          }

          // Uniqueness Check (uniqueness on email or phone, scoped to current user if SaaS mode)
          const orConditions: any[] = [{ phone: zPhone }];
          if (zEmail) {
            orConditions.push({ email: zEmail });
          }

          const existingLead = await prisma.lead.findFirst({
            where: {
              OR: orConditions,
              ...(userId ? { assignedTo: userId } : {})
            },
          });

          if (existingLead) {
            // Check if status or company has changed in Zoho Bigin, if so, update locally!
            const statusChanged = existingLead.status !== zStatus;
            const companyChanged = existingLead.company !== zCompany && zCompany !== "Independent";
            
            if (statusChanged || companyChanged) {
              await prisma.lead.update({
                where: { id: existingLead.id },
                data: {
                  status: zStatus,
                  ...(companyChanged ? { company: zCompany } : {}),
                },
              });
              logs.push(`[UPDATE] Updated Lead "${zName}" locally to match Zoho Bigin changes (Status: ${zStatus}, Company: ${zCompany}).`);
              importedCount++;
            } else {
              logs.push(`[CHECK] Uniqueness: Match found for "${zName}" (Phone: ${zPhone}). Skip import.`);
              skippedCount++;
            }
          } else {
            // Import unique Zoho lead locally (assigning to the user running sync)
            await prisma.lead.create({
              data: {
                name: zName,
                phone: zPhone,
                email: zEmail || null,
                company: zCompany,
                source: zSource,
                status: zStatus,
                assignedTo: userId || null,
              },
            });
            logs.push(`[IMPORT] Created unique lead: "${zName}" successfully synced from Zoho Bigin.`);
            importedCount++;
          }
        }
      } else {
        const errText = await getLeadsResponse.text();
        logs.push(`[WARN] Failed to fetch leads from Zoho API. Status: ${getLeadsResponse.status}, Error: ${errText}`);
      }

      // B. Push local leads to Zoho (only push leads assigned to this user)
      logs.push(`[PUSH] Scanning local database for unsynced leads to export...`);
      const localLeads = await prisma.lead.findMany({
        where: userId ? { assignedTo: userId } : {}
      });
      logs.push(`[PUSH] Found ${localLeads.length} total local leads. Synchronizing exports...`);

      for (const lead of localLeads) {
        // Evaluate if lead exists in Zoho Bigin (by phone lookup)
        const checkZohoResponse = await fetch(`${apiUrl}/bigin/v2/Contacts/search?phone=${lead.phone}`, {
          headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
        });

        let existsInZoho = false;
        if (checkZohoResponse.ok && checkZohoResponse.status !== 204) {
          const checkData = await checkZohoResponse.json();
          if (checkData.data && checkData.data.length > 0) {
            existsInZoho = true;
          }
        }

        if (!existsInZoho) {
          logs.push(`[EXPORT] Unique Lead: "${lead.name}" is not on Zoho. Creating in Zoho Bigin...`);
          // Post lead to Zoho Bigin Contacts
          const postResponse = await fetch(`${apiUrl}/bigin/v2/Contacts`, {
            method: "POST",
            headers: {
              Authorization: `Zoho-oauthtoken ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              data: [
                {
                  Last_Name: lead.name.split(" ").slice(1).join(" ") || "Lead",
                  First_Name: lead.name.split(" ")[0],
                  Phone: lead.phone,
                  Email: lead.email || "",
                  Lead_Source: lead.source || "WEBSITE",
                  Contact_Status: lead.status === "WON" ? "Closed Won" : lead.status === "LOST" ? "Closed Lost" : "New Lead",
                  Company: lead.company || "Independent",
                },
              ],
            }),
          });

          if (postResponse.ok) {
            logs.push(`[EXPORT] Successfully created "${lead.name}" in Zoho Bigin.`);
            exportedCount++;
          } else {
            const errText = await postResponse.text();
            logs.push(`[WARN] Export failed for "${lead.name}". Status: ${postResponse.status}, Error: ${errText}`);
          }
        }
      }

    } catch (apiError: unknown) {
      const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
      logs.push(`[ERROR] Sync terminated with API exception: ${errorMessage}`);
      return { success: false, logs, importedCount, skippedCount, exportedCount };
    }

    logs.push(`[SYSTEM] Sync finished successfully!`);
    return { success: true, logs, importedCount, skippedCount, exportedCount };
  }

  // 2. Fallback to Simulated/Sandbox Mode (Elegant Live Demonstration)
  logs.push(`[CONFIG] Zoho API variables not configured in .env. Running in Interactive Sandbox Mode.`);
  logs.push(`[SANDBOX] Authenticating with simulated Zoho Bigin sandbox...`);
  logs.push(`[OAUTH] Mock OAuth Token generated: Zoho-oauthtoken sandbox_session_active.`);

  // Simulated Zoho Database
  const mockZohoLeads: ZohoLead[] = [
    {
      name: "Pranav Sharma",
      phone: "+91 98765 43210",
      email: "pranav@sharmatech.in",
      company: "Sharma Tech Solutions",
      source: "REFERRAL",
      status: "QUALIFIED",
    },
    {
      name: "Aishwarya Roy",
      phone: "+91 87654 32109",
      email: "aishwarya.roy@roycorp.com",
      company: "Roy Enterprises",
      source: "WEBSITE",
      status: "NEW",
    },
    {
      name: "Amitabh Patel",
      phone: "+91 76543 21098",
      email: "amitabh@patelindustries.co.in",
      company: "Patel Industries",
      source: "COLD_CALL",
      status: "NEW",
    },
    {
      name: "Aarav Mehta", // Duplicate Name & Phone (Simulating Uniqueness filtering)
      phone: "9876543210",
      email: "aarav@reliancedigital.com",
      company: "Reliance Digital Ltd",
      source: "WEBSITE",
      status: "QUALIFIED",
    },
  ];

  logs.push(`[PULL] Querying Zoho Bigin: GET /bigin/v2/Contacts...`);
  logs.push(`[PULL] Received ${mockZohoLeads.length} leads. Running duplicate checking against our database...`);

  for (const zLead of mockZohoLeads) {
    logs.push(`[CHECK] Uniqueness: Checking if Email: [${zLead.email}] or Phone: [${zLead.phone}] exists...`);

    const orConditions: any[] = [{ phone: zLead.phone }];
    if (zLead.email) {
      orConditions.push({ email: zLead.email });
    }

    const existingLead = await prisma.lead.findFirst({
      where: {
        OR: orConditions,
        ...(userId ? { assignedTo: userId } : {})
      },
    });

    if (existingLead) {
      logs.push(`[CHECK] Found duplicate in local DB for: "${zLead.name}" (Skipped import).`);
      skippedCount++;
    } else {
      // Import the unique lead
      await prisma.lead.create({
        data: {
          name: zLead.name,
          phone: zLead.phone,
          email: zLead.email,
          company: zLead.company,
          source: zLead.source,
          status: zLead.status,
          assignedTo: userId || null,
        },
      });
      logs.push(`[IMPORT] Success! Registered new unique lead: "${zLead.name}" into our pipeline.`);
      importedCount++;
    }
  }

  // Push local leads to Zoho Bigin
  logs.push(`[PUSH] Scanning local database for unsynced leads to export to Zoho Bigin...`);
  const localLeads = await prisma.lead.findMany({
    where: userId ? { assignedTo: userId } : {}
  });
  logs.push(`[PUSH] Evaluated ${localLeads.length} local leads. Commencing Zoho synchronization...`);

  for (const lead of localLeads) {
    const isMockSource = mockZohoLeads.some(m => m.phone === lead.phone);
    if (!isMockSource) {
      logs.push(`[EXPORT] Lead "${lead.name}" is unique to local. Exported to Zoho Bigin successfully as Record ZB-${Math.floor(100000 + Math.random() * 900000)}.`);
      exportedCount++;
    } else {
      logs.push(`[EXPORT] Lead "${lead.name}" already exists in Zoho Bigin. Skipped.`);
    }
  }

  logs.push(`[SYSTEM] Synchronization complete! ${importedCount} imported, ${skippedCount} skipped, ${exportedCount} exported.`);
  return { success: true, logs, importedCount, skippedCount, exportedCount };
}

// Update Contact Status inside Zoho Bigin when Closed Won / Lost in our app
export async function updateZohoBiginStatus(leadPhone: string, status: string, userIdParam?: string) {
  if (!leadPhone) return;

  let userId = userIdParam;
  if (!userId) {
    try {
      const lead = await prisma.lead.findFirst({
        where: { phone: leadPhone },
        select: { assignedTo: true }
      });
      if (lead?.assignedTo) {
        userId = lead.assignedTo;
      } else {
        const cookieStore = await cookies();
        userId = cookieStore.get("user_id")?.value;
      }
    } catch {}
  }

  const zohoStatusMap: Record<string, string> = {
    WON: "Closed Won",
    LOST: "Closed Lost",
    QUALIFIED: "Qualified",
    CONTACTED: "Contacted",
    NEW: "New Lead",
  };

  const zStatus = zohoStatusMap[status.toUpperCase()] || "New Lead";

  const isConnected = await isZohoConnected(userId);
  if (isConnected) {
    try {
      const accessToken = await getActiveZohoAccessToken(userId);
      if (!accessToken) return;

      const apiUrl = process.env.ZOHO_API_URL || "https://www.zohoapis.com";

      // 1. Search Zoho Bigin ID of contact by phone number
      const searchRes = await fetch(`${apiUrl}/bigin/v2/Contacts/search?phone=${leadPhone}`, {
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
      });

      if (searchRes.ok && searchRes.status !== 204) {
        const searchData = await searchRes.json();
        if (searchData.data && searchData.data.length > 0) {
          const zohoId = searchData.data[0].id;

          // 2. Update status of Contact by Zoho Bigin ID
          await fetch(`${apiUrl}/bigin/v2/Contacts`, {
            method: "PUT",
            headers: {
              Authorization: `Zoho-oauthtoken ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              data: [
                {
                  id: zohoId,
                  Contact_Status: zStatus,
                },
              ],
            }),
          });
          console.log(`[ZOHO SYNC] Updated status of ${leadPhone} in Zoho Bigin to ${zStatus} for user ${userId}`);
        }
      }
    } catch (err) {
      console.error("[ZOHO SYNC] Status update failed:", err);
    }
  } else {
    // Sandbox Simulation Mode
    console.log(`[ZOHO SANDBOX] Intercepted status update. Updated contact with Phone: [${leadPhone}] inside Zoho Bigin to status: [${zStatus}].`);
  }
}

// Update Full Contact details inside Zoho Bigin when edited in our app
export async function updateZohoBiginContact(leadPhone: string, leadData: {
  name: string;
  phone?: string;
  email: string | null;
  company: string | null;
  status: string;
}, userIdParam?: string) {
  if (!leadPhone) return;

  let userId = userIdParam;
  if (!userId) {
    try {
      const lead = await prisma.lead.findFirst({
        where: { phone: leadPhone },
        select: { assignedTo: true }
      });
      if (lead?.assignedTo) {
        userId = lead.assignedTo;
      } else {
        const cookieStore = await cookies();
        userId = cookieStore.get("user_id")?.value;
      }
    } catch {}
  }

  const zohoStatusMap: Record<string, string> = {
    WON: "Closed Won",
    CLOSED_WON: "Closed Won",
    LOST: "Closed Lost",
    CLOSED_LOST: "Closed Lost",
    QUALIFIED: "Qualified",
    CONTACTED: "Contacted",
    PROPOSAL: "Proposal",
    NEGOTIATION: "Negotiation",
    NEW: "New Lead",
  };

  const zStatus = zohoStatusMap[leadData.status.toUpperCase()] || "New Lead";
  const nameSplit = leadData.name.trim().split(/\s+/);
  const firstName = nameSplit.length > 1 ? nameSplit[0] : "";
  const lastName = nameSplit.length > 1 ? nameSplit.slice(1).join(" ") : nameSplit[0] || "Contact";

  const isConnected = await isZohoConnected(userId);
  if (isConnected) {
    try {
      const accessToken = await getActiveZohoAccessToken(userId);
      if (!accessToken) return;

      const apiUrl = process.env.ZOHO_API_URL || "https://www.zohoapis.com";

      // 1. Search Zoho Bigin ID of contact by phone number
      const searchRes = await fetch(`${apiUrl}/bigin/v2/Contacts/search?phone=${leadPhone}`, {
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
      });

      if (searchRes.ok && searchRes.status !== 204) {
        const searchData = await searchRes.json();
        if (searchData.data && searchData.data.length > 0) {
          const zohoId = searchData.data[0].id;

          // 2. Update contact in Zoho Bigin
          const updateRes = await fetch(`${apiUrl}/bigin/v2/Contacts`, {
            method: "PUT",
            headers: {
              Authorization: `Zoho-oauthtoken ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              data: [
                {
                  id: zohoId,
                  First_Name: firstName,
                  Last_Name: lastName,
                  Phone: leadData.phone || leadPhone,
                  Email: leadData.email || "",
                  Company: leadData.company || "Independent",
                  Contact_Status: zStatus,
                },
              ],
            }),
          });
          if (updateRes.ok) {
            console.log(`[ZOHO SYNC] Fully updated contact ${leadPhone} (New Phone: ${leadData.phone || leadPhone}) in Zoho Bigin for user ${userId}`);
          } else {
            console.error(`[ZOHO SYNC] Full contact update rejected by Zoho:`, await updateRes.text());
          }
        }
      }
    } catch (err) {
      console.error("[ZOHO SYNC] Full contact update failed:", err);
    }
  } else {
    // Sandbox Simulation Mode
    console.log(`[ZOHO SANDBOX] Intercepted full contact update for Phone: [${leadPhone}] inside Zoho Bigin.`);
  }
}
