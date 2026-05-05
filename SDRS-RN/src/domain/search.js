import { getChoseong } from 'es-hangul';

function normalizeSearchText(value) {
  return String(value ?? '').trim();
}

function compactWhitespace(value) {
  return value.replace(/\s+/g, '');
}

function isChoseongQuery(value) {
  return /^[ㄱ-ㅎ\s]+$/.test(value);
}

export function buildSearchIndex(fields, options = {}) {
  const { choseongFields = fields } = options;
  const normalizedFields = fields.map((field) => normalizeSearchText(field)).filter(Boolean);

  return {
    choseongFields: choseongFields
      .map((field) => normalizeSearchText(field))
      .filter(Boolean)
      .map((field) => compactWhitespace(getChoseong(field))),
    fields: normalizedFields.map((field) => field.toLowerCase()),
  };
}

export function compileSearchQuery(query) {
  const normalizedQuery = normalizeSearchText(query).toLowerCase();

  if (!normalizedQuery) {
    return {
      compactQuery: '',
      normalizedQuery,
      usesChoseong: false,
    };
  }

  if (!isChoseongQuery(normalizedQuery)) {
    return {
      compactQuery: '',
      normalizedQuery,
      usesChoseong: false,
    };
  }

  return {
    compactQuery: compactWhitespace(normalizedQuery),
    normalizedQuery,
    usesChoseong: true,
  };
}

export function matchesCompiledSearchQuery(searchIndex, compiledQuery) {
  if (!compiledQuery.normalizedQuery) {
    return true;
  }

  if (searchIndex.fields.some((field) => field.includes(compiledQuery.normalizedQuery))) {
    return true;
  }

  if (!compiledQuery.usesChoseong) {
    return false;
  }

  return searchIndex.choseongFields.some((field) => field.includes(compiledQuery.compactQuery));
}

export function matchesSearchQuery(fields, query, options = {}) {
  return matchesCompiledSearchQuery(buildSearchIndex(fields, options), compileSearchQuery(query));
}
