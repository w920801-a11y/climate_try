
import { GoogleGenAI, Type } from "@google/genai";
import { WeatherData, Coordinates } from "../types";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const testApiConnection = async (): Promise<boolean> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return false;
  try {
    /* Always instantiate GoogleGenAI with named apiKey parameter */
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Hi, respond with 'OK' if you can hear me.",
    });
    return response.text.includes("OK");
  } catch (e) {
    console.error("Test connection failed:", e);
    return false;
  }
};

export const fetchWeatherWithAI = async (coords: Coordinates, cityName?: string, retries = 1): Promise<WeatherData> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY_MISSING");

  /* Instantiate the client right before usage to ensure current API key is used */
  const ai = new GoogleGenAI({ apiKey });
  const locationDesc = cityName ? `城市：${cityName}` : `座標：(${coords.lat}, ${coords.lng})`;
  
  const prompt = `
    請查詢 ${locationDesc} 的目前精確天氣及未來 5 天預報。
    你是一位專業的氣象主播。請務必返回一個符合以下結構的 JSON 物件（繁體中文）：
    {
      "locationName": "地名",
      "current": { "temp": 數字, "condition": "天氣狀況", "humidity": 數字, "windSpeed": 數字, "feelsLike": 數字, "uvIndex": 數字 },
      "forecast": [ { "date": "YYYY-MM-DD", "high": 數字, "low": 數字, "condition": "狀況" } ],
      "aiInsight": "今日天氣概況總結",
      "clothingAdvice": "穿衣建議",
      "activityAdvice": "活動建議"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        /* Enforce response structure using responseSchema as recommended */
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            locationName: { type: Type.STRING },
            current: {
              type: Type.OBJECT,
              properties: {
                temp: { type: Type.NUMBER },
                condition: { type: Type.STRING },
                humidity: { type: Type.NUMBER },
                windSpeed: { type: Type.NUMBER },
                feelsLike: { type: Type.NUMBER },
                uvIndex: { type: Type.NUMBER }
              },
              required: ["temp", "condition", "humidity", "windSpeed", "feelsLike", "uvIndex"]
            },
            forecast: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING },
                  high: { type: Type.NUMBER },
                  low: { type: Type.NUMBER },
                  condition: { type: Type.STRING }
                },
                required: ["date", "high", "low", "condition"]
              }
            },
            aiInsight: { type: Type.STRING },
            clothingAdvice: { type: Type.STRING },
            activityAdvice: { type: Type.STRING }
          },
          required: ["locationName", "current", "forecast", "aiInsight", "clothingAdvice", "activityAdvice"]
        }
      },
    });

    const text = response.text;
    if (!text) throw new Error("AI_EMPTY_RESPONSE");
    
    const parsedData = JSON.parse(text);
    /* Comply with Search Grounding requirements: extract URLs from groundingChunks */
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || '氣象來源',
      uri: chunk.web?.uri || '#'
    })) || [];

    return {
      ...parsedData,
      lastUpdated: new Date().toLocaleTimeString('zh-TW'),
      sources: sources
    };
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    
    // 檢查是否為搜尋工具特定的 429
    if (errorMsg.includes("429")) {
      // 如果還有重試機會，等待後重試
      if (retries > 0) {
        await delay(2000);
        return fetchWeatherWithAI(coords, cityName, retries - 1);
      }
      throw new Error("SEARCH_QUOTA_EXCEEDED");
    }
    
    throw error;
  }
};
