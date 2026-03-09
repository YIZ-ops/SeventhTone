import { Info } from "lucide-react";

export default function AboutPage() {
  return (
    <section className="rounded-[2rem] border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm space-y-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand dark:bg-emerald-500/15 dark:text-emerald-300">
        <Info size={20} />
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-brand dark:text-emerald-400 font-bold mb-2">Why Seventh Tone exists</p>
        <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-gray-100">Read, retain, and return with less friction</h2>
      </div>
      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
        Seventh Tone is designed to make English news reading feel calmer, more consistent, and more useful for daily learning. It combines news
        discovery, reading history, highlights, vocabulary building, and lightweight AI practice in one place.
      </p>
      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
        The My area brings your personal data and controls together so your workflow stays simple: read, save, review, and keep improving over time.
      </p>
    </section>
  );
}
