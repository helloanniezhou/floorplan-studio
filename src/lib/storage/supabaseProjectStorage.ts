import type { FloorPlan } from '../../types/floorPlan';
import { supabase } from '../supabase/client';
import type { SavedProject, SavedProjectMeta } from './projectStorage';

type SupabaseProjectRow = {
  id: string;
  user_id: string;
  name: string;
  updated_at: string;
  plan_json: FloorPlan;
};

function assertSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
}

export async function listSupabaseProjects(userId: string): Promise<SavedProjectMeta[]> {
  assertSupabase();
  const { data, error } = await supabase!
    .from('projects')
    .select('id,name,updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: { id: string; name: string; updated_at: string }) => ({
    id: row.id,
    name: row.name,
    updatedAt: new Date(row.updated_at).getTime(),
  }));
}

export async function getSupabaseProject(
  userId: string,
  id: string,
): Promise<SavedProject | undefined> {
  assertSupabase();
  const { data, error } = await supabase!
    .from('projects')
    .select('id,name,updated_at,plan_json,user_id')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  const row = data as SupabaseProjectRow;
  return {
    id: row.id,
    name: row.name,
    updatedAt: new Date(row.updated_at).getTime(),
    plan: row.plan_json,
  };
}

export async function saveSupabaseProject(userId: string, project: SavedProject): Promise<void> {
  assertSupabase();
  const payload = {
    id: project.id,
    user_id: userId,
    name: project.name,
    updated_at: new Date(project.updatedAt).toISOString(),
    plan_json: project.plan,
  };
  const { error } = await supabase!.from('projects').upsert(payload);
  if (error) throw error;
}

export async function deleteSupabaseProject(userId: string, id: string): Promise<void> {
  assertSupabase();
  const { error } = await supabase!.from('projects').delete().eq('user_id', userId).eq('id', id);
  if (error) throw error;
}
