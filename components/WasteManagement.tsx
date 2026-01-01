
import React, { useState, useEffect, useRef } from 'react';
import { WasteBin, Coordinate, TozaHududType, Truck } from '../types';
import { Camera, MapPin, Trash2, X, Plus, Save, Locate, RefreshCw, Building2, Video, Scan, ShieldCheck, ExternalLink, Navigation, Globe, Truck as TruckIcon, Phone, User, Fuel, Settings, Edit, MoreVertical, Bot, Eye, AlertCircle, Key, Lock, Hash, Cast } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeBinImage } from '../services/geminiService'; // Import Service

// Helper function to generate UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface WasteManagementProps {
  bins: WasteBin[];
  trucks: Truck[];
  onUpdateBin: (id: string, updates: Partial<WasteBin>) => void;
  onAddBin?: (bin: WasteBin) => void;
  onDeleteBin?: (id: string) => void;
  // Truck CRUD Props
  onAddTruck?: (truck: Truck) => void;
  onUpdateTruck?: (id: string, updates: Partial<Truck>) => void;
  onDeleteTruck?: (id: string) => void;
  
  cityName?: string;
  districtCenter: Coordinate;
  activeMFY?: string;
  lastScan?: string;
}

const WasteManagement: React.FC<WasteManagementProps> = ({ 
    bins, trucks, onUpdateBin, onAddBin, onDeleteBin, onAddTruck, onUpdateTruck, onDeleteTruck, districtCenter 
}) => {
  // View State
  const [activeTab, setActiveTab] = useState<'BINS' | 'TRUCKS'>('BINS');
  const [selectedEntity, setSelectedEntity] = useState<{type: 'BIN' | 'TRUCK', data: any} | null>(null);
  
  // Bin Modal State
  const [showBinModal, setShowBinModal] = useState(false);
  const [editingBin, setEditingBin] = useState<WasteBin | null>(null);
  const [newBin, setNewBin] = useState({
    address: '',
    lat: districtCenter.lat.toFixed(6),
    lng: districtCenter.lng.toFixed(6),
    cameraUrl: '',
    tozaHudud: '1-sonli Toza Hudud' as TozaHududType
  });

  // Truck Modal State
  const [showTruckModal, setShowTruckModal] = useState(false);
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);
  const [truckForm, setTruckForm] = useState({
      driverName: '',
      plateNumber: '',
      phone: '',
      tozaHudud: '1-sonli Toza Hudud' as TozaHududType,
      login: '',
      password: '',
      fuelLevel: 100
  });

  // AI & Simulation State
  const [isSimulatingCameras, setIsSimulatingCameras] = useState(false);
  const [analyzingBinId, setAnalyzingBinId] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);

  // MOCK IMAGES for Simulation
  const FULL_IMAGES = [
      "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&q=80",
      "https://plus.unsplash.com/premium_photo-1664302152996-339257bb523c?w=600&q=80"
  ];
  const EMPTY_IMAGES = [
      "https://images.unsplash.com/photo-1528323273322-d81458248d40?w=600&q=80",
      "https://images.unsplash.com/photo-1503596476-1c12a8ab9a8e?w=600&q=80"
  ];

  // Map Initialization
  useEffect(() => {
      if (!mapContainerRef.current || !window.L || mapInstanceRef.current) return;
      const map = window.L.map(mapContainerRef.current, { 
          center: [districtCenter.lat, districtCenter.lng], 
          zoom: 14, 
          zoomControl: false, 
          attributionControl: false 
      });
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png').addTo(map);
      markersLayerRef.current = window.L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
  }, []);

  // Update map view when district center changes
  useEffect(() => {
      if (mapInstanceRef.current && districtCenter) {
          mapInstanceRef.current.setView([districtCenter.lat, districtCenter.lng], 14);
          setNewBin(prev => ({
              ...prev,
              lat: districtCenter.lat.toFixed(6),
              lng: districtCenter.lng.toFixed(6)
          }));
      }
  }, [districtCenter]);

  // Map Markers (Bins & Trucks)
  useEffect(() => {
      if (!mapInstanceRef.current || !markersLayerRef.current) return;
      markersLayerRef.current.clearLayers();
      
      // Render Bins
      bins.forEach(bin => {
          const color = bin.fillLevel > 80 ? '#ef4444' : '#10b981';
          const marker = window.L.marker([bin.location.lat, bin.location.lng], {
              icon: window.L.divIcon({
                  className: 'bg-transparent',
                  html: `<div style="background-color: ${color};" class="w-6 h-6 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white relative">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            ${bin.imageSource === 'BOT' ? '<div class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border border-white"></div>' : ''}
                         </div>`
              })
          }).addTo(markersLayerRef.current);
          
          marker.on('click', () => {
              setSelectedEntity({type: 'BIN', data: bin});
              setActiveTab('BINS');
          });
      });

      // Render Trucks
      trucks.forEach(truck => {
          const marker = window.L.marker([truck.location.lat, truck.location.lng], {
              icon: window.L.divIcon({
                  className: 'bg-transparent',
                  html: `<div class="w-8 h-8 bg-blue-600 rounded-xl border-2 border-white shadow-xl flex items-center justify-center text-white transform rotate-45"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="transform -rotate-45"><path d="M1 3h15v13H1z"/><path d="M16 8l4-4 3 3-4 4h-3z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div>`
              })
          }).addTo(markersLayerRef.current);

          marker.on('click', () => {
              setSelectedEntity({type: 'TRUCK', data: truck});
              setActiveTab('TRUCKS');
          });
      });

  }, [bins, trucks]);

  // --- AUTOMATIC CCTV SIMULATION EVERY 30 MINUTES ---
  useEffect(() => {
      if (!isSimulatingCameras) return;

      const interval = setInterval(async () => {
          const randomBinIndex = Math.floor(Math.random() * bins.length);
          const bin = bins[randomBinIndex];
          
          // Use actual camera URL if available, otherwise use mock images
          let imageUrl = bin.imageUrl;
          if (!bin.cameraUrl || bin.cameraUrl.trim() === '') {
              // Use mock images if no camera URL is set
              const isFullSim = Math.random() > 0.7; 
              imageUrl = isFullSim 
                  ? FULL_IMAGES[Math.floor(Math.random() * FULL_IMAGES.length)]
                  : EMPTY_IMAGES[Math.floor(Math.random() * EMPTY_IMAGES.length)];
          } else {
              // Use the actual camera URL
              imageUrl = bin.cameraUrl;
          }

          setAnalyzingBinId(bin.id);

          try {
              const response = await fetch(imageUrl);
              const blob = await response.blob();
              const reader = new FileReader();
              reader.onloadend = async () => {
                  const base64data = reader.result as string;
                  const rawBase64 = base64data.split(',')[1];

                  const analysis = await analyzeBinImage(rawBase64);

                  // Check if we have a valid auth token before updating
                  const token = localStorage.getItem('authToken');
                  if (!token) {
                      console.log('No auth token found, skipping bin update');
                      setAnalyzingBinId(null);
                      return;
                  }

                  onUpdateBin(bin.id, {
                      fillLevel: analysis.fillLevel,
                      isFull: analysis.isFull,
                      lastAnalysis: "CCTV (AI): " + new Date().toLocaleTimeString(),
                      imageUrl: imageUrl,
                      imageSource: 'CCTV',
                      // Update the trend data to include the timestamp
                      trend: [...(bin.trend || []), {
                          timestamp: new Date().toISOString(),
                          fillLevel: analysis.fillLevel,
                          isFull: analysis.isFull,
                          source: 'CCTV'
                      }]
                  });
                  setAnalyzingBinId(null);
              };
              reader.readAsDataURL(blob);
          } catch (e) {
              console.error("Simulyatsiya xatosi:", e);
              // Check if the error is related to authentication
              if (e instanceof Error && (e as any).message?.includes('401')) {
                  localStorage.removeItem('authToken');
              }
              setAnalyzingBinId(null);
          }

      }, 30 * 60 * 1000); // Run every 30 minutes (30 * 60 * 1000 milliseconds)

      return () => clearInterval(interval);
  }, [isSimulatingCameras, bins, onUpdateBin]);


  // --- Bin Logic ---
  const openBinModal = (bin?: WasteBin) => {
      if (bin) {
          setEditingBin(bin);
          setNewBin({
              address: bin.address,
              lat: bin.location.lat.toString(),
              lng: bin.location.lng.toString(),
              cameraUrl: bin.cameraUrl || '',
              tozaHudud: bin.tozaHudud as TozaHududType
          });
      } else {
          setEditingBin(null);
          setNewBin({
              address: '',
              lat: districtCenter.lat.toFixed(6),
              lng: districtCenter.lng.toFixed(6),
              cameraUrl: '',
              tozaHudud: '1-sonli Toza Hudud' as TozaHududType
          });
      }
      setShowBinModal(true);
  };

  const handleSaveBin = () => {
      if (!newBin.address) return;
      const latNum = parseFloat(newBin.lat);
      const lngNum = parseFloat(newBin.lng);
      
      const organizationId = localStorage.getItem('organizationId');

      if (editingBin && onUpdateBin) {
          const payload: Partial<WasteBin> = {
              address: newBin.address,
              location: { lat: latNum, lng: lngNum },
              tozaHudud: newBin.tozaHudud,
              cameraUrl: newBin.cameraUrl,
              imageUrl: newBin.cameraUrl && newBin.cameraUrl.trim() !== '' 
                  ? newBin.cameraUrl 
                  : editingBin.imageUrl
          };

          if (organizationId) {
            (payload as any).organizationId = organizationId;
          }

          onUpdateBin(editingBin.id, payload);
          if (selectedEntity?.type === 'BIN' && selectedEntity.data.id === editingBin.id) {
              setSelectedEntity(prev => prev ? {...prev, data: {...prev.data, address: newBin.address, tozaHudud: newBin.tozaHudud}} : null);
          }
      } else if (onAddBin) {
          if (!organizationId) {
              alert("Tashkilot aniqlanmadi. Iltimos, tizimga qayta kiring va qaytadan urining.");
              return;
          }
          const bin: WasteBin = {
              id: generateUUID(), // Temporary ID for UI
              location: { lat: latNum, lng: lngNum },
              address: newBin.address,
              tozaHudud: newBin.tozaHudud,
              cameraUrl: newBin.cameraUrl,
              googleMapsUrl: `https://www.google.com/maps?q=${latNum},${lngNum}`,
              fillLevel: 0,
              fillRate: 1.5,
              lastAnalysis: new Date().toISOString(),
              imageUrl: newBin.cameraUrl && newBin.cameraUrl.trim() !== '' 
                  ? newBin.cameraUrl
                  : undefined,
              imageSource: newBin.cameraUrl && newBin.cameraUrl.trim() !== '' ? 'CCTV' : undefined,
              isFull: false,
              deviceHealth: { batteryLevel: 100, signalStrength: 100, lastPing: new Date().toISOString(), firmwareVersion: 'v4.0', isOnline: true },
              organizationId: organizationId,
          };
          onAddBin(bin);
      }
      
      setShowBinModal(false);
  };

  const handleDeleteBinItem = (id: string) => {
      if (onDeleteBin && window.confirm("Haqiqatan ham bu konteynerni o'chirmoqchimisiz?")) {
          onDeleteBin(id);
          setSelectedEntity(null); // Close details modal
          setShowBinModal(false);  // Close edit modal
          setEditingBin(null);
      }
  };

  // --- Truck Logic ---
  const openTruckModal = (truck?: Truck) => {
      if (truck) {
          setEditingTruck(truck);
          setTruckForm({
              driverName: truck.driverName,
              plateNumber: truck.plateNumber,
              phone: truck.phone,
              tozaHudud: truck.tozaHudud,
              login: truck.login || '',
              password: truck.password || '',
              fuelLevel: truck.fuelLevel
          });
      } else {
          setEditingTruck(null);
          setTruckForm({
              driverName: '',
              plateNumber: '40 A 777 AA',
              phone: '+998 ',
              tozaHudud: '1-sonli Toza Hudud',
              login: `driver${Date.now().toString().slice(-4)}`,
              password: '123',
              fuelLevel: 100
          });
      }
      setShowTruckModal(true);
  };

  const handleSaveTruck = () => {
      const defaultLocation = editingTruck ? editingTruck.location : districtCenter;

      if (editingTruck && onUpdateTruck) {
          onUpdateTruck(editingTruck.id, {
              driverName: truckForm.driverName,
              plateNumber: truckForm.plateNumber,
              phone: truckForm.phone,
              tozaHudud: truckForm.tozaHudud,
              login: truckForm.login,
              password: truckForm.password,
              location: defaultLocation, 
              fuelLevel: truckForm.fuelLevel
          });
          if (selectedEntity?.type === 'TRUCK' && selectedEntity.data.id === editingTruck.id) {
              setSelectedEntity(prev => prev ? {...prev, data: {...prev.data, driverName: truckForm.driverName, plateNumber: truckForm.plateNumber, phone: truckForm.phone}} : null);
          }
      } else if (onAddTruck) {
          const newTruck: Truck = {
              id: generateUUID(), // Temporary ID for UI
              driverName: truckForm.driverName,
              plateNumber: truckForm.plateNumber,
              phone: truckForm.phone,
              tozaHudud: truckForm.tozaHudud,
              location: defaultLocation,
              status: 'IDLE',
              fuelLevel: truckForm.fuelLevel,
              login: truckForm.login,
              password: truckForm.password
          };
          onAddTruck(newTruck);
      }
      setShowTruckModal(false);
  };

  const handleDeleteTruckItem = (id: string) => {
      if (onDeleteTruck && window.confirm("Haqiqatan ham bu haydovchini o'chirmoqchimisiz?")) {
          onDeleteTruck(id);
          setSelectedEntity(null); // Close details modal
          setShowTruckModal(false); // Close edit modal
          setEditingTruck(null);
      }
  };

  const getGPS = (type: 'BIN' | 'TRUCK') => {
    navigator.geolocation.getCurrentPosition((pos) => {
        if(type === 'BIN') {
            setNewBin(prev => ({ ...prev, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }));
        }
    });
  };

  const handleManualAnalyze = async () => {
      if(selectedEntity?.type !== 'BIN') return;
      setAnalyzingBinId(selectedEntity.data.id);
      
      try {
          // Use camera URL if available, otherwise use stored image URL
          const imageUrl = selectedEntity.data.cameraUrl && selectedEntity.data.cameraUrl.trim() !== '' 
              ? selectedEntity.data.cameraUrl 
              : selectedEntity.data.imageUrl;
          
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = async () => {
              const base64data = reader.result as string;
              const rawBase64 = base64data.split(',')[1];
              const analysis = await analyzeBinImage(rawBase64);
              
              const updatedBin = {
                  ...selectedEntity.data,
                  fillLevel: analysis.fillLevel,
                  isFull: analysis.isFull,
                  lastAnalysis: "Manual (AI): " + new Date().toLocaleTimeString(),
                  imageUrl: imageUrl, // Update the image URL to the one that was analyzed
                  imageSource: selectedEntity.data.cameraUrl && selectedEntity.data.cameraUrl.trim() !== '' ? 'CCTV' : selectedEntity.data.imageSource
              };

              onUpdateBin(selectedEntity.data.id, updatedBin);
              setSelectedEntity({ type: 'BIN', data: updatedBin });
              setAnalyzingBinId(null);
          };
          reader.readAsDataURL(blob);
      } catch (e) {
          setAnalyzingBinId(null);
          alert("Tahlilda xatolik");
      }
  };

  return (
    <div className="h-full flex flex-col bg-white relative overflow-hidden font-sans">
       {/* Header */}
       <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg"><Trash2 size={20}/></div>
             <div>
                <h2 className="font-black text-slate-800 text-base leading-none">CHIQINDI LOGISTIKASI</h2>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">AI Vision Control</p>
             </div>
          </div>
          
          <div className="flex gap-2 items-center">
              {/* Camera Simulation Toggle */}
              <button 
                onClick={() => setIsSimulatingCameras(!isSimulatingCameras)} 
                className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${isSimulatingCameras ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
              >
                  {isSimulatingCameras ? <Video size={16} className="animate-pulse"/> : <Video size={16}/>}
                  {isSimulatingCameras ? 'Kamera Oqimi Aktiv' : 'Kameralarni Yoqish'}
              </button>

              <button 
                onClick={() => activeTab === 'BINS' ? openBinModal() : openTruckModal()} 
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-xl shadow-blue-200 transition-all flex items-center gap-2"
              >
                 <Plus size={18}/> {activeTab === 'BINS' ? 'KONTEYNER' : 'HAYDOVCHI'} QO'SHISH
              </button>
          </div>
       </div>

       <div className="flex-1 flex overflow-hidden">
          {/* List Sidebar */}
          <div className="w-80 border-r border-slate-100 bg-white flex flex-col overflow-hidden">
             
             {/* Tab Switcher */}
             <div className="p-3 bg-white border-b border-slate-100">
                 <div className="flex bg-slate-100 p-1 rounded-xl">
                     <button 
                        onClick={() => setActiveTab('BINS')} 
                        className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'BINS' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                     >
                         Konteynerlar ({bins.length})
                     </button>
                     <button 
                        onClick={() => setActiveTab('TRUCKS')} 
                        className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'TRUCKS' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                     >
                         Haydovchilar ({trucks.length})
                     </button>
                 </div>
             </div>

             {/* Content List */}
             <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                {activeTab === 'BINS' ? (
                    bins.map(bin => (
                        <div 
                            key={bin.id} 
                            onClick={() => {
                                setSelectedEntity({type: 'BIN', data: bin});
                                mapInstanceRef.current.flyTo([bin.location.lat, bin.location.lng], 16);
                            }}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${selectedEntity?.data.id === bin.id ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-black text-slate-800 text-xs truncate w-32 uppercase tracking-tighter">{bin.address}</h4>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${bin.fillLevel > 80 ? 'bg-red-500 text-white' : 'bg-emerald-100 text-emerald-600'}`}>
                                    {bin.fillLevel > 80 ? "TO'LGAN" : "BO'SH"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                                <span className="flex items-center gap-1"><MapPin size={10}/> {bin.location.lat.toFixed(4)}, {bin.location.lng.toFixed(4)}</span>
                                <div className="flex gap-1">
                                    {bin.imageSource === 'BOT' && <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded flex items-center gap-1"><Bot size={8}/> BOT</span>}
                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded uppercase">{(bin.tozaHudud || '').split(' ')[0]}</span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    trucks.map(truck => (
                        <div 
                            key={truck.id} 
                            onClick={() => {
                                setSelectedEntity({type: 'TRUCK', data: truck});
                                mapInstanceRef.current.flyTo([truck.location.lat, truck.location.lng], 16);
                            }}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer group ${selectedEntity?.data.id === truck.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                                        <TruckIcon size={18}/>
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-800 text-sm leading-none">{truck.driverName}</h4>
                                        <p className="text-[10px] text-slate-400 font-bold mt-1 bg-slate-50 px-1.5 py-0.5 rounded w-fit">{truck.plateNumber}</p>
                                        <p className="text-[9px] text-slate-500 mt-1 flex items-center gap-1">
                                            <Phone size={10} />
                                            {truck.phone}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); openTruckModal(truck); }} className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-blue-500 transition-colors">
                                    <Edit size={14}/>
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <div className="bg-white/60 p-2 rounded-xl border border-slate-100 flex items-center gap-2">
                                    <Fuel size={12} className={truck.fuelLevel < 20 ? 'text-red-500' : 'text-blue-500'}/>
                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${truck.fuelLevel < 20 ? 'bg-red-500' : 'bg-blue-500'}`} style={{width: `${truck.fuelLevel}%`}}></div>
                                    </div>
                                </div>
                                <div className={`px-2 py-1.5 rounded-xl text-center border text-[9px] font-black uppercase ${truck.status === 'BUSY' ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                                    {truck.status === 'BUSY' ? 'Band' : 'Bo\'sh'}
                                </div>
                            </div>
                        </div>
                    ))
                )}
             </div>
          </div>

          {/* Map Area */}
          <div className="flex-1 flex flex-col relative bg-slate-50">
             <div ref={mapContainerRef} className="absolute inset-0 z-0"></div>
             
             {/* Selected Entity LARGE MODAL */}
             <AnimatePresence>
             {selectedEntity && (
                <div className="absolute inset-0 z-20 flex items-center justify-center p-8 bg-slate-900/40 backdrop-blur-sm pointer-events-none">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white w-full max-w-4xl rounded-[32px] shadow-2xl border border-white overflow-hidden pointer-events-auto flex flex-col max-h-full"
                    >
                       {/* Header */}
                       <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                           <div className="flex items-center gap-4">
                               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${selectedEntity.type === 'BIN' ? 'bg-slate-900 text-white' : 'bg-blue-600 text-white'}`}>
                                   {selectedEntity.type === 'BIN' ? <Trash2 size={24}/> : <TruckIcon size={24}/>}
                               </div>
                               <div>
                                   <h3 className="text-xl font-black text-slate-800 leading-none">
                                       {selectedEntity.type === 'BIN' ? selectedEntity.data.address : selectedEntity.data.driverName}
                                   </h3>
                                   <div className="flex items-center gap-3 mt-1.5">
                                       {selectedEntity.type === 'TRUCK' && (
                                           <span className="text-[10px] font-bold text-slate-800 bg-yellow-100 px-2 py-0.5 rounded">{selectedEntity.data.plateNumber}</span>
                                       )}
                                       <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded">{selectedEntity.data.id}</span>
                                       <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{selectedEntity.data.tozaHudud}</span>
                                   </div>
                               </div>
                           </div>
                           <button onClick={() => setSelectedEntity(null)} className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"><X size={20}/></button>
                       </div>

                       {/* Content Body */}
                       <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                           {selectedEntity.type === 'BIN' ? (
                               <div className="grid grid-cols-2 gap-6 h-full">
                                   {/* Left: Image & AI Analysis */}
                                   <div className="flex flex-col gap-4">
                                       <div className="relative rounded-3xl overflow-hidden bg-black aspect-video group shadow-lg border-4 border-white">
                                           <div className="relative w-full h-full">
                                               {/* Camera feed placeholder */}
                                               <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                                                   <div className="text-center">
                                                       <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2">
                                                           <Video size={32} className="text-gray-400" />
                                                       </div>
                                                       <p className="text-gray-400 text-sm font-bold">CCTV KAMERA OQIMI</p>
                                                       <p className="text-gray-500 text-xs mt-1">Jonli kuzatuv</p>
                                                   </div>
                                               </div>
                                               
                                               {/* Display uploaded image if available, otherwise use imageUrl */}
                                               {selectedEntity.data.image ? (
                                                   <img 
                                                       src={`${selectedEntity.data.image.startsWith('http') ? '' : 'https://smartcityapi.aiproduct.uz'}${selectedEntity.data.image}`} 
                                                       className="absolute inset-0 w-full h-full object-cover opacity-70" 
                                                       style={{ zIndex: 1 }}
                                                       alt="Waste bin uploaded image" 
                                                   />
                                               ) : (
                                                   <img 
                                                       src={selectedEntity.data.imageUrl} 
                                                       className="absolute inset-0 w-full h-full object-cover opacity-70" 
                                                       style={{ zIndex: 1 }}
                                                       alt="Waste bin camera feed" 
                                                   />
                                               )}
                                           </div>
                                           
                                           {/* Source Badge */}
                                           <div className="absolute top-4 left-4 flex gap-2">
                                               {selectedEntity.data.imageSource === 'BOT' ? (
                                                   <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 shadow-lg"><Bot size={12}/> TELEGRAM BOT</span>
                                               ) : (
                                                   <span className="bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 shadow-lg animate-pulse"><Video size={12}/> CCTV KAMERA</span>
                                               )}
                                           </div>

                                           {/* AI Status Overlay */}
                                           <div className={`absolute bottom-4 left-4 px-4 py-2 rounded-xl backdrop-blur-md border shadow-xl flex items-center gap-3 ${selectedEntity.data.isFull ? 'bg-red-500/80 border-red-400 text-white' : 'bg-emerald-500/80 border-emerald-400 text-white'}`}>
                                               {selectedEntity.data.isFull ? <AlertCircle size={20}/> : <ShieldCheck size={20}/>}
                                               <div>
                                                   <p className="text-[9px] font-bold opacity-80 uppercase">AI Xulosasi</p>
                                                   <p className="text-sm font-black">{selectedEntity.data.isFull ? "TO'LGAN (CRITICAL)" : "BO'SH (NORMAL)"}</p>
                                               </div>
                                           </div>
                                       </div>

                                       <div className="flex gap-3">
                                           <button onClick={handleManualAnalyze} disabled={!!analyzingBinId} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                                               {analyzingBinId ? <RefreshCw size={16} className="animate-spin"/> : <Scan size={16}/>}
                                               QAYTA TAHLIL (AI)
                                           </button>
                                           <a href={selectedEntity.data.googleMapsUrl} target="_blank" className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-black text-xs flex items-center gap-2 transition-all">
                                               <Navigation size={16}/> MAPS
                                           </a>
                                       </div>
                                   </div>

                                   {/* Right: Details & History */}
                                   <div className="flex flex-col gap-4">
                                       <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                                           <h4 className="text-xs font-black text-slate-400 uppercase mb-4 flex items-center gap-2"><Eye size={14}/> Monitoring Ma'lumotlari</h4>
                                           <div className="space-y-3">
                                               <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                                   <span className="text-xs font-bold text-slate-600">To'lish darajasi</span>
                                                   <div className="flex items-center gap-2">
                                                       <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                           <div className={`h-full rounded-full ${selectedEntity.data.fillLevel > 80 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{width: `${selectedEntity.data.fillLevel}%`}}></div>
                                                       </div>
                                                       <span className="text-xs font-black text-slate-800">{selectedEntity.data.fillLevel}%</span>
                                                   </div>
                                               </div>
                                               <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                                   <span className="text-xs font-bold text-slate-600">Oxirgi signal</span>
                                                   <span className="text-xs font-mono font-bold text-slate-800">{selectedEntity.data.lastAnalysis}</span>
                                               </div>
                                               <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                                   <span className="text-xs font-bold text-slate-600">Qurilma holati</span>
                                                   <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded">ONLINE • 100%</span>
                                               </div>
                                           </div>
                                       </div>

                                       <div className="flex flex-col gap-4">
                                           <div className="flex gap-4">
                                               <button type="button" onClick={() => handleDeleteBinItem(selectedEntity.data.id)} className="px-6 py-4 bg-red-50 text-red-500 hover:bg-red-100 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center gap-2">
                                                   <Trash2 size={16}/> O'chirish
                                               </button>
                                               <button type="button" onClick={() => openBinModal(selectedEntity.data)} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 shadow-xl transition-all active:scale-95">Tahrirlash</button>
                                           </div>
                                           
                                           {/* QR Code Section */}
                                           {selectedEntity.data.qrCodeUrl && (
                                               <div className="mt-4 bg-white p-4 rounded-2xl border border-slate-200">
                                                   <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                                                       <Scan size={14}/> QR Kod
                                                   </h4>
                                                   <div className="flex flex-col items-center">
                                                       <img 
                                                           src={selectedEntity.data.qrCodeUrl} 
                                                           alt="QR kod - konteynerni skaner qilish uchun" 
                                                           className="w-32 h-32 object-contain border-2 border-dashed border-slate-200 rounded-lg"
                                                       />
                                                       <p className="text-xs text-slate-500 mt-2 text-center">
                                                           Bu QR kodni skaner qilish orqali konteynerni aniqlash mumkin
                                                       </p>
                                                   </div>
                                               </div>
                                           )}
                                       </div>
                                   </div>
                               </div>
                           ) : (
                               // Truck Details View
                               <div className="space-y-6">
                                   <div className="grid grid-cols-3 gap-4">
                                       <div className="bg-white p-4 rounded-2xl border border-slate-200">
                                           <p className="text-[10px] font-bold text-slate-400 uppercase">Haydovchi</p>
                                           <p className="text-lg font-black text-slate-800">{selectedEntity.data.driverName}</p>
                                           <p className="text-xs font-mono text-slate-500 mt-1">{selectedEntity.data.phone}</p>
                                       </div>
                                       <div className="bg-white p-4 rounded-2xl border border-slate-200">
                                           <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
                                           <span className={`inline-block mt-1 px-3 py-1 rounded-lg text-xs font-black ${selectedEntity.data.status === 'BUSY' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                               {selectedEntity.data.status === 'BUSY' ? 'BAND (Vazifada)' : 'BO\'SH (Kutyapti)'}
                                           </span>
                                       </div>
                                       <div className="bg-white p-4 rounded-2xl border border-slate-200">
                                           <p className="text-[10px] font-bold text-slate-400 uppercase">Yoqilg'i</p>
                                           <div className="flex items-center gap-2 mt-1">
                                               <Fuel size={16} className={selectedEntity.data.fuelLevel < 20 ? 'text-red-500' : 'text-blue-500'}/>
                                               <span className="text-lg font-black text-slate-800">{selectedEntity.data.fuelLevel}%</span>
                                           </div>
                                       </div>
                                   </div>
                                   
                                   {/* Auth Details Display */}
                                   <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                       <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Key size={14}/> Kirish Ma'lumotlari</h4>
                                       <div className="grid grid-cols-2 gap-4">
                                           <div>
                                               <span className="text-[10px] font-bold text-slate-400 uppercase">Login</span>
                                               <p className="text-sm font-bold font-mono text-slate-800">{selectedEntity.data.login || 'driver'}</p>
                                           </div>
                                           <div>
                                               <span className="text-[10px] font-bold text-slate-400 uppercase">Parol</span>
                                               <p className="text-sm font-bold font-mono text-slate-800">{selectedEntity.data.password || '******'}</p>
                                           </div>
                                       </div>
                                   </div>

                                   <div className="flex gap-4">
                                       <button type="button" onClick={() => handleDeleteTruckItem(selectedEntity.data.id)} className="px-6 py-4 bg-red-50 text-red-500 hover:bg-red-100 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center gap-2">
                                           <Trash2 size={16}/> O'chirish
                                       </button>
                                       <button type="button" onClick={() => openTruckModal(selectedEntity.data)} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 shadow-xl transition-all active:scale-95">Tahrirlash</button>
                                   </div>
                               </div>
                           )}
                       </div>
                    </motion.div>
                </div>
             )}
             </AnimatePresence>
          </div>
       </div>

       {/* ADD BIN MODAL */}
       <AnimatePresence>
       {showBinModal && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-8 border border-slate-100 flex flex-col gap-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">{editingBin ? 'Konteynerni Tahrirlash' : 'Yangi Konteyner'}</h3>
                    <button onClick={() => setShowBinModal(false)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-red-500"><X size={24}/></button>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Mas'ul Korxona</label>
                        <select value={newBin.tozaHudud} onChange={e => setNewBin({...newBin, tozaHudud: e.target.value as TozaHududType})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all">
                            <option value="1-sonli Toza Hudud">1-sonli Toza Hudud</option>
                            <option value="2-sonli Toza Hudud">2-sonli Toza Hudud</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Latitude (Lat)</label>
                            <input type="number" step="0.000001" value={newBin.lat} onChange={e => setNewBin({...newBin, lat: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold font-mono outline-none" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Longitude (Lng)</label>
                            <input type="number" step="0.000001" value={newBin.lng} onChange={e => setNewBin({...newBin, lng: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold font-mono outline-none" />
                        </div>
                    </div>
                    
                    <button onClick={() => getGPS('BIN')} className="w-full py-3 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 flex items-center justify-center gap-2">
                        <Locate size={16}/> GPS Koordinatani olish
                    </button>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Aniq Manzil</label>
                        <input value={newBin.address} onChange={e => setNewBin({...newBin, address: e.target.value})} placeholder="Masalan: Marg'ilon ko'chasi 12-uy..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>

                    {/* NEW: Camera IP Address Input */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Kamera IP Manzili (RTSP/HTTP)</label>
                        <div className="relative">
                            <Video size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                            <input 
                                value={newBin.cameraUrl} 
                                onChange={e => setNewBin({...newBin, cameraUrl: e.target.value})} 
                                placeholder="http://192.168.1.10:8080/video" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 mt-4">
                    {editingBin && (
                        <button type="button" onClick={() => handleDeleteBinItem(editingBin.id)} className="px-4 py-4 rounded-2xl font-black text-xs text-white bg-red-500 hover:bg-red-600 uppercase tracking-widest transition-colors"><Trash2 size={18}/></button>
                    )}
                    <button onClick={() => setShowBinModal(false)} className="flex-1 py-4 rounded-2xl font-black text-xs text-slate-400 bg-slate-100 uppercase tracking-widest hover:bg-slate-200">Bekor Qilish</button>
                    <button onClick={handleSaveBin} className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-95"><Save size={18}/> Saqlash</button>
                </div>
             </motion.div>
          </div>
       )}
       </AnimatePresence>

       {/* ADD/EDIT TRUCK MODAL */}
       <AnimatePresence>
       {showTruckModal && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-8 border border-slate-100 flex flex-col gap-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">{editingTruck ? 'Haydovchini Tahrirlash' : 'Yangi Haydovchi'}</h3>
                    <button onClick={() => setShowTruckModal(false)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-red-500"><X size={24}/></button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Haydovchi Ismi</label>
                            <input value={truckForm.driverName} onChange={e => setTruckForm({...truckForm, driverName: e.target.value})} placeholder="Ism Familiya" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Mashina Raqami</label>
                            <div className="relative">
                                <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                                <input value={truckForm.plateNumber} onChange={e => setTruckForm({...truckForm, plateNumber: e.target.value})} placeholder="40 A 777 AA" className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 uppercase" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Telefon Raqami</label>
                        <input value={truckForm.phone} onChange={e => setTruckForm({...truckForm, phone: e.target.value})} placeholder="+998 90 123 45 67" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Mas'ul Korxona</label>
                        <select value={truckForm.tozaHudud} onChange={e => setTruckForm({...truckForm, tozaHudud: e.target.value as TozaHududType})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all">
                            <option value="1-sonli Toza Hudud">1-sonli Toza Hudud</option>
                            <option value="2-sonli Toza Hudud">2-sonli Toza Hudud</option>
                        </select>
                    </div>

                    {/* Login & Password fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Login (Kirish)</label>
                            <div className="relative">
                                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                                <input value={truckForm.login} onChange={e => setTruckForm({...truckForm, login: e.target.value})} placeholder="Login" className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Parol</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                                <input value={truckForm.password} onChange={e => setTruckForm({...truckForm, password: e.target.value})} placeholder="Parol" className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 mt-4">
                    {editingTruck && (
                        <button type="button" onClick={() => handleDeleteTruckItem(editingTruck.id)} className="px-4 py-4 rounded-2xl font-black text-xs text-white bg-red-500 hover:bg-red-600 uppercase tracking-widest transition-colors"><Trash2 size={18}/></button>
                    )}
                    <button onClick={() => setShowTruckModal(false)} className="flex-1 py-4 rounded-2xl font-black text-xs text-slate-400 bg-slate-100 uppercase tracking-widest hover:bg-slate-200">Bekor Qilish</button>
                    <button onClick={handleSaveTruck} className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-95"><Save size={18}/> Saqlash</button>
                </div>
             </motion.div>
          </div>
       )}
       </AnimatePresence>
    </div>
  );
};

export default WasteManagement;
