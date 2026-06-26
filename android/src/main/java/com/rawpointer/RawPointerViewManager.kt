package com.rawpointer

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.annotations.ReactProp

/**
 * RawPointerViewManager — registers RawPointerView with React Native.
 *
 * Extends ViewGroupManager (not SimpleViewManager) because RawPointerView
 * extends FrameLayout, which hosts React Native children. Fabric casts the
 * manager to IViewGroupManager at runtime — using SimpleViewManager would
 * cause a ClassCastException.
 *
 * Note: getExportedCustomDirectEventTypeConstants() is intentionally omitted.
 * In New Architecture (Fabric), event routing is defined by the codegen spec
 * (RawPointerViewNativeComponent.ts) and handled by the C++ Fabric layer.
 * The method is only needed for Old Architecture RCTEventEmitter dispatch.
 */
@ReactModule(name = RawPointerViewManager.NAME)
class RawPointerViewManager : ViewGroupManager<RawPointerView>() {

  override fun getName(): String = NAME

  override fun createViewInstance(context: ThemedReactContext): RawPointerView =
    RawPointerView(context)

  /** behavior: "opaque" (default) | "transparent" */
  @ReactProp(name = "behavior")
  fun setBehavior(view: RawPointerView, value: String?) {
    view.setBehavior(value ?: "opaque")
  }

  /**
   * disallowInterceptTouchEvent (default false):
   *   false — sibling buttons remain pressable (safe default, no ScrollView in ancestor chain)
   *   true  — call requestDisallowInterceptTouchEvent on touch-down to prevent
   *            ancestor ScrollViews from stealing the gesture
   */
  @ReactProp(name = "disallowInterceptTouchEvent", defaultBoolean = false)
  fun setDisallowInterceptTouchEvent(view: RawPointerView, value: Boolean) {
    view.setDisallowInterceptTouchEvent(value)
  }

  companion object {
    const val NAME = "RawPointerView"
  }
}
