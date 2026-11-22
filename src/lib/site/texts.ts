/**
 * سجلّ نصوص الصفحة العامة القابلة للتغيير من لوحة الإدارة.
 *
 * كل نصّ هنا له مفتاح ثابت وقيمة افتراضية. المدير يحفظ ما يغيّره في
 * `platform_settings.site_texts`، وتُدمج القيم المحفوظة فوق الافتراضية
 * عند العرض — فما لم يُغيَّر يبقى على أصله، وإفراغ الحقل يُرجعه للأصل.
 *
 * لإتاحة نصّ جديد للتغيير: أضف سطرًا هنا واستعمل `t('key')` في الصفحة.
 * لا حاجة إلى لمس نموذج الإدارة — يُبنى من هذا السجلّ.
 */

export type TextItem = {
  key: string
  /** ما هذا النصّ ومكانه — يراه المدير فوق الحقل */
  label: string
  value: string
  /** نصّ طويل يحتاج صندوقًا متعدّد الأسطر */
  long?: boolean
}

export type TextGroup = {
  id: string
  title: string
  items: TextItem[]
}

export const TEXT_GROUPS: TextGroup[] = [
  {
    id: 'hero',
    title: 'الواجهة الأولى',
    items: [
      { key: 'hero.titleLine1', label: 'العنوان — السطر الأول', value: 'اللغة العربية، مشروحة بترتيب' },
      { key: 'hero.titleLine2', label: 'العنوان — السطر الثاني', value: 'يوصلك للدرجة النهائية.' },
      {
        key: 'hero.description',
        label: 'الوصف تحت العنوان',
        value:
          'شرح واضح لكل قاعدة، وتدريبات عليها، واختبارات تُصحَّح فور التسليم. كل ما تحتاجه في اللغة العربية، مرتَّبًا في مكان واحد.',
        long: true,
      },
      { key: 'hero.primaryCta', label: 'الزرّ الأساسي', value: 'أنشئ حسابك' },
      { key: 'hero.secondaryCta', label: 'الزرّ الثانوي', value: 'استعرض المقررات' },
    ],
  },
  {
    id: 'brand',
    title: 'الهوية في الشريط العلوي',
    items: [
      { key: 'site.name', label: 'اسم المنصة', value: 'منصة نجاح' },
      { key: 'site.tagline', label: 'العبارة تحت الاسم', value: 'رحلتك نحو مستقبل أفضل' },
    ],
  },
  {
    id: 'features',
    title: 'قسم «ما تجده في حسابك»',
    items: [
      { key: 'features.title', label: 'عنوان القسم', value: 'ما تجده في حسابك' },
      {
        key: 'features.lead',
        label: 'السطر التمهيدي',
        value: 'أربعة عناصر يقوم عليها كل مقرر: الشرح، والمادة المكتوبة، والقياس، والمتابعة المباشرة.',
        long: true,
      },
      { key: 'features.1.title', label: 'البند ١ — العنوان', value: 'دروس بالفيديو' },
      { key: 'features.1.body', label: 'البند ١ — الشرح', value: 'شرح خطوة بخطوة، تعيده متى شئت، والمنصة تحفظ آخر نقطة وقفت عندها.', long: true },
      { key: 'features.2.title', label: 'البند ٢ — العنوان', value: 'ملازم ومذكرات' },
      { key: 'features.2.body', label: 'البند ٢ — الشرح', value: 'ملفات PDF مع كل مقرر، تحمّلها على جهازك وتذاكر منها بلا إنترنت.', long: true },
      { key: 'features.3.title', label: 'البند ٣ — العنوان', value: 'اختبارات مصحّحة' },
      { key: 'features.3.body', label: 'البند ٣ — الشرح', value: 'نتيجتك ودرجتك في كل سؤال تظهر فور التسليم، بلا انتظار.', long: true },
      { key: 'features.4.title', label: 'البند ٤ — العنوان', value: 'حصص مباشرة' },
      { key: 'features.4.body', label: 'البند ٤ — الشرح', value: 'مراجعات بالبثّ المباشر، ومن فاتته الحصة يجد تسجيلها في حسابه.', long: true },
    ],
  },
  {
    id: 'courses',
    title: 'قسم المقررات',
    items: [
      { key: 'courses.title', label: 'عنوان القسم', value: 'المقررات والصفوف' },
      {
        key: 'courses.lead',
        label: 'السطر التمهيدي',
        value: 'لكل صفّ مقرره: نحو وبلاغة وأدب ونصوص، مقسّمة وحدات ودروسًا بالترتيب الذي تُدرَّس به في المدرسة.',
        long: true,
      },
    ],
  },
  {
    id: 'exams',
    title: 'قسم الاختبارات',
    items: [
      { key: 'exams.title', label: 'عنوان القسم', value: 'نتيجتك فور التسليم' },
      {
        key: 'exams.lead',
        label: 'السطر التمهيدي',
        value: 'الاختبار يُصحَّح لحظة تسليمه: درجتك في كل سؤال، والإجابة الصحيحة مع شرحها. والمؤقّت يُحسب على ساعة الخادم، فلا يتأثر بإغلاق الصفحة أو انقطاع الإنترنت.',
        long: true,
      },
      { key: 'exams.1.title', label: 'البند ١ — العنوان', value: 'تصحيح فوري' },
      { key: 'exams.1.body', label: 'البند ١ — الشرح', value: 'درجتك في كل سؤال تظهر لحظة التسليم.', long: true },
      { key: 'exams.2.title', label: 'البند ٢ — العنوان', value: 'مؤقّت من الخادم' },
      { key: 'exams.2.body', label: 'البند ٢ — الشرح', value: 'الوقت يُحسب على ساعة الخادم، فلا يزيد بإعادة فتح الصفحة.', long: true },
      { key: 'exams.3.title', label: 'البند ٣ — العنوان', value: 'مراجعة الإجابات' },
      { key: 'exams.3.body', label: 'البند ٣ — الشرح', value: 'بعد التسليم ترى أين أخطأت، والإجابة الصحيحة مع شرحها.', long: true },
      { key: 'exams.4.title', label: 'البند ٤ — العنوان', value: 'عدد محاولات واضح' },
      { key: 'exams.4.body', label: 'البند ٤ — الشرح', value: 'تعرف عدد محاولاتك المتاحة قبل أن تبدأ.', long: true },
    ],
  },
  {
    id: 'files',
    title: 'قسم الملفات',
    items: [
      { key: 'files.title', label: 'عنوان القسم', value: 'ملازم تحمّلها وتذاكر منها' },
      {
        key: 'files.lead',
        label: 'السطر التمهيدي',
        value: 'لكل مقرر ملفاته: ملازم ومذكرات وأوراق تطبيقات بصيغة PDF، تفتحها من حسابك وتحمّلها على جهازك لتذاكر منها بلا إنترنت.',
        long: true,
      },
      { key: 'files.1.title', label: 'البند ١ — العنوان', value: 'مرتَّبة مع المقرر' },
      { key: 'files.1.body', label: 'البند ١ — الشرح', value: 'كل ملف تحت المقرر الذي يخصّه.', long: true },
      { key: 'files.2.title', label: 'البند ٢ — العنوان', value: 'تحميل على جهازك' },
      { key: 'files.2.body', label: 'البند ٢ — الشرح', value: 'حمّلها مرة، وذاكر منها بلا إنترنت.', long: true },
      { key: 'files.3.title', label: 'البند ٣ — العنوان', value: 'لمشتركي المقرر' },
      { key: 'files.3.body', label: 'البند ٣ — الشرح', value: 'روابط مؤقّتة لا تُفتح من خارج حسابك.', long: true },
      { key: 'files.4.title', label: 'البند ٤ — العنوان', value: 'تتحدّث أولًا بأول' },
      { key: 'files.4.body', label: 'البند ٤ — الشرح', value: 'الملفات الجديدة تظهر في حسابك فور رفعها.', long: true },
    ],
  },
  {
    id: 'support',
    title: 'قسم الدعم',
    items: [
      { key: 'support.title', label: 'عنوان القسم', value: 'سؤالك لا يضيع' },
      {
        key: 'support.lead',
        label: 'السطر التمهيدي',
        value: 'داخل حسابك محادثة دعم مباشرة: اكتب سؤالك وتابع الرد عليه في المكان نفسه، واعرف حالة طلبك في كل خطوة.',
        long: true,
      },
      { key: 'support.1.title', label: 'البند ١ — العنوان', value: 'سؤال في المنهج' },
      { key: 'support.1.body', label: 'البند ١ — الشرح', value: 'اسأل عن قاعدة أو نصّ لم يتّضح، ويصلك الرد في حسابك.', long: true },
      { key: 'support.2.title', label: 'البند ٢ — العنوان', value: 'مشكلة اشتراك' },
      { key: 'support.2.body', label: 'البند ٢ — الشرح', value: 'كود لم يُفعَّل أو مقرر لم يظهر؟ أبلغنا ونتابعه معك.', long: true },
      { key: 'support.3.title', label: 'البند ٣ — العنوان', value: 'مشكلة تقنية' },
      { key: 'support.3.body', label: 'البند ٣ — الشرح', value: 'فيديو لا يعمل أو ملف لا يفتح؟ صف ما حدث ونحلّه.', long: true },
    ],
  },
  {
    id: 'steps',
    title: 'قسم «كيف تبدأ» والدعوة الختامية',
    items: [
      { key: 'steps.title', label: 'عنوان القسم', value: 'كيف تبدأ' },
      { key: 'steps.lead', label: 'السطر التمهيدي', value: 'ثلاث خطوات بينك وبين أول درس.', long: true },
      { key: 'steps.1.title', label: 'الخطوة ١ — العنوان', value: 'أنشئ حسابك' },
      { key: 'steps.1.body', label: 'الخطوة ١ — الشرح', value: 'بياناتك الأساسية ومرحلتك الدراسية، في دقيقة واحدة.', long: true },
      { key: 'steps.2.title', label: 'الخطوة ٢ — العنوان', value: 'فعّل الكود' },
      { key: 'steps.2.body', label: 'الخطوة ٢ — الشرح', value: 'اكتب الكود الذي حصلت عليه، ويُفتح المقرر في حسابك فورًا.', long: true },
      { key: 'steps.3.title', label: 'الخطوة ٣ — العنوان', value: 'ابدأ المذاكرة' },
      { key: 'steps.3.body', label: 'الخطوة ٣ — الشرح', value: 'الدروس والملفات والاختبارات في مكان واحد، مع متابعة لتقدّمك.', long: true },
      { key: 'cta.title', label: 'الدعوة الختامية — العنوان', value: 'حسابك جاهز في دقيقة' },
      { key: 'cta.body', label: 'الدعوة الختامية — الشرح', value: 'أنشئ حسابك الآن، وفعّل الكود متى حصلت عليه.', long: true },
      { key: 'cta.button', label: 'الدعوة الختامية — الزرّ', value: 'إنشاء حساب' },
    ],
  },
  {
    id: 'footer',
    title: 'التذييل',
    items: [
      {
        key: 'footer.about',
        label: 'وصف المنصة',
        value: 'منصة نجاح لتعليم اللغة العربية — للمرحلتين الإعدادية والثانوية.',
        long: true,
      },
      { key: 'footer.credit', label: 'سطر جهة التطوير', value: 'من تطوير شركة Spot Light' },
    ],
  },
]

/** القيم الافتراضية مسطَّحة: مفتاح ← نصّ. */
export const DEFAULT_TEXTS: Record<string, string> = Object.fromEntries(
  TEXT_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i.value])),
)

export const TEXT_KEYS = Object.keys(DEFAULT_TEXTS)
