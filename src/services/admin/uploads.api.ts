import { apiPost } from '../api';

/**
 * Uploads — admin only.
 *
 * Endpoint: `/uploads/images`.
 */

/** Uploads base64 image bytes and returns the public URL to store on a record. */
export async function uploadImage(base64: string): Promise<string> {
  const { url } = await apiPost<{ url: string }>(
    '/uploads/images',
    { data: base64 },
    // A photo on a slow connection can outlast the default request timeout.
    { timeoutMs: 60_000 },
  );
  return url;
}
