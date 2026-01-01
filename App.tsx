
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Cloud, Sun, CloudRain, Wind, Droplets, Thermometer, 
  MapPin, RefreshCw, Info, Shirt, Footprints, Calendar,
  ExternalLink, AlertCircle, Search, Navigation, ChevronDown, ChevronUp, Clock, CheckCircle2, ShieldAlert, Lock, Key, Copy, Globe
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { WeatherData, Coordinates } from './types';
import { fetchWeatherWithAI, testApiConnection } from './services/geminiService';

const App: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<{message: string, detail?: string, code?: number, type?: 'quota' | 'auth' | 'not_found' | 'general'} | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSecurityTips, setShowSecurityTips] = useState(false);
  const [diagStatus, setDiagStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  
  const currentOrigin = window.location.origin;

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
      console.error("Gemini Error:", err);
      const errorMsg = err.message || String(err);
      
      if (errorMsg.includes("429")) {
        setError({ 
          message: "搜尋配額耗盡 (429)", 
          detail: "API 金鑰正確，但 Google 的免費搜尋次數已達上限。請稍後再試或檢查帳單設定。",
          code: 429,
          type: 'quota'
        });
      } else if (errorMsg.includes("403")) {
        setError({
          message: "金鑰權限錯誤 (403)",
          detail: `您的 API 金鑰拒絕了來自此網址的請求。請檢查 Google Cloud 的「網站限制」設定是否包含此網域。`,
          code: 403,
          type: 'auth'
        });
      } else if (errorMsg.includes("404")) {
        setError({
          message: "找不到資源 (404)",
          detail: "找不到指定的模型或 API 路徑。請確認模型名稱設定為 'gemini-3-flash-preview'。",
          code: 404,
          type: 'not_found'
        });
      } else {
        setError({ message: "連線異常", detail: errorMsg, type: 'general' });
      }
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
        <p className="text-slate-500 font-bold animate-pulse text-lg tracking-wider">正在調研即時天氣資料...</p>
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
            <h1 className="text-xl font-black text-slate-800 tracking-tight">智感天氣預報</h1>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); getWeatherData(searchQuery); }} className="relative w-full md:w-72">
            <input 
              type="text" 
              placeholder="搜尋城市 (如：台南, 嘉義)..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-100/50 rounded-2xl border-none focus:ring-2 focus:ring-blue-200 text-sm transition-all"
            />
            <Search className="absolute left-4 top-3.5 text-slate-400" size={16} />
          </form>
        </div>

        {error && (
          <div className="bg-white p-8 md:p-14 rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-8 ring-8 ring-red-50/50">
              <ShieldAlert className="text-red-500" size={48} />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">{error.message}</h2>
            <div className="bg-slate-50 p-6 rounded-3xl mb-10 w-full max-w-lg border border-slate-100">
               <p className="text-slate-600 font-medium leading-relaxed">{error.detail}</p>
            </div>
            
            <div className="flex flex-col gap-5 w-full max-w-lg">
              {/* 403 專屬修復面板 */}
              {error.type === 'auth' && (
                <div className="bg-blue-600 text-white p-6 rounded-3xl text-left shadow-xl shadow-blue-100">
                  <div className="flex items-center gap-2 mb-4 font-black text-lg">
                    <Globe size={20} /> 如何修復 403 錯誤？
                  </div>
                  <ol className="space-y-4 text-sm font-medium opacity-90">
                    <li className="flex gap-3">
                      <span className="bg-white/20 w-6 h-6 rounded-full flex items-center justify-center shrink-0">1</span>
                      <span>進入 Google Cloud Console 您的金鑰設定頁面。</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="bg-white/20 w-6 h-6 rounded-full flex items-center justify-center shrink-0">2</span>
                      <div className="flex flex-col gap-2 w-full">
                        <span>新增下列網址到「網站限制」中：</span>
                        <div className="bg-black/20 p-3 rounded-xl flex items-center justify-between group">
                          <code className="text-blue-100 break-all">{currentOrigin}/*</code>
                          <button onClick={() => navigator.clipboard.writeText(`${currentOrigin}/*`)} className="hover:text-white transition-colors">
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="bg-white/20 w-6 h-6 rounded-full flex items-center justify-center shrink-0">3</span>
                      <span>建議多新增一條 <code>*.vercel.app/*</code> 以支援預覽網址。</span>
                    </li>
                  </ol>
                </div>
              )}

              {/* 診斷面板 */}
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 text-left">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Key size={14} /> API 健康診斷
                  </h4>
                  <button onClick={handleDiagnostic} className="px-4 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all">
                    {diagStatus === 'testing' ? '偵測中...' : '開始測試'}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  {diagStatus === 'testing' ? <RefreshCw className="animate-spin text-blue-500" size={18} /> : 
                   diagStatus === 'success' ? <CheckCircle2 className="text-emerald-500" size={18} /> :
                   diagStatus === 'failed' ? <AlertCircle className="text-red-500" size={18} /> : <div className="w-4 h-4 rounded-full border-2 border-slate-200" />}
                  <span className="text-sm font-bold text-slate-700">
                    {diagStatus === 'idle' && '尚未檢測金鑰狀態'}
                    {diagStatus === 'testing' && '正在與 Google 伺服器通訊...'}
                    {diagStatus === 'success' && '連線成功！API 金鑰本身正常'}
                    {diagStatus === 'failed' && '連線失敗！金鑰無效或被封鎖'}
                  </span>
                </div>
              </div>

              <button 
                onClick={() => getWeatherData("台北市")}
                className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 group"
              >
                <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" /> 
                再次嘗試搜尋天氣
              </button>
            </div>
          </div>
        )}

        {weatherData && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
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
          </div>
        )}
      </div>
      <footer className="mt-16 text-center">
        <div className="inline-block px-6 py-2 bg-white rounded-full border border-slate-200 shadow-sm">
          <p className="text-[10px] text-slate-400 font-black tracking-[0.3em] uppercase">Gemini AI Weather Engine • Realtime Grounding</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
