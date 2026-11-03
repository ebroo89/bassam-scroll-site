/* Shared identity, verified achievement, prices and contact details. */
window.MB = {
  name: "محمد بسام",
  nameEn: "Muhammad Bassam",
  brandName: "M · Bassam",

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
    private: "",
    group: "",
    consult: "",
    indicators: "",
  },

  // Group course status line (waiting list).
  groupStatus: "قائمة الانتظار مفتوحة",
  groupNote: "سجّل اهتمامك لنشاركك تفاصيل الدفعة عند فتح التسجيل.",

  // A live endpoint must validate the request and return JSON { ok: true }.
  // Empty means a clearly labelled local demonstration with no delivery.
  webhookUrl: "",

  // Contact
  whatsapp: "",   // international format without +, e.g. "9715xxxxxxxx"
  telegram: "",   // e.g. "https://t.me/xxxx"
  instagram: "",
  email: "",
};
