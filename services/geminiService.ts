
import { GoogleGenAI, Type } from "@google/genai";
import { WeatherData, Coordinates } from "../types";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// 測試 API 是否存活
export const testApiConnection = async (): Promise<boolean> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return false;
  try {
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
    // 統一使用 gemini-3-flash-preview，確保模型 ID 正確
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) throw new Error("AI_EMPTY_RESPONSE");
    
    const parsedData = JSON.parse(text);
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
    
    // 處理 429 頻率限制
    if (errorMsg.includes("429") && retries > 0) {
      await delay(2000);
      return fetchWeatherWithAI(coords, cityName, retries - 1);
    }
    
    // 拋出原始錯誤以便 App.tsx 處理
    throw error;
  }
};
