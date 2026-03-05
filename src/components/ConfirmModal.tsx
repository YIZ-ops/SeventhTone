import { motion, AnimatePresence } from "motion/react";
import { AlertCircle } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "default";
}

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  variant = "danger",
}: ConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden"
          >
            <div className="p-6 sm:p-8 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 mb-5">
                <AlertCircle size={28} className={variant === "danger" ? "text-red-500" : "text-gray-600"} />
              </div>
              <h3 className="text-lg font-serif font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
            </div>
            <div className="flex border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-4 text-sm font-semibold text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <span className="w-px bg-gray-100" />
              <button
                type="button"
                onClick={handleConfirm}
                className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                  variant === "danger"
                    ? "text-red-600 hover:bg-red-50 hover:text-red-700"
                    : "text-gray-900 hover:bg-gray-100"
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
