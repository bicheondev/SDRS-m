import {
  buildSearchIndex,
  compileSearchQuery,
  matchesCompiledSearchQuery,
} from '../../domain/search.js';

export function applySearchQuery(vessels, query) {
  const compiledQuery = compileSearchQuery(query);

  if (!compiledQuery.normalizedQuery) {
    return vessels;
  }

  return vessels.filter((vessel) =>
    matchesCompiledSearchQuery(
      vessel.searchIndex ?? buildSearchIndex([vessel.name]),
      compiledQuery,
    ),
  );
}
