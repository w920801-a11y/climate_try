
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Cloud, Sun, CloudRain, Wind, Droplets, MapPin, RefreshCw, Info, Shirt, Footprints, 
  Search, ChevronDown, ChevronUp, CheckCircle2, ShieldAlert, Key, Copy, Globe, ExternalLink, Sparkles, AlertTriangle, AlertCircle, ZapOff
} from 'lucide-react';
import { WeatherData, Coordinates } from './types';
import { fetchWeatherWithAI, testApiConnection } from './services/geminiService';

const App: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<{message: string, detail?: string, code?: number, type?: 'quota' | 'auth' | 'not_found' | 'general'} | null>(null);
  const [weatherData, setWeatherData] = useState<(WeatherData & { isRealtime: boolean }) | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const getWeatherData = useCallback(async (target: Coordinates | string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWeatherWithAI(
        typeof target === 'string' ? { lat: 0, lng: 0 } : target, 
        typeof target === 'string' ? target : undefined
      );
      setWeatherData(data);
    } catch (err: any) {
      console.error("Gemini Critical Error:", err);
      setError({ 
        message: "連線暫時中斷", 
        detail: "API 連線可能遇到問題，請檢查您的網路或金鑰狀態。 (" + (err.message || "Unknown") + ")",
        type: 'general'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => getWeatherData({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => getWeatherData("台北市")
        );
      } else {
        getWeatherData("台北市");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const getWeatherIcon = (condition: string) => {
    const c = (condition || '').toLowerCase();
    if (c.includes('晴')) return <Sun className="text-amber-400" size={48} />;
    if (c.includes('雨')) return <CloudRain className="text-blue-400" size={48} />;
    return <Cloud className="text-slate-400" size={48} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
        <RefreshCw className="animate-spin text-blue-600 mb-6" size={48} />
        <p className="text-slate-500 font-black animate-pulse text-lg tracking-wider">正在調研即時天氣資料...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Navbar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-white shadow-sm sticky top-4 z-50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg shadow-blue-200">
              <Cloud size={20} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">智感天氣預報</h1>
              <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-full text-slate-400">v2.0韌性版</span>
            </div>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); getWeatherData(searchQuery); }} className="relative w-full md:w-72">
            <input 
              type="text" 
              placeholder="搜尋城市 (如：嘉義, 高雄)..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-100/50 rounded-2xl border-none focus:ring-2 focus:ring-blue-200 text-sm transition-all"
            />
            <Search className="absolute left-4 top-3.5 text-slate-400" size={16} />
          </form>
        </div>

        {error && (
          <div className="bg-white p-8 md:p-14 rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mb-8 ring-8 bg-red-50 ring-red-50/50">
              <ShieldAlert className="text-red-500" size={48} />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">{error.message}</h2>
            <div className="bg-slate-50 p-6 rounded-3xl mb-10 w-full max-w-lg border border-slate-100">
               <p className="text-slate-600 font-medium leading-relaxed">{error.detail}</p>
            </div>
            <button 
                onClick={() => getWeatherData("台北市")}
                className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 group"
              >
                <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" /> 
                嘗試重啟連線
            </button>
          </div>
        )}

        {weatherData && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* 降級模式提示 */}
            {!weatherData.isRealtime && (
              <div className="bg-amber-50 border border-amber-200 p-5 rounded-[2rem] mb-8 flex items-start gap-4 text-amber-900">
                <div className="bg-amber-400/20 p-2 rounded-xl shrink-0"><ZapOff size={20} /></div>
                <div>
                  <p className="font-black text-sm mb-1">配額限制模式</p>
                  <p className="text-xs opacity-80 leading-relaxed font-medium">目前 Google 搜尋工具已達上限，系統已自動切換至「AI 預測模式」。資料為 AI 根據歷史規律產生，若要恢復即時查詢，請於 24 小時後再試。</p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden mb-8">
              <div className="p-10 md:p-14 flex flex-col md:flex-row justify-between items-center gap-10">
                <div className="flex items-center gap-8">
                  <div className="p-7 bg-slate-50 rounded-[2.5rem] shadow-inner">{getWeatherIcon(weatherData.current.condition)}</div>
                  <div>
                    <h2 className="text-7xl font-black text-slate-900 leading-none tracking-tighter">{weatherData.current.temp}°C</h2>
                    <p className="text-slate-400 font-bold mt-4 text-xl tracking-wide">{weatherData.current.condition}</p>
                    <div className="flex items-center gap-2 text-blue-600 text-sm mt-3 font-black bg-blue-50 px-3 py-1.5 rounded-full w-fit">
                      <MapPin size={14} /> {weatherData.locationName}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-5 w-full md:w-auto">
                   <div className="bg-slate-50 p-6 rounded-3xl text-center min-w-[120px]">
                     <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">濕度</p>
                     <p className="text-2xl font-black text-slate-700">{weatherData.current.humidity}%</p>
                   </div>
                   <div className="bg-slate-50 p-6 rounded-3xl text-center min-w-[120px]">
                     <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">體感</p>
                     <p className="text-2xl font-black text-slate-700">{weatherData.current.feelsLike}°</p>
                   </div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 md:p-12 flex items-start gap-5">
                <div className="bg-white/20 p-2 rounded-xl text-white"><Info size={24} /></div>
                <p className="text-white font-bold text-lg leading-relaxed">{weatherData.aiInsight}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-lg shadow-slate-100 group hover:border-emerald-200 transition-colors">
                  <div className="flex items-center gap-3 text-emerald-600 mb-6 font-black text-xl">
                    <div className="bg-emerald-50 p-2 rounded-lg group-hover:scale-110 transition-transform"><Shirt size={24} /></div>
                    穿衣策略
                  </div>
                  <p className="text-slate-600 text-lg leading-relaxed font-medium">「{weatherData.clothingAdvice}」</p>
               </div>
               <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-lg shadow-slate-100 group hover:border-orange-200 transition-colors">
                  <div className="flex items-center gap-3 text-orange-500 mb-6 font-black text-xl">
                    <div className="bg-orange-50 p-2 rounded-lg group-hover:scale-110 transition-transform"><Footprints size={24} /></div>
                    活動建議
                  </div>
                  <p className="text-slate-600 text-lg leading-relaxed font-medium">{weatherData.activityAdvice}</p>
               </div>
            </div>

            {weatherData.sources && weatherData.sources.length > 0 && (
              <div className="mt-8 bg-white p-8 rounded-[2rem] border border-slate-100">
                <h4 className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Globe size={14} /> 資料來源與參考連結
                </h4>
                <div className="flex flex-wrap gap-2">
                  {weatherData.sources.map((source, idx) => (
                    <a 
                      key={idx} 
                      href={source.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-50 text-blue-600 rounded-full text-xs font-bold hover:bg-blue-50 transition-colors border border-slate-100"
                    >
                      {source.title} <ExternalLink size={12} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
