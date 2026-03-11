package com.example.myapp;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

import org.json.JSONArray;

/**
 * 负责向前端发送「高亮选中文本」事件。
 * 实际的 ActionMode 菜单注入由 MainActivity.onActionModeStarted 完成，
 * 不需要在 WebView 上设置任何 Callback（这样对所有 Android 6.0+ 的 floating ActionMode 都有效）。
 */
@CapacitorPlugin(name = "TextSelectionHighlight")
public class TextSelectionHighlightPlugin extends Plugin {

    @PluginMethod
    public void enable(PluginCall call) {
        // 前端调用 enable() 表示「我已准备好监听事件」；
        // 实际菜单注入在 MainActivity，这里只需 resolve 即可。
        call.resolve();
    }

    /** 由 MainActivity 在用户点击「高亮」菜单项后调用，把选中文本发给前端 */
    public void sendHighlightEvent(String selectedText) {
        JSObject data = new JSObject();
        data.put("selectedText", selectedText);
        notifyListeners("highlightSelection", data);
    }

    /** 解析 evaluateJavascript 返回的 JSON 字符串（如 "\"hello\""）为纯文本 */
    public static String unquoteJsonString(String value) {
        if (value == null || "null".equals(value.trim())) return "";
        try {
            return new JSONArray("[" + value + "]").getString(0);
        } catch (Exception e) {
            return "";
        }
    }
}
