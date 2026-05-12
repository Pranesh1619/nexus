"use server";

import { prisma } from "@/lib/db";

/**
 * Retrieves the stored Zoho API credentials from the Database (Prisma Raw SQL).
 * No environment variables or hardcoded values are utilized!
 */
export async function getStoredZohoConfig() {
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "clientId", "clientSecret", "refreshToken", "accessToken" FROM "ZohoConfig" WHERE id = 'default_zoho_config' LIMIT 1`
    );
    const config = rows && rows[0];
    if (config) {
      return {
        clientId: config.clientId || "",
        clientSecret: config.clientSecret || "",
        refreshToken: config.refreshToken || "",
        accessToken: config.accessToken || ""
      };
    }
  } catch (err: any) {
    console.error("Failed to read Zoho configuration from Database (Raw SQL):", err.message);
  }
  return null;
}

/**
 * Exchange Zoho OAuth2 credentials for a fresh Access Token.
 * Automatically detects whether the user provided a temporary Authorization Code (grant code)
 * or a permanent Refresh Token, executing the correct OAuth2 grant type.
 */
export async function exchangeZohoRefreshToken(clientId: string, clientSecret: string, refreshToken: string) {
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing credentials. Please fill in Client ID, Client Secret, and Refresh Token.");
  }

  const cleanClientId = clientId.trim();
  const cleanClientSecret = clientSecret.trim();
  const cleanRefreshToken = refreshToken.trim();

  // Support multi-regional accounts dynamically (try India region first, fall back to global)
  const regionalAccountsUrls = [
    "https://accounts.zoho.in",
    "https://accounts.zoho.com"
  ];

  let lastError: any = null;

  for (const accountsUrl of regionalAccountsUrls) {
    try {
      // 1. Try OPTION A: Treat input as a permanent Refresh Token
      const targetUrl = `${accountsUrl}/oauth/v2/token?grant_type=refresh_token&client_id=${cleanClientId}&client_secret=${cleanClientSecret}&refresh_token=${cleanRefreshToken}`;
      
      console.log(`[ZOHO HANDSHAKE] Option A (Refresh Token) check: ${accountsUrl}`);

      const response = await fetch(targetUrl, { method: "POST" });
      if (response.ok) {
        const data = await response.json();
        
        // If Zoho rejected with invalid_client/invalid_code, the input is likely a temporary Authorization Code!
        if (data.error === "invalid_client" || data.error === "invalid_code") {
          console.log(`[ZOHO HANDSHAKE] Option A rejected: ${data.error}. Falling back to Option B (Authorization Code)...`);
          
          // Try OPTION B: Treat input as a temporary Authorization Code (grant code)
          // We test common developer redirect URIs
          const redirectUris = ["http://localhost:3000", "https://localhost", "http://localhost"];

          for (const uri of redirectUris) {
            const targetUrlCode = `${accountsUrl}/oauth/v2/token?grant_type=authorization_code&client_id=${cleanClientId}&client_secret=${cleanClientSecret}&code=${cleanRefreshToken}&redirect_uri=${uri}`;
            
            console.log(`[ZOHO HANDSHAKE] Option B check with Redirect URI: ${uri}`);
            const resCode = await fetch(targetUrlCode, { method: "POST" });
            
            if (resCode.ok) {
              const dataCode = await resCode.json();
              if (!dataCode.error && dataCode.access_token) {
                // EXTREME SUCCESS: We successfully exchanged your temporary Authorization Code for permanent keys!
                const permanentRefreshToken = dataCode.refresh_token || cleanRefreshToken;
                const accessToken = dataCode.access_token;

                // Persist the real permanent refresh token in your Database!
                await prisma.$executeRawUnsafe(
                  `INSERT INTO "ZohoConfig" (id, "clientId", "clientSecret", "refreshToken", "accessToken", "updatedAt")
                   VALUES ('default_zoho_config', $1, $2, $3, $4, NOW())
                   ON CONFLICT (id) DO UPDATE SET
                     "clientId" = EXCLUDED."clientId",
                     "clientSecret" = EXCLUDED."clientSecret",
                     "refreshToken" = EXCLUDED."refreshToken",
                     "accessToken" = EXCLUDED."accessToken",
                     "updatedAt" = NOW()`,
                  cleanClientId,
                  cleanClientSecret,
                  permanentRefreshToken,
                  accessToken
                );
                
                console.log("[ZOHO DB PERSIST] Successfully saved permanent Refresh Token and Access Token to Database!");
                return {
                  success: true,
                  accessToken: accessToken,
                  refreshToken: permanentRefreshToken,
                  expiresIn: dataCode.expires_in || 3600
                };
              } else {
                lastError = new Error(`Zoho Authorization rejection (${accountsUrl}): ${dataCode.error_description || dataCode.error}`);
              }
            }
          }
          continue; // Try next accounts Url if Option B fails
        }

        // Option A succeeded directly!
        const accessToken = data.access_token;
        if (accessToken) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "ZohoConfig" (id, "clientId", "clientSecret", "refreshToken", "accessToken", "updatedAt")
             VALUES ('default_zoho_config', $1, $2, $3, $4, NOW())
             ON CONFLICT (id) DO UPDATE SET
               "clientId" = EXCLUDED."clientId",
               "clientSecret" = EXCLUDED."clientSecret",
               "refreshToken" = EXCLUDED."refreshToken",
               "accessToken" = EXCLUDED."accessToken",
               "updatedAt" = NOW()`,
            cleanClientId,
            cleanClientSecret,
            cleanRefreshToken,
            accessToken
          );
          return {
            success: true,
            accessToken: accessToken,
            refreshToken: cleanRefreshToken,
            expiresIn: data.expires_in || 3600
          };
        }
      } else {
        const errResponse = await response.text();
        lastError = new Error(`HTTP error ${response.status} from ${accountsUrl}: ${errResponse}`);
      }
    } catch (err: any) {
      lastError = new Error(`Network failure calling ${accountsUrl}: ${err.message}`);
    }
  }

  throw lastError || new Error("Zoho authorization handshake rejected across all servers.");
}

/**
 * Perform real bi-directional synchronization with live Zoho Bigin REST API (Contacts endpoint).
 * Connects to Zoho Bigin, retrieves Contacts, and synchronizes them into Local Database (Prisma).
 * Pushes any local unique leads back to Zoho Bigin.
 */
export async function performZohoSync(accessToken: string) {
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

  let activeToken = accessToken;

  // Dynamically refresh the access token from DB first to guarantee it is always fresh and never 401!
  try {
    const config = await getStoredZohoConfig();
    if (config && config.clientId && config.clientSecret && config.refreshToken) {
      console.log("[ZOHO SYNC] Automatically refreshing access token prior to sync to guarantee token is valid...");
      const refreshResult = await exchangeZohoRefreshToken(config.clientId, config.clientSecret, config.refreshToken);
      if (refreshResult && refreshResult.accessToken) {
        activeToken = refreshResult.accessToken;
        console.log("[ZOHO SYNC] Access token refreshed successfully!");
      }
    }
  } catch (err: any) {
    console.warn("[ZOHO SYNC] Automatic pre-sync token refresh skipped/failed:", err.message);
  }

  if (!activeToken) {
    throw new Error("Access token is required for Zoho Bigin synchronization.");
  }

  // Log events list (lead-centric)
  const logs: Array<{
    id: string;
    timestamp: string;
    leadName?: string;
    type: "Lead" | "Call" | "Deal" | "System";
    operation: "FETCHED_FROM_ZOHO" | "UPDATED_ON_SITE" | "PUSHED_TO_ZOHO" | "HANDSHAKE";
    details: string;
    status: "SUCCESS" | "WARNING" | "SKIPPED";
    syncFlow?: "App → Zoho Bigin" | "Zoho Bigin → App" | "System";
  }> = [];

  const syncCount = { fetched: 0, updated: 0, pushed: 0 };
  const getFormattedTime = () => new Date().toTimeString().split(" ")[0];

  // Helper to normalize and trim text for precise comparisons
  const normalizeText = (text: string) => (text || "").trim().replace(/\s+/g, " ");

  // Digit-only phone number normalizer to handle spaces, dashes, and other variations perfectly
  const normalizePhone = (phone: string) => (phone || "").replace(/\D/g, "");

  // Map local status to Zoho Bigin Status
  const mapLocalStatusToZoho = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "WON" || s === "CLOSED_WON") return "Closed Won";
    if (s === "LOST" || s === "CLOSED_LOST") return "Closed Lost";
    if (s === "QUALIFIED") return "Qualified";
    if (s === "CONTACTED") return "Contacted";
    if (s === "PROPOSAL") return "Proposal";
    if (s === "NEGOTIATION") return "Negotiation";
    return "New Lead";
  };

  // Map Zoho Bigin Status to Local Status
  const mapZohoStatusToLocal = (zStatus: string) => {
    const s = (zStatus || "").trim().toLowerCase();
    if (s === "closed won" || s === "won") return "WON";
    if (s === "closed lost" || s === "lost") return "LOST";
    if (s === "qualified") return "QUALIFIED";
    if (s === "contacted") return "CONTACTED";
    if (s === "proposal") return "PROPOSAL";
    if (s === "negotiation") return "NEGOTIATION";
    return "NEW";
  };

  // Split name for Zoho (guaranteeing mandatory Last_Name)
  const splitNameToFirstLast = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length > 1) {
      return {
        firstName: parts[0],
        lastName: parts.slice(1).join(" ")
      };
    }
    return {
      firstName: "",
      lastName: parts[0] || "Contact"
    };
  };

  // Timezone-resilient Date Parser to synchronize Supabase (UTC) and Zoho Bigin (IST) perfectly
  const parseZohoDate = (dateStr: string): number => {
    if (!dateStr) return 0;
    let cleanStr = dateStr.trim();
    // Check if the string already ends with a timezone offset (e.g. +05:30, -08:00, or Z)
    const hasOffset = cleanStr.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(cleanStr);
    if (!hasOffset) {
      // Append Indian Standard Time timezone offset by default
      cleanStr = `${cleanStr}+05:30`;
    }
    return new Date(cleanStr).getTime();
  };

  // --- REAL ZOHO BIGIN INTEGRATION RUNTIME ---
  let fetchedContacts: any[] = [];
  let usedApiUrl = "https://www.zohoapis.in"; // Default to India regional endpoint

  const apiUrls = [
    "https://www.zohoapis.in",
    "https://www.zohoapis.com"
  ];

  let lastError: any = null;

  // A. Query Zoho Bigin Contacts endpoint (supports both global & regional domains)
  for (const apiUrl of apiUrls) {
    try {
      console.log(`[ZOHO SYNC] Attempting pull from Zoho Bigin API at: ${apiUrl}/bigin/v2/Contacts`);
      const response = await fetch(`${apiUrl}/bigin/v2/Contacts?fields=First_Name,Last_Name,Email,Phone,Lead_Source,Contact_Status,Company,Modified_Time`, {
        headers: { Authorization: `Zoho-oauthtoken ${activeToken}` }
      });

      if (response.ok) {
        if (response.status === 204) {
          fetchedContacts = [];
        } else {
          const body = await response.json();
          fetchedContacts = body.data || [];
        }
        usedApiUrl = apiUrl;
        lastError = null;
        break; // Pull succeeded!
      } else {
        const errText = await response.text();
        lastError = new Error(`Zoho API endpoint (${apiUrl}) rejected sync. Code: ${response.status} - ${errText}`);
      }
    } catch (err: any) {
      lastError = new Error(`Connection failed to ${apiUrl}: ${err.message}`);
    }
  }

  if (lastError) {
    throw lastError;
  }

  syncCount.fetched = fetchedContacts.length;

  // Retrieve current local leads
  const localLeads = await prisma.lead.findMany();
  const matchedLocalLeadIds = new Set<string>();

  // B. Save / Reconcile Zoho Bigin Records with Local Site Database (Prisma)
  for (const zLead of fetchedContacts) {
    const zPhone = zLead.Phone || zLead.Mobile || "";
    const zEmail = zLead.Email || "";
    const firstName = (zLead.First_Name || "").trim();
    const lastName = (zLead.Last_Name || "").trim();
    const name = `${firstName} ${lastName}`.trim() || "Zoho Contact";
    const company = zLead.Company || "Independent";
    const source = zLead.Lead_Source || "WEBSITE";

    const zStatusField = zLead.Contact_Status || zLead.Lead_Status || "";
    const status = mapZohoStatusToLocal(zStatusField);

    if (!zPhone) {
      logs.push({
        id: `skip_${Date.now()}_${Math.random()}`,
        timestamp: getFormattedTime(),
        leadName: name,
        type: "Lead",
        operation: "UPDATED_ON_SITE",
        details: "Skipped: Phone number field is blank.",
        status: "SKIPPED",
        syncFlow: "System"
      });
      continue;
    }

    try {
      // Find matching local lead (by phone or email lookup)
      const existingLead = localLeads.find(l => 
        normalizePhone(l.phone) === normalizePhone(zPhone) || 
        (zEmail && l.email && normalizeText(l.email).toLowerCase() === normalizeText(zEmail).toLowerCase())
      );

      if (existingLead) {
        matchedLocalLeadIds.add(existingLead.id);

        const nameChanged = normalizeText(existingLead.name).toLowerCase() !== normalizeText(name).toLowerCase();
        const statusChanged = existingLead.status !== status;
        const emailChanged = normalizeText(existingLead.email || "").toLowerCase() !== normalizeText(zEmail).toLowerCase();
        const companyChanged = normalizeText(existingLead.company || "Independent").toLowerCase() !== normalizeText(company || "Independent").toLowerCase();
        const phoneChanged = normalizeText(existingLead.phone).toLowerCase() !== normalizeText(zPhone).toLowerCase();

        if (nameChanged || statusChanged || emailChanged || companyChanged || phoneChanged) {
          const localTime = new Date(existingLead.updatedAt).getTime();
          const zohoTimeStr = zLead.Modified_Time || zLead.Modified_At || "";
          const zohoTime = parseZohoDate(zohoTimeStr);

          // Clear, highly detailed server logging of timestamp parameters
          console.log(`[RECONCILE] Comparing lead: ${existingLead.name}`);
          console.log(`  - Local App modifiedAt : ${new Date(localTime).toISOString()} (Unix: ${localTime})`);
          console.log(`  - Zoho Bigin ModifiedTime: ${new Date(zohoTime).toISOString()} (Raw: "${zohoTimeStr}" | Unix: ${zohoTime})`);
          console.log(`  - Local is newer? (with 60s bias) : ${localTime > zohoTime - 60000}`);

          // Resolve conflicts chronologically with a 60-second bias towards App updates.
          // This prevents Zoho API updates (triggered immediately after local DB writes) from 
          // appearing newer and overwriting local name/company changes.
          if (localTime > zohoTime - 60000) {
            // --- APP -> ZOHO BIGIN (Local App has newer updates) ---
            console.log(`[ZOHO SYNC] App is newer. Pushing local changes to Zoho for: ${existingLead.name}`);
            
            const nameSplit = splitNameToFirstLast(existingLead.name);
            const updateBody = {
              data: [
                {
                  id: zLead.id,
                  First_Name: nameSplit.firstName,
                  Last_Name: nameSplit.lastName,
                  Phone: existingLead.phone,
                  Email: existingLead.email || "",
                  Company: existingLead.company || "Independent",
                  Contact_Status: mapLocalStatusToZoho(existingLead.status)
                }
              ]
            };

            const putResponse = await fetch(`${usedApiUrl}/bigin/v2/Contacts`, {
              method: "PUT",
              headers: {
                Authorization: `Zoho-oauthtoken ${activeToken}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify(updateBody)
            });

            if (putResponse.ok) {
              syncCount.pushed++;
              const changes: string[] = [];
              if (nameChanged) changes.push(`name changed from '${name}' to '${existingLead.name}'`);
              if (statusChanged) changes.push(`lead status changed from '${status}' to '${existingLead.status}'`);
              if (emailChanged) changes.push(`email changed from '${zEmail || "none"}' to '${existingLead.email || "none"}'`);
              if (companyChanged) changes.push(`company changed from '${company}' to '${existingLead.company || "Independent"}'`);
              if (phoneChanged) changes.push(`phone changed from '${zPhone}' to '${existingLead.phone}'`);

              logs.push({
                id: `push_update_${existingLead.id}`,
                timestamp: getFormattedTime(),
                leadName: existingLead.name,
                type: "Lead",
                operation: "PUSHED_TO_ZOHO",
                details: `Updated: ${changes.join(", ")} from app to zoho bigin.`,
                status: "SUCCESS",
                syncFlow: "App → Zoho Bigin"
              });
            } else {
              const errText = await putResponse.text();
              console.error(`[ZOHO SYNC] Put update rejected by Zoho Bigin:`, errText);
              
              const changes: string[] = [];
              if (nameChanged) changes.push(`name to '${existingLead.name}'`);
              if (statusChanged) changes.push(`status to '${existingLead.status}'`);
              if (emailChanged) changes.push(`email to '${existingLead.email || "none"}'`);
              if (companyChanged) changes.push(`company to '${existingLead.company || "Independent"}'`);
              if (phoneChanged) changes.push(`phone to '${existingLead.phone}'`);

              logs.push({
                id: `push_fail_${existingLead.id}`,
                timestamp: getFormattedTime(),
                leadName: existingLead.name,
                type: "Lead",
                operation: "PUSHED_TO_ZOHO",
                details: `Failed to push (${changes.join(", ")}): Zoho rejected update. Code ${putResponse.status} - ${errText}`,
                status: "WARNING",
                syncFlow: "App → Zoho Bigin"
              });
            }
          } else {
            // --- ZOHO BIGIN -> APP (Zoho Bigin has newer updates) ---
            console.log(`[ZOHO SYNC] Zoho is newer. Syncing Zoho changes to App for: ${name}`);
            
            await prisma.lead.update({
              where: { id: existingLead.id },
              data: {
                name,
                status,
                email: zEmail || null,
                company,
                phone: zPhone
              }
            });
            syncCount.updated++;

            const changes: string[] = [];
            if (nameChanged) changes.push(`name changed from '${existingLead.name}' to '${name}'`);
            if (statusChanged) changes.push(`lead status changed from '${existingLead.status}' to '${status}'`);
            if (emailChanged) changes.push(`email changed from '${existingLead.email || "none"}' to '${zEmail || "none"}'`);
            if (companyChanged) changes.push(`company changed from '${existingLead.company || "Independent"}' to '${company || "Independent"}'`);
            if (phoneChanged) changes.push(`phone changed from '${existingLead.phone}' to '${zPhone}'`);

            logs.push({
              id: `pull_update_${existingLead.id}`,
              timestamp: getFormattedTime(),
              leadName: name,
              type: "Lead",
              operation: "UPDATED_ON_SITE",
              details: `Updated: ${changes.join(", ")} from zoho bigin to app.`,
              status: "SUCCESS",
              syncFlow: "Zoho Bigin → App"
            });
          }
        } else {
          // No changes detected on either side
          logs.push({
            id: `skip_match_${existingLead.id}`,
            timestamp: getFormattedTime(),
            leadName: name,
            type: "Lead",
            operation: "UPDATED_ON_SITE",
            details: "In Sync: Name, Email, Phone, Company, and Status are perfectly synchronized.",
            status: "SUCCESS",
            syncFlow: "System"
          });
        }
      } else {
        // --- NEW LEAD IN ZOHO BIGIN -> IMPORT LOCALLY ---
        const newLead = await prisma.lead.create({
          data: {
            name,
            phone: zPhone,
            email: zEmail || null,
            company,
            source,
            status
          }
        });
        syncCount.updated++;
        logs.push({
          id: `import_${newLead.id}`,
          timestamp: getFormattedTime(),
          leadName: name,
          type: "Lead",
          operation: "UPDATED_ON_SITE",
          details: "Imported: Created unique local contact successfully from zoho bigin to app.",
          status: "SUCCESS",
          syncFlow: "Zoho Bigin → App"
        });
      }
    } catch (dbError: any) {
      console.error("Local sync database upsert failed:", dbError.message);
    }
  }

  // C. PUSH unique local leads that are NOT in Zoho Bigin at all!
  for (const lead of localLeads) {
    if (matchedLocalLeadIds.has(lead.id)) {
      continue; // Already reconciled above
    }

    try {
      // Search Zoho to make absolutely sure it's not there under some other lookup
      const checkZohoResponse = await fetch(`${usedApiUrl}/bigin/v2/Contacts/search?phone=${lead.phone}`, {
        headers: { Authorization: `Zoho-oauthtoken ${activeToken}` }
      });

      let existsInZoho = false;
      if (checkZohoResponse.ok && checkZohoResponse.status !== 204) {
        const checkData = await checkZohoResponse.json();
        if (checkData.data && checkData.data.length > 0) {
          existsInZoho = true;
        }
      }

      if (!existsInZoho) {
        console.log(`[ZOHO SYNC] Pushing local unique lead to Zoho Bigin: ${lead.name}`);
        const nameSplit = splitNameToFirstLast(lead.name);
        
        const postResponse = await fetch(`${usedApiUrl}/bigin/v2/Contacts`, {
          method: "POST",
          headers: {
            Authorization: `Zoho-oauthtoken ${activeToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            data: [
              {
                First_Name: nameSplit.firstName,
                Last_Name: nameSplit.lastName,
                Phone: lead.phone,
                Email: lead.email || "",
                Lead_Source: lead.source || "WEBSITE",
                Contact_Status: mapLocalStatusToZoho(lead.status),
                Company: lead.company || "Independent"
              }
            ]
          })
        });

        if (postResponse.ok) {
          syncCount.pushed++;
          logs.push({
            id: `pushed_${lead.id}`,
            timestamp: getFormattedTime(),
            leadName: lead.name,
            type: "Lead",
            operation: "PUSHED_TO_ZOHO",
            details: `Created new contact with status '${lead.status}' from app to zoho bigin.`,
            status: "SUCCESS",
            syncFlow: "App → Zoho Bigin"
          });
        }
      }
    } catch (pushErr: any) {
      console.warn("Zoho unique push validation failure:", pushErr.message);
    }
  }

  return {
    success: true,
    isMock: false,
    syncCount,
    logs
  };
}
