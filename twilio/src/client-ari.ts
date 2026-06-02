import WebSocket from "ws";
import axios from "axios";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { parseTwiML, TwiMLAction } from "./twiml-parser";

const ASTERISK_HOST = process.env.ASTERISK_HOST || "asterisk";
const ASTERISK_PORT = process.env.ASTERISK_PORT || "8088";
const ARI_USER = process.env.ASTERISK_USER || "bpo_ari";
const ARI_PASS = process.env.ASTERISK_PASS || "bpo_ari_secret";
const APP_NAME = "bpo-voice-app";

const ARI_WS_URL = `ws://${ASTERISK_HOST}:${ASTERISK_PORT}/ari/events?api_key=${ARI_USER}:${ARI_PASS}&app=${APP_NAME}`;
const ARI_HTTP_BASE = `http://${ASTERISK_HOST}:${ASTERISK_PORT}/ari`;

// Directory to store audio files
const RECORDINGS_DIR = path.join(process.cwd(), "recordings");
const TTS_CACHE_DIR = path.join(RECORDINGS_DIR, "tts_cache");

// Ensure directories exist
if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}
if (!fs.existsSync(TTS_CACHE_DIR)) {
  fs.mkdirSync(TTS_CACHE_DIR, { recursive: true });
}

// Track active call states
interface CallState {
  channelId: string;
  leadId: string;
  lang: string;
  userId: string;
  callbackUrl: string;
  actions: TwiMLAction[];
  currentActionIndex: number;
  recordingName?: string;
  duration?: number;
  isCompleted: boolean;
}

const activeCalls = new Map<string, CallState>();

export function startARIClient() {
  console.log(`[ARI] Connecting to Asterisk events on ${ARI_WS_URL}...`);
  const ws = new WebSocket(ARI_WS_URL);

  ws.on("open", () => {
    console.log("[ARI] WebSocket connection established successfully.");
  });

  ws.on("message", async (data) => {
    try {
      const event = JSON.parse(data.toString());
      await handleARIEvent(event);
    } catch (err) {
      console.error("[ARI] Error processing event message:", err);
    }
  });

  ws.on("close", () => {
    console.warn("[ARI] Connection closed. Reconnecting in 5 seconds...");
    setTimeout(startARIClient, 5000);
  });

  ws.on("error", (err) => {
    console.error("[ARI] WebSocket error:", err.message);
  });
}

async function handleARIEvent(event: any) {
  const channelId = event.channel?.id;
  if (!channelId) return;

  switch (event.type) {
    case "StasisStart":
      console.log(`[ARI] Call entered Stasis application. Channel: ${channelId}`);
      
      // Parse arguments passed during call origination
      const argsString = event.args?.[0] || "";
      const params = new URLSearchParams(argsString);
      const leadId = params.get("leadId") || "";
      const lang = params.get("lang") || "English";
      const userId = params.get("userId") || "";
      const callbackUrl = params.get("callbackUrl") || "";

      // Initialize call state
      const state: CallState = {
        channelId,
        leadId,
        lang,
        userId,
        callbackUrl,
        actions: [],
        currentActionIndex: 0,
        isCompleted: false
      };
      activeCalls.set(channelId, state);

      // Start executing the TwiML flow
      await executeNextAction(channelId);
      break;

    case "PlaybackFinished":
      console.log(`[ARI] Playback finished for channel ${channelId}`);
      const playbackState = activeCalls.get(channelId);
      if (playbackState && !playbackState.isCompleted) {
        playbackState.currentActionIndex++;
        await executeNextAction(channelId);
      }
      break;

    case "RecordingFinished":
      console.log(`[ARI] Recording finished for channel ${channelId}`);
      const recState = activeCalls.get(channelId);
      if (recState && !recState.isCompleted) {
        const recordingDuration = event.recording?.duration || 0;
        recState.duration = recordingDuration;
        recState.currentActionIndex++;
        await executeNextAction(channelId);
      }
      break;

    case "StasisEnd":
      console.log(`[ARI] Call left Stasis. Channel: ${channelId}`);
      const finalState = activeCalls.get(channelId);
      if (finalState) {
        finalState.isCompleted = true;
        await handleCallCleanup(finalState);
        activeCalls.delete(channelId);
      }
      break;
  }
}

async function executeNextAction(channelId: string) {
  const state = activeCalls.get(channelId);
  if (!state) return;

  // If actions are not loaded yet, fetch TwiML from Next.js
  if (state.actions.length === 0) {
    try {
      const nextjsUrl = `${process.env.NEXTJS_BACKEND_URL || "http://localhost:3000"}/api/twilio/voice?leadId=${state.leadId}&lang=${state.lang}`;
      console.log(`[ARI] Fetching TwiML instructions from Next.js: ${nextjsUrl}`);
      const response = await axios.get(nextjsUrl);
      state.actions = await parseTwiML(response.data);
      console.log(`[ARI] Parsed ${state.actions.length} actions:`, state.actions);
    } catch (err: any) {
      console.error("[ARI] Failed to fetch TwiML from Next.js:", err.message);
      await hangupChannel(channelId);
      return;
    }
  }

  // Check if we finished all actions
  if (state.currentActionIndex >= state.actions.length) {
    console.log(`[ARI] All TwiML actions executed. Hanging up channel ${channelId}`);
    await hangupChannel(channelId);
    return;
  }

  const action = state.actions[state.currentActionIndex];
  console.log(`[ARI] Executing action [${state.currentActionIndex + 1}/${state.actions.length}]:`, action);

  try {
    switch (action.type) {
      case "say":
        if (action.text) {
          const soundPath = await getOrCreateTTSFile(action.text, action.language || "en-US");
          // Play sound. Note: Asterisk expects the media path without extensions relative to spool dir
          // We map it to sound:/var/spool/asterisk/monitor/tts_cache/filename
          const soundFile = `sound:/var/spool/asterisk/monitor/tts_cache/${path.basename(soundPath, ".wav")}`;
          await playMedia(channelId, soundFile);
        } else {
          state.currentActionIndex++;
          await executeNextAction(channelId);
        }
        break;

      case "record":
        const recordingName = `${channelId}_rec`;
        state.recordingName = recordingName;
        // Asterisk ARI channels/record starts recording
        await recordChannel(channelId, recordingName, action.maxLength || 60, action.playBeep || true);
        break;

      case "hangup":
        await hangupChannel(channelId);
        break;

      default:
        console.warn(`[ARI] Unknown action type: ${action.type}. Skipping...`);
        state.currentActionIndex++;
        await executeNextAction(channelId);
    }
  } catch (err: any) {
    console.error(`[ARI] Error executing action on channel ${channelId}:`, err.message);
    await hangupChannel(channelId);
  }
}

// Play Media REST call
async function playMedia(channelId: string, mediaUri: string) {
  await axios.post(
    `${ARI_HTTP_BASE}/channels/${channelId}/play`,
    { media: mediaUri },
    { auth: { username: ARI_USER, password: ARI_PASS } }
  );
}

// Record Channel REST call
async function recordChannel(channelId: string, name: string, maxDuration: number, beep: boolean) {
  await axios.post(
    `${ARI_HTTP_BASE}/channels/${channelId}/record`,
    {
      name,
      format: "wav",
      maxDuration,
      beep,
      ifExists: "overwrite"
    },
    { auth: { username: ARI_USER, password: ARI_PASS } }
  );
}

// Hangup Channel REST call
async function hangupChannel(channelId: string) {
  try {
    await axios.delete(`${ARI_HTTP_BASE}/channels/${channelId}`, {
      auth: { username: ARI_USER, password: ARI_PASS }
    });
  } catch (err: any) {
    // Channel might already be hung up
  }
}

// Trigger Outbound call
export async function originateOutboundCall(toPhone: string, fromCallerId: string, leadId: string, lang: string, userId: string) {
  const channelId = `call_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const sipDomain = process.env.SIP_DOMAIN || "";
  
  // Format destination URI via our registered SIP Trunk endpoint
  // Format: PJSIP/sip_trunk_endpoint/sip:number@domain
  const endpoint = `PJSIP/sip_trunk_endpoint/sip:${toPhone}@${sipDomain}`;
  const appArgs = `leadId=${leadId}&lang=${lang}&userId=${userId}&callbackUrl=/api/twilio/recording-callback`;

  console.log(`[ARI] Originating outbound call to ${endpoint} with channelId ${channelId}`);
  
  try {
    await axios.post(
      `${ARI_HTTP_BASE}/channels`,
      {
        endpoint,
        app: APP_NAME,
        appArgs,
        callerId: fromCallerId,
        channelId
      },
      { auth: { username: ARI_USER, password: ARI_PASS } }
    );
    return { success: true, callSid: channelId };
  } catch (err: any) {
    console.error("[ARI] Failed to originate call:", err.response?.data || err.message);
    throw new Error(err.response?.data?.message || "Failed to initiate call via SIP Trunk");
  }
}

// Cleanup and hit the callback API
async function handleCallCleanup(state: CallState) {
  if (state.recordingName) {
    const recordingFilename = `${state.recordingName}.wav`;
    const localRecordingPath = path.join(RECORDINGS_DIR, recordingFilename);

    if (fs.existsSync(localRecordingPath)) {
      console.log(`[ARI] Call completed. Recording saved locally: ${localRecordingPath}`);

      // Expose this file on our local Twilio wrapper IP/URL
      const appUrl = process.env.APP_URL || `http://localhost:5050`;
      const recordingUrl = `${appUrl}/recordings/${recordingFilename}`;

      if (state.callbackUrl) {
        const nextjsCallback = `${process.env.NEXTJS_BACKEND_URL || "http://localhost:3000"}${state.callbackUrl}`;
        console.log(`[ARI] Sending recording callback to Next.js: ${nextjsCallback}`);

        try {
          const form = new URLSearchParams();
          form.append("RecordingUrl", recordingUrl);
          form.append("RecordingDuration", String(state.duration || 0));
          form.append("CallSid", state.channelId);

          await axios.post(nextjsCallback, form, {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded"
            }
          });
          console.log("[ARI] Next.js recording callback completed successfully.");
        } catch (err: any) {
          console.error("[ARI] Next.js callback failed:", err.message);
        }
      }
    } else {
      console.warn(`[ARI] Recording was expected, but file not found: ${localRecordingPath}`);
    }
  }
}

// Helper to generate Google Translate TTS and transcode via ffmpeg
async function getOrCreateTTSFile(text: string, languageCode: string): Promise<string> {
  const sanitizeText = text.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
  const lang = getGoogleLangCode(languageCode);
  const cacheFilename = `tts_${lang}_${sanitizeText}.wav`;
  const cachePath = path.join(TTS_CACHE_DIR, cacheFilename);

  if (fs.existsSync(cachePath)) {
    return cachePath; // Play from cache
  }

  const tempMp3 = path.join(TTS_CACHE_DIR, `temp_${Date.now()}.mp3`);
  
  // Download MP3 from Google Translate TTS API
  console.log(`[TTS] Requesting Google Translate TTS for text: "${text}" [lang: ${lang}]`);
  const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(text)}`;
  
  const response = await axios.get(ttsUrl, { responseType: "arraybuffer" });
  fs.writeFileSync(tempMp3, Buffer.from(response.data));

  // Transcode MP3 to Asterisk wav (Format: 8000Hz mono PCM 16-bit WAV)
  return new Promise((resolve, reject) => {
    console.log(`[TTS] Transcoding MP3 to Asterisk WAV via ffmpeg...`);
    const cmd = `ffmpeg -y -i "${tempMp3}" -ar 8000 -ac 1 -f wav "${cachePath}"`;
    exec(cmd, (error) => {
      // Clean up temporary MP3
      if (fs.existsSync(tempMp3)) fs.unlinkSync(tempMp3);

      if (error) {
        console.error("[TTS] ffmpeg transcoding failed:", error);
        return reject(error);
      }

      console.log(`[TTS] Voice file cached successfully: ${cachePath}`);
      resolve(cachePath);
    });
  });
}

function getGoogleLangCode(twilioLang: string): string {
  const code = twilioLang.split("-")[0].toLowerCase();
  if (["es", "hi", "fr", "de", "ta"].includes(code)) {
    return code;
  }
  return "en";
}
