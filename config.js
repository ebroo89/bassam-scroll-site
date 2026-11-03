/* ─────────────────────────────────────────────────────────
   Everything that may change lives here — no need to touch
   index.html. Empty strings hide the matching line on the page.
   ───────────────────────────────────────────────────────── */
window.MB = {
  name: "محمد بسام",
  nameEn: "Mohammad Bassam",

  // The award — the page's main proof. Fill the exact name/year when confirmed.
  award: {
    title: "المركز الأول في مسابقة التداول العالمية",
    competition: "October Monthly Forex Trading Championship",
    year: "2026",
    proofUrl: "",      // link to the official result / certificate
  },

  // Optional portrait (e.g. "assets/bassam.jpg"). Empty = monogram.
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
  groupNote: "المقاعد محدودة — الأولوية بالدفعة الجاية لمين سجّل بكير.",

  // Applications go here as JSON → api/apply.php relay → n8n "Bassam - Website Applications"
  // → GHL contact + program tag + note.
  // Empty, or a relative path on localhost = preview mode: the form works but sends nothing.
  webhookUrl: "",   // empty = preview mode: the form works but sends nothing. Put the live endpoint here.

  // Contact
  whatsapp: "",   // international format without +, e.g. "9715xxxxxxxx"
  telegram: "",   // e.g. "https://t.me/xxxx"
  instagram: "",
  email: "",
};
