#import "RawPointerView.h"

#import <React/RCTConversions.h>

// Fabric codegen headers — generated from RawPointerViewNativeComponent.ts
#import <react/renderer/components/RawPointerViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/RawPointerViewSpec/EventEmitters.h>
#import <react/renderer/components/RawPointerViewSpec/Props.h>
#import <react/renderer/components/RawPointerViewSpec/RCTComponentViewHelpers.h>

#import "RCTFabricComponentsPlugins.h"

using namespace facebook::react;

// ============================================================================
// RawPointerView (Fabric New Architecture)
// ============================================================================

@implementation RawPointerView {
  /**
   * Maps each UITouch* to a stable integer pointerId.
   *
   * iOS has no built-in stable finger ID (unlike Android's MotionEvent.getPointerId).
   * UITouch* object identity IS stable within a touch sequence lifecycle, so
   * we use its pointer value as a dictionary key.
   *
   * Key:   NSValue wrapping the raw UITouch* pointer (no retain — avoids cycles)
   * Value: NSNumber (our sequential integer ID)
   */
  NSMutableDictionary<NSValue *, NSNumber *> *_touchIdMap;

  /** Next sequential pointerId to assign */
  int _nextPointerId;

  /**
   * Tracks last known local position per pointerId for delta (dx, dy).
   * Key: NSNumber(pointerId), Value: NSValue(CGPoint)
   */
  NSMutableDictionary<NSNumber *, NSValue *> *_lastPositions;

  /** Current behavior: "opaque" | "transparent" */
  NSString *_behavior;
}

// ============================================================================
// Fabric lifecycle
// ============================================================================

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<RawPointerViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    _touchIdMap    = [NSMutableDictionary dictionary];
    _lastPositions = [NSMutableDictionary dictionary];
    _nextPointerId = 0;
    _behavior      = @"opaque";

    // REQUIRED: enables tracking multiple fingers simultaneously
    self.multipleTouchEnabled = YES;

    // IMPORTANT: do NOT set exclusiveTouch = YES
    // exclusiveTouch blocks ALL other views on screen while this view
    // has active touches — breaks buttons, panels, maps.
    self.exclusiveTouch = NO;

    static const auto defaultProps = std::make_shared<const RawPointerViewProps>();
    _props = defaultProps;
  }
  return self;
}

// ============================================================================
// Props update (called by Fabric renderer when JS props change)
// ============================================================================

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps {
  const auto &newViewProps = *std::static_pointer_cast<const RawPointerViewProps>(props);

  // behavior prop
  NSString *behavior = RCTNSStringFromString(newViewProps.behavior);
  if (behavior.length == 0) behavior = @"opaque";
  _behavior = behavior;
  self.userInteractionEnabled = ![behavior isEqualToString:@"transparent"];

  [super updateProps:props oldProps:oldProps];
}

// ============================================================================
// Hit testing
// ============================================================================

- (nullable UIView *)hitTest:(CGPoint)point withEvent:(nullable UIEvent *)event {
  if ([_behavior isEqualToString:@"transparent"]) {
    return nil; // Pass touch through to views behind/below
  }
  return [super hitTest:point withEvent:event];
}

// ============================================================================
// Touch lifecycle
// ============================================================================

- (void)touchesBegan:(NSSet<UITouch *> *)touches withEvent:(nullable UIEvent *)event {
  NSTimeInterval ts = [NSDate date].timeIntervalSince1970 * 1000.0;

  for (UITouch *touch in touches) {
    int pointerId = _nextPointerId++;
    NSValue *key = [NSValue valueWithPointer:(__bridge void *)touch];
    _touchIdMap[key] = @(pointerId);

    CGPoint local = [touch locationInView:self];
    _lastPositions[@(pointerId)] = [NSValue valueWithCGPoint:local];

    [self emitEventName:@"onRawPointerDown"
              pointerId:pointerId
                  local:local
                     dx:0
                     dy:0
               pressure:touch.force
              timestamp:ts
                  touch:touch];
  }
}

- (void)touchesMoved:(NSSet<UITouch *> *)touches withEvent:(nullable UIEvent *)event {
  NSTimeInterval ts = [NSDate date].timeIntervalSince1970 * 1000.0;

  for (UITouch *touch in touches) {
    NSValue *key  = [NSValue valueWithPointer:(__bridge void *)touch];
    NSNumber *pid = _touchIdMap[key];
    if (!pid) continue;

    int pointerId = pid.intValue;
    CGPoint local = [touch locationInView:self];

    CGFloat dx = 0, dy = 0;
    NSValue *lastVal = _lastPositions[pid];
    if (lastVal) {
      CGPoint last = lastVal.CGPointValue;
      dx = local.x - last.x;
      dy = local.y - last.y;
    }
    _lastPositions[pid] = [NSValue valueWithCGPoint:local];

    [self emitEventName:@"onRawPointerMove"
              pointerId:pointerId
                  local:local
                     dx:dx
                     dy:dy
               pressure:touch.force
              timestamp:ts
                  touch:touch];
  }
}

- (void)touchesEnded:(NSSet<UITouch *> *)touches withEvent:(nullable UIEvent *)event {
  [self finishTouches:touches eventName:@"onRawPointerUp"];
}

- (void)touchesCancelled:(NSSet<UITouch *> *)touches withEvent:(nullable UIEvent *)event {
  [self finishTouches:touches eventName:@"onRawPointerCancel"];
}

// ============================================================================
// Internal helpers
// ============================================================================

- (void)finishTouches:(NSSet<UITouch *> *)touches eventName:(NSString *)eventName {
  NSTimeInterval ts = [NSDate date].timeIntervalSince1970 * 1000.0;

  for (UITouch *touch in touches) {
    NSValue *key  = [NSValue valueWithPointer:(__bridge void *)touch];
    NSNumber *pid = _touchIdMap[key];
    if (!pid) continue;

    int pointerId = pid.intValue;
    CGPoint local = [touch locationInView:self];

    [self emitEventName:eventName
              pointerId:pointerId
                  local:local
                     dx:0
                     dy:0
               pressure:0
              timestamp:ts
                  touch:touch];

    // Cleanup — prevent memory accumulation across gestures
    [_touchIdMap removeObjectForKey:key];
    [_lastPositions removeObjectForKey:pid];
  }
}

- (void)emitEventName:(NSString *)eventName
            pointerId:(int)pointerId
                local:(CGPoint)local
                   dx:(CGFloat)dx
                   dy:(CGFloat)dy
             pressure:(CGFloat)pressure
            timestamp:(NSTimeInterval)timestamp
                touch:(UITouch *)touch {

  // Global (screen) coordinates
  CGPoint global = [touch locationInView:nil]; // nil → window coordinates

  auto eventEmitter = std::dynamic_pointer_cast<const RawPointerViewEventEmitter>(_eventEmitter);
  if (!eventEmitter) return;

  RawPointerViewEventEmitter::OnRawPointerDown payload;
  payload.pointerId = pointerId;
  payload.x         = (Float)local.x;
  payload.y         = (Float)local.y;
  payload.dx        = (Float)dx;
  payload.dy        = (Float)dy;
  payload.globalX   = (Float)global.x;
  payload.globalY   = (Float)global.y;
  payload.pressure  = (Float)MAX(0.0, MIN(1.0, pressure));
  payload.timestamp = (Double)timestamp;

  if ([eventName isEqualToString:@"onRawPointerDown"]) {
    eventEmitter->onRawPointerDown(payload);
  } else if ([eventName isEqualToString:@"onRawPointerMove"]) {
    RawPointerViewEventEmitter::OnRawPointerMove movePayload;
    movePayload.pointerId = payload.pointerId;
    movePayload.x = payload.x; movePayload.y = payload.y;
    movePayload.dx = payload.dx; movePayload.dy = payload.dy;
    movePayload.globalX = payload.globalX; movePayload.globalY = payload.globalY;
    movePayload.pressure = payload.pressure; movePayload.timestamp = payload.timestamp;
    eventEmitter->onRawPointerMove(movePayload);
  } else if ([eventName isEqualToString:@"onRawPointerUp"]) {
    RawPointerViewEventEmitter::OnRawPointerUp upPayload;
    upPayload.pointerId = payload.pointerId;
    upPayload.x = payload.x; upPayload.y = payload.y;
    upPayload.dx = payload.dx; upPayload.dy = payload.dy;
    upPayload.globalX = payload.globalX; upPayload.globalY = payload.globalY;
    upPayload.pressure = payload.pressure; upPayload.timestamp = payload.timestamp;
    eventEmitter->onRawPointerUp(upPayload);
  } else if ([eventName isEqualToString:@"onRawPointerCancel"]) {
    RawPointerViewEventEmitter::OnRawPointerCancel cancelPayload;
    cancelPayload.pointerId = payload.pointerId;
    cancelPayload.x = payload.x; cancelPayload.y = payload.y;
    cancelPayload.dx = payload.dx; cancelPayload.dy = payload.dy;
    cancelPayload.globalX = payload.globalX; cancelPayload.globalY = payload.globalY;
    cancelPayload.pressure = payload.pressure; cancelPayload.timestamp = payload.timestamp;
    eventEmitter->onRawPointerCancel(cancelPayload);
  }
}

// ============================================================================
// Fabric registration
// ============================================================================

Class<RCTComponentViewProtocol> RawPointerViewCls(void) {
  return RawPointerView.class;
}

@end
