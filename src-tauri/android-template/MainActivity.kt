package com.kraken.portstation

import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.webkit.JavascriptInterface
import android.webkit.URLUtil
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  @SuppressLint("JavascriptInterface")
  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)
    val bridge = PortStationBridge(this)
    webView.addJavascriptInterface(bridge, "PortStationAndroid")
    webView.setDownloadListener { url, _, contentDisposition, mimeType, _ ->
      val guessedName = URLUtil.guessFileName(url, contentDisposition, mimeType) ?: "portstation-package.apk"
      bridge.downloadFile(url, guessedName)
    }
  }
}

class PortStationBridge(private val activity: MainActivity) {
  @JavascriptInterface
  fun downloadFile(url: String, fileName: String): String {
    return try {
      val safeName = fileName.replace(Regex("[^a-zA-Z0-9._-]"), "_").ifEmpty { "portstation-package.apk" }
      val dm = activity.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
      val request = DownloadManager.Request(Uri.parse(url))
        .setTitle(safeName)
        .setDescription("Descargando paquete desde PortStation")
        .addRequestHeader("User-Agent", "Mozilla/5.0 (Linux; Android 14) PortStation/0.1.1")
        .addRequestHeader("Accept", "application/octet-stream, */*")
        .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
        .setAllowedOverMetered(true)
        .setAllowedOverRoaming(true)
        .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, safeName)
      if (safeName.lowercase().endsWith(".apk")) {
        request.setMimeType("application/vnd.android.package-archive")
      }
      val id = dm.enqueue(request)
      "OK:$id"
    } catch (e: Exception) {
      try {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        activity.startActivity(intent)
        "BROWSER"
      } catch (e2: Exception) {
        "ERROR:${e.message}"
      }
    }
  }

  @JavascriptInterface
  fun openExternalUrl(url: String): Boolean {
    return try {
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      activity.startActivity(intent)
      true
    } catch (_: Exception) {
      false
    }
  }

  @JavascriptInterface
  fun openDownloads(): Boolean {
    return try {
      val intent = Intent(DownloadManager.ACTION_VIEW_DOWNLOADS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      activity.startActivity(intent)
      true
    } catch (_: Exception) {
      false
    }
  }

  @JavascriptInterface
  fun getInstalledPackages(): String {
    return try {
      val pm = activity.packageManager
      val apps = pm.getInstalledApplications(0)
      apps.mapNotNull { info ->
        val isSystem = (info.flags and ApplicationInfo.FLAG_SYSTEM) != 0 &&
          (info.flags and ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) == 0
        if (!isSystem && info.packageName != activity.packageName) {
          val label = try {
            pm.getApplicationLabel(info).toString().replace("\n", " ").replace("|", " ")
          } catch (_: Exception) {
            ""
          }
          "${info.packageName}|$label"
        } else {
          null
        }
      }.joinToString("\n")
    } catch (_: Exception) {
      ""
    }
  }

  @JavascriptInterface
  fun launchPackage(packageName: String): Boolean {
    return try {
      val cleanPkg = packageName.trim().removePrefix("package:")
      val intent = activity.packageManager.getLaunchIntentForPackage(cleanPkg)
      if (intent != null) {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        activity.startActivity(intent)
        true
      } else {
        false
      }
    } catch (_: Exception) {
      false
    }
  }
}
