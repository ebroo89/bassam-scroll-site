/* Shared identity, verified achievement, prices and contact details. */
window.MB = {
  name: "محمد بسام",
  nameEn: "Muhammad Bassam",
  brandName: "محمد بسام",

  // Checked against the official standings on 2026-11-03.
  // The published monthly result is still pending the final audit.
  award: {
    title: "المركز الأول في بطولة أكتوبر الشهرية للفوركس 2026",
    competition: "October Monthly Forex Trading Championship",
    year: "2026",
    confirmed: false,
    note: "بحسب الترتيب المنشور، والنتيجة بانتظار التدقيق النهائي.",
    caption: "1–30 أكتوبر 2026 · بانتظار التدقيق النهائي",
    proofUrl: "https://www.worldcupchampionships.com/world-cup-trading-championship-standings",
  },

  // Optional portrait. An empty value hides the portrait.
  photo: "assets/img/bassam.jpg",

  // Prices: empty = «حسب الطلب». Write them as they should appear, e.g. "$450".
  prices: {
    private: "$7,990",
    group: "",
    consult: "$200",
    indicators: "",
  },

  privateTraining: {
    "originalPrice": "$10,000",
    "discountLabel": "خصم نحو 20%",
    "fullyBookedMonth": "2026-11",
    "status": "مواعيد هذا الشهر مكتملة",
    "note": "اختر من الأشهر القادمة لننسّق موعدك معك.",
    "action": "نسّق موعدًا قادمًا"
  },

  // USD tuition and enrollment availability for each offer.
  courses: [
    {
      "id": "foundations",
      "type": "course",
      "title": "التأسيس",
      "level": "للمبتدئين",
      "price": 499,
      "summary": "افهم بنية السوق، واقرأ الشموع في سياقها، وابنِ قرارك على قواعد واضحة.",
      "topics": [
        "تميّز الاتجاه والتوازن ومناطق تغيّر الحركة من بنية السوق",
        "تقرأ الشموع ضمن سياقها وتبني منها سيناريو للتداول",
        "تطبّق استراتيجيات تعتمد على الشموع فقط",
        "تحدّد شروط الدخول والخروج وما يلغي الفكرة قبل التنفيذ",
        "تضبط حجم الصفقة والمخاطرة وفق خطتك"
      ],

      "fit": "يناسبك إذا كنت في بداية الطريق، أو تريد تحويل معرفتك بالسعر والشموع إلى طريقة واضحة لاتخاذ القرار.",
      "availability": "waitlist"
    },
    {
      "id": "order-flow",
      "type": "course",
      "title": "السيولة وتدفّق الأوامر",
      "level": "للمستوى المتوسط",
      "price": 899,
      "summary": "اربط ما تراه على الشارت بما يجري في التنفيذ والسيولة، وحدّد ما يدعم فكرتك وما يضعفها.",
      "topics": [
        "تستخدم فهم المزاد AMT وMarket Profile وVolume Profile لبناء سياق للجلسة",
        "تربط قراءة Footprint والـDelta بسلوك السعر عند المناطق المهمة",
        "تجمع DOM وTime & Sales وCVD في قراءة متكاملة للتنفيذ",
        "تراقب السيولة المعروضة وعلاقتها بالصفقات المنفّذة عبر Bookmap",
        "تبني سيناريوهات تربط السياق والسيولة بشروط الدخول والخروج",
        "تحدّد ما يدعم الفكرة وما يلغيها وحدود المخاطرة المرتبطة بها"
      ],

      "fit": "يناسبك إذا كنت تعرف الأساسيات وتريد تفسير تفاصيل الحركة وربطها بخطة تنفيذ.",
      "availability": "waitlist"
    },
    {
      "id": "options-flow",
      "type": "course",
      "title": "تدفّق الأوبشن",
      "level": "للمتقدّمين",
      "price": 1199,
      "summary": "اقرأ بيئة السوق من زاوية أوسع، وارسم خريطة للمناطق المهمة، وابنِ سيناريوهات أوضح للحركة.",
      "topics": [
        "تميّز بيئة السوق وتفهم طبيعة الحركة التي قد ترجّحها",
        "ترسم خريطة للمناطق الرئيسية وترتّب أولويات مراقبتها",
        "تقرأ دلائل المشاركة الكبيرة وتحوّلات التمركز ضمن سياقها",
        "تقيّم ظروف استمرار الحركة أو احتمال تغيّر سلوكها",
        "تقارن السيناريوهات وتحدّد ما يدعم كلًا منها أو يضعفه",
        "تربط الصورة الأوسع بتوقيت التنفيذ وحدود المخاطرة"
      ],

      "fit": "يناسبك إذا كنت تتداول بالفعل وتريد فهم السياق الأوسع قبل التركيز على نقطة التنفيذ.",
      "availability": "waitlist"
    },
    {
      "id": "quant",
      "type": "course",
      "title": "التداول الكمي والأتمتة",
      "level": "مسار تقني مستقل",
      "price": 1490,
      "summary": "حوّل أفكارك عن الأفضلية إلى قواعد تختبرها بالبيانات، وطوّر نماذج تستطيع تجربتها وأتمتتها.",
      "topics": [
        "تحوّل أفكار التداول إلى فرضيات وقواعد قابلة للقياس",
        "تقيّم جودة الأداء والمخاطرة بعد تكاليف التنفيذ",
        "تختبر على بيانات جديدة وتفحص أثر الإفراط في ملاءمة البيانات",
        "تدرس النماذج المشمولة وتفهم منطقها وشروط استخدامها",
        "تحصل على قواعد واستراتيجيات مشروحة وملفات كود للتجربة والتطوير",
        "تبني آلية لأتمتة التنفيذ ومراقبة أداء النظام",
        "تراجع النماذج وتطوّرها وفق نتائج الاختبار وتغيّر السوق"
      ],

      "fit": "يناسبك إذا كنت تريد العمل بالبيانات والكود لتحويل أفكارك إلى أنظمة قابلة للاختبار والتطوير.",
      "availability": "waitlist"
    },
    {
      "id": "psychology",
      "title": "الانضباط النفسي في التداول",
      "level": "التزام أوضح تحت الضغط",
      "price": 300,
      "summary": "تدرّب على تنفيذ خطتك تحت الضغط، والتعامل مع الخسارة، ومراجعة قراراتك بانضباط.",
      "topics": [
        "تتعرّف إلى المواقف التي تدفعك إلى التسرّع أو الخروج عن الخطة",
        "تبني روتينًا قبل الجلسة يساعدك على الاستعداد واتخاذ القرار",
        "تضع قواعد للتعامل مع الخسارة والاندفاع لتعويضها",
        "تقيّم جودة قراراتك ومدى التزامك بالخطة بعد التنفيذ",
        "تحوّل ملاحظاتك إلى خطوات عملية لتحسين انضباطك"
      ],
      "fit": "يناسبك إذا كنت تعرف ما ينبغي فعله، وتريد التزامًا أكثر ثباتًا بخطتك أثناء التداول.",
      "type": "course",
      "curriculumTopicCount": 5,

      "priceLabel": "السعر عند التسجيل منفردًا",
      "image": "assets/img/courses-psychology-v2.jpg",
      "availability": "waitlist"
    },
    {
      "id": "edge",
      "title": "بناء الأفضلية الإحصائية",
      "level": "من الفرضية إلى نظام قابل للاختبار",
      "price": 400,
      "summary": "حوّل أفكار التداول إلى فرضيات قابلة للاختبار، وابنِ نظامًا تقيس نتائجه وتراجعه وتطوّره.",
      "topics": [
        "تصوغ فرضية تحدّد ما تتوقّعه وكيف ستقيسه",
        "تحدّد قواعد الدخول والخروج والمخاطرة قبل الاختبار",
        "تقيّم الأداء والمخاطر بعد احتساب تكاليف التنفيذ",
        "تختبر على بيانات لم تستخدمها في تطوير الفكرة",
        "تراجع النتائج لتقرّر الإبقاء على النظام أو تعديله أو استبعاده"
      ],
      "fit": "يناسبك إذا كنت تريد تقييم طريقتك ببيانات وقواعد واضحة قبل التوسّع في تطبيقها.",
      "type": "course",
      "curriculumTopicCount": 5,

      "priceLabel": "السعر عند التسجيل منفردًا",
      "image": "assets/img/courses-edge-v2.jpg",
      "availability": "waitlist"
    },
    {
      "id": "zero-intermediate",
      "type": "bundle",
      "title": "من الفهم إلى القرار",
      "level": "مسار البداية والتطبيق",
      "price": 1490,
      "summary": "ابدأ بقراءة السعر والشموع، ثم أضف السيولة وتدفّق الأوامر لتبني سيناريوهات وقواعد تنفيذ مترابطة.",
      "topics": [
        "تبني فهمًا لبنية السوق قبل التعامل مع تفاصيل التنفيذ",
        "تقرأ الشموع والسيولة ضمن سياق واحد",
        "تحدّد المناطق التي تراقبها والشروط التي تدعم قرارك",
        "تربط استراتيجيتك بدخول وخروج ومخاطرة واضحة",
        "تبدأ بناء نظام تستطيع مراجعته وتطويره"
      ],

      "fit": "يناسبك إذا كنت تريد مسارًا متدرّجًا يأخذك من فهم حركة السعر إلى بناء قرار تداول.",
      "includes": [
        "foundations",
        "order-flow"
      ],
      "availability": "open",
      "originalPrice": 2099
    },
    {
      "id": "order-options",
      "type": "bundle",
      "title": "Order Flow + Options Flow",
      "level": "قراءتان ضمن مسار واحد",
      "price": 1790,
      "summary": "اجمع قراءة التنفيذ مع الصورة الأوسع للسوق لتحدّد أين تراقب الحركة ومتى تتوافر شروط قرارك.",
      "topics": [
        "تضع تفاصيل السيولة والتنفيذ ضمن بيئة السوق",
        "تبني خريطة للمناطق المهمة من أكثر من زاوية",
        "تقرأ توافق الإشارات وتعارضها قبل ترجيح سيناريو",
        "تميّز الحالات التي تستحق المتابعة وتلك التي تحتاج إلى انتظار",
        "تصوغ شروط تنفيذ ومخاطرة تنسجم مع قراءتك"
      ],

      "fit": "يناسبك إذا كنت تعرف الأساسيات وتريد جمع قراءة التنفيذ وسياق السوق في طريقة عمل واحدة.",
      "includes": [
        "order-flow",
        "options-flow"
      ],
      "availability": "waitlist"
    },
    {
      "id": "champ",
      "curriculum": ["foundations", "order-flow", "options-flow", "psychology", "edge"],
      "type": "bundle",
      "title": "From Zero to Champ",
      "level": "المسار الشامل مع متابعة إضافية",
      "price": 2490,
      "summary": "ابنِ قراءتك خطوة بخطوة من السعر والشموع إلى السيولة وسياق الأوبشن، وطوّر طريقة عملك مع متابعة جماعية.",
      "topics": [
        "تكوّن أساسًا في قراءة السعر بدءًا من بنية السوق والشموع",
        "تتدرّج إلى السيولة وتدفّق الأوامر ثم سياق الأوبشن",
        "تجمع هذه القراءات في سيناريو وخطة عمل مترابطين",
        "تحوّل أفكارك إلى قواعد تنفيذ ومخاطرة تستطيع مراجعتها",
        "تناقش تطبيقك وأسئلتك خلال اللقاءات المشمولة",
        "تحدّد أولويات تطويرك بعد المراجعة"
      ],

      "support": "لقاء جماعي شهري. تُحدّد مدة المتابعة قبل التسجيل.",
      "fit": "يناسبك إذا كنت تريد التدرّج عبر المسار كاملًا مع مساحة لمراجعة تطبيقك وأسئلتك.",
      "includes": [
        "foundations",
        "order-flow",
        "options-flow",
        "psychology",
        "edge"
      ],
      "availability": "open",
      "originalPrice": 4500
    }
  ],

  // Current group learning offer.
  groupNote: "تعرّف إلى محتوى المسار وتفاصيل التسجيل.",

  // A live endpoint must validate the request and return JSON { ok: true }.
  // Empty means a clearly labelled local demonstration with no delivery.
  webhookUrl: "",

  // Programmes offered on the application form. The course and consultations are paid on pay.html instead;
  // older links with #group or #consult still open their form.
  applicationPrograms: ["private", "indicator"],

  // Consultation booking (book.html): the visitor picks a slot of the consultation calendar, then pays on pay.html.
  // Live only when `endpoint` is set to the relay (api/book.php) on https; until then it is a labelled demo with
  // generated slots that sends nothing. Remove test:true before launch.
  booking: {
    endpoint: "",
    test: true,
    days: 14,
    timezone: "Asia/Dubai",
    durationMin: 90,
  },

  // Crypto payment (pay.html). It stays a labelled preview that shows no wallet until BOTH the TRC20
  // address and the proof endpoint are set. The endpoint must store the receipt and return JSON { ok: true }.
  cryptoPayment: {
    asset: "USDT",
    network: "TRC20 (Tron)",
    address: "",
    webhookUrl: "",
    // Demo only: shows this placeholder (deliberately not a valid TRON address) while no real address is set.
    // Remove both lines, or set test: false, before launch.
    test: true,
    testAddress: "TTestAddressDoNotSendFundsHere0000",
    // Offers with a fixed price that can be paid: "champ" (course price), "private" and "consult" (prices above).
    offers: ["champ", "private", "consult"],
  },

  // Contact
  whatsapp: "",   // international format without +, e.g. "9715xxxxxxxx"
  telegram: "",   // e.g. "https://t.me/xxxx"
  instagram: "",
  email: "",
};
