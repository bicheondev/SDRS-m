export function keepAllWordBreakText(value) {
  if (typeof value !== 'string') {
    return value;
  }

  return value
    .split(/(\s+)/)
    .map((token) => (/\s+/.test(token) ? token : Array.from(token).join('\u2060')))
    .join('');
}
