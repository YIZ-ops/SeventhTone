package com.example.myapp;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginHandle;

/**
 * 通过 activity-alias（label="高亮"）注册 android.intent.action.PROCESS_TEXT，
 * 让"高亮"按钮直接出现在 Android 系统文本选择浮动工具栏中。
 *
 * 由于 MainActivity 是 singleTask，从工具栏点击"高亮"时：
 *   - App 已在前台/后台 → onNewIntent 被调用，不会新建 Activity
 *   - App 未运行（冷启动） → onCreate 被调用，同样处理 intent
 */
public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(TextSelectionHighlightPlugin.class);
        super.onCreate(savedInstanceState);
        // 冷启动时 App 尚未运行，Bridge 在 super.onCreate 之后就绪
        handleProcessTextIntent(getIntent());
    }

    /** singleTask 复用场景：App 已运行时系统调用 onNewIntent 而非 onCreate */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleProcessTextIntent(intent);
    }

    private void handleProcessTextIntent(Intent intent) {
        if (intent == null || !Intent.ACTION_PROCESS_TEXT.equals(intent.getAction())) return;

        // EXTRA_PROCESS_TEXT_READONLY 是系统推荐的只读副本
        CharSequence text = intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT_READONLY);
        if (text == null) {
            text = intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT);
        }
        if (text == null || text.toString().trim().length() < 2) return;

        final String selectedText = text.toString().trim();

        // 确保在主线程且 Bridge 就绪后发送事件
        runOnUiThread(() -> {
            if (getBridge() == null) return;
            PluginHandle handle = getBridge().getPlugin("TextSelectionHighlight");
            if (handle != null && handle.getInstance() instanceof TextSelectionHighlightPlugin) {
                ((TextSelectionHighlightPlugin) handle.getInstance()).sendHighlightEvent(selectedText);
            }
        });
    }
}
