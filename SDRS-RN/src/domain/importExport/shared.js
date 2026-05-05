export function createId(prefix) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createImportError(message) {
  return new Error(message);
}

export function stripBom(text) {
  return text.replace(/^\uFEFF/, '');
}
