
import React, { useState, useRef, useEffect } from 'react';
import { DIALECTS, VOICE_TYPES, VOICE_FIELDS, STUDIO_CONTROLS, CATEGORY_STYLES, getBaseVoiceForType, DialectInfo, VoiceProfile, VoiceField } from './constants';
import { GenerationHistory, VoiceControls } from './types';
import { savioService } from './services/geminiService';

// --- Dashboard Component ---
const StudioDashboard: React.FC<{ 
  onClose: () => void, 
  totalGens: number,
  history: GenerationHistory[],
  onPlayHistory: (item: GenerationHistory) => void
}> = ({ onClose, totalGens, history, onPlayHistory }) => {
  const [mockStats] = useState({
    users: 1248,
    activeNow: 42,
    successRate: '99.2%',
    latency: '1.2s',
    countries: [
      { name: 'مصر', value: 45, color: 'bg-cyan-400' },
      { name: 'السعودية', value: 30, color: 'bg-indigo-500' },
      { name: 'المغرب', value: 12, color: 'bg-purple-500' },
      { name: 'الإمارات', value: 8, color: 'bg-blue-400' },
      { name: 'أخرى', value: 5, color: 'bg-slate-600' }
    ],
    sources: [
      { name: 'بحث جوجل', percentage: 55 },
      { name: 'مباشر', percentage: 25 },
      { name: 'تواصل اجتماعي', percentage: 15 },
      { name: 'إحالات', percentage: 5 }
    ]
  });

  const [activeTab, setActiveTab] = useState<'stats' | 'recordings'>('stats');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewProgress, setPreviewProgress] = useState(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = previewAudioRef.current;
    if (!audio) return;
    const updateProgress = () => {
      if (audio.duration) {
        setPreviewProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    audio.addEventListener('timeupdate', updateProgress);
    return () => audio.removeEventListener('timeupdate', updateProgress);
  }, []);

  const handleShare = async (item: GenerationHistory) => {
    const shareText = `استمع إلى هذا الأداء الصوتي من "سافيو استوديو":\n\nاللهجة: ${item.selection.dialect}\nالنص: ${item.text}\n\nتم التوليد بواسطة SAVIO STUDIO VO`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'مشاركة تسجيل من سافيو استوديو',
          text: shareText,
          url: window.location.href
        });
      } catch (err) {
        console.log('Share cancelled or failed');
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        alert('تم نسخ تفاصيل التسجيل للمشاركة!');
      } catch (err) {
        alert('فشل في النسخ، يرجى المحاولة يدوياً.');
      }
    }
  };

  const startPreview = (item: GenerationHistory) => {
    setPreviewId(item.id);
    setPreviewProgress(0);
    if (previewAudioRef.current) {
      previewAudioRef.current.src = item.audioBlobUrl;
      previewAudioRef.current.currentTime = 0;
      previewAudioRef.current.play().catch(e => console.log("Preview play blocked"));
    }
  };

  const stopPreview = () => {
    setPreviewId(null);
    setPreviewProgress(0);
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-[#030712]/95 backdrop-blur-2xl p-6 md:p-12 overflow-y-auto animate-in fade-in zoom-in duration-500" dir="rtl">
      {/* Hidden Preview Audio Engine */}
      <audio ref={previewAudioRef} className="hidden" />

      <div className="max-w-7xl mx-auto space-y-12 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between border-b border-white/5 pb-8 gap-6">
          <div>
            <h2 className="text-4xl font-bold brand-text">مركز تحكم سافيو</h2>
            <p className="text-white/30 text-xs uppercase tracking-[0.4em] mt-2 text-center md:text-right">Studio Intelligence & Archive</p>
          </div>
          
          <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5">
            <button 
              onClick={() => setActiveTab('stats')}
              className={`px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'stats' ? 'brand-bg text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
            >
              الإحصائيات
            </button>
            <button 
              onClick={() => setActiveTab('recordings')}
              className={`px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'recordings' ? 'brand-bg text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
            >
              أرشيف الأصوات
            </button>
          </div>

          <button 
            onClick={onClose}
            className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all hover:bg-white/10"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {activeTab === 'stats' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'إجمالي العمليات', val: totalGens || 0, sub: 'محلياً', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
                { label: 'المستخدمون النشطون', val: mockStats.users, sub: 'عالمياً', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
                { label: 'معدل نجاح النظام', val: mockStats.successRate, sub: 'Live', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                { label: 'وقت الاستجابة', val: mockStats.latency, sub: 'Gemini Engine', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
              ].map((card, i) => (
                <div key={i} className="glass-3d p-8 rounded-[35px] relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 brand-bg opacity-20 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 rounded-2xl bg-white/5 text-cyan-400">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} /></svg>
                    </div>
                    <span className="text-[10px] font-bold text-white/10 uppercase tracking-widest">{card.sub}</span>
                  </div>
                  <h4 className="text-3xl font-bold text-white mb-1">{card.val}</h4>
                  <p className="text-xs text-white/30 font-bold uppercase tracking-wider">{card.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 glass-3d p-10 rounded-[45px] space-y-8">
                <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-[0.4em]">التوزيع الجغرافي للزوار</h3>
                <div className="space-y-6">
                  {mockStats.countries.map((c, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-white/60">
                        <span>{c.name}</span>
                        <span>{c.value}%</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full ${c.color} rounded-full transition-all duration-1000`} style={{ width: `${c.value}%`, transitionDelay: `${i * 100}ms` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-3d p-10 rounded-[45px] space-y-8">
                <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-[0.4em]">مصادر الزيارات</h3>
                <div className="flex flex-col gap-6">
                  {mockStats.sources.map((s, i) => (
                    <div key={i} className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-all group">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-bold text-white/80">{s.name}</span>
                        <span className="text-xs font-bold text-indigo-400">{s.percentage}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full brand-bg opacity-40 group-hover:opacity-100 transition-all duration-1000" style={{ width: `${s.percentage}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold text-white">أرشيف التسجيلات</h3>
                <p className="text-[9px] text-cyan-400 font-bold uppercase tracking-[0.2em] mt-1">تلميح: مرر الماوس فوق التسجيل للمعاينة السريعة</p>
              </div>
              <p className="text-xs text-white/20 uppercase tracking-[0.2em]">{history.length} تسجيل متاح</p>
            </div>

            {history.length === 0 ? (
              <div className="py-32 text-center glass-3d rounded-[50px] border-dashed border-white/5">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-white/10">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </div>
                <h4 className="text-xl font-bold text-white/40">لا توجد تسجيلات بعد</h4>
                <p className="text-sm text-white/10 mt-2">ابدأ بتوليد أول أداء صوتي ليظهر هنا في الأرشيف</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {history.slice().reverse().map((item) => (
                  <div 
                    key={item.id} 
                    onMouseEnter={() => startPreview(item)}
                    onMouseLeave={() => stopPreview()}
                    className={`glass-3d p-8 rounded-[40px] border border-white/5 group transition-all flex flex-col justify-between gap-6 relative overflow-hidden ${previewId === item.id ? 'border-cyan-500/40 ring-1 ring-cyan-500/20 translate-y-[-4px]' : 'hover:border-white/20'}`}
                  >
                    <div 
                      className="absolute bottom-0 right-0 h-1 bg-cyan-400 transition-all duration-100 ease-out origin-right" 
                      style={{ width: previewId === item.id ? `${previewProgress}%` : '0%' }}
                    />

                    <div className="flex justify-between items-start gap-4 flex-row-reverse z-10">
                      <div className="flex gap-3">
                        <button 
                          onClick={() => handleShare(item)}
                          className="h-14 w-14 rounded-xl bg-white/5 border border-white/10 text-white/30 flex items-center justify-center hover:bg-cyan-500/10 hover:text-cyan-400 hover:border-cyan-500/30 transition-all"
                          title="مشاركة"
                        >
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => onPlayHistory(item)}
                          className={`h-14 w-14 rounded-xl flex items-center justify-center shadow-xl transition-all ${previewId === item.id ? 'bg-cyan-400 text-black scale-110' : 'brand-bg text-white hover:scale-105'}`}
                          title="تشغيل كامل"
                        >
                          <svg className="w-7 h-7 translate-x-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </button>
                      </div>
                      
                      <div className="text-right overflow-hidden flex-1">
                        <div className="flex items-center justify-end gap-2 mb-1">
                          {previewId === item.id && (
                            <div className="flex gap-0.5 items-end h-3 animate-pulse">
                              <div className="w-0.5 h-1 bg-cyan-400 animate-[pulse_0.5s_infinite]"></div>
                              <div className="w-0.5 h-3 bg-cyan-400 animate-[pulse_0.7s_infinite]"></div>
                              <div className="w-0.5 h-2 bg-cyan-400 animate-[pulse_0.4s_infinite]"></div>
                            </div>
                          )}
                          <h5 className={`font-bold text-lg truncate transition-colors ${previewId === item.id ? 'text-cyan-400' : 'text-white'}`}>
                            {item.selection.dialect}
                          </h5>
                        </div>
                        <div className="flex gap-3 mt-1 flex-row-reverse flex-wrap">
                          <span className={`text-[10px] font-bold uppercase transition-colors ${previewId === item.id ? 'text-cyan-400/80' : 'text-cyan-400/60'}`}>{item.selection.type}</span>
                          <span className="text-[10px] text-white/20">•</span>
                          <span className={`text-[10px] font-bold uppercase transition-colors ${previewId === item.id ? 'text-indigo-400' : 'text-indigo-400/60'}`}>{item.selection.field}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`p-5 rounded-2xl transition-all duration-500 ${previewId === item.id ? 'bg-cyan-500/5' : 'bg-black/20'}`}>
                      <p className={`text-sm text-right leading-relaxed italic line-clamp-2 transition-all duration-500 ${previewId === item.id ? 'text-white/80 scale-[1.01]' : 'text-white/40'}`}>
                        "{item.text}"
                      </p>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-bold text-white/10 uppercase tracking-widest pt-2">
                      <div className={`flex items-center gap-2 transition-opacity duration-300 ${previewId === item.id ? 'opacity-100' : 'opacity-0'}`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></div>
                        <span className="text-cyan-400">معاينة مباشرة</span>
                      </div>
                      <div className="flex gap-4">
                        <span>{new Date(item.timestamp).toLocaleTimeString('ar-EG')}</span>
                        <span>{new Date(item.timestamp).toLocaleDateString('ar-EG')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="glass-3d p-10 rounded-[45px]">
          <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-[0.4em] mb-10 text-center">حالة المحرك والنظام (Engine Health)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { name: 'Gemini 3 Flash', status: 'Online', color: 'text-green-400' },
              { name: 'TTS 2.5 Engine', status: 'Optimal', color: 'text-cyan-400' },
              { name: 'Storage Cloud', status: 'Active', color: 'text-indigo-400' },
              { name: 'Audio Pipeline', status: 'Streaming', color: 'text-purple-400' }
            ].map((s, i) => (
              <div key={i} className="text-center space-y-2 border-x border-white/5">
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{s.name}</p>
                <div className={`text-xs font-black uppercase ${s.color} animate-pulse`}>{s.status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Cinematic Intro Component ---
const CinematicIntro: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [stage, setStage] = useState<'titles' | 'reveal' | 'fadeout'>('titles');
  const [particles] = useState(() => 
    [...Array(50)].map(() => ({
      id: Math.random(),
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 5 + 5,
      delay: Math.random() * 5
    }))
  );

  useEffect(() => {
    const timer1 = setTimeout(() => setStage('reveal'), 2500);
    const timer2 = setTimeout(() => setStage('fadeout'), 5500);
    const timer3 = setTimeout(onComplete, 6500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[100] bg-[#030712] overflow-hidden flex items-center justify-center transition-opacity duration-1500 ${stage === 'fadeout' ? 'opacity-0 blur-3xl' : 'opacity-100'}`}>
      <div className="absolute inset-0 perspective-[1000px]">
        {particles.map(p => (
          <div 
            key={p.id}
            className="particle animate-float-slow"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              background: 'radial-gradient(circle, var(--brand-secondary) 0%, transparent 80%)'
            }}
          />
        ))}
      </div>
      <div className="fog-layer"></div>
      <div className="absolute inset-0 flex justify-between pointer-events-none opacity-30">
        <div className="w-1/3 h-full bg-gradient-to-r from-indigo-500/10 via-transparent to-transparent -skew-x-12"></div>
        <div className="w-1/3 h-full bg-gradient-to-l from-cyan-500/10 via-transparent to-transparent skew-x-12"></div>
      </div>
      <div className="relative z-10 text-center scale-up">
        <div className={`${stage === 'titles' ? 'animate-cinematic' : 'opacity-0 transition-opacity duration-1000'}`}>
          <h2 className="android-tech-logo text-7xl md:text-9xl">SAVIO</h2>
          <div className="android-subtitle text-sm md:text-base">STUDIO VO</div>
        </div>
        <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-1200 ${stage === 'reveal' ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
          <div className="relative flex flex-col items-center">
            <h2 className="android-tech-logo text-6xl md:text-8xl">SAVIO</h2>
            <div className="android-subtitle text-xs md:text-sm">STUDIO VO</div>
            <div className="mt-16 flex gap-1.5 h-16 justify-center">
              {[...Array(25)].map((_, i) => (
                <div key={i} className="w-1 bg-cyan-400/50 rounded-full animate-pulse" style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 40}ms`, animationDuration: '0.8s' }}></div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-12 text-white/5 text-[10px] uppercase tracking-[1.2em]">Synchronizing Master Engine...</div>
    </div>
  );
};

const FloatingMic = () => (
  <div className="absolute top-20 -left-16 w-48 h-48 opacity-10 pointer-events-none animate-float">
    <svg viewBox="0 0 24 24" fill="currentColor" className="text-cyan-500 drop-shadow-[0_0_20px_rgba(34,211,238,0.4)]">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
    </svg>
  </div>
);

const FloatingHeadphones = () => (
  <div className="absolute bottom-20 -right-16 w-56 h-56 opacity-10 pointer-events-none animate-float-slow">
    <svg viewBox="0 0 24 24" fill="currentColor" className="text-indigo-500 drop-shadow-[0_0_25px_rgba(99,102,241,0.3)]">
      <path d="M12 2C6.48 2 2 6.48 2 12v7c0 1.1.9 2 2 2h3v-8H4v-1c0-4.41 3.59-8 8-8s8 3.59 8 8v1h-3v8h3c1.1 0 2-.9 2-2v-7c0-5.52-4.48-10-10-10z"/>
    </svg>
  </div>
);

const GenderIcon = ({ gender, className }: { gender: string, className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
  </svg>
);

const CategoryIcon = ({ type, className }: { type: string, className?: string }) => {
  switch (type) {
    case 'mic-documentary': return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    );
    case 'mic-ads': return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    );
    case 'mic-kids': return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
    case 'mic-podcast': return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
    case 'mic-book': return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.247 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    );
    case 'mic-youtube': return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    );
    default: return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    );
  }
};

const SelectionBlock: React.FC<{ title: string; options: string[]; current: string; set: (s: string) => void; }> = ({ title, options, current, set }) => (
  <div className="w-full space-y-6">
    <h3 className="text-xs font-bold text-cyan-500 uppercase tracking-[0.4em] text-center mb-8">{title}</h3>
    <div className="flex flex-wrap justify-center gap-4">
      {options.map(opt => (
        <button key={opt} onClick={() => set(opt)} className={`px-10 py-4 rounded-[22px] border transition-all duration-500 text-sm font-bold shadow-sm ${current === opt ? 'brand-bg text-white scale-105 shadow-indigo-500/30' : 'border-white/5 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/80'}`}>{opt}</button>
      ))}
    </div>
  </div>
);

const ControlGroup: React.FC<{ id: string; title: string; options: { label: string; desc: string }[]; current: string; onChange: (val: string) => void; }> = ({ id, title, options, current, onChange }) => (
  <div className="space-y-4 text-right group">
    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] group-hover:text-cyan-500/50 transition-colors">{title}</label>
    <div className="grid grid-cols-1 gap-3">
      {options.map(opt => (
        <button key={opt.label} onClick={() => onChange(opt.label)} className={`relative p-5 rounded-2xl border text-right transition-all duration-500 overflow-hidden ${current === opt.label ? 'border-indigo-500/50 bg-indigo-500/10 text-white shadow-lg' : 'border-white/5 bg-white/5 text-white/30 hover:bg-white/10 hover:border-white/10'}`}>
          {current === opt.label && <div className="absolute top-0 right-0 w-1.5 h-full bg-cyan-400"></div>}
          <div className="flex justify-between items-center mb-1 flex-row-reverse"><span className={`text-sm font-bold ${current === opt.label ? 'text-cyan-400' : 'text-white/60'}`}>{opt.label}</span></div>
          <p className="text-[10px] text-white/30 leading-relaxed line-clamp-2">{opt.desc}</p>
        </button>
      ))}
    </div>
  </div>
);

const App: React.FC = () => {
  const [showIntro, setShowIntro] = useState<boolean>(() => sessionStorage.getItem('savio_intro_played') !== 'true');
  const [showDashboard, setShowDashboard] = useState<boolean>(false);
  const [totalGens, setTotalGens] = useState<number>(() => parseInt(localStorage.getItem('savio_total_gens') || '0'));
  const [history, setHistory] = useState<GenerationHistory[]>(() => {
    const saved = localStorage.getItem('savio_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedDialectId, setSelectedDialectId] = useState<string>(DIALECTS[0].id);
  const [selectedType, setSelectedType] = useState<string>(VOICE_TYPES[0]);
  const [selectedGender, setSelectedGender] = useState<string>('ذكر');
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [voiceControls, setVoiceControls] = useState<VoiceControls>({ temp: 'دافئ', emotion: 'متوسط', speed: 'متوسطة', depth: 'متوسطة', pitch: 'متوسطة', drama: 'متوسط' });

  const [inputText, setInputText] = useState<string>('');
  const [processedText, setProcessedText] = useState<string>('');
  const [isPreprocessing, setIsPreprocessing] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentResult, setCurrentResult] = useState<GenerationHistory | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const selectedDialect = DIALECTS.find(d => d.id === selectedDialectId) || DIALECTS[0];
  const selectedFieldId = VOICE_FIELDS[0].id;
  const selectedField = VOICE_FIELDS.find(f => f.id === selectedFieldId) || VOICE_FIELDS[0];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const filteredProfiles = (selectedType === 'كبار السن' ? DIALECTS.flatMap(d => d.profiles) : selectedDialect.profiles).filter((p, index, self) => {
    if (self.findIndex(t => t.name === p.name) !== index) return false;
    return p.voiceType === selectedType && p.gender === (selectedGender === 'ذكر' ? 'male' : 'female');
  });

  const handlePreprocess = async () => {
    if (!inputText.trim()) { setError("يرجى كتابة النص أولاً."); return; }
    setError(null); setIsPreprocessing(true);
    try {
      const refined = await savioService.preprocessText(inputText, { dialect: selectedDialect.title, field: selectedField.title, personality: selectedVoiceName, controls: voiceControls });
      setProcessedText(refined);
    } catch (err) { setError("فشل تحسين النص ذكياً."); } finally { setIsPreprocessing(false); }
  };

  const handleGenerate = async () => {
    const textToUse = processedText || inputText;
    if (!textToUse.trim()) { setError("يرجى التأكد من وجود نص للمخطوطة."); return; }
    setIsGenerating(true); setError(null); setCurrentResult(null); setIsPlaying(false);
    try {
      const activeVoice = filteredProfiles.find(p => p.name === selectedVoiceName) || filteredProfiles[0];
      const performanceNote = `لهجة: ${selectedDialect.title}, نوع: ${selectedType}, بصمة: ${selectedVoiceName}, تحكم: ${JSON.stringify(voiceControls)}`;
      const baseVoice = getBaseVoiceForType(selectedType, activeVoice?.gender || (selectedGender === 'ذكر' ? 'male' : 'female'));
      const audioUrl = await savioService.generateVoiceOver(textToUse, baseVoice, performanceNote);
      
      const newTotal = totalGens + 1;
      setTotalGens(newTotal);
      localStorage.setItem('savio_total_gens', newTotal.toString());

      const result: GenerationHistory = {
        id: Math.random().toString(36).substr(2, 9),
        text: textToUse,
        selection: { dialect: selectedDialect.title, type: `${selectedType}`, field: selectedField.title, controls: { ...voiceControls } },
        timestamp: Date.now(),
        audioBlobUrl: audioUrl
      };

      const newHistory = [...history, result];
      setHistory(newHistory);
      localStorage.setItem('savio_history', JSON.stringify(newHistory));

      setCurrentResult(result);
      if (audioRef.current) { audioRef.current.src = audioUrl; audioRef.current.play(); setIsPlaying(true); }
    } catch (err: any) { setError("حدث خطأ أثناء معالجة الصوت."); } finally { setIsGenerating(false); }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setIsPlaying(!isPlaying);
  };

  const playFromHistory = (item: GenerationHistory) => {
    setCurrentResult(item);
    setShowDashboard(false);
    if (audioRef.current) {
      audioRef.current.src = item.audioBlobUrl;
      audioRef.current.play();
      setIsPlaying(true);
    }
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (showIntro) return <CinematicIntro onComplete={() => { sessionStorage.setItem('savio_intro_played', 'true'); setShowIntro(false); }} />;

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center py-24 px-6 font-arabic overflow-hidden relative animate-in fade-in duration-1000" dir="rtl">
      <div className="bg-light-blob top-[10%] left-[5%]"></div>
      <div className="bg-light-blob bottom-[10%] right-[5%]" style={{ animationDelay: '-6s', background: 'radial-gradient(circle, rgba(34, 211, 238, 0.05) 0%, transparent 70%)' }}></div>
      <FloatingMic />
      <FloatingHeadphones />

      <div className="absolute top-8 left-8 z-50">
        <button 
          onClick={() => setShowDashboard(true)}
          className="flex items-center gap-4 px-6 py-3 rounded-2xl glass-3d border border-cyan-500/20 text-cyan-400 font-bold text-xs uppercase tracking-widest hover:bg-cyan-500/10 transition-all shadow-2xl group"
        >
          <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          لوحة الإحصائيات والأرشيف
        </button>
      </div>

      {showDashboard && (
        <StudioDashboard 
          totalGens={totalGens} 
          history={history}
          onPlayHistory={playFromHistory}
          onClose={() => setShowDashboard(false)} 
        />
      )}

      <header className="mb-24 text-center relative z-10 group">
        <div className="flex items-center justify-center gap-6 mb-8">
          <div className="h-20 w-20 brand-bg rounded-[26px] flex items-center justify-center shadow-2xl rotate-6 group-hover:rotate-0 transition-all duration-700">
            <svg viewBox="0 0 24 24" className="h-10 w-10 text-white" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-6xl md:text-7xl font-bold brand-text tracking-tight leading-tight">سافيو استوديو</h1>
            <p className="text-white/40 text-xs uppercase tracking-[0.7em] font-semibold mt-3">Elite Arabic Voice Lab</p>
          </div>
        </div>
      </header>

      <div className="w-full max-w-5xl space-y-24 relative z-10">
        <section className="glass-3d p-16 rounded-[50px] animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-[0.4em] text-center mb-16">١. محرك اختيار اللهجات</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {DIALECTS.map((dialect) => (
              <button key={dialect.id} onClick={() => setSelectedDialectId(dialect.id)} className={`relative text-right p-8 rounded-[40px] transition-all duration-700 border-2 group ${selectedDialectId === dialect.id ? 'border-cyan-400/50 bg-cyan-400/5 shadow-2xl scale-[1.03]' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}>
                <div className="flex items-center justify-between flex-row-reverse mb-6">
                  <h4 className={`text-2xl font-bold ${selectedDialectId === dialect.id ? 'text-cyan-400' : 'text-white/80'}`}>{dialect.title}</h4>
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center transition-all ${selectedDialectId === dialect.id ? 'brand-bg text-white' : 'bg-white/5 text-white/10'}`}><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></div>
                </div>
                <p className={`text-xs leading-relaxed ${selectedDialectId === dialect.id ? 'text-white/80' : 'text-white/30'}`}>{dialect.description}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="glass-3d p-16 rounded-[50px] space-y-20 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
          <SelectionBlock title="٢. الهوية العمرية والنمط" options={VOICE_TYPES} current={selectedType} set={setSelectedType} />
          <div className="flex flex-col items-center gap-10">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-[0.4em]">بصمة الصوت</h3>
            <div className="flex gap-6">
              {['ذكر', 'أنثى'].map(gender => (
                <button key={gender} onClick={() => setSelectedGender(gender)} className={`px-16 py-5 rounded-full border-2 transition-all duration-500 text-sm font-bold shadow-2xl ${selectedGender === gender ? 'border-indigo-500 bg-indigo-500/20 text-white scale-110' : 'border-white/5 bg-white/5 text-white/30 hover:bg-white/10'}`}>{gender}</button>
              ))}
            </div>
          </div>
          <div className="pt-16 border-t border-white/5">
            <h4 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.6em] text-center mb-12">النخب الصوتية المختارة</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {filteredProfiles.map((profile, idx) => (
                <button key={idx} onClick={() => setSelectedVoiceName(profile.name)} className={`relative overflow-hidden text-right p-8 rounded-[45px] border-2 transition-all duration-700 group h-full flex flex-col items-center justify-center gap-6 text-center ${selectedVoiceName === profile.name ? `border-cyan-400/40 bg-gradient-to-br from-indigo-900/40 to-cyan-900/40 ring-12 ring-cyan-400/5 shadow-2xl` : 'border-white/5 bg-white/5 hover:border-white/10 hover:scale-105'}`}>
                  <div className="absolute top-5 left-5"><div className={`p-2 rounded-xl border ${selectedVoiceName === profile.name ? 'bg-cyan-400/20 border-cyan-400/30 text-cyan-400' : 'bg-white/5 border-white/5 text-white/10'}`}><GenderIcon gender={profile.gender} className="w-4 h-4" /></div></div>
                  <div className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all duration-700 shadow-inner ${selectedVoiceName === profile.name ? 'bg-cyan-400/30 rotate-3 scale-110' : 'bg-white/5'}`}><CategoryIcon type={CATEGORY_STYLES[profile.categoryKey as keyof typeof CATEGORY_STYLES]?.icon} className={`w-8 h-8 ${selectedVoiceName === profile.name ? 'text-white' : 'text-white/20'}`} /></div>
                  <div className="space-y-2 relative z-10"><h5 className={`text-xl font-bold ${selectedVoiceName === profile.name ? 'text-white' : 'text-white/70'}`}>{profile.name}</h5><span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${selectedVoiceName === profile.name ? 'bg-black/40 text-cyan-400' : 'bg-white/5 text-white/20'}`}>{profile.category}</span></div>
                  <p className={`text-[10px] leading-relaxed line-clamp-2 px-3 ${selectedVoiceName === profile.name ? 'text-white/80' : 'text-white/30'}`}>{profile.description}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="glass-3d p-16 rounded-[50px] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-[0.4em] text-center mb-16">٣. غرفة المعالجة والهندسة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {Object.entries(STUDIO_CONTROLS).map(([key, control]) => (
              <ControlGroup key={key} id={key} title={control.title} options={control.options} current={(voiceControls as any)[key]} onChange={(val) => setVoiceControls(v => ({ ...v, [key]: val }))} />
            ))}
          </div>
        </section>

        <section className="glass-3d p-16 rounded-[50px] space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-[0.4em] text-center">٤. صياغة المخطوطة الإبداعية</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14">
            <div className="space-y-6">
              <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest text-right block pr-5">مسودة النص الأساسي</label>
              <textarea className="w-full h-80 bg-black/50 border border-white/5 rounded-[45px] p-10 text-xl text-white placeholder-white/5 focus:outline-none focus:border-cyan-500/20 transition-all font-arabic leading-relaxed resize-none text-right shadow-2xl" placeholder="اكتب فكرتك هنا..." value={inputText} onChange={(e) => setInputText(e.target.value)} />
              <button onClick={handlePreprocess} disabled={isPreprocessing || !inputText.trim()} className="w-full py-6 rounded-[28px] border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-sm font-bold hover:bg-cyan-500 hover:text-black transition-all disabled:opacity-20 flex items-center justify-center gap-5 shadow-xl group">
                {isPreprocessing ? <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin"></div> : null}
                <span className="tracking-widest">تحسين المخطوطة ذكياً (AI Refine)</span>
              </button>
            </div>
            <div className="space-y-6">
              <label className="text-[10px] font-bold text-cyan-400/50 uppercase tracking-widest text-right block pr-5">المخطوطة النهائية للإنتاج</label>
              <textarea className="w-full h-80 bg-indigo-500/5 border border-indigo-500/10 rounded-[45px] p-10 text-xl text-indigo-50 placeholder-white/5 focus:outline-none focus:border-indigo-500/30 transition-all font-arabic leading-relaxed resize-none text-right shadow-2xl" placeholder="سيتم إعداد النص هنا للإخراج النهائي..." value={processedText} onChange={(e) => setProcessedText(e.target.value)} />
              <p className="text-[9px] text-white/10 text-center font-bold tracking-[0.4em] uppercase">High Precision Master Mode</p>
            </div>
          </div>
        </section>

        <section className="flex justify-center pb-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
          <button onClick={handleGenerate} disabled={isGenerating || (!processedText.trim() && !inputText.trim())} className={`w-full max-w-3xl py-12 rounded-full font-bold text-2xl flex items-center justify-center gap-8 transition-all relative overflow-hidden shadow-[0_30px_60px_-15px_rgba(99,102,241,0.5)] group ${isGenerating || (!processedText.trim() && !inputText.trim()) ? 'bg-white/5 text-white/10 cursor-not-allowed grayscale' : 'brand-bg text-white hover:scale-105'}`}>
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity"></div>
            {isGenerating ? (<><div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div><span className="animate-pulse tracking-wide">جاري التسجيل والماسترينج...</span></>) : (<><svg className="h-12 w-12" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" /></svg>توليد الأداء الصوتي</>)}
          </button>
        </section>

        {(currentResult || isGenerating || error) && (
          <section className="glass-3d p-16 rounded-[65px] border-cyan-400/20 space-y-14 animate-in zoom-in duration-800 shadow-3xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-40"></div>
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-[0.5em] text-center">الإخراج النهائي (Master Suite)</h3>
            {error && <div className="p-10 rounded-[35px] bg-red-500/5 border border-red-500/10 text-red-400 text-sm text-center font-bold">{error}</div>}
            {isGenerating && (
              <div className="flex flex-col items-center gap-12 py-20">
                <div className="flex gap-5 items-end h-28">
                  {[...Array(15)].map((_, i) => (
                    <div key={i} className="w-3.5 bg-cyan-400/40 rounded-full animate-pulse" style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 120}ms` }}></div>
                  ))}
                </div>
                <p className="text-xs text-white/30 animate-pulse tracking-[0.4em] uppercase">Advanced Audio Signal Processing...</p>
              </div>
            )}
            {currentResult && (
              <div className="w-full flex flex-col items-center gap-16">
                <div className="flex items-center justify-center gap-2 h-24 w-full opacity-70">
                  {[...Array(100)].map((_, i) => (
                    <div key={i} className={`w-1 rounded-full transition-all duration-300 ${isPlaying ? 'bg-cyan-400/70' : 'bg-white/10'}`} style={{ height: isPlaying ? `${Math.max(20, Math.random() * 95)}%` : '6px', transitionDelay: `${i * 6}ms` }}></div>
                  ))}
                </div>
                <div className="w-full max-w-4xl p-14 rounded-[55px] bg-white/5 border border-white/10 space-y-12 relative shadow-inner backdrop-blur-3xl">
                  <div className="absolute -top-7 right-14 px-10 py-2.5 brand-bg text-white rounded-full text-[10px] font-bold uppercase tracking-[0.4em] shadow-2xl z-20">Mastering: Finished</div>
                  <div className="flex items-center justify-between flex-row-reverse border-b border-white/5 pb-12">
                    <div className="text-right">
                      <h4 className="font-bold text-4xl text-white mb-3">{currentResult.selection.dialect}</h4>
                      <p className="text-[11px] text-cyan-400 font-bold tracking-[0.2em] uppercase">{currentResult.selection.type} — {currentResult.selection.field}</p>
                    </div>
                    <button onClick={() => { const a = document.createElement('a'); a.href = currentResult.audioBlobUrl; a.download = `SAVIO_VO_${currentResult.id}.wav`; a.click(); }} className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-cyan-400/50 text-white/40 hover:text-cyan-400 transition-all shadow-xl"><svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></button>
                  </div>
                  <div className="flex flex-col md:flex-row items-center gap-14 flex-row-reverse">
                    <div className="flex items-center gap-8 flex-row-reverse">
                      <button onClick={togglePlay} className="h-28 w-28 rounded-full brand-bg text-white flex items-center justify-center hover:scale-115 active:scale-95 transition-all shadow-[0_25px_50px_rgba(99,102,241,0.4)] group relative">
                        <div className="absolute inset-0 rounded-full bg-cyan-400 animate-ping opacity-10 group-hover:opacity-40"></div>
                        {isPlaying ? <svg className="h-12 w-12" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="h-12 w-12 translate-x-1.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                      </button>
                    </div>
                    <div className="flex-1 w-full space-y-6">
                      <div className="flex justify-between items-center flex-row-reverse text-[10px] font-bold text-white/30 tracking-[0.2em] uppercase"><span>{formatTime(duration)}</span><span>{formatTime(currentTime)}</span></div>
                      <div className="relative group h-10 flex items-center"><input type="range" min="0" max={duration || 0} step="0.01" value={currentTime} onChange={(e) => { if (audioRef.current) { const val = parseFloat(e.target.value); audioRef.current.currentTime = val; setCurrentTime(val); } }} className="absolute inset-0 w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer outline-none transition-all" style={{ background: `linear-gradient(to left, #22d3ee ${(currentTime / duration) * 100}%, rgba(255,255,255,0.05) ${(currentTime / duration) * 100}%)`, direction: 'rtl' }} /></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      <footer className="mt-48 text-center relative z-10">
        <div className="h-px w-56 bg-gradient-to-r from-transparent via-white/10 to-transparent mx-auto mb-12"></div>
        <p className="text-[11px] text-white/30 uppercase tracking-[1em] font-medium">&copy; ٢٠٢٤ سافيو استوديو</p>
        <p className="text-[9px] text-white/10 mt-3 tracking-[0.4em] uppercase">Powered by SAVIO Engine & Gemini AI</p>
      </footer>
      <audio ref={audioRef} className="hidden" />
    </div>
  );
};

export default App;
