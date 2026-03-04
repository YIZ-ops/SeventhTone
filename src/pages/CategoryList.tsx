import { Link } from "react-router-dom";
import { CATEGORIES } from "../constants";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

export default function CategoryList() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
      <header className="mb-12">
        <div className="flex items-center space-x-2 mb-2">
          <span className="h-px w-8 bg-brand"></span>
          <span className="text-xs font-bold tracking-[0.2em] text-brand uppercase">Explore</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 tracking-tight">Sections</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {CATEGORIES.map((category, index) => (
          <motion.div key={category.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
            <Link
              to={`/category/${category.id}`}
              className="group block relative h-full bg-white p-8 rounded-3xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 active:scale-[0.98] overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <ArrowRight className="text-brand" size={24} />
              </div>

              <div className="relative z-10">
                <span className="inline-block text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase mb-4 group-hover:text-brand transition-colors">
                  {index + 1 < 10 ? `0${index + 1}` : index + 1}
                </span>
                <h2 className="text-2xl font-bold text-emerald-600 mb-4 tracking-tight group-hover:translate-x-1 transition-transform duration-300">
                  {category.title}
                </h2>
                <p className="text-gray-500 leading-relaxed text-sm md:text-base line-clamp-3 group-hover:text-gray-600 transition-colors">
                  {category.description}
                </p>
              </div>

              {/* Subtle background accent */}
              <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-brand/5 rounded-full blur-3xl group-hover:bg-brand/10 transition-colors duration-500"></div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
