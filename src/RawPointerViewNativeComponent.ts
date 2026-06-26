import {
  codegenNativeComponent,
  type ViewProps,
} from 'react-native';
import type {
  DirectEventHandler,
  WithDefault,
  Float,
  Int32,
  Double,
} from 'react-native/Libraries/Types/CodegenTypes';

// ---------------------------------------------------------------------------
// Event payload — one shape for all four events
// ---------------------------------------------------------------------------
interface RawPointerNativeEvent {
  /** Stable finger identity within a gesture lifetime */
  pointerId: Int32;
  /** X in view-local coordinates (dp) */
  x: Float;
  /** Y in view-local coordinates (dp) */
  y: Float;
  /** Delta X since last event for this pointer (0 on DOWN) */
  dx: Float;
  /** Delta Y since last event for this pointer (0 on DOWN) */
  dy: Float;
  /** X in screen coordinates (dp) */
  globalX: Float;
  /** Y in screen coordinates (dp) */
  globalY: Float;
  /** Touch pressure 0..1 (1.0 on devices that don't report pressure) */
  pressure: Float;
  /** Timestamp in milliseconds since epoch */
  timestamp: Double;
}

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------
interface NativeProps extends ViewProps {
  /**
   * Controls touch dispatch behaviour:
   *   'opaque'      — captures all touches in bounds (default, for joystick)
   *   'transparent' — does not participate in touch (callbacks won't fire)
   */
  behavior?: WithDefault<string, 'opaque'>;

  /**
   * When true, calls requestDisallowInterceptTouchEvent on touch-down.
   * Prevents ancestor ScrollViews from stealing the gesture.
   * Default: false — keep disabled unless the view lives inside a ScrollView,
   * otherwise sibling TouchableOpacity / Pressable buttons will be blocked.
   */
  disallowInterceptTouchEvent?: WithDefault<boolean, false>;

  /** Fired when a finger touches down within this view's bounds */
  onRawPointerDown?: DirectEventHandler<RawPointerNativeEvent>;
  /** Fired as a claimed finger moves */
  onRawPointerMove?: DirectEventHandler<RawPointerNativeEvent>;
  /** Fired when a claimed finger lifts */
  onRawPointerUp?: DirectEventHandler<RawPointerNativeEvent>;
  /** Fired when the system cancels a touch sequence */
  onRawPointerCancel?: DirectEventHandler<RawPointerNativeEvent>;
}

export default codegenNativeComponent<NativeProps>('RawPointerView');
