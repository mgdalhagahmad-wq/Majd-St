
import React from 'react';

export interface VoiceProfile {
  name: string;
  gender: 'male' | 'female';
  voiceType: string;
  category: string;
  categoryKey: 'doc' | 'ads' | 'cartoon' | 'podcast' | 'novels' | 'youtube' | 'drama' | 'edu' | 'corporate';
  description: string;
}

export interface DialectInfo {
  id: string;
  title: string;
  flag: React.ReactNode;
  description: string;
  profiles: VoiceProfile[];
}

// Flags as Inline SVGs for Vercel Reliability
const Flags = {
  Egypt: () => (
    <svg viewBox="0 0 30 20" className="w-8 h-5 rounded-sm shadow-sm inline-block">
      <rect width="30" height="6.66" fill="#CE1126"/>
      <rect width="30" height="6.66" y="6.66" fill="#FFFFFF"/>
      <rect width="30" height="6.66" y="13.32" fill="#000000"/>
      <circle cx="15" cy="10" r="1.5" fill="#C09304"/>
    </svg>
  ),
  Saudi: () => (
    <svg viewBox="0 0 30 20" className="w-8 h-5 rounded-sm shadow-sm inline-block">
      <rect width="30" height="20" fill="#165235"/>
      <path d="M10 10l5-2 5 2M10 14h10" stroke="#FFF" strokeWidth="1" fill="none"/>
    </svg>
  ),
  Syria: () => (
    <svg viewBox="0 0 30 20" className="w-8 h-5 rounded-sm shadow-sm inline-block">
      <rect width="30" height="6.66" fill="#007A3D"/>
      <rect width="30" height="6.66" y="6.66" fill="#FFFFFF"/>
      <rect width="30" height="6.66" y="13.32" fill="#000000"/>
      <g fill="#CE1126">
        <path d="M7.5 8.5l.58 1.8h1.92l-1.55 1.12.59 1.8-1.54-1.12-1.54 1.12.59-1.8-1.55-1.12h1.92z"/>
        <path d="M15 8.5l.58 1.8h1.92l-1.55 1.12.59 1.8-1.54-1.12-1.54 1.12.59-1.8-1.55-1.12h1.92z"/>
        <path d="M22.5 8.5l.58 1.8h1.92l-1.55 1.12.59 1.8-1.54-1.12-1.54 1.12.59-1.8-1.55-1.12h1.92z"/>
      </g>
    </svg>
  ),
  Iraq: () => (
    <svg viewBox="0 0 30 20" className="w-8 h-5 rounded-sm shadow-sm inline-block">
      <rect width="30" height="6.66" fill="#CE1126"/>
      <rect width="30" height="6.66" y="6.66" fill="#FFFFFF"/>
      <rect width="30" height="6.66" y="13.32" fill="#000000"/>
      <text x="15" y="12" fontSize="4" textAnchor="middle" fill="#007A3D" fontWeight="bold">الله أكبر</text>
    </svg>
  ),
  Algeria: () => (
    <svg viewBox="0 0 30 20" className="w-8 h-5 rounded-sm shadow-sm inline-block">
      <rect width="15" height="20" fill="#006233"/>
      <rect x="15" width="15" height="20" fill="#FFF"/>
      <circle cx="15" cy="10" r="4" fill="#D21034"/>
      <circle cx="16.5" cy="10" r="3.5" fill="#FFF"/>
    </svg>
  ),
  Morocco: () => (
    <svg viewBox="0 0 30 20" className="w-8 h-5 rounded-sm shadow-sm inline-block">
      <rect width="30" height="20" fill="#C1272D"/>
      <path d="M15 6l1.5 4.5h4.5l-3.5 3 1.5 4.5-4-3-4 3 1.5-4.5-3.5-3h4.5z" fill="none" stroke="#006233" strokeWidth="1"/>
    </svg>
  ),
  Tunisia: () => (
    <svg viewBox="0 0 30 20" className="w-8 h-5 rounded-sm shadow-sm inline-block">
      <rect width="30" height="20" fill="#E70013"/>
      <circle cx="15" cy="10" r="6" fill="#FFF"/>
      <circle cx="16" cy="10" r="4" fill="#E70013"/>
      <circle cx="17" cy="10" r="3.5" fill="#FFF"/>
    </svg>
  ),
  World: () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6 inline-block" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20"/>
    </svg>
  )
};

export const STUDIO_CONTROLS = {
  temp: {
    title: 'درجة حرارة الصوت',
    options: [
      { label: 'دافئ', desc: 'نبرة عميقة ومطمئنة' },
      { label: 'طبيعي', desc: 'توازن مثالي للحديث' },
      { label: 'حاد', desc: 'وضوح عالي ونبرة بارزة' }
    ]
  },
  emotion: {
    title: 'مستوى التعبير',
    options: [
      { label: 'هادئ', desc: 'أداء مستقر بدون انفعالات' },
      { label: 'متوسط', desc: 'تفاعل طبيعي مع النص' },
      { label: 'مرتفع', desc: 'أداء درامي مشحون بالمشاعر' }
    ]
  },
  speed: {
    title: 'سرعة الإلقاء',
    options: [
      { label: 'بطيئة', desc: 'سرد متأني للروايات' },
      { label: 'متوسطة', desc: 'السرعة المثالية للبودكاست' },
      { label: 'سريعة', desc: 'للإعلانات والفواصل القصيرة' }
    ]
  },
  depth: {
    title: 'عمق الصوت',
    options: [
      { label: 'خفيف', desc: 'صوت شبابي ومشرق' },
      { label: 'متوسطة', desc: 'نبرة رجولية متزنة' },
      { label: 'عميق', desc: 'فخامة صوتية ووقار' }
    ]
  },
  pitch: {
    title: 'طبقة الصوت',
    options: [
      { label: 'منخفضة', desc: 'ترددات عميقة وفخمة' },
      { label: 'متوسطة', desc: 'الطبقة الطبيعية للبشر' },
      { label: 'مرتفعة', desc: 'نبرة حادة وصوت رفيع' }
    ]
  },
  drama: {
    title: 'الحس الدرامي',
    options: [
      { label: 'منخفض', desc: 'إلقاء معلوماتي مباشر' },
      { label: 'متوسط', desc: 'توازن بين السرد والتمثيل' },
      { label: 'مرتفع', desc: 'تمثيل كامل للشخصية' }
    ]
  }
};

export const DIALECTS: DialectInfo[] = [
  {
    id: 'egyptian',
    title: 'اللهجة المصرية',
    flag: <Flags.Egypt />,
    description: 'صوت خفيف الظل، سريع الوتيرة، مثالي للإعلانات والدراما والكوميديا.',
    profiles: [
      { name: 'يوسف', gender: 'male', voiceType: 'بالغ', category: 'وثائقي قوي', categoryKey: 'doc', description: 'صوت رجولي عميق يناسب الأفلام الوثائقية والروايات التاريخية بنبرة حاكمة مؤثرة.' },
      { name: 'مالك', gender: 'male', voiceType: 'بالغ', category: 'إعلاني سريع', categoryKey: 'ads', description: 'صوت سريع وجذاب مخصص لصناعة الإعلانات والمؤثرات التسويقية بأسلوب مرحّب لامع.' },
      { name: 'رامي', gender: 'male', voiceType: 'بالغ', category: 'بودكاست هادئ', categoryKey: 'podcast', description: 'صوت محايد وواضح مناسب للبودكاست العربي والمحتوى الهادئ المباشر.' },
      { name: 'زيد', gender: 'male', voiceType: 'بالغ', category: 'روايات درامية', categoryKey: 'novels', description: 'صوت مصري ذكوري عميق ومليء بالحيوية يناسب الروايات الدرامية الطويلة والإلقاء المؤثر.' },
      { name: 'لوجين', gender: 'female', voiceType: 'شخصية كارتونية', category: 'كارتونية مرِحة', categoryKey: 'cartoon', description: 'صوت مصري أنثوي مرتفع النبرة مليء بالضحك والطاقة، مناسب للشخصيات الكوميدية والرسوم المتحركة للأطفال.' }
    ]
  },
  {
    id: 'saudi',
    title: 'اللهجة السعودية',
    flag: <Flags.Saudi />,
    description: 'رصين، فخم، يعكس الهوية السعودية بوضوح واتزان عالي.',
    profiles: [
      { name: 'ناصر', gender: 'male', voiceType: 'بالغ', category: 'وثائقي رسمي', categoryKey: 'doc', description: 'صوت سعودي ذكوري عميق ورسمي يناسب الأفلام الوثائقية والتقارير الجادة.' },
      { name: 'راكان', gender: 'male', voiceType: 'بالغ', category: 'إعلان تجاري', categoryKey: 'ads', description: 'صوت سعودي شبابي سريع ومؤثر مناسب للإعلانات والمحتوى الترويجي.' }
    ]
  },
  {
    id: 'levantine',
    title: 'اللهجة السورية',
    flag: <Flags.Syria />,
    description: 'صوت عذب، موسيقي، رائع للروايات والقصص الرومانسية والدراما.',
    profiles: [
      { name: 'ربيع', gender: 'male', voiceType: 'بالغ', category: 'وثائقي درامي', categoryKey: 'doc', description: 'صوت ذكوري شامي عميق ومؤثر يناسب الوثائقيات الروايات التاريخية بنبرة درامية قوية.' },
      { name: 'لين', gender: 'female', voiceType: 'بالغ', category: 'قصص رومانسية', categoryKey: 'novels', description: 'صوت نسائي شامي دافئ مناسب للروايات الرومانسية والمشاهد الوجدانية.' }
    ]
  },
  {
    id: 'iraqi',
    title: 'اللهجة العراقية',
    flag: <Flags.Iraq />,
    description: 'عميق، شجي، يحمل قوة التعبير والأصالة الرافدينية العريقة.',
    profiles: [
      { name: 'علي', gender: 'male', voiceType: 'بالغ', category: 'قصص شعبية', categoryKey: 'drama', description: 'صوت ذكوري عراقي عاطفي غني بالتعبير الشعبي، مناسب للروايات التراثية والمحتوى الدرامي.' }
    ]
  },
  {
    id: 'algerian',
    title: 'اللهجة الجزائرية',
    flag: <Flags.Algeria />,
    description: 'لهجة غنية، تمزج بين القوة والنعومة، مثالية للوصول لجمهور المغرب العربي بوضوح.',
    profiles: [
      { name: 'أنور', gender: 'male', voiceType: 'بالغ', category: 'محتوى وثائقي', categoryKey: 'doc', description: 'صوت ذكوري جزائري عميق بنبرة هادئة، مناسب للأفلام الوثائقية والمحتوى التاريخي.' }
    ]
  },
  {
    id: 'moroccan',
    title: 'اللهجة المغربية',
    flag: <Flags.Morocco />,
    description: 'إيقاع مميز، غني بالتفاصيل، للوصول لجمهور المغرب العربي بذكاء.',
    profiles: [
      { name: 'المهدي', gender: 'male', voiceType: 'بالغ', category: 'تقديم معلوماتي', categoryKey: 'edu', description: 'صوت ذكوري مغربي متوازن غني بالوضوح، مناسب للفيديوهات التثقيفية والشرح.' }
    ]
  },
  {
    id: 'tunisia',
    title: 'اللهجة التونسية',
    flag: <Flags.Tunisia />,
    description: 'لبق، منفتح، مثالي للمحتوى الثقافي والاجتماعي المعاصر.',
    profiles: [
      { name: 'كريم', gender: 'male', voiceType: 'بالغ', category: 'محتوى ثقافي', categoryKey: 'doc', description: 'صوت ذكوري تونسي متوازن مناسب للمحتوى التاريخي والثقافي والروايات الوثائقية.' }
    ]
  },
  {
    id: 'fusha',
    title: 'فصحى',
    flag: <Flags.World />,
    description: 'لغة الضاد، معايير النطق السليم، للوثائقيات والتعليم والكتب الصوتية العالمية.',
    profiles: [
      { name: 'طارق', gender: 'male', voiceType: 'بالغ', category: 'روايات', categoryKey: 'novels', description: 'صوت عربي فصيح ثابت وواضح مناسب للكتب والروايات الصوتية الطويلة.' }
    ]
  }
];

export const VOICE_TYPES = [
  'بالغ', 'كبار السن', 'شخصية كارتونية'
];

export const getBaseVoiceForType = (type: string, gender: string) => {
  if (gender === 'female' || gender === 'أنثى') return 'Kore';
  if (type === 'كبار السن') return 'Charon';
  if (type === 'شخصية كارتونية') return 'Kore';
  return 'Fenrir';
};
