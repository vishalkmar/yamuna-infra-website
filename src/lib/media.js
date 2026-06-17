import api from './api';

// Record a Cloudinary upload in the Media Library (best-effort — never block
// the upload UX if this fails).
export async function recordMedia(asset, label) {
  try {
    await api.post('/admin/media', { ...asset, label: label || null });
  } catch {
    /* non-fatal */
  }
}

export async function listMedia(params) {
  const { data } = await api.get('/admin/media', { params });
  return data.data;
}

export async function deleteMedia(id) {
  await api.delete(`/admin/media/${id}`);
}
