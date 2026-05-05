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

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

export function readFileAsDataUrl(file) {
  if (!file || !file.type?.startsWith('image/')) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : null);
    };
    reader.readAsDataURL(file);
  });
}
