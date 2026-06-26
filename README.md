# react-native-raw-pointer

[![npm version](https://img.shields.io/npm/v/react-native-raw-pointer)](https://www.npmjs.com/package/react-native-raw-pointer)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-lightgrey)](https://reactnative.dev)
[![react-native](https://img.shields.io/badge/react--native-%3E%3D%200.75-brightgreen)](https://reactnative.dev)
[![New Architecture](https://img.shields.io/badge/New%20Architecture-required-orange)](https://reactnative.dev/docs/the-new-architecture/landing-page)

Low-level, multi-touch pointer events for React Native — bypasses the JS responder system entirely, enabling **simultaneous input** from multiple native views (joysticks, buttons, canvases) without blocking each other.

Built on **New Architecture (Fabric)** with native Kotlin (Android) and Objective-C++ (iOS) implementations.

---

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage Examples](#usage-examples)
  - [Joystick](#joystick)
  - [Native Button](#native-button-works-simultaneously-with-joysticks)
- [API Reference](#api-reference)
  - [RawPointerView Props](#rawpointerview-props)
  - [RawPointerEvent](#rawpointerevent)
  - [PointerBehavior](#pointerbehavior)
- [How It Works](#how-it-works)
- [Multi-Touch Behaviour](#multi-touch-behaviour)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- ✅ **True multi-touch** — each `RawPointerView` tracks its own touch independently via Android split-motion dispatch and iOS multi-touch
- ✅ **Bypasses JS responder** — no single-responder blocking; joystick + buttons work simultaneously
- ✅ **dp coordinates** — all coordinates (`x`, `y`, `globalX`, `globalY`) emitted in logical pixels (dp on Android, points on iOS), consistent with React Native's layout system
- ✅ **Spurious-event deduplication** — Android `ACTION_MOVE` events are filtered per-pointer; stationary fingers do not re-fire `onRawPointerMove`
- ✅ **Fabric-native dispatch** — events dispatched directly via JSI (no bridge hop); full event payload delivered via `getEventData()` override
- ✅ **Zero dependencies** — no additional native dependencies beyond React Native itself

---

## Requirements

| | Minimum |
|---|---|
| React Native | **0.75** (New Architecture required) |
| React | 18+ |
| Android | API 21+ |
| iOS | 14.0+ |
| Architecture | **New Architecture only** |

> ⚠️ **New Architecture required.** This library uses Fabric view components and JSI event dispatch. Old Architecture (bridge mode) is not supported.

---

## Installation

```sh
# npm
npm install react-native-raw-pointer

# yarn
yarn add react-native-raw-pointer
```

### Android

No additional steps — auto-linked by React Native.

### iOS

```sh
cd ios && pod install
```

---

## Quick Start

```tsx
import { RawPointerView } from 'react-native-raw-pointer';
import type { RawPointerEvent } from 'react-native-raw-pointer';

export default function App() {
  return (
    <RawPointerView
      style={{ width: 200, height: 200, backgroundColor: '#1e1e2e' }}
      behavior="opaque"
      onRawPointerDown={(e: RawPointerEvent) =>
        console.log(`finger ${e.pointerId} down at (${e.x.toFixed(1)}, ${e.y.toFixed(1)})`)
      }
      onRawPointerMove={(e: RawPointerEvent) =>
        console.log(`finger ${e.pointerId} at (${e.x.toFixed(1)}, ${e.y.toFixed(1)})`)
      }
      onRawPointerUp={(e: RawPointerEvent) =>
        console.log(`finger ${e.pointerId} up`)
      }
    />
  );
}
```

---

## Usage Examples

### Joystick

A fully-featured virtual joystick with spring-return animation and unit-circle clamping.

```tsx
import { useRef, useCallback } from 'react';
import { Animated, View } from 'react-native';
import { RawPointerView } from 'react-native-raw-pointer';
import type { RawPointerEvent } from 'react-native-raw-pointer';

const SIZE = 140;   // diameter of the joystick base (dp)
const KNOB = 52;    // diameter of the draggable knob (dp)
const RADIUS = (SIZE - KNOB) / 2;  // maximum knob travel
const CENTER = SIZE / 2;

interface JoystickProps {
  onVector: (x: number, y: number) => void; // x, y in -1..1
}

export function Joystick({ onVector }: JoystickProps) {
  const knobX = useRef(new Animated.Value(0)).current;
  const knobY = useRef(new Animated.Value(0)).current;
  const activeId = useRef<number | null>(null);

  const handleDown = useCallback((e: RawPointerEvent) => {
    if (activeId.current !== null) return; // claim only the first finger
    activeId.current = e.pointerId;
    onVector(0, 0);
  }, [onVector]);

  const handleMove = useCallback((e: RawPointerEvent) => {
    if (e.pointerId !== activeId.current) return;

    const rawX = e.x - CENTER;
    const rawY = e.y - CENTER;
    const dist = Math.sqrt(rawX * rawX + rawY * rawY);
    const scale = dist > RADIUS ? RADIUS / dist : 1;

    knobX.setValue(Math.max(-RADIUS, Math.min(RADIUS, rawX)));
    knobY.setValue(Math.max(-RADIUS, Math.min(RADIUS, rawY)));
    onVector((rawX * scale) / RADIUS, (rawY * scale) / RADIUS);
  }, [knobX, knobY, onVector]);

  const handleUp = useCallback((e: RawPointerEvent) => {
    if (e.pointerId !== activeId.current) return;
    activeId.current = null;
    Animated.spring(knobX, { toValue: 0, useNativeDriver: true }).start();
    Animated.spring(knobY, { toValue: 0, useNativeDriver: true }).start();
    onVector(0, 0);
  }, [knobX, knobY, onVector]);

  return (
    <RawPointerView
      behavior="opaque"
      style={{ width: SIZE, height: SIZE, borderRadius: SIZE / 2 }}
      onRawPointerDown={handleDown}
      onRawPointerMove={handleMove}
      onRawPointerUp={handleUp}
      onRawPointerCancel={handleUp}
    >
      <Animated.View
        style={[
          { width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: '#6366f1' },
          { transform: [{ translateX: knobX }, { translateY: knobY }] },
        ]}
      />
    </RawPointerView>
  );
}
```

### Native Button (works simultaneously with joysticks)

Using `RawPointerView` for buttons bypasses the JS single-responder system, allowing buttons to respond while a joystick is held.

> **Why not `TouchableOpacity`?**  
> `TouchableOpacity` uses React Native's JS responder, which is exclusive — only one view can be the active responder at a time. When a joystick holds the responder, `TouchableOpacity` buttons are blocked. `RawPointerView` dispatches natively, so both work in parallel.

```tsx
import { useRef, useCallback } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { RawPointerView } from 'react-native-raw-pointer';

interface NativeButtonProps {
  label: string;
  onPress: () => void;
}

export function NativeButton({ label, onPress }: NativeButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handleDown = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 0.92, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.65, duration: 60, useNativeDriver: true }),
    ]).start();
    onPress();
  }, [scale, opacity, onPress]);

  const handleRelease = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }, [scale, opacity]);

  return (
    <RawPointerView
      behavior="opaque"
      onRawPointerDown={handleDown}
      onRawPointerUp={handleRelease}
      onRawPointerCancel={handleRelease}
    >
      <Animated.View style={[styles.btn, { transform: [{ scale }], opacity }]}>
        <Text style={styles.label}>{label}</Text>
      </Animated.View>
    </RawPointerView>
  );
}

const styles = StyleSheet.create({
  btn:   { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#1e293b' },
  label: { color: '#f8fafc', fontWeight: '700' },
});
```

---

## API Reference

### `<RawPointerView>` Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `behavior` | [`PointerBehavior`](#pointerbehavior) | `'opaque'` | Controls how touches are dispatched |
| `onRawPointerDown` | `(e: RawPointerEvent) => void` | — | Fires when a finger touches down within bounds |
| `onRawPointerMove` | `(e: RawPointerEvent) => void` | — | Fires as an active finger moves |
| `onRawPointerUp` | `(e: RawPointerEvent) => void` | — | Fires when a finger lifts |
| `onRawPointerCancel` | `(e: RawPointerEvent) => void` | — | Fires when the system cancels a touch sequence |

All standard [`ViewProps`](https://reactnative.dev/docs/view#props) are also accepted (`style`, `children`, `testID`, etc.).

---

### `RawPointerEvent`

```ts
interface RawPointerEvent {
  /**
   * Stable finger identity for this gesture's lifetime.
   * Reused after all fingers lift. Use to correlate DOWN → MOVE → UP events
   * for the same finger.
   */
  pointerId: number;

  /** X position relative to this view's top-left corner, in dp */
  x: number;
  /** Y position relative to this view's top-left corner, in dp */
  y: number;

  /** Change in X since the last event for this pointer (0 on DOWN) */
  dx: number;
  /** Change in Y since the last event for this pointer (0 on DOWN) */
  dy: number;

  /** X position relative to the screen top-left, in dp */
  globalX: number;
  /** Y position relative to the screen top-left, in dp */
  globalY: number;

  /**
   * Touch pressure, 0..1.
   * Defaults to 1.0 on devices that don't report pressure (most iOS devices).
   */
  pressure: number;

  /** Timestamp in milliseconds since Unix epoch */
  timestamp: number;
}
```

> **Coordinate space:** All coordinates (`x`, `y`, `globalX`, `globalY`, `dx`, `dy`) are in **logical pixels** — the same unit React Native uses for layout (`width`, `height`, `StyleSheet` values). On Android this is dp (density-independent pixels); on iOS this is UIKit points.

---

### `PointerBehavior`

```ts
type PointerBehavior = 'opaque' | 'transparent';
```

| Value | Behaviour |
|---|---|
| `'opaque'` | *(default)* Captures all touches within bounds. Views underneath do **not** receive the same touches. Use for joysticks, sliders, canvas surfaces. |
| `'transparent'` | Does not participate in touch dispatch. All callbacks are silenced. Views underneath receive touches normally. Use to temporarily disable a region. |

---

## How It Works

### The Problem with JS Responder

React Native's responder system (`PanResponder`, `TouchableOpacity`, `Pressable`, `GestureDetector`) routes all touches through a **single JS responder**. Only one view can hold the responder at a time. When a joystick claims it, all other touchables become unresponsive.

### The Solution: Native Dispatch

`RawPointerView` processes and dispatches touches **entirely in native code**, bypassing the JS responder:

```
User touches screen
       │
       ▼
Android ViewGroup (split-motion dispatch)
  ├── Finger 1 → Joystick A (RawPointerView)  ← native claim, no JS involved
  ├── Finger 2 → Joystick B (RawPointerView)  ← native claim, no JS involved
  └── Finger 3 → Button    (RawPointerView)  ← native claim, no JS involved
                                    │
                    Events dispatched via JSI to JS
                    (all three simultaneously ✅)
```

### Android Implementation

| File | Role |
|---|---|
| `RawPointerView.kt` | `FrameLayout` subclass; intercepts `MotionEvent`, converts to dp, deduplicates stationary pointers |
| `RawPointerEvent.kt` | Extends Fabric `Event<T>`; overrides `getEventData()` to supply payload to C++ Fabric dispatcher |
| `RawPointerViewManager.kt` | `ViewGroupManager` registration with Fabric runtime |

**Key design decisions:**
- Extends `FrameLayout` (not `View`) so React Native children render normally inside
- Overrides `onInterceptTouchEvent` to capture touches before they reach children
- Calls `requestDisallowInterceptTouchEvent(true)` to prevent ancestors (ScrollView, root) from stealing the touch stream
- Converts `MotionEvent` physical pixels → dp via `DisplayMetrics.density`
- Skips `onRawPointerMove` for pointers with `dx == 0 && dy == 0` (avoids cross-pollination when another finger triggers `ACTION_MOVE`)

### iOS Implementation

| File | Role |
|---|---|
| `RawPointerView.mm` | `UIView` subclass with `multipleTouchEnabled = YES`; uses `UITouch*` pointer identity as stable `pointerId`; emits via Fabric C++ `EventEmitter` |

**Key design decisions:**
- `exclusiveTouch = NO` allows other views to receive touches simultaneously
- `touchesMoved:` is called only with touches that actually moved — no deduplication needed
- UIKit `locationInView:` returns points (logical pixels) natively — no pixel conversion needed

### JS / TypeScript Layer

| File | Role |
|---|---|
| `RawPointerViewNativeComponent.ts` | Codegen spec — defines props and events for Fabric runtime |
| `RawPointerView.native.tsx` | Metro platform override — unwraps the `{ nativeEvent: T }` envelope from `DirectEventHandler` so callers receive `RawPointerEvent` directly |
| `RawPointerView.tsx` | Web stub — throws at runtime; provides TypeScript types for IDE navigation |

---

## Multi-Touch Behaviour

| Scenario | Result |
|---|---|
| Multiple fingers on the **same** `RawPointerView` | All tracked; each has a unique `pointerId` |
| Joystick held + button pressed | Both fire events simultaneously ✅ |
| Two joysticks held simultaneously | Both active simultaneously ✅ |
| Stationary finger while another moves | No spurious `onRawPointerMove` for stationary finger ✅ |
| System interruption (incoming call, etc.) | `onRawPointerCancel` fires for all active pointers; clean up state |

> **Platform limits:**  
> iOS — UIKit delivers up to **5 simultaneous touches** (11 on some iPad models).  
> Android — Hardware-dependent, typically **5–10** simultaneous touch points.

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for the development workflow and pull request guidelines, and [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) before participating.

### Development Setup

```sh
# Clone the repo
git clone https://github.com/lctuan-duck/react-native-raw-pointer.git
cd react-native-raw-pointer

# Install dependencies
yarn install

# Run the example app
yarn example android
# or
yarn example ios
```

---

## License

[MIT](./LICENSE) © 2026 Le Cong Tuan &lt;lctuan.dev@gmail.com&gt;
