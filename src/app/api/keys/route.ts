import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

const keys = {
  groqApiKey: process.env.GROQ_API_KEY,
  audioGroqApiKey: process.env.AUDIO_GROQ_API_KEY,
  cartesiaApiKey: process.env.CARTESIA_API_KEY,
};

export async function GET() {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(keys);
}
