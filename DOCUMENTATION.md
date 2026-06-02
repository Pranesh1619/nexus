# 📞 Virpanix Nexus: Unified AI Telephony & CRM Console
## Enterprise BPO Outbound Call Dialer & CRM Synchronization Platform

This document provides a comprehensive technical overview of the architecture, database schema, core functionalities, environment configurations, and deployment strategies for the **Virpanix Nexus** application.

---

## 📖 1. Overview & Objectives

**Virpanix Nexus** is an enterprise-grade outbound calling console and CRM management portal designed for BPO operations and sales departments. It bridges the gap between traditional telephony (SIP trunks/PSTN) and modern Artificial Intelligence (Speech-to-Text and Large Language Models) to automate lead calling, call analysis, and CRM sync.

### Key Objectives:
*   **Automated Outbound Dialing**: Initiate calls directly to sales leads from a unified web interface.
*   **Multilingual Support**: Present automated greetings in regional languages (English, Spanish, Hindi, French, German, Tamil) using high-quality neural voices.
*   **AI Transcription & Translation**: Automatically download call recordings, transcribe them via Whisper (OpenAI or Groq), correct phonetic transcription errors, and translate foreign language responses into English.
*   **Dialogue Turn Analysis**: Classify speech into structured Agent vs. Lead turns with timestamps.
*   **AI Qualification & Scoring**: Evaluate call transcripts using LLMs (GPT-4o-mini or Llama-3.3) to generate summary reports and business qualification scores (0-100).
*   **Zoho Bigin CRM Integration**: Provide bidirectional lead synchronization, automated duplicate filtering, and status propagation.

---

## 🛠️ 2. Technology Stack

### A. Next.js Frontend & Core API (Root Project)
*   **Framework**: Next.js 16.2.4 (App Router)
*   **Library**: React 19.2.4 & TypeScript
*   **Database ORM**: Prisma 6.2.1
*   **Database Engine**: PostgreSQL (Hosted on Supabase with PgBouncer connection pooling)
*   **UI Components & Styling**: Bootstrap 5.3.8, TailwindCSS 4, Bootstrap Icons, Lucide Icons
*   **Charts & Visualization**: Recharts 3.8.1
*   **Telephony Client**: Twilio Node SDK

### B. Custom Telephony Gateway (`/twilio` Directory)
*   **Runtime & Server**: Node.js & Express.js (TypeScript)
*   **Telephony Control**: Asterisk Gateway Interface (ARI/AGI) or Telnyx REST API
*   **Protocols**: SIP, WebSockets (WS), WebRTC (JsSIP)
*   **Audio Cache**: Local storage cache for Text-to-Speech (TTS) audio files and recording archives.

---

## 🗄️ 3. Database Schema (Prisma Models)

The PostgreSQL database schema consists of 5 main tables managed via Prisma ORM:

```mermaid
erDiagram
    USER ||--o{ LEAD : assigned
    USER ||--o{ CALLLOG : logs
    LEAD ||--o{ CALLLOG : includes
    ZOHOCONFIG {
        string id PK
        string clientId
        string clientSecret
        string refreshToken
        string accessToken
        datetime updatedAt
    }
    SIPTRUNKCONFIG {
        string id PK
        string domain
        string webSocketUrl
        string username
        string password
        string callerId
        string codec
        boolean isActive
        string mockTwilioUrl
    }
```

### Model Definitions:

1.  **User**: Represents Sales Agents and Administrators.
    *   `id` (String, CUID PK)
    *   `name`, `email` (Unique), `password` (Hashed)
    *   `role` (ADMIN or SALES)
    *   `status` (ACTIVE or INACTIVE)
    *   `leads` (One-to-Many relation with `Lead` representing assigned pipeline)
    *   `calls` (One-to-Many relation with `CallLog`)

2.  **Lead**: Stores prospect records.
    *   `id` (String, CUID PK)
    *   `name`, `phone` (Unique), `email`, `company`
    *   `status` (NEW, CONTACTED, QUALIFIED, WON, LOST)
    *   `source` (WEBSITE, REFERRAL, COLD_CALL, etc.)
    *   `assignedTo` (Foreign key to `User`)

3.  **CallLog**: Stores metadata, transcript, translation, and analysis of telephony calls.
    *   `id` (String, CUID PK)
    *   `jobId` (String, maps to Twilio's unique `CallSid`)
    *   `duration` (Integer, call duration in seconds)
    *   `status` (CONNECTED, MISSED, VOICEMAIL)
    *   `stage` (Current lead sales stage, e.g., "Interested", "Qualified", "Closed")
    *   `transcript` (JSON string containing array of speaker turns with timestamps)
    *   `translatedText` (English translation of dialogue turns)
    *   `detectedVoiceLanguage`, `translatedLanguage` (Locale variables)
    *   `analysis` (LLM-generated CRM summary and next steps)
    *   `aiScore` (Integer, 0-100 rating of lead interest level)
    *   `audioUrl` (URL to play call recording audio)

4.  **ZohoConfig**: Stores temporary credentials to access the Zoho Bigin OAuth v2 APIs.
5.  **SipTrunkConfig**: Stores custom SIP provider domain details and WebRTC WebSocket endpoints for softphone integrations.

---

## ⚡ 4. Core Features & Architecture Flows

### Flow A: Initiating Outbound Calls
Calls can be placed in one of two modes:
1.  **Real Twilio Mode (`USE_REAL_TWILIO=true`)**: The Next.js API uses the Twilio SDK to trigger an outbound call via a real Twilio SIP trunk or phone number.
2.  **Self-Hosted Gateway Mode (`USE_REAL_TWILIO=false`)**: The Next.js API hits the local Node Express Gateway (`twilio/` folder) running Asterisk, bypassing Twilio's per-minute calling charges to run outbound dialers over private SIP lines.

```mermaid
sequenceDiagram
    participant User as Agent (Web UI)
    participant NextJS as Next.js Server
    participant Gateway as Twilio Express Gateway (Port 5050)
    participant Asterisk as Asterisk / Telnyx SIP
    participant Lead as Customer Phone

    User->>NextJS: Clicks Call Button
    alt USE_REAL_TWILIO = true
        NextJS->>NextJS: Uses Twilio SDK
        NextJS->>Lead: Outbound Call via Twilio
    else USE_REAL_TWILIO = false
        NextJS->>Gateway: POST /2010-04-01/Accounts/.../Calls.json
        Gateway->>Asterisk: Triggers SIP Call
        Asterisk->>Lead: Outbound Call via custom SIP Trunk
    end
```

### Flow B: Multilingual TwiML Delivery
When the customer answers the call, the dialer fetches instructions from `/api/twilio/voice`. This endpoint serves TwiML (XML) code playing the greeting in the selected language using AWS Polly Neural voices:
*   **English**: `Polly.Brian-Neural` (UK Male)
*   **Spanish**: `Polly.Lupe-Neural` (US/ES Female)
*   **Hindi**: `Polly.Aditi` (IN Female)
*   **French**: `Polly.Celine` (FR Female)
*   **German**: `Polly.Marlene` (DE Female)
*   **Tamil**: `Google.ta-IN-Standard-D` (IN Female)

After playing the greeting, it commands the gateway to record the customer's response (`<Record maxLength="60" playBeep="true" />`).

### Flow C: AI Transcription & Dialogue Analysis Webhook
Once the call is terminated, Twilio or the Self-Hosted Gateway calls `/api/twilio/recording-callback`.

```mermaid
graph TD
    A[Call Hangs Up] --> B[Webhook triggered: api/twilio/recording-callback]
    B --> C[Download audio file from RecordingUrl]
    C --> D[Save WAV audio locally inside public/recordings/]
    D --> E[Submit audio to Whisper API Groq or OpenAI]
    E --> F[Whisper returns raw text transcript]
    F --> G[System greeting boundary and warning phrases stripped]
    G --> H[LLM GPT-4o-mini / Llama-3.3 processing]
    H --> I[Task 1: Correct phonetic typos & transliterate Romanized scripts]
    H --> J[Task 2: Translate regional languages to English]
    H --> K[Task 3: Separate dialogue turns Agent vs. Lead]
    H --> L[Task 4: Compute 0-100 quality score & CRM summary]
    I & J & K & L --> M[Save final data to PostgreSQL Database]
    M --> N[Refresh Web Portal via revalidatePath]
```

### Flow D: Bidirectional Zoho Bigin Integration
Under the **CRM Sync** section:
*   **Pull Action**: Pulls new contacts from Zoho Bigin `Contacts` module. Validates phone number and email fields to prevent duplicates before adding them to the PostgreSQL database.
*   **Push Action**: Evaluates local leads, checks Zoho Bigin by querying lead phone numbers, and exports unique local leads to Zoho Bigin.
*   **Simulated Sandbox Mode**: If environment variables for Zoho Bigin are empty, the app runs an interactive sandbox demonstration showing exact API behaviors using a mock client database.

---

## 🔑 5. Environment Variables & Double Configurations

You have two `.env` files because the project is split into two separate servers:

1.  **Root `.env` (Next.js Application)**: Configures the frontend, database connections, and AI integrations.
2.  **`twilio/.env` (Self-Hosted Telephony Wrapper)**: Configures the Express/Asterisk SIP gateway.

### A. Root `.env` Reference Table (Next.js)

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection URL with PgBouncer pooling (Supabase) | `postgresql://user:pass@aws-pooler.supabase.com:6543/db?pgbouncer=true` |
| `DIRECT_URL` | Direct connection URL to PostgreSQL bypass pooler | `postgresql://user:pass@aws.supabase.com:5432/db` |
| `JWT_SECRET` | Secret token used to sign session cookies for security | `any-secure-random-hash-string` |
| `OPENAI_API_KEY` | Key for Whisper Speech-to-Text and GPT-4o-mini analysis (can also use Groq `gsk_` keys) | `gsk_m9LPY25hWyCFhzHi...` |
| `USE_REAL_TWILIO` | Set to `true` to use Twilio REST API. Set to `false` for Mock Gateway. | `true` |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID credential (real or mock) | `AC84df279b243b304e6a...` |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token credential (real or mock) | `d795ac024a6c14b488...` |
| `APP_URL` | Public URL of the Next.js app (used for webhook callbacks) | `https://your-domain.vercel.app` (or `ngrok` url locally) |
| `ZOHO_CLIENT_ID` | OAuth Client ID from Zoho API Console | `1000.XXXXXXXXXX` |
| `ZOHO_CLIENT_SECRET` | OAuth Client Secret from Zoho API Console | `cb0656a17633d7...` |
| `ZOHO_REFRESH_TOKEN` | Offline Refresh Token from Zoho OAuth Flow | `1000.XXXXXXXX.XXXX` |
| `ZOHO_ACCOUNTS_URL` | Zoho Account Portal Regional URL | `https://accounts.zoho.in` (India) or `https://accounts.zoho.com` (US) |
| `ZOHO_API_URL` | Zoho APIs Regional Portal URL | `https://www.zohoapis.in` or `https://www.zohoapis.com` |

### B. `twilio/.env` Reference Table (Express.js SIP Service)

This file is **only** used if you run the custom SIP gateway wrapper in `twilio/`.

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `TELEPHONY_MODE` | How outbound calls are handled (`simulator`, `asterisk`, or `telnyx`) | `simulator` |
| `PORT` | Local port for Express web server | `5050` |
| `SIP_DOMAIN` | SIP host of your provider | `virpanix-nexus.pstn.twilio.com` |
| `SIP_USER` | SIP Auth username | `agent1` |
| `SIP_PASS` | SIP Auth password | `NexusPass123!` |
| `APP_URL` | Public URL of the gateway (port 5050 ngrok) | `https://abc-gateway.ngrok-free.app` |
| `NEXTJS_BACKEND_URL` | Next.js server address | `http://localhost:3000` |

---

## 🚀 6. Deployment Guide: How to Push to Vercel

Vercel is a serverless platform optimized for Next.js. Because of its serverless architecture, you must follow specific steps to deploy successfully.

### Step 1: Push Code to GitHub / GitLab / Bitbucket
1. Create a private repository.
2. Initialize Git in the root project:
   ```bash
   git init
   git add .
   git commit -m "Initialize project"
   ```
3. Link to your remote repository and push:
   ```bash
   git remote add origin https://github.com/your-username/your-repo.git
   git branch -M main
   git push -u origin main
   ```
   *(Note: `.gitignore` will automatically prevent `.env` and database temp files from uploading).*

### Step 2: Deploy Next.js to Vercel
1. Log into [Vercel](https://vercel.com).
2. Click **Add New** > **Project** and select your GitHub repository.
3. Keep default settings (Framework Preset: **Next.js**, Root Directory: **`./`**).
4. **CRITICAL: Configure Environment Variables**:
   Under **Environment Variables**, copy all key-value pairs from your **Root `.env`** file.
   *   Set `APP_URL` to your production URL (e.g., `https://your-app.vercel.app`).
   *   Ensure `DATABASE_URL` and `DIRECT_URL` point to your Supabase/PostgreSQL database.
5. Click **Deploy**.

### Step 3: Run Database Migrations on Production
Because Vercel is stateless, it won't run SQLite files or auto-create Postgres tables.
1. Make sure your local Prisma schema points to the production Supabase database (configured in your local `.env`).
2. Run the Prisma migration deploy command locally:
   ```bash
   npx prisma migrate deploy
   ```
   This will create all the required tables (`User`, `Lead`, `CallLog`, etc.) in Supabase.

### Step 4: Handle the `twilio/` Directory (Express Wrapper Server)
Vercel hosts serverless functions, meaning it **cannot run the Express/WebSocket SIP service** located in the `twilio/` folder.
*   **If using Real Twilio (`USE_REAL_TWILIO=true`)**:
    You do **not** need to deploy the `twilio/` folder. Next.js communicates directly with Twilio. You are ready to go!
*   **If using the Mock/SIP Gateway (`USE_REAL_TWILIO=false`)**:
    You must host the `twilio/` service on a container hosting platform like **Railway**, **Render**, or **Heroku**.
    1. Connect the `twilio/` directory as its own project on Render/Railway.
    2. Provide the variables from `twilio/.env`.
    3. Update the `MOCK_TWILIO_URL` in your Vercel Next.js dashboard variables to point to this new Railway/Render URL.

### ⚠️ Note on File Storage (WAV Call Recordings)
On Vercel, the file system is **read-only and ephemeral** (resets every time a function goes idle).
*   In `src/app/api/twilio/recording-callback/route.ts`, there is logic to download and write wav files to `public/recordings/`.
*   **On Vercel, this local write action will fail or be deleted shortly.**
*   **Solution**: Since the database stores the official Twilio URL `audioUrl` directly, the web console will still play the call audio from Twilio's public servers. If you require permanent local storage of recordings, you should modify the webhook logic to upload recordings to a cloud storage bucket (like **Amazon S3** or **Supabase Storage**) instead of `fs.writeFileSync`.
