
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Cloud, Sun, CloudRain, Wind, Droplets, Thermometer, 
  MapPin, RefreshCw, Info, Shirt, Footprints, Calendar,
  ExternalLink, AlertCircle, Search, Navigation
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { WeatherData, Coordinates } from './types';
import { fetchWeatherWithAI } from './services/geminiService';

const App: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<{message: string, isApiMissing?: boolean, isGeoDenied?: boolean} | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [location, setLocation] = useState<Coordinates | null>(null);
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
      console.error("Gemini API Error:", err);
      if (err.message?.includes("API_KEY_MISSING")) {
        setError({ message: "系統偵測不到 API 金鑰。請確認 Vercel 的環境變數已設定且已執行 Redeploy。", isApiMissing: true });
      } else {
        setError({ message: "AI 暫時無法取得天氣資訊。可能是因為輸入的城市名稱不正確，或 API 流量已達上限。" });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      getWeatherData(searchQuery.trim());
    }
  };

  const tryGeolocation = () => {
    setLoading(true);
    setError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = { 
            lat: position.coords.latitude, 
            lng: position.coords.longitude 
          };
          setLocation(coords);
          getWeatherData(coords);
        },
        (err) => {
          setError({ 
            message: "瀏覽器定位失敗。請檢查權限設定，或直接在下方搜尋城市。", 
            isGeoDenied: true 
          });
          setLoading(false);
        }
      );
    } else {
      setError({ message: "您的瀏覽器不支援定位功能，請直接搜尋城市。" });
      setLoading(false);
    }
  };

  useEffect(() => {
    tryGeolocation();
  }, [getWeatherData]);

  const getWeatherIcon = (condition: string) => {
    const c = condition.toLowerCase();
    if (c.includes('晴') || c.includes('sun') || c.includes('clear')) return <Sun className="text-amber-400" size={48} />;
    if (c.includes('雨') || c.includes('rain') || c.includes('shower')) return <CloudRain className="text-blue-400" size={48} />;
    return <Cloud className="text-slate-400" size={48} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 text-center">
        <div className="relative">
          <RefreshCw className="animate-spin text-blue-600 mb-4" size={56} />
          <Cloud className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-200" size={24} />
        </div>
        <h2 className="text-xl font-bold text-slate-700">Gemini 正在搜尋即時氣象...</h2>
        <p className="text-slate-500 mt-2 max-w-xs animate-pulse">正在整合 Google 搜尋數據與 AI 分析</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/50 p-4 rounded-3xl backdrop-blur-sm border border-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
              <Cloud size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">智感天氣預報</h1>
              <div className="flex items-center gap-1.5 text-blue-600 text-sm">
                <MapPin size={14} />
                <span>{weatherData?.locationName || '尚未取得位置'}</span>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleManualSearch} className="relative w-full md:w-80">
            <input 
              type="text" 
              placeholder="輸入城市名稱 (例如：台中、東京)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-12 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 shadow-sm transition-all text-slate-700"
            />
            <Search className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
            <button 
              type="submit"
              className="absolute right-2 top-2 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
            >
              搜尋
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-red-100/50 border border-red-50 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="text-red-500" size={40} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-3">{error.message}</h2>
            {error.isApiMissing && (
              <div className="bg-amber-50 text-amber-700 p-4 rounded-2xl text-sm mb-6 max-w-md">
                提示：如果您剛設定完 API_KEY，請務必點擊 Vercel 的 <strong>Redeploy</strong> 按鈕。
              </div>
            )}
            <div className="flex flex-wrap gap-4 justify-center">
              <button 
                onClick={tryGeolocation}
                className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-200"
              >
                <Navigation size={18} /> 重新啟動定位
              </button>
              <div className="w-full md:w-auto flex items-center gap-2 text-slate-400 text-sm">
                <span>或者在上方搜尋框輸入城市</span>
              </div>
            </div>
          </div>
        )}

        {weatherData && (
          <>
            {/* Current Weather Card */}
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-200/20 overflow-hidden border border-white">
              <div className="p-8 md:p-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
                  <div className="flex items-center gap-8">
                    <div className="p-6 bg-slate-50 rounded-3xl">
                      {getWeatherIcon(weatherData.current.condition)}
                    </div>
                    <div>
                      <div className="text-7xl font-black text-slate-900 flex items-start leading-none">
                        {weatherData.current.temp}
                        <span className="text-3xl font-bold text-blue-500 mt-2 ml-1">°C</span>
                      </div>
                      <div className="text-2xl text-slate-500 font-bold mt-2">
                        {weatherData.current.condition}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 md:flex md:gap-10 border-t md:border-t-0 md:border-l border-slate-100 pt-8 md:pt-0 md:pl-12">
                    <div className="flex flex-col items-center group">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 group-hover:text-blue-500 transition-colors">
                        <Thermometer size={14} /> 體感
                      </div>
                      <span className="text-2xl font-black text-slate-700">{weatherData.current.feelsLike}°</span>
                    </div>
                    <div className="flex flex-col items-center group">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 group-hover:text-blue-500 transition-colors">
                        <Droplets size={14} /> 濕度
                      </div>
                      <span className="text-2xl font-black text-slate-700">{weatherData.current.humidity}%</span>
                    </div>
                    <div className="flex flex-col items-center group">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 group-hover:text-blue-500 transition-colors">
                        <Wind size={14} /> 風速
                      </div>
                      <span className="text-2xl font-black text-slate-700 text-center leading-tight">{weatherData.current.windSpeed}<div className="text-[10px] font-normal opacity-50">km/h</div></span>
                    </div>
                    <div className="flex flex-col items-center group">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 group-hover:text-blue-500 transition-colors">
                        <Info size={14} /> UV 指數
                      </div>
                      <span className="text-2xl font-black text-slate-700">{weatherData.current.uvIndex}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 flex items-start gap-5">
                <div className="p-3 bg-white/20 rounded-2xl shrink-0 backdrop-blur-md">
                  <Info className="text-white" size={24} />
                </div>
                <div>
                  <h4 className="text-blue-100 text-xs font-black uppercase tracking-widest mb-1">AI 智慧分析</h4>
                  <p className="text-white text-base md:text-lg leading-relaxed font-medium">
                    {weatherData.aiInsight}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 text-emerald-600 mb-5">
                    <div className="p-2 bg-emerald-50 rounded-xl"><Shirt size={22} /></div>
                    <h3 className="font-black text-lg">穿衣建議</h3>
                  </div>
                  <p className="text-slate-600 text-sm md:text-base leading-relaxed font-medium italic">
                    「{weatherData.clothingAdvice}」
                  </p>
                </div>

                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 text-orange-500 mb-5">
                    <div className="p-2 bg-orange-50 rounded-xl"><Footprints size={22} /></div>
                    <h3 className="font-black text-lg">活動指南</h3>
                  </div>
                  <p className="text-slate-600 text-sm md:text-base leading-relaxed">
                    {weatherData.activityAdvice}
                  </p>
                </div>
              </div>

              <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3 text-blue-600">
                    <div className="p-2 bg-blue-50 rounded-xl"><Calendar size={22} /></div>
                    <h3 className="font-black text-lg">5 天氣溫趨勢</h3>
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">區域預測</div>
                </div>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weatherData.forecast}>
                      <defs>
                        <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#94a3b8', fontSize: 12, fontWeight: '600'}}
                        tickFormatter={(val) => val.split('-').slice(1).join('/')}
                      />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontWeight: 'bold' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="high" 
                        name="最高"
                        stroke="#3b82f6" 
                        strokeWidth={4}
                        fill="url(#colorHigh)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="low" 
                        name="最低"
                        stroke="#94a3b8" 
                        strokeWidth={2}
                        strokeDasharray="6 6"
                        fill="transparent"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {weatherData.sources && weatherData.sources.length > 0 && (
              <div className="bg-slate-200/30 p-5 rounded-2xl border border-dashed border-slate-300">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Info size={14} /> 資料與數據來源
                  </h4>
                </div>
                <div className="flex flex-wrap gap-3">
                  {weatherData.sources.map((source, idx) => (
                    <a 
                      key={idx} 
                      href={source.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-slate-500 hover:text-blue-600 flex items-center gap-2 bg-white/80 px-3 py-1.5 rounded-xl border border-slate-200 transition-all hover:translate-y-[-1px] hover:shadow-sm"
                    >
                      {source.title.substring(0, 25)}... <ExternalLink size={10} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <footer className="mt-16 text-center">
        <div className="inline-block p-1 bg-white rounded-full border border-slate-100 shadow-sm mb-4">
          <div className="px-4 py-1 text-[10px] font-black text-blue-400 uppercase tracking-widest">AI Powered by Gemini</div>
        </div>
        <p className="text-slate-400 text-xs font-medium">© 2024 Gemini Weather Assistant • 智慧生活 氣象先行</p>
      </footer>
    </div>
  );
};

export default App;
