
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { DIALECTS, VOICE_TYPES, STUDIO_CONTROLS, getBaseVoiceForType, VoiceProfile } from './constants';
import { GenerationRecord, VoiceControls, GlobalStats } from './types';
import { majdService } from './services/geminiService';
import { api } from './services/apiService';

const WAITING_MESSAGES = [
  "ثانية واحدة.. Majd بيظبط الأوتوتيون.. 🎤",
  "حقك عليا يا نجم، مهندس الصوت لسه بيسخن الميكروفون.. 🔥",
  "بننقي أحسن نبرة تليق بمقامك العالي.. ✨",
  "خلاص هانت، بنمسح التراب من على السماعات.. 🧹",
  "الذكاء الاصطناعي بيشرب قهوته وهيطلعلك الصوت دلوقتي.. ☕",
  "مجد بيراجع النص كلمة كلمة عشان ميبقاش فيه غلطة.. 📝"
];

const RatingStars: React.FC<{ rating: number, onRate?: (r: number) => void, interactive?: boolean }> = ({ rating, onRate, interactive }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map(star => (
      <button key={star} disabled={!interactive} onClick={() => onRate?.(star)} className={`text-xl transition-all ${star <= rating ? 'text-yellow-400 scale-125' : 'text-white/10 hover:text-white/40'}`}>★</button>
    ))}
  </div>
);

const StatCard: React.FC<{ label: string, value: string | number, icon?: string }> = ({ label, value, icon }) => (
  <div className="admin-card p-6 rounded-[32px] space-y-2 relative overflow-hidden group border border-white/5">
    <div className="flex justify-between items-start relative z-10">
      <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">{label}</span>
      <span className="text-cyan-400 opacity-50">{icon}</span>
    </div>
    <div className="text-4xl font-black text-white relative z-10">{value}</div>
    <div className="absolute -right-2 -bottom-2 text-white/5 text-7xl font-black">{icon}</div>
  </div>
);

const SelectionBlock: React.FC<{ title: string; options: { label: string; icon?: any }[]; current: string; set: (s: string) => void; }> = ({ title, options, current, set }) => (
  <div className="w-full space-y-4">
    <h3 className="text-xs font-bold text-cyan-500 uppercase tracking-[0.4em] text-center mb-4">{title}</h3>
    <div className="flex flex-wrap justify-center gap-3">
      {options.map(opt => (
        <button key={opt.label} onClick={() => set(opt.label)} className={`px-6 py-4 rounded-2xl border transition-all text-sm font-bold flex flex-col items-center gap-2 min-w-[100px] ${current === opt.label ? 'brand-bg text-white shadow-lg scale-105' : 'border-white/5 bg-white/5 text-white/40 hover:bg-white/10'}`}>
          {opt.icon && <div className="text-2xl mb-1">{opt.icon}</div>}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  </div>
);

const ControlGroup: React.FC<{ title: string; options: any[]; current: string; onChange: (val: string) => void; }> = ({ title, options, current, onChange }) => (
  <div className="space-y-4 text-right">
    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">{title}</label>
    <div className="grid grid-cols-1 gap-2">
      {options.map(opt => (
        <button key={opt.label} onClick={() => onChange(opt.label)} className={`p-4 rounded-xl border text-right transition-all ${current === opt.label ? 'border-indigo-500/50 bg-indigo-500/10 text-white' : 'border-white/5 bg-white/5 text-white/30 hover:bg-white/10'}`}>
          <div className="text-xs font-bold mb-1">{opt.label}</div>
          <p className="text-[9px] opacity-30">{opt.desc}</p>
        </button>
      ))}
    </div>
  </div>
);

const App: React.FC = () => {
  const [showIntro, setShowIntro] = useState<boolean>(() => sessionStorage.getItem('majd_intro') !== 'true');
  const [isAdminView, setIsAdminView] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [globalRecords, setGlobalRecords] = useState<GenerationRecord[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [publicFeedbacks, setPublicFeedbacks] = useState<any[]>([]);
  const [history, setHistory] = useState<GenerationRecord[]>([]);
  
  const [userId] = useState(() => 'MAJD_USER_' + Math.random().toString(36).substr(2, 6));

  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const [selectedDialectId, setSelectedDialectId] = useState<string>(DIALECTS[0].id);
  const [selectedAge, setSelectedAge] = useState<string>(VOICE_TYPES[0]);
  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>('male');
  const [selectedProfile, setSelectedProfile] = useState<VoiceProfile | null>(null);
  const [voiceControls, setVoiceControls] = useState<VoiceControls>({ temp: 'دافئ', emotion: 'متوسط', speed: 'متوسطة', depth: 'متوسطة', pitch: 'متوسطة', drama: 'متوسط' });
  
  const [inputText, setInputText] = useState('');
  const [refinedText, setRefinedText] = useState('');
  const [isPreprocessing, setIsPreprocessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentResult, setCurrentResult] = useState<GenerationRecord | null>(null);

  const availableProfiles = useMemo(() => {
    const dialect = DIALECTS.find(d => d.id === selectedDialectId);
    if (!dialect) return [];
    return dialect.profiles.filter(p => p.voiceType === selectedAge && p.gender === selectedGender);
  }, [selectedDialectId, selectedAge, selectedGender]);

  useEffect(() => {
    if (availableProfiles.length > 0) setSelectedProfile(availableProfiles[0]);
  }, [availableProfiles]);

  useEffect(() => {
    if (showIntro) { setTimeout(() => { sessionStorage.setItem('majd_intro', 'true'); setShowIntro(false); }, 2500); }
    const init = async () => {
      try {
        await api.logSession(userId);
        const [records, fbs] = await Promise.all([api.getUserRecords(userId), api.getFeedbacks()]);
        setHistory(records || []);
        setPublicFeedbacks(fbs || []);
      } catch (e) {}
    };
    init();
  }, [userId]);

  const toggleAudio = (id: string, url: string) => {
    if (playingId === id) { audioRef.current?.pause(); setPlayingId(null); }
    else {
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(url);
      audioRef.current.play();
      setPlayingId(id);
      audioRef.current.onended = () => setPlayingId(null);
    }
  };

  const handleRefineText = async () => {
    if (!inputText.trim()) return;
    setIsPreprocessing(true);
    try {
      const dialect = DIALECTS.find(d => d.id === selectedDialectId)?.title || 'عربية فصحى';
      const result = await majdService.preprocessText(inputText, {
        dialect: dialect,
        field: selectedProfile?.category || 'عام',
        personality: selectedProfile?.name || 'معلق صوتي'
      });
      setRefinedText(result);
    } catch (e) {
      alert("فشل تحسين النص.");
    } finally {
      setIsPreprocessing(false);
    }
  };

  const handleGenerate = async () => {
    const textToUse = refinedText || inputText;
    if (!textToUse.trim() || !selectedProfile) return alert("دخل النص يا نجم!");
    setIsGenerating(true);
    try {
      const baseVoice = getBaseVoiceForType(selectedProfile.voiceType, selectedProfile.gender);
      const { dataUrl, duration } = await majdService.generateVoiceOver(textToUse, baseVoice, `بصوت ${selectedProfile.name}`);
      const record = await api.saveRecord({
        text: textToUse, user_id: userId,
        selection: { dialect: DIALECTS.find(d => d.id === selectedDialectId)?.title || '', type: selectedAge, field: selectedProfile.category, controls: voiceControls },
        audio_data: dataUrl, duration
      });
      setCurrentResult(record);
      setHistory(prev => [record, ...prev]);
    } catch (e) { alert("خطأ سحابي: تأكد من وجود الجداول في Supabase Storage."); }
    finally { setIsGenerating(false); }
  };

  const handleSubmitFeedback = async () => {
    if (feedbackRating === 0) return alert("فين النجوم يا وحش؟");
    setIsSubmittingFeedback(true);
    const success = await api.submitFeedback(userId, feedbackRating, feedbackComment);
    if (success) {
      setFeedbackSent(true);
      const updated = await api.getFeedbacks();
      setPublicFeedbacks(updated || []);
    } else alert("فشل الإرسال للسيرفر.");
    setIsSubmittingFeedback(false);
  };

  if (showIntro) return (
    <div className="fixed inset-0 z-[500] bg-[#020617] flex items-center justify-center font-montserrat">
      <div className="text-center animate-pulse"><h1 className="tech-logo text-7xl md:text-9xl">Majd</h1><p className="text-white/20 text-[10px] tracking-[1.5em] mt-8 uppercase font-bold">NEXT-GEN STUDIO VO</p></div>
    </div>
  );

  if (isAdminView && stats) return (
    <div className="min-h-screen bg-[#020617] text-white p-12 font-arabic">
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-4xl font-black brand-text">Majd Intelligence</h1>
        <button onClick={() => setIsAdminView(false)} className="px-6 py-3 rounded-2xl brand-bg font-bold">العودة للاستوديو</button>
      </header>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <StatCard label="الزيارات" value={stats.total_visits} icon="👁️" />
        <StatCard label="المستخدمين" value={stats.total_users} icon="👥" />
        <StatCard label="المقاطع" value={stats.total_records} icon="⚡" />
        <StatCard label="التقييم" value={stats.avg_rating} icon="⭐" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="admin-card p-8 rounded-[40px]">
          <h3 className="text-lg font-bold mb-6">أحدث التقييمات السحابية</h3>
          <div className="space-y-4">{feedbacks.map((f, i) => (
            <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex justify-between">
              <div><RatingStars rating={f.rating} /><p className="text-sm italic mt-2">"{f.comment || 'بدون تعليق'}"</p></div>
              <span className="text-[10px] opacity-30">{new Date(f.timestamp).toLocaleDateString()}</span>
            </div>
          ))}</div>
        </div>
        <div className="admin-card p-8 rounded-[40px]">
           <h3 className="text-lg font-bold mb-6">سجل العمليات</h3>
           <div className="space-y-4">{globalRecords.slice(0, 10).map((r, i) => (
             <div key={i} className="p-4 rounded-2xl bg-white/5 flex justify-between items-center">
               <div className="text-xs truncate max-w-[200px]">"{r.text}"</div>
               <button onClick={() => toggleAudio(r.id, r.audio_data)} className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">▶</button>
             </div>
           ))}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center py-20 px-6 font-arabic relative">
      {(isGenerating || isPreprocessing) && (
        <div className="fixed inset-0 z-[1000] bg-black/90 flex flex-col items-center justify-center text-center">
          <h2 className="tech-logo text-7xl animate-pulse">Majd</h2>
          <p className="text-xl font-bold mt-12">
            {isPreprocessing ? "يا برنس بنظبطلك النص بلمسة سحرية.. 🪄" : WAITING_MESSAGES[Math.floor(Math.random()*WAITING_MESSAGES.length)]}
          </p>
        </div>
      )}
      
      <div className="fixed top-8 left-8 z-50">
        <button onClick={() => setShowLogin(true)} className="px-6 py-3 rounded-2xl glass-3d border border-cyan-500/20 text-cyan-400 font-bold text-[10px] tracking-widest hover:bg-cyan-500 hover:text-white transition-all uppercase">Analytics</button>
      </div>

      {showLogin && (
        <div className="fixed inset-0 z-[600] bg-black/95 flex items-center justify-center p-6">
          <form onSubmit={(e)=>{e.preventDefault(); if(password==='41414141'){ api.getGlobalStats().then(s=>setStats(s)); api.getAllRecords().then(r=>setGlobalRecords(r)); api.getFeedbacks().then(f=>setFeedbacks(f)); setIsAdminView(true); setShowLogin(false); } else alert("خطأ");}} className="glass-3d w-full max-w-md p-12 rounded-[50px] space-y-8 text-center">
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="رمز المرور السحابي" className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 text-center text-2xl" />
            <button className="w-full brand-bg py-5 rounded-2xl font-bold">دخول المدير</button>
            <button type="button" onClick={()=>setShowLogin(false)} className="text-white/20 text-xs">إلغاء</button>
          </form>
        </div>
      )}

      <header className="mb-24 text-center">
        <h1 className="tech-logo text-7xl md:text-9xl mb-4">Majd</h1>
        <p className="text-white/30 text-[10px] uppercase tracking-[1em] font-bold">Professional Cloud VO Studio</p>
      </header>

      <main className="w-full max-w-6xl space-y-16">
        <section className="glass-3d p-12 rounded-[50px] space-y-12">
          <SelectionBlock title="اختيار اللهجة" options={DIALECTS.map(d => ({ label: d.title, icon: d.flag }))} current={DIALECTS.find(d => d.id === selectedDialectId)?.title || ''} set={(t) => setSelectedDialectId(DIALECTS.find(d => d.title === t)?.id || '')} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-white/5 pt-12">
            <SelectionBlock title="نوع الصوت" options={VOICE_TYPES.map(t => ({ label: t }))} current={selectedAge} set={setSelectedAge} />
            <SelectionBlock title="الجنس" options={[{ label: 'ذكر' }, { label: 'أنثى' }]} current={selectedGender === 'male' ? 'ذكر' : 'أنثى'} set={(g) => setSelectedGender(g === 'ذكر' ? 'male' : 'female')} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-12 border-t border-white/5">
            {availableProfiles.map(profile => (
              <button key={profile.name} onClick={() => setSelectedProfile(profile)} className={`p-4 rounded-2xl border transition-all text-center space-y-2 ${selectedProfile?.name === profile.name ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/5 bg-white/5'}`}>
                <div className="text-xs font-bold">{profile.name}</div>
                <div className="text-[9px] opacity-30">{profile.category}</div>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 border-t border-white/5">
            {Object.entries(STUDIO_CONTROLS).map(([k, c]) => (
              <ControlGroup key={k} title={c.title} options={c.options} current={(voiceControls as any)[k]} onChange={v => setVoiceControls(prev => ({...prev, [k]: v}))} />
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
            <div className="relative glass-3d rounded-[40px] p-8">
              <label className="text-[10px] text-white/30 absolute top-4 right-8 font-bold uppercase tracking-widest">النص الأصلي</label>
              <textarea className="w-full h-48 bg-transparent text-lg text-white/60 text-right outline-none resize-none pt-4" placeholder="اكتب النص هنا..." value={inputText} onChange={e => setInputText(e.target.value)} />
            </div>
            
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden lg:block">
              <button onClick={handleRefineText} disabled={!inputText.trim() || isPreprocessing} className="h-16 w-16 rounded-full brand-bg text-white shadow-xl hover:scale-110 transition-all flex items-center justify-center group">
                <span className="text-2xl group-hover:rotate-12 transition-transform">🪄</span>
              </button>
            </div>

            <div className={`relative glass-3d rounded-[40px] p-8 border-cyan-500/20 ${refinedText ? 'opacity-100' : 'opacity-20'}`}>
              <label className="text-[10px] text-cyan-400 absolute top-4 right-8 font-bold uppercase tracking-widest">النص المحسن بالذكاء الاصطناعي</label>
              <textarea className="w-full h-48 bg-transparent text-lg text-white text-right outline-none resize-none pt-4" placeholder="النص المحسن سيظهر هنا..." value={refinedText} onChange={e => setRefinedText(e.target.value)} />
            </div>
          </div>
          
          <div className="lg:hidden flex justify-center -mt-3">
             <button onClick={handleRefineText} disabled={!inputText.trim() || isPreprocessing} className="px-8 py-3 rounded-full brand-bg text-white font-bold text-sm shadow-lg flex items-center gap-2">
               <span>🪄</span> تحسين النص
             </button>
          </div>

          <button onClick={handleGenerate} disabled={isGenerating} className="w-full py-8 rounded-[35px] brand-bg text-white text-xl font-black shadow-2xl hover:scale-[1.01] transition-all mt-8">توليد ورفع الصوت </button>
        </section>

        {currentResult && (
          <div className="glass-3d p-10 rounded-[40px] border-cyan-500/30 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-8">
              <button onClick={() => toggleAudio(currentResult.id, currentResult.audio_data)} className={`h-24 w-24 rounded-full brand-bg flex items-center justify-center text-white shadow-xl ${playingId === currentResult.id ? 'bg-rose-600' : ''}`}>
                <span className="text-3xl">{playingId === currentResult.id ? "⏸" : "▶"}</span>
              </button>
              <div className="text-right">
                <h4 className="text-2xl font-black">جاهز يا بطل! 🎙️</h4>
                <div className="mt-4"><RatingStars rating={currentResult.rating} interactive onRate={(r) => { api.updateRating(currentResult.id, r); setCurrentResult({...currentResult, rating: r}); }} /></div>
              </div>
            </div>
            <a href={currentResult.audio_data} download className="px-12 py-6 rounded-[28px] brand-bg text-white font-black hover:brightness-110 shadow-2xl">تحميل المقطع</a>
          </div>
        )}

        <section className="glass-3d p-12 rounded-[50px] border border-cyan-500/10">
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="text-center space-y-4"><h3 className="text-3xl font-black brand-text">رأيك يهمنا  ! ⭐</h3></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-6">
                {!feedbackSent ? (
                  <div className="space-y-6 glass-3d p-8 rounded-3xl">
                    <div className="flex justify-center"><RatingStars rating={feedbackRating} interactive onRate={setFeedbackRating} /></div>
                    <textarea className="w-full p-6 rounded-3xl bg-white/5 border border-white/10 outline-none text-right text-sm h-32" placeholder="رائيك بالمنصة؟" value={feedbackComment} onChange={(e) => setFeedbackComment(e.target.value)} />
                    <button onClick={handleSubmitFeedback} disabled={isSubmittingFeedback} className="w-full py-4 rounded-2xl brand-bg text-white font-bold">{isSubmittingFeedback ? "جاري الإرسال ..." : "إرسال التقييم"}</button>
                  </div>
                ) : <div className="py-10 text-center"><h4 className="text-2xl font-bold text-cyan-400">وصل يا بطل! ❤️</h4></div>}
              </div>
              <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {publicFeedbacks.map((f, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                    <RatingStars rating={f.rating} />
                    <p className="text-xs text-white/60 italic">"{f.comment || 'تقييم ممتاز'}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="glass-3d p-12 rounded-[50px] space-y-8">
          <h3 className="text-xl font-bold">أحدث أعمالك 📂</h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
            {history.map((rec) => (
              <div key={rec.id} className="p-6 rounded-3xl bg-white/5 flex items-center justify-between">
                <button onClick={() => toggleAudio(rec.id, rec.audio_data)} className="h-14 w-14 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">{playingId === rec.id ? "■" : "▶"}</button>
                <div className="text-right flex-1 truncate ml-4">
                  <p className="text-sm truncate">"{rec.text}"</p>
                  <span className="text-[10px] opacity-20">{new Date(rec.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="mt-40 text-center opacity-10 text-[10px] uppercase font-black tracking-[1em] pb-10">Majd STUDIO VO • CLOUD DRIVEN</footer>
    </div>
  );
};

export default App;
