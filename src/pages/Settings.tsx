import { Download, Import, Moon, Sun } from "lucide-react";
import { type ChangeEvent, type RefObject } from "react";
import { useTheme, type FontScale } from "../contexts/ThemeContext";

interface SettingsPageProps {
  onExport: () => void;
  onImportFile: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  importError: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
}

export default function SettingsPage({ onExport, onImportFile, importError, fileInputRef }: SettingsPageProps) {
  const { theme, toggleTheme, fontScale, setFontScale } = useTheme();

  const fontOptions: Array<{ value: FontScale; label: string; previewClassName: string }> = [
    { value: "small", label: "Small", previewClassName: "text-xl" },
    { value: "medium", label: "Medium", previewClassName: "text-2xl" },
    { value: "large", label: "Large", previewClassName: "text-3xl" },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <p className="text-[11px] uppercase tracking-[0.2em] text-brand dark:text-emerald-400 font-bold mb-2">Appearance</p>
        <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-gray-100">Theme</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-5">Switch between light and dark reading environments.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gray-900 dark:bg-emerald-600 text-white text-sm font-semibold hover:bg-brand dark:hover:bg-emerald-500 transition-colors"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}</span>
          </button>
        </div>
      </section>

      <section className="rounded-[2rem] border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <p className="text-[11px] uppercase tracking-[0.2em] text-brand dark:text-emerald-400 font-bold mb-2">Typography</p>
        <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-gray-100">News Font Size</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-5">Tune news font size.</p>
        <div className="grid grid-cols-3 gap-3">
          {fontOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFontScale(option.value)}
              className={`rounded-2xl border p-4 text-center transition-all ${
                fontScale === option.value
                  ? "border-gray-900 dark:border-emerald-500 bg-gray-900 dark:bg-emerald-600 text-white"
                  : "border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 text-gray-600 dark:text-gray-300"
              }`}
            >
              <p className={`font-serif font-bold ${option.previewClassName}`}>A</p>
              <p className="text-sm mt-2 font-semibold">{option.label}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <p className="text-[11px] uppercase tracking-[0.2em] text-brand dark:text-emerald-400 font-bold mb-2">Backup</p>
        <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-gray-100">Local Data Export and Import</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-5">
          Create a local backup file or restore one when you switch devices or reinstall.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gray-900 dark:bg-emerald-600 text-white text-sm font-semibold hover:bg-brand dark:hover:bg-emerald-500 transition-colors"
          >
            <Download size={16} />
            <span>Export local data</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border border-gray-200 dark:border-slate-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Import size={16} />
            <span>Import backup file</span>
          </button>
        </div>
        {importError && <p className="text-sm text-red-500 dark:text-red-400 mt-4">{importError}</p>}
        <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={onImportFile} />
      </section>
    </div>
  );
}
