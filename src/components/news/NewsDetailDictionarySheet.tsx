import { type RefObject } from "react";
import { BookmarkCheck, BookmarkPlus, Loader2, Volume2, X } from "lucide-react";

export interface DictPhrase {
  p_cn: string;
  p_content: string;
}

export interface DictRelWordHwd {
  hwd: string;
  tran: string;
}

export interface DictRelWord {
  Hwds: DictRelWordHwd[];
  Pos: string;
}

export interface DictSentence {
  s_cn: string;
  s_content: string;
}

export interface DictSynonymHwd {
  word: string;
}

export interface DictSynonym {
  Hwds: DictSynonymHwd[];
  pos: string;
  tran: string;
}

export interface DictTranslation {
  pos: string;
  tran_cn: string;
}

export interface DictData {
  word: string;
  bookId?: string;
  ukphone?: string;
  ukspeech?: string;
  usphone?: string;
  usspeech?: string;
  phrases?: DictPhrase[];
  relWords?: DictRelWord[];
  sentences?: DictSentence[];
  synonyms?: DictSynonym[];
  translations?: DictTranslation[];
}

export interface DictionaryPopupState {
  x: number;
  y: number;
  word: string;
}

interface NewsDetailDictionarySheetProps {
  popup: DictionaryPopupState | null;
  audioRef: RefObject<HTMLAudioElement | null>;
  data: DictData | null;
  loading: boolean;
  error: string | null;
  wordInVocab: boolean;
  onClose: () => void;
  onToggleVocab: () => void;
}

function playAudio(audioRef: RefObject<HTMLAudioElement | null>, url?: string) {
  if (!url) return;
  const element = audioRef.current;
  if (!element) return;
  element.src = url;
  element.play().catch(() => {});
}

export default function NewsDetailDictionarySheet({
  popup,
  audioRef,
  data,
  loading,
  error,
  wordInVocab,
  onClose,
  onToggleVocab,
}: NewsDetailDictionarySheetProps) {
  if (!popup) return null;

  return (
    <>
      <button
        type="button"
        data-popup
        aria-label="Close dictionary"
        className="fixed inset-0 z-[99] bg-black/30 backdrop-blur-sm cursor-default"
        onClick={onClose}
      />
      <div
        data-popup
        className="fixed inset-x-0 bottom-0 z-[100] h-[55vh] min-h-[280px] max-h-[85vh] flex flex-col rounded-t-2xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-600 border-b-0 md:left-1/2 md:right-auto md:top-auto md:w-[min(96vw,420px)] md:max-h-[70vh] md:min-h-0 md:rounded-b-2xl md:border-b md:-translate-x-1/2 md:bottom-6"
      >
        <audio ref={audioRef} className="hidden" />
        <div className="flex-shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 dark:border-slate-600 bg-gray-50/90 dark:bg-slate-700/50">
          <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{popup.word}</span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onToggleVocab}
              className={`p-1.5 rounded-full transition-colors ${
                wordInVocab
                  ? "text-emerald-500 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                  : "text-gray-400 dark:text-gray-500 hover:text-brand dark:hover:text-emerald-400 hover:bg-gray-100 dark:hover:bg-slate-600"
              }`}
              aria-label={wordInVocab ? "Remove from vocabulary" : "Add to vocabulary"}
              title={wordInVocab ? "Remove from vocabulary" : "Add to vocabulary"}
            >
              {wordInVocab ? <BookmarkCheck size={18} /> : <BookmarkPlus size={18} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600 hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain p-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
          )}
          {error && !loading && <p className="text-gray-500 dark:text-gray-400 text-sm py-6">{error}</p>}
          {data && !loading && (
            <div className="space-y-5 text-sm dark:text-gray-200">
              {(data.ukphone || data.usphone) && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  {data.ukphone && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">UK</span>
                      <span className="text-sm text-gray-600 dark:text-gray-500 font-mono">/{data.ukphone}/</span>
                      {data.ukspeech && (
                        <button
                          type="button"
                          onClick={() => playAudio(audioRef, data.ukspeech)}
                          className="p-1 rounded-full text-emerald-500 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                          aria-label="Play UK pronunciation"
                        >
                          <Volume2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                  {data.usphone && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">US</span>
                      <span className="text-sm text-gray-600 dark:text-gray-500 font-mono">/{data.usphone}/</span>
                      {data.usspeech && (
                        <button
                          type="button"
                          onClick={() => playAudio(audioRef, data.usspeech)}
                          className="p-1 rounded-full text-emerald-500 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                          aria-label="Play US pronunciation"
                        >
                          <Volume2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {data.translations && data.translations.length > 0 && (
                <section>
                  <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">Definitions</h4>
                  <ul className="space-y-1 list-none pl-0">
                    {data.translations.map((translation, index) => (
                      <li key={index} className="text-gray-800 dark:text-gray-200">
                        <span className="text-gray-500 dark:text-gray-400">{translation.pos}.</span> {translation.tran_cn}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {data.phrases && data.phrases.length > 0 && (
                <section>
                  <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">Phrases</h4>
                  <ul className="space-y-1.5 list-none pl-0">
                    {data.phrases.slice(0, 12).map((phrase, index) => (
                      <li key={index} className="text-gray-800 dark:text-gray-200">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{phrase.p_content}</span>
                        <span className="text-gray-500 dark:text-gray-400"> - {phrase.p_cn}</span>
                      </li>
                    ))}
                    {data.phrases.length > 12 && (
                      <li className="text-gray-400 dark:text-gray-500 text-xs">Total {data.phrases.length} phrases</li>
                    )}
                  </ul>
                </section>
              )}

              {data.relWords && data.relWords.length > 0 && (
                <section>
                  <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">Related words</h4>
                  <div className="space-y-2">
                    {data.relWords.map((group, index) => (
                      <div key={index}>
                        <span className="text-gray-500 dark:text-gray-400">{group.Pos}</span>{" "}
                        {group.Hwds.map((word, wordIndex) => (
                          <span key={wordIndex} className="text-gray-800 dark:text-gray-200">
                            {word.hwd}
                            <span className="text-gray-500 dark:text-gray-400"> {word.tran}</span>
                            {wordIndex < group.Hwds.length - 1 ? "; " : ""}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {data.synonyms && data.synonyms.length > 0 && (
                <section>
                  <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">Synonyms</h4>
                  <ul className="space-y-1 list-none pl-0">
                    {data.synonyms.map((synonym, index) => (
                      <li key={index} className="text-gray-800 dark:text-gray-200">
                        <span className="text-gray-500 dark:text-gray-400">{synonym.pos}</span> {synonym.tran}
                        {" - "}
                        {synonym.Hwds.map((word) => word.word).join(", ")}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {data.sentences && data.sentences.length > 0 && (
                <section>
                  <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">Example sentences</h4>
                  <ul className="space-y-2 list-none pl-0">
                    {data.sentences.slice(0, 5).map((sentence, index) => (
                      <li key={index} className="text-gray-800 dark:text-gray-200">
                        <p className="text-gray-900 dark:text-gray-100">{sentence.s_content}</p>
                        <p className="text-gray-500 dark:text-gray-400 italic mt-0.5">{sentence.s_cn}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
