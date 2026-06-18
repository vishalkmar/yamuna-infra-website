// Cloudinary uploads for the admin portal's image fields.
// Primary path: SIGNED upload — the browser asks our backend (/admin/media/sign)
// for a signature (secret stays server-side), then uploads straight to Cloudinary.
// No unsigned preset required. Falls back to an unsigned preset if one is set.
import api from './api';

const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const ENV_CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

// Uploads are available whenever the backend can sign (almost always) or an
// unsigned preset is configured.
export function cloudinaryConfigured() {
  return true;
}

function mapResult(d) {
  return {
    url: d.secure_url,
    publicId: d.public_id,
    folder: d.folder || null,
    format: d.format,
    bytes: d.bytes,
    width: d.width,
    height: d.height,
  };
}

async function signedUpload(file) {
  const { data } = await api.get('/admin/media/sign');
  const s = data.data; // { cloudName, apiKey, timestamp, signature, folder }
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', s.apiKey);
  form.append('timestamp', s.timestamp);
  form.append('signature', s.signature);
  if (s.folder) form.append('folder', s.folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${s.cloudName}/image/upload`, { method: 'POST', body: form });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message || 'Upload failed');
  return mapResult(body);
}

async function unsignedUpload(file) {
  if (!ENV_CLOUD || !PRESET) throw new Error('No unsigned preset configured');
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${ENV_CLOUD}/image/upload`, { method: 'POST', body: form });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message || 'Upload failed');
  return mapResult(body);
}

// Upload a File/Blob → returns the full asset object. Tries signed first.
export async function uploadImage(file) {
  try {
    return await signedUpload(file);
  } catch (e) {
    // Fall back to unsigned preset if available; otherwise surface the error.
    if (ENV_CLOUD && PRESET) return unsignedUpload(file);
    throw e;
  }
}

// "Upload by link": pass the URL through (Cloudinary fetch can optimise later).
export async function importImageByUrl(url) {
  return url;
}

// Upload any file (PDF, etc.) via Cloudinary's /auto/ endpoint — same signed
// params (resource_type is in the URL, not the signature). Returns { url, ... }.
export async function uploadFile(file) {
  const { data } = await api.get('/admin/media/sign');
  const s = data.data;
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', s.apiKey);
  form.append('timestamp', s.timestamp);
  form.append('signature', s.signature);
  if (s.folder) form.append('folder', s.folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${s.cloudName}/auto/upload`, { method: 'POST', body: form });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message || 'Upload failed');
  return mapResult(body);
}
