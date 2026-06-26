package com.rawpointer

import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event
import com.facebook.react.uimanager.events.RCTEventEmitter

/**
 * RawPointerEvent — bridges native touch data to JS.
 *
 * Extends [Event] to support both:
 *   - New Architecture: dispatched via EventDispatcher → JSI (no bridge)
 *   - Old Architecture: dispatched via RCTEventEmitter → bridge
 *
 * Note: field is named `jsEventName` (not `eventName`) to avoid hiding
 * the `eventName` property declared in the Event supertype.
 */
internal class RawPointerEvent(
  surfaceId: Int,
  viewId: Int,
  private val jsEventName: String,
  private val payload: WritableMap,
) : Event<RawPointerEvent>(surfaceId, viewId) {

  override fun getEventName(): String = jsEventName

  /**
   * New Architecture path — Fabric's C++ EventDispatcher calls this to get
   * the event payload. The base-class default returns null, which causes an
   * empty nativeEvent in JS (all fields undefined → NaN in calculations).
   *
   * MUST be overridden when using EventDispatcher.dispatchEvent() in Fabric.
   */
  override fun getEventData(): WritableMap = payload

  /** Old Architecture path — intentionally deprecated, kept as fallback */
  @Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
  override fun dispatch(rctEventEmitter: RCTEventEmitter) {
    rctEventEmitter.receiveEvent(viewTag, jsEventName, payload)
  }
}
