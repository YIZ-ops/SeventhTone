import { Image as ImageIcon } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import type { Sentence } from "../../types";
import type { GroupedItems } from "./types";
import SwipeRow from "./SwipeRow";

interface SentencesGroupedListProps {
  groups: GroupedItems<Sentence>[];
  onDelete: (contId: number, sentenceId: string) => void;
  onOpenQuote: (sentence: Sentence) => void;
}

export default function SentencesGroupedList({ groups, onDelete, onOpenQuote }: SentencesGroupedListProps) {
  return (
    <>
      {groups.map((group) => (
        <div key={group.label} className="mb-4">
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-1">{group.label}</p>
          <div className="space-y-2">
            {group.items.map((sentence, index) => (
              <motion.div key={sentence.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
                <SwipeRow onDelete={() => onDelete(sentence.contId, sentence.id)}>
                  <div className="relative bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/60 transition-colors">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onOpenQuote(sentence);
                      }}
                      className="absolute top-2.5 right-2.5 p-1.5 rounded-full text-gray-500 dark:text-gray-500 hover:text-brand dark:hover:text-emerald-400 hover:bg-brand/5 dark:hover:bg-emerald-500/10 transition-colors z-10"
                      title="Generate quote image"
                    >
                      <ImageIcon size={14} />
                    </button>
                    <Link to={`/news/${sentence.contId}`} className="block px-4 py-4 pr-10">
                      <div className="relative pl-7">
                        <span
                          className="absolute left-0 top-0 text-2xl font-serif text-brand/20 dark:text-emerald-400/20 leading-none select-none"
                          aria-hidden
                        >
                          &ldquo;
                        </span>
                        <p className="text-sm text-gray-700 dark:text-gray-200 font-serif leading-relaxed italic line-clamp-3">{sentence.text}</p>
                        {sentence.thought && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2">{sentence.thought}</p>}
                        <span className="text-[11px] text-brand dark:text-emerald-400 font-medium mt-2 block truncate">
                          {sentence.newsName || "Unknown news"}
                        </span>
                      </div>
                    </Link>
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
