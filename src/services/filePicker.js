export function pickFile({ accept = '', multiple = false } = {}) {
  if (typeof document === 'undefined') {
    return Promise.resolve(multiple ? [] : null);
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.style.top = '0';

    const cleanup = () => {
      input.removeEventListener('change', handleChange);
      input.remove();
    };

    const handleChange = () => {
      const files = Array.from(input.files ?? []);
      cleanup();
      resolve(multiple ? files : files[0] ?? null);
    };

    input.addEventListener('change', handleChange);
    document.body.append(input);
    input.click();
  });
}
