import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const keys = {
  groqApiKey: process.env.GROQ_API_KEY,
  audioGroqApiKey: process.env.AUDIO_GROQ_API_KEY,
  cartesiaApiKey: process.env.CARTESIA_API_KEY,
};

export async function GET(req: any) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(keys);
}
