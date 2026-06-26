#import <React/RCTViewComponentView.h>
#import <UIKit/UIKit.h>

#ifndef RawPointerViewNativeComponent_h
#define RawPointerViewNativeComponent_h

NS_ASSUME_NONNULL_BEGIN

/**
 * RawPointerView — Fabric (New Architecture) UIView component.
 *
 * Extends RCTViewComponentView (the Fabric base class, NOT UIView directly)
 * to participate in the Fabric renderer.
 *
 * Touch handling:
 *   - multipleTouchEnabled = YES   → track multiple fingers
 *   - exclusiveTouch = NO          → does NOT block other views on screen
 *   - UITouch* → Int mapping       → stable pointerId per finger
 */
@interface RawPointerView : RCTViewComponentView

@end

NS_ASSUME_NONNULL_END

#endif /* RawPointerViewNativeComponent_h */
