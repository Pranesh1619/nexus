# Restoring Twilio Integration

If the user requests to switch from **Plivo** back to **Twilio**, follow these instructions to restore the Twilio configuration, credentials, and UI selection options.

---

### Step 1: Update `.env` File
In `e:\Projects\Next-JS\bpo\.env`, uncomment the Twilio environment variables and configure them:

```env
# Telephony Configuration (Change active provider to TWILIO)
TELEPHONY_PROVIDER=TWILIO

# Twilio API Credentials for SIP Trunk Calls (Uncomment these)
# TWILIO_ACCOUNT_SID="your_twilio_account_sid_here"
# TWILIO_AUTH_TOKEN="your_twilio_auth_token_here"
# TWILIO_API_KEY="your_twilio_api_key_here"
# TWILIO_API_SECRET="your_twilio_api_secret_here"
# TWILIO_TWIML_APP_SID="your_twilio_twiml_app_sid_here"
# USE_REAL_TWILIO=true
# MOCK_TWILIO_URL=http://localhost:5050
```

---

### Step 2: Restore Twilio Options in Settings UI
In the file `src/app/admin/settings/SipTrunkSettingsClient.tsx`:

1. **Revert initial state provider default:**
   Change:
   ```typescript
   const [config, setConfig] = useState<SipConfigType>({ ...initialConfig, telephonyProvider: "PLIVO" });
   ```
   Back to:
   ```typescript
   const [config, setConfig] = useState<SipConfigType>(initialConfig);
   ```

2. **Uncomment Twilio Provider Card:**
   Locate the `{/* Active Provider Cards (Twilio commented out; showing Plivo only) */}` block. Uncomment the Twilio card (`col-md-6`) and change the Plivo card back to `col-md-6` instead of `col-md-12`.

3. **Uncomment Mock Twilio URL Input:**
   Locate the `{/* Commented out Self-hosted Mock URL (Only for Twilio) ... */}` block near the bottom of the form and uncomment the entire `{config.telephonyProvider === "TWILIO" && ...}` section.

---

### Step 3: Run Database Migrations/Check Configuration
Go to `https://virpacaller.vercel.app/admin/settings` (or your local environment) and make sure:
1. Both **Twilio Integration** and **Plivo Integration** cards are visible.
2. Select **Twilio Integration** and click **Save Configuration**.
3. Verify that call routes resolve to Twilio inside `src/app/admin/calls/new/actions.ts`.
