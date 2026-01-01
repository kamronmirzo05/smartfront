import { Organization, CallRequest, MoistureSensor, WasteBin, Truck, Facility, AirSensor, SOSColumn, ConstructionSite, LightPole, Bus, EcoViolation, IoTDevice, Room, Boiler } from '../types';
import { MOCK_ORGANIZATIONS, generateCallRequests, generateMoistureSensors, generateFacilities, generateWasteBins, generateTrucks, generateAirSensors, generateSOSColumns, MOCK_CONSTRUCTION_SITES, generateLightPoles, MAP_CENTER, generateBuses, generateEcoViolations } from '../constants';
import { ApiService } from './api';

const KEYS = {
    ORGS: 'smartcity_orgs',
    TICKETS: 'smartcity_tickets',
    SENSORS: 'smartcity_sensors',
    BINS: 'smartcity_bins',
    TRUCKS: 'smartcity_trucks',
    FACILITIES: 'smartcity_facilities',
    AIR: 'smartcity_air',
    SOS: 'smartcity_sos',
    CONST: 'smartcity_construction',
    LIGHT: 'smartcity_light',
    TRANSPORT: 'smartcity_transport',
    ECO: 'smartcity_eco'
};

// Helper to get or seed data from API
async function getOrSeedAsync<T>(key: string, seedFn: () => T[], apiFn: () => Promise<T[]>): Promise<T[]> {
    // Check if we have a valid auth token before attempting API call
    const token = localStorage.getItem('authToken');
    if (!token) {
        // If no token, return seed data or empty array
        console.log(`No auth token found, returning empty array for ${key}`);
        return seedFn();
    }
    
    try {
        // Try to get data from API
        const result = await apiFn();
        // Ensure we return an array, even if the API returns something unexpected
        return Array.isArray(result) ? result : seedFn();
    } catch (e) {
        // Check if the error is due to authentication
        if (e instanceof Error && e.message.includes('401')) {
            console.log(`Authentication failed for ${key}, returning empty array`);
            // If authentication fails, remove the invalid token
            localStorage.removeItem('authToken');
            return seedFn();
        }
        
        console.error(`API Error ${key}:`, e);
        // Fallback to seed data if API fails
        return seedFn();
    }
}

async function saveAsync<T>(key: string, data: T[], apiUpdateFn: (item: T) => Promise<T>, apiCreateFn: (item: T) => Promise<T>): Promise<void> {
    // For each item in the data array, update or create via API
    // This is a simplified approach - in a real implementation, you might want to batch updates
    for (const item of data) {
        try {
            // Check if item has an ID to determine if it's an update or create
            if (item && (item as any).id) {
                await apiUpdateFn(item);
            } else {
                await apiCreateFn(item);
            }
        } catch (e) {
            // Check if the error is due to authentication
            if (e instanceof Error && e.message.includes('401')) {
                console.log(`Authentication failed when saving ${key}, skipping save`);
                // If authentication fails, remove the invalid token
                localStorage.removeItem('authToken');
                return; // Stop trying to save
            }
            
            console.error(`API Save Error ${key}:`, e);
            // Continue with other items even if one fails
        }
    }
}

// --- PUBLIC API ---
// This maintains the same interface as before but uses the API backend
export const DB = {
    // Organizations (Auth)
    async getOrgs(): Promise<Organization[]> {
        return getOrSeedAsync<Organization>(
            KEYS.ORGS, 
            () => [], // Never use mock organizations, get from API only
            () => ApiService.getOrganizations()
        );
    },
    async saveOrg(org: Organization): Promise<Organization> {
        try {
            // Get the user's organization ID from session if available
            const orgId = localStorage.getItem('organizationId');
            
            // Clean the organization data to only include fields that the backend expects
            // Don't include 'center' field as it's read-only in the serializer
            const cleanedOrg = {
                name: org.name,
                type: org.type,
                login: org.login,
                password: org.password,
                regionId: org.regionId,
                districtId: org.districtId,
                enabled_modules: org.enabledModules || [],
            };
            
            // Check if org exists (has an ID that looks like a UUID)
            if (org.id && org.id.length > 10) {
                const updatedOrg = await ApiService.updateOrganization(org.id, cleanedOrg as unknown as Organization);
                return updatedOrg;
            } else {
                const createdOrg = await ApiService.createOrganization(cleanedOrg as unknown as Organization);
                return createdOrg;
            }
        } catch (e) {
            // Check if the error is due to authentication
            if (e instanceof Error && e.message.includes('401')) {
                console.log('Authentication failed when saving organization, skipping save');
                // If authentication fails, remove the invalid token
                localStorage.removeItem('authToken');
                throw e; // Re-throw to be handled by the calling function
            }
            
            // Log the error and re-throw so the calling function knows about the failure
            console.error('API Save Org Error:', e);
            throw e;
        }
    },
    async deleteOrg(id: string): Promise<void> {
        try {
            await ApiService.deleteOrganization(id);
        } catch (e) {
            // Only log the error, don't throw - this prevents continuous error requests
            console.error('API Delete Org Error:', e);
        }
    },

    // Call Center Tickets
    async getTickets(): Promise<CallRequest[]> {
        return getOrSeedAsync<CallRequest>(
            KEYS.TICKETS,
            () => [], // Don't use mock tickets, get from API only
            () => ApiService.getCallRequests()
        );
    },
    async addTicket(ticket: CallRequest): Promise<void> {
        try {
            await ApiService.createCallRequest(ticket);
        } catch (e) {
            // Only log the error, don't throw - this prevents continuous error requests
            console.error('API Add Ticket Error:', e);
        }
    },
    async updateTicket(ticket: CallRequest): Promise<void> {
        try {
            await ApiService.updateCallRequest(ticket.id, ticket);
        } catch (e) {
            // Only log the error, don't throw - this prevents continuous error requests
            console.error('API Update Ticket Error:', e);
        }
    },

    // Moisture Sensors
    async getSensors(): Promise<MoistureSensor[]> {
        return getOrSeedAsync<MoistureSensor>(
            KEYS.SENSORS,
            () => [], // Don't use mock sensors, get from API only
            () => ApiService.getMoistureSensors()
        );
    },
    async saveSensors(list: MoistureSensor[]): Promise<void> {
        // For each sensor, try to update or create
        for (const sensor of list) {
            try {
                if (sensor.id && sensor.id.length > 10) {
                    await ApiService.updateMoistureSensor(sensor.id, sensor);
                } else {
                    await ApiService.createMoistureSensor(sensor);
                }
            } catch (e) {
                // Only log the error, don't throw - this prevents continuous error requests
                console.error('API Save Sensor Error:', e);
            }
        }
    },

    // Waste Bins - Get from API only, don't use mock data
    async getBins(): Promise<WasteBin[]> {
        return getOrSeedAsync<WasteBin>(
            KEYS.BINS,
            () => [], // Don't use mock bins, get from API only
            () => ApiService.getWasteBins()
        );
    },
    async saveBin(bin: WasteBin): Promise<WasteBin> {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                // If no token, just update local storage
                const bins = JSON.parse(localStorage.getItem('smartcity_bins') || '[]');
                // Find and replace if exists, otherwise add
                const existingIndex = bins.findIndex(b => b.id === bin.id);
                if (existingIndex !== -1) {
                    bins[existingIndex] = bin;
                } else {
                    bins.push(bin);
                }
                localStorage.setItem('smartcity_bins', JSON.stringify(bins));
                return bin; // Return the original bin
            }
            
            // For new bins, we should create them
            // Don't send the ID when creating, let the backend generate its own
            // Also, remove any properties that might cause server errors
            const binForCreation = { ...bin };
            delete binForCreation.id; // Don't send ID for creation
            
            // Get the user's organization ID from session if available
            const orgId = localStorage.getItem('organizationId');
            
            // Clean the bin data to only include fields that the backend expects
            const cleanedBin = {
                location: {
                    lat: parseFloat(binForCreation.location.lat.toString()),
                    lng: parseFloat(binForCreation.location.lng.toString()),
                },
                address: binForCreation.address,
                tozaHudud: binForCreation.tozaHudud,
                cameraUrl: binForCreation.cameraUrl,
                googleMapsUrl: binForCreation.googleMapsUrl,
                fillLevel: Number(binForCreation.fillLevel),
                fillRate: Number(binForCreation.fillRate),
                lastAnalysis: binForCreation.lastAnalysis,
                imageUrl: binForCreation.imageUrl,
                imageSource: binForCreation.imageSource,
                isFull: Boolean(binForCreation.isFull),
                qrCodeUrl: binForCreation.qrCodeUrl,
                deviceHealth: {
                    batteryLevel: Number(binForCreation.deviceHealth.batteryLevel),
                    signalStrength: Number(binForCreation.deviceHealth.signalStrength),
                    lastPing: binForCreation.deviceHealth.lastPing,
                    firmwareVersion: binForCreation.deviceHealth.firmwareVersion,
                    isOnline: Boolean(binForCreation.deviceHealth.isOnline)
                },
                organizationId: orgId || undefined,
            };
            
            try {
                const createdBin = await ApiService.createWasteBin(cleanedBin as Partial<WasteBin> as WasteBin);
                // Update local storage with the response from the server (which has the backend-generated ID)
                const bins = JSON.parse(localStorage.getItem('smartcity_bins') || '[]');
                const existingIndex = bins.findIndex(b => b.id === bin.id);
                if (existingIndex !== -1) {
                    bins[existingIndex] = createdBin;
                } else {
                    bins.push(createdBin);
                }
                localStorage.setItem('smartcity_bins', JSON.stringify(bins));
                return createdBin; // Return the created bin with new ID
            } catch (createError) {
                console.error('Failed to create waste bin:', createError);
                throw createError; // Re-throw to be caught by outer catch
            }
        } catch (e) {
            // Check if the error is due to authentication
            if (e instanceof Error && e.message.includes('401')) {
                console.log('Authentication failed when saving bin, skipping save');
                // If authentication fails, remove the invalid token
                localStorage.removeItem('authToken');
                return bin; // Return the original bin
            }
            
            // Only log the error, don't throw - this prevents continuous error requests
            console.error('API Save Bin Error:', e);
            return bin; // Return the original bin
        }
    },

    // Trucks - Get from API only, don't use mock data
    async getTrucks(): Promise<Truck[]> {
        return getOrSeedAsync<Truck>(
            KEYS.TRUCKS,
            () => [], // Don't use mock trucks, get from API only
            () => ApiService.getTrucks()
        );
    },
    async saveTruck(truck: Truck): Promise<Truck> {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                // If no token, just update local storage
                const trucks = JSON.parse(localStorage.getItem('smartcity_trucks') || '[]');
                // Find and replace if exists, otherwise add
                const existingIndex = trucks.findIndex(t => t.id === truck.id);
                if (existingIndex !== -1) {
                    trucks[existingIndex] = truck;
                } else {
                    trucks.push(truck);
                }
                localStorage.setItem('smartcity_trucks', JSON.stringify(trucks));
                return truck;
            }
            
            // For new trucks, we should create them
            // Don't send the ID when creating, let the backend generate its own
            // Also, remove any properties that might cause server errors
            const truckForCreation = { ...truck };
            delete truckForCreation.id; // Don't send ID for creation
            
            // Get the user's organization ID from session if available
            const orgId = localStorage.getItem('organizationId');
            
            // Clean the truck data to only include fields that the backend expects
            const cleanedTruck = {
                driver_name: truckForCreation.driverName,
                plate_number: truckForCreation.plateNumber,
                phone: truckForCreation.phone,
                toza_hudud: truckForCreation.tozaHudud,
                location: {
                    lat: parseFloat(truckForCreation.location.lat.toString()),
                    lng: parseFloat(truckForCreation.location.lng.toString()),
                },
                status: truckForCreation.status,
                fuel_level: Number(truckForCreation.fuelLevel),
                login: truckForCreation.login,
                password: truckForCreation.password,
                organization: orgId || undefined,
            };
            
            try {
                const createdTruck = await ApiService.createTruck(cleanedTruck as Partial<Truck> as Truck);
                // Update local storage with the response from the server (which has the backend-generated ID)
                const trucks = JSON.parse(localStorage.getItem('smartcity_trucks') || '[]');
                const existingIndex = trucks.findIndex(t => t.id === truck.id);
                if (existingIndex !== -1) {
                    trucks[existingIndex] = createdTruck;
                } else {
                    trucks.push(createdTruck);
                }
                localStorage.setItem('smartcity_trucks', JSON.stringify(trucks));
                return createdTruck;
            } catch (createError) {
                console.error('Failed to create truck:', createError);
                throw createError; // Re-throw to be caught by outer catch
            }
        } catch (e) {
            // Check if the error is due to authentication
            if (e instanceof Error && e.message.includes('401')) {
                console.log('Authentication failed when saving truck, skipping save');
                // If authentication fails, remove the invalid token
                localStorage.removeItem('authToken');
                return truck;
            }
            
            // Only log the error, don't throw - this prevents continuous error requests
            console.error('API Save Truck Error:', e);
            return truck;
        }
    },

    // Facilities
    async getFacilities(): Promise<Facility[]> {
        return getOrSeedAsync<Facility>(
            KEYS.FACILITIES,
            () => [], // Don't use mock facilities, get from API only
            () => ApiService.getFacilities()
        );
    },
    async saveFacility(facility: Facility): Promise<void> {
        try {
            const facilityForCreation = { ...facility };
            
            // Check if facility exists (has an ID)
            if (facilityForCreation.id) {
                // For update, we can pass the facility as is
                await ApiService.updateFacility(facilityForCreation.id, facilityForCreation);
            } else {
                // For create, we need to convert camelCase to snake_case and handle organization
                const orgId = localStorage.getItem('organizationId');
                
                const cleanedFacility = {
                    name: facilityForCreation.name,
                    type: facilityForCreation.type,
                    mfy: facilityForCreation.mfy,
                    overallStatus: facilityForCreation.overallStatus,
                    energyUsage: facilityForCreation.energyUsage,
                    efficiencyScore: facilityForCreation.efficiencyScore,
                    managerName: facilityForCreation.managerName,
                    lastMaintenance: facilityForCreation.lastMaintenance,
                    history: facilityForCreation.history,
                    boilers: facilityForCreation.boilers,
                    organizationId: orgId || undefined,
                };
                // Helpful debug: log the payload produced by the storage layer before handing to ApiService
                console.debug('DB.saveFacility - cleaned payload (frontend):', cleanedFacility);
                
                await ApiService.createFacility(cleanedFacility as Partial<Facility> as Facility);
            }
        } catch (e) {
            // Check if the error is due to authentication
            if (e instanceof Error && e.message.includes('401')) {
                console.log('Authentication failed when saving facility, skipping save');
                // If authentication fails, remove the invalid token
                localStorage.removeItem('authToken');
                return; // Stop trying to save
            }
            
            // Only log the error, don't throw - this prevents continuous error requests
            console.error('API Save Facility Error:', e);
        }
    },

    // Rooms
    async getRooms(): Promise<Room[]> {
        return getOrSeedAsync<Room>(
            'smartcity_rooms',
            () => [], // Don't use mock rooms, get from API only
            () => ApiService.getRooms()
        );
    },
    async saveRoom(room: Room): Promise<void> {
        try {
            const roomForCreation = { ...room };
            
            // Check if room exists (has an ID)
            if (roomForCreation.id) {
                // For update, we can pass the room as is
                await ApiService.updateRoom(roomForCreation.id, roomForCreation);
            } else {
                // For create, we need to convert camelCase to snake_case and handle organization
                const orgId = localStorage.getItem('organizationId');
                
                const cleanedRoom = {
                    name: roomForCreation.name,
                    targetHumidity: roomForCreation.targetHumidity,
                    humidity: roomForCreation.humidity,
                    status: roomForCreation.status,
                    trend: roomForCreation.trend,
                    organizationId: orgId || undefined,
                };
                
                const createdRoom = await ApiService.createRoom(cleanedRoom as Partial<Room> as Room);

            }
        } catch (e) {
            // Check if the error is due to authentication
            if (e instanceof Error && e.message.includes('401')) {
                console.log('Authentication failed when saving room, skipping save');
                // If authentication fails, remove the invalid token
                localStorage.removeItem('authToken');
                return; // Stop trying to save
            }
            
            // Only log the error, don't throw - this prevents continuous error requests
            console.error('API Save Room Error:', e);
        }
    },

    // Boilers
    async getBoilers(): Promise<Boiler[]> {
        return getOrSeedAsync<Boiler>(
            'smartcity_boilers',
            () => [], // Don't use mock boilers, get from API only
            () => ApiService.getBoilers()
        );
    },
    async saveBoiler(boiler: Boiler): Promise<void> {
        try {
            const boilerForCreation = { ...boiler };
            
            // Check if boiler exists (has an ID)
            if (boilerForCreation.id) {
                // For update, we can pass the boiler as is
                await ApiService.updateBoiler(boilerForCreation.id, boilerForCreation);
            } else {
                // For create, we need to convert camelCase to snake_case and handle organization
                const orgId = localStorage.getItem('organizationId');
                
                const cleanedBoiler = {
                    name: boilerForCreation.name,
                    targetHumidity: boilerForCreation.targetHumidity,
                    humidity: boilerForCreation.humidity,
                    status: boilerForCreation.status,
                    trend: boilerForCreation.trend,
                    deviceHealth: boilerForCreation.deviceHealth,
                    connectedRooms: boilerForCreation.connectedRooms,
                    organizationId: orgId || undefined,
                };
                
                await ApiService.createBoiler(cleanedBoiler as Partial<Boiler> as Boiler);
            }
        } catch (e) {
            // Check if the error is due to authentication
            if (e instanceof Error && e.message.includes('401')) {
                console.log('Authentication failed when saving boiler, skipping save');
                // If authentication fails, remove the invalid token
                localStorage.removeItem('authToken');
                return; // Stop trying to save
            }
            
            // Only log the error, don't throw - this prevents continuous error requests
            console.error('API Save Boiler Error:', e);
        }
    },

    // Air Sensors
    async getAirSensors(): Promise<AirSensor[]> {
        return getOrSeedAsync<AirSensor>(
            KEYS.AIR,
            () => [], // Don't use mock air sensors, get from API only
            () => ApiService.getAirSensors()
        );
    },
    async saveAirSensor(sensor: AirSensor): Promise<void> {
        try {
            const sensorForCreation = { ...sensor };
            
            // Check if sensor exists (has an ID)
            if (sensorForCreation.id) {
                // For update, we can pass the sensor as is
                await ApiService.updateAirSensor(sensorForCreation.id, sensorForCreation);
            } else {
                // For create, we need to convert camelCase to snake_case and handle organization
                const orgId = localStorage.getItem('organizationId');
                
                const cleanedSensor = {
                    name: sensorForCreation.name,
                    mfy: sensorForCreation.mfy,
                    location: sensorForCreation.location,
                    aqi: sensorForCreation.aqi,
                    pm25: sensorForCreation.pm25,
                    co2: sensorForCreation.co2,
                    status: sensorForCreation.status,
                    organizationId: orgId || undefined,
                };
                
                await ApiService.createAirSensor(cleanedSensor as Partial<AirSensor> as AirSensor);
            }
        } catch (e) {
            // Check if the error is due to authentication
            if (e instanceof Error && e.message.includes('401')) {
                console.log('Authentication failed when saving air sensor, skipping save');
                // If authentication fails, remove the invalid token
                localStorage.removeItem('authToken');
                return; // Stop trying to save
            }
            
            // Only log the error, don't throw - this prevents continuous error requests
            console.error('API Save Air Sensor Error:', e);
        }
    },

    // SOS Columns
    async getSOS(): Promise<SOSColumn[]> {
        return getOrSeedAsync<SOSColumn>(
            KEYS.SOS,
            () => [], // Don't use mock SOS columns, get from API only
            () => ApiService.getSosColumns()
        );
    },
    async saveSOS(list: SOSColumn[]): Promise<void> {
        for (const column of list) {
            try {
                const columnForCreation = { ...column };
                
                if (columnForCreation.id && columnForCreation.id.length > 10) {
                    // For update, we can pass the column as is
                    await ApiService.updateSosColumn(columnForCreation.id, columnForCreation);
                } else {
                    // For create, we need to convert camelCase to snake_case and handle organization
                    const orgId = localStorage.getItem('organizationId');
                    
                    const cleanedColumn = {
                        name: columnForCreation.name,
                        location: columnForCreation.location,
                        mfy: columnForCreation.mfy,
                        status: columnForCreation.status,
                        cameraUrl: columnForCreation.cameraUrl,
                        lastTest: columnForCreation.lastTest,
                        deviceHealth: columnForCreation.deviceHealth,
                        organizationId: orgId || undefined,
                    };
                    
                    await ApiService.createSosColumn(cleanedColumn as Partial<SOSColumn> as SOSColumn);
                }
            } catch (e) {
                // Only log the error, don't throw - this prevents continuous error requests
                console.error('API Save SOS Error:', e);
            }
        }
    },

    // Construction
    async getConstruction(): Promise<ConstructionSite[]> {
        return getOrSeedAsync<ConstructionSite>(
            KEYS.CONST,
            () => [], // Don't use mock construction sites, get from API only
            () => ApiService.getConstructionSites()
        );
    },
    async saveConstruction(list: ConstructionSite[]): Promise<void> {
        for (const site of list) {
            try {
                const siteForCreation = { ...site };
                
                if (siteForCreation.id && siteForCreation.id.length > 10) {
                    // For update, we can pass the site as is
                    await ApiService.updateConstructionSite(siteForCreation.id, siteForCreation);
                } else {
                    // For create, we need to convert camelCase to snake_case and handle organization
                    const orgId = localStorage.getItem('organizationId');
                    
                    const cleanedSite = {
                        name: siteForCreation.name,
                        address: siteForCreation.address,
                        contractorName: siteForCreation.contractorName,
                        cameraUrl: siteForCreation.cameraUrl,
                        startDate: siteForCreation.startDate,
                        status: siteForCreation.status,
                        overallProgress: siteForCreation.overallProgress,
                        currentAiStage: siteForCreation.currentAiStage,
                        aiConfidence: siteForCreation.aiConfidence,
                        detectedObjects: siteForCreation.detectedObjects,
                        missions: siteForCreation.missions,
                        history: siteForCreation.history,
                        organizationId: orgId || undefined,
                    };
                    
                    await ApiService.createConstructionSite(cleanedSite as Partial<ConstructionSite> as ConstructionSite);
                }
            } catch (e) {
                // Only log the error, don't throw - this prevents continuous error requests
                console.error('API Save Construction Error:', e);
            }
        }
    },

    // Light Poles
    async getLights(): Promise<LightPole[]> {
        return getOrSeedAsync<LightPole>(
            KEYS.LIGHT,
            () => [], // Don't use mock light poles, get from API only
            () => ApiService.getLightPoles()
        );
    },
    async saveLight(light: LightPole): Promise<void> {
        try {
            const lightForCreation = { ...light };
            
            // Check if light exists (has an ID)
            if (lightForCreation.id) {
                // For update, we can pass the light as is
                await ApiService.updateLightPole(lightForCreation.id, lightForCreation);
            } else {
                // For create, we need to convert camelCase to snake_case and handle organization
                const orgId = localStorage.getItem('organizationId');
                
                const cleanedLight = {
                    location: lightForCreation.location,
                    address: lightForCreation.address,
                    cameraUrl: lightForCreation.cameraUrl,
                    status: lightForCreation.status,
                    luminance: lightForCreation.luminance,
                    lastCheck: lightForCreation.lastCheck,
                    rois: lightForCreation.rois,
                    organizationId: orgId || undefined,
                };
                
                await ApiService.createLightPole(cleanedLight as Partial<LightPole> as LightPole);
            }
        } catch (e) {
            // Check if the error is due to authentication
            if (e instanceof Error && e.message.includes('401')) {
                console.log('Authentication failed when saving light pole, skipping save');
                // If authentication fails, remove the invalid token
                localStorage.removeItem('authToken');
                return; // Stop trying to save
            }
            
            // Only log the error, don't throw - this prevents continuous error requests
            console.error('API Save Light Error:', e);
        }
    },

    // Transport (Buses)
    async getTransport(): Promise<Bus[]> {
        return getOrSeedAsync<Bus>(
            KEYS.TRANSPORT,
            () => [], // Don't use mock buses, get from API only
            () => ApiService.getBuses()
        );
    },
    async saveTransport(bus: Bus): Promise<void> {
        try {
            const busForCreation = { ...bus };
            
            // Check if bus exists (has an ID)
            if (busForCreation.id) {
                // For update, we can pass the bus as is
                await ApiService.updateBus(busForCreation.id, busForCreation);
            } else {
                // For create, we need to convert camelCase to snake_case and handle organization
                const orgId = localStorage.getItem('organizationId');
                
                const cleanedBus = {
                    routeNumber: busForCreation.routeNumber,
                    plateNumber: busForCreation.plateNumber,
                    driverName: busForCreation.driverName,
                    location: busForCreation.location,
                    bearing: busForCreation.bearing,
                    speed: busForCreation.speed,
                    rpm: busForCreation.rpm,
                    passengers: busForCreation.passengers,
                    status: busForCreation.status,
                    fuelLevel: busForCreation.fuelLevel,
                    engineTemp: busForCreation.engineTemp,
                    doorStatus: busForCreation.doorStatus,
                    cabinTemp: busForCreation.cabinTemp,
                    driverHeartRate: busForCreation.driverHeartRate,
                    driverFatigueLevel: busForCreation.driverFatigueLevel,
                    nextStop: busForCreation.nextStop,
                    cctvUrls: busForCreation.cctvUrls,
                    organizationId: orgId || undefined,
                };
                
                await ApiService.createBus(cleanedBus as Partial<Bus> as Bus);
            }
        } catch (e) {
            // Check if the error is due to authentication
            if (e instanceof Error && e.message.includes('401')) {
                console.log('Authentication failed when saving bus, skipping save');
                // If authentication fails, remove the invalid token
                localStorage.removeItem('authToken');
                return; // Stop trying to save
            }
            
            // Only log the error, don't throw - this prevents continuous error requests
            console.error('API Save Transport Error:', e);
        }
    },

    // Eco Control
    async getEco(): Promise<EcoViolation[]> {
        return getOrSeedAsync<EcoViolation>(
            KEYS.ECO,
            () => [], // Don't use mock eco violations, get from API only
            () => ApiService.getEcoViolations()
        );
    },
    async saveEco(violation: EcoViolation): Promise<void> {
        try {
            const violationForCreation = { ...violation };
            
            // Check if violation exists (has an ID)
            if (violationForCreation.id) {
                // For update, we can pass the violation as is
                await ApiService.updateEcoViolation(violationForCreation.id, violationForCreation);
            } else {
                // For create, we need to convert camelCase to snake_case and handle organization
                const orgId = localStorage.getItem('organizationId');
                
                const cleanedViolation = {
                    locationName: violationForCreation.locationName,
                    mfy: violationForCreation.mfy,
                    timestamp: violationForCreation.timestamp,
                    imageUrl: violationForCreation.imageUrl,
                    confidence: violationForCreation.confidence,
                    offenderName: violationForCreation.offender?.name,
                    faceId: violationForCreation.offender?.faceId,
                    faceImageUrl: violationForCreation.offender?.faceImageUrl,
                    matchScore: violationForCreation.offender?.matchScore,
                    estimatedAge: violationForCreation.offender?.estimatedAge,
                    gender: violationForCreation.offender?.gender,
                    organizationId: orgId || undefined,
                };
                
                await ApiService.createEcoViolation(cleanedViolation as Partial<EcoViolation> as EcoViolation);
            }
        } catch (e) {
            // Check if the error is due to authentication
            if (e instanceof Error && e.message.includes('401')) {
                console.log('Authentication failed when saving eco violation, skipping save');
                // If authentication fails, remove the invalid token
                localStorage.removeItem('authToken');
                return; // Stop trying to save
            }
            
            // Only log the error, don't throw - this prevents continuous error requests
            console.error('API Save Eco Error:', e);
        }
    },
    
    // IoT Devices
    async getIoTDevices(): Promise<IoTDevice[]> {
        return getOrSeedAsync<IoTDevice>(
            'smartcity_iot_devices',
            () => [], // Don't use mock IoT devices, get from API only
            () => ApiService.getIoTDevices()
        );
    },
    async saveIoTDevice(device: IoTDevice): Promise<void> {
        try {
            const deviceForCreation = { ...device };
            
            // Check if device exists (has an ID)
            if (deviceForCreation.id) {
                // For update, we can pass the device as is
                await ApiService.updateIoTDevice(deviceForCreation.id, deviceForCreation);
            } else {
                // For create, we need to convert camelCase to snake_case and handle organization
                const orgId = localStorage.getItem('organizationId');
                
                const cleanedDevice = {
                    deviceId: deviceForCreation.deviceId,
                    deviceType: deviceForCreation.deviceType,
                    roomId: deviceForCreation.roomId,
                    boilerId: deviceForCreation.boilerId,
                    location: deviceForCreation.location,
                    organizationId: orgId || undefined,
                };
                
                await ApiService.createIoTDevice(cleanedDevice as Partial<IoTDevice> as IoTDevice);
            }
        } catch (e) {
            // Check if the error is due to authentication
            if (e instanceof Error && e.message.includes('401')) {
                console.log('Authentication failed when saving IoT device, skipping save');
                // If authentication fails, remove the invalid token
                localStorage.removeItem('authToken');
                return; // Stop trying to save
            }
            
            // Only log the error, don't throw - this prevents continuous error requests
            console.error('API Save IoT Device Error:', e);
        }
    },

    // System Reset - Clear API data (if supported) or just refresh
    async resetSystem(): Promise<void> {
        // In a real implementation, this would call an API endpoint to reset data
        // For now, we'll just reload the page
        window.location.reload();
    }
};