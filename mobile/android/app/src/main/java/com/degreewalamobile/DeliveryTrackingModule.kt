package com.degreewalamobile

import android.app.Activity
import android.content.Intent
import android.content.IntentSender
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.gms.common.api.ResolvableApiException
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.LocationSettingsRequest
import com.google.android.gms.location.Priority

/**
 * Native bits the delivery flow needs: the foreground service that keeps an
 * agent's location reporting, and Android's own "turn on location" dialog.
 */
class DeliveryTrackingModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  companion object {
    private const val ENABLE_LOCATION_REQUEST = 8_431
  }

  private var pendingPrompt: Promise? = null

  private val activityListener: ActivityEventListener =
    object : BaseActivityEventListener() {
      override fun onActivityResult(
        activity: Activity,
        requestCode: Int,
        resultCode: Int,
        data: Intent?
      ) {
        if (requestCode != ENABLE_LOCATION_REQUEST) return
        // RESULT_OK means they tapped the dialog's confirm and location is now on.
        pendingPrompt?.resolve(resultCode == Activity.RESULT_OK)
        pendingPrompt = null
      }
    }

  init {
    reactContext.addActivityEventListener(activityListener)
  }

  override fun getName() = "DeliveryTracking"

  /**
   * Which of the two apps this build is.
   *
   * The customer app and the delivery partner app share one codebase and are
   * separated by a Gradle flavour; JavaScript needs to know which one it is
   * running inside to choose a root screen. Exposed as a constant rather than a
   * method so it is available before the first render, with no async gap where
   * the wrong app could flash on screen.
   */
  override fun getConstants(): MutableMap<String, Any> =
    hashMapOf("isAgentApp" to BuildConfig.IS_AGENT_APP)

  @ReactMethod
  fun start(promise: Promise) {
    try {
      DeliveryLocationService.start(reactApplicationContext)
      promise.resolve(true)
    } catch (e: Exception) {
      // Losing background tracking must not break the delivery flow — the agent
      // can still work, the customer just sees a staler position.
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    try {
      DeliveryLocationService.stop(reactApplicationContext)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  /**
   * Ask Android to switch location on, in place.
   *
   * Sending someone into Settings to find a toggle loses most of them. Play
   * Services offers a dialog that turns it on without leaving the app — the
   * one every other delivery app uses. Resolves true when location is usable
   * afterwards, false if they declined or the device can't offer it.
   */
  @ReactMethod
  fun promptEnableLocation(promise: Promise) {
    val activity: Activity? = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.resolve(false)
      return
    }

    val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 10_000L).build()
    val settings = LocationSettingsRequest.Builder()
      .addLocationRequest(request)
      // Show the dialog even when the user has dismissed it before; without
      // this Play Services can silently decline to ask again.
      .setAlwaysShow(true)
      .build()

    LocationServices.getSettingsClient(activity)
      .checkLocationSettings(settings)
      .addOnSuccessListener {
        // Already on — nothing to ask.
        promise.resolve(true)
      }
      .addOnFailureListener { error ->
        if (error !is ResolvableApiException) {
          // No Play Services, or location is unavailable for a reason the user
          // cannot fix from a dialog.
          promise.resolve(false)
          return@addOnFailureListener
        }
        try {
          pendingPrompt = promise
          error.startResolutionForResult(activity, ENABLE_LOCATION_REQUEST)
        } catch (_: IntentSender.SendIntentException) {
          pendingPrompt = null
          promise.resolve(false)
        }
      }
  }
}
