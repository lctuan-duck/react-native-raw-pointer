/**
 * Type shim for react-native/Libraries/Types/CodegenTypes.
 *
 * tsc cannot resolve React Native's internal library paths (e.g.
 * 'react-native/Libraries/Types/CodegenTypes') because @types/react-native
 * does not re-export them. Metro and the react-native-codegen tool read this
 * file directly and do not need type declarations.
 *
 * This shim satisfies tsc during `bob build --target typescript` so that
 * `.d.ts` files can be generated without errors.
 */

/** Opaque scalar — 32-bit signed integer (mapped to JS number at runtime). */
export type Int32 = number;

/** Opaque scalar — single-precision float (mapped to JS number at runtime). */
export type Float = number;

/** Opaque scalar — double-precision float (JS number, full precision). */
export type Double = number;

/** Opaque scalar — boolean (mapped to JS boolean at runtime). */
export type BooleanValue = boolean;

/** Opaque scalar — string. */
export type StringValue = string;

/**
 * Wraps an event payload type to indicate this event is dispatched directly
 * to the target view (no bubbling). At runtime, RN delivers it as
 * `{ nativeEvent: T }`.
 */
export type DirectEventHandler<T, PaperName extends string | never = never> = (
  event: { nativeEvent: T }
) => void;

/**
 * Declares a prop that has a compile-time default value.
 * `default` is the value used when the prop is omitted.
 */
export type WithDefault<T, value extends T | null> = T | null | undefined;

/**
 * Marks a string prop as accepting only one of the provided union members.
 * React Native's codegen uses this to generate native enum mappings.
 */
export type UnionStringArray<T extends Readonly<string[]>> = T[number];
