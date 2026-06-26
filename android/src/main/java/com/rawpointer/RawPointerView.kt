package com.rawpointer

import android.content.Context
import android.util.AttributeSet
import android.view.MotionEvent
import android.widget.FrameLayout
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.UIManagerHelper

/**
 * RawPointerView — a FrameLayout that intercepts multi-touch events and
 * dispatches them as structured pointer events to JS.
 *
 * Extends FrameLayout (NOT View) so React Native children can be rendered
 * inside and positioned normally with layout.
 *
 * Multi-touch rules:
 *   ACTION_DOWN         → first finger (pointerIndex always 0)
 *   ACTION_POINTER_DOWN → additional fingers (extract index from actionIndex)
 *   ACTION_MOVE         → ALL active pointers report new position in one event
 *   ACTION_POINTER_UP   → one of multiple fingers lifts
 *   ACTION_UP           → last finger lifts
 *   ACTION_CANCEL       → system cancels the entire gesture
 *
 * ⚠️ Always use event.actionMasked (NOT event.action) and
 *    event.getPointerId(actionIndex) (NOT hardcoded 0) for multi-touch.
 */
class RawPointerView : FrameLayout {
  constructor(context: Context?) : super(context!!)
  constructor(context: Context?, attrs: AttributeSet?) : super(context!!, attrs)
  constructor(context: Context?, attrs: AttributeSet?, defStyleAttr: Int) : super(
    context!!,
    attrs,
    defStyleAttr
  )

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------

  private var behavior: String = "opaque"

  /**
   * When true, calls requestDisallowInterceptTouchEvent(true) on ACTION_DOWN
   * to prevent ancestor ScrollViews from stealing the touch.
   *
   * Default: false — safe for layouts where the joystick is NOT inside a
   * ScrollView. Only enable when you observe scroll-stealing issues.
   */
  private var disallowInterceptOnDown: Boolean = false

  /**
   * Screen density cached once — avoids DisplayMetrics lookup on every touch event.
   * Density is stable for the lifetime of a View; orientation/config changes
   * recreate the Activity and therefore all Views.
   */
  private val density: Float by lazy { context.resources.displayMetrics.density }

  /** Convert physical pixels → logical dp (React Native's coordinate space). */
  private fun toDp(pixels: Float): Float = pixels / density

  /**
   * Tracks last known position per pointerId for delta (dx, dy) calculation.
   * Key: stable pointerId from MotionEvent.getPointerId()
   * Value: FloatArray [lastX, lastY] in dp
   */
  private val lastPositions = HashMap<Int, FloatArray>()

  // -------------------------------------------------------------------------
  // Prop setter (called by RawPointerViewManager via @ReactProp)
  // -------------------------------------------------------------------------

  fun setBehavior(value: String) {
    behavior = value
    isEnabled = value != "transparent"
  }

  fun setDisallowInterceptTouchEvent(value: Boolean) {
    disallowInterceptOnDown = value
  }

  // -------------------------------------------------------------------------
  // Touch interception
  // -------------------------------------------------------------------------

  /**
   * Intercept touches BEFORE they reach React Native children (knob animation,
   * text label). Without this, Fabric processes the touch via the child view
   * hierarchy and RawPointerView.onTouchEvent is never reached.
   *
   * This ONLY intercepts events going to OUR children — siblings (buttons, other
   * joysticks) are unaffected. Split motion events from the parent ViewGroup
   * still route each finger's touch to the correct sibling independently.
   */
  override fun onInterceptTouchEvent(ev: MotionEvent): Boolean {
    return behavior == "opaque"
  }

  /**
   * Handle touch. Returns true on ACTION_DOWN to claim the pointer stream so
   * subsequent MOVE/UP events are delivered directly here.
   *
   * Calls requestDisallowInterceptTouchEvent so ancestor ViewGroups
   * (e.g. ScrollView, RN root) cannot steal our active touch sequence.
   */
  override fun onTouchEvent(event: MotionEvent): Boolean {
    if (behavior == "transparent") return false
    // requestDisallowInterceptTouchEvent is opt-in via the disallowInterceptTouchEvent prop.
    // Disabled by default so sibling Pressable/TouchableOpacity views remain clickable.
    // Enable when the view is inside a ScrollView to prevent scroll-stealing.
    if (disallowInterceptOnDown && event.actionMasked == MotionEvent.ACTION_DOWN) {
      parent?.requestDisallowInterceptTouchEvent(true)
    }
    processMotionEvent(event)
    return true
  }

  // -------------------------------------------------------------------------
  // Multi-touch processing
  // -------------------------------------------------------------------------

  private fun processMotionEvent(event: MotionEvent) {
    val timestamp = System.currentTimeMillis().toDouble()

    when (event.actionMasked) {

      MotionEvent.ACTION_DOWN -> {
        val pointerId = event.getPointerId(0)
        val x = toDp(event.x)
        val y = toDp(event.y)
        lastPositions[pointerId] = floatArrayOf(x, y)
        emit("onRawPointerDown", pointerId, x, y, 0f, 0f, event.pressure, timestamp)
      }

      MotionEvent.ACTION_POINTER_DOWN -> {
        val idx = event.actionIndex
        val pointerId = event.getPointerId(idx)
        val x = toDp(event.getX(idx))
        val y = toDp(event.getY(idx))
        lastPositions[pointerId] = floatArrayOf(x, y)
        emit("onRawPointerDown", pointerId, x, y, 0f, 0f, event.getPressure(idx), timestamp)
      }

      MotionEvent.ACTION_MOVE -> {
        // Android ACTION_MOVE reports ALL active pointer positions even if only
        // one finger moved. We skip pointers whose pixel position hasn't changed
        // to avoid spurious events (e.g. joystick A should not fire onRawPointerMove
        // when joystick B moves but A's finger is stationary).
        for (i in 0 until event.pointerCount) {
          val pointerId = event.getPointerId(i)
          val x = toDp(event.getX(i))
          val y = toDp(event.getY(i))

          val last = lastPositions[pointerId]
          val dx = if (last != null) x - last[0] else 0f
          val dy = if (last != null) y - last[1] else 0f

          // Skip if this pointer hasn't actually moved — avoids cross-pollination
          // of events between sibling RawPointerViews sharing the same touch session.
          if (last != null && dx == 0f && dy == 0f) continue

          lastPositions[pointerId] = floatArrayOf(x, y)
          emit("onRawPointerMove", pointerId, x, y, dx, dy, event.getPressure(i), timestamp)
        }
      }

      MotionEvent.ACTION_POINTER_UP -> {
        val idx = event.actionIndex
        val pointerId = event.getPointerId(idx)
        val x = toDp(event.getX(idx))
        val y = toDp(event.getY(idx))
        lastPositions.remove(pointerId)
        emit("onRawPointerUp", pointerId, x, y, 0f, 0f, event.getPressure(idx), timestamp)
      }

      MotionEvent.ACTION_UP -> {
        val pointerId = event.getPointerId(0)
        lastPositions.remove(pointerId)
        emit("onRawPointerUp", pointerId, toDp(event.x), toDp(event.y), 0f, 0f, event.pressure, timestamp)
      }

      MotionEvent.ACTION_CANCEL -> {
        for (i in 0 until event.pointerCount) {
          val pointerId = event.getPointerId(i)
          emit("onRawPointerCancel", pointerId, toDp(event.getX(i)), toDp(event.getY(i)), 0f, 0f, 0f, timestamp)
        }
        lastPositions.clear()
      }
    }
  }

  // -------------------------------------------------------------------------
  // Event dispatch — New Architecture (JSI) with Old Arch fallback
  // -------------------------------------------------------------------------

  private fun emit(
    eventName: String,
    pointerId: Int,
    x: Float,
    y: Float,
    dx: Float,
    dy: Float,
    pressure: Float,
    timestamp: Double,
  ) {
    val reactContext = context as? ReactContext ?: return

    // Global (screen) coordinates in dp — consistent with x/y which are already dp.
    // getLocationOnScreen() returns physical pixels so divide by density.
    val screen = IntArray(2)
    getLocationOnScreen(screen)
    val globalX = screen[0].toFloat() / density + x
    val globalY = screen[1].toFloat() / density + y

    val payload = Arguments.createMap().apply {
      putInt("pointerId", pointerId)
      putDouble("x", x.toDouble())
      putDouble("y", y.toDouble())
      putDouble("dx", dx.toDouble())
      putDouble("dy", dy.toDouble())
      putDouble("globalX", globalX.toDouble())
      putDouble("globalY", globalY.toDouble())
      putDouble("pressure", pressure.toDouble().coerceIn(0.0, 1.0))
      putDouble("timestamp", timestamp)
    }

    // New Architecture: dispatch directly via EventDispatcher (JSI, no bridge)
    val surfaceId = UIManagerHelper.getSurfaceId(reactContext)
    @Suppress("DEPRECATION")
    val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(reactContext, id)
    if (dispatcher != null) {
      dispatcher.dispatchEvent(RawPointerEvent(surfaceId, id, eventName, payload))
      return
    }

    // Old Architecture fallback
    @Suppress("DEPRECATION")
    reactContext
      .getJSModule(com.facebook.react.uimanager.events.RCTEventEmitter::class.java)
      ?.receiveEvent(id, eventName, payload)
  }
}
