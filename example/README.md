# react-native-raw-pointer — Example App

Interactive demo showcasing `react-native-raw-pointer` with simultaneous dual-joystick control and native buttons.

## What's Demonstrated

- **Dual joystick** — two `RawPointerView`-based joysticks operating simultaneously without blocking each other
- **Native buttons** — `RawPointerView` buttons that respond while joysticks are held (bypasses the JS single-responder system)
- **Live vector readout** — real-time X/Y values for both joysticks

## Running the Example

> Make sure you have completed the [React Native environment setup](https://reactnative.dev/docs/set-up-your-environment) before proceeding.

### 1. Install dependencies

From the **repository root**:

```sh
yarn install
```

### 2. Android

```sh
yarn example android
# or from the example/ directory:
yarn android
```

### 3. iOS

```sh
cd example/ios && pod install && cd ../..
yarn example ios
# or from the example/ directory:
yarn ios
```

## Project Structure

```
example/
├── src/
│   └── App.tsx          ← Main demo: Joystick + ActionButton components
├── android/             ← Android project (auto-generated, do not edit)
└── ios/                 ← iOS project (auto-generated, do not edit)
```

## Library Source

The library itself lives in the parent directory. See [`../README.md`](../README.md) for the full API reference.
