
import React, { useEffect, useRef, useMemo, useState } from 'react';
import { MoistureSensor, SensorStatus, Coordinate, WasteBin, Truck, AirSensor, SOSColumn, TozaHududType } from '../types';
import { MAP_CENTER, PARK_POLYGONS } from '../constants';
import { LocateFixed, Plus, Check, X, MapPin, Database, Layers, Trash2, Battery, Signal, Wind, Siren, ShieldAlert, Truck as TruckIcon } from 'lucide-react';

// Helper function to generate UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

declare global {
  interface Window {
    L: any;
  }
}

interface MoistureMapProps {
  sensors: MoistureSensor[];
  wasteBins?: WasteBin[];
  trucks?: Truck[];
  airSensors?: AirSensor[];
  sosColumns?: SOSColumn[];
  activeMFY?: string; 
  onAddSensor?: (sensor: MoistureSensor) => void;
  onDeleteSensor?: (id: string) => void;
  onAddBin?: (bin: WasteBin) => void;
  onAddTruck?: (truck: Truck) => void;
  onAddAirSensor?: (sensor: AirSensor) => void;
  aiPredictionMode?: boolean;
  center?: Coordinate; 
}

type SelectedEntity = 
  | { type: 'SENSOR', data: MoistureSensor }
  | { type: 'BIN', data: WasteBin }
  | { type: 'TRUCK', data: Truck }
  | { type: 'AIR', data: AirSensor }
  | { type: 'SOS', data: SOSColumn }
  | null;

type AddMode = 'IDLE' | 'PLACING_BIN' | 'PLACING_TRUCK' | 'PLACING_AIR_SENSOR';

const MoistureMap: React.FC<MoistureMapProps> = ({ 
  sensors, wasteBins = [], trucks = [], airSensors = [], sosColumns = [],
  onAddSensor, onDeleteSensor, onAddBin, onAddTruck, onAddAirSensor,
  center = MAP_CENTER 
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const drawLayerRef = useRef<any>(null);
  
  const [mode, setMode] = useState<AddMode>('IDLE');
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(null);
  const [pendingLocation, setPendingLocation] = useState<Coordinate | null>(null);
  
  // Forms State
  const [binAddress, setBinAddress] = useState("");
  const [tozaHudud, setTozaHudud] = useState<TozaHududType>('1-sonli Toza Hudud');
  const [truckDriver, setTruckDriver] = useState("");

  useEffect(() => {
    if (!mapContainerRef.current || !window.L || mapInstanceRef.current) return;
    const map = window.L.map(mapContainerRef.current, { center: [center.lat, center.lng], zoom: 15, zoomControl: false, attributionControl: false });
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
    layerGroupRef.current = window.L.layerGroup().addTo(map);
    drawLayerRef.current = window.L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    
    map.on('click', (e: any) => {
        if (mode !== 'IDLE') setPendingLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
  }, [mode]);

  // Update map view when center changes (Organization Switch)
  useEffect(() => {
      if (mapInstanceRef.current && center) {
          mapInstanceRef.current.setView([center.lat, center.lng], 15);
      }
  }, [center]);

  useEffect(() => { renderMarkers(); }, [sensors, wasteBins, trucks, airSensors, sosColumns]);

  const renderMarkers = () => {
      if (!layerGroupRef.current || !window.L) return;
      layerGroupRef.current.clearLayers();
      
      wasteBins.forEach(bin => {
          const color = bin.fillLevel > 80 ? 'bg-red-500' : 'bg-emerald-500';
          const icon = window.L.divIcon({ className: 'bg-transparent', html: `<div class="${color} w-5 h-5 rounded-lg border-2 border-white shadow-lg flex items-center justify-center"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></div>` });
          const m = window.L.marker([bin.location.lat, bin.location.lng], { icon }).addTo(layerGroupRef.current);
          m.on('click', () => setSelectedEntity({ type: 'BIN', data: bin }));
      });

      trucks.forEach(t => {
          const icon = window.L.divIcon({ className: 'bg-transparent', html: `<div class="bg-blue-600 w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div>` });
          const m = window.L.marker([t.location.lat, t.location.lng], { icon }).addTo(layerGroupRef.current);
          m.on('click', () => setSelectedEntity({ type: 'TRUCK', data: t }));
      });
  };

  const handleSaveBin = () => {
      if (!pendingLocation || !onAddBin) return;
      onAddBin({
          id: generateUUID(), // Temporary ID for UI
          location: pendingLocation,
          address: binAddress,
          tozaHudud: tozaHudud,
          fillLevel: 0,
          fillRate: 1,
          lastAnalysis: new Date().toISOString(),
          imageUrl: '',
          isFull: false,
          deviceHealth: { batteryLevel: 100, signalStrength: 100, lastPing: new Date().toISOString(), firmwareVersion: '1.0', isOnline: true }
      });
      resetForm();
  };

  const handleSaveTruck = () => {
      if (!pendingLocation || !onAddTruck) return;
      onAddTruck({
          id: generateUUID(), // Temporary ID for UI
          driverName: truckDriver,
          plateNumber: '', // Required field
          tozaHudud: tozaHudud,
          location: pendingLocation,
          status: 'IDLE',
          fuelLevel: 100,
          phone: '+998 90'
      });
      resetForm();
  };

  const resetForm = () => {
      setMode('IDLE');
      setPendingLocation(null);
      setBinAddress("");
      setTruckDriver("");
  };

  return (
    <div className="flex flex-col h-full bg-white/40 relative">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] flex gap-2">
         {mode === 'IDLE' ? (
             <>
                 <button onClick={() => setMode('PLACING_BIN')} className="bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-bold transition-all hover:scale-105"><Plus size={14} /> Yangi Quti</button>
                 <button onClick={() => setMode('PLACING_TRUCK')} className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-bold transition-all hover:scale-105"><Plus size={14} /> Yangi Mashina</button>
             </>
         ) : (
             <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-xl border border-white flex items-center gap-3">
                 <span className="text-xs font-black text-slate-700">{pendingLocation ? "Joyni tanladingiz" : "Xaritadan nuqtani belgilang"}</span>
                 <button onClick={resetForm} className="text-red-500 hover:text-red-600"><X size={18}/></button>
             </div>
         )}
      </div>
      
      <div ref={mapContainerRef} className="flex-1 z-0 bg-slate-100 rounded-[24px] overflow-hidden" />

      {pendingLocation && (
          <div className="absolute inset-0 z-[500] bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white p-6 rounded-[24px] shadow-2xl w-full max-w-xs border border-white/60">
                  <h4 className="font-black text-slate-800 mb-4">{mode === 'PLACING_BIN' ? 'Yangi Quti' : 'Yangi Mashina'}</h4>
                  
                  <div className="space-y-3">
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase">Toza Hudud Korxonasi</label>
                          <select value={tozaHudud} onChange={e => setTozaHudud(e.target.value as TozaHududType)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none">
                              <option value="1-sonli Toza Hudud">1-sonli Toza Hudud</option>
                              <option value="2-sonli Toza Hudud">2-sonli Toza Hudud</option>
                          </select>
                      </div>

                      {mode === 'PLACING_BIN' ? (
                          <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase">Manzil</label>
                              <input value={binAddress} onChange={e => setBinAddress(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none" placeholder="Masalan: Navoiy ko'chasi"/>
                          </div>
                      ) : (
                          <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase">Haydovchi Ismi</label>
                              <input value={truckDriver} onChange={e => setTruckDriver(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none" placeholder="Ism familiya"/>
                          </div>
                      )}
                  </div>

                  <div className="flex gap-2 mt-6">
                      <button onClick={resetForm} className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100">Bekor qilish</button>
                      <button onClick={mode === 'PLACING_BIN' ? handleSaveBin : handleSaveTruck} className="flex-1 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-lg">Saqlash</button>
                  </div>
              </div>
          </div>
      )}

      {selectedEntity && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[500] bg-white p-5 rounded-[24px] shadow-2xl border border-white w-80 animate-in slide-in-from-bottom-5">
              <div className="flex justify-between items-start mb-3">
                  <h4 className="font-black text-slate-800">{selectedEntity.type === 'BIN' ? 'Chiqindi Qutisi' : 'Maxsus Texnika'}</h4>
                  <button onClick={() => setSelectedEntity(null)}><X size={18} className="text-slate-400" /></button>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex justify-between text-[10px] font-bold"><span className="text-slate-400">ID:</span> <span className="text-slate-700">{selectedEntity.data.id}</span></div>
                  {'tozaHudud' in selectedEntity.data && (
                      <div className="flex justify-between text-[10px] font-bold"><span className="text-slate-400">Korxona:</span> <span className="text-indigo-600">{(selectedEntity.data as any).tozaHudud}</span></div>
                  )}
                  {selectedEntity.type === 'BIN' && (
                      <div className="flex justify-between text-[10px] font-bold"><span className="text-slate-400">Manzil:</span> <span className="text-slate-700">{(selectedEntity.data as WasteBin).address}</span></div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default MoistureMap;
