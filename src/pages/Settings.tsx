import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Download, Import, Loader2, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { exportLocalData, importLocalData } from "../api/localData";
import { useTheme, type FontScale } from "../contexts/ThemeContext";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme, fontScale, setFontScale } = useTheme();
  const [exportError, setExportError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessInfo, setExportSuccessInfo] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [pendingImportPayload, setPendingImportPayload] = useState<unknown | null>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fontOptions: Array<{ value: FontScale; label: string; previewClassName: string }> = [
    { value: "small", label: "Small", previewClassName: "text-xl" },
    { value: "medium", label: "Medium", previewClassName: "text-2xl" },
    { value: "large", label: "Large", previewClassName: "text-3xl" },
  ];

  useEffect(() => {
    return () => {
      if (importRefreshTimerRef.current) {
        clearTimeout(importRefreshTimerRef.current);
      }
    };
  }, []);

  const handleExport = async () => {
    if (isExporting) return;

    setIsExporting(true);
    setExportError(null);

    const payload = exportLocalData();
    const content = JSON.stringify(payload, null, 2);
    const filename = `seventh-tone-backup-${new Date().toISOString().slice(0, 10)}.json`;

    if (!Capacitor.isNativePlatform()) {
      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportSuccessInfo(`File name: ${filename}\n\nSaved to: your browser's default downloads folder`);
      setIsExporting(false);
      return;
    }

    try {
      await Filesystem.requestPermissions();

      let uri: string | null = null;
      try {
        const result = await Filesystem.writeFile({
          path: filename,
          data: content,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });
        uri = result.uri;
      } catch {
        const result = await Filesystem.writeFile({
          path: `exports/${filename}`,
          data: content,
          directory: Directory.External,
          encoding: Encoding.UTF8,
          recursive: true,
        });
        uri = result.uri;
      }

      setExportSuccessInfo(uri ? `Export path:\n${uri}` : "Export complete. Your backup file was saved locally.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed. Please check storage permissions and try again.";
      setExportError(message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImportError(null);
      setImportSuccess(false);
      const text = await file.text();
      const payload = JSON.parse(text);
      setPendingImportPayload(payload);
      setShowImportConfirm(true);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Import failed.");
      setPendingImportPayload(null);
      setShowImportConfirm(false);
    } finally {
      event.target.value = "";
    }
  };

  const handleConfirmImport = () => {
    if (!pendingImportPayload) return;

    try {
      setImportError(null);
      importLocalData(pendingImportPayload);
      setPendingImportPayload(null);
      setShowImportConfirm(false);
      setImportSuccess(true);

      if (importRefreshTimerRef.current) {
        clearTimeout(importRefreshTimerRef.current);
      }

      importRefreshTimerRef.current = setTimeout(() => {
        setImportSuccess(false);
        navigate("/me", { replace: true });
      }, 1500);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Import failed.");
      setPendingImportPayload(null);
      setShowImportConfirm(false);
    }
  };

  const handleCancelImport = () => {
    setPendingImportPayload(null);
    setShowImportConfirm(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <div className="space-y-6">
        <section className="rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand dark:text-emerald-400 font-bold mb-2">Appearance</p>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Theme</h2>
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

        <section className="rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand dark:text-emerald-400 font-bold mb-2">Typography</p>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">News Font Size</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-5">Tune news font size.</p>
          <div className="grid grid-cols-3 gap-3">
            {fontOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFontScale(option.value)}
                className={`rounded-2xl border p-4 text-center transition-all ${
                  (fontScale ?? "small") === option.value
                    ? "border-gray-900 dark:border-emerald-500 bg-gray-900 dark:bg-emerald-600 text-white"
                    : "border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 text-gray-600 dark:text-gray-300"
                }`}
              >
                <p className={`font-bold ${option.previewClassName}`}>A</p>
                <p className="text-sm mt-2 font-semibold">{option.label}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand dark:text-emerald-400 font-bold mb-2">Backup</p>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Local Data Export and Import</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-5">
            Create a local backup file or restore one when you switch devices or reinstall. Points data is included automatically.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-white text-sm font-semibold transition-colors ${
                isExporting
                  ? "bg-gray-400 dark:bg-emerald-900 cursor-not-allowed"
                  : "bg-gray-900 dark:bg-emerald-600 hover:bg-brand dark:hover:bg-emerald-500"
              }`}
            >
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              <span>{isExporting ? "Exporting..." : "Export local data"}</span>
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
          {exportError && <p className="text-sm text-red-500 dark:text-red-400 mt-4">{exportError}</p>}
          {importError && <p className="text-sm text-red-500 dark:text-red-400 mt-4">{importError}</p>}
          <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />
        </section>
      </div>

      {showImportConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Import backup</h3>
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
              Importing will replace your current local data, including points and reading history.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleCancelImport}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:text-gray-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:text-gray-100 dark:hover:bg-slate-800"
              >
                Import now
              </button>
            </div>
          </div>
        </div>
      )}

      {exportSuccessInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Export complete</h3>
            <p className="mt-3 whitespace-pre-line break-all text-sm leading-6 text-gray-600 dark:text-gray-300">{exportSuccessInfo}</p>
            <button
              type="button"
              onClick={() => setExportSuccessInfo(null)}
              className="mt-6 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 dark:border-slate-600 dark:text-gray-100 dark:hover:bg-slate-800"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {importSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Import complete</h3>
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
              Your local data has been restored. The page will refresh automatically.
            </p>
            <div className="mt-5 flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700 dark:border-slate-600 dark:border-t-gray-200" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
