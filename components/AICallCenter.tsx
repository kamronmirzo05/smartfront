
import React, { useState, useEffect, useRef } from 'react';
import { CallRequest, RequestCategory, ResponsibleOrg } from '../types';
import { DB } from '../services/storage'; // Import DB
import { generateCallRequests } from '../constants';
import { Phone, Mic, User, Calendar, Clock, Bot, ArrowRight, Check, X, BarChart3, PieChart, Activity, Zap, Droplets, Flame, ShieldAlert, HeartPulse, Trash2, Smartphone, MapPin, Building, Share2, FileText, CheckCircle2, AlertCircle, History, MessageSquare, Send, Globe, Mail, MicOff, PhoneOff, Waves, ExternalLink, Play, Users, PhoneIncoming, Pause, Columns, List, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock Organizations Data
const RESPONSIBLE_ORGS: ResponsibleOrg[] = [
    { id: 'ORG-MED', name: "Tez Tibbiy Yordam", type: 'HEALTH', activeBrigades: 20, totalBrigades: 25, currentLoad: 60, contactPhone: '103' },
    { id: 'ORG-IIB', name: "Ichki Ishlar Boshqarmasi", type: 'INTERIOR', activeBrigades: 10, totalBrigades: 30, currentLoad: 20, contactPhone: '102' },
    { id: 'ORG-WASTE', name: "Toza Hudud DUK", type: 'WASTE', activeBrigades: 8, totalBrigades: 10, currentLoad: 55, contactPhone: '+998 73 244 00 00' },
];

const AICallCenter: React.FC = () => {
  const [requests, setRequests] = useState<CallRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<CallRequest | null>(null);
  const [viewMode, setViewMode] = useState<'LIST' | 'KANBAN'>('KANBAN');
  
  // Live Monitoring State
  const [isLiveMonitoring, setIsLiveMonitoring] = useState(false);
  
  // Modals State
  const [showRoutingModal, setShowRoutingModal] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsText, setSmsText] = useState("");

  const [filterCategory, setFilterCategory] = useState<RequestCategory | 'ALL'>('ALL');
  const [stats, setStats] = useState({ total: 0, resolved: 0, pending: 0, avgTime: '12m' });

  // Init Data: Load from DB + Polling
  useEffect(() => {
      // Initial Load
      const loadInitialData = async () => {
          const tickets = await DB.getTickets();
          setRequests(tickets);
      };
      loadInitialData();

      // Poll for new tickets every 3 seconds (Simulate realtime)
      const interval = setInterval(async () => {
          const tickets = await DB.getTickets();
          setRequests(tickets);
      }, 3000);

      return () => clearInterval(interval);
  }, []);

  // Update KPI Stats
  useEffect(() => {
      setStats({
          total: requests.length,
          resolved: requests.filter(r => r.status === 'RESOLVED').length,
          pending: requests.filter(r => r.status === 'NEW' || r.status === 'PROCESSING').length,
          avgTime: '14m'
      });
  }, [requests]);

  // Helper to sync changes
  const syncUpdate = (updatedReq: CallRequest) => {
      DB.updateTicket(updatedReq); // Persist to DB
      setRequests(prev => prev.map(r => r.id === updatedReq.id ? updatedReq : r));
      setSelectedRequest(updatedReq);
  };

  const handleRouteRequest = (orgId: string) => {
      if (!selectedRequest) return;
      const org = RESPONSIBLE_ORGS.find(o => o.id === orgId);
      
      const updatedReq: CallRequest = {
          ...selectedRequest,
          status: 'ASSIGNED',
          assignedOrg: orgId,
          deadline: new Date(Date.now() + 3600000 * 4).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), // +4 hours
          timeline: [
              ...selectedRequest.timeline,
              {
                  step: `Ijroga yo'naltirildi: ${org?.name}`,
                  timestamp: new Date().toLocaleTimeString(),
                  actor: "Dispetcher",
                  status: 'DONE'
              }
          ]
      };

      syncUpdate(updatedReq);
      setShowRoutingModal(false);
  };

  const handleSendSMS = () => {
      if (!selectedRequest || !smsText.trim()) return;
      const updatedReq: CallRequest = {
          ...selectedRequest,
          timeline: [
              ...selectedRequest.timeline,
              {
                  step: `SMS Xabarnoma yuborildi: "${smsText.substring(0, 20)}..."`,
                  timestamp: new Date().toLocaleTimeString(),
                  actor: "Dispetcher",
                  status: 'DONE'
              }
          ]
      };
      syncUpdate(updatedReq);
      setShowSmsModal(false);
      setSmsText("");
      alert("SMS muvaffaqiyatli yuborildi!");
  };

  const getCategoryIcon = (cat: RequestCategory) => {
      switch(cat) {
          case 'HEALTH': return <HeartPulse size={16} className="text-red-500"/>;
          case 'INTERIOR': return <ShieldAlert size={16} className="text-indigo-500"/>;
          case 'WASTE': return <Trash2 size={16} className="text-purple-500"/>;
          default: return <Phone size={16} className="text-slate-500"/>;
      }
  };

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'NEW': return <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse border border-red-200">YANGI</span>;
          case 'ASSIGNED': return <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-200">YO'NALTIRILDI</span>;
          case 'RESOLVED': return <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-200">BAJARILDI</span>;
          default: return <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold">JARAYONDA</span>;
      }
  };

  const filteredRequests = requests.filter(r => filterCategory === 'ALL' || r.category === filterCategory);

  // Kanban Columns
  const kanbanColumns = [
      { id: 'NEW', label: 'Yangi Murojaatlar', color: 'bg-red-50 border-red-100', items: filteredRequests.filter(r => r.status === 'NEW') },
      { id: 'ASSIGNED', label: 'Ijroga Yo\'naltirildi', color: 'bg-blue-50 border-blue-100', items: filteredRequests.filter(r => r.status === 'ASSIGNED' || r.status === 'PROCESSING') },
      { id: 'RESOLVED', label: 'Bajarildi (Yopilgan)', color: 'bg-emerald-50 border-emerald-100', items: filteredRequests.filter(r => r.status === 'RESOLVED' || r.status === 'CLOSED') },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-50 relative overflow-hidden">
        {/* Top KPI Bar */}
        <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center shadow-sm shrink-0 z-20">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <Bot size={22} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800 leading-none">AI Call Center</h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">Smart City Situatsion Markazi</p>
                </div>
            </div>
            
            <div className="flex gap-4 items-center">
                {/* View Switcher */}
                <div className="flex bg-slate-100 rounded-lg p-1">
                    <button onClick={() => setViewMode('LIST')} className={`p-1.5 rounded-md transition-all ${viewMode === 'LIST' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`} title="Ro'yxat"><List size={16}/></button>
                    <button onClick={() => setViewMode('KANBAN')} className={`p-1.5 rounded-md transition-all ${viewMode === 'KANBAN' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`} title="Kanban Doska"><Columns size={16}/></button>
                </div>

                <button 
                    onClick={() => { window.location.hash = 'portal'; }}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
                >
                    <Globe size={16} /> Portal
                </button>

                <div className="w-px h-8 bg-slate-200"></div>
                <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="text-right">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Navbatda</p>
                        <p className="text-xl font-bold text-orange-500">{stats.pending}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center"><Clock size={18}/></div>
                </div>
            </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
             {/* ... (rest of the component remains unchanged) ... */}
             {/* KANBAN VIEW */}
             {viewMode === 'KANBAN' && !isLiveMonitoring && !selectedRequest && (
                 <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 bg-slate-100/50">
                     <div className="flex gap-6 h-full min-w-max">
                         {kanbanColumns.map(col => (
                             <div key={col.id} className="w-80 flex flex-col h-full">
                                 <div className={`p-4 rounded-t-xl border-b-0 border ${col.color} bg-white flex justify-between items-center shadow-sm`}>
                                     <h3 className="font-bold text-slate-700 text-sm">{col.label}</h3>
                                     <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{col.items.length}</span>
                                 </div>
                                 <div className="flex-1 bg-slate-50/50 border border-slate-200 rounded-b-xl p-3 space-y-3 overflow-y-auto custom-scrollbar">
                                     {col.items.map(req => (
                                         <div 
                                            key={req.id} 
                                            onClick={() => setSelectedRequest(req)}
                                            className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
                                         >
                                             <div className="flex justify-between items-start mb-2">
                                                 <span className="text-[9px] font-mono text-slate-400 font-bold">{req.id}</span>
                                                 {getCategoryIcon(req.category)}
                                             </div>
                                             <h4 className="text-xs font-bold text-slate-800 line-clamp-2 mb-1">{req.transcript}</h4>
                                             <div className="flex justify-between items-end mt-2">
                                                 <div className="flex items-center gap-1">
                                                     <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-600">{req.citizenName.charAt(0)}</div>
                                                     <span className="text-[10px] text-slate-500 truncate w-20">{req.citizenName}</span>
                                                 </div>
                                                 <span className="text-[9px] text-slate-400 font-mono">{req.timestamp}</span>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>
             )}

             {/* LIST VIEW (Left Sidebar) */}
             {(viewMode === 'LIST' || selectedRequest || isLiveMonitoring) && (
                 <div className="w-80 border-r border-slate-200 bg-white flex flex-col overflow-y-auto custom-scrollbar shrink-0">
                     {/* Filters */}
                     <div className="p-3 sticky top-0 bg-white z-10 border-b border-slate-100">
                         <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                             {['ALL', 'WASTE', 'HEALTH', 'INTERIOR'].map(cat => (
                                 <button 
                                    key={cat} 
                                    onClick={() => setFilterCategory(cat as any)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap border transition-all ${filterCategory === cat ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                                 >
                                     {cat === 'ALL' ? 'Barchasi' : cat}
                                 </button>
                             ))}
                         </div>
                     </div>

                     <div className="flex-1 p-2 space-y-2">
                         {filteredRequests.map(req => (
                             <div 
                                key={req.id}
                                onClick={() => { setSelectedRequest(req); setIsLiveMonitoring(false); }}
                                className={`p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md relative overflow-hidden group ${selectedRequest?.id === req.id && !isLiveMonitoring ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
                             >
                                 {/* AI Indicator */}
                                 {req.id.includes('AI') && (
                                     <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-bl-lg flex items-center gap-1"><Bot size={8}/> AI CALL</div>
                                 )}

                                 <div className="flex justify-between items-start mb-2">
                                     <div className="flex items-center gap-2">
                                         <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-500 font-bold text-xs`}>
                                             {req.citizenName.charAt(0)}
                                         </div>
                                         <div>
                                             <h4 className="text-sm font-bold text-slate-800 leading-tight">{req.citizenName}</h4>
                                             <p className="text-[10px] text-slate-400 font-mono">{req.phone}</p>
                                         </div>
                                     </div>
                                     {getStatusBadge(req.status)}
                                 </div>

                                 <p className="text-xs text-slate-600 line-clamp-2 font-medium mb-2 opacity-80">"{req.transcript}"</p>
                                 
                                 <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/50">
                                     <div className="flex items-center gap-2">
                                         {getCategoryIcon(req.category)}
                                         <span className="text-[10px] font-bold text-slate-500">{req.category}</span>
                                     </div>
                                     <span className="text-[10px] font-mono text-slate-400">{req.timestamp}</span>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>
             )}

             {/* CENTER: Main Stage (Detail) */}
             {selectedRequest && !isLiveMonitoring && (
                 <div className="flex-1 bg-slate-100/50 flex flex-col overflow-hidden relative">
                     <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                         {/* Close Button if from Kanban */}
                         {viewMode === 'KANBAN' && (
                             <button onClick={() => setSelectedRequest(null)} className="absolute top-4 right-4 p-2 bg-slate-200 rounded-full hover:bg-slate-300"><X size={16}/></button>
                         )}

                         {/* Header: Citizen & Context */}
                         <div className="flex gap-6 mb-6">
                             {/* Citizen Profile Card */}
                             <div className="w-1/3 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                                 <div className="flex items-center justify-between mb-4">
                                     <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fuqaro Profili</h3>
                                     <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedRequest.citizenTrustScore > 80 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                         Ishonch: {selectedRequest.citizenTrustScore}%
                                     </div>
                                 </div>
                                 <div className="flex items-center gap-4 mb-4">
                                     <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 text-xl font-bold">
                                         <User size={24}/>
                                     </div>
                                     <div>
                                         <h2 className="text-lg font-bold text-slate-800">{selectedRequest.citizenName}</h2>
                                         <p className="text-sm text-slate-500 font-mono">{selectedRequest.phone}</p>
                                     </div>
                                 </div>
                                 <div className="grid grid-cols-2 gap-3">
                                     <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                                         <p className="text-[10px] text-slate-400">Manba</p>
                                         <p className="text-sm font-bold text-slate-700">{selectedRequest.id.includes('AI') ? 'AI Operator' : 'Operator'}</p>
                                     </div>
                                     <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                                         <p className="text-[10px] text-slate-400">Manzil</p>
                                         <p className="text-xs font-bold text-slate-700 truncate">{selectedRequest.address || "Aniqlanmoqda..."}</p>
                                     </div>
                                 </div>
                             </div>

                             {/* AI Insights Card */}
                             <div className="flex-1 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                                 <div className="flex items-center gap-2 mb-3">
                                     <Bot size={18} className="text-indigo-600"/>
                                     <h3 className="text-sm font-bold text-slate-800">AI Tahlil Xulosasi</h3>
                                 </div>
                                 <p className="text-sm text-slate-600 leading-relaxed mb-4 flex-1">
                                     {selectedRequest.aiSummary}
                                 </p>
                                 <div className="flex gap-2 mb-4">
                                     {selectedRequest.keywords.map(k => (
                                         <span key={k} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold border border-indigo-100">#{k}</span>
                                     ))}
                                 </div>
                                 <div className="h-12 bg-slate-50 rounded-xl border border-slate-100 flex items-center px-4 gap-3">
                                     <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center cursor-pointer hover:bg-indigo-600 hover:text-white transition-colors">
                                         <Activity size={16}/>
                                     </div>
                                     <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                                         <div className="w-3/4 h-full bg-slate-400/50"></div>
                                     </div>
                                     <span className="text-xs font-mono text-slate-500">Auto-generated</span>
                                 </div>
                             </div>
                         </div>

                         {/* Workflow Timeline */}
                         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
                             <h3 className="text-sm font-bold text-slate-700 mb-6 flex items-center gap-2"><History size={16} className="text-blue-500"/> Ijro Jarayoni (Timeline)</h3>
                             <div className="space-y-6 relative">
                                 <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-slate-100"></div>
                                 {selectedRequest.timeline.map((step, idx) => (
                                     <div key={idx} className="relative flex gap-4 items-start">
                                         <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center z-10 border-4 border-white shadow-sm ${step.status === 'DONE' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                             {step.status === 'DONE' ? <Check size={14}/> : <Clock size={14}/>}
                                         </div>
                                         <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                             <div className="flex justify-between items-start">
                                                 <h4 className="text-xs font-bold text-slate-800">{step.step}</h4>
                                                 <span className="text-[10px] text-slate-400 font-mono">{step.timestamp}</span>
                                             </div>
                                             <p className="text-[10px] text-slate-500 mt-1 font-medium">{step.actor}</p>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         </div>

                         {/* Quick Actions (Inline) */}
                         <div className="grid grid-cols-2 gap-4">
                             <button onClick={() => setShowRoutingModal(true)} disabled={selectedRequest.status === 'RESOLVED'} className="py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                 <Share2 size={16}/> Tashkilotga Yo'naltirish
                             </button>
                             <button onClick={() => setShowSmsModal(true)} className="py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-2">
                                 <MessageSquare size={16}/> Fuqaroga SMS Yozish
                             </button>
                         </div>
                     </div>
                 </div>
             )}

             {/* Placeholder if nothing selected */}
             {!selectedRequest && !isLiveMonitoring && (
                 <div className="flex-1 flex flex-col items-center justify-center opacity-40">
                     <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                         <Bot size={48} className="text-indigo-300" />
                     </div>
                     <h3 className="text-lg font-bold text-slate-600 mb-2">AI Operator Paneli</h3>
                     <p className="text-sm font-medium text-slate-400 text-center max-w-xs">Murojaatni tanlang yoki fuqarolar portalini boshqaring</p>
                 </div>
             )}

             {/* RIGHT: Resource & Organization Monitor */}
             <div className="w-80 border-l border-slate-200 bg-white flex flex-col overflow-hidden shrink-0">
                 <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                     <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Users size={14}/> Mas'ul Tashkilotlar</h3>
                 </div>
                 <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                     {RESPONSIBLE_ORGS.map(org => (
                         <div key={org.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors">
                             <div className="flex items-center gap-2 mb-2">
                                 <div className="p-1.5 bg-slate-50 rounded-lg text-slate-600"><Building size={14}/></div>
                                 <div className="flex-1 min-w-0">
                                     <h4 className="text-xs font-bold text-slate-800 truncate">{org.name}</h4>
                                     <p className="text-[9px] text-slate-400 font-mono">{org.contactPhone}</p>
                                 </div>
                             </div>
                             
                             <div className="space-y-2 mt-2">
                                 <div className="flex justify-between items-center text-[10px]">
                                     <span className="font-bold text-slate-500">Ishchi Kuchi</span>
                                     <span className="font-mono text-slate-700">{org.activeBrigades} / {org.totalBrigades} brigada</span>
                                 </div>
                                 <div>
                                     <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1">
                                         <span>Yuklama</span>
                                         <span className={org.currentLoad > 80 ? 'text-red-500' : 'text-emerald-500'}>{org.currentLoad}%</span>
                                     </div>
                                     <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                         <div 
                                            className={`h-full rounded-full ${org.currentLoad > 80 ? 'bg-red-500' : org.currentLoad > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                            style={{width: `${org.currentLoad}%`}}
                                         ></div>
                                     </div>
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>

             {/* Routing Modal */}
             <AnimatePresence>
                 {showRoutingModal && (
                     <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
                         <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-2xl rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                         >
                             <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                 <div>
                                     <h3 className="text-lg font-bold text-slate-800">Ijroni Yo'naltirish</h3>
                                     <p className="text-xs text-slate-500">Mas'ul tashkilotni tanlang</p>
                                 </div>
                                 <button onClick={() => setShowRoutingModal(false)} className="w-8 h-8 rounded-full bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors"><X size={18}/></button>
                             </div>
                             
                             <div className="flex-1 overflow-y-auto p-5 grid grid-cols-2 gap-4 bg-slate-50/50">
                                 {RESPONSIBLE_ORGS.map(org => {
                                     const isRecommended = org.type === selectedRequest?.category;
                                     return (
                                         <div 
                                            key={org.id} 
                                            onClick={() => handleRouteRequest(org.id)}
                                            className={`bg-white p-4 rounded-xl border cursor-pointer transition-all hover:shadow-lg relative overflow-hidden group ${isRecommended ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-indigo-300'}`}
                                         >
                                             {isRecommended && <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg">AI TAVSIYASI</div>}
                                             
                                             <div className="flex items-center gap-3 mb-3">
                                                 <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                                                     <Building size={20} className="text-slate-600"/>
                                                 </div>
                                                 <div>
                                                     <h4 className="text-sm font-bold text-slate-800">{org.name}</h4>
                                                     <p className="text-[10px] text-slate-500 font-mono">{org.contactPhone}</p>
                                                 </div>
                                             </div>
                                             
                                             <div className="space-y-2">
                                                 <div className="flex justify-between text-[10px] font-bold text-slate-500">
                                                     <span>Bandlik</span>
                                                     <span className={org.currentLoad > 80 ? 'text-red-500' : 'text-emerald-500'}>{org.currentLoad}%</span>
                                                 </div>
                                                 <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                     <div className={`h-full rounded-full ${org.currentLoad > 80 ? 'bg-red-500' : org.currentLoad > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{width: `${org.currentLoad}%`}}></div>
                                                 </div>
                                                 <div className="flex justify-between items-center pt-2 border-t border-slate-50 mt-2">
                                                     <span className="text-[10px] text-slate-400">Aktiv Brigadalar</span>
                                                     <span className="text-xs font-bold text-slate-700">{org.activeBrigades} / {org.totalBrigades}</span>
                                                 </div>
                                             </div>
                                         </div>
                                     )
                                 })}
                             </div>
                         </motion.div>
                     </div>
                 )}
             </AnimatePresence>

             {/* SMS Modal */}
             <AnimatePresence>
                 {showSmsModal && selectedRequest && (
                     <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
                         <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-sm rounded-[24px] shadow-2xl p-6 border border-slate-100"
                         >
                             <div className="flex justify-between items-center mb-4">
                                 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Mail size={20} className="text-blue-500"/> SMS Yuborish</h3>
                                 <button onClick={() => setShowSmsModal(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={18}/></button>
                             </div>
                             
                             <div className="space-y-4">
                                 <div>
                                     <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Qabul Qiluvchi</label>
                                     <input type="text" value={selectedRequest.phone} disabled className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-600"/>
                                 </div>
                                 <div>
                                     <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Xabar Matni</label>
                                     <textarea 
                                        value={smsText}
                                        onChange={(e) => setSmsText(e.target.value)}
                                        placeholder="Fuqaroga xabar yozing..." 
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 h-32 resize-none"
                                     />
                                 </div>
                                 
                                 <div className="flex gap-2">
                                     <button onClick={() => setSmsText("Hurmatli fuqaro, sizning murojaatingiz qabul qilindi. Tez orada mutaxassislarimiz bog'lanishadi.")} className="text-[9px] bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-bold hover:bg-blue-100">Shablon 1</button>
                                     <button onClick={() => setSmsText("Murojaatingiz bo'yicha ishchi guruh yuborildi. Iltimos kuting.")} className="text-[9px] bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-bold hover:bg-blue-100">Shablon 2</button>
                                 </div>

                                 <button onClick={handleSendSMS} disabled={!smsText.trim()} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                     <Send size={16}/> Yuborish
                                 </button>
                             </div>
                         </motion.div>
                     </div>
                 )}
             </AnimatePresence>
        </div>
    </div>
  );
};

export default AICallCenter;
