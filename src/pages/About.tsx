import { Info } from "lucide-react";

export default function AboutPage() {
  return (
    <section className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-8">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand dark:bg-emerald-500/15 dark:text-emerald-400">
          <Info size={22} strokeWidth={2.5} />
        </div>
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.3em] text-brand/80 dark:text-emerald-500 font-bold">About Seventh Tone</p>
          <h2 className="text-3xl font-serif font-bold tracking-tight text-gray-900 dark:text-white leading-tight">
            Elevating English reading <br /> into a deliberate practice.
          </h2>
        </div>
      </div>

      {/* Mission Statement */}
      <div className="space-y-4 text-gray-600 dark:text-gray-400 text-[15px] leading-relaxed max-w-2xl">
        <p>
          <span className="font-semibold text-gray-900 dark:text-gray-200">Seventh Tone</span> is a refined news-reading ecosystem engineered for deep
          language acquisition. We bridge the gap between passive consumption and active mastery by streamlining the transition from discovery to
          retention.
        </p>
        <p>
          Designed for clarity and continuity, the experience allows you to capture nuances, revisit contexts, and consolidate knowledge without the
          friction of context-switching.
        </p>
      </div>

      {/* Capabilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: "Curated Exposure", desc: "Real-world English from high-quality sources." },
          { title: "Active Capture", desc: "Save meaningful sentences and core vocabulary." },
          { title: "Progress Insights", desc: "Visualize your growth through reading history." },
          { title: "AI-Powered Depth", desc: "Contextual practice for deeper understanding." },
        ].map((item, i) => (
          <div key={i} className="rounded-xl bg-gray-50/50 dark:bg-slate-800/40 p-4 border border-gray-50 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-gray-200 mb-1">{item.title}</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Footer Tagline */}
      <p className="text-sm font-medium text-brand dark:text-emerald-500 pt-2 border-t border-gray-100 dark:border-slate-800">
        Stay focused. Read deeper. Learn steadily.
      </p>
    </section>
  );
}
