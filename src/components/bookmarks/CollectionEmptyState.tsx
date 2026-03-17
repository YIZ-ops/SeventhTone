import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface CollectionEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
}

export default function CollectionEmptyState({ icon: Icon, title, description }: CollectionEmptyStateProps) {
  return (
    <div className="text-center py-32 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-600 shadow-sm">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 dark:bg-slate-700 mb-6">
        <Icon size={32} className="text-gray-200 dark:text-gray-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h2>
      <p className="text-gray-400 dark:text-gray-500 text-sm max-w-xs mx-auto">{description}</p>
    </div>
  );
}
