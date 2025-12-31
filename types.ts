
export interface CurrentWeather {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  feelsLike: number;
  uvIndex: number;
}

export interface DailyForecast {
  date: string;
  high: number;
  low: number;
  condition: string;
}

export interface WeatherData {
  locationName: string;
  current: CurrentWeather;
  forecast: DailyForecast[];
  aiInsight: string;
  clothingAdvice: string;
  activityAdvice: string;
  lastUpdated: string;
  sources: { title: string; uri: string }[];
}

export interface Coordinates {
  lat: number;
  lng: number;
}
