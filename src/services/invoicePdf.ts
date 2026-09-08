import ReactNativeBlobUtil from 'react-native-blob-util';

import { API_BASE } from './api';

/**
 * Downloads and opens an invoice PDF on the device (FR-25 / FR-40).
 *
 * `GET /invoices/:id/pdf` streams the generated invoice. Unlike the JSON
 * helpers this cannot go through axios, because React Native has no way to
 * hand a streamed file to the system viewer without writing it to disk first,
 * so it uses `react-native-blob-util`. The same endpoint serves both sides
 * (admin and shop owner), so the transport lives here rather than in either
 * module's API file.
 *
 * The access token is passed in explicitly rather than read from the store
 * here: this module would otherwise import the store and reintroduce the
 * cycle api.ts avoids.
 */
export async function downloadInvoicePdf(
  invoiceId: string,
  accessToken: string,
): Promise<{ path: string }> {
  const url = `${API_BASE}/invoices/${invoiceId}/pdf`;

  const res = await ReactNativeBlobUtil.config({
    fileCache: true,
    appendExt: 'pdf',
    addAndroidDownloads: {
      useDownloadManager: true,
      notification: true,
      title: `invoice-${invoiceId}.pdf`,
      description: 'CakeConnect invoice',
    },
  })
    .fetch('GET', url, {
      Authorization: `Bearer ${accessToken}`,
    })
    .progress((received, total) => {
      // No-op progress hook; kept for wiring downloads with a progress bar later.
      void received;
      void total;
    });

  const status = res.info().status;
  if (status !== 200) {
    throw new Error(`Invoice PDF download failed (${status})`);
  }

  return { path: res.path() };
}