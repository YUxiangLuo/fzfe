export const resolveAdfResultsForPersistence = <T>(
  localResults: readonly T[],
  persistedResults: readonly T[] | null | undefined,
): T[] => {
  return [...(localResults.length > 0 ? localResults : persistedResults ?? [])];
};
