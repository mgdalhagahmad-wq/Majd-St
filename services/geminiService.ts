
import { GoogleGenAI } from "@google/genai";

// وظيفة لفك تشفير Base64 إلى Uint8Array يدوياً كما تشترط الإرشادات
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// وظيفة معالجة بيانات PCM الخام القادمة من Gemini
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // التأكد من محاذاة البيانات (Alignment) لتحويلها إلى Int16
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.length / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// تحويل AudioBuffer إلى ملف WAV جاهز للتحميل أو التشغيل
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const outBuffer = new ArrayBuffer(length);
  const view = new DataView(outBuffer);
  const channels = [];
  let i, sample, offset = 0, pos = 0;

  const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; };
  const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; };

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8);
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt "
  setUint32(16);
  setUint16(1); // PCM
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  setUint32(0x61746164); // "data"
  setUint32(length - pos - 4);

  for (i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));
  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      for (let ch = 0; ch < numOfChan; ch++) {
        sample = Math.max(-1, Math.min(1, channels[ch][offset]));
        sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF);
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }
  }
  return new Blob([outBuffer], { type: "audio/wav" });
}

const blobToDataURL = (blob: Blob): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
};

export class MajdStudioService {
  /**
   * تحسين النص باستخدام Gemini 3 Flash
   */
  async preprocessText(text: string, options: { dialect: string, field: string, personality: string }): Promise<string> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const prompt = `أعد صياغة النص التالي بلهجة ${options.dialect} لمجال ${options.field}. أضف علامات ترقيم لضبط النفس والوقفات. أخرج النص الجديد فقط: "${text}"`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
      });
      
      return response.text || text;
    } catch (error) {
      console.error("Text Preprocess Error:", error);
      return text; // العودة للنص الأصلي في حال الفشل
    }
  }

  /**
   * توليد الصوت باستخدام Gemini 2.5 Flash Native Audio (TTS)
   */
  async generateVoiceOver(text: string, voiceName: string, performanceNote: string): Promise<{ dataUrl: string, duration: number }> {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const directive = `الأداء المطلوب: ${performanceNote}. النص المراد تسجيله: "${text}"`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: directive }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: { 
            voiceConfig: { 
              prebuiltVoiceConfig: { voiceName: voiceName } 
            } 
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
      
      if (!base64Audio) {
        throw new Error("لم يتم استلام بيانات صوتية من الخادم (No Audio Data)");
      }

      // إعداد سياق الصوت للتحويل
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const decodedBytes = decode(base64Audio);
      const audioBuffer = await decodeAudioData(decodedBytes, audioContext, 24000, 1);
      
      const wavBlob = audioBufferToWav(audioBuffer);
      const dataUrl = await blobToDataURL(wavBlob);
      
      return {
        dataUrl,
        duration: audioBuffer.duration
      };
    } catch (error: any) {
      console.error("Voice Generation Error Details:", error);
      throw error; // سيتم التقاطه في App.tsx وإظهار التنبيه للمستخدم
    }
  }
}

export const majdService = new MajdStudioService();
