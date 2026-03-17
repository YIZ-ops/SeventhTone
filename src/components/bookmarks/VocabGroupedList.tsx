import { motion } from "motion/react";
import type { VocabWord } from "../../types";
import type { GroupedItems } from "./types";
import SwipeRow from "./SwipeRow";

interface VocabGroupedListProps {
  groups: GroupedItems<VocabWord>[];
  onDelete: (vocabId: string) => void;
}

export default function VocabGroupedList({ groups, onDelete }: VocabGroupedListProps) {
  return (
    <>
      {groups.map((group) => (
        <div key={group.label} className="mb-4">
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-1">{group.label}</p>
          <div className="space-y-2">
            {group.items.map((word, index) => (
              <motion.div key={word.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }}>
                <SwipeRow onDelete={() => onDelete(word.id)}>
                  <div className="bg-white dark:bg-slate-800 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/60 transition-colors">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-base font-bold text-gray-900 dark:text-gray-100">{word.word}</span>
                      {word.phonetic && <span className="text-xs font-mono text-gray-400 dark:text-gray-500">/{word.phonetic}/</span>}
                    </div>
                    {word.translations.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">{word.translations.join("；")}</p>
                    )}
                  </div>
                </SwipeRow>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
