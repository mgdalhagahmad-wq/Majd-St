
import { GoogleGenAI, Modality } from "@google/genai";

// نظام إعادة محاولة مخصص
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2, initialDelay = 1000): Promise<T> {
  let delay = initialDelay; 
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const errorMsg = (error?.message || "").toLowerCase();
      if ((errorMsg.includes("429") || errorMsg.includes("quota")) && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw error;
    }
  }
  throw new Error("فشل الاتصال بمحرك جوجل.");
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
    return process.env.API_KEY || "";
  }

  // فحص دقيق للحالة
  async testConnection(): Promise<{ textOk: boolean, voiceOk: boolean, message: string, quotaStatus: string }> {
    let textOk = false;
    let voiceOk = false;
    let quotaStatus = "Unknown";
    let msg = "";

    const ai = new GoogleGenAI({ apiKey: this.getApiKey() });

    try {
      await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: "hi" });
      textOk = true;
      msg += "✅ نصوص: تعمل. ";
    } catch (e: any) {
      msg += `❌ نصوص: ${e.message}. `;
    }

    try {
      await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: "test" }] }],
        config: { responseModalities: [Modality.AUDIO] }
      });
      voiceOk = true;
      quotaStatus = "Ready";
      msg += "✅ صوت (TTS): يعمل.";
    } catch (e: any) {
      const errorStr = JSON.stringify(e);
      if (errorStr.includes("limit\": 0") || errorStr.includes("limit: 0")) {
        quotaStatus = "Restricted (Limit 0)";
        msg += "⚠️ صوت (TTS): حصتك لهذا الموديل هي 0 في Google Cloud.";
      } else {
        msg += `❌ صوت (TTS): ${e.message}`;
      }
    }

    return { textOk, voiceOk, message: msg, quotaStatus };
  }

  async preprocessText(text: string, options: { dialect: string, field: string, personality: string }): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: this.getApiKey() });
    const prompt = `أعد صياغة النص التالي بأسلوب ${options.personality} ولهجة ${options.dialect} لمجال ${options.field}. أخرج النص الجديد فقط وبدون أي مقدمات: "${text}"`;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
    });
    return response.text || text;
  }

  // توليد صوت محلي (Fallback) باستخدام متصفح المستخدم
  async generateLocalVoiceOver(text: string): Promise<{ dataUrl: string, duration: number }> {
    return new Promise((resolve, reject) => {
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(text);
      
      // محاولة العثور على صوت عربي
      const voices = synth.getVoices();
      const arabicVoice = voices.find(v => v.lang.startsWith('ar')) || voices[0];
      if (arabicVoice) utterance.voice = arabicVoice;
      
      utterance.pitch = 1;
      utterance.rate = 0.9;
      
      // بما أن الـ Web Speech API لا يعطي Blob مباشرة، سنقوم بمحاكاة "معاينة صوتية"
      // ونخبر النظام أن هذا صوت محلي.
      synth.speak(utterance);
      
      // ملاحظة: في النسخة الحقيقية، يفضل استخدام مكتبة مثل RecordRTC إذا أردت تحويل صوت المتصفح لـ Blob
      // هنا سنعيد DataURL فارغ ونعتمد على SpeechSynthesis للتشغيل المباشر
      resolve({ dataUrl: "local_stream", duration: text.length / 10 });
    });
  }

  async generateVoiceOver(text: string, voiceName: string, performanceNote: string): Promise<{ dataUrl: string, duration: number }> {
    const ai = new GoogleGenAI({ apiKey: this.getApiKey() });
    
    // محاولة الموديلات بالترتيب
    const models = ['gemini-2.5-flash-preview-tts', 'gemini-2.5-flash-native-audio-preview-09-2025'];
    
    for (const modelName of models) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [{ parts: [{ text: `${performanceNote}. اقرأ بوضوح وبطريقة معبرة: ${text}` }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
          },
        });

        const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (audioPart?.inlineData?.data) {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
          const audioBuffer = await decodeAudioData(decode(audioPart.inlineData.data), audioContext, 24000, 1);
          return { dataUrl: await blobToDataURL(audioBufferToWav(audioBuffer)), duration: audioBuffer.duration };
        }
      } catch (e: any) {
        console.warn(`[Majd] ${modelName} فشل:`, e.message);
        if (JSON.stringify(e).includes("limit\": 0")) {
          // إذا كان الخطأ هو Quota 0، نرمي خطأ مخصص للواجهة لتعرض "الحل"
          throw new Error("QUOTA_LIMIT_ZERO");
        }
      }
    }
    
    throw new Error("FAILED_ALL_MODELS");
  }
}

export const savioService = new MajdStudioService();
