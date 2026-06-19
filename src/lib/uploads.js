// Local document uploads (PDFs) — sent to our own backend, stored on disk and
// served from /uploads/documents. Replaces Cloudinary for documents so the
// files open/preview reliably. The backend stores the file AND creates the
// resident's docket record in one request.
import api from './api';

// Upload a PDF for a resident → returns the updated docket list.
export async function uploadDocketPdf(file, { userId, title, kind } = {}) {
  const form = new FormData();
  form.append('file', file);
  if (userId != null) form.append('userId', userId);
  if (title) form.append('title', title);
  if (kind) form.append('kind', kind);
  const { data } = await api.post('/admin/documents/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data; // updated list of dockets
}
