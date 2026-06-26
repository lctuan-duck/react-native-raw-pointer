export { RawPointerView } from './RawPointerView';
export type { RawPointerViewProps } from './RawPointerView';

// ---------------------------------------------------------------------------
// Public TypeScript types
// ---------------------------------------------------------------------------

/**
 * Payload emitted for every pointer event.
 *
 * Coordinate system:
 *   x, y      — relative to the RawPointerView bounds (top-left = 0,0), in dp
 *   globalX/Y — relative to the screen top-left, in dp
 *   dx, dy    — delta since the previous event for this pointerId (0 on DOWN)
 *   pressure  — 0..1  (1.0 on devices that don't report pressure)
 *   timestamp — ms since epoch
 */
export interface RawPointerEvent {
  /** Stable finger identity within a gesture lifetime */
  pointerId: number;
  /** X position relative to this view, in dp */
  x: number;
  /** Y position relative to this view, in dp */
  y: number;
  /** Delta X since last event for this pointer (0 on DOWN events) */
  dx: number;
  /** Delta Y since last event for this pointer (0 on DOWN events) */
  dy: number;
  /** X position relative to the screen, in dp */
  globalX: number;
  /** Y position relative to the screen, in dp */
  globalY: number;
  /** Touch pressure 0..1 (1.0 on unsupported devices) */
  pressure: number;
  /** Timestamp in milliseconds since epoch */
  timestamp: number;
}

export type PointerEventHandler = (event: RawPointerEvent) => void;

/**
 * Controls how the view interacts with touch dispatch.
 *
 * 'opaque'      — captures all touches in bounds (default). Underlying views
 *                 will NOT receive the same touches. Use for: joystick, canvas.
 *
 * 'transparent' — does not participate in touch. Callbacks will NOT fire.
 *                 Use for: temporarily disabling a region.
 */
export type PointerBehavior = 'opaque' | 'transparent';
