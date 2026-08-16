package com.degreewalamobile

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Lets the agent screen start and stop the foreground service that keeps
 * location flowing while the app is off screen.
 */
class DeliveryTrackingModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "DeliveryTracking"

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
}
