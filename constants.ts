/**
 * This file contains all the constants and mock data generators for the Smart City application.
 * It includes definitions for modules, organizations, regions, and functions to generate mock data
 * for various entities in the system.
 */

import { MoistureSensor, SensorStatus, Facility, WasteBin, Truck, Weather, WeatherForecast, Notification, ChartData, ReportEntry, DeviceHealth, Region, Coordinate, AirSensor, SOSColumn, EcoViolation, ConstructionSite, LightPole, Bus, CallRequest, RequestCategory, ModuleDefinition, Organization } from './types';
import { LayoutGrid, PieChart, Droplets, ThermometerSun, Trash, Wind, HardHat, Eye, Lightbulb, ShieldAlert, Bus as BusIcon, PhoneCall } from 'lucide-react';

// --- AVAILABLE MODULES DEFINITION ---
export const ALL_MODULES: ModuleDefinition[] = [
    { id: 'DASHBOARD', label: 'Markaz', icon: LayoutGrid, description: "Asosiy ko'rsatkichlar paneli" },
    { id: 'ANALYTICS', label: 'Tahlil', icon: PieChart, description: "Kengaytirilgan hisobotlar va statistika" },
    { id: 'MOISTURE', label: 'Namlik', icon: Droplets, description: "Tuproq namligi va sug'orish nazorati" },
    { id: 'CLIMATE', label: 'Issiqlik', icon: ThermometerSun, description: "Binolar harorati va energiya samaradorligi" },
    { id: 'WASTE', label: 'Chiqindi', icon: Trash, description: "Chiqindi qutilari va maxsus texnika boshqaruvi" },
    { id: 'AIR', label: 'Havo', icon: Wind, description: "Havo sifati sensorlari monitoringi" },
    { id: 'CONSTRUCTION', label: 'Qurilish', icon: HardHat, description: "Raqamli qurilish pasporti va AI nazorati" },
    { id: 'ECO_CONTROL', label: 'Eco-Nazorat', icon: Eye, description: "Noqonuniy chiqindi tashlashni aniqlash" },
    { id: 'LIGHT_INSPECTOR', label: 'Light-AI', icon: Lightbulb, description: "Ko'cha chiroqlarini avtomatik nazorat qilish" },
    { id: 'SECURITY', label: 'Xavfsizlik', icon: ShieldAlert, description: "SOS ustunlar va jamoat xavfsizligi" },
    { id: 'TRANSPORT', label: 'Transport', icon: BusIcon, description: "Jamoat transporti va tirbandlik tahlili" },
    { id: 'CALL_CENTER', label: 'Murojaatlar', icon: PhoneCall, description: "AI Call Center va fuqarolar murojaati" },
];

// --- MOCK ORGANIZATIONS (Database Simulation) ---
export const MOCK_ORGANIZATIONS: Organization[] = []; // Empty array - organizations only come from backend

// O'zbekiston Hududlari Bazasi - TO'LIQ RO'YXAT
export const UZB_REGIONS: Region[] = [
    {
        id: 'TASHKENT_CITY',
        name: "Toshkent Shahri",
        districts: [
            { id: 'CHILANZAR', name: "Chilonzor Tumani", center: { lat: 41.2721, lng: 69.2045 } },
            { id: 'YUNUSABAD', name: "Yunusobod Tumani", center: { lat: 41.3653, lng: 69.2934 } },
            { id: 'MIRZO_ULUGBEK', name: "Mirzo Ulug'bek", center: { lat: 41.3283, lng: 69.3789 } },
            { id: 'YASHNOBOD', name: "Yashnobod Tumani", center: { lat: 41.2933, lng: 69.3370 } },
            { id: 'SHAYXONTOHUR', name: "Shayxontohur", center: { lat: 41.3214, lng: 69.2435 } },
            { id: 'SERGELI', name: "Sergeli Tumani", center: { lat: 41.2185, lng: 69.2248 } },
        ]
    },
    {
        id: 'TASHKENT_REGION',
        name: "Toshkent Viloyati",
        districts: [
            { id: 'NURAFSHON', name: "Nurafshon Shahar", center: { lat: 41.0422, lng: 69.3567 } },
            { id: 'CHIRCHIQ', name: "Chirchiq Shahar", center: { lat: 41.4689, lng: 69.5822 } },
            { id: 'OLMALIQ', name: "Olmaliq Shahar", center: { lat: 40.8542, lng: 69.5978 } },
            { id: 'ANGREN', name: "Angren Shahar", center: { lat: 41.0097, lng: 70.0753 } },
            { id: 'BOSTONLIQ', name: "Bo'stonliq (Chorvoq)", center: { lat: 41.6111, lng: 70.0444 } },
        ]
    },
    {
        id: 'FERGANA',
        name: "Farg'ona Viloyati",
        districts: [
            { id: 'FERGANA_CITY', name: "Farg'ona Shahar", center: { lat: 40.3734, lng: 71.7978 } },
            { id: 'MARGILAN', name: "Marg'ilon Shahar", center: { lat: 40.4772, lng: 71.7214 } },
            { id: 'KOKAND', name: "Qo'qon Shahar", center: { lat: 40.5286, lng: 70.9426 } },
            { id: 'QUVA', name: "Quva Tumani", center: { lat: 40.5218, lng: 72.0667 } },
            { id: 'Rishton', name: "Rishton Tumani", center: { lat: 40.3547, lng: 71.2861 } },
        ]
    },
    {
        id: 'ANDIJAN',
        name: "Andijon Viloyati",
        districts: [
            { id: 'ANDIJAN_CITY', name: "Andijon Shahar", center: { lat: 40.7821, lng: 72.3442 } },
            { id: 'ASAKA', name: "Asaka Shahar", center: { lat: 40.6415, lng: 72.2396 } },
            { id: 'XONOBOD', name: "Xonobod Shahar", center: { lat: 40.8037, lng: 72.9515 } },
            { id: 'SHAHRIXON', name: "Shahrixon Tumani", center: { lat: 40.7132, lng: 72.0573 } },
        ]
    },
];

// Default Constants to fix imports
export const MAP_CENTER = { lat: 40.3734, lng: 71.7978 };

// Universal MFY Generator
export const GET_MFYS = (cityName: string) => {
    if (cityName.includes("Farg'ona")) return [
        "Iftixor MFY",
        "Ormonchilar MFY",
        "Sh.Rashidov MFY",
        "Tinchlik MFY",
        "Al.Farg'oni MFY",
        "Soy bo'yi MFY",
        "Ibrat MFY",
        "Yoshlar MFY",
        "Farg'ona MFY",
        "Shodiyona MFY",
        "Yangi soy MFY",
        "Ma'rifat MFY",
        "Simtepa MFY",
        "Baxor MFY",
        "Furqat MFY",
        "Oybek MFY",
        "Yangi yo'l MFY",
        "Istiqlol MFY",
        "Zarbdor MFY",
        "Guliston MFY",
        "Bostan MFY",
        "Mustaqillik MFY",
        "1-Beshbola MFY",
        "Shakarqishloq MFY",
        "Joydam MFY",
        "To'qimachilar MFY",
        "S.Temur MFY",
        "Navro'z MFY",
        "Mash'al MFY",
        "A.Navoiy MFY",
        "Oqariqobod MFY",
        "Al.Xorazmiy MFY",
        "A.Jomi MFY",
        "Do'stlik MFY",
        "Z.M.Bobur MFY",
        "Lolazor MFY",
        "A.Qodiriy MFY",
        "Sovirbulog' MFY",
        "Afrosiyob MFY",
        "Madadkor MFY",
        "M.Ulug'bek MFY",
        "Parvoz MFY",
        "Nodirabegim MFY",
        "Beshbola MFY",
        "Yormazor MFY",
        "Oqariq MFY",
        "Ipak yo'li MFY",
        "Sharshara MFY",
        "Shodlik MFY",
        "Nafosat MFY",
        "Sohibkor MFY",
        "Gulzor MFY",
        "Beglar MFY",
        "O'zbekiston MFY",
        "Tabassum MFY",
        "Beruniy MFY",
        "Hamkorlik MFY",
        "Madaniyat MFY",
        "Istiqbol MFY",
        "Mehribonlik MFY",
        "Navbaxor MFY",
        "Yulduz MFY",
        "Ibn Sino MFY",
        "Barkamol MFY",
        "Kimyogar MFY",
        "Muruvvat MFY",
        "Xuvaydo MFY",
        "Kirquli MFY",
        "Surxtepa MFY",
        "Xo'jama'giz MFY",
        "O'rtashora MFY",
        "Chexshora MFY",
        "Ilg'or MFY"
    ];
    if (cityName.includes("Andijon")) return ["Bobur MFY", "Navoiy MFY", "Mustaqillik MFY", "Oltinko'l MFY", "Bog'ishamol MFY"];
    return [`${cityName} Markaz MFY`, "Obod Mahalla MFY"];
};

export const generateWasteBins = (count: number, center: Coordinate, cityName: string): WasteBin[] => {
  return Array.from({ length: count }).map((_, i) => {
    const fillLevel = Math.floor(Math.random() * 100);

    return {
      id: `BIN-${i + 1}`,
      location: randomGeo(center, 0.012),
      address: `${cityName}, Markaziy ko'chasi, ${i * 12}-uy`,
      tozaHudud: i % 2 === 0 ? '1-sonli Toza Hudud' : '2-sonli Toza Hudud',
      fillLevel: fillLevel,
      fillRate: Math.floor(Math.random() * 10) + 1,
      lastAnalysis: 'Hozirgina',
      imageUrl: '', // No default image - only images from camera or bot uploads
      isFull: fillLevel > 80,
      deviceHealth: generateDeviceHealth()
    };
  });
};

export const generateTrucks = (count: number, center: Coordinate): Truck[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `TRK-${i + 1}`,
    driverName: `Haydovchi ${i + 1}`,
    plateNumber: `40 A ${100 + i} AA`,
    tozaHudud: i % 2 === 0 ? '1-sonli Toza Hudud' : '2-sonli Toza Hudud',
    location: randomGeo(center, 0.012),
    status: 'IDLE',
    fuelLevel: Math.floor(Math.random() * 60) + 40,
    phone: '+998 90 123 45 67',
    login: `driver${i+1}`,
    password: '123'
  }));
};

const randomGeo = (center: Coordinate, spread = 0.02) => ({
  lat: center.lat + (Math.random() - 0.5) * spread,
  lng: center.lng + (Math.random() - 0.5) * spread
});

const generateDeviceHealth = (): DeviceHealth => ({
    batteryLevel: 80,
    signalStrength: 90,
    lastPing: "1 daqiqa oldin",
    firmwareVersion: "v2.1.4",
    isOnline: true
});

// ... qolgan mock generatsiya funksiyalari (Moisture, Air, SOS va h.k.) avvalgiday qoladi
export const PARK_POLYGONS = [
    { name: "Markaziy Bog'", path: [{lat: 40.3734 + 0.003, lng: 71.7978 - 0.001}, {lat: 40.3734 + 0.003, lng: 71.7978 + 0.001}, {lat: 40.3734 + 0.001, lng: 71.7978 + 0.001}, {lat: 40.3734 + 0.001, lng: 71.7978 - 0.001}] }
];

export const generateMoistureSensors = (total: number, center: Coordinate, city: string): MoistureSensor[] => {
  return Array.from({ length: total }).map((_, i) => ({
    id: `MS-${i + 1}`,
    location: randomGeo(center, 0.012),
    mfy: GET_MFYS(city)[i % GET_MFYS(city).length],
    status: ['OPTIMAL', 'WARNING', 'CRITICAL'][Math.floor(Math.random() * 3)] as SensorStatus,
    moistureLevel: Math.floor(Math.random() * 100),
    lastUpdate: new Date(Date.now() - Math.floor(Math.random() * 10000000)).toISOString()
  }));
};

export const generateAirSensors = (center: Coordinate, city: string): AirSensor[] => {
  return Array.from({ length: 8 }).map((_, i) => ({
    id: `AS-${i + 1}`,
    name: `Havo ${i + 1}`,
    mfy: GET_MFYS(city)[i % GET_MFYS(city).length],
    location: randomGeo(center, 0.015),
    aqi: Math.floor(Math.random() * 100) + 50,
    pm25: Math.floor(Math.random() * 50),
    co2: Math.floor(Math.random() * 200) + 400,
    status: ['OPTIMAL', 'WARNING', 'CRITICAL'][Math.floor(Math.random() * 3)] as SensorStatus
  }));
};

export const generateFacilities = (center: Coordinate, city: string): Facility[] => {
  const facilityTypes = ['SCHOOL', 'KINDERGARTEN', 'HOSPITAL'];
  return Array.from({ length: 12 }).map((_, i) => ({
    id: `FAC-${i + 1}`,
    name: `${facilityTypes[i % facilityTypes.length]}-${i + 1}`,
    type: facilityTypes[i % facilityTypes.length] as 'SCHOOL' | 'KINDERGARTEN' | 'HOSPITAL',
    mfy: GET_MFYS(city)[i % GET_MFYS(city).length],
    overallStatus: ['OPTIMAL', 'WARNING', 'CRITICAL'][Math.floor(Math.random() * 3)] as SensorStatus,
    energyUsage: Math.floor(Math.random() * 100) + 50,
    efficiencyScore: Math.floor(Math.random() * 50) + 50,
    managerName: `Manager ${i + 1}`,
    lastMaintenance: new Date(Date.now() - Math.floor(Math.random() * 100000000)).toISOString(),
    history: Array.from({ length: 7 }).map(() => Math.floor(Math.random() * 100)),
    boilers: [] // This would be populated with actual boiler data
  }));
};

export const generateSOSColumns = (center: Coordinate, city: string): SOSColumn[] => {
  return Array.from({ length: 5 }).map((_, i) => ({
    id: `SOS-${i + 1}`,
    name: `SOS-${i + 1}`,
    location: randomGeo(center, 0.02),
    mfy: GET_MFYS(city)[i % GET_MFYS(city).length],
    status: ['IDLE', 'ACTIVE'][Math.floor(Math.random() * 2)] as 'IDLE' | 'ACTIVE',
    cameraUrl: `https://picsum.photos/seed/sos${i}/640/480`,
    lastTest: new Date(Date.now() - Math.floor(Math.random() * 10000000)).toISOString(),
    deviceHealth: generateDeviceHealth()
  }));
};

export const generateLightPoles = (center: Coordinate, city: string): LightPole[] => {
  return Array.from({ length: 15 }).map((_, i) => ({
    id: `LP-${i + 1}`,
    location: randomGeo(center, 0.025),
    address: `${city}, Ko'cha-${i + 1}`,
    cameraUrl: `https://picsum.photos/seed/light${i}/640/480`,
    status: ['ON', 'OFF', 'FLICKERING'][Math.floor(Math.random() * 3)] as 'ON' | 'OFF' | 'FLICKERING',
    luminance: Math.floor(Math.random() * 100),
    lastCheck: new Date(Date.now() - Math.floor(Math.random() * 10000000)).toISOString(),
    rois: [] // This would be populated with actual ROI data
  }));
};

export const generateEcoViolations = (city: string): EcoViolation[] => {
  return Array.from({ length: 7 }).map((_, i) => ({
    id: `ECO-${i + 1}`,
    locationName: `${city}, Violation-${i + 1}`,
    mfy: GET_MFYS(city)[i % GET_MFYS(city).length],
    timestamp: new Date(Date.now() - Math.floor(Math.random() * 10000000)).toISOString(),
    imageUrl: `https://picsum.photos/seed/eco${i}/640/480`,
    confidence: Math.floor(Math.random() * 40) + 60
  }));
};

export const generateBuses = (center: Coordinate, city: string): Bus[] => {
  return Array.from({ length: 6 }).map((_, i) => ({
    id: `BUS-${i + 1}`,
    routeNumber: `${i + 1}A`,
    plateNumber: `40 A ${200 + i} AA`,
    driverName: `Driver ${i + 1}`,
    location: randomGeo(center, 0.03),
    bearing: Math.floor(Math.random() * 360),
    speed: Math.floor(Math.random() * 60),
    rpm: Math.floor(Math.random() * 2000) + 1000,
    passengers: Math.floor(Math.random() * 30),
    status: ['ON_TIME', 'DELAYED', 'SOS', 'STOPPED'][Math.floor(Math.random() * 4)] as 'ON_TIME' | 'DELAYED' | 'SOS' | 'STOPPED',
    fuelLevel: Math.floor(Math.random() * 60) + 40,
    engineTemp: Math.floor(Math.random() * 100) + 80,
    doorStatus: ['OPEN', 'CLOSED'][Math.floor(Math.random() * 2)] as 'OPEN' | 'CLOSED',
    cabinTemp: Math.floor(Math.random() * 20) + 18,
    driverHeartRate: Math.floor(Math.random() * 30) + 60,
    driverFatigueLevel: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)] as 'LOW' | 'MEDIUM' | 'HIGH',
    nextStop: `Stop ${i + 2}`,
    cctvUrls: {
      front: `https://picsum.photos/seed/bus${i}front/640/480`,
      driver: `https://picsum.photos/seed/bus${i}driver/640/480`,
      cabin: `https://picsum.photos/seed/bus${i}cabin/640/480`
    }
  }));
};

export const generateCallRequests = (city: string): CallRequest[] => {
  const categories: RequestCategory[] = ['HEALTH', 'INTERIOR', 'WASTE', 'ELECTRICITY', 'WATER', 'GAS', 'OTHER'];
  return Array.from({ length: 10 }).map((_, i) => ({
    id: `TICKET-${i + 1}`,
    citizenName: `Citizen ${i + 1}`,
    phone: `+998 9${Math.floor(Math.random() * 9)} ${Math.floor(Math.random() * 999)} ${Math.floor(Math.random() * 99)} ${Math.floor(Math.random() * 99)}`,
    transcript: `Transcript for ticket ${i + 1} regarding ${categories[i % categories.length]} issue`,
    category: categories[i % categories.length],
    status: ['NEW', 'ASSIGNED', 'PROCESSING', 'RESOLVED', 'CLOSED'][Math.floor(Math.random() * 5)] as any,
    timestamp: new Date(Date.now() - Math.floor(Math.random() * 10000000)).toISOString(),
    address: `${city}, Address ${i + 1}`,
    mfy: GET_MFYS(city)[i % GET_MFYS(city).length],
    aiSummary: `AI summary for ticket ${i + 1}`,
    keywords: ['urgent', 'maintenance', 'repair'],
    citizenTrustScore: Math.floor(Math.random() * 100),
    timeline: [] // This would be populated with actual timeline data
  }));
};

export const MOCK_CONSTRUCTION_SITES: ConstructionSite[] = [];

export const CURRENT_WEATHER: Weather = { temp: 24, condition: 'Sunny', humidity: 45, windSpeed: 12 };

export const MOCK_FORECAST: WeatherForecast[] = [];

export const MOCK_NOTIFICATIONS: Notification[] = [];

export const ANALYTICS_CHART_DATA: ChartData[] = [];

export const MOCK_REPORTS: ReportEntry[] = [];