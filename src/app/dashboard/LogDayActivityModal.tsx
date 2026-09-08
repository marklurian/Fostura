"use client";

import React, { useState } from "react";
import type { SupabaseWorkout } from "@/lib/supabaseClient";
import type { ScheduleDayItem } from "./page";

interface Exercise {
  name: string;
  sets: number;
  reps: string;
}

interface LogDayActivityModalProps {
  dayItem: ScheduleDayItem;
  onSaveWorkout: (workout: Partial<SupabaseWorkout>) => Promise<void> | void;
  onDeleteWorkout?: (workoutId: string) => Promise<void> | void;
  onStartLiveSession?: (title: string, exercises?: Exercise[]) => void;
  onClose: () => void;
  unit?: "lbs" | "kg";
}

const QUICK_ACTIVITIES = [
  "Push",
  "Pull",
  "Legs",
  "Upper Body",
  "Cardio",
  "Rest Day",
];

export function LogDayActivityModal({
  dayItem,
  onSaveWorkout,
  onDeleteWorkout,
  onClose,
  unit = "lbs",
}: LogDayActivityModalProps) {
  const hasExisting = Boolean(dayItem.loggedWorkout);
  const [viewMode, setViewMode] = useState<"details" | "log">(hasExisting ? "details" : "log");

  const initialTitle =
    dayItem.loggedWorkout?.day_title ||
    (dayItem.title &&
    dayItem.title !== "Log Activity" &&
    dayItem.title !== "Recovery" &&
    dayItem.title !== "Rest" &&
    dayItem.title !== "Unlogged" &&
    dayItem.title !== "—"
      ? dayItem.title
      : "Push");

  const [activityTitle, setActivityTitle] = useState(initialTitle);
  const [saving, setSaving] = useState(false);

  // Format date for modal header (e.g. Tuesday, Sept 8)
  const dateFormatted = dayItem.dateFormatted
    ? `${dayItem.dayFull}, ${dayItem.dateFormatted}`
    : dayItem.dayDate
    ? new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" }).format(dayItem.dayDate)
    : dayItem.dayFull;

  async function handleSaveLog() {
    setSaving(true);
    try {
      const workoutDate = dayItem.dayDate || new Date();

      const newWorkout: Partial<SupabaseWorkout> = {
        day_title: activityTitle.trim() || "Workout Session",
        duration_seconds: 45 * 60,
        completed_sets: 0,
        total_sets: 0,
        exercises: [],
        calories: 250,
        unit,
        created_at: workoutDate.toISOString(),
      };

      await onSaveWorkout(newWorkout);
      onClose();
    } catch (err) {
      console.error("Failed to log activity:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <h2 className="text-base sm:text-lg font-bold text-white">
                {hasExisting && viewMode === "details" ? "Logged Activity" : "Log Activity"}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {dateFormatted} {dayItem.status === "today" ? "• Today" : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-4 space-y-4">
          {/* VIEW MODE: DETAILS OF ALREADY LOGGED WORKOUT */}
          {hasExisting && viewMode === "details" && dayItem.loggedWorkout ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-white">
                        {dayItem.loggedWorkout.day_title}
                      </h3>
                      <span className="text-[11px] text-slate-400">
                        {dateFormatted}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-emerald-300 font-semibold text-[10px] uppercase tracking-wider border border-emerald-400/30 bg-emerald-400/10">
                    Logged
                  </span>
                </div>
              </div>

              {/* Action Buttons in Details View */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setViewMode("log")}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs hover:bg-slate-700 hover:text-white transition-colors button-press"
                >
                  Edit Activity
                </button>
                {dayItem.loggedWorkout.id && onDeleteWorkout && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (dayItem.loggedWorkout?.id && onDeleteWorkout) {
                        await onDeleteWorkout(dayItem.loggedWorkout.id);
                        onClose();
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 font-bold text-xs hover:bg-red-500/25 transition-colors button-press"
                  >
                    Delete Log
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* SIMPLE LOG VIEW: ONLY WHAT YOU DID */
            <div className="space-y-4">
              {/* Quick Preset Buttons */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-2">
                  Select Activity
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {QUICK_ACTIVITIES.map((act) => {
                    const isSelected = activityTitle.toLowerCase() === act.toLowerCase();
                    return (
                      <button
                        key={act}
                        type="button"
                        onClick={() => setActivityTitle(act)}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-colors truncate button-press ${
                          isSelected
                            ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                            : "bg-white/[0.03] border-white/[0.08] text-slate-300 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        {act}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Input */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">
                  Or Type What You Did
                </label>
                <input
                  type="text"
                  value={activityTitle}
                  onChange={(e) => setActivityTitle(e.target.value)}
                  placeholder="e.g. Push, 5k Run, Swimming, Rest..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-medium placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>

              {/* Save Button */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  disabled={saving || !activityTitle.trim()}
                  onClick={handleSaveLog}
                  className="w-full py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors button-press disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Log Activity"}
                </button>

                {hasExisting && (
                  <button
                    type="button"
                    onClick={() => setViewMode("details")}
                    className="w-full py-2 rounded-xl text-slate-400 hover:text-slate-200 font-semibold text-xs transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
