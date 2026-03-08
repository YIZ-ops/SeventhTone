import { registerPlugin } from "@capacitor/core";

export interface TextSelectionHighlightPlugin {
  addListener(
    eventName: "highlightSelection",
    listener: (e: { selectedText: string }) => void
  ): Promise<{ remove: () => Promise<void> }>;
  /** 在 Android 上启用原生选择菜单中的「高亮」项（仅 Android 有效） */
  enable(): Promise<void>;
}

const TextSelectionHighlight = registerPlugin<TextSelectionHighlightPlugin>(
  "TextSelectionHighlight"
);

export default TextSelectionHighlight;
