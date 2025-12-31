
import { GoogleGenAI, Type } from "@google/genai";
import { WeatherData, Coordinates } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const fetchWeatherWithAI = async (coords: Coordinates): Promise<WeatherData> => {
  const prompt = `
    Find the current precise weather and 5-day forecast for coordinates: ${coords.lat}, ${coords.lng}.
    Act as a professional meteorologist. Return a strictly valid JSON object in Traditional Chinese (Taiwan).
    
    The JSON structure must be:
    {
      "locationName": "City/District Name",
      "current": {
        "temp": number,
        "condition": "Condition like Sunny, Rainy, etc.",
        "humidity": number,
        "windSpeed": number,
        "feelsLike": number,
        "uvIndex": number
      },
      "forecast": [
        { "date": "YYYY-MM-DD", "high": number, "low": number, "condition": "Condition" }
      ],
      "aiInsight": "A brief summary of today's weather patterns.",
      "clothingAdvice": "Specific advice on what to wear today.",
      "activityAdvice": "Advice on outdoor activities based on weather."
    }
    
    Ensure all temperatures are in Celsius.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      },
    });

    const jsonStr = response.text || '{}';
    const parsedData = JSON.parse(jsonStr);
    
    // Extract search grounding sources
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || 'Weather Source',
      uri: chunk.web?.uri || '#'
    })) || [];

    return {
      ...parsedData,
      lastUpdated: new Date().toLocaleTimeString('zh-TW'),
      sources: sources
    };
  } catch (error) {
    console.error("Error fetching weather with Gemini:", error);
    throw error;
  }
};
