package com.bethesda.track;

import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setSupportZoom(true);
            settings.setBuiltInZoomControls(true);
            settings.setDisplayZoomControls(false);
            webView.addJavascriptInterface(new BethesdaDownloader(), "BethesdaDownloader");
        }

        if (getBridge() != null) {
            getBridge().addWebViewListener(new WebViewListener() {
                @Override
                public void onPageLoaded(WebView webView) {
                    injectDownloadInterceptor(webView);
                }
            });
        }

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                    return;
                }

                setEnabled(false);
                getOnBackPressedDispatcher().onBackPressed();
            }
        });
    }

    private void injectDownloadInterceptor(WebView webView) {
        String script =
            "(function(){" +
            "if(window.__bethesdaDownloadPatch)return;window.__bethesdaDownloadPatch=true;" +
            "function showToast(message,type){" +
            "var id='bethesda-download-toast';var el=document.getElementById(id);" +
            "if(!el){el=document.createElement('div');el.id=id;document.body.appendChild(el);}" +
            "el.textContent=message;" +
            "el.style.cssText='position:fixed;left:50%;top:calc(env(safe-area-inset-top) + 14px);transform:translateX(-50%);z-index:2147483647;max-width:calc(100vw - 28px);padding:12px 16px;border-radius:18px;background:'+(type==='error'?'#dc2626':'#111827')+';color:white;font:800 13px system-ui,-apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 18px 45px rgba(15,23,42,.24);text-align:center;line-height:1.35;';" +
            "clearTimeout(window.__bethesdaDownloadToastTimer);" +
            "window.__bethesdaDownloadToastTimer=setTimeout(function(){if(el&&el.parentNode)el.parentNode.removeChild(el);},type==='progress'?12000:4200);" +
            "}" +
            "function filenameFromAnchor(anchor){return(anchor&&(anchor.download||anchor.getAttribute('download')))||'bethesda-download';}" +
            "async function saveHref(href,filename){" +
            "if(!href||!(href.indexOf('blob:')===0||href.indexOf('data:')===0)||!window.BethesdaDownloader||!window.BethesdaDownloader.saveBase64)return false;" +
            "showToast('Mengunduh file...', 'progress');" +
            "try{" +
            "var response=await fetch(href);var blob=await response.blob();" +
            "var reader=new FileReader();" +
            "reader.onload=function(){try{var dataUrl=String(reader.result||'');var base64=dataUrl.split(',')[1]||'';var result=window.BethesdaDownloader.saveBase64(blob.type||'application/octet-stream',filename||'bethesda-download',base64);if(result&&result.indexOf('error:')===0){showToast(result.replace(/^error:\\s*/,''),'error');}else{showToast('Unduhan selesai. Cek folder Downloads.','success');}}catch(error){showToast('Gagal mengunduh: '+(error.message||error),'error');}};" +
            "reader.onerror=function(){showToast('Gagal membaca file unduhan.','error');};" +
            "reader.readAsDataURL(blob);return true;" +
            "}catch(error){showToast('Gagal mengunduh: '+(error.message||error),'error');return true;}" +
            "}" +
            "var nativeClick=HTMLAnchorElement.prototype.click;" +
            "HTMLAnchorElement.prototype.click=function(){" +
            "var href=this.href||this.getAttribute('href')||'';" +
            "if((href.indexOf('blob:')===0||href.indexOf('data:')===0)&&window.BethesdaDownloader&&window.BethesdaDownloader.saveBase64){saveHref(href,filenameFromAnchor(this));return;}" +
            "return nativeClick.apply(this,arguments);" +
            "};" +
            "document.addEventListener('click',function(event){" +
            "var target=event.target;var anchor=target&&target.closest?target.closest('a[download]'):null;if(!anchor)return;" +
            "var href=anchor.href||anchor.getAttribute('href')||'';" +
            "if(href.indexOf('blob:')===0||href.indexOf('data:')===0){event.preventDefault();event.stopImmediatePropagation();saveHref(href,filenameFromAnchor(anchor));}" +
            "},true);" +
            "})();";

        webView.post(() -> webView.evaluateJavascript(script, null));
    }

    public class BethesdaDownloader {
        @JavascriptInterface
        public String saveBase64(String mimeType, String filename, String base64Data) {
            try {
                byte[] data = Base64.decode(base64Data, Base64.DEFAULT);
                String safeFilename = filename == null || filename.trim().isEmpty()
                    ? "bethesda-download"
                    : filename.replaceAll("[\\\\/:*?\"<>|]", "-");

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Downloads.DISPLAY_NAME, safeFilename);
                    values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
                    values.put(MediaStore.Downloads.IS_PENDING, 1);

                    Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri == null) return "error: Tidak dapat membuat file unduhan.";

                    try (OutputStream outputStream = getContentResolver().openOutputStream(uri)) {
                        if (outputStream == null) return "error: Tidak dapat membuka file unduhan.";
                        outputStream.write(data);
                    }

                    values.clear();
                    values.put(MediaStore.Downloads.IS_PENDING, 0);
                    getContentResolver().update(uri, values, null, null);
                    return "ok";
                }

                File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                if (!downloadsDir.exists()) downloadsDir.mkdirs();
                File file = new File(downloadsDir, safeFilename);
                try (OutputStream outputStream = new FileOutputStream(file)) {
                    outputStream.write(data);
                }
                return "ok";
            } catch (Exception exception) {
                return "error: " + exception.getMessage();
            }
        }
    }
}
