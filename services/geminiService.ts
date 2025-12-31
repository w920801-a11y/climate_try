
import { GoogleGenAI, Type } from "@google/genai";
import { WeatherData, Coordinates } from "../types";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const fetchWeatherWithAI = async (coords: Coordinates, cityName?: string, retries = 1): Promise<WeatherData> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  const ai = new GoogleGenAI({ apiKey });
  const locationDesc = cityName ? `城市：${cityName}` : `座標：(${coords.lat}, ${coords.lng})`;
  
  const prompt = `
    請查詢 ${locationDesc} 的目前精確天氣及未來 5 天預報。
    你是一位專業的氣象主播。請務必返回一個符合以下結構的 JSON 物件（繁體中文）：
    {
      "locationName": "地名（如：嘉義市）",
      "current": {
        "temp": 數字,
        "condition": "天氣狀況",
        "humidity": 數字,
        "windSpeed": 數字,
        "feelsLike": 數字,
        "uvIndex": 數字
      },
      "forecast": [
        { "date": "YYYY-MM-DD", "high": 數字, "low": 數字, "condition": "狀況" }
      ],
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
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty AI response");
    
    const parsedData = JSON.parse(text);
    
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || '數據來源',
      uri: chunk.web?.uri || '#'
    })) || [];

    return {
      ...parsedData,
      lastUpdated: new Date().toLocaleTimeString('zh-TW'),
      sources: sources
    };
  } catch (error: any) {
    // 如果是 429 且還有重試次數，等待 2 秒再試一次
    if (error.message?.includes("429") && retries > 0) {
      await delay(2000);
      return fetchWeatherWithAI(coords, cityName, retries - 1);
    }
    throw error;
  }
};
