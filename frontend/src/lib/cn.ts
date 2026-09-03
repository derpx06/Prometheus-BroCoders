export type ClassValue = string | false | null | undefined

/** Tiny class joiner. No variant engine needed at this size. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}
