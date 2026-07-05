import { Platform } from 'react-native';
import { supabase } from './supabase';
import { Memory } from './types';

const BUCKET = 'memories';

// Public URL for a stored memory photo.
export function memoryUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// Open the browser's native file picker (web). Returns the chosen image, or null.
export function pickImageWeb(): Promise<File | null> {
  return new Promise((resolve) => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      resolve(null);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => resolve(input.files && input.files[0] ? input.files[0] : null);
    input.click();
  });
}

export async function fetchMemories(tripId: string): Promise<Memory[]> {
  const { data } = await supabase
    .from('memories')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });
  return (data ?? []) as Memory[];
}

function extFor(file: File): string {
  const fromName = file.name?.split('.').pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  const fromType = file.type?.split('/').pop();
  return fromType || 'jpg';
}

// Upload an image to Storage and create its memory row.
export async function addMemory(params: {
  tripId: string;
  userId: string;
  file: File;
  caption?: string;
  note?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { tripId, userId, file, caption, note } = params;
  const path = `${tripId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extFor(file)}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  });
  if (up.error) {
    if (/bucket/i.test(up.error.message)) return { ok: false, error: 'Run the 0015_memories.sql migration in Supabase first.' };
    return { ok: false, error: up.error.message };
  }
  const { error } = await supabase.from('memories').insert({
    trip_id: tripId,
    created_by: userId,
    photo_path: path,
    caption: caption?.trim() || null,
    note: note?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function toggleFavourite(id: string, next: boolean) {
  await supabase.from('memories').update({ is_favourite: next }).eq('id', id);
}

export async function deleteMemory(m: Memory) {
  await supabase.from('memories').delete().eq('id', m.id);
  await supabase.storage.from(BUCKET).remove([m.photo_path]);
}

// Owner edits to the album's recap + keepsake text.
export async function updateTripRecap(tripId: string, recap: string, keepsake: string) {
  await supabase.from('trips').update({ recap: recap.trim() || null, keepsake: keepsake.trim() || null }).eq('id', tripId);
}
