/** Set by the Android app: the phone's own equaliser. Kept apart from the equaliser store so the Android startup code does not pull the player in too early. */
export const nativeEq: { set?: (gains: number[]) => Promise<boolean> } = {};
