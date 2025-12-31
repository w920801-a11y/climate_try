
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Cloud, Sun, CloudRain, Wind, Droplets, Thermometer, 
  MapPin, RefreshCw, Info, Shirt, Footprints, Calendar,
  ExternalLink, AlertCircle, Search, Navigation, ChevronDown, ChevronUp, Clock
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { WeatherData, Coordinates } from './types';
import { fetchWeatherWithAI } from './services/geminiService';

const App: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<{message: string, detail?: string, code?: number} | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showDetail, setShowDetail] = useState(false);
  
  // 倒數計時相關
  const [retryCountdown, setRetryCountdown] = useState<number>(0);
  const timerRef = useRef<number | null>(null);

  const startCountdown = (seconds: number) => {
    setRetryCountdown(seconds);
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

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
      const errorMsg = err.message || String(err);
      
      if (errorMsg.includes("429")) {
        setError({ 
          message: "API 請求太頻繁了 (429)", 
          detail: "這是因為 Gemini 免費方案對『即時搜尋』有嚴格限制。請休息一分鐘再試，或是前往 Google AI Studio 考慮開啟計費功能來解除限制。",
          code: 429
        });
        startCountdown(60); // 觸發 60 秒倒數
      } else if (errorMsg.includes("403")) {
        setError({ message: "金鑰權限錯誤 (403)", detail: "請確認您的 API Key 是否正確。若剛建立 Key，可能需要等待幾分鐘才會生效。", code: 403 });
      } else {
        setError({ message: "AI 暫時無法處理此請求", detail: errorMsg });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && retryCountdown === 0) {
      getWeatherData(searchQuery.trim());
    }
  };

  const tryGeolocation = () => {
    if (retryCountdown > 0) return;
    setLoading(true);
    setError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
          setLocation(coords);
          getWeatherData(coords);
        },
        (err) => {
          setError({ message: "定位權限遭拒", detail: "瀏覽器封鎖了定位要求，請手動搜尋城市。" });
          setLoading(false);
        }
      );
    } else {
      setError({ message: "瀏覽器不支援定位", detail: "請直接搜尋城市名稱。" });
      setLoading(false);
    }
  };

  useEffect(() => {
    tryGeolocation();
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, []);

  const getWeatherIcon = (condition: string) => {
    const c = (condition || '').toLowerCase();
    if (c.includes('晴') || c.includes('sun') || c.includes('clear')) return <Sun className="text-amber-400" size={48} />;
    if (c.includes('雨') || c.includes('rain') || c.includes('shower')) return <CloudRain className="text-blue-400" size={48} />;
    return <Cloud className="text-slate-400" size={48} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 text-center">
        <RefreshCw className="animate-spin text-blue-600 mb-4" size={56} />
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
              placeholder={retryCountdown > 0 ? `請稍候 ${retryCountdown} 秒...` : "輸入城市名稱 (例如：嘉義)"}
              disabled={retryCountdown > 0}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-12 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 shadow-sm transition-all text-slate-700 ${retryCountdown > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <Search className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
            <button 
              type="submit" 
              disabled={retryCountdown > 0}
              className={`absolute right-2 top-2 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors ${retryCountdown > 0 ? 'bg-slate-400 cursor-not-allowed' : ''}`}
            >
              {retryCountdown > 0 ? retryCountdown : '搜尋'}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-red-100/50 border border-red-50 text-center flex flex-col items-center">
            {error.code === 429 ? (
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6">
                <Clock className="text-amber-500" size={40} />
              </div>
            ) : (
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="text-red-500" size={40} />
              </div>
            )}
            
            <h2 className="text-xl font-bold text-slate-800 mb-3">{error.message}</h2>
            <p className="text-slate-500 text-sm max-w-md mb-8 leading-relaxed">
              {error.detail}
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center mb-6">
              <button 
                onClick={tryGeolocation} 
                disabled={retryCountdown > 0}
                className={`px-8 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-lg ${retryCountdown > 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'}`}
              >
                {retryCountdown > 0 ? (
                  <><Clock size={18} /> 冷卻中 ({retryCountdown}s)</>
                ) : (
                  <><Navigation size={18} /> 重新嘗試</>
                )}
              </button>
            </div>

            <button 
              onClick={() => setShowDetail(!showDetail)}
              className="flex items-center gap-1 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 hover:text-slate-600 transition-colors mx-auto"
            >
              {showDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              技術詳細資訊
            </button>
            {showDetail && (
              <div className="bg-slate-50 p-4 rounded-xl text-left font-mono text-[10px] text-slate-500 overflow-auto max-h-32 border border-slate-100 w-full max-w-md">
                {error.detail}
              </div>
            )}
          </div>
        )}

        {weatherData && (
          <>
            {/* Weather Card - Same as before but kept for completeness */}
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
                      <div className="text-2xl text-slate-500 font-bold mt-2">{weatherData.current.condition}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 md:flex md:gap-10 border-t md:border-t-0 md:border-l border-slate-100 pt-8 md:pt-0 md:pl-12">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold mb-2 uppercase tracking-widest"><Thermometer size={14} /> 體感</div>
                      <span className="text-2xl font-black text-slate-700">{weatherData.current.feelsLike}°</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold mb-2 uppercase tracking-widest"><Droplets size={14} /> 濕度</div>
                      <span className="text-2xl font-black text-slate-700">{weatherData.current.humidity}%</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold mb-2 uppercase tracking-widest"><Wind size={14} /> 風速</div>
                      <span className="text-2xl font-black text-slate-700">{weatherData.current.windSpeed}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold mb-2 uppercase tracking-widest"><Info size={14} /> UV</div>
                      <span className="text-2xl font-black text-slate-700">{weatherData.current.uvIndex}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 flex items-start gap-5">
                <Info className="text-white mt-1" size={24} />
                <p className="text-white text-lg leading-relaxed font-medium">{weatherData.aiInsight}</p>
              </div>
            </div>

            {/* Other components remain same... */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 text-emerald-600 mb-5">
                    <Shirt size={22} /> <h3 className="font-black text-lg">穿衣建議</h3>
                  </div>
                  <p className="text-slate-600 leading-relaxed italic">「{weatherData.clothingAdvice}」</p>
                </div>
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 text-orange-500 mb-5">
                    <Footprints size={22} /> <h3 className="font-black text-lg">活動指南</h3>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{weatherData.activityAdvice}</p>
                </div>
              </div>

              <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 text-blue-600 mb-8">
                  <Calendar size={22} /> <h3 className="font-black text-lg">氣溫趨勢</h3>
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weatherData.forecast}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }} />
                      <Area type="monotone" dataKey="high" name="最高" stroke="#3b82f6" strokeWidth={4} fill="#3b82f6" fillOpacity={0.1} />
                      <Area type="monotone" dataKey="low" name="最低" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 6" fill="transparent" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {weatherData.sources && (
              <div className="bg-slate-100/50 p-4 rounded-2xl text-[10px] text-slate-400">
                數據來源：{weatherData.sources.map(s => s.title).join(', ')}
              </div>
            )}
          </>
        )}
      </div>

      <footer className="mt-16 text-center text-slate-400 text-xs">
        <p>© 2024 Gemini Weather Assistant • 智慧生活 氣象先行</p>
      </footer>
    </div>
  );
};

export default App;
