export async function getWeather({location}: {location: string}): Promise<string> {
  try {
    const response = await fetch(`/api/weather?location=${location}`);
    if (response.ok) {
      const weatherData = await response.json();
      return JSON.stringify(weatherData);
    } else {
      return JSON.stringify({ error: `Error: ${response.statusText}` });
    }
  } catch (error) {
    return JSON.stringify({ error: `Error: ${error}` });
  }
}
