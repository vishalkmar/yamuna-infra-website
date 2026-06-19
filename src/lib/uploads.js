// Local document uploads (PDFs) — sent to our own backend, stored on disk and
// served from /uploads/documents. Replaces Cloudinary for documents so the
// files open/preview reliably.
import api from './api';

// Upload a File/Blob → returns { url, filename, bytes }.
export async function uploadDocument(file) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/admin/documents/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}
