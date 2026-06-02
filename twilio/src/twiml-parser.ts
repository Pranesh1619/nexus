import xml2js from "xml2js";

export interface TwiMLAction {
  type: "say" | "record" | "hangup" | "dial" | "unknown";
  text?: string;
  voice?: string;
  language?: string;
  maxLength?: number;
  playBeep?: boolean;
  recordingStatusCallback?: string;
}

export async function parseTwiML(xmlText: string): Promise<TwiMLAction[]> {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xmlText, { explicitArray: false }, (err, result) => {
      if (err) {
        return reject(err);
      }

      const actions: TwiMLAction[] = [];
      const response = result?.Response;

      if (!response) {
        return resolve([]);
      }

      // Convert single element or array of elements to standard array
      const elements = Array.isArray(response)
        ? response
        : Object.keys(response).flatMap((key) => {
            const val = response[key];
            const items = Array.isArray(val) ? val : [val];
            return items.map((item) => ({ tag: key, item }));
          });

      // Handle raw parsed elements
      const parsedItems = Array.isArray(response) ? response : [];
      
      // If we got elements by key mapping (explicitArray: false results in { Say: {...}, Record: {...} })
      const normalizedElements: { tag: string; data: any }[] = [];
      
      if (response.Say) {
        const says = Array.isArray(response.Say) ? response.Say : [response.Say];
        says.forEach((s: any) => normalizedElements.push({ tag: "Say", data: s }));
      }
      if (response.Record) {
        const records = Array.isArray(response.Record) ? response.Record : [response.Record];
        records.forEach((r: any) => normalizedElements.push({ tag: "Record", data: r }));
      }
      if (response.Dial) {
        const dials = Array.isArray(response.Dial) ? response.Dial : [response.Dial];
        dials.forEach((d: any) => normalizedElements.push({ tag: "Dial", data: d }));
      }
      if (response.Hangup) {
        normalizedElements.push({ tag: "Hangup", data: {} });
      }

      normalizedElements.forEach((el) => {
        if (el.tag === "Say") {
          const text = typeof el.data === "string" ? el.data : el.data._ || el.data;
          const attrs = el.data.$ || {};
          actions.push({
            type: "say",
            text,
            voice: attrs.voice || "Polly.Brian-Neural",
            language: attrs.language || "en-US",
          });
        } else if (el.tag === "Record") {
          const attrs = el.data.$ || {};
          actions.push({
            type: "record",
            maxLength: parseInt(attrs.maxLength) || 60,
            playBeep: attrs.playBeep !== "false",
          });
        } else if (el.tag === "Dial") {
          const attrs = el.data.$ || {};
          actions.push({
            type: "dial",
            recordingStatusCallback: attrs.recordingStatusCallback || attrs.RecordingStatusCallback || "",
          });
        } else if (el.tag === "Hangup") {
          actions.push({ type: "hangup" });
        }
      });

      resolve(actions);
    });
  });
}
