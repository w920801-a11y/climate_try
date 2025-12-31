
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Cloud, Sun, CloudRain, Wind, Droplets, Thermometer, 
  MapPin, RefreshCw, Info, Shirt, Footprints, Calendar,
  ExternalLink, AlertCircle
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { WeatherData, Coordinates } from './types';
import { fetchWeatherWithAI } from './services/geminiService';

const App: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [location, setLocation] = useState<Coordinates | null>(null);

  const getWeatherData = useCallback(async (coords: Coordinates) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWeatherWithAI(coords);
      setWeatherData(data);
    } catch (err) {
      setError("無法取得天氣資訊，請稍後再試。");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = () => {
    if (location) getWeatherData(location);
  };

  useEffect(() => {
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
          setError("定位權限遭拒或無法取得位置，請確保已開啟瀏覽器定位功能。");
          setLoading(false);
        }
      );
    } else {
      setError("您的瀏覽器不支援定位功能。");
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getWeatherIcon = (condition: string) => {
    const c = condition.toLowerCase();
    if (c.includes('晴') || c.includes('sun')) return <Sun className="text-amber-400" size={48} />;
    if (c.includes('雨') || c.includes('rain')) return <CloudRain className="text-blue-400" size={48} />;
    return <Cloud className="text-slate-400" size={48} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="relative">
          <RefreshCw className="animate-spin text-blue-600 mb-4" size={48} />
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
            <Cloud className="text-blue-200" size={20} />
          </div>
        </div>
        <h2 className="text-xl font-medium text-slate-700">正在透過 Gemini 分析在地天氣...</h2>
        <p className="text-slate-500 mt-2">這可能需要幾秒鐘來獲取最準確的數據</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <AlertCircle className="text-red-500 mb-4" size={64} />
        <h2 className="text-2xl font-bold text-slate-800">{error}</h2>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <RefreshCw size={20} /> 重試一次
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <MapPin size={18} />
              <span className="font-semibold">{weatherData?.locationName}</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">智感天氣預報</h1>
          </div>
          <button 
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-white shadow-sm border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all"
          >
            <RefreshCw size={18} />
            <span>最後更新 {weatherData?.lastUpdated}</span>
          </button>
        </div>

        {/* Current Weather Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-blue-100/50 overflow-hidden border border-white">
          <div className="p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-slate-50 rounded-2xl">
                  {getWeatherIcon(weatherData?.current.condition || '')}
                </div>
                <div>
                  <div className="text-5xl font-bold text-slate-900 flex items-start">
                    {weatherData?.current.temp}
                    <span className="text-2xl font-normal text-slate-400 mt-1">°C</span>
                  </div>
                  <div className="text-xl text-slate-600 font-medium mt-1">
                    {weatherData?.current.condition}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 md:flex md:gap-8 border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-8">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5 text-slate-400 text-sm mb-1">
                    <Thermometer size={14} /> 體感
                  </div>
                  <span className="font-bold text-slate-700">{weatherData?.current.feelsLike}°C</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5 text-slate-400 text-sm mb-1">
                    <Droplets size={14} /> 濕度
                  </div>
                  <span className="font-bold text-slate-700">{weatherData?.current.humidity}%</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5 text-slate-400 text-sm mb-1">
                    <Wind size={14} /> 風速
                  </div>
                  <span className="font-bold text-slate-700">{weatherData?.current.windSpeed} km/h</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5 text-slate-400 text-sm mb-1">
                    <Info size={14} /> UV 指數
                  </div>
                  <span className="font-bold text-slate-700">{weatherData?.current.uvIndex}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-600 p-6 flex items-start gap-4">
            <div className="p-2 bg-blue-500/50 rounded-lg shrink-0">
              <Info className="text-white" size={20} />
            </div>
            <p className="text-blue-50 text-sm md:text-base leading-relaxed">
              {weatherData?.aiInsight}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Advice Cards */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-fit">
              <div className="flex items-center gap-3 text-emerald-600 mb-4">
                <Shirt size={22} />
                <h3 className="font-bold">今日穿衣建議</h3>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed italic">
                「{weatherData?.clothingAdvice}」
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-fit">
              <div className="flex items-center gap-3 text-orange-500 mb-4">
                <Footprints size={22} />
                <h3 className="font-bold">活動建議</h3>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                {weatherData?.activityAdvice}
              </p>
            </div>
          </div>

          {/* Forecast Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
            <div className="flex items-center gap-3 text-blue-600 mb-6">
              <Calendar size={22} />
              <h3 className="font-bold">未來 5 天溫度趨勢</h3>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weatherData?.forecast}>
                  <defs>
                    <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12}}
                    tickFormatter={(val) => val.split('-').slice(1).join('/')}
                  />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="high" 
                    name="最高溫"
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorHigh)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="low" 
                    name="最低溫"
                    stroke="#94a3b8" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fill="transparent"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-5 gap-2 mt-4">
              {weatherData?.forecast.map((day, idx) => (
                <div key={idx} className="flex flex-col items-center py-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 mb-1">{day.date.split('-').slice(1).join('/')}</span>
                  <div className="my-1 scale-75">
                    {getWeatherIcon(day.condition)}
                  </div>
                  <span className="text-xs font-bold text-slate-700">{day.high}°</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Search Grounding Sources */}
        <div className="bg-slate-100/50 p-4 rounded-2xl border border-dashed border-slate-200">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Info size={12} /> 數據來源 (由 Google 搜索增強)
          </h4>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {weatherData?.sources.map((source, idx) => (
              <a 
                key={idx} 
                href={source.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
              >
                {source.title} <ExternalLink size={10} />
              </a>
            ))}
          </div>
        </div>
      </div>

      <footer className="mt-12 text-center text-slate-400 text-sm">
        <p>© 2024 Gemini Weather Assistant • Powered by Google Gemini 3 Flash</p>
      </footer>
    </div>
  );
};

export default App;
