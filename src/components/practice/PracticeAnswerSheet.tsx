import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import type { AnswerStatus, PracticeEntryType, PracticeSectionMeta, PracticeSheetSection } from "./types";

interface PracticeAnswerSheetProps<TEntry> {
  open: boolean;
  currentIndex: number;
  sections: PracticeSheetSection<TEntry>[];
  sectionMeta: Record<PracticeEntryType, PracticeSectionMeta>;
  getStatus: (entry: TEntry) => AnswerStatus;
  onJump: (index: number) => void;
  onClose: () => void;
}

function statusDotCls(status: AnswerStatus) {
  if (status === "correct") return "bg-emerald-500 text-white";
  if (status === "wrong") return "bg-red-500 text-white";
  if (status === "answered") return "bg-blue-500 text-white";
  return "bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500";
}

export default function PracticeAnswerSheet<TEntry,>({
  open,
  currentIndex,
  sections,
  sectionMeta,
  getStatus,
  onJump,
  onClose,
}: PracticeAnswerSheetProps<TEntry>) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 340 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 rounded-t-2xl pb-safe"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 dark:bg-slate-600 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-slate-700">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">答题卡 · Answer Sheet</h3>
              <button onClick={onClose} className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4 max-h-72 overflow-y-auto">
              {sections.map((section) => {
                const meta = sectionMeta[section.type];
                return (
                  <div key={section.type}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${meta.accent}`}>{meta.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {section.entries.map(({ entry, globalIdx }, index) => {
                        const status = getStatus(entry);
                        const isCurrent = currentIndex === globalIdx;
                        return (
                          <button
                            key={`${section.type}-${globalIdx}`}
                            onClick={() => onJump(globalIdx)}
                            className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${statusDotCls(status)} ${isCurrent ? `ring-2 ring-offset-2 ${meta.ring}` : ""}`}
                          >
                            {section.type === "summary" ? "S" : index + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <div className="flex flex-wrap gap-3 pt-1 border-t border-gray-100 dark:border-slate-700">
                {[
                  { cls: "bg-emerald-500", label: "Correct" },
                  { cls: "bg-red-500", label: "Wrong" },
                  { cls: "bg-blue-500", label: "Answered" },
                  { cls: "bg-gray-100 dark:bg-slate-700", label: "Pending" },
                ].map(({ cls, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-full ${cls}`} />
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
