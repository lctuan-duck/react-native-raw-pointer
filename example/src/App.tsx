import { useState, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';
import { RawPointerView } from 'react-native-raw-pointer';
import type { RawPointerEvent } from 'react-native-raw-pointer';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const JOYSTICK_SIZE = 140;
const KNOB_SIZE = 52;
const RADIUS = (JOYSTICK_SIZE - KNOB_SIZE) / 2; // max travel
const CENTER = JOYSTICK_SIZE / 2;

// ─────────────────────────────────────────────────────────────────────────────
// Joystick component — built on top of RawPointerView
// ─────────────────────────────────────────────────────────────────────────────

interface JoystickState {
  x: number; // -1..1
  y: number; // -1..1
  active: boolean;
}

interface JoystickProps {
  label: string;
  color: string;
  onVector: (state: JoystickState) => void;
}

function Joystick({ label, color, onVector }: JoystickProps) {
  const knobX = useRef(new Animated.Value(0)).current;
  const knobY = useRef(new Animated.Value(0)).current;
  const activePointerId = useRef<number | null>(null);

  const clamp = (v: number, min: number, max: number) =>
    Math.min(max, Math.max(min, v));

  const handleDown = useCallback(
    (e: RawPointerEvent) => {
      // Only claim the first finger that lands in this joystick
      if (activePointerId.current !== null) return;
      activePointerId.current = e.pointerId;
      onVector({ x: 0, y: 0, active: true });
    },
    [onVector]
  );

  const handleMove = useCallback(
    (e: RawPointerEvent) => {
      if (e.pointerId !== activePointerId.current) return;

      // Convert view-local position to -1..1 vector
      const rawX = e.x - CENTER;
      const rawY = e.y - CENTER;
      const dist = Math.sqrt(rawX * rawX + rawY * rawY);

      let nx = rawX / RADIUS;
      let ny = rawY / RADIUS;

      // Clamp to unit circle
      if (dist > RADIUS) {
        const scale = RADIUS / dist;
        nx = (rawX * scale) / RADIUS;
        ny = (rawY * scale) / RADIUS;
      }

      // Move knob visually
      const knobOffX = clamp(rawX, -RADIUS, RADIUS);
      const knobOffY = clamp(rawY, -RADIUS, RADIUS);
      knobX.setValue(knobOffX);
      knobY.setValue(knobOffY);

      onVector({ x: nx, y: ny, active: true });
    },
    [knobX, knobY, onVector]
  );

  const handleUp = useCallback(
    (e: RawPointerEvent) => {
      if (e.pointerId !== activePointerId.current) return;
      activePointerId.current = null;

      // Spring knob back to center
      Animated.spring(knobX, { toValue: 0, useNativeDriver: true }).start();
      Animated.spring(knobY, { toValue: 0, useNativeDriver: true }).start();

      onVector({ x: 0, y: 0, active: false });
    },
    [knobX, knobY, onVector]
  );

  return (
    <RawPointerView
      style={[styles.joystick, { borderColor: color }]}
      behavior="opaque"
      onRawPointerDown={handleDown}
      onRawPointerMove={handleMove}
      onRawPointerUp={handleUp}
      onRawPointerCancel={handleUp}
    >
      {/* Background ring */}
      <View style={styles.joystickInner}>
        {/* Animated knob */}
        <Animated.View
          style={[
            styles.knob,
            { backgroundColor: color },
            { transform: [{ translateX: knobX }, { translateY: knobY }] },
          ]}
        />
      </View>
      <Text style={[styles.joystickLabel, { color }]}>{label}</Text>
    </RawPointerView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NativeButton — press detection via RawPointerView (bypasses JS responder)
//
// Why RawPointerView instead of TouchableOpacity?
// TouchableOpacity uses RN's single-responder system: only ONE view can be
// the JS responder at a time. When a joystick is active, it claims the
// responder, blocking all TouchableOpacity presses simultaneously.
//
// RawPointerView processes touches natively, bypassing the JS responder.
// Android's split-motion-event dispatch delivers each finger independently
// to the correct native view — the same mechanism that lets two joysticks
// operate simultaneously.
// ─────────────────────────────────────────────────────────────────────────────

interface ActionButtonProps {
  label: string;
  color: string;
  onPress: () => void;
}

function ActionButton({ label, color, onPress }: ActionButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handleDown = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.91, useNativeDriver: true }),
      Animated.timing(opacity, {
        toValue: 0.65,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
    console.log('press', label);

    onPress();
  }, [scale, opacity, onPress]);

  const handleRelease = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, opacity]);

  return (
    <RawPointerView
      behavior="opaque"
      style={styles.actionBtnContainer}
      onRawPointerDown={handleDown}
      onRawPointerUp={handleRelease}
      onRawPointerCancel={handleRelease}
    >
      <Animated.View
        style={[
          styles.actionBtn,
          { borderColor: color, transform: [{ scale }], opacity },
        ]}
      >
        <Text style={[styles.actionBtnLabel, { color }]}>{label}</Text>
      </Animated.View>
    </RawPointerView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [leftVec, setLeftVec] = useState<JoystickState>({
    x: 0,
    y: 0,
    active: false,
  });
  const [rightVec, setRightVec] = useState<JoystickState>({
    x: 0,
    y: 0,
    active: false,
  });
  const [log, setLog] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    setLog((prev: string[]) =>
      [`${new Date().toLocaleTimeString()} ${msg}`, ...prev].slice(0, 6)
    );
  }, []);

  return (
    <View style={styles.root}>
      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>RawPointerView · Test</Text>
        <Text style={styles.headerSub}>
          Hold both joysticks + tap buttons simultaneously
        </Text>
      </View>

      {/* ── TOP BUTTONS ──────────────────────────────────────────────────── */}
      <View style={styles.topButtons}>
        <ActionButton
          label="DISARM"
          color="#ef4444"
          onPress={() => addLog('🔴 DISARM tapped')}
        />
        <ActionButton
          label="ARM"
          color="#22c55e"
          onPress={() => addLog('🟢 ARM tapped')}
        />
        <ActionButton
          label="RTL"
          color="#f59e0b"
          onPress={() => addLog('🟡 RTL tapped')}
        />
      </View>

      {/* ── MAIN CONTROL ROW ─────────────────────────────────────────────── */}
      <View style={styles.controlRow}>
        {/* Left cluster: mode buttons + left joystick */}
        <View style={styles.leftCluster}>
          <ActionButton
            label="▲ ALT"
            color="#818cf8"
            onPress={() => addLog('🔼 ALT UP tapped')}
          />
          <Joystick label="MOVE" color="#6366f1" onVector={setLeftVec} />
          <ActionButton
            label="▼ ALT"
            color="#818cf8"
            onPress={() => addLog('🔽 ALT DOWN tapped')}
          />
        </View>

        {/* Center: vector readout */}
        <View style={styles.center}>
          <View style={styles.vectorCard}>
            <Text style={styles.vecTitle}>LEFT</Text>
            <Text style={[styles.vecValue, leftVec.active && styles.vecActive]}>
              X {leftVec.x >= 0 ? '+' : ''}
              {leftVec.x.toFixed(2)}
            </Text>
            <Text style={[styles.vecValue, leftVec.active && styles.vecActive]}>
              Y {leftVec.y >= 0 ? '+' : ''}
              {leftVec.y.toFixed(2)}
            </Text>
            <View style={[styles.dot, leftVec.active && styles.dotActive]} />
          </View>

          <View style={styles.vectorCard}>
            <Text style={styles.vecTitle}>RIGHT</Text>
            <Text
              style={[styles.vecValue, rightVec.active && styles.vecActive]}
            >
              X {rightVec.x >= 0 ? '+' : ''}
              {rightVec.x.toFixed(2)}
            </Text>
            <Text
              style={[styles.vecValue, rightVec.active && styles.vecActive]}
            >
              Y {rightVec.y >= 0 ? '+' : ''}
              {rightVec.y.toFixed(2)}
            </Text>
            <View style={[styles.dot, rightVec.active && styles.dotActive]} />
          </View>
        </View>

        {/* Right cluster: camera buttons + right joystick */}
        <View style={styles.rightCluster}>
          <ActionButton
            label="CAM ▲"
            color="#34d399"
            onPress={() => addLog('📷 CAM UP tapped')}
          />
          <Joystick label="YAW" color="#10b981" onVector={setRightVec} />
          <ActionButton
            label="CAM ▼"
            color="#34d399"
            onPress={() => addLog('📷 CAM DOWN tapped')}
          />
        </View>
      </View>

      {/* ── BOTTOM BUTTONS ───────────────────────────────────────────────── */}
      <View style={styles.bottomButtons}>
        <ActionButton
          label="PHOTO"
          color="#a78bfa"
          onPress={() => addLog('📸 PHOTO tapped')}
        />
        <ActionButton
          label="VIDEO"
          color="#f472b6"
          onPress={() => addLog('🎥 VIDEO tapped')}
        />
        <ActionButton
          label="MISSION"
          color="#60a5fa"
          onPress={() => addLog('🗺 MISSION tapped')}
        />
      </View>

      {/* ── EVENT LOG ────────────────────────────────────────────────────── */}
      <View style={styles.logBox}>
        <Text style={styles.logTitle}>EVENT LOG</Text>
        {log.length === 0 ? (
          <Text style={styles.logEmpty}>No button presses yet…</Text>
        ) : (
          log.map((entry: string, i: number) => (
            <Text key={i} style={styles.logEntry}>
              {entry}
            </Text>
          ))
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const BG = '#0a0a14';
const CARD = '#13131f';
const BORDER = '#1e1e30';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e2e8f0',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },

  // Top row of buttons
  topButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 12,
  },

  // Main control area
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    flex: 1,
  },

  leftCluster: {
    alignItems: 'center',
    gap: 10,
  },
  rightCluster: {
    alignItems: 'center',
    gap: 10,
  },

  // Joystick
  joystick: {
    width: JOYSTICK_SIZE,
    height: JOYSTICK_SIZE,
    borderRadius: JOYSTICK_SIZE / 2,
    borderWidth: 2,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joystickInner: {
    width: JOYSTICK_SIZE - 16,
    height: JOYSTICK_SIZE - 16,
    borderRadius: (JOYSTICK_SIZE - 16) / 2,
    backgroundColor: '#0d0d1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    opacity: 0.92,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },
  joystickLabel: {
    position: 'absolute',
    bottom: 6,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    opacity: 0.6,
  },

  // Action button
  actionBtnContainer: {
    // RawPointerView touch area — same size as the visual button
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: CARD,
    minWidth: 64,
    alignItems: 'center',
  },
  actionBtnLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Center vector readout
  center: {
    gap: 10,
    alignItems: 'center',
  },
  vectorCard: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  vecTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  vecValue: {
    fontSize: 12,
    color: '#475569',
    fontVariant: ['tabular-nums'],
    fontFamily: 'monospace',
  },
  vecActive: {
    color: '#e2e8f0',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1e293b',
    marginTop: 6,
  },
  dotActive: {
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },

  // Bottom buttons
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 12,
  },

  // Event log
  logBox: {
    margin: 12,
    marginTop: 8,
    padding: 12,
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    minHeight: 90,
  },
  logTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  logEmpty: {
    color: '#334155',
    fontSize: 12,
    fontStyle: 'italic',
  },
  logEntry: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
});
