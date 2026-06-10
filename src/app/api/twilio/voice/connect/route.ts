import { POST as voiceConnectPOST, GET as voiceConnectGET } from "../../voice-connect/route";

export async function POST(request: Request) {
  return voiceConnectPOST(request);
}

export async function GET(request: Request) {
  return voiceConnectGET(request);
}
