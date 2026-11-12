export interface City {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export const CITIES: City[] = [
  { id: "delhi", name: "Delhi", latitude: 28.6139, longitude: 77.209, timezone: "Asia/Kolkata" },
  { id: "mumbai", name: "Mumbai", latitude: 19.076, longitude: 72.8777, timezone: "Asia/Kolkata" },
  { id: "beijing", name: "Beijing", latitude: 39.9042, longitude: 116.4074, timezone: "Asia/Shanghai" },
  { id: "london", name: "London", latitude: 51.5072, longitude: -0.1276, timezone: "Europe/London" },
  { id: "new-york", name: "New York", latitude: 40.7128, longitude: -74.006, timezone: "America/New_York" },
  { id: "los-angeles", name: "Los Angeles", latitude: 34.0522, longitude: -118.2437, timezone: "America/Los_Angeles" },
  { id: "paris", name: "Paris", latitude: 48.8566, longitude: 2.3522, timezone: "Europe/Paris" },
  { id: "tokyo", name: "Tokyo", latitude: 35.6762, longitude: 139.6503, timezone: "Asia/Tokyo" },
  { id: "shanghai", name: "Shanghai", latitude: 31.2304, longitude: 121.4737, timezone: "Asia/Shanghai" },
  { id: "bangkok", name: "Bangkok", latitude: 13.7563, longitude: 100.5018, timezone: "Asia/Bangkok" },
];
