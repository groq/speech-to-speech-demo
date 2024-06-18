import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

export async function GET(request: Request) {
  const session = await getServerSession();

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const location = searchParams.get('location');

  if (!location) {
    return NextResponse.json({ error: "Location is required" }, { status: 400 });
  }

  const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${location}`);
  const geoData = await geoResponse.json();

  if (!geoData.results || geoData.results.length === 0) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  const { latitude, longitude, name } = geoData.results[0];

  const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max`);
  const weatherData = await weatherResponse.json();

  const filteredWeatherData = {
    city: name,
    date: weatherData.daily.time[0],
    temperature_2m_max: weatherData.daily.temperature_2m_max[0]
  };

  return NextResponse.json(filteredWeatherData);
}
