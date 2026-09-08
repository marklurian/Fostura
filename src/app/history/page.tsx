"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import {
  getUserWorkoutsFromSupabase,
  deleteWorkoutFromSupabase,
  SupabaseWorkout,
} from "@/lib/supabaseClient";

export default function HistoryPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [workouts, setWorkouts] = useState<SupabaseWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      if (isSignedIn && user?.id) {
        setLoading(true);
        const { data, error } = await getUserWorkoutsFromSupabase(user.id);
        if (!error && data) {
          setWorkouts(data);
        }
        setLoading(false);
      } else {
        setLoading(false);
      }
    }

    if (isLoaded) {
      fetchHistory();
    }
  }, [isLoaded, isSignedIn, user?.id]);

  function handleRepeatWorkout(w: SupabaseWorkout) {
    try {
      localStorage.setItem("forma_repeat_workout_payload", JSON.stringify(w));
      router.push("/");
    } catch {
      router.push("/");
    }
  }

  async function handleDelete(id: string) {
    if (!user?.id) return;
    if (!confirm("Are you sure you want to delete this workout log?")) return;
    setDeletingId(id);
    const { success } = await deleteWorkoutFromSupabase(id, user.id);
    if (success) {
      setWorkouts((prev) => prev.filter((w) => w.id !== id));
    }
    setDeletingId(null);
  }

  // Aggregate Stats
  const totalWorkouts = workouts.length;
  const totalDurationMinutes = Math.round(
    workouts.reduce((sum, w) => sum + (w.duration_seconds || 0), 0) / 60
  );
  const totalCompletedSets = workouts.reduce(
    (sum, w) => sum + (w.completed_sets || 0),
    0
  );
  const totalCalories = workouts.reduce((sum, w) => sum + (w.calories || 0), 0);

  function formatDuration(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s < 10 ? "0" : ""}${s}s`;
  }

  function formatDate(isoString?: string) {
    if (!isoString) return "Recent Session";
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col antialiased selection:bg-cyan-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#090f1d]/85 backdrop-blur-xl px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="liquid-pill flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all button-press"
          >
            <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            <span>Back to Dashboard</span>
          </Link>

          <Link
            href="/profile"
            className="liquid-pill flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-amber-400/30 bg-amber-500/10 text-xs font-bold text-amber-300 hover:text-white transition-all button-press"
          >
            <svg className="h-3.5 w-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.003 0H9.497m5.003 0A4.5 4.5 0 0 0 18 9.75V4.5H6v5.25a4.5 4.5 0 0 0 3.497 4.5m4.006 0A2.25 2.25 0 0 1 12 16.5a2.25 2.25 0 0 1-1.5-.75" />
            </svg>
            <span>Trophy Room</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8 ring-2 ring-cyan-500/40 rounded-xl",
                },
              }}
            />
          ) : (
            <SignInButton mode="modal">
              <button
                type="button"
                className="liquid-pill flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border-cyan-400/40 text-cyan-300 hover:text-white text-xs font-bold transition-all button-press"
              >
                <span>Sign In</span>
              </button>
            </SignInButton>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {isLoaded && !isSignedIn && (
          /* Guest Screen */
          <div className="liquid-glass rounded-3xl p-8 sm:p-12 border border-white/10 text-center max-w-xl mx-auto my-12 space-y-6 animate-fade-in-up">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>

            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Workout History & Cloud Sync
              </h2>
              <p className="text-sm text-slate-400 mt-2">
                You are currently browsing in Guest Mode. Sign in or create a free account to permanently save your workout history, track personal records, and sync progress across all your devices.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 hover:opacity-95 transition-opacity button-press"
                >
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 font-bold text-sm transition-all button-press"
                >
                  Create Free Account
                </button>
              </SignUpButton>
            </div>
          </div>
        )}

        {isLoaded && isSignedIn && (
          <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-white/[0.06] animate-fade-in-down">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Workout <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-teal-300 bg-clip-text text-transparent">History</span>
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  All cloud-synced workout logs and performance metrics linked to your account.
                </p>
              </div>

              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 hover:opacity-95 transition-opacity button-press self-start sm:self-auto"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span>New Workout</span>
              </Link>
            </div>

            {/* Stats Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in-up">
              <div className="liquid-glass rounded-2xl p-3.5 border border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Workouts</span>
                <p className="text-2xl font-black text-white mt-1">{totalWorkouts}</p>
                <p className="text-[10px] text-sky-400 mt-0.5">Sessions logged</p>
              </div>

              <div className="liquid-glass rounded-2xl p-3.5 border border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Time Spent</span>
                <p className="text-2xl font-black text-cyan-300 mt-1">{totalDurationMinutes}m</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Total duration</p>
              </div>

              <div className="liquid-glass rounded-2xl p-3.5 border border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sets Completed</span>
                <p className="text-2xl font-black text-teal-300 mt-1">{totalCompletedSets}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Total volume sets</p>
              </div>

              <div className="liquid-glass rounded-2xl p-3.5 border border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Energy Expended</span>
                <p className="text-2xl font-black text-amber-300 mt-1">{totalCalories}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Est. kcal burned</p>
              </div>
            </div>

            {/* Workouts List */}
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                <p className="text-xs font-semibold mt-3">Fetching workout history from cloud...</p>
              </div>
            ) : workouts.length === 0 ? (
              <div className="liquid-glass rounded-3xl p-10 border border-white/10 text-center space-y-4 animate-fade-in-up">
                <p className="text-base font-extrabold text-white">No workouts recorded yet</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Complete your first workout in the Active Tracker to start logging your cloud history!
                </p>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white text-xs font-bold shadow-md button-press"
                >
                  Start Workout Now
                </Link>
              </div>
            ) : (
              <div className="space-y-3.5 animate-fade-in-up">
                {workouts.map((w) => {
                  const isExpanded = expandedWorkoutId === w.id;

                  return (
                    <div
                      key={w.id}
                      className="liquid-glass rounded-2xl border border-white/10 overflow-hidden transition-all duration-300 hover:border-cyan-500/40"
                    >
                      {/* Header Row */}
                      <div
                        onClick={() => setExpandedWorkoutId(isExpanded ? null : (w.id || null))}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-extrabold text-sm">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                            </svg>
                          </span>
                          <div className="min-w-0">
                            <h3 className="text-base font-extrabold text-white truncate">{w.day_title}</h3>
                            <p className="text-xs text-slate-400 mt-0.5">{formatDate(w.created_at)}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="liquid-pill px-2.5 py-1 text-xs font-bold text-slate-300 rounded-lg">
                              {formatDuration(w.duration_seconds)}
                            </span>
                            <span className="liquid-pill px-2.5 py-1 text-xs font-bold text-teal-300 rounded-lg">
                              {w.completed_sets}/{w.total_sets} sets
                            </span>
                            <span className="liquid-pill px-2.5 py-1 text-xs font-bold text-amber-300 rounded-lg">
                              {w.calories} kcal
                            </span>
                            <span className="liquid-pill px-2.5 py-1 text-xs font-black text-amber-300 bg-amber-500/15 border border-amber-400/30 rounded-lg">
                              +{100 + (w.completed_sets || 0) * 10} XP
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Repeat Workout Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRepeatWorkout(w);
                              }}
                              className="liquid-pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:text-white border-cyan-500/40 hover:border-cyan-400 rounded-xl transition-all button-press"
                              title="Repeat this workout with pre-filled weights"
                            >
                              <svg className="h-3.5 w-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                              </svg>
                              <span>Repeat</span>
                            </button>

                            {w.id && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(w.id!);
                                }}
                                disabled={deletingId === w.id}
                                className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                                title="Delete workout log"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                </svg>
                              </button>
                            )}
                            <span className="text-slate-400 p-1">
                              <svg
                                className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2.5}
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                              </svg>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Expandable Exercise Details */}
                      {isExpanded && w.exercises && w.exercises.length > 0 && (
                        <div className="border-t border-white/[0.06] bg-white/[0.015] p-4 sm:p-5 space-y-4 animate-fade-in">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                              Exercises Breakdown
                            </h4>
                            <button
                              type="button"
                              onClick={() => handleRepeatWorkout(w)}
                              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 hover:text-white border border-sky-500/30 text-xs font-bold transition-all button-press"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                              </svg>
                              <span>Repeat Workout</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {w.exercises.map((ex, ei) => (
                              <div
                                key={ei}
                                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2"
                              >
                                <p className="text-xs font-bold text-cyan-200 truncate">{ex.name}</p>
                                <div className="divide-y divide-white/[0.04] text-[11px]">
                                  {ex.trackedSets.map((s, si) => (
                                    <div key={si} className="py-1 flex items-center justify-between text-slate-300">
                                      <span className="font-semibold text-slate-400">Set {si + 1}</span>
                                      <span className="font-mono text-cyan-300">
                                        {s.weight ? `${s.weight} ${w.unit}` : "Bodyweight"} × {s.actualReps || s.targetReps} reps
                                      </span>
                                      <span className={s.completed ? "text-emerald-400 font-bold" : "text-slate-500"}>
                                        {s.completed ? "Done" : "—"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
