export const ANONYMOUS_EXPORT_LIMIT = 3;
export const ANONYMOUS_CHARACTER_LIMIT = 3;

export function exportFramesForUser<T>(frames: T[], isAuthenticated: boolean): T[] {
  return isAuthenticated ? frames : frames.slice(0, ANONYMOUS_EXPORT_LIMIT);
}

export function canAddCharacter(characterCount: number, isAuthenticated: boolean): boolean {
  return isAuthenticated || characterCount < ANONYMOUS_CHARACTER_LIMIT;
}
