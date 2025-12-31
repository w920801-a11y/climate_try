
import { GoogleGenAI, Type } from "@google/genai";
import { WeatherData, Coordinates } from "../types";

export const fetchWeatherWithAI = async (coords: Coordinates): Promise<WeatherData> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API_KEY_MISSING: 請在 Vercel Environment Variables 中設定 API_KEY");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    請查詢座標 (${coords.lat}, ${coords.lng}) 的目前精確天氣及未來 5 天預報。
    你是一位專業的氣象主播。請務必返回一個符合以下結構的 JSON 物件（繁體中文）：
    {
      "locationName": "地名（如：台北市信義區）",
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
    if (!text) throw new Error("AI 未能返回內容");
    
    const parsedData = JSON.parse(text);
    
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || '來源',
      uri: chunk.web?.uri || '#'
    })) || [];

    return {
      ...parsedData,
      lastUpdated: new Date().toLocaleTimeString('zh-TW'),
      sources: sources
    };
  } catch (error: any) {
    console.error("Gemini API 錯誤詳情:", error);
    // 如果是 Google Search Grounding 失敗，嘗試不帶工具重試一次
    if (error.message?.includes("grounding")) {
       console.log("重試不帶 Search Grounding...");
       // 此處可擴充簡易重試邏輯
    }
    throw error;
  }
};
