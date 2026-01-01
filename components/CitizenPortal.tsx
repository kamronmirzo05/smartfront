
import React, { useState, useRef, useEffect } from 'react';
import { Phone, FileText, CheckCircle2, ArrowRight, MessageSquare, ChevronLeft, LogOut, Globe, Send, Camera, MapPin, Sparkles, X, Trash2, ShieldCheck, RefreshCw } from 'lucide-react';
import { GeminiLiveCall, chatWithCitizen, analyzeBinImage } from '../services/geminiService';
import { DB } from '../services/storage'; 
import { WasteBin } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface CitizenPortalProps { onBackToAdmin: () => void; }

const CitizenPortal: React.FC<CitizenPortalProps> = ({ onBackToAdmin }) => {
    const [mode, setMode] = useState<'LANDING' | 'AI_CHAT' | 'VOICE_AGENT' | 'BOT_WASTE' | 'SUCCESS'>('LANDING');
    
    // Bot Simulation State
    const [selectedBin, setSelectedBin] = useState<WasteBin | null>(null);
    const [uploadingImage, setUploadingImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [bins, setBins] = useState<WasteBin[]>([]);
    
    // Load bins on component mount
    useEffect(() => {
        const loadBins = async () => {
            const loadedBins = await DB.getBins();
            setBins(loadedBins);
        };
        loadBins();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadingImage(reader.result as string);
                processAnalysis(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const processAnalysis = async (base64Data: string) => {
        if (!selectedBin) return;
        setIsAnalyzing(true);
        try {
            const rawBase64 = base64Data.split(',')[1];
            const result = await analyzeBinImage(rawBase64);
            
            // Update the bin in Global DB
            const updatedBin: WasteBin = { 
                ...selectedBin, 
                fillLevel: result.fillLevel, 
                isFull: result.isFull, 
                imageUrl: base64Data, 
                imageSource: 'BOT', // Manba: BOT
                lastAnalysis: 'Bot (@tozafargona): ' + new Date().toLocaleTimeString() 
            };
            
            // Update DB immediately
            const bins = await DB.getBins();
            const updatedBins = bins.map(b => b.id === selectedBin.id ? updatedBin : b);
            for (const bin of updatedBins) {
                await DB.saveBin(bin);
            }
            
            setTimeout(() => setMode('SUCCESS'), 2000);
        } catch (e) {
            alert("Tahlilda xatolik. Qayta urinib ko'ring.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="h-[100dvh] w-screen bg-[#F2F2F7] flex flex-col font-sans overflow-hidden relative">
            {mode === 'LANDING' && (
                <div className="p-4 flex justify-between items-center z-10">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-md rounded-full shadow-sm">
                        <Globe size={14} className="text-blue-600"/>
                        <span className="text-xs font-bold text-slate-700">My.Fergana</span>
                    </div>
                    <button onClick={onBackToAdmin} className="w-8 h-8 flex items-center justify-center bg-white/80 rounded-full shadow-sm text-slate-500"><LogOut size={14}/></button>
                </div>
            )}

            <main className="flex-1 relative overflow-hidden">
                <AnimatePresence mode="wait">
                    
                    {mode === 'LANDING' && (
                        <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col px-6 pt-10 pb-8">
                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-black text-slate-900">Xizmatni tanlang</h2>
                                <p className="text-slate-400 text-sm mt-1">Sizga qanday yordam bera olamiz?</p>
                            </div>
                            
                            <div className="flex-1 flex flex-col gap-4 w-full max-w-sm mx-auto">
                                <button onClick={() => setMode('BOT_WASTE')} className="w-full bg-[#24A1DE] rounded-[28px] p-6 text-white shadow-xl active:scale-95 transition-all relative overflow-hidden">
                                    <div className="flex items-center justify-between">
                                        <div className="text-left">
                                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
                                                <Trash2 size={24} />
                                            </div>
                                            <h3 className="text-xl font-bold">@toza_fergana_bot</h3>
                                            <p className="text-xs opacity-70">Chiqindi konteynerini rasmga olish</p>
                                        </div>
                                        <ArrowRight size={24} />
                                    </div>
                                </button>

                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => setMode('VOICE_AGENT')} className="bg-white p-4 rounded-[24px] shadow-sm flex flex-col items-center justify-center gap-2 h-32">
                                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center"><Phone size={20}/></div>
                                        <span className="text-xs font-bold">Qo'ng'iroq</span>
                                    </button>
                                    <button onClick={() => setMode('AI_CHAT')} className="bg-white p-4 rounded-[24px] shadow-sm flex flex-col items-center justify-center gap-2 h-32">
                                        <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center"><MessageSquare size={20}/></div>
                                        <span className="text-xs font-bold">Yozish</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {mode === 'BOT_WASTE' && (
                        <motion.div key="bot" initial={{ y: '100%' }} animate={{ y: 0 }} className="h-full bg-white flex flex-col">
                            <div className="p-4 pt-10 border-b flex items-center gap-4">
                                <button onClick={() => setMode('LANDING')} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500"><ChevronLeft size={20}/></button>
                                <h2 className="text-lg font-bold">Toza Fergana AI Bot</h2>
                            </div>
                            
                            <div className="flex-1 p-6 overflow-y-auto space-y-6">
                                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                    <p className="text-xs font-medium text-blue-700 leading-relaxed">
                                        Kamera ishlamay qolganda yoki konteyner to'lib ketganini ko'rsangiz, iltimos, rasmga olib yuboring. Gemini AI rasmni tahlil qilib, markazga xabar beradi.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Hududni tanlang</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {bins.map(bin => (
                                            <button 
                                                key={bin.id} 
                                                onClick={() => setSelectedBin(bin)}
                                                className={`p-4 rounded-2xl border text-left transition-all ${selectedBin?.id === bin.id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20' : 'border-slate-100 bg-slate-50'}`}
                                            >
                                                <p className="text-sm font-bold text-slate-800">{bin.address}</p>
                                                <p className="text-[10px] text-slate-500">{bin.tozaHudud}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {selectedBin && (
                                    <div className="space-y-4">
                                        <div className="relative group">
                                            <input type="file" accept="image/*" capture="environment" className="absolute inset-0 opacity-0 z-10 w-full h-full cursor-pointer" onChange={handleFileChange} />
                                            <div className="w-full py-10 bg-slate-900 rounded-[32px] flex flex-col items-center justify-center text-white gap-3 shadow-xl overflow-hidden relative">
                                                {uploadingImage ? (
                                                    <img src={uploadingImage} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                                                ) : <Camera size={48} className="opacity-40" />}
                                                <span className="relative z-10 font-black text-xs tracking-widest">{uploadingImage ? "RASM YUKLANDI" : "RASMGA OLISH"}</span>
                                            </div>
                                        </div>

                                        {isAnalyzing && (
                                            <div className="flex items-center justify-center gap-3 py-4 text-blue-600">
                                                <RefreshCw size={20} className="animate-spin" />
                                                <span className="text-xs font-black">AI TAHLIL QILMOQDA...</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {mode === 'SUCCESS' && (
                        <motion.div key="success" initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="h-full flex flex-col items-center justify-center p-8 bg-white text-center">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                                <CheckCircle2 size={40}/>
                            </div>
                            <h2 className="text-2xl font-black text-slate-800">Qabul qilindi!</h2>
                            <p className="text-slate-500 text-sm mt-2 mb-10">Tizim rasmni tahlil qildi va ma'lumotni markazga yubordi. Yordamingiz uchun rahmat!</p>
                            <button onClick={() => setMode('LANDING')} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl">BOSH SAHIFA</button>
                        </motion.div>
                    )}

                </AnimatePresence>
            </main>
        </div>
    );
};

export default CitizenPortal;
