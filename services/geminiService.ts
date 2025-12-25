
import { GoogleGenAI, Modality } from "@google/genai";

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 4): Promise<T> {
  let delay = 3000; 
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const errorMsg = error?.message || "";
      const status = error?.status || (errorMsg.includes("429") ? 429 : 500);
      
      if (status === 429 && i < maxRetries - 1) {
        const jitter = Math.random() * 2000;
        console.warn(`[Majd AI] محاولة إعادة الاتصال ${i + 1}... السيرفر مشغول حالياً.`);
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
        delay *= 2;
        continue;
      }
      throw error;
    }
  }
  throw new Error("تجاوز المحرك حدود الاستخدام المسموحة. يرجى مراجعة إعدادات Quota في Google Cloud.");
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const dataInt16 = new Int16Array(buffer);
  const frameCount = dataInt16.length / numChannels;
  const audioBuffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return audioBuffer;
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const outBuffer = new ArrayBuffer(length);
  const view = new DataView(outBuffer);
  let pos = 0;

  const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; };
  const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; };

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8);
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt "
  setUint32(16);
  setUint16(1); 
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16); 
  setUint32(0x61746164); // "data"
  setUint32(length - pos - 4);

  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numOfChan; channel++) {
      let sample = buffer.getChannelData(channel)[i];
      sample = Math.max(-1, Math.min(1, sample)); 
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(pos, sample, true);
      pos += 2;
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
  private getApiKey(): string {
    const key = process.env.API_KEY;
    if (!key || key === "undefined" || key.length < 5) {
      throw new Error("API Key غير موجود أو غير صحيح في إعدادات Vercel. يرجى عمل Redeploy.");
    }
    return key;
  }

  // دالة لاختبار المفتاح فوراً (تستخدم في لوحة التحكم)
  async testConnection(): Promise<{ success: boolean, message: string }> {
    try {
      const ai = new GoogleGenAI({ apiKey: this.getApiKey() });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "hi",
      });
      return { success: true, message: `يعمل بنجاح. الرد: ${response.text}` };
    } catch (e: any) {
      return { success: false, message: e.message || "فشل غير معروف" };
    }
  }

  async preprocessText(text: string, options: { dialect: string, field: string, personality: string }): Promise<string> {
    return withRetry(async () => {
      const ai = new GoogleGenAI({ apiKey: this.getApiKey() });
      const prompt = `أعد صياغة النص التالي بأسلوب ${options.personality} ولهجة ${options.dialect} لمجال ${options.field}. اجعل النص احترافياً وجذاباً. أخرج النص الجديد فقط وبدون أي مقدمات: "${text}"`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
      });
      
      return response.text || text;
    });
  }

  async generateVoiceOver(text: string, voiceName: string, performanceNote: string): Promise<{ dataUrl: string, duration: number }> {
    return withRetry(async () => {
      const ai = new GoogleGenAI({ apiKey: this.getApiKey() });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `${performanceNote}. النص المراد قراءته هو: "${text}"` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { 
            voiceConfig: { 
              prebuiltVoiceConfig: { voiceName } 
            } 
          },
        },
      });

      const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      const base64Audio = audioPart?.inlineData?.data;
      
      if (!base64Audio) throw new Error("لم يتم استلام بيانات صوتية.");

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const decodedBytes = decode(base64Audio);
      const audioBuffer = await decodeAudioData(decodedBytes, audioContext, 24000, 1);
      
      const wavBlob = audioBufferToWav(audioBuffer);
      const dataUrl = await blobToDataURL(wavBlob);
      
      return { dataUrl, duration: audioBuffer.duration };
    });
  }
}

export const savioService = new MajdStudioService();
