import { Link } from "react-router-dom";
import { motion } from "motion/react";
import type { Bookmark } from "../../types";
import type { GroupedItems } from "./types";
import SwipeRow from "./SwipeRow";

interface BookmarksGroupedListProps {
  groups: GroupedItems<Bookmark>[];
  onDelete: (contId: number) => void;
}

export default function BookmarksGroupedList({ groups, onDelete }: BookmarksGroupedListProps) {
  return (
    <>
      {groups.map((group) => (
        <div key={group.label} className="mb-4">
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 px-1">{group.label}</p>
          <div className="space-y-2">
            {group.items.map((bookmark, index) => (
              <motion.div
                key={bookmark.news.contId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <SwipeRow onDelete={() => onDelete(bookmark.news.contId)}>
                  <Link
                    to={`/news/${bookmark.news.contId}`}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 group hover:bg-gray-50 dark:hover:bg-slate-700/60 transition-colors"
                  >
                    <img
                      src={bookmark.news.pic || bookmark.news.appHeadPic}
                      alt={bookmark.news.name}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 bg-gray-100 dark:bg-slate-700"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug mb-1 group-hover:text-brand dark:group-hover:text-emerald-400 transition-colors">
                        {bookmark.news.name}
                      </h3>
                      {bookmark.news.userInfo && (
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{bookmark.news.userInfo.name}</p>
                      )}
                    </div>
                  </Link>
                </SwipeRow>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
