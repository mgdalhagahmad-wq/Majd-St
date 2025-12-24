
import React from 'react';

export interface VoiceProfile {
  name: string;
  gender: 'male' | 'female';
  voiceType: string;
  category: string;
  categoryKey: string;
  description: string;
}

export interface DialectInfo {
  id: string;
  title: string;
  flag: React.ReactNode;
  description: string;
  profiles: VoiceProfile[];
}

export const StudioIcons = {
  Male: () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 14l-6 6M10 14l-2-6M10 14l6-2M15 3h6v6M21 3l-6.5 6.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="15.5" cy="8.5" r="5.5" stroke="currentColor"/>
    </svg>
  ),
  Female: () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="9" r="6"/>
      <path d="M12 15v7M9 19h6" strokeLinecap="round"/>
    </svg>
  ),
  Adult: () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M19 8a4 4 0 0 0-3-3.87" strokeLinecap="round"/>
    </svg>
  ),
  Elderly: () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 21l3-14 3 14M10 7l4 4M10 12h4M17 21l-2-5" strokeLinecap="round"/>
    </svg>
  ),
  Cartoon: () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"/>
      <path d="M9 10h.01M15 10h.01M9 15c1.5 1.5 4.5 1.5 6 0" strokeLinecap="round"/>
    </svg>
  ),
  Doc: () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 7l-7 5 7 5V7z"/>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  ),
  Ads: () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
    </svg>
  ),
  Podcast: () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 1v11M8 5v4M16 5v4M4 11a8 8 0 0 0 16 0" strokeLinecap="round"/>
    </svg>
  ),
  Novels: () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  Drama: () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
};

const Flags = {
  Egypt: () => (
    <svg viewBox="0 0 30 20" className="w-8 h-5 rounded-sm shadow-sm inline-block"><rect width="30" height="6.66" fill="#CE1126"/><rect width="30" height="6.66" y="6.66" fill="#FFFFFF"/><rect width="30" height="6.66" y="13.32" fill="#000000"/><circle cx="15" cy="10" r="1.5" fill="#C09304"/></svg>
  ),
  Saudi: () => (
    <svg viewBox="0 0 30 20" className="w-8 h-5 rounded-sm shadow-sm inline-block"><rect width="30" height="20" fill="#165235"/><path d="M10 10l5-2 5 2M10 14h10" stroke="#FFF" strokeWidth="1" fill="none"/></svg>
  ),
  Syria: () => (
    <svg viewBox="0 0 30 20" className="w-8 h-5 rounded-sm shadow-sm inline-block"><rect width="30" height="6.66" fill="#007A3D"/><rect width="30" height="6.66" y="6.66" fill="#FFFFFF"/><rect width="30" height="6.66" y="13.32" fill="#000000"/><g fill="#CE1126"><path d="M7.5 8.5l.58 1.8h1.92l-1.55 1.12.59 1.8-1.54-1.12-1.54 1.12.59-1.8-1.55-1.12h1.92z"/><path d="M15 8.5l.58 1.8h1.92l-1.55 1.12.59 1.8-1.54-1.12-1.54 1.12.59-1.8-1.55-1.12h1.92z"/><path d="M22.5 8.5l.58 1.8h1.92l-1.55 1.12.59 1.8-1.54-1.12-1.54 1.12.59-1.8-1.55-1.12h1.92z"/></g></svg>
  ),
  Iraq: () => (
    <svg viewBox="0 0 30 20" className="w-8 h-5 rounded-sm shadow-sm inline-block"><rect width="30" height="6.66" fill="#CE1126"/><rect width="30" height="6.66" y="6.66" fill="#FFFFFF"/><rect width="30" height="6.66" y="13.32" fill="#000000"/><text x="15" y="12" fontSize="4" textAnchor="middle" fill="#007A3D" fontWeight="bold">الله أكبر</text></svg>
  ),
  Algeria: () => (
    <svg viewBox="0 0 30 20" className="w-8 h-5 rounded-sm shadow-sm inline-block"><rect width="15" height="20" fill="#006233"/><rect x="15" width="15" height="20" fill="#FFF"/><circle cx="15" cy="10" r="4" fill="#D21034"/><circle cx="16.5" cy="10" r="3.5" fill="#FFF"/></svg>
  ),
  Morocco: () => (
    <svg viewBox="0 0 30 20" className="w-8 h-5 rounded-sm shadow-sm inline-block"><rect width="30" height="20" fill="#C1272D"/><path d="M15 6l1.5 4.5h4.5l-3.5 3 1.5 4.5-4-3-4 3 1.5-4.5-3.5-3h4.5z" fill="none" stroke="#006233" strokeWidth="1"/></svg>
  ),
  Tunisia: () => (
    <svg viewBox="0 0 30 20" className="w-8 h-5 rounded-sm shadow-sm inline-block"><rect width="30" height="20" fill="#E70013"/><circle cx="15" cy="10" r="6" fill="#FFF"/><circle cx="16" cy="10" r="4" fill="#E70013"/><circle cx="17" cy="10" r="3.5" fill="#FFF"/></svg>
  ),
  World: () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6 inline-block" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20"/></svg>
  )
};

export const STUDIO_CONTROLS = {
  temp: { title: 'درجة حرارة الصوت', options: [{ label: 'دافئ', desc: 'نبرة عميقة ومطمئنة' }, { label: 'طبيعي', desc: 'توازن مثالي للحديث' }, { label: 'حاد', desc: 'وضوح عالي ونبرة بارزة' }] },
  emotion: { title: 'مستوى التعبير', options: [{ label: 'هادئ', desc: 'أداء مستقر بدون انفعالات' }, { label: 'متوسط', desc: 'تفاعل طبيعي مع النص' }, { label: 'مرتفع', desc: 'أداء درامي مشحون بالمشاعر' }] },
  speed: { title: 'سرعة الإلقاء', options: [{ label: 'بطيئة', desc: 'سرد متأني للروايات' }, { label: 'متوسطة', desc: 'السرعة المثالية للبودكاست' }, { label: 'سريعة', desc: 'للإعلانات والفواصل القصيرة' }] },
  depth: { title: 'عمق الصوت', options: [{ label: 'خفيف', desc: 'صوت شبابي ومشرق' }, { label: 'متوسطة', desc: 'نبرة رجولية متزنة' }, { label: 'عميق', desc: 'فخامة صوتية ووقار' }] },
  pitch: { title: 'طبقة الصوت', options: [{ label: 'منخفضة', desc: 'ترددات عميقة وفخمة' }, { label: 'متوسطة', desc: 'الطبقة الطبيعية للبشر' }, { label: 'مرتفع', desc: 'نبرة حادة وصوت رفيع' }] },
  drama: { title: 'الحس الدرامي', options: [{ label: 'منخفض', desc: 'إلقاء معلوماتي مباشر' }, { label: 'متوسط', desc: 'توازن بين السرد والتمثيل' }, { label: 'مرتفع', desc: 'تمثيل كامل للشخصية' }] }
};

// ملف أصوات مصر
const egyptProfiles: VoiceProfile[] = [
  { name: 'أحمد', gender: 'male', voiceType: 'بالغ', category: 'وثائقي', categoryKey: 'doc', description: '' },
  { name: 'ياسين', gender: 'male', voiceType: 'بالغ', category: 'إعلاني', categoryKey: 'ads', description: '' },
  { name: 'عمرو', gender: 'male', voiceType: 'بالغ', category: 'بودكاست', categoryKey: 'podcast', description: '' },
  { name: 'هشام', gender: 'male', voiceType: 'بالغ', category: 'روايات', categoryKey: 'novels', description: '' },
  { name: 'تامر', gender: 'male', voiceType: 'بالغ', category: 'درامي', categoryKey: 'drama', description: '' },
  { name: 'مراد', gender: 'male', voiceType: 'بالغ', category: 'إخباري', categoryKey: 'doc', description: '' },
  { name: 'ليلى', gender: 'female', voiceType: 'بالغ', category: 'إعلاني ناعم', categoryKey: 'ads', description: '' },
  { name: 'نور', gender: 'female', voiceType: 'بالغ', category: 'بودكاست', categoryKey: 'podcast', description: '' },
  { name: 'سلمى', gender: 'female', voiceType: 'بالغ', category: 'روايات', categoryKey: 'novels', description: '' },
  { name: 'ياسمين', gender: 'female', voiceType: 'بالغ', category: 'وثائقي', categoryKey: 'doc', description: '' },
  { name: 'ندى', gender: 'female', voiceType: 'بالغ', category: 'درامي', categoryKey: 'drama', description: '' },
  { name: 'عم شاكر', gender: 'male', voiceType: 'كبار السن', category: 'تراثي', categoryKey: 'novels', description: '' },
  { name: 'جدو حسن', gender: 'male', voiceType: 'كبار السن', category: 'حكايات', categoryKey: 'novels', description: '' },
  { name: 'تيتة زوزو', gender: 'female', voiceType: 'كبار السن', category: 'حكايات حنونة', categoryKey: 'drama', description: '' },
  { name: 'ماما سناء', gender: 'female', voiceType: 'كبار السن', category: 'نصائح قديمة', categoryKey: 'novels', description: '' },
  { name: 'بوجي', gender: 'male', voiceType: 'شخصية كارتونية', category: 'مرِح', categoryKey: 'cartoon', description: '' },
  { name: 'طمطم', gender: 'female', voiceType: 'شخصية كارتونية', category: 'مرِحة', categoryKey: 'cartoon', description: '' }
];

// لهجات أخرى بنفس النمط لضمان التنوع
const saudiProfiles: VoiceProfile[] = [
  { name: 'ناصر', gender: 'male', voiceType: 'بالغ', category: 'رسمي', categoryKey: 'doc', description: '' },
  { name: 'فهد', gender: 'male', voiceType: 'بالغ', category: 'وثائقي', categoryKey: 'doc', description: '' },
  { name: 'سلطان', gender: 'male', voiceType: 'بالغ', category: 'إعلاني', categoryKey: 'ads', description: '' },
  { name: 'خالد', gender: 'male', voiceType: 'بالغ', category: 'بودكاست', categoryKey: 'podcast', description: '' },
  { name: 'فيصل', gender: 'male', voiceType: 'بالغ', category: 'روايات', categoryKey: 'novels', description: '' },
  { name: 'سارة', gender: 'female', voiceType: 'بالغ', category: 'هادئ', categoryKey: 'podcast', description: '' },
  { name: 'العنود', gender: 'female', voiceType: 'بالغ', category: 'فخم', categoryKey: 'ads', description: '' },
  { name: 'أريج', gender: 'female', voiceType: 'بالغ', category: 'إخباري', categoryKey: 'doc', description: '' },
  { name: 'شروق', gender: 'female', voiceType: 'بالغ', category: 'درامي', categoryKey: 'drama', description: '' },
  { name: 'أبو فهد', gender: 'male', voiceType: 'كبار السن', category: 'تاريخي', categoryKey: 'novels', description: '' },
  { name: 'أم فيصل', gender: 'female', voiceType: 'كبار السن', category: 'قصص', categoryKey: 'novels', description: '' },
  { name: 'صقر', gender: 'male', voiceType: 'شخصية كارتونية', category: 'مرِح', categoryKey: 'cartoon', description: '' }
];

export const DIALECTS: DialectInfo[] = [
  { id: 'egyptian', title: 'اللهجة المصرية', flag: <Flags.Egypt />, description: 'سريع، إعلاني، درامي.', profiles: egyptProfiles },
  { id: 'saudi', title: 'اللهجة السعودية', flag: <Flags.Saudi />, description: 'فخم، رصين، رسمي.', profiles: saudiProfiles },
  { id: 'levantine', title: 'اللهجة السورية', flag: <Flags.Syria />, description: 'عذب، موسيقي، درامي.', profiles: [
    { name: 'ربيع', gender: 'male', voiceType: 'بالغ', category: 'وثائقي', categoryKey: 'doc', description: '' },
    { name: 'غياث', gender: 'male', voiceType: 'بالغ', category: 'درامي', categoryKey: 'drama', description: '' },
    { name: 'قصي', gender: 'male', voiceType: 'بالغ', category: 'إعلاني', categoryKey: 'ads', description: '' },
    { name: 'شام', gender: 'female', voiceType: 'بالغ', category: 'بودكاست', categoryKey: 'podcast', description: '' },
    { name: 'رؤى', gender: 'female', voiceType: 'بالغ', category: 'روايات', categoryKey: 'novels', description: '' },
    { name: 'أبو شام', gender: 'male', voiceType: 'كبار السن', category: 'عتيق', categoryKey: 'novels', description: '' },
    { name: 'ست الشام', gender: 'female', voiceType: 'كبار السن', category: 'تراثي', categoryKey: 'novels', description: '' }
  ]},
  { id: 'iraqi', title: 'اللهجة العراقية', flag: <Flags.Iraq />, description: 'عميق، شجي، أصيل.', profiles: [
    { name: 'علي', gender: 'male', voiceType: 'بالغ', category: 'شجي', categoryKey: 'drama', description: '' },
    { name: 'مصطفى', gender: 'male', voiceType: 'بالغ', category: 'وثائقي', categoryKey: 'doc', description: '' },
    { name: 'ليث', gender: 'male', voiceType: 'بالغ', category: 'إعلاني', categoryKey: 'ads', description: '' },
    { name: 'زينب', gender: 'female', voiceType: 'بالغ', category: 'هادئ', categoryKey: 'podcast', description: '' },
    { name: 'حنين', gender: 'female', voiceType: 'بالغ', category: 'روايات', categoryKey: 'novels', description: '' },
    { name: 'حجي كاظم', gender: 'male', voiceType: 'كبار السن', category: 'بغدادي', categoryKey: 'novels', description: '' }
  ]},
  { id: 'algerian', title: 'اللهجة الجزائرية', flag: <Flags.Algeria />, description: 'قوي، غني.', profiles: [
    { name: 'أنور', gender: 'male', voiceType: 'بالغ', category: 'وثائقي', categoryKey: 'doc', description: '' },
    { name: 'ياسين', gender: 'male', voiceType: 'بالغ', category: 'إعلاني', categoryKey: 'ads', description: '' },
    { name: 'كنزة', gender: 'female', voiceType: 'بالغ', category: 'إعلامي', categoryKey: 'podcast', description: '' },
    { name: 'أمال', gender: 'female', voiceType: 'بالغ', category: 'درامي', categoryKey: 'drama', description: '' }
  ]},
  { id: 'moroccan', title: 'اللهجة المغربية', flag: <Flags.Morocco />, description: 'إيقاعي، مميز.', profiles: [
    { name: 'المهدي', gender: 'male', voiceType: 'بالغ', category: 'إعلاني', categoryKey: 'ads', description: '' },
    { name: 'يوسف', gender: 'male', voiceType: 'بالغ', category: 'وثائقي', categoryKey: 'doc', description: '' },
    { name: 'سلمى', gender: 'female', voiceType: 'بالغ', category: 'سردي', categoryKey: 'novels', description: '' },
    { name: 'ليلى', gender: 'female', voiceType: 'بالغ', category: 'إعلامي', categoryKey: 'podcast', description: '' }
  ]},
  { id: 'tunisian', title: 'اللهجة التونسية', flag: <Flags.Tunisia />, description: 'لبق، ثقافي.', profiles: [
    { name: 'كريم', gender: 'male', voiceType: 'بالغ', category: 'ثقافي', categoryKey: 'doc', description: '' },
    { name: 'سامي', gender: 'male', voiceType: 'بالغ', category: 'إعلاني', categoryKey: 'ads', description: '' },
    { name: 'ألفة', gender: 'female', voiceType: 'بالغ', category: 'ناعم', categoryKey: 'ads', description: '' },
    { name: 'ريم', gender: 'female', voiceType: 'بالغ', category: 'بودكاست', categoryKey: 'podcast', description: '' }
  ]},
  { id: 'fusha', title: 'فصحى', flag: <Flags.World />, description: 'لغة الضاد النطق السليم.', profiles: [
    { name: 'طارق', gender: 'male', voiceType: 'بالغ', category: 'إخباري', categoryKey: 'doc', description: '' },
    { name: 'ماجد', gender: 'male', voiceType: 'بالغ', category: 'وثائقي', categoryKey: 'doc', description: '' },
    { name: 'حمزة', gender: 'male', voiceType: 'بالغ', category: 'روايات', categoryKey: 'novels', description: '' },
    { name: 'عمر', gender: 'male', voiceType: 'بالغ', category: 'ديني', categoryKey: 'drama', description: '' },
    { name: 'مريم', gender: 'female', voiceType: 'بالغ', category: 'إخباري', categoryKey: 'doc', description: '' },
    { name: 'هالة', gender: 'female', voiceType: 'بالغ', category: 'وثائقي', categoryKey: 'doc', description: '' },
    { name: 'منى', gender: 'female', voiceType: 'بالغ', category: 'تعليمي', categoryKey: 'podcast', description: '' },
    { name: 'الراوي', gender: 'male', voiceType: 'كبار السن', category: 'حكيم', categoryKey: 'novels', description: '' },
    { name: 'الجدة حكيمة', gender: 'female', voiceType: 'كبار السن', category: 'قصصية', categoryKey: 'novels', description: '' }
  ]}
];

export const VOICE_TYPES = ['بالغ', 'كبار السن', 'شخصية كارتونية'];

export const getBaseVoiceForType = (type: string, gender: string) => {
  if (gender === 'female' || gender === 'أنثى') return 'Kore';
  if (type === 'كبار السن') return 'Charon';
  if (type === 'شخصية كارتونية') return 'Puck';
  return 'Fenrir';
};
