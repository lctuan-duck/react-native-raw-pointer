package com.rawpointer

import android.graphics.Color
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.RawPointerViewManagerInterface
import com.facebook.react.viewmanagers.RawPointerViewManagerDelegate

@ReactModule(name = RawPointerViewManager.NAME)
class RawPointerViewManager : SimpleViewManager<RawPointerView>(),
  RawPointerViewManagerInterface<RawPointerView> {
  private val mDelegate: ViewManagerDelegate<RawPointerView>

  init {
    mDelegate = RawPointerViewManagerDelegate(this)
  }

  override fun getDelegate(): ViewManagerDelegate<RawPointerView>? {
    return mDelegate
  }

  override fun getName(): String {
    return NAME
  }

  public override fun createViewInstance(context: ThemedReactContext): RawPointerView {
    return RawPointerView(context)
  }

  @ReactProp(name = "color")
  override fun setColor(view: RawPointerView?, color: Int?) {
    view?.setBackgroundColor(color ?: Color.TRANSPARENT)
  }

  companion object {
    const val NAME = "RawPointerView"
  }
}
