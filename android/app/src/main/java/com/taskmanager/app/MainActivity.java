package com.taskmanager.app;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private int insetTopDp = 0;
    private int insetBottomDp = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();

        // Draw behind system bars (edge-to-edge)
        window.getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        );

        // Make system bars transparent so the app bg shows through
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);

        // Use light status bar icons on dark background
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            // Clear the light status bar flag — we want white icons on dark bg
            window.getDecorView().setSystemUiVisibility(
                window.getDecorView().getSystemUiVisibility()
                & ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
            );
        }

        final float density = getResources().getDisplayMetrics().density;
        final WebView webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        webView.setOnApplyWindowInsetsListener((view, insets) -> {
            // Convert raw pixel insets to dp for use in CSS
            insetTopDp = Math.round(insets.getSystemWindowInsetTop() / density);
            insetBottomDp = Math.round(insets.getSystemWindowInsetBottom() / density);
            applyInsetVariables(webView);
            return insets;
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                applyInsetVariables(view);
            }
        });
        webView.loadUrl("file:///android_asset/index.html");

        setContentView(webView);
    }

    private void applyInsetVariables(WebView webView) {
        String js = "document.documentElement.style.setProperty('--android-safe-top','" + insetTopDp + "px');"
            + "document.documentElement.style.setProperty('--android-safe-bottom','" + insetBottomDp + "px');";
        webView.evaluateJavascript(js, null);
    }

    @Override
    public void onBackPressed() {
        super.onBackPressed();
    }
}
