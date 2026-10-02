'use client';

export type UploadResult<T> = { ok: true; data: T; message?: string } | { ok: false; error: string; loggedOut?: boolean };

/** Uploads with progress reporting (fetch cannot report upload progress). */
export function uploadWithProgress<T>(url: string, form: FormData, onProgress?: (fraction: number) => void): Promise<UploadResult<T>> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.responseType = 'json';
    xhr.timeout = 5 * 60 * 1000;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      const body = xhr.response as UploadResult<T> | null;
      if (body && typeof body === 'object' && 'ok' in body) resolve(body);
      else if (xhr.status === 413) resolve({ ok: false, error: 'Deze foto is te groot (maximaal 15 MB). Kies een kleinere foto.' });
      else resolve({ ok: false, error: 'Uploaden is niet gelukt. Probeer het opnieuw.' });
    };
    const networkError = () => resolve({ ok: false, error: 'Uploaden is niet gelukt. Controleer je internetverbinding en probeer het opnieuw.' });
    xhr.onerror = networkError;
    xhr.ontimeout = networkError;
    xhr.send(form);
  });
}
