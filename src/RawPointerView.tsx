/**
 * RawPointerView — Web/non-native fallback.
 *
 * ⚠️  This file is intentionally a stub that throws at runtime.
 *     react-native-raw-pointer only works on iOS and Android.
 *
 * 📌  IDE navigation note (VS Code / WebStorm):
 *     TypeScript resolves imports to THIS file because it does not understand
 *     the Metro bundler's `.native.tsx` platform suffix convention.
 *     The REAL native implementation lives in:
 *       - src/RawPointerView.native.tsx  ← Metro picks this on iOS/Android
 *       - src/RawPointerViewNativeComponent.ts  ← Fabric/Codegen spec
 *       - android/…/RawPointerView.kt   ← Android touch handling
 *       - ios/RawPointerView.mm         ← iOS touch handling
 *
 * The Props type below mirrors the native component so TypeScript type-checks
 * callers correctly even when this stub file is what the IDE sees.
 */
import type { ViewProps } from 'react-native';
import type { RawPointerEvent, PointerBehavior } from './index';

export interface RawPointerViewProps extends ViewProps {
  /**
   * Controls touch dispatch behaviour:
   *   'opaque'      — captures all touches within bounds (default). Views
   *                   underneath will NOT receive the same touches.
   *                   Use for: joystick, canvas, custom sliders.
   *   'transparent' — does not participate in touch. Callbacks will NOT fire.
   *                   Use for: temporarily disabling a region.
   */
  behavior?: PointerBehavior;

  /**
   * When `true`, calls `requestDisallowInterceptTouchEvent(true)` on
   * `ACTION_DOWN` so ancestor `ScrollView`s cannot steal the touch.
   *
   * **Default: `false`** — safe for layouts where the view is NOT nested
   * inside a `ScrollView`. Keeping it `false` ensures sibling
   * `TouchableOpacity` / `Pressable` buttons remain pressable while the
   * joystick is active.
   *
   * Set to `true` only if you observe the joystick gesture being hijacked
   * by a scroll container.
   */
  disallowInterceptTouchEvent?: boolean;

  /** Fired when a finger first touches down within this view's bounds. */
  onRawPointerDown?: (e: RawPointerEvent) => void;

  /** Fired as a claimed finger moves. Includes dx/dy delta from native. */
  onRawPointerMove?: (e: RawPointerEvent) => void;

  /** Fired when a claimed finger lifts off the screen. */
  onRawPointerUp?: (e: RawPointerEvent) => void;

  /** Fired when the system cancels the touch sequence (e.g. incoming call). */
  onRawPointerCancel?: (e: RawPointerEvent) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function RawPointerView(_props: RawPointerViewProps): never {
  throw new Error(
    [
      'RawPointerView is only supported on iOS and Android.',
      'This stub should never run — if you see this error on a native device,',
      'ensure Metro is resolving .native.tsx files correctly.',
    ].join(' ')
  );
}
