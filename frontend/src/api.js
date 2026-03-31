const BASE = '/api';

export async function getPhotoLocations() {
  const res = await fetch(`${BASE}/photos`);
  if (!res.ok) throw new Error('Fehler beim Laden der Fotos');
  return res.json();
}

export async function getPhotosAtLocation(lat, lng) {
  const res = await fetch(`${BASE}/photos/location?lat=${lat}&lng=${lng}`);
  if (!res.ok) throw new Error('Fehler beim Laden der Fotos');
  return res.json();
}

export async function getPhotoById(id) {
  const res = await fetch(`${BASE}/photos/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Foto nicht gefunden');
  return data;
}

export async function uploadPhoto(formData) {
  const res = await fetch(`${BASE}/photos`, { method: 'POST', body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload fehlgeschlagen');
  return data;
}

export async function adminLogin(password) {
  const res = await fetch(`${BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login fehlgeschlagen');
  return data;
}

export async function getPendingPhotos(token) {
  const res = await fetch(`${BASE}/admin/photos`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Fehler beim Laden');
  return data;
}

export async function getApprovedPhotos(token) {
  const res = await fetch(`${BASE}/admin/photos/approved`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Fehler beim Laden');
  return data;
}

export async function updatePhotoStatus(id, status, token) {
  const res = await fetch(`${BASE}/admin/photos/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Fehler beim Aktualisieren');
  return data;
}

export async function deletePhoto(id, token) {
  const res = await fetch(`${BASE}/admin/photos/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Fehler beim Löschen');
  return data;
}

export async function getRandomPhoto() {
  const res = await fetch(`${BASE}/photos/random`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Kein Foto gefunden');
  return data;
}

export async function getNearbyPhotos(id) {
  const res = await fetch(`${BASE}/photos/${id}/nearby`);
  if (!res.ok) return [];
  return res.json();
}

export async function trackVisit() {
  try {
    await fetch(`${BASE.replace('/api', '')}/api/visits`, { method: 'POST' });
  } catch {}
}

export async function getVisitStats(token) {
  const res = await fetch(`${BASE}/admin/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Fehler beim Laden');
  return data;
}

export async function submitChangeRequest(photoId, body) {
  const res = await fetch(`${BASE}/photos/${photoId}/change-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Fehler beim Einreichen');
  return data;
}

export async function getChangeRequests(token) {
  const res = await fetch(`${BASE}/admin/change-requests`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Fehler beim Laden');
  return data;
}

export async function approveChangeRequest(id, token) {
  const res = await fetch(`${BASE}/admin/change-requests/${id}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Fehler beim Freigeben');
  return data;
}

export async function rejectChangeRequest(id, token) {
  const res = await fetch(`${BASE}/admin/change-requests/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Fehler beim Ablehnen');
  return data;
}
