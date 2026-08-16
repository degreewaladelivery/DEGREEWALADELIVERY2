package com.degreewalamobile

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder

/**
 * Keeps the app alive while an agent is carrying a delivery.
 *
 * Android stops location updates for a backgrounded app. An agent switches to
 * Maps to navigate or pockets their phone within seconds of accepting a job, so
 * without this the customer's live tracking freezes for the entire delivery —
 * exactly when they are watching it.
 *
 * The service itself does no locating. It exists so the process counts as
 * foreground, letting the JS geolocation watch that is already running keep
 * delivering fixes. One job, visible to the agent, easy to reason about.
 */
class DeliveryLocationService : Service() {

  companion object {
    private const val CHANNEL_ID = "dw-delivery-tracking"
    private const val NOTIFICATION_ID = 4711

    fun start(context: Context) {
      val intent = Intent(context, DeliveryLocationService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, DeliveryLocationService::class.java))
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    startForeground(NOTIFICATION_ID, buildNotification())
    // Restart if Android kills us under memory pressure — a delivery in progress
    // should not silently stop reporting.
    return START_STICKY
  }

  private fun buildNotification(): Notification {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Delivery tracking",
        // Low: the agent should be able to see it, never be interrupted by it.
        NotificationManager.IMPORTANCE_LOW
      ).apply {
        description = "Shown while you are sharing your location on a delivery"
        setShowBadge(false)
      }
      getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    // Tapping it returns to the app rather than launching a second copy.
    val launch = packageManager.getLaunchIntentForPackage(packageName)?.apply {
      flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    val pending = PendingIntent.getActivity(
      this,
      0,
      launch,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this)
    }

    return builder
      .setContentTitle("Delivery in progress")
      .setContentText("Sharing your location with the customer")
      .setSmallIcon(android.R.drawable.ic_menu_mylocation)
      .setContentIntent(pending)
      .setOngoing(true)
      .build()
  }
}
