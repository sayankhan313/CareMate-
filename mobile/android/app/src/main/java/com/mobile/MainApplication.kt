package com.mobile

import android.app.Application
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  companion object {
    const val GENERAL_NOTIFICATION_CHANNEL_ID = "caremate_general_v2"
    const val HIGH_NOTIFICATION_CHANNEL_ID = "caremate_high_v2"
    const val CRITICAL_NOTIFICATION_CHANNEL_ID = "caremate_critical_v2"
  }

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList = PackageList(this).packages.apply {
      },
    )
  }

  override fun onCreate() {
    super.onCreate()
    createNotificationChannels()
    loadReactNative(this)
  }

  private fun createNotificationChannels() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val notificationManager = getSystemService(NotificationManager::class.java)
    val notificationSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
    val audioAttributes = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build()

    val generalChannel = NotificationChannel(
      GENERAL_NOTIFICATION_CHANNEL_ID,
      "General updates",
      NotificationManager.IMPORTANCE_DEFAULT,
    ).apply {
      description = "General CareMate+ account, report and medicine updates."
      enableVibration(true)
      setSound(notificationSound, audioAttributes)
      lockscreenVisibility = Notification.VISIBILITY_PRIVATE
    }

    val highChannel = NotificationChannel(
      HIGH_NOTIFICATION_CHANNEL_ID,
      "Important updates",
      NotificationManager.IMPORTANCE_HIGH,
    ).apply {
      description = "Important consultation, medicine review and care-team updates."
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 250, 180, 250)
      setSound(notificationSound, audioAttributes)
      lockscreenVisibility = Notification.VISIBILITY_PRIVATE
    }

    val criticalChannel = NotificationChannel(
      CRITICAL_NOTIFICATION_CHANNEL_ID,
      "Critical safety alerts",
      NotificationManager.IMPORTANCE_HIGH,
    ).apply {
      description = "Critical Safety Response and vital-sign alerts requiring attention."
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 500, 250, 500, 250, 500)
      enableLights(true)
      setSound(notificationSound, audioAttributes)
      lockscreenVisibility = Notification.VISIBILITY_PRIVATE
    }

    notificationManager.createNotificationChannels(listOf(generalChannel, highChannel, criticalChannel))
  }
}