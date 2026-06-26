/**
 * RawPointerView.native.tsx — Native platform wrapper (iOS & Android).
 *
 * Metro picks this file over RawPointerView.tsx on native platforms
 * thanks to the `.native.tsx` platform suffix.
 *
 * WHY THIS WRAPPER EXISTS:
 *   React Native's DirectEventHandler delivers events as `{ nativeEvent: T }`.
 *   This wrapper unwraps that envelope so callers receive RawPointerEvent
 *   directly, matching the public API type and avoiding undefined/NaN errors.
 */
import type { RawPointerEvent } from './index';
import type { RawPointerViewProps } from './RawPointerView';
import NativeRawPointerView from './RawPointerViewNativeComponent';

type SyntheticEvent = { nativeEvent: RawPointerEvent };

/** Unwrap the nativeEvent envelope produced by DirectEventHandler. */
function wrap(handler: ((e: RawPointerEvent) => void) | undefined) {
  if (!handler) return undefined;
  return (e: SyntheticEvent) => handler(e.nativeEvent);
}

export function RawPointerView({
  onRawPointerDown,
  onRawPointerMove,
  onRawPointerUp,
  onRawPointerCancel,
  ...rest
}: RawPointerViewProps) {
  return (
    <NativeRawPointerView
      {...rest}
      onRawPointerDown={wrap(onRawPointerDown)}
      onRawPointerMove={wrap(onRawPointerMove)}
      onRawPointerUp={wrap(onRawPointerUp)}
      onRawPointerCancel={wrap(onRawPointerCancel)}
    />
  );
}
