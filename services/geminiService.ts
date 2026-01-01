
import { GoogleGenAI, GenerateContentResponse, Modality, Type } from "@google/genai";

// Use recommended model names as per guidelines
const VISION_MODEL = 'gemini-3-flash-preview';
const CHAT_MODEL = 'gemini-3-flash-preview';

// --- IMAGE ANALYSIS FOR WASTE BINS ---
export const analyzeBinImage = async (base64Image: string): Promise<{ isFull: boolean; fillLevel: number; confidence: number; notes: string }> => {
  // Always use process.env.API_KEY directly
  const apiKey = process.env.API_KEY || '';
  if (!apiKey) throw new Error("API Key Required");
  
  const ai = new GoogleGenAI({ apiKey });
  
  // KUCHAYTIRILGAN PROMT (Enhanced Prompt)
  const prompt = `
    Sen tajribali atrof-muhitni kuzatuv tizimi ekspertisiz. Rasmni tahlil qiling va quyidagilarni aniqlang:
    
    1. Rasmda chiqindi konteyneri bormi? Javob: HA yoki YO'Q.
    
    2. Agar HA bo'lsa, konteyner to'la bo'limi? Javob: HA yoki YO'Q.
    - TO'LA BELGILARI: axlat konteyneri ochig'ida axlat ko'rinadi, axlat konteyneridan tashqari joyda axlat yoki sumkalar ko'rinadi, axlat konteyneri ochiq qopqog'i ostida axlatlar to'planib qolgan bo'lsa, axlat konteyneri butunlay axlat bilan qoplangan bo'lsa.
    - BO'SH BELGILARI: axlat konteyneri ichida bo'sh joy ko'rinadi, axlat konteyneri ochig'i ochiq va ichi ko'rinadi, axlat konteyneri atrofida axlat yoki sumka yo'q.
    
    3. Agar HA bo'lsa, to'ldirish darajasini % (0-100) ko'rsating. Batafsil tahlil:
    - 0-25%: Konteyner deyarli bo'sh, ichida kamroq axlat bor
    - 26-50%: Konteyner taxminan yarim to'la
    - 51-75%: Konteyner ko'pincha to'la, lekin hali joy bor
    - 76-100%: Konteyner to'la, axlat tashqariga chiqib turgan yoki chiqib ketayotgan
    
    4. Agar YO'Q bo'lsa, rasmda nima borligini tushuntiring.
    
    5. Rasmda qanday obyektlar aniqlanganligini tavsifli ro'yxat ko'rinishida berin:
    - Chiqindi konteyneri (shakl, rang, hajm, holati)
    - Sumkalar (soni, rangi, joylashuvi)
    - Axlatlar (turi, miqdori, joylashuvi)
    - Boshqa obyektlar (odamlar, avtomobillar, bino, daraxt, ko'cha belgilari)
    
    6. Agar konteyner to'la bo'lsa, unga qanday chora ko'rish kerakligi bo'yicha takliflaringizni bering.
    
    7. Agar konteyner aniqlanmasa, kamera to'g'rimi yoki axlat konteyneri joyida emasmi yoki axlat aniqlanmadi deb xabar bering.
    
    Rasmni to'g'ri tekshirish uchun quyidagi belgilarni hisobga oling:
    - Chiqindi konteyneri odatda to'rtburchak yoki silindrsimon shaklda bo'ladi
    - Ko'pincha yashil, sariq, ko'k yoki qora rangda bo'ladi
    - Yozuvlar, logolar yoki chiqindi turi ko'rsatiladi
    - Qopqog'i yoki ochiq bo'lishi mumkin
    - Ko'pincha ko'cha yoki bino yonida joylashadi
    
    Tahlil qilishda e'tibor bering:
    - Konteyner ichidagi axlat miqdoriga
    - Konteyner atrofidagi axlatlarga
    - Qopqog'ining ochiq yoki yopiq ekanligiga
    - Axlatning konteyner ichida yoki tashqarisida joylashganligiga
    
    Javobni FAQAT JSON formatida ber:
    {
      "isFull": boolean (True = To'lgan/Toshib ketgan, False = Joy bor),
      "fillLevel": number (0 dan 100 gacha foiz. Batafsil tahlil asosida aniqroq aniqlash),
      "confidence": number (O'z qaroringga ishonch darajasi 0-100),
      "notes": string (Batafsil tahlil natijasi va asoslangan fikr o'zbek tilida)
    }
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: VISION_MODEL,
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
        ]
      }],
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isFull: { type: Type.BOOLEAN },
            fillLevel: { type: Type.NUMBER },
            confidence: { type: Type.NUMBER },
            notes: { type: Type.STRING }
          },
          required: ["isFull", "fillLevel", "confidence", "notes"]
        }
      }
    });

    const text = response.text || '{}';
    return JSON.parse(text);
  } catch (error) {
    console.error("Vision API Error:", error);
    return { isFull: false, fillLevel: 0, confidence: 0, notes: "Tizim xatoligi (AI javob bermadi)" };
  }
};

// --- PREVIOUS AUDIO & CHAT FUNCTIONS ---
export class GeminiLiveCall {
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private nextStartTime: number = 0;
  private onTicketCreated: (ticket: any) => void;
  private onStatusChange: (status: string) => void;
  private onVolumeChange: (volume: number) => void;

  constructor(onTicketCreated: (ticket: any) => void, onStatusChange: (status: string) => void, onVolumeChange: (volume: number) => void) {
    this.onTicketCreated = onTicketCreated; 
    this.onStatusChange = onStatusChange; 
    this.onVolumeChange = onVolumeChange;
  }

  async initializeAudio() {
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      if (this.inputAudioContext.state === 'suspended') await this.inputAudioContext.resume();
      if (this.outputAudioContext.state === 'suspended') await this.outputAudioContext.resume();
  }

  async start(language: 'uz' | 'ru' = 'uz') {
    const apiKey = process.env.API_KEY || '';
    const ai = new GoogleGenAI({ apiKey });
    this.onStatusChange("CONNECTING");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaStream = stream;

      // Use live.connect with the specific native audio model
      this.sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: { 
          responseModalities: [Modality.AUDIO],
          systemInstruction: { role: 'system', parts: [{ text: `Siz aqlli dispetcher yordamchisiz. Fuqarolarga ${language === 'uz' ? "O'zbek" : "Rus"} tilida yordam bering.` }] }
        },
        callbacks: {
          onopen: () => { 
            this.onStatusChange("ACTIVE"); 
            // Implement audio streaming to model if needed
          },
          onmessage: async (message) => {
             // Handle audio response as per guidelines
             const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
             if (base64Audio && this.outputAudioContext) {
                 // Decoding and playback logic would go here
             }
          },
          onclose: () => { this.onStatusChange("CLOSED"); },
          onerror: (e) => { this.onStatusChange("ERROR"); console.error(e); }
        }
      });
    } catch (e) { 
      this.onStatusChange("ERROR"); 
      console.error(e);
    }
  }

  stop() { 
    if(this.mediaStream) this.mediaStream.getTracks().forEach(t => t.stop()); 
    this.sessionPromise = null; 
    this.onStatusChange("IDLE");
  }
}

export const chatWithCitizen = async (history: any[], message: string, language: 'uz' | 'ru' = 'uz'): Promise<string> => {
    const apiKey = process.env.API_KEY || '';
    const ai = new GoogleGenAI({ apiKey });
    const chat = ai.chats.create({ 
      model: CHAT_MODEL, 
      config: {
        systemInstruction: { role: 'system', parts: [{ text: `Siz aqlli shahar yordamchisiz. Fuqarolarga ${language === 'uz' ? "O'zbek" : "Rus"} tilida yordam bering.` }] }
      }
    });
    // sendMessage returns GenerateContentResponse
    const response = await chat.sendMessage({ message });
    return response.text || "";
};
