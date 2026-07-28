package com.ssk53

import android.app.Activity
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient

class PermissionsRationaleActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val webView = WebView(this)

    webView.webViewClient = WebViewClient()

    webView.loadData(
      """
      <html>
        <body style="font-family: sans-serif; padding: 24px;">
          <h2>CareMate+ Health Permissions</h2>
          <p>
            CareMate+ uses Health Connect to read patient-approved vitals such as
            heart rate, oxygen saturation, blood pressure, glucose and temperature.
          </p>
          <p>
            This data is used only to display vitals, save readings to the CareMate+
            backend, and support dashboard/safety features in this prototype.
          </p>
        </body>
      </html>
      """.trimIndent(),
      "text/html",
      "UTF-8"
    )

    setContentView(webView)
  }
}