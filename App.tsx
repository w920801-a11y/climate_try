
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Cloud, Sun, CloudRain, Wind, Droplets, Thermometer, 
  MapPin, RefreshCw, Info, Shirt, Footprints, Calendar,
  ExternalLink, AlertCircle, Search, Navigation, ChevronDown, ChevronUp, Clock, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { WeatherData, Coordinates } from './types';
import { fetchWeatherWithAI, testApiConnection } from './services/geminiService';

const App: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<{message: string, detail?: string, code?: number, type?: 'quota' | 'auth' | 'general'} | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showDetail, setShowDetail] = useState(false);
  const [diagStatus, setDiagStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  
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

  const handleDiagnostic = async () => {
    setDiagStatus('testing');
    const ok = await testApiConnection();
    setDiagStatus(ok ? 'success' : 'failed');
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
          message: "API 額度已用盡 (429)", 
          detail: "這通常代表您帳號的『Google 搜尋工具』今日配額已達上限。Gemini 免費版每日搜尋次數非常有限。",
          code: 429,
          type: 'quota'
        });
        startCountdown(60);
      } else if (errorMsg.includes("403")) {
        setError({ 
          message: "金鑰權限錯誤 (403)", 
          detail: "API Key 可能失效或未開啟 Search Grounding 權限。", 
          code: 403,
          type: 'auth'
        });
      } else {
        setError({ message: "系統暫時無法回應", detail: errorMsg, type: 'general' });
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
          getWeatherData(coords);
        },
        (err) => {
          setError({ message: "定位權限遭拒", detail: "請手動搜尋城市。" });
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
        <h2 className="text-xl font-bold text-slate-700">正在透過 AI 搜尋最新氣象...</h2>
        <p className="text-slate-500 mt-2 max-w-xs animate-pulse">第一次連線可能較慢，請耐心等候</p>
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
              placeholder={retryCountdown > 0 ? `冷卻中 ${retryCountdown}s...` : "輸入城市 (如：嘉義)"}
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
          <div className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-red-100/50 border border-red-50 flex flex-col items-center">
            <ShieldAlert className="text-red-500 mb-6" size={56} />
            <h2 className="text-2xl font-black text-slate-800 mb-3">{error.message}</h2>
            <p className="text-slate-500 text-center max-w-lg mb-8 leading-relaxed">
              {error.type === 'quota' ? (
                <>
                  偵測到 API 頻率限制。這代表您的 <b>Google 搜尋功能</b> 免費額度今日已用完。
                  您可以嘗試點擊下方的「連線診斷」來確認 API Key 本身是否正常。
                </>
              ) : error.detail}
            </p>
            
            <div className="flex flex-col gap-4 w-full max-w-sm">
              <button 
                onClick={tryGeolocation} 
                disabled={retryCountdown > 0}
                className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${retryCountdown > 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'}`}
              >
                {retryCountdown > 0 ? <><Clock size={18} /> 冷卻中 ({retryCountdown}s)</> : <><Navigation size={18} /> 再次嘗試搜尋天氣</>}
              </button>

              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Info size={14} /> API 健康診斷
                </h4>
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm font-medium text-slate-600">
                    {diagStatus === 'idle' && '點擊測試 API 本身是否活著'}
                    {diagStatus === 'testing' && '正在與 Gemini 通訊...'}
                    {diagStatus === 'success' && <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 size={16} /> API 連線正常</span>}
                    {diagStatus === 'failed' && <span className="text-red-600 flex items-center gap-1"><AlertCircle size={16} /> 連線失敗</span>}
                  </div>
                  <button 
                    onClick={handleDiagnostic}
                    disabled={diagStatus === 'testing'}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    開始測試
                  </button>
                </div>
                {diagStatus === 'success' && error.type === 'quota' && (
                  <div className="mt-4 p-3 bg-amber-50 text-amber-700 text-[11px] leading-relaxed rounded-xl border border-amber-100">
                    診斷結果：您的 API Key 運作正常，但 <b>Google Search 配額</b> 已達免費上限。請至 Google AI Studio 開啟計費方案或換一個新專案的 Key。
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {weatherData && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Current Weather Card */}
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-200/20 overflow-hidden border border-white mb-6">
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
                      <div className="text-slate-400 text-[10px] font-black mb-2 uppercase tracking-widest">體感</div>
                      <span className="text-2xl font-black text-slate-700">{weatherData.current.feelsLike}°</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-slate-400 text-[10px] font-black mb-2 uppercase tracking-widest">濕度</div>
                      <span className="text-2xl font-black text-slate-700">{weatherData.current.humidity}%</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-slate-400 text-[10px] font-black mb-2 uppercase tracking-widest">風速</div>
                      <span className="text-2xl font-black text-slate-700">{weatherData.current.windSpeed}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-slate-400 text-[10px] font-black mb-2 uppercase tracking-widest">UV</div>
                      <span className="text-2xl font-black text-slate-700">{weatherData.current.uvIndex}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 flex items-start gap-5">
                <Info className="text-white mt-1 shrink-0" size={24} />
                <p className="text-white text-lg leading-relaxed font-medium">{weatherData.aiInsight}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 text-emerald-600 mb-5 font-black">
                    <Shirt size={22} /> 穿衣建議
                  </div>
                  <p className="text-slate-600 leading-relaxed italic">「{weatherData.clothingAdvice}」</p>
                </div>
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 text-orange-500 mb-5 font-black">
                    <Footprints size={22} /> 活動指南
                  </div>
                  <p className="text-slate-600 leading-relaxed">{weatherData.activityAdvice}</p>
                </div>
              </div>

              <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 text-blue-600 mb-8 font-black">
                  <Calendar size={22} /> 5 天氣溫趨勢
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weatherData.forecast}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }} />
                      <Area type="monotone" dataKey="high" name="最高" stroke="#3b82f6" strokeWidth={4} fill="#3b82f6" fillOpacity={0.05} />
                      <Area type="monotone" dataKey="low" name="最低" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 6" fill="transparent" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="mt-16 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
        <p>© 2024 Gemini Weather Assistant • 智感氣象助手</p>
      </footer>
    </div>
  );
};

export default App;
