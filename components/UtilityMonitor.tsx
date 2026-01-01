
import React, { useState, useEffect, useRef } from 'react';
import { UtilityNode, UtilityType, CallRequest } from '../types';
import { DB } from '../services/storage';
import { Zap, Droplets, Flame, MapPin, AlertTriangle, CheckCircle, Activity, Plus, Search, Wrench, Siren, Radio, AlertCircle as AlertCircleIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UtilityMonitorProps {
  type: UtilityType;
  nodes: UtilityNode[];
  onUpdateNodes: (nodes: UtilityNode[]) => void;
  center?: { lat: number; lng: number };
}

const UtilityMonitor: React.FC<UtilityMonitorProps> = ({ type, nodes, onUpdateNodes, center = { lat: 40.3734, lng: 71.7978 } }) => {
  const [selectedNode, setSelectedNode] = useState<UtilityNode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'OUTAGE'>('ALL');
  const [tickets, setTickets] = useState<CallRequest[]>([]);
  
  // Maps Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);

  // Config based on type
  const config = {
      ELECTRICITY: { color: 'text-yellow-500', bg: 'bg-yellow-500', label: 'Elektr Tarmoqlari', icon: Zap, mapColor: '#eab308' },
      WATER: { color: 'text-blue-500', bg: 'bg-blue-500', label: "Suv Ta'minoti", icon: Droplets, mapColor: '#3b82f6' },
      GAS: { color: 'text-orange-500', bg: 'bg-orange-500', label: "Gaz Ta'minoti", icon: Flame, mapColor: '#f97316' }
  }[type];

  // Load tickets to correlate with nodes (Hybrid Monitoring Logic)
  useEffect(() => {
      const loadTickets = async () => {
          const allTickets = await DB.getTickets();
          // Filter tickets relevant to this utility type
          // RequestCategory now includes 'ELECTRICITY' | 'WATER' | 'GAS'
          const relevantCat = type === 'ELECTRICITY' ? 'ELECTRICITY' : type === 'WATER' ? 'WATER' : 'GAS';
          setTickets(allTickets.filter(t => t.category === relevantCat && t.status !== 'RESOLVED'));
      };
      loadTickets();
  }, [type]);

  // Update nodes based on tickets (Simulation of "No API" logic)
  useEffect(() => {
      if (tickets.length > 0) {
          const updatedNodes = nodes.map(node => {
              // Simple logic: If a ticket address matches node address (fuzzy match) or MFY, flag it
              // For demo, we assign tickets randomly if not matched, or check MFY
              const ticketCount = tickets.filter(t => t.address?.includes(node.mfy) || Math.random() > 0.95).length; // Mock fuzzy logic
              
              if (ticketCount > 0 && node.status === 'ACTIVE') {
                  return { ...node, status: 'WARNING', activeTickets: ticketCount } as UtilityNode;
              }
              if (ticketCount > 3 && node.status !== 'OUTAGE') {
                  return { ...node, status: 'OUTAGE', activeTickets: ticketCount } as UtilityNode;
              }
              return node;
          });
          // Only update if changes detected to avoid loops (simplified check)
          if (JSON.stringify(updatedNodes) !== JSON.stringify(nodes)) {
              onUpdateNodes(updatedNodes);
          }
      }
  }, [tickets.length]); // Dependency on tickets count changes

  // Map Init
  useEffect(() => {
      if (!mapContainerRef.current || !window.L || mapInstanceRef.current) return;
      
      const map = window.L.map(mapContainerRef.current, {
          center: [center.lat, center.lng],
          zoom: 13,
          zoomControl: false,
          attributionControl: false
      });
      
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
      layerGroupRef.current = window.L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
  }, []);

  // Update map view when center changes
  useEffect(() => {
      if (mapInstanceRef.current && center) {
          mapInstanceRef.current.setView([center.lat, center.lng], 13);
      }
  }, [center]);

  // Map Markers
  useEffect(() => {
      if (!mapInstanceRef.current || !layerGroupRef.current || !window.L) return;
      layerGroupRef.current.clearLayers();

      const filtered = nodes.filter(n => {
          const matchSearch = n.name.toLowerCase().includes(searchTerm.toLowerCase()) || n.mfy.toLowerCase().includes(searchTerm.toLowerCase());
          const matchStatus = filterStatus === 'ALL' ? true : n.status === filterStatus;
          return matchSearch && matchStatus;
      });

      filtered.forEach(node => {
          let color = config.mapColor; // Default active
          if (node.status === 'OUTAGE') color = '#ef4444'; // Red
          if (node.status === 'WARNING') color = '#f59e0b'; // Amber
          if (node.status === 'MAINTENANCE') color = '#64748b'; // Slate

          const iconHtml = `
            <div class="relative flex items-center justify-center">
                ${node.status === 'OUTAGE' ? '<div class="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>' : ''}
                <div class="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white" style="background-color: ${color}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="${type === 'ELECTRICITY' ? 'M13 2L3 14h9l-1 8 10-12h-9l1-8z' : type === 'WATER' ? 'M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z' : 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z'}"/></svg>
                </div>
                ${node.activeTickets > 0 ? `<span class="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-bold px-1 rounded-full border border-white">${node.activeTickets}</span>` : ''}
            </div>
          `;

          const marker = window.L.marker([node.location.lat, node.location.lng], {
              icon: window.L.divIcon({ className: 'bg-transparent', html: iconHtml, iconSize: [32, 32] })
          }).addTo(layerGroupRef.current);

          marker.on('click', () => {
              setSelectedNode(node);
              mapInstanceRef.current.setView([node.location.lat, node.location.lng], 15);
          });
      });
  }, [nodes, filterStatus, searchTerm]);

  const handleCreateOutage = (node: UtilityNode) => {
      // Dispatcher manually flagging an outage
      const updated = nodes.map(n => n.id === node.id ? { ...n, status: 'OUTAGE', activeTickets: n.activeTickets + 1 } : n);
      onUpdateNodes(updated as any);
      setSelectedNode({ ...node, status: 'OUTAGE', activeTickets: node.activeTickets + 1 } as any);
  };

  const handleResolve = (node: UtilityNode) => {
      const updated = nodes.map(n => n.id === node.id ? { ...n, status: 'ACTIVE', activeTickets: 0 } : n);
      onUpdateNodes(updated as any);
      setSelectedNode({ ...node, status: 'ACTIVE', activeTickets: 0 } as any);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 relative overflow-hidden">
        {/* HEADER */}
        <div className="p-5 border-b border-slate-200 bg-white sticky top-0 z-20 shadow-sm shrink-0 flex justify-between items-center">
            <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                    <config.icon className={config.color} size={24} /> {config.label}
                </h2>
                <p className="text-xs text-slate-500 font-medium">Gibrid Monitoring Tizimi (API-siz)</p>
            </div>
            
            <div className="flex items-center gap-3">
                <div className="bg-red-50 border border-red-100 px-3 py-1.5 rounded-xl flex items-center gap-2">
                    <Siren size={14} className="text-red-500 animate-pulse"/>
                    <span className="text-[10px] font-bold text-red-600 uppercase">Murojaatlar: {tickets.length}</span>
                </div>
                
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    {['ALL', 'ACTIVE', 'OUTAGE'].map((s) => (
                        <button 
                            key={s} 
                            onClick={() => setFilterStatus(s as any)}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${filterStatus === s ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {s === 'ALL' ? 'Barchasi' : s === 'ACTIVE' ? 'Aktiv' : 'Nosoz'}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {/* SIDEBAR LIST */}
            <div className="w-80 border-r border-slate-200 bg-white flex flex-col overflow-y-auto custom-scrollbar shrink-0">
                <div className="p-3 border-b border-slate-100 sticky top-0 bg-white z-10">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input 
                            type="text" 
                            placeholder="Qidirish (Nomi, MFY)..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                </div>
                <div className="flex-1 p-2 space-y-2">
                    {nodes.filter(n => n.name.toLowerCase().includes(searchTerm.toLowerCase())).map(node => (
                        <div 
                            key={node.id} 
                            onClick={() => setSelectedNode(node)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md ${selectedNode?.id === node.id ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${node.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-600' : node.status === 'OUTAGE' ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-amber-100 text-amber-600'}`}>
                                    {node.status}
                                </span>
                                {node.activeTickets > 0 && <span className="text-[9px] font-bold text-red-500 flex items-center gap-1"><AlertCircleIcon size={10}/> {node.activeTickets} ariza</span>}
                            </div>
                            <h4 className="text-xs font-bold text-slate-800">{node.name}</h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">{node.mfy}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* MAP & DETAIL */}
            <div className="flex-1 flex flex-col relative">
                <div ref={mapContainerRef} className="absolute inset-0 bg-slate-100 z-0"></div>
                
                {/* DETAIL PANEL (Overlay) */}
                <AnimatePresence>
                    {selectedNode && (
                        <motion.div 
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            className="absolute top-4 right-4 bottom-4 w-80 bg-white/95 backdrop-blur-xl rounded-[24px] shadow-2xl border border-white/20 z-10 flex flex-col overflow-hidden"
                        >
                            <div className={`p-5 text-white ${selectedNode.status === 'OUTAGE' ? 'bg-red-600' : selectedNode.status === 'WARNING' ? 'bg-amber-500' : config.bg}`}>
                                <h3 className="text-lg font-bold">{selectedNode.name}</h3>
                                <p className="text-xs opacity-90 font-mono mt-1">{selectedNode.id}</p>
                                <div className="mt-4 flex items-center gap-2">
                                    <span className="bg-white/20 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                                        <Activity size={12}/> Yuklama: {selectedNode.load}%
                                    </span>
                                    <span className="bg-white/20 px-2 py-1 rounded text-xs font-bold">
                                        {selectedNode.capacity}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
                                <div className="space-y-4">
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Manzil</p>
                                        <p className="text-xs font-bold text-slate-700 flex items-center gap-1"><MapPin size={12}/> {selectedNode.address}</p>
                                    </div>

                                    {selectedNode.activeTickets > 0 && (
                                        <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                                            <p className="text-[10px] font-bold text-red-400 uppercase mb-2 flex items-center gap-1"><Radio size={12}/> Aktiv Murojaatlar ({selectedNode.activeTickets})</p>
                                            <div className="space-y-2">
                                                {tickets.slice(0, 3).map(t => (
                                                    <div key={t.id} className="bg-white p-2 rounded border border-red-100 text-[10px] shadow-sm">
                                                        <span className="font-bold text-red-600 block mb-0.5">{t.citizenName}</span>
                                                        <span className="text-slate-600">"{t.transcript.substring(0, 40)}..."</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-2 border-t border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Boshqaruv (Dispetcher)</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {selectedNode.status === 'ACTIVE' ? (
                                                <button onClick={() => handleCreateOutage(selectedNode)} className="bg-red-100 text-red-600 hover:bg-red-200 py-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 h-16">
                                                    <Wrench size={16}/> Avariya Kiritish
                                                </button>
                                            ) : (
                                                <button onClick={() => handleResolve(selectedNode)} className="bg-emerald-100 text-emerald-600 hover:bg-emerald-200 py-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 h-16 col-span-2">
                                                    <CheckCircle size={16}/> Tuzatildi (Aktivlash)
                                                </button>
                                            )}
                                            {selectedNode.status === 'ACTIVE' && (
                                                <button className="bg-amber-100 text-amber-600 hover:bg-amber-200 py-2 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-1 h-16">
                                                    <Activity size={16}/> Profilaktika
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
                                <button onClick={() => setSelectedNode(null)} className="text-xs font-bold text-slate-500 hover:text-slate-700">Yopish</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    </div>
  );
};

export default UtilityMonitor;
