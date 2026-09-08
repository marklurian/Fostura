import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/**
 * Returns true if valid Supabase environment variables are provided
 */
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith("http") &&
  !supabaseUrl.includes("placeholder")
);

// Fallback to placeholder to prevent Next.js build-time errors when env vars are absent
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : "https://placeholder-project.supabase.co",
  isSupabaseConfigured ? supabaseAnonKey : "placeholder-anon-key"
);

/* ═══════════════════════════════════════════════════════════════
   Types Matching Supabase Schema
   ═══════════════════════════════════════════════════════════════ */
export interface SupabaseWorkout {
  id?: string;
  user_id: string;
  day_title: string;
  duration_seconds: number;
  completed_sets: number;
  total_sets: number;
  exercises: {
    name: string;
    trackedSets: {
      targetReps: string;
      weight: string;
      actualReps: string;
      completed: boolean;
      restSeconds?: number;
    }[];
  }[];
  calories: number;
  unit: "lbs" | "kg";
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseTemplate {
  id?: string;
  user_id: string;
  name: string;
  category: string;
  exercises: {
    name: string;
    sets: number;
    reps: string;
  }[];
  is_example?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseMetric {
  id?: string;
  user_id: string;
  date: string;
  weight: number;
  body_fat: number;
  calories: number;
  unit?: "lbs" | "kg";
  created_at?: string;
}

export interface SupabaseProfile {
  user_id: string;
  preferred_unit: "lbs" | "kg";
  fitness_goal?: string;
  experience_level?: string;
  equipment?: string;
  created_at?: string;
  updated_at?: string;
}

/* ═══════════════════════════════════════════════════════════════
   Local Storage Fallbacks (Offline & Resiliency Support)
   ═══════════════════════════════════════════════════════════════ */
const LOCAL_STORAGE_KEY = "forma_saved_workouts_v1";
const TEMPLATES_KEY = "forma-templates";
const METRICS_KEY = "forma-metrics";

function getLocalWorkouts(userId?: string): SupabaseWorkout[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const list: SupabaseWorkout[] = JSON.parse(raw);
    if (userId) {
      return list.filter((w) => w.user_id === userId);
    }
    return list;
  } catch {
    return [];
  }
}

function saveLocalWorkout(workout: SupabaseWorkout): SupabaseWorkout {
  if (typeof window === "undefined") return workout;
  try {
    const list = getLocalWorkouts();
    const withId: SupabaseWorkout = {
      ...workout,
      id: workout.id || `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: workout.created_at || new Date().toISOString(),
    };
    const updated = [withId, ...list.filter((w) => w.id !== withId.id)];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    return withId;
  } catch {
    return workout;
  }
}

function deleteLocalWorkout(workoutId: string): void {
  if (typeof window === "undefined") return;
  try {
    const list = getLocalWorkouts();
    const updated = list.filter((w) => w.id !== workoutId);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore error
  }
}

/* ═══════════════════════════════════════════════════════════════
   Workouts Operations
   ═══════════════════════════════════════════════════════════════ */

/**
 * Save completed workout record to Supabase (with automatic local fallback)
 */
export async function saveWorkoutToSupabase(
  workout: SupabaseWorkout
): Promise<{ data: SupabaseWorkout | null; isCloud: boolean; error: Error | null }> {
  // Always save locally first as reliable backup
  const localSaved = saveLocalWorkout(workout);

  try {
    if (!isSupabaseConfigured) {
      return { data: localSaved, isCloud: false, error: null };
    }

    // Strip temporary local ID so Postgres generates a true UUID
    const payload: Partial<SupabaseWorkout> = { ...workout };
    if (payload.id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.id)) {
      delete payload.id;
    }

    const { data, error } = await supabase
      .from("workouts")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.warn(
        "Supabase note: Workout preserved locally. To sync with cloud database, run supabase_schema.sql in your Supabase SQL Editor.",
        error.message || error
      );
      return { data: localSaved, isCloud: false, error: null };
    }

    if (data) {
      // Replace temporary local fallback with the confirmed cloud record to prevent duplicate entries
      deleteLocalWorkout(localSaved.id!);
      saveLocalWorkout(data);
      return { data, isCloud: true, error: null };
    }

    return { data: localSaved, isCloud: true, error: null };
  } catch (err: any) {
    console.warn(
      "Supabase sync notice: Workout preserved locally. Cloud sync pending table setup.",
      err?.message || err
    );
    return { data: localSaved, isCloud: false, error: null };
  }
}

/**
 * Fetch all saved workouts for a specific user ID
 */
export async function getUserWorkoutsFromSupabase(
  userId: string
): Promise<{ data: SupabaseWorkout[]; isCloud: boolean; error: Error | null }> {
  const localWorkouts = getLocalWorkouts(userId);

  try {
    if (!isSupabaseConfigured) {
      return { data: localWorkouts, isCloud: false, error: null };
    }

    const { data, error } = await supabase
      .from("workouts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      // Fallback seamlessly to local workouts if table is not created yet
      return { data: localWorkouts, isCloud: false, error: null };
    }

    // Merge cloud and local if any offline records exist
    const cloudIds = new Set((data || []).map((w: SupabaseWorkout) => w.id));
    const merged = [...(data || []), ...localWorkouts.filter((w) => !cloudIds.has(w.id))];
    merged.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    return { data: merged, isCloud: true, error: null };
  } catch (err: any) {
    return { data: localWorkouts, isCloud: false, error: null };
  }
}

/**
 * Delete a specific workout record
 */
export async function deleteWorkoutFromSupabase(
  workoutId: string,
  userId: string
): Promise<{ success: boolean; error: Error | null }> {
  deleteLocalWorkout(workoutId);

  try {
    if (!isSupabaseConfigured) {
      return { success: true, error: null };
    }

    const { error } = await supabase
      .from("workouts")
      .delete()
      .eq("id", workoutId)
      .eq("user_id", userId);

    if (error) {
      return { success: true, error: null };
    }
    return { success: true, error: null };
  } catch (err: any) {
    return { success: true, error: null };
  }
}

/* ═══════════════════════════════════════════════════════════════
   Workout Templates Operations
   ═══════════════════════════════════════════════════════════════ */

export async function getUserTemplatesFromSupabase(
  userId: string
): Promise<{ data: SupabaseTemplate[]; isCloud: boolean }> {
  let localTemplates: SupabaseTemplate[] = [];
  if (typeof window !== "undefined") {
    try {
      localTemplates = JSON.parse(localStorage.getItem(TEMPLATES_KEY) || "[]");
    } catch {}
  }

  if (!isSupabaseConfigured) {
    return { data: localTemplates, isCloud: false };
  }

  try {
    const { data, error } = await supabase
      .from("workout_templates")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data) {
      return { data: localTemplates, isCloud: false };
    }

    return { data, isCloud: true };
  } catch {
    return { data: localTemplates, isCloud: false };
  }
}

export async function saveTemplateToSupabase(
  template: SupabaseTemplate
): Promise<{ data: SupabaseTemplate | null; isCloud: boolean }> {
  if (!isSupabaseConfigured) {
    return { data: template, isCloud: false };
  }

  try {
    const payload: Partial<SupabaseTemplate> = { ...template };
    if (payload.id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.id)) {
      delete payload.id;
    }

    const { data, error } = await supabase
      .from("workout_templates")
      .upsert([payload])
      .select()
      .single();

    if (error) return { data: template, isCloud: false };
    return { data, isCloud: true };
  } catch {
    return { data: template, isCloud: false };
  }
}

/* ═══════════════════════════════════════════════════════════════
   User Metrics Operations
   ═══════════════════════════════════════════════════════════════ */

export async function getUserMetricsFromSupabase(
  userId: string
): Promise<{ data: SupabaseMetric[]; isCloud: boolean }> {
  let localMetrics: SupabaseMetric[] = [];
  if (typeof window !== "undefined") {
    try {
      localMetrics = JSON.parse(localStorage.getItem(METRICS_KEY) || "[]");
    } catch {}
  }

  if (!isSupabaseConfigured) {
    return { data: localMetrics, isCloud: false };
  }

  try {
    const { data, error } = await supabase
      .from("user_metrics")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: true });

    if (error || !data) {
      return { data: localMetrics, isCloud: false };
    }

    return { data, isCloud: true };
  } catch {
    return { data: localMetrics, isCloud: false };
  }
}

export async function saveMetricToSupabase(
  metric: SupabaseMetric
): Promise<{ data: SupabaseMetric | null; isCloud: boolean }> {
  if (!isSupabaseConfigured) {
    return { data: metric, isCloud: false };
  }

  try {
    const payload: Partial<SupabaseMetric> = { ...metric };
    if (payload.id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.id)) {
      delete payload.id;
    }

    const { data, error } = await supabase
      .from("user_metrics")
      .insert([payload])
      .select()
      .single();

    if (error) return { data: metric, isCloud: false };
    return { data, isCloud: true };
  } catch {
    return { data: metric, isCloud: false };
  }
}
