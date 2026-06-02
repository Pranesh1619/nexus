# 📞 Self-Hosted Twilio API & Asterisk SIP Gateway

This service is a self-hosted wrapper that allows your Next.js application to route outbound calls, play greetings, and record responses directly through your own **SIP Trunk** instead of paying Twilio's per-minute usage fees.

It exposes the exact same REST API structure that the Twilio Client SDK uses, serving as a drop-in replacement.

---

## 🚀 How to Run the Gateway (Local Testing)

### 1. Configure Credentials
Copy the `.env` template or edit `twilio/.env` and replace the placeholders with your active SIP trunk credentials:
*   `SIP_DOMAIN`: The SIP domain/host of your provider (e.g. `phone.provider.com`).
*   `SIP_USER`: Your authentication username.
*   `SIP_PASS`: Your authentication password.

### 2. Set Up a Local Tunnel (For Call Webhooks)
Asterisk needs to retrieve call instructions (TwiML XML) from your Next.js application, and your Next.js application needs to receive recording files from Asterisk.
To test this locally on your machine, you must expose both services to the internet:
1. Run **ngrok** (or localtunnel) to expose Next.js (port 3000):
   ```bash
   ngrok http 3000
   ```
2. Run **ngrok** to expose this Twilio Gateway (port 5050):
   ```bash
   ngrok http 5050
   ```
3. Update the `.env` files:
   *   In your **Next.js root `.env`**:
       *   Set `MOCK_TWILIO_URL` to your port 5050 ngrok address (e.g. `MOCK_TWILIO_URL=https://abc-gateway.ngrok-free.app`).
       *   Set `APP_URL` to your port 3000 ngrok address (e.g. `APP_URL=https://xyz-nextjs.ngrok-free.app`).
   *   In your **`twilio/.env`**:
       *   Set `APP_URL` to your port 5050 ngrok address (e.g. `APP_URL=https://abc-gateway.ngrok-free.app`).

### 3. Start the Docker Stack
Run this command from the `twilio` directory to build and launch Asterisk and the Node.js API server:
```bash
docker-compose up --build -d
```

---

## 🛠️ Network Router & Port Forwarding Configuration
For calls to connect and route audio successfully:
1.  **SIP Protocol Port:** Forward port `5060` (UDP and TCP) from your public IP to your developer computer running Docker.
2.  **RTP Voice Stream Ports:** Forward ports `10000-10099` (UDP) to your computer. These handle the actual audio packets.

---

## 📁 File Structure & Call Logs
*   **TTS Cache:** Voice greetings generated from TwiML `<Say>` tags are cached under `twilio/recordings/tts_cache/` in `.wav` format.
*   **Call Recordings:** Completed call recordings are written as WAV files under `twilio/recordings/` (e.g., `call_1234_rec.wav`) and automatically POSTed to Next.js for transcription.
