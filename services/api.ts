import { Organization, CallRequest, MoistureSensor, WasteBin, Truck, Facility, AirSensor, SOSColumn, ConstructionSite, LightPole, Bus, EcoViolation, IoTDevice, Room, Boiler } from '../types';

const API_BASE_URL = 'https://smartcityapi.aiproduct.uz/api'; // Backend API Server

// Map backend IoT device (snake_case) to frontend IoTDevice (camelCase)
const mapIoTDevice = (d: any): IoTDevice => ({
  id: d.id,
  deviceId: d.device_id,
  deviceType: d.device_type,
  roomId: d.room || undefined,
  boilerId: d.boiler || undefined,
  location: d.location,
  lastSeen: d.last_seen,
  isActive: d.is_active,
  createdAt: d.created_at,
  current_temperature: d.current_temperature,
  current_humidity: d.current_humidity,
  last_sensor_update: d.last_sensor_update,
});

// Helper function to get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// Define types for API responses
interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

// Helper function to get CSRF token from cookies
const getCsrfToken = (): string | null => {
  const name = 'csrftoken';
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
};

// Helper function to make API requests
const makeRequest = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get the auth token
  const token = getAuthToken();
  
  // Get CSRF token
  const csrfToken = getCsrfToken();
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      // Add authentication headers if token exists
      ...(token && { 'Authorization': `Token ${token}` }),
      // Add CSRF token if available (only for non-GET requests)
      ...(csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes((options.method || 'GET').toUpperCase()) && { 'X-CSRFToken': csrfToken }),
    },
    credentials: 'include',  // Important for cookies/session
  };

  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      // If it's a 401 error, remove the invalid token
      if (response.status === 401) {
        localStorage.removeItem('authToken');
      }

      // Try to read response body for better diagnostics
      let respText: string | null = null;
      try {
        respText = await response.text();
      } catch (e) {
        respText = null;
      }

      // Attempt to parse JSON body
      let parsedBody: any = null;
      if (respText) {
        try { parsedBody = JSON.parse(respText); } catch (e) { parsedBody = respText; }
      }

      const err: any = new Error(`HTTP error! status: ${response.status}` + (respText ? ` - ${respText}` : ''));
      err.status = response.status;
      err.body = parsedBody;
      throw err;
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

// Helper functions to convert frontend (camelCase) objects to backend (snake_case)
// Normalize a room object for backend (accepts camelCase or snake_case inputs)
const mapRoomForBackend = (r: any) => ({
  id: r?.id ?? undefined,
  name: r?.name ?? r?.roomName ?? undefined,
  target_humidity: (r?.targetHumidity ?? r?.target_humidity ?? 50),
  humidity: (r?.humidity ?? r?.current_humidity ?? 0),
  temperature: (r?.temperature ?? 22),
  status: r?.status ?? undefined,
  trend: r?.trend ?? r?.history ?? [],
});

// Normalize a boiler object for backend (accepts camelCase or snake_case inputs)
// Normalize device health (accept camelCase or snake_case) and provide defaults
const normalizeDeviceHealthForBackend = (dh: any) => {
  if (!dh) return undefined;
  const lastPing = dh?.lastPing ?? dh?.last_ping ?? undefined;
  let lastPingIso = lastPing;
  if (!lastPingIso || (typeof lastPingIso === 'string' && !lastPingIso.includes('T'))) {
    // Convert non-ISO strings (e.g., "Hozir") to current ISO datetime
    lastPingIso = new Date().toISOString();
  }

  return {
    battery_level: Number(dh?.batteryLevel ?? dh?.battery_level ?? 100),
    signal_strength: Number(dh?.signalStrength ?? dh?.signal_strength ?? 100),
    last_ping: lastPingIso,
    firmware_version: dh?.firmwareVersion ?? dh?.firmware_version ?? '1.0.0',
    is_online: (dh?.isOnline ?? dh?.is_online) ?? true,
  };
};

const mapBoilerForBackend = (b: any) => ({
  name: b?.name ?? undefined,
  target_humidity: (b?.targetHumidity ?? b?.target_humidity ?? 50),
  humidity: (b?.humidity ?? b?.current_humidity ?? 0),
  temperature: (b?.temperature ?? 22),
  status: b?.status ?? undefined,
  trend: b?.trend ?? [],
  device_health: normalizeDeviceHealthForBackend(b?.deviceHealth ?? b?.device_health),
  connected_rooms: (b?.connectedRooms ?? b?.connected_rooms ?? []).map(mapRoomForBackend),
});

// --- Map responses from backend to frontend shapes (snake_case -> camelCase)
const mapRoomFromBackend = (r: any) => ({
  id: r?.id,
  name: r?.name,
  facilityId: r?.facility ?? r?.facility_id ?? undefined,
  floor: r?.floor,
  capacity: r?.capacity,
  isOccupied: r?.is_occupied ?? r?.isOccupied ?? false,
  targetHumidity: r?.target_humidity ?? r?.targetHumidity ?? 50,
  humidity: r?.humidity ?? r?.moisture_level ?? 0,
  temperature: r?.temperature ?? r?.temp ?? undefined,
  status: r?.status,
  trend: r?.trend ?? r?.history ?? [],
  createdAt: r?.created_at,
  lastUpdated: r?.last_updated,
});

const mapBoilerFromBackend = (b: any) => ({
  id: b?.id,
  name: b?.name,
  targetHumidity: b?.target_humidity ?? b?.targetHumidity ?? 50,
  humidity: b?.humidity ?? b?.current_humidity ?? 0,
  temperature: b?.temperature ?? 22,
  status: b?.status,
  trend: b?.trend ?? [],
  deviceHealth: b?.device_health ? {
    batteryLevel: b.device_health.battery_level,
    signalStrength: b.device_health.signal_strength,
    lastPing: b.device_health.last_ping,
    firmwareVersion: b.device_health.firmware_version,
    isOnline: b.device_health.is_online,
  } : undefined,
  connectedRooms: (b?.connected_rooms ?? b?.connectedRooms ?? []).map(mapRoomFromBackend),
  createdAt: b?.created_at,
  lastUpdated: b?.last_updated,
});

// API service for all entities
export const ApiService = {
  // Organizations
  getOrganizations: (): Promise<Organization[]> => 
    makeRequest<Organization[]>('/organizations/'),
  
  getOrganization: (id: string): Promise<Organization> => 
    makeRequest<Organization>(`/organizations/${id}/`),
  
  createOrganization: (org: Organization): Promise<Organization> => 
    makeRequest<Organization>('/organizations/', { method: 'POST', body: JSON.stringify(org) }),
  
  updateOrganization: (id: string, org: Organization): Promise<Organization> => 
    makeRequest<Organization>(`/organizations/${id}/`, { method: 'PUT', body: JSON.stringify(org) }),
  
  deleteOrganization: (id: string): Promise<void> => 
    makeRequest<void>(`/organizations/${id}/`, { method: 'DELETE' }),

  // Call Requests (Tickets)
  getCallRequests: (): Promise<CallRequest[]> => 
    makeRequest<CallRequest[]>('/call-requests/'),
  
  getCallRequest: (id: string): Promise<CallRequest> => 
    makeRequest<CallRequest>(`/call-requests/${id}/`),
  
  createCallRequest: (ticket: CallRequest): Promise<CallRequest> => 
    makeRequest<CallRequest>('/call-requests/', { method: 'POST', body: JSON.stringify(ticket) }),
  
  updateCallRequest: (id: string, ticket: CallRequest): Promise<CallRequest> => 
    makeRequest<CallRequest>(`/call-requests/${id}/`, { method: 'PUT', body: JSON.stringify(ticket) }),
  
  deleteCallRequest: (id: string): Promise<void> => 
    makeRequest<void>(`/call-requests/${id}/`, { method: 'DELETE' }),

  // Moisture Sensors
  getMoistureSensors: (): Promise<MoistureSensor[]> => 
    makeRequest<MoistureSensor[]>('/moisture-sensors/'),
  
  getMoistureSensor: (id: string): Promise<MoistureSensor> => 
    makeRequest<MoistureSensor>(`/moisture-sensors/${id}/`),
  
  createMoistureSensor: (sensor: MoistureSensor): Promise<MoistureSensor> => 
    makeRequest<MoistureSensor>('/moisture-sensors/', { method: 'POST', body: JSON.stringify(sensor) }),
  
  updateMoistureSensor: (id: string, sensor: MoistureSensor): Promise<MoistureSensor> => 
    makeRequest<MoistureSensor>(`/moisture-sensors/${id}/`, { method: 'PUT', body: JSON.stringify(sensor) }),
  
  deleteMoistureSensor: (id: string): Promise<void> => 
    makeRequest<void>(`/moisture-sensors/${id}/`, { method: 'DELETE' }),

  // Waste Bins
  getWasteBins: (): Promise<WasteBin[]> => 
    makeRequest<WasteBin[]>('/waste-bins/'),
  
  getWasteBin: (id: string): Promise<WasteBin> => 
    makeRequest<WasteBin>(`/waste-bins/${id}/`),
  
  createWasteBin: (bin: WasteBin): Promise<WasteBin> => {
    const { organizationId, googleMapsUrl, fillLevel, fillRate, lastAnalysis, imageUrl, imageSource, cameraUrl, isFull, deviceHealth, qrCodeUrl, tozaHudud, image, ...rest } = bin as any;
    
    const payload = {
      ...rest,
      organization_id: organizationId,
      google_maps_url: googleMapsUrl,
      fill_level: fillLevel,
      fill_rate: fillRate,
      last_analysis: lastAnalysis,
      image_url: imageUrl,
      image_source: imageSource,
      camera_url: cameraUrl,
      is_full: isFull,
      device_health: deviceHealth ? {
        battery_level: deviceHealth.batteryLevel,
        signal_strength: deviceHealth.signalStrength,
        last_ping: deviceHealth.lastPing,
        firmware_version: deviceHealth.firmwareVersion,
        is_online: deviceHealth.isOnline,
      } : undefined,
      qr_code_url: qrCodeUrl,
      toza_hudud: tozaHudud,
      image: image,
    };

    return makeRequest<WasteBin>('/waste-bins/', { method: 'POST', body: JSON.stringify(payload) });
  },
  
  updateWasteBin: (id: string, bin: Partial<WasteBin>): Promise<WasteBin> => {
    const { organizationId, googleMapsUrl, fillLevel, fillRate, lastAnalysis, imageUrl, imageSource, cameraUrl, isFull, deviceHealth, qrCodeUrl, tozaHudud, image, ...rest } = bin as any;
    
    const payload: any = { ...rest };
    if (organizationId) payload.organization_id = organizationId;
    if (googleMapsUrl) payload.google_maps_url = googleMapsUrl;
    if (fillLevel !== undefined) payload.fill_level = fillLevel;
    if (fillRate !== undefined) payload.fill_rate = fillRate;
    if (lastAnalysis) payload.last_analysis = lastAnalysis;
    if (imageUrl) payload.image_url = imageUrl;
    if (imageSource) payload.image_source = imageSource;
    if (cameraUrl) payload.camera_url = cameraUrl;
    if (isFull !== undefined) payload.is_full = isFull;
    if (deviceHealth) payload.device_health = {
        battery_level: deviceHealth.batteryLevel,
        signal_strength: deviceHealth.signalStrength,
        last_ping: deviceHealth.lastPing,
        firmware_version: deviceHealth.firmwareVersion,
        is_online: deviceHealth.isOnline,
    };
    if (qrCodeUrl) payload.qr_code_url = qrCodeUrl;
    if (tozaHudud) payload.toza_hudud = tozaHudud;
    if (image) payload.image = image;

    return makeRequest<WasteBin>(`/waste-bins/${id}/`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  
  deleteWasteBin: (id: string): Promise<void> => 
    makeRequest<void>(`/waste-bins/${id}/`, { method: 'DELETE' }),

  // Trucks
  getTrucks: (): Promise<Truck[]> => 
    makeRequest<Truck[]>('/trucks/'),
  
  getTruck: (id: string): Promise<Truck> => 
    makeRequest<Truck>(`/trucks/${id}/`),
  
  createTruck: (truck: Truck): Promise<Truck> => 
    makeRequest<Truck>('/trucks/', { method: 'POST', body: JSON.stringify(truck) }),
  
  updateTruck: (id: string, truck: Truck): Promise<Truck> => 
    makeRequest<Truck>(`/trucks/${id}/`, { method: 'PUT', body: JSON.stringify(truck) }),
  
  deleteTruck: (id: string): Promise<void> => 
    makeRequest<void>(`/trucks/${id}/`, { method: 'DELETE' }),

  // Facilities
  getFacilities: async (): Promise<Facility[]> => {
    const data: any[] = await makeRequest<any[]>('/facilities/');
    return data.map(f => ({
      ...f,
      boilers: (f.boilers || []).map((b: any) => mapBoilerFromBackend(b))
    }));
  },
  
  getFacility: async (id: string): Promise<Facility> => {
    const f: any = await makeRequest<any>(`/facilities/${id}/`);
    return {
      ...f,
      boilers: (f.boilers || []).map((b: any) => mapBoilerFromBackend(b))
    } as Facility;
  },
  
  // Build a sanitized payload for backend from a Facility (accepts mixed-case inputs)
  buildFacilityPayload: (facility: any) => {
    // Normalize lastMaintenance to ISO string
    let lastMaintenanceValue = facility.lastMaintenance;
    if (typeof lastMaintenanceValue === 'string' && !lastMaintenanceValue.includes('T')) {
      lastMaintenanceValue = new Date().toISOString();
    } else if (lastMaintenanceValue instanceof Date) {
      lastMaintenanceValue = lastMaintenanceValue.toISOString();
    }

    return {
      name: facility.name,
      type: facility.type,
      mfy: facility.mfy,
      organization_id: facility.organizationId || facility.organization_id,
      overall_status: facility.overallStatus ?? facility.overall_status,
      energy_usage: facility.energyUsage ?? facility.energy_usage,
      efficiency_score: facility.efficiencyScore ?? facility.efficiency_score,
      manager_name: facility.managerName ?? facility.manager_name,
      last_maintenance: lastMaintenanceValue,
      history: facility.history ?? facility.histories ?? [],
      boilers: (facility.boilers ?? facility.boilers_list ?? []).map((b: any) => mapBoilerForBackend(b))
    };
  },

  createFacility: (facility: Facility): Promise<Facility> => {
    const facilityData = (ApiService as any).buildFacilityPayload(facility);
    // Helpful debug: show the exact backend payload we will send
    console.debug('ApiService.createFacility - backend payload:', facilityData);
    return makeRequest<Facility>('/facilities/', { method: 'POST', body: JSON.stringify(facilityData) });
  },
  
  updateFacility: (id: string, facility: Facility): Promise<Facility> => {
    const facilityData = (ApiService as any).buildFacilityPayload(facility);
    // Helpful debug: show the exact backend payload we will send for updates
    console.debug('ApiService.updateFacility - backend payload:', facilityData);
    return makeRequest<Facility>(`/facilities/${id}/`, { method: 'PUT', body: JSON.stringify(facilityData) });
  },
  
  deleteFacility: (id: string): Promise<void> => 
    makeRequest<void>(`/facilities/${id}/`, { method: 'DELETE' }),

  // Rooms
  getRooms: (): Promise<Room[]> => 
    makeRequest<Room[]>('/rooms/'),
  
  getRoom: (id: string): Promise<Room> => 
    makeRequest<Room>(`/rooms/${id}/`),
  
  createRoom: (room: Room): Promise<Room> => {
    const roomData = {
      id: room.id,
      name: room.name,
      target_humidity: room.targetHumidity,
      humidity: room.humidity,
      temperature: room.temperature,
      status: room.status,
      trend: room.trend,
    };
    return makeRequest<Room>('/rooms/', { method: 'POST', body: JSON.stringify(roomData) });
  },
  
  updateRoom: (id: string, room: Room): Promise<Room> => {
    const roomData = {
      id: room.id,
      name: room.name,
      target_humidity: room.targetHumidity,
      humidity: room.humidity,
      temperature: room.temperature,
      status: room.status,
      trend: room.trend,
    };
    return makeRequest<Room>(`/rooms/${id}/`, { method: 'PUT', body: JSON.stringify(roomData) });
  },
  
  deleteRoom: (id: string): Promise<void> => 
    makeRequest<void>(`/rooms/${id}/`, { method: 'DELETE' }),

  // Boilers
  getBoilers: async (): Promise<Boiler[]> => {
    const data: any[] = await makeRequest<any[]>('/boilers/');
    return data.map(b => mapBoilerFromBackend(b));
  },

  getBoiler: async (id: string): Promise<Boiler> => {
    const b: any = await makeRequest<any>(`/boilers/${id}/`);
    return mapBoilerFromBackend(b);
  },
  
  createBoiler: (boiler: Boiler): Promise<Boiler> => {
    const data = mapBoilerForBackend(boiler as any);
    return makeRequest<Boiler>('/boilers/', { method: 'POST', body: JSON.stringify(data) });
  },
  
  updateBoiler: (id: string, boiler: Boiler): Promise<Boiler> => {
    const data = mapBoilerForBackend(boiler as any);
    return makeRequest<Boiler>(`/boilers/${id}/`, { method: 'PUT', body: JSON.stringify(data) });
  },
  
  deleteBoiler: (id: string): Promise<void> => 
    makeRequest<void>(`/boilers/${id}/`, { method: 'DELETE' }),

  // Air Sensors
  getAirSensors: (): Promise<AirSensor[]> => 
    makeRequest<AirSensor[]>('/air-sensors/'),
  
  getAirSensor: (id: string): Promise<AirSensor> => 
    makeRequest<AirSensor>(`/air-sensors/${id}/`),
  
  createAirSensor: (sensor: AirSensor): Promise<AirSensor> => 
    makeRequest<AirSensor>('/air-sensors/', { method: 'POST', body: JSON.stringify(sensor) }),
  
  updateAirSensor: (id: string, sensor: AirSensor): Promise<AirSensor> => 
    makeRequest<AirSensor>(`/air-sensors/${id}/`, { method: 'PUT', body: JSON.stringify(sensor) }),
  
  deleteAirSensor: (id: string): Promise<void> => 
    makeRequest<void>(`/air-sensors/${id}/`, { method: 'DELETE' }),

  // SOS Columns
  getSosColumns: (): Promise<SOSColumn[]> => 
    makeRequest<SOSColumn[]>('/sos-columns/'),
  
  getSosColumn: (id: string): Promise<SOSColumn> => 
    makeRequest<SOSColumn>(`/sos-columns/${id}/`),
  
  createSosColumn: (column: SOSColumn): Promise<SOSColumn> => 
    makeRequest<SOSColumn>('/sos-columns/', { method: 'POST', body: JSON.stringify(column) }),
  
  updateSosColumn: (id: string, column: SOSColumn): Promise<SOSColumn> => 
    makeRequest<SOSColumn>(`/sos-columns/${id}/`, { method: 'PUT', body: JSON.stringify(column) }),
  
  deleteSosColumn: (id: string): Promise<void> => 
    makeRequest<void>(`/sos-columns/${id}/`, { method: 'DELETE' }),

  // Construction Sites
  getConstructionSites: (): Promise<ConstructionSite[]> => 
    makeRequest<ConstructionSite[]>('/construction-sites/'),
  
  getConstructionSite: (id: string): Promise<ConstructionSite> => 
    makeRequest<ConstructionSite>(`/construction-sites/${id}/`),
  
  createConstructionSite: (site: ConstructionSite): Promise<ConstructionSite> => 
    makeRequest<ConstructionSite>('/construction-sites/', { method: 'POST', body: JSON.stringify(site) }),
  
  updateConstructionSite: (id: string, site: ConstructionSite): Promise<ConstructionSite> => 
    makeRequest<ConstructionSite>(`/construction-sites/${id}/`, { method: 'PUT', body: JSON.stringify(site) }),
  
  deleteConstructionSite: (id: string): Promise<void> => 
    makeRequest<void>(`/construction-sites/${id}/`, { method: 'DELETE' }),

  // Light Poles
  getLightPoles: (): Promise<LightPole[]> => 
    makeRequest<LightPole[]>('/light-poles/'),
  
  getLightPole: (id: string): Promise<LightPole> => 
    makeRequest<LightPole>(`/light-poles/${id}/`),
  
  createLightPole: (pole: LightPole): Promise<LightPole> => 
    makeRequest<LightPole>('/light-poles/', { method: 'POST', body: JSON.stringify(pole) }),
  
  updateLightPole: (id: string, pole: LightPole): Promise<LightPole> => 
    makeRequest<LightPole>(`/light-poles/${id}/`, { method: 'PUT', body: JSON.stringify(pole) }),
  
  deleteLightPole: (id: string): Promise<void> => 
    makeRequest<void>(`/light-poles/${id}/`, { method: 'DELETE' }),

  // Buses
  getBuses: (): Promise<Bus[]> => 
    makeRequest<Bus[]>('/buses/'),
  
  getBus: (id: string): Promise<Bus> => 
    makeRequest<Bus>(`/buses/${id}/`),
  
  createBus: (bus: Bus): Promise<Bus> => 
    makeRequest<Bus>('/buses/', { method: 'POST', body: JSON.stringify(bus) }),
  
  updateBus: (id: string, bus: Bus): Promise<Bus> => 
    makeRequest<Bus>(`/buses/${id}/`, { method: 'PUT', body: JSON.stringify(bus) }),
  
  deleteBus: (id: string): Promise<void> => 
    makeRequest<void>(`/buses/${id}/`, { method: 'DELETE' }),

  // Eco Violations
  getEcoViolations: (): Promise<EcoViolation[]> => 
    makeRequest<EcoViolation[]>('/eco-violations/'),
  
  getEcoViolation: (id: string): Promise<EcoViolation> => 
    makeRequest<EcoViolation>(`/eco-violations/${id}/`),
  
  createEcoViolation: (violation: EcoViolation): Promise<EcoViolation> => 
    makeRequest<EcoViolation>('/eco-violations/', { method: 'POST', body: JSON.stringify(violation) }),
  
  updateEcoViolation: (id: string, violation: EcoViolation): Promise<EcoViolation> => 
    makeRequest<EcoViolation>(`/eco-violations/${id}/`, { method: 'PUT', body: JSON.stringify(violation) }),
  
  deleteEcoViolation: (id: string): Promise<void> => 
    makeRequest<void>(`/eco-violations/${id}/`, { method: 'DELETE' }),
  
  // IoT Devices
  getIoTDevices: async (): Promise<IoTDevice[]> => {
    const devices = await makeRequest<any[]>('/iot-devices/');
    // Map snake_case -> camelCase for UI compatibility
    return devices.map(mapIoTDevice);
  },
  
  getIoTDevice: async (id: string): Promise<IoTDevice> => {
    const d = await makeRequest<any>(`/iot-devices/${id}/`);
    return mapIoTDevice(d);
  },
  
  createIoTDevice: async (device: IoTDevice): Promise<IoTDevice> => {
    // Convert camelCase field names to snake_case for Django backend
    const deviceData = {
      ...device,
      device_id: device.deviceId,
      device_type: device.deviceType,
      room_id: device.roomId,
      boiler_id: device.boilerId,
    };
    // Remove the camelCase fields to avoid conflicts
    const { deviceId, deviceType, roomId, boilerId, ...cleanDeviceData } = deviceData;
    
    const created = await makeRequest<any>('/iot-devices/', { method: 'POST', body: JSON.stringify(cleanDeviceData) });
    return mapIoTDevice(created);
  },
  
  updateIoTDevice: async (id: string, device: IoTDevice): Promise<IoTDevice> => {
    // Convert camelCase field names to snake_case for Django backend
    const deviceData = {
      ...device,
      device_id: device.deviceId,
      device_type: device.deviceType,
      room_id: device.roomId,
      boiler_id: device.boilerId,
    };
    // Remove the camelCase fields to avoid conflicts
    const { deviceId, deviceType, roomId, boilerId, ...cleanDeviceData } = deviceData;
    
    const updated = await makeRequest<any>(`/iot-devices/${id}/`, { method: 'PUT', body: JSON.stringify(cleanDeviceData) });
    return mapIoTDevice(updated);
  },
  
  deleteIoTDevice: (id: string): Promise<void> => 
    makeRequest<void>(`/iot-devices/${id}/`, { method: 'DELETE' }),
  
  // Send IoT sensor data
  updateIoTDeviceData: (data: {device_id: string, temperature?: number, humidity?: number, sleep_seconds?: number, timestamp?: number}): Promise<any> => 
    makeRequest<any>('/iot-devices/data/update/', { method: 'POST', body: JSON.stringify(data) }),
  
  // Link IoT device to boiler
  linkIoTDeviceToBoiler: (deviceId: string, boilerId: string): Promise<any> => 
    makeRequest<any>('/iot-devices/link-to-boiler/', { method: 'POST', body: JSON.stringify({ device_id: deviceId, boiler_id: boilerId }) }),
  
  // Link IoT device to room
  linkIoTDeviceToRoom: (deviceId: string, roomId: string): Promise<any> => 
    makeRequest<any>(`/iot-devices/link-to-room/`, { method: 'POST', body: JSON.stringify({ device_id: deviceId, room_id: roomId }) }),
  
  // Dashboard stats
  getDashboardStats: (): Promise<any> => 
    makeRequest<any>('/dashboard/stats/'),
  
  // Search functionality
  searchEntities: (query: string, type?: string): Promise<any> => 
    makeRequest<any>(`/search/?q=${encodeURIComponent(query)}${type ? `&type=${type}` : ''}`),
};