"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import {
  saveWorkoutToSupabase,
  getUserWorkoutsFromSupabase,
  deleteWorkoutFromSupabase,
  SupabaseWorkout,
} from "@/lib/supabaseClient";
import {
  EXERCISE_LIBRARY,
  BodyPart,
  EquipmentCategory,
  ExerciseLibraryItem,
} from "../data/exercises";
import {
  getDefaultStats,
  loadGamificationStats,
  saveGamificationStats,
  recordWorkoutCompletion,
  awardMiscXP,
  levelFromXP,
  titleForLevel,
  colorForLevel,
  xpProgressInLevel,
  xpForLevel,
  getCurrentStreakStatus,
  getActiveChallenge,
  generateConfettiParticles,
  playSetCompletionSound,
  playLevelUpFanfare,
  ACHIEVEMENTS,
  XP_REWARDS,
  type GamificationStats,
  type GamificationResult,
  type XPGainEvent,
} from "@/lib/gamification";
import { AchievementIcon } from "@/app/profile/page";
import { TrophyRoomTab } from "./TrophyRoomTab";
import { AnatomicalHumanBody } from "./AnatomicalHumanBody";
import { LogDayActivityModal } from "./LogDayActivityModal";

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */
interface Exercise {
  name: string;
  sets: number;
  reps: string;
}

interface WorkoutDay {
  day: string;
  exercises: Exercise[];
}

interface TrackedSet {
  targetReps: string;
  weight: string;
  actualReps: string;
  completed: boolean;
  restSeconds?: number;
}

interface TrackedExercise {
  name: string;
  trackedSets: TrackedSet[];
  interExerciseRestSeconds?: number;
}

interface WorkoutTemplate {
  id: string;
  name: string;
  category: string;
  exercises: Exercise[];
  isExample?: boolean;
}

interface MetricEntry {
  id: string;
  date: string; // YYYY-MM-DD
  weight: number; // lbs
  bodyFat: number; // %
  calories: number; // kcal
}

interface ExerciseHistoryItem {
  id: string;
  date: string; // YYYY-MM-DD
  sets: { setNum: number; weight: number; reps: number }[];
  unit: "lbs" | "kg";
}

/* ═══════════════════════════════════════════════════════════════
   Constants & Datasets
   ═══════════════════════════════════════════════════════════════ */
const FITNESS_GOALS = ["Lose Weight", "Build Muscle", "Get Lean", "Strength"] as const;
const EXPERIENCE_LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
const EQUIPMENT_OPTIONS = ["Full Gym", "Dumbbells Only", "Bodyweight"] as const;

const EXAMPLE_TEMPLATES: WorkoutTemplate[] = [
  {
    id: "ex-push",
    name: "Push Hypertrophy",
    category: "Chest & Shoulders",
    isExample: true,
    exercises: [
      { name: "Bench Press", sets: 4, reps: "8-10" },
      { name: "Seated Shoulder Press", sets: 3, reps: "8-10" },
      { name: "Incline Dumbbell Press", sets: 3, reps: "10-12" },
      { name: "Lateral Raise", sets: 3, reps: "12-15" },
      { name: "Tricep Pushdown", sets: 3, reps: "12-15" },
      { name: "Overhead Tricep Extension", sets: 3, reps: "10-12" },
    ],
  },
  {
    id: "ex-pull",
    name: "Pull Strength",
    category: "Back & Biceps",
    isExample: true,
    exercises: [
      { name: "Deadlift", sets: 4, reps: "5-6" },
      { name: "Bent-Over Row", sets: 4, reps: "8-10" },
      { name: "Lat Pulldown", sets: 3, reps: "8-10" },
      { name: "Face Pull", sets: 3, reps: "15-20" },
      { name: "Incline Curl", sets: 3, reps: "10-12" },
      { name: "Hammer Curl", sets: 3, reps: "10-12" },
    ],
  },
  {
    id: "ex-legs",
    name: "Leg Power & Quads",
    category: "Lower Body",
    isExample: true,
    exercises: [
      { name: "Back Squat", sets: 4, reps: "6-8" },
      { name: "Romanian Deadlift (RDL)", sets: 4, reps: "8-10" },
      { name: "Bulgarian Split Squat", sets: 3, reps: "10 each" },
      { name: "Leg Extension", sets: 3, reps: "12-15" },
      { name: "Seated Leg Curl", sets: 3, reps: "12-15" },
      { name: "Standing Calf Raise", sets: 4, reps: "15-20" },
    ],
  },
  {
    id: "ex-upper",
    name: "Upper Body Power",
    category: "Complete Upper",
    isExample: true,
    exercises: [
      { name: "Incline Bench Press", sets: 4, reps: "6-8" },
      { name: "Pull-Ups", sets: 4, reps: "6-8" },
      { name: "Overhead Press", sets: 3, reps: "8-10" },
      { name: "Seated Cable Row", sets: 3, reps: "10-12" },
      { name: "Lateral Raise", sets: 3, reps: "12-15" },
      { name: "Tricep Pushdown", sets: 3, reps: "10-12" },
    ],
  },
  {
    id: "ex-full",
    name: "Full Body Foundation",
    category: "Total Body",
    isExample: true,
    exercises: [
      { name: "Back Squat", sets: 3, reps: "8-10" },
      { name: "Bench Press", sets: 3, reps: "8-10" },
      { name: "Bent-Over Row", sets: 3, reps: "8-10" },
      { name: "Romanian Deadlift (RDL)", sets: 3, reps: "10-12" },
      { name: "Lateral Raise", sets: 3, reps: "12-15" },
      { name: "Hanging Leg Raise", sets: 3, reps: "12-15" },
    ],
  },
  {
    id: "ex-hiit",
    name: "HIIT Conditioning",
    category: "Cardio & Stamina",
    isExample: true,
    exercises: [
      { name: "Thrusters", sets: 4, reps: "12" },
      { name: "Push-Ups", sets: 4, reps: "15" },
      { name: "Mountain Climbers", sets: 4, reps: "40s" },
      { name: "Hanging Leg Raise", sets: 4, reps: "12" },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════
   Helpers & Persistence
   ═══════════════════════════════════════════════════════════════ */
function formatTime(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

function formatTimeLong(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec}s`;
  return `${m}m ${sec}s`;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function exercisesToTracked(exercises: Exercise[]): TrackedExercise[] {
  return exercises.map((ex) => ({
    name: ex.name,
    trackedSets: Array.from({ length: ex.sets }, () => ({
      targetReps: ex.reps,
      weight: "",
      actualReps: "",
      completed: false,
    })),
  }));
}

function loadUserTemplates(): WorkoutTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("forma-templates") || "[]");
  } catch {
    return [];
  }
}

function saveUserTemplates(t: WorkoutTemplate[]) {
  localStorage.setItem("forma-templates", JSON.stringify(t));
}

function loadAiPlan(): WorkoutDay[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("forma-ai-plan");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function saveAiPlan(p: WorkoutDay[] | null) {
  if (typeof window === "undefined") return;
  try {
    if (p) {
      localStorage.setItem("forma-ai-plan", JSON.stringify(p));
    } else {
      localStorage.removeItem("forma-ai-plan");
    }
  } catch {}
}

function isMainPlanMarked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem("forma-main-plan-active") === "true";
  } catch {
    return false;
  }
}

function setMainPlanMarked(active: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (active) {
      localStorage.setItem("forma-main-plan-active", "true");
    } else {
      localStorage.removeItem("forma-main-plan-active");
    }
  } catch {}
}

function loadUserMetrics(): MetricEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("forma-metrics");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Auto-clean legacy dummy mock ids if any were cached in local storage
    const isLegacySeed = parsed.length > 0 && parsed.every((p: any) => typeof p.id === "string" && p.id.startsWith("m-"));
    if (isLegacySeed) {
      localStorage.removeItem("forma-metrics");
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
}

function saveUserMetrics(m: MetricEntry[]) {
  localStorage.setItem("forma-metrics", JSON.stringify(m));
}

function loadExerciseHistory(): Record<string, ExerciseHistoryItem[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("forma-exercise-history");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    // Auto-clean legacy dummy mock sets if any were cached in local storage
    const isLegacySeed = Object.values(parsed).some((arr: any) =>
      Array.isArray(arr) && arr.some((item: any) => typeof item.id === "string" && item.id.startsWith("h-"))
    );
    if (isLegacySeed) {
      localStorage.removeItem("forma-exercise-history");
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
}

function saveExerciseHistory(h: Record<string, ExerciseHistoryItem[]>) {
  localStorage.setItem("forma-exercise-history", JSON.stringify(h));
}

function loadPreferredUnit(): "lbs" | "kg" {
  if (typeof window === "undefined") return "lbs";
  try {
    const raw = localStorage.getItem("forma-unit");
    if (raw === "kg" || raw === "lbs") return raw;
    return "lbs";
  } catch {
    return "lbs";
  }
}

function savePreferredUnit(unit: "lbs" | "kg") {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("forma-unit", unit);
  } catch {}
}

/* ═══════════════════════════════════════════════════════════════
   Segmented Unit Selector Component [ LBS | KG ]
   ═══════════════════════════════════════════════════════════════ */
function UnitTogglePill({
  unit,
  onChange,
  size = "md",
}: {
  unit: "lbs" | "kg";
  onChange: (u: "lbs" | "kg") => void;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "px-2.5 py-0.5 text-[10px]" : "px-3.5 py-1 text-xs";
  return (
    <div className="liquid-pill flex items-center rounded-xl p-0.5 border-sky-400/20 shrink-0 select-none">
      <button
        type="button"
        onClick={() => onChange("lbs")}
        className={`${pad} font-extrabold rounded-lg transition-all ${
          unit === "lbs"
            ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md shadow-sky-500/25"
            : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
        }`}
      >
        LBS
      </button>
      <button
        type="button"
        onClick={() => onChange("kg")}
        className={`${pad} font-extrabold rounded-lg transition-all ${
          unit === "kg"
            ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md shadow-sky-500/25"
            : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
        }`}
      >
        KG
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Liquid Background with Ambient Fluid Orbs (Ocean Blue Serenity)
   ═══════════════════════════════════════════════════════════════ */
function LiquidBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-[#020713]" />;
  }

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="animate-blob-1 absolute -left-[10%] top-[8%] h-[580px] w-[580px] rounded-full bg-[#003b73]/25 blur-[130px]" />
      <div className="animate-blob-2 absolute -right-[10%] top-[20%] h-[620px] w-[620px] rounded-full bg-[#0074b7]/20 blur-[140px]" />
      <div className="animate-blob-1 absolute left-[28%] top-[60%] h-[520px] w-[520px] rounded-full bg-[#00a8e8]/15 blur-[135px]" />

      <svg className="absolute inset-0 h-full w-full opacity-[0.025]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="liquid-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1" fill="#7dd3fc" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#liquid-grid)" />
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Live Date & Time Widget (Sidebar & Mobile)
   ═══════════════════════════════════════════════════════════════ */
function LiveDateTime({ compact = false }: { compact?: boolean }) {
  const [timeStr, setTimeStr] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setDateStr(
        now.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      );
      setTimeStr(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!timeStr) return null;

  if (compact) {
    return (
      <div
        className="liquid-pill flex flex-col items-center justify-center rounded-xl p-1.5 text-center select-none"
        title={`${dateStr} • ${timeStr}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#38bdf8] mb-1" />
        <span className="font-mono text-[9px] font-bold text-sky-200 leading-none tabular-nums">
          {timeStr.split(" ")[0]}
        </span>
        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
          {timeStr.split(" ")[1]}
        </span>
      </div>
    );
  }

  return (
    <div className="liquid-glass flex items-center justify-between rounded-xl px-3 py-2 border-white/10 text-xs shadow-inner">
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8] shrink-0" />
        <span className="font-semibold text-slate-300 truncate text-[11px]">{dateStr}</span>
      </div>
      <span className="font-mono font-bold text-sky-200 text-xs shrink-0 tabular-nums">{timeStr}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Fitness Goal Interactive Selector Card
   ═══════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════
   Target Fitness Goal Selector (Clean, Minimalist Cards)
   ═══════════════════════════════════════════════════════════════ */
const GOAL_OPTIONS = [
  {
    id: "Build Muscle",
    title: "Build Muscle",
    sub: "Hypertrophy & progressive overload",
  },
  {
    id: "Strength",
    title: "Strength & Power",
    sub: "Heavy compound force output",
  },
  {
    id: "Get Lean",
    title: "Get Lean & Cut",
    sub: "Caloric deficit & definition",
  },
  {
    id: "Lose Weight",
    title: "Lose Weight",
    sub: "High metabolic conditioning",
  },
];

function FitnessGoalSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          1. Target Goal
        </label>
        {value && (
          <span className="text-[10px] font-mono font-bold text-cyan-300">
            {GOAL_OPTIONS.find((g) => g.id === value)?.title}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {GOAL_OPTIONS.map((g) => {
          const selected = value === g.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onChange(g.id)}
              className={`text-left p-3.5 rounded-2xl border transition-all duration-200 button-press flex items-center justify-between gap-3 ${
                selected
                  ? "border-cyan-400/60 bg-gradient-to-r from-cyan-500/15 via-sky-500/10 to-transparent shadow-[0_0_15px_rgba(56,189,248,0.15)] ring-1 ring-cyan-400/40"
                  : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-bold leading-snug truncate ${selected ? "text-white" : "text-slate-200"}`}>
                  {g.title}
                </p>
                <p className={`text-[10px] leading-snug truncate mt-0.5 ${selected ? "text-cyan-200/90" : "text-slate-400"}`}>
                  {g.sub}
                </p>
              </div>
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${
                  selected
                    ? "border-cyan-400 bg-cyan-400 text-slate-950 shadow-sm shadow-cyan-400/40"
                    : "border-white/20 bg-white/[0.03]"
                }`}
              >
                {selected && <div className="h-1.5 w-1.5 rounded-full bg-slate-950" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Sleek Segmented Experience Level Control (1 Unified Bar)
   ═══════════════════════════════════════════════════════════════ */
const EXPERIENCE_OPTIONS = [
  { id: "Beginner", title: "Beginner", tenure: "0–1 yrs" },
  { id: "Intermediate", title: "Intermediate", tenure: "1–3 yrs" },
  { id: "Advanced", title: "Advanced", tenure: "3+ yrs" },
];

function ExperienceLevelSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          2. Experience Level
        </label>
        {value && (
          <span className="text-[10px] font-mono font-bold text-cyan-300">
            {EXPERIENCE_OPTIONS.find((e) => e.id === value)?.tenure}
          </span>
        )}
      </div>
      <div className="p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] grid grid-cols-3 gap-1">
        {EXPERIENCE_OPTIONS.map((exp) => {
          const selected = value === exp.id;
          return (
            <button
              key={exp.id}
              type="button"
              onClick={() => onChange(exp.id)}
              className={`py-2 px-2 rounded-xl text-center transition-all duration-200 button-press ${
                selected
                  ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold shadow-md shadow-cyan-500/25"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.03] font-medium"
              }`}
            >
              <span className="text-xs block leading-tight">{exp.title}</span>
              <span className={`text-[9px] block leading-tight ${selected ? "text-cyan-100/90" : "text-slate-400"}`}>
                {exp.tenure}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Routine Split Selector (Push / Pull / Legs is Default)
   ═══════════════════════════════════════════════════════════════ */
const SPLIT_OPTIONS = [
  {
    id: "Push / Pull / Legs (PPL)",
    name: "Push / Pull / Legs",
    badge: "Default",
    code: "PPL",
    subtitle: "Day 1 Push • Day 2 Pull • Day 3 Legs",
  },
  {
    id: "Upper / Lower / Full",
    name: "Upper / Lower",
    badge: null,
    code: "UL",
    subtitle: "Day 1 Upper • Day 2 Lower • Day 3 Full",
  },
  {
    id: "Full Body 3x",
    name: "Full Body 3x",
    badge: null,
    code: "FB",
    subtitle: "3 days compound full-body frequency",
  },
  {
    id: "Custom / Arnold Split",
    name: "Custom / Arnold",
    badge: null,
    code: "CUSTOM",
    subtitle: "Chest & Back • Shoulders & Arms • Legs",
  },
];

function RoutineSplitSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          3. Program Split Structure
        </label>
        <span className="text-[10px] font-mono font-bold text-cyan-300">
          {SPLIT_OPTIONS.find((s) => s.id === value)?.code || "PPL"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {SPLIT_OPTIONS.map((split) => {
          const selected = value === split.id;
          return (
            <button
              key={split.id}
              type="button"
              onClick={() => onChange(split.id)}
              className={`relative flex items-start gap-2.5 p-3 rounded-2xl border text-left transition-all duration-200 button-press ${
                selected
                  ? "border-cyan-400/60 bg-gradient-to-r from-cyan-500/15 via-sky-500/10 to-transparent shadow-[0_0_15px_rgba(56,189,248,0.15)] ring-1 ring-cyan-400/40"
                  : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15"
              }`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-[10px] font-mono font-bold transition-colors ${
                  selected
                    ? "bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/30"
                    : "bg-white/[0.05] text-slate-400"
                }`}
              >
                {split.code}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className={`text-xs font-bold leading-snug truncate ${selected ? "text-white" : "text-slate-200"}`}>
                    {split.name}
                  </p>
                  {split.badge && (
                    <span className="text-[8px] uppercase tracking-wider font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {split.badge}
                    </span>
                  )}
                </div>
                <p className={`text-[10px] leading-snug truncate mt-0.5 ${selected ? "text-cyan-200/90" : "text-slate-400"}`}>
                  {split.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   User-Controlled Equipment Selector (Direct Choice, No Presets)
   ═══════════════════════════════════════════════════════════════ */
const EQUIPMENT_ITEMS = [
  { id: "Barbell", label: "Barbell & Plates" },
  { id: "Dumbbells", label: "Dumbbells" },
  { id: "Bench", label: "Adjustable Bench" },
  { id: "Squat Rack", label: "Squat / Power Rack" },
  { id: "Cable Machine", label: "Cables & Pulleys" },
  { id: "Gym Machines", label: "Gym Machines" },
  { id: "Pull-up Bar", label: "Pull-up Bar / Dips" },
  { id: "Kettlebell", label: "Kettlebells" },
  { id: "Resistance Bands", label: "Bands" },
  { id: "Bodyweight", label: "Calisthenics / Bodyweight" },
];

function EquipmentMixSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const selectedItems = useMemo(() => {
    if (!value) return [];
    return value.split(",").map((s) => s.trim()).filter(Boolean);
  }, [value]);

  function toggleItem(id: string) {
    let updated: string[];
    if (selectedItems.includes(id)) {
      updated = selectedItems.filter((item) => item !== id);
    } else {
      updated = [...selectedItems, id];
    }
    onChange(updated.join(", "));
  }

  function selectAll() {
    onChange(EQUIPMENT_ITEMS.map((item) => item.id).join(", "));
  }

  function clearAll() {
    onChange("");
  }

  const allSelected = selectedItems.length === EQUIPMENT_ITEMS.length;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            4. Available Equipment
          </label>
          <p className="text-[10px] text-slate-500">Choose all equipment accessible to you</p>
        </div>
        <div className="flex items-center gap-2">
          {!allSelected ? (
            <button
              type="button"
              onClick={selectAll}
              className="text-[10px] font-semibold text-slate-400 hover:text-cyan-300 transition-colors button-press"
            >
              Select all
            </button>
          ) : null}
          {selectedItems.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-[10px] font-semibold text-slate-400 hover:text-rose-300 transition-colors button-press"
            >
              Clear
            </button>
          )}
          <span className="text-[10px] font-mono font-bold text-cyan-300 ml-1">
            {selectedItems.length}/{EQUIPMENT_ITEMS.length} selected
          </span>
        </div>
      </div>

      {/* Direct Interactive Equipment Chips */}
      <div className="grid grid-cols-2 gap-1.5">
        {EQUIPMENT_ITEMS.map((item) => {
          const isSelected = selectedItems.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggleItem(item.id)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 flex items-center justify-between button-press ${
                isSelected
                  ? "bg-cyan-500/20 border border-cyan-400/60 text-cyan-100 shadow-sm shadow-cyan-500/10 ring-1 ring-cyan-400/20"
                  : "bg-white/[0.025] border border-white/[0.06] text-slate-300 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              <span className="truncate">{item.label}</span>
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
                  isSelected ? "bg-cyan-400 text-slate-950" : "bg-white/[0.06] text-slate-500"
                }`}
              >
                {isSelected ? "✓" : "+"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function SetCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`group flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border button-press transition-all duration-200 ${
        checked
          ? "border-cyan-400/90 bg-cyan-500/25 shadow-[0_0_14px_rgba(56,189,248,0.4)]"
          : "border-white/15 bg-white/[0.03] hover:border-white/30"
      }`}
    >
      {checked && (
        <svg className="h-4 w-4 text-cyan-300 animate-check-pop" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Add Exercise Component (with Smart Autocomplete Suggestions)
   ═══════════════════════════════════════════════════════════════ */
function AddExerciseInline({ onAdd }: { onAdd: (ex: Exercise) => void }) {
  const [name, setName] = useState("");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [open, setOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Filter matching exercises from the 77+ exercise library
  const matchingSuggestions = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (!q || q.length < 1) return [];

    return EXERCISE_LIBRARY.filter((item) => {
      const nameMatch = item.name.toLowerCase().includes(q);
      const muscleMatch = item.primaryMuscle.toLowerCase().includes(q);
      const bodyPartMatch = item.bodyPart.toLowerCase().includes(q);
      const categoryMatch = item.category.toLowerCase().includes(q);
      return nameMatch || muscleMatch || bodyPartMatch || categoryMatch;
    }).slice(0, 5);
  }, [name]);

  function handleSelectSuggestion(suggestionName: string) {
    setName(suggestionName);
    setShowSuggestions(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (showSuggestions && matchingSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % matchingSuggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + matchingSuggestions.length) % matchingSuggestions.length);
        return;
      }
      if (e.key === "Enter" && matchingSuggestions[highlightedIndex]) {
        e.preventDefault();
        handleSelectSuggestion(matchingSuggestions[highlightedIndex].name);
        return;
      }
      if (e.key === "Escape") {
        setShowSuggestions(false);
        return;
      }
    }

    if (e.key === "Enter") {
      handleAdd();
    }
  }

  function handleAdd() {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), sets: parseInt(sets) || 3, reps: reps || "10" });
    setName("");
    setSets("3");
    setReps("10");
    setOpen(false);
    setShowSuggestions(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="liquid-glass liquid-glass-interactive flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-bold text-slate-300 transition-all hover:text-white border border-dashed border-white/15 hover:border-cyan-400/50 hover:bg-cyan-950/20 button-press"
      >
        <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        <span>+ Add Exercise</span>
      </button>
    );
  }

  return (
    <div className="liquid-glass rounded-2xl p-4 sm:p-5 border border-cyan-500/30 shadow-2xl space-y-3.5">
      <div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">
          Exercise Name
        </label>
        <div className="relative flex items-center">
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setShowSuggestions(true);
              setHighlightedIndex(0);
            }}
            onFocus={() => {
              if (name.trim().length >= 1) setShowSuggestions(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type exercise name (e.g. Incline Bench, Squat, Curl)…"
            className="liquid-input w-full rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 transition-colors pr-8"
            autoFocus
          />
          {name && (
            <button
              type="button"
              onClick={() => {
                setName("");
                setShowSuggestions(false);
              }}
              className="absolute right-2.5 text-slate-500 hover:text-white p-1 text-xs"
              title="Clear input"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Smart Autocomplete Suggestions (Naturally expanding & never blocked) ── */}
      {showSuggestions && matchingSuggestions.length > 0 && (
        <div className="rounded-2xl border border-cyan-400/30 bg-[#040d1a]/80 p-2 shadow-xl backdrop-blur-xl animate-fade-in space-y-1">
          <div className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest text-cyan-400/90 flex items-center justify-between border-b border-white/[0.06] mb-1">
            <span>Matching Exercises ({matchingSuggestions.length})</span>
            <span className="text-[9px] text-slate-400">Tap to auto-fill</span>
          </div>

          <div className="space-y-1 max-h-56 overflow-y-auto no-scrollbar">
            {matchingSuggestions.map((item, idx) => {
              const isHighlighted = idx === highlightedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectSuggestion(item.name)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                    isHighlighted
                      ? "bg-cyan-500/20 text-white border border-cyan-400/40 shadow-sm shadow-cyan-500/10"
                      : "hover:bg-white/[0.05] text-slate-200"
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs font-bold text-white truncate">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {item.primaryMuscle}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="liquid-pill px-1.5 py-0.5 rounded text-[8px] font-bold text-sky-300 uppercase">
                      {item.bodyPart}
                    </span>
                    <span className="liquid-pill px-1.5 py-0.5 rounded text-[8px] font-bold text-teal-300 uppercase">
                      {item.category}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sets & Reps Input Row */}
      <div className="flex items-center gap-2.5 pt-1">
        <div className="flex-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sets</label>
          <input
            type="number"
            value={sets}
            onChange={(e) => setSets(e.target.value)}
            className="liquid-input mt-1 w-full rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
          />
        </div>
        <div className="flex-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Target Reps</label>
          <input
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="liquid-input mt-1 w-full rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!name.trim()}
          className="mt-4 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2 text-xs font-bold text-white shadow-lg transition-all hover:from-sky-400 hover:to-cyan-400 disabled:opacity-40 button-press shrink-0"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setShowSuggestions(false);
          }}
          className="mt-4 rounded-xl px-3 py-2 text-xs text-slate-400 hover:text-white transition-colors shrink-0"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Rest Timer Audio Chime (Web Audio API Synthesizer)
   ═══════════════════════════════════════════════════════════════ */
function playTimerChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Helper to synthesize a smooth melodic bell tone
    const playTone = (
      freq: number,
      startTime: number,
      duration: number,
      peakGain = 0.22,
      type: OscillatorType = "sine"
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

      gain.gain.setValueAtTime(0.0001, ctx.currentTime + startTime);
      gain.gain.linearRampToValueAtTime(peakGain, ctx.currentTime + startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration + 0.05);
    };

    // 4-Stage Ascending Gym Recovery Completion Chime (~2.4 seconds total)
    // Pulse 1 (D5)
    playTone(587.33, 0.0, 0.35, 0.20, "sine");
    // Pulse 2 (F#5)
    playTone(739.99, 0.38, 0.35, 0.22, "sine");
    // Pulse 3 (A5)
    playTone(880.0, 0.76, 0.4, 0.24, "sine");
    // Final Sustained Resolving Chime (D6 + High Harmonic A6)
    playTone(1174.66, 1.2, 1.2, 0.28, "sine");
    playTone(1760.0, 1.2, 0.9, 0.12, "triangle");
  } catch {
    // Ignore audio errors if blocked
  }
}

interface ActiveRestTimerState {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  type: "set" | "exercise";
  targetExIdx?: number;
  targetSetIdx?: number;
}

function parseMinSecToSeconds(input: string): number {
  if (!input) return 60;
  const trimmed = input.trim();
  if (trimmed.includes(":")) {
    const parts = trimmed.split(":");
    const m = parseInt(parts[0], 10) || 0;
    const s = parseInt(parts[1], 10) || 0;
    return Math.max(5, m * 60 + s);
  }
  const parsed = parseInt(trimmed, 10);
  return isNaN(parsed) ? 60 : Math.max(5, parsed);
}

function formatMinSec(totalSec: number): string {
  const m = Math.floor(Math.max(0, totalSec) / 60);
  const s = Math.max(0, totalSec) % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function MinSecRestInput({
  seconds,
  onChange,
}: {
  seconds: number;
  onChange: (newSec: number) => void;
}) {
  const [textVal, setTextVal] = useState(() => formatMinSec(seconds));

  useEffect(() => {
    setTextVal(formatMinSec(seconds));
  }, [seconds]);

  function handleBlur() {
    const parsed = parseMinSecToSeconds(textVal);
    onChange(parsed);
    setTextVal(formatMinSec(parsed));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  }

  return (
    <input
      type="text"
      value={textVal}
      onChange={(e) => setTextVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="liquid-input w-12 text-center rounded-lg px-1 py-0.5 text-xs font-mono font-bold text-cyan-300 focus:outline-none border-cyan-500/30"
      placeholder="1:00"
      title="Type rest duration (e.g. 1:00, 2:00, 2:30, 3:00)"
    />
  );
}

/* ═══════════════════════════════════════════════════════════════
   ScrollReveal Component (Progressive Disclosure on Scroll)
   ═══════════════════════════════════════════════════════════════ */
function ScrollReveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out transform ${
        isVisible
          ? "opacity-100 translate-y-0 filter-none"
          : "opacity-0 translate-y-8 pointer-events-none"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   AI Spark Tooltip (Hover & Tap Progressive Overload Advice)
   ═══════════════════════════════════════════════════════════════ */
function AiSparkTooltip({
  exerciseName,
  unit,
}: {
  exerciseName: string;
  unit: "lbs" | "kg";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const aiSuggestion = useMemo(() => {
    const nameLower = exerciseName.toLowerCase();
    const inc = unit === "kg" ? "1–2.5 kg" : "2.5–5 lbs";

    if (nameLower.includes("bench") || nameLower.includes("squat") || nameLower.includes("deadlift") || nameLower.includes("press")) {
      return `Target Progressive Overload: Add +${inc} if last session's final working set was ≤ RPE 8. Focus on controlled 2s eccentric descent.`;
    }
    if (nameLower.includes("curl") || nameLower.includes("raise") || nameLower.includes("extension") || nameLower.includes("fly")) {
      return `Hypertrophy Cue: Prioritize a 1s peak contraction and slow 3s negative. Step up weight once you complete all target reps with strict form.`;
    }
    if (nameLower.includes("pull") || nameLower.includes("row") || nameLower.includes("lat")) {
      return `Back Activation: Drive elbows down and back to initiate. If you hit top rep range on all sets, increase load by +${inc}.`;
    }
    if (nameLower.includes("lunge") || nameLower.includes("leg press") || nameLower.includes("calf")) {
      return `Volume Overload: Keep constant muscular tension. Aim for +1–2 reps or step up to the next resistance level.`;
    }
    return `Smart Progression: Push for +1 rep or add +${inc} working weight today. Maintain full range of motion without momentum.`;
  }, [exerciseName, unit]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div
      ref={tooltipRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="flex items-center justify-center h-6 w-6 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-300 transition-all hover:scale-110 shadow-[0_0_10px_rgba(56,189,248,0.25)] button-press shrink-0 animate-subtle-pulse"
        title="AI Progression Cue"
        aria-label={`AI suggestion for ${exerciseName}`}
      >
        <svg className="h-3.5 w-3.5 text-cyan-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
        </svg>
      </button>

      {/* Floating Glassmorphic Tooltip */}
      {isOpen && (
        <div
          className="absolute left-0 bottom-full mb-2 z-50 w-64 sm:w-72 p-3 rounded-2xl liquid-glass border border-cyan-400/50 shadow-2xl backdrop-blur-2xl animate-fade-in-up text-left pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/[0.08]">
            <div className="flex items-center gap-1.5">
              <svg className="h-3 w-3 text-cyan-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
              </svg>
              <span className="text-[10px] font-black uppercase tracking-wider text-white">
                Coach Fostura Suggestion
              </span>
            </div>
            <span className="liquid-pill px-1.5 py-0.2 rounded text-[8px] font-bold text-teal-300 uppercase">
              Progression
            </span>
          </div>

          <p className="text-[11px] text-slate-200 leading-relaxed font-medium">
            {aiSuggestion}
          </p>

          <div className="mt-2 flex items-center justify-between text-[9px] text-slate-400">
            <span>Adaptive AI Coaching</span>
            <span className="text-cyan-300 font-semibold">Live Cue</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Floating AI Coach Drawer ("Ask Coach Fostura")
   ═══════════════════════════════════════════════════════════════ */
interface ChatMessage {
  id: string;
  sender: "coach" | "user";
  text: string;
  timestamp: string;
}

function renderCoachText(text: string) {
  // Strip any raw HTML tags if present and normalize line breaks
  const cleaned = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?[^>]+(>|$)/g, "");

  const lines = cleaned.split("\n");
  return (
    <div className="space-y-2 text-xs leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-0.5" />;

        const isHeader = trimmed.startsWith("###") || trimmed.startsWith("##") || trimmed.startsWith("#");
        const cleanLine = isHeader ? trimmed.replace(/^#+\s*/, "") : trimmed;
        const isList = cleanLine.startsWith("•") || cleanLine.startsWith("-") || /^\d+\./.test(cleanLine);

        const parts = cleanLine.split(/(\*\*[^*]+\*\*)/g);

        const renderedContent = parts.map((part, pIdx) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={pIdx} className="font-extrabold text-cyan-200">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        });

        if (isHeader) {
          return (
            <p key={idx} className="font-extrabold text-white text-[13px] pt-1 text-cyan-300">
              {renderedContent}
            </p>
          );
        }

        return (
          <div key={idx} className={isList ? "pl-2 text-slate-200" : "text-slate-200"}>
            {renderedContent}
          </div>
        );
      })}
    </div>
  );
}

function AiCoachDrawer({
  isOpen,
  onClose,
  unit,
}: {
  isOpen: boolean;
  onClose: () => void;
  unit: "lbs" | "kg";
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m-welcome",
      sender: "coach",
      text: "Hey! I'm Coach Fostura, your real-time AI fitness & sports nutrition coach. What are your goals today? Ask me for easy meal recipes, macro targets, progressive overload strategies, or exercise form cues!",
      timestamp: "Just now",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const renderPromptIcon = (iconKey: string, className = "h-4 w-4") => {
    switch (iconKey) {
      case "salad":
        return (
          <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m-7-9c0 3.866 3.134 7 7 7s7-3.134 7-7H5Z" />
          </svg>
        );
      case "barbell":
        return (
          <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h1.5v4H3v-4Zm3-2h2v8H6V8Zm2 3h8v2H8v-2Zm8-3h2v8h-2V8Zm3 2h1.5v4H19v-4Z" />
          </svg>
        );
      case "nutrition":
        return (
          <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
          </svg>
        );
      case "clock":
        return (
          <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        );
      case "bolt":
      default:
        return (
          <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
          </svg>
        );
    }
  };

  const PROMPT_TEMPLATES = [
    {
      id: "p-meals",
      icon: "salad",
      title: "Quick High-Protein Meals",
      prompt: "Suggest 3 easy high-protein meals I can prep in under 15 minutes",
    },
    {
      id: "p-bench",
      icon: "barbell",
      title: "Progress Bench Press",
      prompt: "How should I progress my Bench Press weight and break a plateau?",
    },
    {
      id: "p-nutrition",
      icon: "nutrition",
      title: "Pre & Post Workout Fuel",
      prompt: "What should I eat before and after a workout for optimal muscle gain?",
    },
    {
      id: "p-rest",
      icon: "clock",
      title: "Optimal Rest Intervals",
      prompt: "How long should I rest between sets for strength vs hypertrophy?",
    },
    {
      id: "p-warmup",
      icon: "bolt",
      title: "Full Body Warmup",
      prompt: "Give me a quick 5-minute dynamic warmup before lifting heavy",
    },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isTyping, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isTyping) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText("");
    setIsTyping(true);

    try {
      // Build full conversation history payload for LLM
      const apiPayload = updatedMessages
        .filter((m) => m.id !== "m-welcome")
        .map((m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text,
        }));

      const payloadToSend = apiPayload.length > 0 ? apiPayload : [{ role: "user", content: query }];

      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payloadToSend }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to reach Coach Fostura");
      }

      const coachMsg: ChatMessage = {
        id: `c-${Date.now()}`,
        sender: "coach",
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, coachMsg]);
    } catch (err: unknown) {
      console.error("Coach Fostura AI error:", err);
      const errMsg = err instanceof Error ? err.message : "Something went wrong";
      const fallbackCoachMsg: ChatMessage = {
        id: `c-${Date.now()}`,
        sender: "coach",
        text: `Coach Fostura encountered an error: ${errMsg}. Please ensure your internet connection is active and try again!`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, fallbackCoachMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ animation: "fadeIn 0.2s ease-out" }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#020713]/80 backdrop-blur-md" onClick={onClose} />

      {/* Drawer Panel */}
      <div
        className="liquid-glass relative w-full sm:w-[440px] h-full sm:h-[95vh] sm:my-auto sm:mr-4 rounded-t-3xl sm:rounded-3xl border-l sm:border border-cyan-400/30 flex flex-col shadow-2xl z-10 overflow-hidden"
        style={{ animation: "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] bg-gradient-to-r from-sky-950/60 to-cyan-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400 text-slate-950 font-black text-xs">
              <span>AI</span>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#040914]" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <span>Coach Fostura</span>
                <span className="liquid-pill px-1.5 py-0.2 rounded text-[8px] font-bold text-cyan-300">Live AI</span>
              </h3>
              <p className="text-[10px] text-slate-400">Intelligent Performance & Form Coach</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="liquid-pill h-8 w-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-white"
            title="Close Drawer"
          >
            ✕
          </button>
        </div>

        {/* Messages Container */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 no-scrollbar">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                  m.sender === "user"
                    ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-tr-sm shadow-md"
                    : "liquid-glass border border-white/10 text-slate-200 rounded-tl-sm shadow-lg"
                }`}
              >
                {m.sender === "user" ? m.text : renderCoachText(m.text)}
              </div>
              <span className="text-[9px] text-slate-500 mt-1 px-1">{m.timestamp}</span>
            </div>
          ))}

          {/* Starter Quick Action Cards (Shown at start of new chat) */}
          {messages.length === 1 && (
            <div className="space-y-2 pt-2 animate-fade-in">
              <p className="text-[11px] font-bold text-cyan-300 px-1 uppercase tracking-wider">
                Tap a topic to get started:
              </p>
              <div className="grid grid-cols-1 gap-2">
                {PROMPT_TEMPLATES.slice(0, 3).map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleSendMessage(tmpl.prompt)}
                    className="liquid-glass flex items-center justify-between p-3 rounded-2xl border border-sky-400/30 hover:border-cyan-400 hover:bg-sky-950/40 text-left transition-all group button-press shadow-md"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-base shadow-sm">
                        {renderPromptIcon(tmpl.icon, "h-4 w-4 text-cyan-300")}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-white group-hover:text-cyan-200 transition-colors truncate">
                          {tmpl.title}
                        </p>
                        <p className="text-[11px] text-slate-300 truncate mt-0.5 font-medium">
                          {tmpl.prompt}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-sky-400 font-extrabold group-hover:translate-x-1 transition-transform shrink-0 pr-1">
                      →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {isTyping && (
            <div className="flex items-center gap-1.5 liquid-glass px-3.5 py-2.5 rounded-2xl w-20 border border-cyan-400/30">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── High-Contrast, Crystal-Clear Prompt Template Chips Strip ── */}
        <div className="px-4 py-2.5 border-t border-white/[0.08] bg-[#030914]/95 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.516 0c.85.493 1.508 1.333 1.508 2.316V18" />
              </svg>
              <span>Quick Prompt Templates</span>
            </span>
            <span className="text-[9px] text-slate-400">Swipe to browse →</span>
          </div>

          <div className="overflow-x-auto no-scrollbar flex gap-2 pb-0.5 pt-0.5 scroll-smooth">
            {PROMPT_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => handleSendMessage(tmpl.prompt)}
                className="group flex items-center gap-2 rounded-xl border border-sky-400/40 bg-sky-950/80 hover:bg-sky-900/90 hover:border-cyan-300 px-3 py-1.5 text-left shrink-0 transition-all button-press shadow-md shadow-sky-950/50"
                title={tmpl.prompt}
              >
                {renderPromptIcon(tmpl.icon, "h-3.5 w-3.5 text-cyan-400")}
                <span className="text-xs font-bold text-white group-hover:text-cyan-200 transition-colors whitespace-nowrap">
                  {tmpl.title}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3.5 border-t border-white/[0.08] bg-[#040914]/90 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask Coach Fostura anything…"
            className="liquid-input flex-1 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isTyping}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold disabled:opacity-40 button-press"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Active Workout Tracker (with Automatic Rest Timers & Sticky HUD)
   ═══════════════════════════════════════════════════════════════ */
function ActiveWorkout({
  dayTitle,
  tracked,
  setTracked,
  onFinish,
  onBack,
  elapsedSeconds,
  unit,
  onSetUnit,
  onSetCompleted,
  comboCounter = 0,
}: {
  dayTitle: string;
  tracked: TrackedExercise[];
  setTracked: React.Dispatch<React.SetStateAction<TrackedExercise[]>>;
  onFinish: () => void;
  onBack: () => void;
  elapsedSeconds: number;
  unit: "lbs" | "kg";
  onSetUnit: (u: "lbs" | "kg") => void;
  onSetCompleted?: (isComboBreak?: boolean) => void;
  comboCounter?: number;
}) {
  const [restTimer, setRestTimer] = useState<ActiveRestTimerState | null>(null);
  const [customRestSeconds, setCustomRestSeconds] = useState<number>(60);

  // Countdown timer interval effect
  useEffect(() => {
    if (!restTimer || !restTimer.isRunning) return;

    if (restTimer.remainingSeconds <= 0) {
      playTimerChime();
      return;
    }

    const interval = setInterval(() => {
      setRestTimer((prev) => {
        if (!prev || !prev.isRunning) return prev;
        if (prev.remainingSeconds <= 1) {
          playTimerChime();
          return { ...prev, remainingSeconds: 0, isRunning: false };
        }
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [restTimer?.isRunning, restTimer?.remainingSeconds]);

  const startRestTimer = useCallback(
    (id: string, label: string, seconds: number, type: "set" | "exercise", targetExIdx?: number, targetSetIdx?: number) => {
      setRestTimer({
        id,
        label,
        totalSeconds: seconds,
        remainingSeconds: seconds,
        isRunning: true,
        type,
        targetExIdx,
        targetSetIdx,
      });
    },
    []
  );

  const adjustRestTimer = useCallback((deltaSeconds: number) => {
    setRestTimer((prev) => {
      if (!prev) return null;
      const nextRemaining = Math.max(0, prev.remainingSeconds + deltaSeconds);
      const nextTotal = Math.max(nextRemaining, prev.totalSeconds + (deltaSeconds > 0 ? deltaSeconds : 0));
      if (nextTotal > 0) {
        setCustomRestSeconds(Math.max(15, nextTotal));
      }
      return {
        ...prev,
        remainingSeconds: nextRemaining,
        totalSeconds: nextTotal,
        isRunning: nextRemaining > 0 ? true : false,
      };
    });
  }, []);

  const toggleRestTimerPause = useCallback(() => {
    setRestTimer((prev) => (prev ? { ...prev, isRunning: !prev.isRunning } : null));
  }, []);

  const stopRestTimer = useCallback(() => {
    setRestTimer(null);
  }, []);

  const totalSets = tracked.reduce((sum, ex) => sum + ex.trackedSets.length, 0);
  const completedSets = tracked.reduce((sum, ex) => sum + ex.trackedSets.filter((s) => s.completed).length, 0);
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  const updateSet = useCallback(
    (exIdx: number, setIdx: number, field: keyof TrackedSet, value: string | boolean | number) => {
      setTracked((prev) =>
        prev.map((ex, ei) =>
          ei !== exIdx
            ? ex
            : {
                ...ex,
                trackedSets: ex.trackedSets.map((s, si) =>
                  si !== setIdx ? s : { ...s, [field]: value }
                ),
              }
        )
      );
    },
    [setTracked]
  );

  const updateExerciseRest = useCallback((exIdx: number, seconds: number) => {
    setTracked((prev) =>
      prev.map((ex, ei) => (ei === exIdx ? { ...ex, interExerciseRestSeconds: seconds } : ex))
    );
  }, [setTracked]);

  const addSetToExercise = useCallback((exIdx: number) => {
    setTracked((prev) =>
      prev.map((ex, ei) => {
        if (ei !== exIdx) return ex;
        const lastSet = ex.trackedSets[ex.trackedSets.length - 1];
        const newSet: TrackedSet = {
          targetReps: lastSet?.targetReps || "10",
          weight: lastSet?.weight || "",
          actualReps: "",
          completed: false,
        };
        return {
          ...ex,
          trackedSets: [...ex.trackedSets, newSet],
        };
      })
    );
  }, [setTracked]);

  const removeSetFromExercise = useCallback((exIdx: number, setIdx: number) => {
    setTracked((prev) =>
      prev.map((ex, ei) => {
        if (ei !== exIdx) return ex;
        if (ex.trackedSets.length <= 1) return ex; // Keep at least 1 set
        return {
          ...ex,
          trackedSets: ex.trackedSets.filter((_, si) => si !== setIdx),
        };
      })
    );
  }, [setTracked]);

  const removeExercise = useCallback((exIdx: number) => {
    setTracked((prev) => prev.filter((_, i) => i !== exIdx));
  }, [setTracked]);

  const addExercise = useCallback((ex: Exercise) => {
    const newTracked: TrackedExercise = {
      name: ex.name,
      trackedSets: Array.from({ length: ex.sets }, () => ({
        targetReps: ex.reps,
        weight: "",
        actualReps: "",
        completed: false,
      })),
    };
    setTracked((prev) => [...prev, newTracked]);
  }, [setTracked]);

  function handleToggleSetDone(exIdx: number, si: number) {
    const currentCompleted = tracked[exIdx].trackedSets[si].completed;
    const isNowDone = !currentCompleted;
    updateSet(exIdx, si, "completed", isNowDone);

    if (isNowDone) {
      onSetCompleted?.(false);
      // Check if this completes all sets of the exercise
      const allOtherSetsDone = tracked[exIdx].trackedSets.every((s, idx) =>
        idx === si ? true : s.completed
      );
      const hasNextExercise = exIdx < tracked.length - 1;

      if (allOtherSetsDone && hasNextExercise) {
        const nextExName = tracked[exIdx + 1].name;
        startRestTimer(
          `inter-ex-${exIdx}`,
          `Rest before ${nextExName}`,
          customRestSeconds, // User configured rest time
          "exercise",
          exIdx + 1
        );
      } else {
        startRestTimer(
          `set-rest-${exIdx}-${si}`,
          `${tracked[exIdx].name} • Set ${si + 1} Rest`,
          customRestSeconds, // User configured rest time
          "set",
          exIdx,
          si
        );
      }
    } else {
      onSetCompleted?.(true);
      // If unchecking, stop active timer if related
      if (restTimer?.id === `set-rest-${exIdx}-${si}` || restTimer?.id === `inter-ex-${exIdx}`) {
        stopRestTimer();
      }
    }
  }

  const restPercent = restTimer && restTimer.totalSeconds > 0
    ? Math.min(100, Math.max(0, ((restTimer.totalSeconds - restTimer.remainingSeconds) / restTimer.totalSeconds) * 100))
    : 0;

  return (
    <div className="animate-[fadeInUp_0.3s_ease-out_both] space-y-4">
      {/* ── Sticky Top Metrics & Workout Status Bar ── */}
      <div className="liquid-glass sticky top-16 z-40 rounded-2xl p-4 border-white/10 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="liquid-pill flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:border-sky-400/40 transition-all button-press shrink-0"
              title="Return to Dashboard"
            >
              <svg className="h-4 w-4 text-sky-400 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              <span>Back</span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-400">Active Session</p>
              </div>
              <h2 className="truncate text-base font-extrabold tracking-tight text-white mt-0.5">{dayTitle}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {comboCounter >= 2 && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-400/40 text-orange-300 animate-combo-pop shadow-[0_0_12px_rgba(251,146,60,0.25)]">
                <svg className="h-3.5 w-3.5 text-orange-400 animate-pulse" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                </svg>
                <span className="text-[11px] font-black">{comboCounter}x Combo!</span>
              </div>
            )}
            <UnitTogglePill unit={unit} onChange={onSetUnit} size="sm" />
            <div className="text-right">
              <p className="font-mono text-base font-bold tabular-nums text-slate-100">{formatTime(elapsedSeconds)}</p>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Duration</p>
            </div>
            <div className="text-right">
              <p className="text-base font-bold text-slate-100">
                {completedSets}
                <span className="text-xs font-normal text-slate-500">/{totalSets}</span>
              </p>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Sets</p>
            </div>
          </div>
        </div>

        {/* Workout Progress Bar */}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 via-sky-400 to-teal-300 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* ── Active Rest Timer Floating Banner (When running) ── */}
        {restTimer && (
          <div className="mt-3 pt-3 border-t border-white/[0.08] animate-fade-in">
            <div className={`liquid-glass rounded-xl p-3 border transition-all ${
              restTimer.remainingSeconds === 0
                ? "border-emerald-400/80 bg-emerald-950/30 shadow-[0_0_20px_rgba(16,185,129,0.25)] animate-subtle-pulse"
                : "border-cyan-400/50 bg-cyan-950/30 shadow-[0_0_15px_rgba(56,189,248,0.15)]"
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                    restTimer.remainingSeconds === 0
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-cyan-500/20 text-cyan-300 animate-pulse"
                  }`}>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {restTimer.type === "exercise" ? "Inter-Exercise Recovery" : "Set Rest Timer"}
                    </p>
                    <p className="text-xs font-extrabold text-white truncate">{restTimer.label}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 flex-wrap">
                  {/* Left: -30s, Center: Digital Clock, Right: +30s */}
                  <div className="flex items-center gap-1.5 liquid-pill px-2 py-0.5 rounded-xl border-cyan-400/30 bg-cyan-950/40">
                    <button
                      type="button"
                      onClick={() => adjustRestTimer(-30)}
                      className="px-1.5 py-0.5 text-[10px] font-bold text-sky-300 hover:text-white rounded-lg button-press hover:bg-white/10"
                      title="Lessen rest timer by 30 seconds"
                    >
                      -30s
                    </button>
                    <span className={`font-mono text-base sm:text-lg font-black tabular-nums min-w-[40px] text-center ${
                      restTimer.remainingSeconds === 0 ? "text-emerald-300" : "text-cyan-300"
                    }`}>
                      {formatMinSec(restTimer.remainingSeconds)}
                    </span>
                    <button
                      type="button"
                      onClick={() => adjustRestTimer(30)}
                      className="px-1.5 py-0.5 text-[10px] font-bold text-sky-300 hover:text-white rounded-lg button-press hover:bg-white/10"
                      title="Add 30 seconds to rest timer"
                    >
                      +30s
                    </button>
                  </div>

                  {/* Pause / Resume & Skip Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={toggleRestTimerPause}
                      className="liquid-pill px-2.5 py-1 text-[10px] font-bold text-slate-300 hover:text-white rounded-lg button-press"
                    >
                      {restTimer.isRunning ? "Pause" : "Resume"}
                    </button>
                    <button
                      type="button"
                      onClick={stopRestTimer}
                      className="liquid-pill px-2.5 py-1 text-[10px] font-bold text-red-300 hover:text-red-100 rounded-lg button-press"
                    >
                      {restTimer.remainingSeconds === 0 ? "Dismiss" : "Skip"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Mini Rest Progress Bar */}
              <div className="mt-2 h-1 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    restTimer.remainingSeconds === 0
                      ? "bg-emerald-400"
                      : "bg-gradient-to-r from-cyan-400 via-sky-400 to-teal-300"
                  }`}
                  style={{ width: `${restPercent}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Exercises List with Centered Per-Set Rest & Inter-Exercise Rest ── */}
      <div className="space-y-5">
        {tracked.map((ex, exIdx) => {
          const exDone = ex.trackedSets.length > 0 && ex.trackedSets.every((s) => s.completed);
          const isNextExerciseAvailable = exIdx < tracked.length - 1;
          const isThisInterExTimerActive = Boolean(
            restTimer && (
              restTimer.id === `inter-ex-${exIdx}` ||
              (restTimer.type === "exercise" && restTimer.targetExIdx === exIdx + 1)
            )
          );

          return (
            <div key={exIdx} className="space-y-3.5">
              {/* Exercise Card */}
              <div
                className={`liquid-glass overflow-hidden rounded-3xl border transition-all duration-300 ${
                  exDone
                    ? "border-cyan-500/50 bg-cyan-950/15 shadow-lg shadow-cyan-500/5"
                    : "border-white/10"
                }`}
              >
                {/* Exercise Header */}
                <div className="flex items-center justify-between border-b border-white/[0.06] px-4 sm:px-5 py-3.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                        exDone
                          ? "bg-cyan-500/20 text-cyan-300 shadow-[0_0_10px_rgba(56,189,248,0.3)] animate-check-pop"
                          : "bg-sky-500/15 text-sky-300"
                      }`}
                    >
                      {exDone ? (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      ) : (
                        exIdx + 1
                      )}
                    </span>
                    <h3 className={`truncate text-sm font-extrabold ${exDone ? "text-cyan-200" : "text-white"}`}>
                      {ex.name}
                    </h3>
                    <AiSparkTooltip exerciseName={ex.name} unit={unit} />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="liquid-pill rounded-lg px-2.5 py-0.5 text-[10px] font-bold text-slate-300">
                      {ex.trackedSets.filter((s) => s.completed).length}/{ex.trackedSets.length} sets
                    </span>
                    <button
                      type="button"
                      onClick={() => removeExercise(exIdx)}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1"
                      title="Remove Exercise"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Sets Table */}
                <div className="divide-y divide-white/[0.04]">
                  <div className="grid grid-cols-[38px_1fr_1fr_36px] items-center gap-2 px-4 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    <span>Set</span>
                    <span>Weight ({unit})</span>
                    <span>Reps</span>
                    <span className="text-center">Done</span>
                  </div>

                  {ex.trackedSets.map((set, si) => {
                    const isThisSetTimerActive = Boolean(
                      restTimer &&
                      restTimer.type === "set" &&
                      restTimer.targetExIdx === exIdx &&
                      restTimer.targetSetIdx === si
                    );

                    return (
                      <div key={si} className="transition-colors">
                        <div
                          className={`grid grid-cols-[38px_1fr_1fr_36px] items-center gap-2 px-4 py-2.5 transition-colors ${
                            set.completed ? "bg-cyan-500/[0.06]" : "hover:bg-white/[0.02]"
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <span className={`text-xs font-bold tabular-nums ${set.completed ? "text-cyan-300" : "text-slate-400"}`}>
                              {si + 1}
                            </span>
                            {ex.trackedSets.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeSetFromExercise(exIdx, si)}
                                className="text-slate-600 hover:text-red-400 opacity-60 hover:opacity-100 transition-opacity text-[9px] p-0.5"
                                title="Delete this set"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder="—"
                            value={set.weight}
                            onChange={(e) => updateSet(exIdx, si, "weight", e.target.value)}
                            className={`liquid-input w-full rounded-lg px-2.5 py-1.5 text-xs font-semibold tabular-nums transition-all focus:outline-none ${
                              set.completed ? "text-cyan-200 border-cyan-500/40" : "text-white"
                            }`}
                          />

                          <input
                            type="number"
                            inputMode="numeric"
                            placeholder={set.targetReps}
                            value={set.actualReps}
                            onChange={(e) => updateSet(exIdx, si, "actualReps", e.target.value)}
                            className={`liquid-input w-full rounded-lg px-2.5 py-1.5 text-xs font-semibold tabular-nums transition-all focus:outline-none ${
                              set.completed ? "text-cyan-200 border-cyan-500/40" : "text-white"
                            }`}
                          />

                          <div className="flex justify-center">
                            <SetCheckbox
                              checked={set.completed}
                              onChange={() => handleToggleSetDone(exIdx, si)}
                            />
                          </div>
                        </div>

                        {/* Minimalist Set Rest Timer Row (Centered in Middle) */}
                        <div className="flex items-center justify-center gap-3 px-4 py-1.5 bg-white/[0.015] border-t border-white/[0.03] text-[10px]">
                          <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                            <svg className="h-3 w-3 text-cyan-400/80" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                            Set {si + 1} Rest:
                          </span>

                          <div className="flex items-center gap-1.5">
                            {isThisSetTimerActive && restTimer ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-cyan-950/70 border border-cyan-400/40 text-cyan-300 shadow-[0_0_10px_rgba(56,189,248,0.2)] animate-scale-in">
                                <button
                                  type="button"
                                  onClick={() => adjustRestTimer(-30)}
                                  className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-white/10 hover:bg-white/20 text-sky-200 button-press"
                                  title="Lessen rest by 30 seconds"
                                >
                                  -30s
                                </button>
                                <span className="font-mono text-xs font-black tabular-nums text-cyan-200 min-w-[32px] text-center">
                                  {formatMinSec(restTimer.remainingSeconds)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => adjustRestTimer(30)}
                                  className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-white/10 hover:bg-white/20 text-sky-200 button-press"
                                  title="Add 30 seconds to rest"
                                >
                                  +30s
                                </button>
                              </div>
                            ) : (
                              <MinSecRestInput
                                seconds={set.restSeconds ?? (customRestSeconds || 60)}
                                onChange={(newSec) => updateSet(exIdx, si, "restSeconds", newSec)}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Bottom of Exercise Card: + Add Another Set Button ── */}
                <div className="p-3 border-t border-white/[0.06] bg-white/[0.01] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => addSetToExercise(exIdx)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sky-300 hover:text-white text-xs font-bold transition-all button-press active:scale-95"
                  >
                    <svg className="h-3.5 w-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span>+ Add Another Set</span>
                  </button>

                  <span className="text-[10px] text-slate-400 font-medium">
                    {ex.trackedSets.length} sets planned
                  </span>
                </div>
              </div>

              {/* ── Minimal Inter-Exercise Divider with Customizable Timer (Centered in Middle) ── */}
              {isNextExerciseAvailable && (
                <div className="flex items-center justify-center gap-3 py-2 text-slate-500">
                  <span className="h-px flex-1 bg-white/[0.06]" />
                  <div className="flex items-center gap-2.5 flex-wrap justify-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Next Movement: <span className="text-sky-300 font-extrabold">{tracked[exIdx + 1].name}</span>
                    </span>

                    <span className="text-slate-600 font-bold">•</span>

                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Rest:
                    </span>

                    {/* Inline Rest Timer on Right Side after Exercise Name */}
                    {isThisInterExTimerActive && restTimer ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-cyan-950/70 border border-cyan-400/40 text-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.25)] animate-scale-in">
                        <svg className="h-3.5 w-3.5 text-cyan-400 animate-pulse" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        <button
                          type="button"
                          onClick={() => adjustRestTimer(-30)}
                          className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-white/10 hover:bg-white/20 text-sky-200 button-press"
                          title="Lessen rest by 30 seconds"
                        >
                          -30s
                        </button>
                        <span className="font-mono text-xs font-black tabular-nums text-cyan-200 min-w-[32px] text-center">
                          {formatMinSec(restTimer.remainingSeconds)}
                        </span>
                        <button
                          type="button"
                          onClick={() => adjustRestTimer(30)}
                          className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-white/10 hover:bg-white/20 text-sky-200 button-press"
                          title="Add 30 seconds to rest"
                        >
                          +30s
                        </button>
                      </div>
                    ) : (
                      <MinSecRestInput
                        seconds={ex.interExerciseRestSeconds ?? (customRestSeconds || 60)}
                        onChange={(newSec) => updateExerciseRest(exIdx, newSec)}
                      />
                    )}
                  </div>
                  <span className="h-px flex-1 bg-white/[0.06]" />
                </div>
              )}
            </div>
          );
        })}

        <AddExerciseInline onAdd={addExercise} />
      </div>

      {/* ── Complete Workout Button (Placed at very bottom of page flow) ── */}
      <div className="mt-12 pt-6 pb-28 sm:pb-20 border-t border-white/[0.08]">
        <div className="liquid-glass rounded-2xl p-3.5 border border-white/10 shadow-2xl">
          <button
            type="button"
            onClick={onFinish}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-teal-400 px-5 py-3.5 text-sm font-bold text-white shadow-xl transition-all hover:from-cyan-400 hover:to-teal-300 active:scale-[0.98] button-press shimmer-hover"
            style={{ animation: "success-glow 3s ease-in-out infinite" }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span>Complete Workout</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Workout Summary Modal (Ocean Theme)
   ═══════════════════════════════════════════════════════════════ */
function WorkoutSummary({
  dayTitle,
  trackedExercises,
  elapsedSeconds,
  unit,
  onClose,
  gamificationResult,
  gamificationStats,
}: {
  dayTitle: string;
  trackedExercises: TrackedExercise[];
  elapsedSeconds: number;
  unit: "lbs" | "kg";
  onClose: () => void;
  gamificationResult?: GamificationResult | null;
  gamificationStats?: GamificationStats;
}) {
  const { isLoaded, isSignedIn, user } = useUser();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [isCloud, setIsCloud] = useState(false);
  const [showAiDebrief, setShowAiDebrief] = useState(false);
  const savedRef = useRef(false);

  const completedSets = trackedExercises.flatMap((ex) => ex.trackedSets).filter((s) => s.completed);
  const totalVolume = completedSets.reduce((sum, s) => {
    const w = parseFloat(s.weight) || 0;
    const r = parseInt(s.actualReps) || parseInt(s.targetReps) || 0;
    return sum + w * r;
  }, 0);
  const estimatedCalories = Math.round(totalVolume * 0.05 + elapsedSeconds * 0.12);

  // Staggered entrance for AI Debrief
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowAiDebrief(true);
    }, 450);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function doSave() {
      if (isSignedIn && user?.id && !savedRef.current) {
        savedRef.current = true;
        setSaveStatus("saving");
        const res = await saveWorkoutToSupabase({
          user_id: user.id,
          day_title: dayTitle,
          duration_seconds: elapsedSeconds,
          completed_sets: completedSets.length,
          total_sets: trackedExercises.flatMap((ex) => ex.trackedSets).length,
          exercises: trackedExercises,
          calories: estimatedCalories,
          unit,
        });
        setIsCloud(res.isCloud);
        setSaveStatus("saved");
      }
    }

    if (isLoaded) {
      doSave();
    }
  }, [isLoaded, isSignedIn, user?.id, dayTitle, elapsedSeconds, completedSets.length, trackedExercises, estimatedCalories, unit]);

  const stats = [
    {
      label: "Duration",
      value: formatTimeLong(elapsedSeconds),
      icon: (
        <svg className="h-5 w-5 text-sky-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
    {
      label: "Sets Finished",
      value: `${completedSets.length}`,
      icon: (
        <svg className="h-5 w-5 text-cyan-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
    {
      label: "Total Volume",
      value: `${totalVolume.toLocaleString()} ${unit}`,
      icon: (
        <svg className="h-5 w-5 text-teal-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75a.75.75 0 0 1 .75.75v9a.75.75 0 0 1-.75.75h-.75m0-10.5v10.5m0-10.5H4.5a.75.75 0 0 0-.75.75v9c0 .414.336.75.75.75h2.25m10.5-10.5h-.75a.75.75 0 0 0-.75.75v9c0 .414.336.75.75.75h.75m0-10.5v10.5m0-10.5h2.25a.75.75 0 0 1 .75.75v9a.75.75 0 0 1-.75.75h-2.25M12 6v12" />
        </svg>
      ),
    },
    {
      label: "Est. Energy",
      value: `${estimatedCalories} kcal`,
      icon: (
        <svg className="h-5 w-5 text-amber-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ animation: "fadeIn 0.25s ease-out" }}>
      <div className="absolute inset-0 bg-[#020713]/85 backdrop-blur-md" onClick={onClose} />
      <div
        className="liquid-glass relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl p-6 shadow-2xl sm:p-8 space-y-5"
        style={{ animation: "scaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

        <div className="text-center pt-2">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/15 shadow-[0_0_25px_rgba(56,189,248,0.25)] border border-cyan-500/30">
            <svg className="h-7 w-7 text-cyan-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Workout Complete</h2>
          <p className="mt-1 text-xs text-slate-400">{dayTitle}</p>

          {/* Cloud Sync Status */}
          {saveStatus === "saving" && (
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-sky-400 animate-pulse">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
              <span>Saving workout session...</span>
            </div>
          )}
          {saveStatus === "saved" && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-300 animate-fade-in">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span>{isCloud ? "Saved to Cloud History" : "Workout Saved"}</span>
            </div>
          )}
        </div>

        {/* ── Gamification Victory Card ── */}
        {gamificationResult && (
          <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-950/35 via-[#0a182d]/90 to-purple-950/35 p-4.5 space-y-3.5 shadow-[0_0_30px_rgba(245,158,11,0.15)] relative overflow-hidden animate-fade-in-up">
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-400/10 via-transparent to-transparent pointer-events-none" />

            {/* Level Up Celebration */}
            {gamificationResult.leveledUp && (
              <div className="rounded-xl border border-amber-400/60 bg-gradient-to-r from-amber-500/25 via-yellow-500/35 to-amber-500/25 p-3 text-center animate-level-up-glow shadow-[0_0_25px_rgba(245,158,11,0.4)]">
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 mb-1">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                  </svg>
                </div>
                <p className="text-sm font-black tracking-widest text-amber-200 uppercase animate-pulse">
                  LEVEL UP!
                </p>
                <p className="text-xs font-bold text-white mt-0.5">
                  You reached Level {gamificationResult.newLevel}: {titleForLevel(gamificationResult.newLevel)}!
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-amber-400">
                  XP Earned This Session
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-black font-mono text-amber-300 drop-shadow-[0_0_12px_rgba(252,211,77,0.4)]">
                    +{gamificationResult.totalXPGained}
                  </span>
                  <span className="text-xs font-bold text-amber-200/70">XP</span>
                </div>
              </div>

              {gamificationStats && (
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-black text-white">
                    Level {levelFromXP(gamificationStats.totalXP)}
                  </span>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">
                    {titleForLevel(levelFromXP(gamificationStats.totalXP))}
                  </p>
                </div>
              )}
            </div>

            {/* XP Breakdown Pills */}
            <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
              {gamificationResult.xpGains.map((gain, i) => (
                <span
                  key={i}
                  className={`px-2 py-0.5 rounded-lg border ${
                    gain.source === "prs"
                      ? "bg-amber-500/20 border-amber-400/40 text-amber-300"
                      : gain.source === "streak"
                      ? "bg-orange-500/20 border-orange-400/40 text-orange-300"
                      : gain.source === "combo"
                      ? "bg-pink-500/20 border-pink-400/40 text-pink-300"
                      : "bg-white/5 border-white/10 text-slate-300"
                  }`}
                >
                  {gain.label}: +{gain.amount} XP
                </span>
              ))}
            </div>

            {/* Streak & Badges summary */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
              <div className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-orange-400 animate-pulse" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                </svg>
                <span className="font-extrabold text-orange-300">{gamificationResult.newStreak} Day Streak</span>
              </div>
              {gamificationResult.newAchievements.length > 0 && (
                <div className="flex items-center gap-1.5 text-amber-300 font-extrabold">
                  <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.504-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.004 0H9.496m5.004 0a5.25 5.25 0 0 0 5.25-5.25v-1.5h-15.5v1.5a5.25 5.25 0 0 0 5.25 5.25m10.25-5.25H21a2.25 2.25 0 0 0 2.25-2.25v-.75a2.25 2.25 0 0 0-2.25-2.25h-1.5M4.5 9H3a2.25 2.25 0 0 0-2.25 2.25v.75A2.25 2.25 0 0 0 3 14.25h1.5" />
                  </svg>
                  <span>{gamificationResult.newAchievements.length} New Badge{gamificationResult.newAchievements.length > 1 ? "s" : ""}!</span>
                </div>
              )}
            </div>

            {/* New Unlocked Badges Showcase */}
            {gamificationResult.newAchievements.length > 0 && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {gamificationResult.newAchievements.map((ach) => (
                  <div
                    key={ach.id}
                    className="flex items-center gap-2 p-2 rounded-xl bg-amber-500/15 border border-amber-400/50 animate-badge-unlock shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/20 text-amber-300">
                      <AchievementIcon icon={ach.icon} className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-white truncate">{ach.title}</p>
                      <p className="text-[9px] text-amber-200/80 truncate">{ach.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 1. Raw Stats Grid (Appears immediately) ── */}
        <div className="grid grid-cols-2 gap-2.5">
          {stats.map((s, i) => (
            <div key={i} className="liquid-glass card-hover-lift shimmer-hover rounded-2xl p-3.5 text-center">
              <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] mb-1.5">
                {s.icon}
              </div>
              <p className="text-lg font-bold tracking-tight text-white">{s.value}</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── 2. Staggered AI Debrief Section (Fades in slightly after raw stats) ── */}
        {showAiDebrief && (
          <div className="rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-950/40 via-sky-950/30 to-[#041226]/60 p-4.5 space-y-3 animate-fade-in-up shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300 text-xs shadow-[0_0_8px_rgba(56,189,248,0.3)]">
                  <svg className="h-3.5 w-3.5 text-cyan-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                  </svg>
                </span>
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  Coach Fostura AI Debrief
                </h3>
              </div>
              <span className="liquid-pill px-2 py-0.5 rounded text-[9px] font-bold text-teal-300 uppercase">
                Target Met
              </span>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed">
              {completedSets.length >= 6
                ? `Outstanding performance! You completed ${completedSets.length} sets across ${trackedExercises.length} movements with ${totalVolume.toLocaleString()} ${unit} total workload. Progressive overload target achieved.`
                : `Solid training session! You logged ${completedSets.length} completed sets. Ensure consistent rest intervals and aim to step up resistance on your compound lifts next session.`}
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/[0.06] text-[10px]">
              <div className="rounded-xl bg-white/[0.03] p-2.5">
                <span className="font-bold text-sky-400 flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-sky-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 10.5h.75v3H21v-3ZM3.75 8.25h15a1.5 1.5 0 0 1 1.5 1.5v4.5a1.5 1.5 0 0 1-1.5 1.5h-15a1.5 1.5 0 0 1-1.5-1.5v-4.5a1.5 1.5 0 0 1 1.5-1.5Z" />
                  </svg>
                  <span>Recovery Window</span>
                </span>
                <span className="text-slate-300 mt-0.5 block">Allow 48h before training primary movers again</span>
              </div>
              <div className="rounded-xl bg-white/[0.03] p-2.5">
                <span className="font-bold text-teal-300 flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-teal-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m-7-9c0 3.866 3.134 7 7 7s7-3.134 7-7H5Z" />
                  </svg>
                  <span>Fuel Target</span>
                </span>
                <span className="text-slate-300 mt-0.5 block">Consume 25–35g protein within 90 minutes</span>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <h3 className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Exercise Summary</h3>
          <div className="space-y-1.5">
            {trackedExercises.map((ex, i) => {
              const done = ex.trackedSets.filter((s) => s.completed).length;
              return (
                <div key={i} className="flex items-center justify-between text-xs py-1">
                  <span className={done > 0 ? "text-slate-200 font-medium" : "text-slate-500 line-through"}>
                    {ex.name}
                  </span>
                  <span className={`font-mono font-bold ${done === ex.trackedSets.length ? "text-cyan-300" : "text-slate-400"}`}>
                    {done}/{ex.trackedSets.length}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Guest Mode Upsell Callout ── */}
        {isLoaded && !isSignedIn && (
          <div className="mt-5 rounded-2xl border border-cyan-400/30 bg-cyan-950/40 p-4 text-center space-y-2.5 animate-fade-in">
            <div className="flex items-center justify-center gap-1.5 text-cyan-300">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
              <h4 className="text-xs font-black uppercase tracking-wider text-white">Save Your Progress</h4>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Create an account to save your history and track your progress!
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 hover:opacity-95 transition-opacity button-press"
                >
                  Create Free Account
                </button>
              </SignUpButton>
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 font-bold text-xs transition-all button-press"
                >
                  Sign In
                </button>
              </SignInButton>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-sky-500/20 bg-sky-950/20 p-5 text-center">
          <div className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 text-rose-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
            <h3 className="text-sm font-bold tracking-tight text-white">Support Development</h3>
          </div>
          <div className="mx-auto mt-3.5 w-44 overflow-hidden rounded-xl border border-white/10 shadow-2xl">
            <Image src="/qr-code.jpg" alt="QR code for donations" width={176} height={176} className="h-auto w-full" />
          </div>
          <p className="mt-2.5 text-[11px] text-slate-400">Scan with GCash, Maya, or any bank app to support!</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-400 py-3 text-xs font-bold text-white shadow-xl transition-all hover:from-sky-400 hover:to-teal-300 active:scale-[0.98] button-press shimmer-hover animate-gradient-flow"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Donation / Tip Jar Modal
   ═══════════════════════════════════════════════════════════════ */
function TipJarModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ animation: "fadeIn 0.25s ease-out" }}>
      <div className="absolute inset-0 bg-[#020713]/85 backdrop-blur-md" onClick={onClose} />
      <div
        className="liquid-glass relative max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-3xl p-6 shadow-2xl text-center"
        style={{ animation: "scaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-300">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
          </svg>
        </div>

        <h3 className="text-base font-extrabold text-white">Support Fostura</h3>
        <p className="text-xs text-slate-400 mt-1">If this workout studio helps your fitness journey, consider supporting the developers!</p>

        <div className="mx-auto mt-4 w-44 overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
          <Image src="/qr-code.jpg" alt="QR code for donations" width={176} height={176} className="h-auto w-full" />
        </div>
        <p className="mt-2.5 text-[11px] text-slate-400">Scan with GCash, Maya, or banking app</p>

        <button
          type="button"
          onClick={onClose}
          className="liquid-glass liquid-glass-interactive mt-5 w-full rounded-xl py-2.5 text-xs font-bold text-white hover:border-sky-400/40"
        >
          Close
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Create Template Modal
   ═══════════════════════════════════════════════════════════════ */
function CreateTemplateModal({
  onSave,
  onClose,
}: {
  onSave: (t: WorkoutTemplate) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Custom");
  const [exercises, setExercises] = useState<Exercise[]>([]);

  function addEx(ex: Exercise) {
    setExercises((prev) => [...prev, ex]);
  }
  function removeEx(idx: number) {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSave() {
    if (!name.trim() || exercises.length === 0) return;
    onSave({
      id: uid(),
      name: name.trim(),
      category: category.trim() || "Custom",
      exercises,
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ animation: "fadeIn 0.2s ease-out" }}>
      <div className="absolute inset-0 bg-[#020713]/80 backdrop-blur-md" onClick={onClose} />
      <div
        className="liquid-glass relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl p-6 shadow-2xl"
        style={{ animation: "scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/50 to-transparent" />
        
        <h2 className="text-lg font-bold tracking-tight text-white">Create Routine Template</h2>
        <p className="mt-0.5 text-xs text-slate-400">Save custom workouts for quick one-tap start</p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Routine Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Upper Body Focus"
              className="liquid-input mt-1 w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none"
              autoFocus
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Category Tag</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Hypertrophy / Strength"
              className="liquid-input mt-1 w-full rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Exercises ({exercises.length})</label>
          {exercises.map((ex, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2 text-xs">
              <span className="font-semibold text-white">{ex.name}</span>
              <div className="flex items-center gap-2.5 text-slate-400">
                <span className="font-mono font-semibold">{ex.sets} × {ex.reps}</span>
                <button type="button" onClick={() => removeEx(i)} className="text-red-400/60 hover:text-red-400">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
          <AddExerciseInline onAdd={addEx} />
        </div>

        <div className="mt-6 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="liquid-glass flex-1 rounded-xl py-2.5 text-xs font-semibold text-slate-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || exercises.length === 0}
            className="flex-1 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 py-2.5 text-xs font-bold text-white shadow-lg transition-all hover:from-sky-400 hover:to-cyan-400 disabled:opacity-40"
          >
            Save Template
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Log Metric Entry Modal
   ═══════════════════════════════════════════════════════════════ */
function LogMetricModal({
  onSave,
  onClose,
  defaultUnit = "lbs",
  onSetUnit,
}: {
  onSave: (entry: MetricEntry) => void;
  onClose: () => void;
  defaultUnit?: "lbs" | "kg";
  onSetUnit?: (u: "lbs" | "kg") => void;
}) {
  const todayStr = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(todayStr);
  const [unit, setUnit] = useState<"lbs" | "kg">(defaultUnit);
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [calories, setCalories] = useState("");

  function handleSave() {
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0) return;
    const bf = parseFloat(bodyFat) || 0;
    const cal = parseInt(calories) || 0;
    const weightInLbs = unit === "kg" ? w * 2.20462262 : w;

    if (onSetUnit) {
      onSetUnit(unit);
    }

    onSave({
      id: uid(),
      date,
      weight: weightInLbs,
      bodyFat: bf,
      calories: cal,
    });
  }

  function handleSwitchUnit(nextUnit: "lbs" | "kg") {
    if (nextUnit === unit) return;
    if (weight) {
      const num = parseFloat(weight);
      if (!isNaN(num)) {
        if (nextUnit === "kg") {
          setWeight((num / 2.20462262).toFixed(1));
        } else {
          setWeight((num * 2.20462262).toFixed(1));
        }
      }
    }
    setUnit(nextUnit);
    if (onSetUnit) onSetUnit(nextUnit);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ animation: "fadeIn 0.2s ease-out" }}>
      <div className="absolute inset-0 bg-[#020713]/80 backdrop-blur-md" onClick={onClose} />
      <div
        className="liquid-glass relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl p-6 shadow-2xl"
        style={{ animation: "scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
        <h2 className="text-lg font-bold tracking-tight text-white">Log Body & Diet Metrics</h2>
        <p className="mt-0.5 text-xs text-slate-400">Record your current progress metrics</p>

        <div className="mt-4 space-y-3.5">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="liquid-input mt-1 w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Body Weight ({unit}) *
              </label>
              <div className="liquid-pill flex rounded-lg p-0.5 border-white/10">
                <button
                  type="button"
                  onClick={() => handleSwitchUnit("lbs")}
                  className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-md transition-all ${
                    unit === "lbs" ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-sm" : "text-slate-400 hover:text-white"
                  }`}
                >
                  LBS
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchUnit("kg")}
                  className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-md transition-all ${
                    unit === "kg" ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-sm" : "text-slate-400 hover:text-white"
                  }`}
                >
                  KG
                </button>
              </div>
            </div>
            <input
              type="number"
              step="0.1"
              placeholder={unit === "lbs" ? "e.g. 172.5" : "e.g. 78.2"}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="liquid-input mt-1 w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Body Fat (%)</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 15.2"
                value={bodyFat}
                onChange={(e) => setBodyFat(e.target.value)}
                className="liquid-input mt-1 w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Calories (kcal)</label>
              <input
                type="number"
                placeholder="e.g. 2350"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="liquid-input mt-1 w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="liquid-glass flex-1 rounded-xl py-2.5 text-xs font-semibold text-slate-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!weight}
            className="flex-1 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 py-2.5 text-xs font-bold text-white shadow-lg transition-all hover:from-sky-400 hover:to-cyan-400 disabled:opacity-40"
          >
            Save Entry
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Interactive SVG Chart Component (Ocean Colors)
   ═══════════════════════════════════════════════════════════════ */
type TimelineFilter = "days" | "months";
type ActiveMetricType = "weight" | "bodyFat" | "calories";

function MetricsChart({
  metrics,
  activeMetric,
  timelineFilter,
  unit = "lbs",
  onLogClick,
}: {
  metrics: MetricEntry[];
  activeMetric: ActiveMetricType;
  timelineFilter: TimelineFilter;
  unit?: "lbs" | "kg";
  onLogClick?: () => void;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const chartData = useMemo(() => {
    if (metrics.length === 0) return [];
    const sorted = [...metrics].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const getVal = (m: MetricEntry) => {
      if (activeMetric === "weight") {
        return unit === "kg" ? Math.round((m.weight / 2.20462262) * 10) / 10 : Math.round(m.weight * 10) / 10;
      }
      if (activeMetric === "bodyFat") return m.bodyFat;
      return m.calories;
    };

    if (timelineFilter === "days") {
      const slice = sorted.slice(-14);
      return slice.map((m) => ({
        label: new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        fullDate: m.date,
        val: getVal(m),
      }));
    } else {
      const monthlyMap = new Map<string, { total: number; count: number; dateStr: string }>();
      sorted.forEach((m) => {
        const d = new Date(m.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const val = getVal(m);
        const current = monthlyMap.get(key) || { total: 0, count: 0, dateStr: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }) };
        monthlyMap.set(key, { total: current.total + val, count: current.count + 1, dateStr: current.dateStr });
      });

      return Array.from(monthlyMap.entries()).map(([, data]) => ({
        label: data.dateStr,
        fullDate: data.dateStr,
        val: Math.round((data.total / data.count) * 10) / 10,
      }));
    }
  }, [metrics, activeMetric, timelineFilter, unit]);

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.01] p-8 text-center space-y-3 min-h-[220px]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-white">No progression measurements recorded yet</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Log your body weight, body fat %, or caloric intake to visualize your progression curve over time!
          </p>
        </div>
        {onLogClick && (
          <button
            type="button"
            onClick={onLogClick}
            className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 hover:opacity-95 transition-opacity button-press"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Log Your First Entry</span>
          </button>
        )}
      </div>
    );
  }

  const values = chartData.map((d) => d.val);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const rawRange = maxVal - minVal;
  const minSpan = activeMetric === "weight" ? (unit === "kg" ? 4 : 8) : activeMetric === "bodyFat" ? 3 : 200;
  const effectiveRange = Math.max(rawRange, minSpan);
  const padding = Math.max(effectiveRange * 0.15, 0.5);
  const chartMin = Math.max(0, Math.floor((minVal - (rawRange === 0 ? effectiveRange * 0.4 : padding)) * 10) / 10);
  const chartMax = Math.ceil((maxVal + (rawRange === 0 ? effectiveRange * 0.4 : padding)) * 10) / 10;

  const width = 640;
  const height = 220;
  const topPad = 25;
  const bottomPad = 35;
  const leftPad = 45;
  const rightPad = 25;
  const plotWidth = width - leftPad - rightPad;
  const plotHeight = height - topPad - bottomPad;

  const points = chartData.map((d, i) => {
    const x = leftPad + (plotWidth / (chartData.length - 1 || 1)) * i;
    const normalizedY = (d.val - chartMin) / ((chartMax - chartMin) || 1);
    const y = topPad + plotHeight - normalizedY * plotHeight;
    return { x, y, data: d };
  });

  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const mx = (p0.x + p1.x) / 2;
    pathD += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  const areaD = `${pathD} L ${points[points.length - 1].x} ${topPad + plotHeight} L ${points[0].x} ${topPad + plotHeight} Z`;

  const metricConfig = {
    weight: { unit, color: "#00a8e8", gradId: "weightGrad", stroke: "url(#oceanLineGrad)" },
    bodyFat: { unit: "%", color: "#2dd4bf", gradId: "bfGrad", stroke: "url(#seafoamLineGrad)" },
    calories: { unit: "kcal", color: "#38bdf8", gradId: "calGrad", stroke: "url(#skyLineGrad)" },
  }[activeMetric];

  return (
    <div className="relative w-full overflow-hidden select-none">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00a8e8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#00a8e8" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="bfGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
          </linearGradient>

          <linearGradient id="oceanLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0074b7" />
            <stop offset="100%" stopColor="#48cae4" />
          </linearGradient>
          <linearGradient id="seafoamLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#2dd4bf" />
          </linearGradient>
          <linearGradient id="skyLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#90e0ef" />
          </linearGradient>
        </defs>

        {[0, 0.33, 0.66, 1].map((ratio, idx) => {
          const y = topPad + plotHeight * (1 - ratio);
          const rawVal = chartMin + (chartMax - chartMin) * ratio;
          const valLabel = (chartMax - chartMin) <= 8 ? rawVal.toFixed(1) : Math.round(rawVal).toString();
          return (
            <g key={idx}>
              <line
                x1={leftPad}
                y1={y}
                x2={width - rightPad}
                y2={y}
                stroke="rgba(144, 224, 239, 0.1)"
                strokeDasharray="3 3"
              />
              <text
                x={leftPad - 8}
                y={y + 3}
                fill="rgba(144, 224, 239, 0.6)"
                fontSize="9"
                fontFamily="monospace"
                textAnchor="end"
              >
                {valLabel}
              </text>
            </g>
          );
        })}

        <path d={areaD} fill={`url(#${metricConfig.gradId})`} />

        <path
          d={pathD}
          fill="none"
          stroke={metricConfig.stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 10px ${metricConfig.color})` }}
        />

        {points.map((pt, i) => {
          const isHovered = hoveredIdx === i;
          return (
            <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}>
              <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />

              {isHovered && (
                <line
                  x1={pt.x}
                  y1={topPad}
                  x2={pt.x}
                  y2={topPad + plotHeight}
                  stroke="rgba(255, 255, 255, 0.35)"
                  strokeDasharray="2 2"
                />
              )}

              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? "6" : "3.5"}
                fill="#040e20"
                stroke={metricConfig.color}
                strokeWidth={isHovered ? "3" : "2"}
                className="transition-all duration-150"
              />

              <text
                x={pt.x}
                y={height - 10}
                fill={isHovered ? "#ffffff" : "rgba(148, 163, 184, 0.75)"}
                fontSize={isHovered ? "10" : "8.5"}
                fontWeight={isHovered ? "bold" : "normal"}
                textAnchor="middle"
                className="transition-all"
              >
                {pt.data.label}
              </text>
            </g>
          );
        })}
      </svg>

      {hoveredIdx !== null && points[hoveredIdx] && (
        <div
          className="liquid-pill absolute pointer-events-none rounded-xl px-3 py-1.5 shadow-2xl z-20 transition-transform duration-75 text-center"
          style={{
            left: `${(points[hoveredIdx].x / width) * 100}%`,
            top: `${(points[hoveredIdx].y / height) * 100 - 35}%`,
            transform: "translate(-50%, -100%)",
            border: `1px solid ${metricConfig.color}50`,
          }}
        >
          <p className="text-[10px] font-bold text-slate-400">{points[hoveredIdx].data.fullDate}</p>
          <p className="text-xs font-black text-white">
            {points[hoveredIdx].data.val} <span className="text-[10px] font-normal text-sky-200">{metricConfig.unit}</span>
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Interactive Conversational BMI Calculator & Baseline Tracker
   ═══════════════════════════════════════════════════════════════ */
interface SavedBmiData {
  bmi: number;
  category: string;
  color: string;
  idealRange: string;
  heightFormatted: string;
  weightFormatted: string;
  feet: number;
  inches: number;
  heightCm: number;
  weightLbs: number;
  weightKg: number;
  heightUnit: "ft_in" | "cm";
  weightUnit: "lbs" | "kg";
  savedAt: string;
}

function loadSavedBmi(): SavedBmiData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("forma-saved-bmi");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveBmiToStorage(data: SavedBmiData | null) {
  if (typeof window === "undefined") return;
  try {
    if (data) {
      localStorage.setItem("forma-saved-bmi", JSON.stringify(data));
    } else {
      localStorage.removeItem("forma-saved-bmi");
    }
  } catch {}
}

/* ═══════════════════════════════════════════════════════════════
   BmiIntroGraphic — Luxury Smart Scale Visual Asset
   ═══════════════════════════════════════════════════════════════ */
function BmiIntroGraphic({ isPing = false }: { isPing?: boolean }) {
  return (
    <div className="relative mx-auto w-48 h-48 flex items-center justify-center select-none py-1">
      {/* Ambient background glow matching ocean theme */}
      <div
        className={`absolute inset-2 rounded-full bg-gradient-to-tr from-cyan-500/25 via-sky-500/20 to-teal-500/15 blur-2xl transition-all duration-300 pointer-events-none ${
          isPing ? "scale-125 opacity-100 bg-cyan-400/50" : "animate-pulse"
        }`}
      />

      {/* Floating container with brushed dark-glass bezel & subtle reflections */}
      <div
        className={`relative w-44 h-44 rounded-3xl overflow-hidden border transition-all duration-300 bg-gradient-to-b from-white/[0.06] to-[#040914] group ${
          isPing
            ? "scale-105 border-cyan-400/80 shadow-[0_0_40px_rgba(56,189,248,0.5)]"
            : "border-white/[0.12] shadow-2xl shadow-cyan-500/20 animate-float"
        }`}
      >
        <img
          src="/smart-bmi-scale.jpg"
          alt="Precision Smart Scale"
          className={`w-full h-full object-cover transition-transform duration-700 ${
            isPing ? "scale-110" : "group-hover:scale-105"
          }`}
        />
        {/* Subtle glass reflection overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-transparent to-white/[0.08] pointer-events-none" />

        {/* Biometric calibration pulse scan line overlay when clicked */}
        {isPing && (
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent animate-biometric-ping pointer-events-none" />
        )}
      </div>
    </div>
  );
}

function BmiCalculator() {
  const [savedBmi, setSavedBmi] = useState<SavedBmiData | null>(null);
  const [mode, setMode] = useState<"wizard" | "saved">("wizard");
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [justSaved, setJustSaved] = useState(false);

  // Transition & Animation States
  const [transitionState, setTransitionState] = useState<"idle" | "exiting">("idle");
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [isPing, setIsPing] = useState(false);

  function goToStep(nextStep: 0 | 1 | 2 | 3, dir: "forward" | "backward" = "forward") {
    setDirection(dir);
    if (step === 0 && nextStep === 1) {
      setIsPing(true);
    }
    setTransitionState("exiting");
    setTimeout(() => {
      setStep(nextStep);
      setIsPing(false);
      setTransitionState("idle");
    }, 200);
  }

  const [heightUnit, setHeightUnit] = useState<"ft_in" | "cm">("ft_in");
  const [weightUnit, setWeightUnit] = useState<"lbs" | "kg">("lbs");

  const [feet, setFeet] = useState(5);
  const [inches, setInches] = useState(10);
  const [heightCm, setHeightCm] = useState(178);

  const [weightLbs, setWeightLbs] = useState(170);
  const [weightKg, setWeightKg] = useState(77);

  // Load saved baseline on mount
  useEffect(() => {
    const loaded = loadSavedBmi();
    if (loaded) {
      setSavedBmi(loaded);
      setMode("saved");
      setHeightUnit(loaded.heightUnit);
      setWeightUnit(loaded.weightUnit);
      setFeet(loaded.feet);
      setInches(loaded.inches);
      setHeightCm(loaded.heightCm);
      setWeightLbs(loaded.weightLbs);
      setWeightKg(loaded.weightKg);
    }
  }, []);

  // Bidirectional Height Unit Switch Handler
  function handleHeightUnitChange(nextUnit: "ft_in" | "cm") {
    if (nextUnit === heightUnit) return;
    if (nextUnit === "cm") {
      const totalIn = feet * 12 + inches;
      const convertedCm = Math.round(totalIn * 2.54);
      setHeightCm(Math.max(100, Math.min(240, convertedCm)));
    } else {
      const totalIn = Math.round(heightCm / 2.54);
      const f = Math.floor(totalIn / 12);
      const i = totalIn % 12;
      setFeet(Math.max(3, Math.min(7, f)));
      setInches(Math.max(0, Math.min(11, i)));
    }
    setHeightUnit(nextUnit);
  }

  // Bidirectional Weight Unit Switch Handler
  function handleWeightUnitChange(nextUnit: "lbs" | "kg") {
    if (nextUnit === weightUnit) return;
    if (nextUnit === "kg") {
      const convertedKg = Math.round((weightLbs / 2.20462) * 10) / 10;
      setWeightKg(Math.max(30, Math.min(200, convertedKg)));
    } else {
      const convertedLbs = Math.round(weightKg * 2.20462);
      setWeightLbs(Math.max(60, Math.min(450, convertedLbs)));
    }
    setWeightUnit(nextUnit);
  }

  const { bmi, category, color, idealRange, progressRatio, heightFormatted, weightFormatted, insight } = useMemo(() => {
    // Height in meters
    let heightM = 0;
    let formattedHeight = "";
    if (heightUnit === "ft_in") {
      const totalInches = feet * 12 + inches;
      heightM = (totalInches * 2.54) / 100;
      formattedHeight = `${feet} ft ${inches} in`;
    } else {
      heightM = heightCm / 100;
      formattedHeight = `${heightCm} cm`;
    }

    // Weight in kg
    let weightInKg = 0;
    let formattedWeight = "";
    if (weightUnit === "lbs") {
      weightInKg = weightLbs * 0.45359237;
      formattedWeight = `${weightLbs} lbs`;
    } else {
      weightInKg = weightKg;
      formattedWeight = `${weightKg} kg`;
    }

    let bmiVal = 0;
    let idealMin = 0;
    let idealMax = 0;
    const unitLabel = weightUnit;

    if (heightM > 0) {
      bmiVal = weightInKg / (heightM * heightM);
      const idealMinKg = 18.5 * (heightM * heightM);
      const idealMaxKg = 24.9 * (heightM * heightM);

      if (weightUnit === "lbs") {
        idealMin = Math.round(idealMinKg * 2.20462);
        idealMax = Math.round(idealMaxKg * 2.20462);
      } else {
        idealMin = Math.round(idealMinKg * 10) / 10;
        idealMax = Math.round(idealMaxKg * 10) / 10;
      }
    }

    const roundedBmi = Math.round(bmiVal * 10) / 10;

    let cat = "Healthy / Normal";
    let col = "text-cyan-300 border-cyan-500/30 bg-cyan-500/10";
    let ratio = 0.4;
    let cue = "You are in the optimal healthy weight bracket! Great balance of lean mass and conditioning.";

    if (roundedBmi < 18.5) {
      cat = "Underweight";
      col = "text-sky-300 border-sky-500/30 bg-sky-500/10";
      ratio = Math.max(0.04, ((roundedBmi - 12) / (18.5 - 12)) * 0.25);
      cue = "Below standard range. Focus on nutrient-dense calorie surplus and progressive hypertrophy training.";
    } else if (roundedBmi < 25) {
      cat = "Healthy / Normal";
      col = "text-cyan-300 border-cyan-500/30 bg-cyan-500/10";
      ratio = 0.25 + ((roundedBmi - 18.5) / (25 - 18.5)) * 0.35;
      cue = "Optimal athletic baseline! Excellent balance of muscle mass and metabolic conditioning.";
    } else if (roundedBmi < 30) {
      cat = "Overweight";
      col = "text-amber-300 border-amber-500/30 bg-amber-500/10";
      ratio = 0.6 + ((roundedBmi - 25) / (30 - 25)) * 0.25;
      cue = "Slightly above standard range. If you train heavy, muscle mass can skew BMI; otherwise, a structured deficit helps lean out.";
    } else {
      cat = "Obese";
      col = "text-rose-300 border-rose-500/30 bg-rose-500/10";
      ratio = Math.min(0.96, 0.85 + ((roundedBmi - 30) / (40 - 30)) * 0.15);
      cue = "Above standard range. Consistent daily movement, progressive workouts, and balanced nutrition will yield rapid rewards.";
    }

    return {
      bmi: roundedBmi,
      category: cat,
      color: col,
      idealRange: `${idealMin} – ${idealMax} ${unitLabel}`,
      progressRatio: Math.min(Math.max(ratio, 0.03), 0.97),
      heightFormatted: formattedHeight,
      weightFormatted: formattedWeight,
      insight: cue,
    };
  }, [heightUnit, weightUnit, feet, inches, heightCm, weightLbs, weightKg]);

  function handleSaveBmi() {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
    const d = new Date();
    const dateStr = `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

    const dataToSave: SavedBmiData = {
      bmi,
      category,
      color,
      idealRange,
      heightFormatted,
      weightFormatted,
      feet,
      inches,
      heightCm,
      weightLbs,
      weightKg,
      heightUnit,
      weightUnit,
      savedAt: dateStr,
    };

    saveBmiToStorage(dataToSave);
    setSavedBmi(dataToSave);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  }

  function handleResetSavedBmi() {
    saveBmiToStorage(null);
    setSavedBmi(null);
    setMode("wizard");
    goToStep(0, "backward");
  }

  const isCurrentSaved =
    savedBmi &&
    savedBmi.feet === feet &&
    savedBmi.inches === inches &&
    savedBmi.heightCm === heightCm &&
    savedBmi.weightLbs === weightLbs &&
    savedBmi.weightKg === weightKg &&
    savedBmi.heightUnit === heightUnit &&
    savedBmi.weightUnit === weightUnit;

  // Active step container animation class
  const stepAnimClass =
    transitionState === "exiting"
      ? direction === "forward"
        ? "animate-step-out-left opacity-0 pointer-events-none"
        : "animate-step-out-right opacity-0 pointer-events-none"
      : direction === "forward"
      ? "animate-step-in-right"
      : "animate-step-in-left";

  /* ═════════════════════════════════════════════════════════════
     VIEW A: SAVED BASELINE CARD (When user has already saved BMI)
     ═════════════════════════════════════════════════════════════ */
  if (mode === "saved" && savedBmi) {
    const savedProgress =
      savedBmi.bmi < 18.5
        ? Math.max(0.04, ((savedBmi.bmi - 12) / (18.5 - 12)) * 0.25)
        : savedBmi.bmi < 25
        ? 0.25 + ((savedBmi.bmi - 18.5) / (25 - 18.5)) * 0.35
        : savedBmi.bmi < 30
        ? 0.6 + ((savedBmi.bmi - 25) / (30 - 25)) * 0.25
        : Math.min(0.96, 0.85 + ((savedBmi.bmi - 30) / (40 - 30)) * 0.15);

    return (
      <div className="liquid-glass rounded-3xl p-6 shadow-2xl space-y-5 animate-fade-in border border-white/[0.08]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]" />
            <div>
              <h3 className="text-sm font-extrabold text-white">Your Saved BMI Baseline</h3>
              <p className="text-[10px] text-slate-400">Recorded on {savedBmi.savedAt}</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300">
            Active Baseline
          </span>
        </div>

        {/* Calculated Score Card */}
        <div className="liquid-glass rounded-2xl p-5 border-white/10 space-y-3.5 shadow-inner">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400">Score</p>
              <p className="text-4xl font-black text-white tracking-tight mt-0.5">{savedBmi.bmi}</p>
            </div>
            <div className="text-right">
              <span className={`liquid-pill inline-block rounded-xl px-3 py-1 text-xs font-bold ${savedBmi.color}`}>
                {savedBmi.category}
              </span>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">Ideal: {savedBmi.idealRange}</p>
            </div>
          </div>

          {/* Height & Weight Parameters Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="px-3 py-1 rounded-xl bg-white/[0.04] text-slate-300 border border-white/[0.06]">
              Height: <strong className="text-white font-bold">{savedBmi.heightFormatted}</strong>
            </span>
            <span className="px-3 py-1 rounded-xl bg-white/[0.04] text-slate-300 border border-white/[0.06]">
              Weight: <strong className="text-white font-bold">{savedBmi.weightFormatted}</strong>
            </span>
          </div>

          {/* Spectrum Bar */}
          <div className="relative pt-2">
            <div className="h-2 w-full rounded-full bg-gradient-to-r from-sky-400 via-teal-300 via-amber-300 to-rose-400" />
            <div
              className="absolute top-0 h-4 w-1.5 rounded-full bg-white shadow-[0_0_10px_#ffffff] transition-all duration-300 -translate-x-1/2"
              style={{ left: `${savedProgress * 100}%` }}
            />
            <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-1.5">
              <span>Under (&lt;18.5)</span>
              <span>Healthy (18.5-24.9)</span>
              <span>Over (25-29.9)</span>
              <span>Obese (30+)</span>
            </div>
          </div>
        </div>

        {/* Why it is saved message */}
        <p className="text-xs text-slate-400 leading-relaxed px-1">
          A person does not change their body mass index quickly, so your baseline is preserved here. Whenever your weight or measurements shift, update it below.
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setMode("wizard");
              goToStep(1, "forward");
            }}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-400 hover:from-sky-400 hover:to-teal-300 text-white text-xs font-bold transition-all shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2 button-press"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span>Recalculate / Update BMI</span>
          </button>
          <button
            type="button"
            onClick={handleResetSavedBmi}
            className="px-3.5 py-3 rounded-2xl border border-white/10 hover:border-rose-500/30 hover:bg-rose-950/20 text-slate-400 hover:text-rose-300 text-xs font-semibold transition-colors button-press"
            title="Reset baseline"
          >
            Clear
          </button>
        </div>
      </div>
    );
  }

  /* ═════════════════════════════════════════════════════════════
     VIEW B: PROGRESSIVE CONVERSATIONAL EXPERIENCE (Steps 0, 1, 2, 3)
     ═════════════════════════════════════════════════════════════ */
  return (
    <div className="liquid-glass rounded-3xl p-6 shadow-2xl space-y-5 animate-fade-in border border-white/[0.08] overflow-hidden">
      {/* ── STEP 0: FRIENDLY INVITATION & ANIMATED GRAPHIC ── */}
      {step === 0 && (
        <div className={`space-y-5 text-center py-2 transition-all duration-200 ${stepAnimClass}`}>
          {/* Smart Scale Graphic with Interactive Biometric Ping */}
          <BmiIntroGraphic isPing={isPing} />

          {/* Friendly Conversational Hook */}
          <div className="space-y-1.5">
            <h3 className="text-2xl font-black text-white tracking-tight">Wanna know your BMI?</h3>
            <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
              Take a quick 15-second check-in to calibrate your body mass index, discover your healthy weight zone, and save your baseline.
            </p>
          </div>

          {/* Primary CTA Button with interactive click animation */}
          <div className="pt-2 space-y-2.5 max-w-xs mx-auto">
            <button
              type="button"
              onClick={() => goToStep(1, "forward")}
              className="group relative w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-400 hover:from-sky-400 hover:to-teal-300 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 overflow-hidden active:scale-95 button-press"
            >
              {/* Light sweep effect on hover */}
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />

              <span>Yes, let's find out</span>
              <svg
                className={`w-4 h-4 transition-transform duration-300 ${
                  isPing ? "translate-x-2 text-cyan-200" : "group-hover:translate-x-1"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </button>

            {savedBmi && (
              <button
                type="button"
                onClick={() => setMode("saved")}
                className="w-full text-xs text-slate-400 hover:text-cyan-300 transition-colors py-1 block"
              >
                You have a saved baseline ({savedBmi.bmi}) · <span className="underline font-semibold">View it</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 1: HEIGHT QUESTION ── */}
      {step === 1 && (
        <div className={`space-y-4 transition-all duration-200 ${stepAnimClass}`}>
          {/* Header & Step Tracker */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <button
              type="button"
              onClick={() => goToStep(0, "backward")}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors button-press"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              <span>Back</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-cyan-300">Step 1 of 2</span>
              <div className="flex gap-1">
                <span className="w-4 h-1 rounded-full bg-cyan-400" />
                <span className="w-4 h-1 rounded-full bg-white/10" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-black text-white tracking-tight">How tall are you?</h3>
            <p className="text-xs text-slate-400 mt-0.5">Slide to dial in or tap a common height below</p>
          </div>

          {/* Unit Toggle & Interactive Display */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-4.5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Measurement unit</span>
              <div className="flex p-0.5 rounded-xl bg-white/[0.06] border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => handleHeightUnitChange("ft_in")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all button-press ${
                    heightUnit === "ft_in"
                      ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-sm shadow-cyan-500/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  ft / in
                </button>
                <button
                  type="button"
                  onClick={() => handleHeightUnitChange("cm")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all button-press ${
                    heightUnit === "cm"
                      ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-sm shadow-cyan-500/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  cm
                </button>
              </div>
            </div>

            {/* Clean, Non-AI Human Typography Display */}
            <div className="text-center py-4 px-4 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] shadow-inner">
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="text-5xl font-black text-white tracking-tight">
                  {heightUnit === "ft_in" ? feet : heightCm}
                </span>
                <span className="text-2xl font-bold text-cyan-300">
                  {heightUnit === "ft_in" ? "ft" : "cm"}
                </span>
                {heightUnit === "ft_in" && (
                  <>
                    <span className="text-5xl font-black text-white tracking-tight ml-2">
                      {inches}
                    </span>
                    <span className="text-2xl font-bold text-cyan-300">in</span>
                  </>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                {heightUnit === "ft_in"
                  ? `Approx. ${Math.round((feet * 12 + inches) * 2.54)} cm`
                  : `Approx. ${Math.floor(heightCm / 2.54 / 12)} ft ${Math.round((heightCm / 2.54) % 12)} in`}
              </p>
            </div>

            {/* Sliders */}
            {heightUnit === "ft_in" ? (
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-300">
                    <span>Feet</span>
                    <span className="text-cyan-300 font-bold">{feet} ft</span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={7}
                    value={feet}
                    onChange={(e) => setFeet(parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-400 h-2 bg-white/10 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-300">
                    <span>Inches</span>
                    <span className="text-cyan-300 font-bold">{inches} in</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={11}
                    value={inches}
                    onChange={(e) => setInches(parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-400 h-2 bg-white/10 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs font-semibold text-slate-300">
                  <span>Centimeters</span>
                  <span className="text-cyan-300 font-bold">{heightCm} cm</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={240}
                  value={heightCm}
                  onChange={(e) => setHeightCm(parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 h-2 bg-white/10 rounded-lg cursor-pointer"
                />
              </div>
            )}

            {/* Tactile Common Presets */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-medium text-slate-400 block">Common heights</span>
              <div className="flex flex-wrap gap-2">
                {heightUnit === "ft_in"
                  ? [
                      { f: 5, i: 6, label: "5'6\"" },
                      { f: 5, i: 8, label: "5'8\"" },
                      { f: 5, i: 10, label: "5'10\"" },
                      { f: 6, i: 0, label: "6'0\"" },
                      { f: 6, i: 2, label: "6'2\"" },
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          setFeet(p.f);
                          setInches(p.i);
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all button-press ${
                          feet === p.f && inches === p.i
                            ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/25"
                            : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))
                  : [165, 172, 178, 183, 188].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setHeightCm(c)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all button-press ${
                          heightCm === c
                            ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/25"
                            : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]"
                        }`}
                      >
                        {c} cm
                      </button>
                    ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => goToStep(2, "forward")}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-400 hover:from-sky-400 hover:to-teal-300 text-white font-bold text-sm shadow-xl shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 button-press"
          >
            <span>Continue to Weight</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      )}

      {/* ── STEP 2: WEIGHT QUESTION ── */}
      {step === 2 && (
        <div className={`space-y-4 transition-all duration-200 ${stepAnimClass}`}>
          {/* Header & Step Tracker */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <button
              type="button"
              onClick={() => goToStep(1, "backward")}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors button-press"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              <span>Back to Height</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-sky-300">Step 2 of 2</span>
              <div className="flex gap-1">
                <span className="w-4 h-1 rounded-full bg-cyan-400" />
                <span className="w-4 h-1 rounded-full bg-sky-400" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-black text-white tracking-tight">And what's your weight?</h3>
            <p className="text-xs text-slate-400 mt-0.5">We'll compute your BMI score and ideal range in real time</p>
          </div>

          {/* Unit Toggle & Interactive Display */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-4.5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Measurement unit</span>
              <div className="flex p-0.5 rounded-xl bg-white/[0.06] border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => handleWeightUnitChange("lbs")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all button-press ${
                    weightUnit === "lbs"
                      ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-sm shadow-sky-500/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  lbs
                </button>
                <button
                  type="button"
                  onClick={() => handleWeightUnitChange("kg")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all button-press ${
                    weightUnit === "kg"
                      ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-sm shadow-sky-500/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  kg
                </button>
              </div>
            </div>

            {/* Clean, Non-AI Human Typography Display */}
            <div className="text-center py-4 px-4 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] shadow-inner">
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="text-5xl font-black text-white tracking-tight">
                  {weightUnit === "lbs" ? weightLbs : weightKg}
                </span>
                <span className="text-2xl font-bold text-sky-300">
                  {weightUnit}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                {weightUnit === "lbs"
                  ? `Approx. ${Math.round((weightLbs / 2.20462) * 10) / 10} kg`
                  : `Approx. ${Math.round(weightKg * 2.20462)} lbs`}
              </p>
            </div>

            {/* Slider */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>Weight</span>
                <span className="text-sky-300 font-bold">{weightUnit === "lbs" ? `${weightLbs} lbs` : `${weightKg} kg`}</span>
              </div>
              {weightUnit === "lbs" ? (
                <input
                  type="range"
                  min={60}
                  max={450}
                  value={weightLbs}
                  onChange={(e) => setWeightLbs(parseInt(e.target.value, 10))}
                  className="w-full accent-sky-400 h-2 bg-white/10 rounded-lg cursor-pointer"
                />
              ) : (
                <input
                  type="range"
                  min={30}
                  max={200}
                  value={weightKg}
                  onChange={(e) => setWeightKg(parseFloat(e.target.value))}
                  className="w-full accent-sky-400 h-2 bg-white/10 rounded-lg cursor-pointer"
                />
              )}
            </div>

            {/* Tactile Common Presets */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-medium text-slate-400 block">Common weights</span>
              <div className="flex flex-wrap gap-2">
                {weightUnit === "lbs"
                  ? [135, 155, 170, 185, 205].map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setWeightLbs(w)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all button-press ${
                          weightLbs === w
                            ? "bg-sky-500 text-white shadow-md shadow-sky-500/25"
                            : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]"
                        }`}
                      >
                        {w} lbs
                      </button>
                    ))
                  : [60, 70, 77, 84, 92].map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setWeightKg(w)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all button-press ${
                          weightKg === w
                            ? "bg-sky-500 text-white shadow-md shadow-sky-500/25"
                            : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]"
                        }`}
                      >
                        {w} kg
                      </button>
                    ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => goToStep(3, "forward")}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-400 hover:from-sky-400 hover:to-teal-300 text-white font-bold text-sm shadow-xl shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 button-press"
          >
            <span>Calculate My BMI</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      )}

      {/* ── STEP 3: RESULT & SAVE BASELINE ── */}
      {step === 3 && (
        <div className={`space-y-4 transition-all duration-200 ${stepAnimClass}`}>
          {/* Header & Adjust Inputs Button */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <button
              type="button"
              onClick={() => goToStep(2, "backward")}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors button-press"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              <span>Adjust Measurements</span>
            </button>
            <span className="text-[11px] font-bold text-cyan-300">Calculated Baseline</span>
          </div>

          <div>
            <h3 className="text-xl font-black text-white tracking-tight">Your Body Mass Index</h3>
            <p className="text-xs text-slate-400 mt-0.5">Based on {heightFormatted} and {weightFormatted}</p>
          </div>

          {/* Result Card */}
          <div className="liquid-glass rounded-2xl p-5 border-white/10 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400">Score</p>
                <p className="text-4xl font-black tracking-tight text-white mt-0.5">{bmi}</p>
              </div>
              <div className="text-right">
                <span className={`liquid-pill inline-block rounded-xl px-3 py-1 text-xs font-bold ${color}`}>
                  {category}
                </span>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">Ideal: {idealRange}</p>
              </div>
            </div>

            {/* Spectrum Bar */}
            <div className="relative pt-2">
              <div className="h-2 w-full rounded-full bg-gradient-to-r from-sky-400 via-teal-300 via-amber-300 to-rose-400" />
              <div
                className="absolute top-0 h-4 w-1.5 rounded-full bg-white shadow-[0_0_10px_#ffffff] transition-all duration-300 -translate-x-1/2"
                style={{ left: `${progressRatio * 100}%` }}
              />
              <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-1.5">
                <span>Under (&lt;18.5)</span>
                <span>Healthy (18.5-24.9)</span>
                <span>Over (25-29.9)</span>
                <span>Obese (30+)</span>
              </div>
            </div>
          </div>

          {/* Friendly Guidance Insight */}
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-300 flex items-start gap-2.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400 shrink-0 mt-1 shadow-[0_0_6px_#38bdf8]" />
            <p className="leading-relaxed text-xs text-slate-300">{insight}</p>
          </div>

          {/* Save My BMI Baseline Action Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/30 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-white">Save your BMI baseline</p>
              <p className="text-[11px] text-slate-400">Because BMI changes gradually over months, saving keeps your profile calibrated.</p>
            </div>
            <button
              type="button"
              onClick={handleSaveBmi}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all button-press flex items-center gap-1.5 shrink-0 ${
                isCurrentSaved || justSaved
                  ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-300"
                  : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-md shadow-emerald-500/20"
              }`}
            >
              <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <span>{isCurrentSaved || justSaved ? "Saved to Baseline" : "Save My Baseline"}</span>
            </button>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => goToStep(1, "backward")}
              className="flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/[0.05] text-slate-300 text-xs font-bold transition-colors button-press text-center"
            >
              Recalculate
            </button>
            {(isCurrentSaved || justSaved) && (
              <button
                type="button"
                onClick={() => setMode("saved")}
                className="py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs font-bold transition-colors button-press"
              >
                View Saved Baseline →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Barbell / Dumbbell Plate Calculator & Input Module
   ═══════════════════════════════════════════════════════════════ */
function WeightAndPlateCalculator({
  category,
  defaultBarWeightLbs,
  unit,
  onSetUnit,
  onLogSet,
}: {
  category: EquipmentCategory;
  defaultBarWeightLbs: number;
  unit: "lbs" | "kg";
  onSetUnit: (u: "lbs" | "kg") => void;
  onLogSet: (weight: number, reps: number) => void;
}) {
  const [barWeight, setBarWeight] = useState(defaultBarWeightLbs || (unit === "kg" ? 20 : 45));
  const [targetWeight, setTargetWeight] = useState(unit === "kg" ? 60 : 135);
  const [repsInput, setRepsInput] = useState(10);

  useEffect(() => {
    if (unit === "kg") {
      setBarWeight((bw) => (bw === 45 ? 20 : bw === 35 ? 15 : bw === 25 ? 10 : 20));
      setTargetWeight((tw) => (tw > 100 ? Math.round(tw * 0.453592 * 2) / 2 : tw));
    } else {
      setBarWeight((bw) => (bw === 20 ? 45 : bw === 15 ? 35 : bw === 10 ? 25 : 45));
      setTargetWeight((tw) => (tw < 100 ? Math.round(tw * 2.20462 * 2) / 2 : tw));
    }
  }, [unit]);

  const isBarbell = category === "Barbell";
  const isDumbbell = category === "Dumbbell";

  const plateBreakdown = useMemo(() => {
    if (!isBarbell) return [];
    const availablePlates = unit === "lbs" ? [45, 35, 25, 10, 5, 2.5] : [25, 20, 15, 10, 5, 2.5, 1.25];
    let remainingPerSide = Math.max(0, (targetWeight - barWeight) / 2);
    const result: { plate: number; count: number }[] = [];

    for (const plate of availablePlates) {
      if (remainingPerSide >= plate) {
        const count = Math.floor(remainingPerSide / plate);
        result.push({ plate, count });
        remainingPerSide -= count * plate;
      }
    }
    return result;
  }, [isBarbell, targetWeight, barWeight, unit]);

  return (
    <div className="liquid-glass rounded-2xl p-4.5 border-white/10 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="liquid-pill flex h-6 w-6 items-center justify-center rounded-lg text-sky-300">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.97ZM5.25 4.97c-.122.499.106 1.028.589 1.202.628.226 1.305.352 2.031.352.726 0 1.403-.126 2.031-.352.483-.174.711-.703.59-1.202L7.87 4.97M5.25 4.97c-1.01.143-2.01.317-3 .52m3-.52L2.63 15.696c-.122.499.106 1.028.589 1.202.628.226 1.305.352 2.031.352.726 0 1.403-.126 2.031-.352.483-.174.711-.703.59-1.202L5.25 4.97Z" />
            </svg>
          </span>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-white">
            {isBarbell ? "Barbell & Plate Setup" : isDumbbell ? "Dumbbell Weight Setup" : "Weight / Resistance Input"}
          </h4>
        </div>

        <UnitTogglePill unit={unit} onChange={onSetUnit} size="sm" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {isDumbbell ? `Each Dumbbell (${unit.toUpperCase()})` : `Total Lift Weight (${unit.toUpperCase()})`}
          </label>
          <div className="relative mt-1">
            <input
              type="number"
              step={unit === "kg" ? "1" : "2.5"}
              value={targetWeight}
              onChange={(e) => setTargetWeight(parseFloat(e.target.value) || 0)}
              className="liquid-input w-full rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none"
            />
            <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-semibold">{unit}</span>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Target Reps</label>
          <input
            type="number"
            value={repsInput}
            onChange={(e) => setRepsInput(parseInt(e.target.value) || 0)}
            className="liquid-input mt-1 w-full rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(unit === "lbs" ? [2.5, 5, 10, 25] : [1, 2.5, 5, 10]).map((inc) => (
          <button
            key={inc}
            type="button"
            onClick={() => setTargetWeight((w) => w + inc)}
            className="liquid-glass text-[10px] font-bold px-2 py-1 rounded-lg text-slate-300 hover:text-white hover:border-sky-400/40 transition-all"
          >
            +{inc} {unit}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setTargetWeight((w) => Math.max(0, w - (unit === "lbs" ? 5 : 2.5)))}
          className="liquid-glass text-[10px] font-bold px-2 py-1 rounded-lg text-slate-400 hover:text-red-300 transition-all"
        >
          -{unit === "lbs" ? 5 : 2.5} {unit}
        </button>
      </div>

      {isBarbell && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Barbell: <strong className="text-white">{barWeight} {unit}</strong></span>
            <div className="flex gap-1.5 text-[9px] font-bold">
              {(unit === "lbs" ? [45, 35, 25] : [20, 15, 10]).map((bw) => (
                <button
                  key={bw}
                  type="button"
                  onClick={() => setBarWeight(bw)}
                  className={`px-1.5 py-0.5 rounded ${barWeight === bw ? "bg-sky-600 text-white" : "text-slate-500 hover:text-white"}`}
                >
                  {bw} {unit} bar
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">Each side:</span>
            {plateBreakdown.length === 0 ? (
              <span className="text-xs text-slate-500 italic">Empty bar (no plates needed)</span>
            ) : (
              <div className="flex flex-wrap gap-1.5 items-center">
                {plateBreakdown.map((p, i) => (
                  <span
                    key={i}
                    className="liquid-pill px-2 py-0.5 text-xs font-mono font-bold text-cyan-300 border-sky-500/30"
                  >
                    {p.count} × {p.plate} {unit}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => onLogSet(targetWeight, repsInput)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 py-2.5 text-xs font-bold text-white shadow-lg transition-all hover:from-sky-400 hover:to-cyan-400 active:scale-[0.98]"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Log Completed Set
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Exercise Detail Modal (Ocean Serenity)
   ═══════════════════════════════════════════════════════════════ */
function ExerciseDetailModal({
  exercise,
  unit,
  onSetUnit,
  history,
  onAddHistorySet,
  onClose,
}: {
  exercise: ExerciseLibraryItem;
  unit: "lbs" | "kg";
  onSetUnit: (u: "lbs" | "kg") => void;
  history: ExerciseHistoryItem[];
  onAddHistorySet: (exId: string, weight: number, reps: number, unit: "lbs" | "kg") => void;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"guide" | "history" | "setup">("guide");

  function handleLogSet(weight: number, reps: number) {
    onAddHistorySet(exercise.id, weight, reps, unit);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4" style={{ animation: "fadeIn 0.25s ease-out" }}>
      <div className="absolute inset-0 bg-[#020713]/85 backdrop-blur-md" onClick={onClose} />
      <div
        className="liquid-glass relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5"
        style={{ animation: "scaleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="liquid-pill rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-300 border-sky-500/30">
                {exercise.bodyPart}
              </span>
              <span className="liquid-pill rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-300 border-cyan-500/30">
                {exercise.category}
              </span>
              <span className="liquid-pill rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-teal-300 border-teal-500/30">
                {exercise.difficulty}
              </span>
            </div>
            <h2 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">{exercise.name}</h2>
          </div>

          <div className="flex items-center gap-3">
            <UnitTogglePill unit={unit} onChange={onSetUnit} size="md" />

            <button
              type="button"
              onClick={onClose}
              className="liquid-pill h-8 w-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-white"
              title="Close modal"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="liquid-pill rounded-xl p-1 flex gap-1 border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab("guide")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "guide" ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Video & Guide
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("setup")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "setup" ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            Weight & Plates
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === "history" ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            History ({history.length})
          </button>
        </div>

        {activeTab === "guide" && (
          <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black/60 shadow-xl">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${exercise.videoEmbedId}?rel=0&modestbranding=1`}
                title={`${exercise.name} Demonstration Video`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>

            <div className="liquid-glass rounded-2xl p-4 border-white/10 space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Anatomy</h4>
              <div className="space-y-1 text-xs">
                <p>
                  <strong className="text-sky-300">Primary:</strong>{" "}
                  <span className="text-slate-200">{exercise.primaryMuscle}</span>
                </p>
                <p>
                  <strong className="text-slate-400">Secondary:</strong>{" "}
                  <span className="text-slate-300">{exercise.secondaryMuscles.join(", ")}</span>
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="liquid-glass rounded-2xl p-4 border-white/10 space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">1. Setup</h4>
                <p className="text-xs text-slate-200 leading-relaxed">{exercise.instructions.setup}</p>
              </div>

              <div className="liquid-glass rounded-2xl p-4 border-white/10 space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-teal-300">2. Execution</h4>
                <ol className="space-y-1.5 text-xs text-slate-200">
                  {exercise.instructions.execution.map((step, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="liquid-pill flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-cyan-300">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="liquid-glass rounded-2xl p-3.5 border-white/10 space-y-1.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-sky-300">Pro Tips</h4>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    {exercise.instructions.tips.map((t, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-sky-400">•</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="liquid-glass rounded-2xl p-3.5 border-red-500/20 bg-red-950/10 space-y-1.5">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-red-300">Avoid</h4>
                  <ul className="space-y-1 text-[11px] text-red-200/80">
                    {exercise.instructions.commonMistakes.map((m, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-red-400">✕</span>
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "setup" && (
          <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
            <WeightAndPlateCalculator
              category={exercise.category}
              defaultBarWeightLbs={exercise.defaultBarWeightLbs}
              unit={unit}
              onSetUnit={onSetUnit}
              onLogSet={handleLogSet}
            />
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-3 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Past Recorded Sessions</h4>
              <button
                type="button"
                onClick={() => setActiveTab("setup")}
                className="text-xs font-bold text-sky-400 hover:underline"
              >
                + Log New Set
              </button>
            </div>

            {history.length === 0 ? (
              <div className="liquid-glass flex flex-col items-center justify-center rounded-2xl p-8 text-center">
                <svg className="h-8 w-8 text-slate-500 mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <p className="text-sm font-bold text-white">No session history yet</p>
                <p className="text-xs text-slate-400 mt-0.5">Use the Weight & Plates tab to record your first set.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {history.map((item) => (
                  <div key={item.id} className="liquid-glass rounded-2xl p-4 border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-cyan-300">{item.date}</span>
                      <span className="liquid-pill px-2 py-0.5 text-[10px] font-semibold text-slate-400 rounded-md">
                        {item.sets.length} sets completed
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {item.sets.map((s, idx) => (
                        <div key={idx} className="rounded-xl border border-white/5 bg-white/[0.02] p-2 text-center">
                          <span className="text-[9px] uppercase font-bold text-slate-500 block">Set {s.setNum}</span>
                          <span className="text-xs font-extrabold text-white">
                            {s.weight} {item.unit} × {s.reps}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Comprehensive A to Z Exercise Library Tab Component
   ═══════════════════════════════════════════════════════════════ */
function ExerciseLibraryTab({
  onSelectExercise,
  unit,
  onSetUnit,
  onBack,
}: {
  onSelectExercise: (ex: ExerciseLibraryItem) => void;
  unit: "lbs" | "kg";
  onSetUnit: (u: "lbs" | "kg") => void;
  onBack: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLetter, setSelectedLetter] = useState<string>("All");
  const [selectedBodyPart, setSelectedBodyPart] = useState<string>("All");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const bodyParts = ["All", "Chest", "Back", "Legs", "Shoulders", "Arms", "Core"];
  const categories = ["All", "Barbell", "Dumbbell", "Bodyweight", "Cable", "Machine"];

  // Unique starting letters present in the library
  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    EXERCISE_LIBRARY.forEach((ex) => {
      const first = ex.name[0].toUpperCase();
      if (first >= "A" && first <= "Z") letters.add(first);
    });
    return ["All", ...Array.from(letters).sort()];
  }, []);

  const filteredExercises = useMemo(() => {
    return EXERCISE_LIBRARY.filter((ex) => {
      const matchSearch =
        ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.primaryMuscle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.secondaryMuscles.some((m) => m.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchLetter =
        selectedLetter === "All" || ex.name.toUpperCase().startsWith(selectedLetter);

      const matchBodyPart = selectedBodyPart === "All" || ex.bodyPart === selectedBodyPart;
      const matchCategory = selectedCategory === "All" || ex.category === selectedCategory;

      return matchSearch && matchLetter && matchBodyPart && matchCategory;
    });
  }, [searchQuery, selectedLetter, selectedBodyPart, selectedCategory]);

  return (
    <div className="space-y-6 animate-[fadeInUp_0.3s_ease-out_both]">
      {/* Top Header Strip with Back Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="liquid-pill flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:border-sky-400/40 transition-all group shrink-0"
            title="Return to Dashboard"
          >
            <svg className="h-4 w-4 text-sky-400 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            <span>Back to Dashboard</span>
          </button>
          <div>
            <h2 className="text-lg font-extrabold text-white">Exercise Directory</h2>
            <p className="text-[11px] text-slate-400">Comprehensive guides & plate calculators (A to Z)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Unit:</span>
          <UnitTogglePill unit={unit} onChange={onSetUnit} size="sm" />
        </div>
      </div>

      {/* Search & Filter Header Bar */}
      <div className="liquid-glass rounded-3xl p-5 sm:p-6 border-white/10 space-y-4.5">
        <div className="relative flex-1 w-full">
          <svg className="absolute left-3.5 top-3.5 h-4 w-4 text-sky-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exercises by name or muscle (e.g. Bench, Squat, Deltoids, Lats)…"
            className="liquid-input w-full rounded-2xl pl-10 pr-4 py-3 text-sm text-foreground focus:outline-none placeholder:text-slate-500"
          />
        </div>

        {/* Alphabet A-Z Quick Jump Filter */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Alphabetical Index (A–Z)</span>
            <span className="text-[10px] font-semibold text-sky-300">
              Showing {filteredExercises.length} of {EXERCISE_LIBRARY.length}
            </span>
          </div>
          <div className="flex overflow-x-auto gap-1 no-scrollbar pb-1 -mx-1 px-1 sm:flex-wrap">
            {availableLetters.map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => setSelectedLetter(letter)}
                className={`min-w-[28px] h-7 px-1.5 text-xs font-bold rounded-lg button-press transition-all shrink-0 ${
                  selectedLetter === letter
                    ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md shadow-sky-500/25"
                    : "liquid-glass text-slate-400 hover:text-white"
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>

        {/* Body Part & Equipment Categories */}
        <div className="space-y-2.5 pt-2 border-t border-white/[0.06]">
          {/* Target Body Parts */}
          <div className="flex overflow-x-auto gap-1.5 no-scrollbar pb-0.5 -mx-1 px-1 sm:flex-wrap">
            {bodyParts.map((bp) => (
              <button
                key={bp}
                type="button"
                onClick={() => setSelectedBodyPart(bp)}
                className={`px-3 py-1 text-xs font-bold rounded-xl button-press transition-all shrink-0 ${
                  selectedBodyPart === bp
                    ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md shadow-sky-500/20"
                    : "liquid-glass text-slate-400 hover:text-white"
                }`}
              >
                {bp}
              </button>
            ))}
          </div>

          {/* Equipment Types */}
          <div className="flex overflow-x-auto gap-1.5 no-scrollbar pb-0.5 -mx-1 px-1 sm:flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-xl button-press transition-all shrink-0 ${
                  selectedCategory === cat
                    ? "bg-cyan-600 text-white shadow-md shadow-cyan-500/20"
                    : "liquid-glass text-slate-400 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Exercises Grid (Alphabetical) */}
      {filteredExercises.length === 0 ? (
        <div className="liquid-glass flex flex-col items-center justify-center rounded-3xl p-12 text-center">
          <svg className="h-10 w-10 text-slate-500 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <h3 className="text-base font-bold text-white">No matching exercises found</h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            Try adjusting your search keywords, body part filter, or letter selection.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedLetter("All");
              setSelectedBodyPart("All");
              setSelectedCategory("All");
            }}
            className="mt-4 liquid-glass px-4 py-2 text-xs font-bold text-sky-300 hover:text-white rounded-xl button-press"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredExercises.map((ex) => (
            <div
              key={ex.id}
              onClick={() => onSelectExercise(ex)}
              className="liquid-glass card-hover-lift shimmer-hover cursor-pointer rounded-3xl p-5 border border-white/10 hover:border-sky-400/40 transition-all space-y-3 group button-press"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="liquid-pill rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-300 border-sky-500/30">
                    {ex.bodyPart}
                  </span>
                  <span className="liquid-pill rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-300 border-cyan-500/30">
                    {ex.category}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 group-hover:text-sky-300 transition-colors flex items-center gap-1">
                  <span>View Guide</span>
                  <span className="group-hover-arrow">→</span>
                </span>
              </div>

              <div>
                <h3 className="text-base font-extrabold text-white group-hover:text-sky-300 transition-colors">
                  {ex.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                  Target: {ex.primaryMuscle}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[11px] text-slate-400">
                <span>{ex.difficulty}</span>
                <span className="text-sky-300 font-semibold">Video + Setup ({unit.toUpperCase()})</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDashboardDate(dateStr?: string): string {
  if (!dateStr) return "Recent";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return `Today, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

/* ═══════════════════════════════════════════════════════════════
   Elegant Minimalist Studio Components (Zero Emojis, Pure SVG Vector & Typography)
   ═══════════════════════════════════════════════════════════════ */

function getMuscleDistribution(workouts: SupabaseWorkout[]) {
  const groups: Record<string, number> = {
    Chest: 0,
    Back: 0,
    Legs: 0,
    Shoulders: 0,
    Arms: 0,
    Core: 0,
  };

  workouts.forEach((w) => {
    (w.exercises || []).forEach((e) => {
      const name = (e.name || "").toLowerCase();
      const count = e.trackedSets?.length || 3;
      if (name.includes("bench") || name.includes("chest") || (name.includes("press") && !name.includes("shoulder") && !name.includes("overhead"))) {
        groups.Chest += count;
      } else if (name.includes("pull") || name.includes("row") || name.includes("deadlift") || name.includes("lat")) {
        groups.Back += count;
      } else if (name.includes("squat") || name.includes("leg") || name.includes("calf") || name.includes("quad") || name.includes("hamstring")) {
        groups.Legs += count;
      } else if (name.includes("shoulder") || name.includes("overhead") || name.includes("lateral") || name.includes("military")) {
        groups.Shoulders += count;
      } else if (name.includes("curl") || name.includes("tricep") || name.includes("bicep") || name.includes("dip")) {
        groups.Arms += count;
      } else {
        groups.Core += count;
      }
    });
  });

  const total = Object.values(groups).reduce((a, b) => a + b, 0);
  if (total === 0) {
    return [
      { name: "Chest", dotColor: "bg-rose-500", color: "from-rose-500 to-orange-500", hexColor: "#f43f5e", percent: 28, sets: 0, target: "8 sets" },
      { name: "Back", dotColor: "bg-cyan-400", color: "from-cyan-400 to-sky-600", hexColor: "#06b6d4", percent: 24, sets: 0, target: "8 sets" },
      { name: "Legs", dotColor: "bg-purple-400", color: "from-purple-500 to-fuchsia-500", hexColor: "#a855f7", percent: 20, sets: 0, target: "6 sets" },
      { name: "Shoulders", dotColor: "bg-amber-400", color: "from-amber-400 to-orange-500", hexColor: "#f59e0b", percent: 14, sets: 0, target: "5 sets" },
      { name: "Arms", dotColor: "bg-teal-400", color: "from-teal-400 to-emerald-500", hexColor: "#10b981", percent: 10, sets: 0, target: "4 sets" },
      { name: "Core", dotColor: "bg-emerald-400", color: "from-emerald-400 to-teal-500", hexColor: "#22c55e", percent: 4, sets: 0, target: "2 sets" },
    ];
  }

  const items = [
    { name: "Chest", dotColor: "bg-rose-500", color: "from-rose-500 to-orange-500", hexColor: "#f43f5e", sets: groups.Chest },
    { name: "Back", dotColor: "bg-cyan-400", color: "from-cyan-400 to-sky-600", hexColor: "#06b6d4", sets: groups.Back },
    { name: "Legs", dotColor: "bg-purple-400", color: "from-purple-500 to-fuchsia-500", hexColor: "#a855f7", sets: groups.Legs },
    { name: "Shoulders", dotColor: "bg-amber-400", color: "from-amber-400 to-orange-500", hexColor: "#f59e0b", sets: groups.Shoulders },
    { name: "Arms", dotColor: "bg-teal-400", color: "from-teal-400 to-emerald-500", hexColor: "#10b981", sets: groups.Arms },
    { name: "Core", dotColor: "bg-emerald-400", color: "from-emerald-400 to-teal-500", hexColor: "#22c55e", sets: groups.Core },
  ];

  return items.map((m) => ({
    ...m,
    percent: Math.min(100, Math.round((m.sets / Math.max(1, total)) * 100)),
    target: `${m.sets} sets`,
  }));
}

/* ── Athlete Weekly Performance & Volume Analytics Hub ── */
interface AthletePerformanceAnalyticsHubProps {
  stats: GamificationStats;
  userName?: string | null;
  onNavigateProfile?: () => void;
  onQuickStart: () => void;
  onOpenLogToday?: () => void;
  workouts: SupabaseWorkout[];
  weeklySchedule: ScheduleDayItem[];
}

function AthletePerformanceAnalyticsHub({
  stats,
  userName,
  onNavigateProfile,
  onQuickStart,
  onOpenLogToday,
  workouts,
  weeklySchedule,
}: AthletePerformanceAnalyticsHubProps) {
  const level = levelFromXP(stats.totalXP);
  const title = titleForLevel(level);
  const { progress, xpInLevel, nextLevelXP, currentLevelXP } = xpProgressInLevel(stats.totalXP);
  const streakStatus = getCurrentStreakStatus(stats);
  const unlockedCount = stats.unlockedAchievements.length;
  const totalCount = ACHIEVEMENTS.length;

  const now = new Date();
  const currentMonday = new Date(now);
  const todayDay = now.getDay();
  const diffToMonday = (todayDay === 0 ? -6 : 1) - todayDay;
  currentMonday.setDate(now.getDate() + diffToMonday);
  currentMonday.setHours(0, 0, 0, 0);

  const nextSunday = new Date(currentMonday);
  nextSunday.setDate(currentMonday.getDate() + 7);

  // Filter workouts belonging to this active week
  const thisWeekWorkouts = workouts.filter((w) => {
    if (!w.created_at) return false;
    const d = new Date(w.created_at);
    return d >= currentMonday && d < nextSunday;
  });

  const workoutsThisWeekCount = thisWeekWorkouts.length;
  const weeklyTargetSessions = 4;
  const adherencePercent = Math.min(100, Math.round((workoutsThisWeekCount / weeklyTargetSessions) * 100));

  const weeklyMinutes = thisWeekWorkouts.reduce((acc, w) => acc + Math.round((w.duration_seconds || 0) / 60), 0);
  const targetWeeklyMinutes = 180; // 3 hours weekly target

  const totalSetsThisWeek = thisWeekWorkouts.reduce((acc, w) => acc + (w.completed_sets || 0), 0);
  const estimatedCalories = thisWeekWorkouts.reduce((acc, w) => acc + (w.calories || Math.round(((w.duration_seconds || 0) / 60) * 7.5)), 0);

  // Compute daily volume data for 7-day bar chart
  const dayBars = weeklySchedule.map((s) => {
    const isToday = s.status === "today";
    const logged = s.loggedWorkout;
    const durMins = logged ? Math.max(15, Math.round((logged.duration_seconds || 0) / 60)) : 0;
    // Max height reference is 75 mins
    const heightPercent = logged ? Math.min(100, Math.max(25, Math.round((durMins / 75) * 100))) : 0;

    return {
      day: s.day,
      dateFormatted: s.dateFormatted,
      isToday,
      hasLogged: Boolean(logged),
      title: logged?.day_title || "",
      durMins,
      heightPercent,
    };
  });

  return (
    <div className="relative rounded-2xl border border-slate-800 bg-slate-900/85 p-4 sm:p-5 backdrop-blur-md h-full flex flex-col justify-between space-y-4">
      {/* 1. Header: Athlete Greeting & Level Progress */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {userName ? `Welcome back, ${userName}` : "Weekly Performance Hub"}
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-cyan-500/30 text-cyan-300 bg-cyan-500/10">
              {title}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">
            Level {level} Athlete • {stats.totalXP.toLocaleString()} XP
          </p>
        </div>

        {/* Trophy Room Badge */}
        <button
          type="button"
          onClick={onNavigateProfile}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 text-xs font-semibold transition-colors button-press shrink-0"
          title="Open Trophy Room"
        >
          <svg className="h-3.5 w-3.5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.504-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.003 0H9.497m5.003 0A6.75 6.75 0 0 0 21 7.5v-.75A2.25 2.25 0 0 0 18.75 4.5h-1.5A2.25 2.25 0 0 0 15 6.75v.75m-6 0v-.75A2.25 2.25 0 0 0 6.75 4.5h-1.5A2.25 2.25 0 0 0 3 6.75v.75a6.75 6.75 0 0 0 6.5 6.75" />
          </svg>
          <span className="font-mono tabular-nums">{unlockedCount}/{totalCount} Trophies</span>
          <span className="text-slate-400">→</span>
        </button>
      </div>

      {/* 2. Graphical Centerpiece: Weekly Training Volume & Load Chart */}
      <div className="p-3.5 rounded-xl border border-slate-800/90 bg-slate-950/40">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Weekly Training Volume
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="text-cyan-300 font-mono">{weeklyMinutes}m</span>
            <span className="text-slate-500">/ {targetWeeklyMinutes}m Goal</span>
          </div>
        </div>

        {/* 7-Day Visual Bar Chart */}
        <div className="relative pt-4 pb-1">
          {/* Target Baseline Guide Line */}
          <div className="absolute top-8 inset-x-0 border-b border-dashed border-slate-800 flex justify-end pr-1 pointer-events-none">
            <span className="text-[9px] font-mono text-slate-600 -mt-3.5">45m Pace</span>
          </div>

          <div className="grid grid-cols-7 gap-2 items-end h-28 relative z-10">
            {dayBars.map((bar, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center justify-end h-full group"
              >
                {/* Duration Badge above bar */}
                <div className="h-4 flex items-center justify-center mb-1">
                  {bar.hasLogged ? (
                    <span className="text-[9px] font-mono font-bold text-cyan-300">
                      {bar.durMins}m
                    </span>
                  ) : bar.isToday ? (
                    <span className="text-[8px] font-bold text-slate-500 uppercase">
                      Today
                    </span>
                  ) : null}
                </div>

                {/* Vertical Bar Cylinder */}
                <div className="w-full max-w-[28px] sm:max-w-[34px] h-20 bg-slate-900 rounded-lg flex flex-col justify-end p-0.5 border border-slate-800 group-hover:border-slate-700 transition-colors">
                  {bar.hasLogged ? (
                    <div
                      className="w-full rounded-md bg-gradient-to-t from-cyan-500 to-sky-400 transition-all duration-500 flex items-end justify-center"
                      style={{ height: `${bar.heightPercent}%` }}
                      title={`${bar.day}: ${bar.title} (${bar.durMins}m)`}
                    />
                  ) : (
                    <div className="w-full h-1 rounded-full bg-slate-800 my-1 mx-auto" />
                  )}
                </div>

                {/* Day Label */}
                <span
                  className={`text-[10px] font-bold uppercase mt-1.5 transition-colors ${
                    bar.isToday
                      ? "text-cyan-300"
                      : bar.hasLogged
                      ? "text-slate-200"
                      : "text-slate-500"
                  }`}
                >
                  {bar.day}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Three High-Impact KPI Performance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Card 1: Weekly Sessions Target */}
        <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Weekly Target
            </span>
            <span className="text-[9px] font-bold text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.2 rounded">
              {adherencePercent}%
            </span>
          </div>
          <div className="my-1">
            <span className="text-lg font-bold text-white font-mono">
              {workoutsThisWeekCount}
            </span>
            <span className="text-xs text-slate-400 ml-1 font-medium">
              / {weeklyTargetSessions} Sessions
            </span>
          </div>
          {/* Segmented Bar */}
          <div className="grid grid-cols-4 gap-1 mt-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-colors ${
                  i < workoutsThisWeekCount ? "bg-cyan-400" : "bg-slate-800"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Card 2: Active Duration */}
        <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Active Time
            </span>
            <span className="text-[9px] font-mono text-slate-400">
              {Math.min(100, Math.round((weeklyMinutes / targetWeeklyMinutes) * 100))}%
            </span>
          </div>
          <div className="my-1">
            <span className="text-lg font-bold text-white font-mono">
              {weeklyMinutes}
            </span>
            <span className="text-xs text-slate-400 ml-1 font-medium">
              min trained
            </span>
          </div>
          {/* Linear Progress */}
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden mt-1">
            <div
              className="h-full bg-sky-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(4, (weeklyMinutes / targetWeeklyMinutes) * 100))}%` }}
            />
          </div>
        </div>

        {/* Card 3: Output & Consistency */}
        <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Momentum
            </span>
            <span className="text-[9px] font-semibold text-emerald-400">
              {streakStatus.current > 0 ? `${streakStatus.current}d Streak` : workoutsThisWeekCount > 0 ? "Active" : "Ready"}
            </span>
          </div>
          <div className="my-1">
            <span className="text-lg font-bold text-white font-mono">
              {totalSetsThisWeek > 0 ? `${totalSetsThisWeek} Sets` : `${estimatedCalories} kcal`}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium truncate">
            {estimatedCalories > 0 ? `${estimatedCalories} kcal burned this week` : "Log activity to build streak"}
          </p>
        </div>
      </div>

      {/* 4. Bottom Action Strip */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/[0.06] flex-wrap">
        <div className="flex items-center gap-2.5 flex-1 min-w-[160px]">
          <div className="h-1.5 flex-1 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-cyan-400 transition-all duration-700"
              style={{ width: `${Math.max(4, progress * 100)}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-400 shrink-0">
            {xpInLevel}/{nextLevelXP - currentLevelXP} XP
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenLogToday && (
            <button
              type="button"
              onClick={onOpenLogToday}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold text-xs hover:bg-cyan-500/25 hover:text-white transition-colors button-press"
            >
              + Log Today
            </button>
          )}
          <button
            type="button"
            onClick={onQuickStart}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs transition-colors button-press shrink-0"
          >
            <span>Start Session</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Anatomical Human Body Heatmap & Muscle Distribution Layout ── */
function MuscleDistributionGraphic({
  workouts,
  onQuickStart,
}: {
  workouts: SupabaseWorkout[];
  onQuickStart: () => void;
}) {
  const distribution = useMemo(() => getMuscleDistribution(workouts), [workouts]);
  const [view, setView] = useState<"front" | "back">("front");
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);

  // Quick lookup map for muscle stats
  const muscleMap = useMemo(() => {
    const map: Record<string, (typeof distribution)[0]> = {};
    distribution.forEach((d) => {
      map[d.name] = d;
    });
    return map;
  }, [distribution]);

  const activeHoveredData = hoveredGroup ? muscleMap[hoveredGroup] : null;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-slate-900/95 via-[#081528]/95 to-slate-900/95 p-4 sm:p-5 shadow-2xl backdrop-blur-xl animate-fade-in-down h-full flex flex-col justify-between">
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-10 -bottom-10 h-36 w-36 rounded-full bg-purple-500/10 blur-3xl" />

      {/* Header with Front / Back Anatomy View Toggle */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <svg className="h-4 w-4 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
          </svg>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider truncate">
              Muscle Load Distribution
            </h3>
            <p className="text-[10px] text-slate-400 font-medium truncate">Anatomical Heatmap Scan</p>
          </div>
        </div>

        {/* View Toggle Pill */}
        <div className="flex items-center rounded-xl bg-white/[0.05] border border-white/10 p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setView("front")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
              view === "front"
                ? "bg-cyan-500/25 text-cyan-300 border border-cyan-400/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Front
          </button>
          <button
            type="button"
            onClick={() => setView("back")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
              view === "back"
                ? "bg-cyan-500/25 text-cyan-300 border border-cyan-400/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Back
          </button>
        </div>
      </div>

      {/* Main Dual Panel: Human Body Silhouette + Telemetry List */}
      <div className="grid grid-cols-12 gap-3 sm:gap-4 items-center my-auto py-1">
        {/* Left: Anatomical Human Body Layout */}
        <div className="col-span-5 sm:col-span-5 flex flex-col items-center justify-center relative">
          <AnatomicalHumanBody
            view={view}
            distribution={distribution}
            hoveredGroup={hoveredGroup}
            onHoverGroup={setHoveredGroup}
            onClickGroup={() => onQuickStart()}
          />
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-1">
            {view === "front" ? "Anterior View" : "Posterior View"}
          </span>
        </div>

        {/* Right: Interactive Muscle Telemetry List */}
        <div className="col-span-7 sm:col-span-7 space-y-2">
          {distribution.map((item) => {
            const isHovered = hoveredGroup === item.name;
            return (
              <div
                key={item.name}
                onMouseEnter={() => setHoveredGroup(item.name)}
                onMouseLeave={() => setHoveredGroup(null)}
                onClick={onQuickStart}
                className={`p-2 sm:p-2.5 rounded-2xl border transition-all cursor-pointer button-press ${
                  isHovered
                    ? "bg-white/[0.08] border-cyan-400/50 shadow-[0_0_14px_rgba(56,189,248,0.2)]"
                    : "bg-white/[0.025] border-white/[0.05] hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`h-2.5 w-2.5 rounded-full shrink-0 transition-transform ${isHovered ? "scale-125" : ""}`}
                      style={{ backgroundColor: item.hexColor, boxShadow: isHovered ? `0 0 8px ${item.hexColor}` : undefined }}
                    />
                    <span className={`font-bold text-xs truncate transition-colors ${isHovered ? "text-white" : "text-slate-200"}`}>
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono font-medium text-slate-400">{item.sets}s</span>
                    <span className="text-[11px] font-mono font-black text-white tabular-nums w-8 text-right">
                      {item.percent}%
                    </span>
                  </div>
                </div>

                {/* Mini Heat Progress Bar matching Picture 2 */}
                <div className="h-1.5 w-full rounded-full bg-slate-950/70 border border-white/[0.06] overflow-hidden p-[0.5px]">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${item.color} transition-all duration-700 ease-out shadow-sm`}
                    style={{ width: `${Math.max(item.percent > 0 ? 8 : 2, item.percent)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Hint & Dynamic Telemetry Readout */}
      <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-white/[0.06] text-[10px]">
        {activeHoveredData ? (
          <div className="flex items-center gap-1.5 text-cyan-300 font-semibold truncate animate-fade-in">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: activeHoveredData.hexColor }} />
            <span>{activeHoveredData.name}: {activeHoveredData.sets} sets logged ({activeHoveredData.percent}% weekly load)</span>
          </div>
        ) : (
          <span className="text-slate-400">Hover muscle to inspect telemetry</span>
        )}

        <button
          type="button"
          onClick={onQuickStart}
          className="text-cyan-400 font-semibold hover:text-white transition-colors flex items-center gap-1 shrink-0 ml-2"
        >
          <span>Target Group</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}

/* ── Reimagined Visual Microcycle Energy Wave (Weekly Progress & Activity Log) ── */
export interface ScheduleDayItem {
  day: string;
  dayFull: string;
  dayKey: number;
  dateString: string;
  dateFormatted: string;
  dayDate: Date;
  title: string;
  subtitle?: string;
  type: "workout" | "rest";
  status: "completed" | "today" | "upcoming";
  loggedWorkout?: SupabaseWorkout | null;
  exercises?: Exercise[];
}

function VisualMicrocycleTrack({
  schedule,
  onStartToday,
  onSelectDay,
  onOpenLogToday,
}: {
  schedule: ScheduleDayItem[];
  onStartToday: () => void;
  onSelectDay: (day: ScheduleDayItem) => void;
  onOpenLogToday: () => void;
}) {
  const completedDaysCount = schedule.filter((s) => s.status === "completed").length;

  return (
    <div className="relative rounded-2xl border border-slate-800 bg-slate-900/85 p-4 sm:p-5 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
            Weekly Progress & Activity Log
          </h3>
          <span className="text-[10px] sm:text-xs text-slate-400 font-medium">
            • {completedDaysCount}/7 Days Logged
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenLogToday}
            className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-[11px] sm:text-xs font-bold text-cyan-300 hover:bg-cyan-500/25 hover:text-white transition-colors flex items-center gap-1 button-press"
          >
            <span>+ Log Activity</span>
          </button>
          <button
            type="button"
            onClick={onStartToday}
            className="text-[11px] sm:text-xs font-semibold text-slate-400 hover:text-white transition-colors items-center gap-1 group button-press hidden sm:flex"
          >
            <span>Start Live Session</span>
            <span className="group-hover-arrow">→</span>
          </button>
        </div>
      </div>

      {/* 7-Day Track: Clean, Crisp Architectural Boxes */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
        {schedule.map((day, idx) => {
          const isToday = day.status === "today";
          const isDone = day.status === "completed";

          return (
            <div
              key={idx}
              onClick={() => onSelectDay(day)}
              className={`group relative flex flex-col items-center justify-between p-2 sm:p-2.5 rounded-xl border transition-colors cursor-pointer min-h-[134px] text-center button-press ${
                isToday
                  ? "border-cyan-500/70 bg-slate-800/70 hover:border-cyan-400"
                  : isDone
                  ? "border-emerald-500/40 bg-emerald-950/20 hover:border-emerald-500/60"
                  : "border-slate-800/80 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-800/30"
              }`}
            >
              {/* 1. Header: Day Monogram + Clear Date (e.g. Sept 8) */}
              <div className="w-full pb-1.5 border-b border-white/[0.06] flex flex-col items-center">
                <span
                  className={`text-[10px] sm:text-[11px] font-bold tracking-wider uppercase ${
                    isToday
                      ? "text-cyan-300"
                      : isDone
                      ? "text-emerald-400"
                      : "text-slate-300"
                  }`}
                >
                  {day.day}
                </span>
                <span className="text-[9px] sm:text-[10px] font-medium text-slate-400 mt-0.5">
                  {day.dateFormatted}
                </span>
              </div>

              {/* 2. Center Icon: Clean, crisp tactile button without glowing AI circles */}
              <div
                className={`h-8 w-8 sm:h-9 sm:w-9 rounded-lg border flex items-center justify-center my-1.5 transition-colors ${
                  isDone
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                    : isToday
                    ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300 group-hover:bg-cyan-500/25"
                    : "border-slate-800 bg-slate-800/50 text-slate-500 group-hover:border-slate-700 group-hover:text-slate-300"
                }`}
              >
                {isDone ? (
                  <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                )}
              </div>

              {/* 3. Bottom: Focus Title & Status */}
              <div className="w-full min-h-[32px] flex flex-col justify-center items-center">
                <p
                  className={`text-[10px] sm:text-[11px] font-semibold leading-tight truncate max-w-[62px] sm:max-w-[78px] ${
                    isDone
                      ? "text-emerald-300"
                      : isToday
                      ? "text-slate-200"
                      : "text-slate-400"
                  }`}
                  title={day.title}
                >
                  {day.title}
                </p>

                {isDone ? (
                  <span className="text-[8px] sm:text-[9px] font-medium text-emerald-400/90 mt-0.5 truncate max-w-full">
                    {day.subtitle || "Done"}
                  </span>
                ) : isToday ? (
                  <span className="inline-flex items-center justify-center mt-1 px-1.5 py-0.5 rounded text-[7px] sm:text-[8px] font-semibold uppercase tracking-wider border border-cyan-500/30 text-cyan-300 bg-cyan-500/10">
                    Today
                  </span>
                ) : (
                  <span className="text-[8px] sm:text-[9px] font-medium text-slate-500 mt-0.5 truncate max-w-full">
                    {day.subtitle}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Vibrant Minimalist Routine Card ── */
function GraphicalRoutineCard({
  template,
  index,
  onStart,
}: {
  template: WorkoutTemplate;
  index: number;
  onStart: () => void;
}) {
  const getTheme = () => {
    const cat = (template.category || "").toLowerCase();
    if (cat.includes("chest") || cat.includes("push") || index % 4 === 0) {
      return {
        meshClass: "card-mesh-push",
        accentColor: "#f43f5e",
        badgeBg: "bg-rose-500/10 text-rose-300 border-rose-400/25",
        dotColor: "bg-rose-400",
      };
    }
    if (cat.includes("back") || cat.includes("pull") || index % 4 === 1) {
      return {
        meshClass: "card-mesh-pull",
        accentColor: "#06b6d4",
        badgeBg: "bg-cyan-500/10 text-cyan-300 border-cyan-400/25",
        dotColor: "bg-cyan-400",
      };
    }
    if (cat.includes("leg") || cat.includes("lower") || index % 4 === 2) {
      return {
        meshClass: "card-mesh-legs",
        accentColor: "#a855f7",
        badgeBg: "bg-purple-500/10 text-purple-300 border-purple-400/25",
        dotColor: "bg-purple-400",
      };
    }
    return {
      meshClass: "card-mesh-upper",
      accentColor: "#10b981",
      badgeBg: "bg-emerald-500/10 text-emerald-300 border-emerald-400/25",
      dotColor: "bg-emerald-400",
    };
  };

  const theme = getTheme();

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-white/[0.08] p-4 sm:p-5 transition-all duration-300 flex flex-col justify-between group ${theme.meshClass}`}>
      <div>
        {/* Top bar: Category Badge */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${theme.badgeBg}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${theme.dotColor}`} />
            <span>{template.category}</span>
          </span>
        </div>

        {/* Title & Preview */}
        <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-300 transition-colors tracking-tight">
          {template.name}
        </h4>

        {/* Exercise Preview Pill Tags */}
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {template.exercises.slice(0, 3).map((e, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[9px] sm:text-[10px] font-medium text-slate-300 truncate max-w-[140px]"
            >
              {e.name}
            </span>
          ))}
          {template.exercises.length > 3 && (
            <span className="px-1.5 py-0.5 rounded-lg bg-white/[0.03] text-[9px] font-medium text-slate-400">
              +{template.exercises.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Elegant Action CTA */}
      <button
        type="button"
        onClick={onStart}
        className="mt-4 w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] hover:border-white/25 text-white font-semibold text-xs transition-all button-press flex items-center justify-center gap-1.5 group/btn"
      >
        <span>Launch Workout</span>
        <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
      </button>
    </div>
  );
}

/* ── Visual Minimalist Quest Crest ── */
function VisualQuestCrest({
  challengeInfo,
}: {
  challengeInfo: NonNullable<ReturnType<typeof getActiveChallenge>>;
}) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(1, Math.max(0.04, challengeInfo.progress)));

  return (
    <div className={`relative overflow-hidden rounded-3xl border p-4 transition-all shadow-xl ${
      challengeInfo.completed
        ? "border-emerald-400/30 bg-gradient-to-br from-emerald-950/25 to-slate-900/90"
        : "border-amber-400/25 bg-gradient-to-br from-amber-950/15 via-[#071328] to-slate-900/90"
    }`}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3 min-w-0">
          {/* Radial SVG Circular Quest Progress Ring */}
          <div className="relative shrink-0 flex items-center justify-center">
            <svg className="w-11 h-11 -rotate-90 transform" viewBox="0 0 52 52">
              <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255, 255, 255, 0.06)" strokeWidth="3.5" />
              <circle
                cx="26"
                cy="26"
                r={r}
                fill="none"
                stroke={challengeInfo.completed ? "#10b981" : "#f59e0b"}
                strokeWidth="3.5"
                strokeDasharray={c}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-700"
                style={{ filter: `drop-shadow(0 0 4px ${challengeInfo.completed ? "#10b981" : "#f59e0b"})` }}
              />
            </svg>
            <span className="absolute">
              <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
              </svg>
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase font-bold tracking-wider text-amber-400">Weekly Quest</span>
              {challengeInfo.completed && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[8px] font-bold">
                  COMPLETED
                </span>
              )}
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-white truncate" suppressHydrationWarning>{challengeInfo.challenge.title}</h4>
          </div>
        </div>

        {/* Minimalist XP Tag */}
        <div className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-400/25 text-amber-300 text-[11px] font-mono font-bold tracking-tight shrink-0">
          +{XP_REWARDS.CHALLENGE_COMPLETED} XP
        </div>
      </div>

      <p className="text-[10px] text-slate-300 leading-snug mb-2.5" suppressHydrationWarning>
        {challengeInfo.challenge.description}
      </p>

      {/* Progress track */}
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              challengeInfo.completed ? "bg-emerald-400" : "bg-gradient-to-r from-amber-400 to-orange-400"
            }`}
            style={{ width: `${Math.max(4, challengeInfo.progress * 100)}%` }}
          />
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
          {Math.round(challengeInfo.progress * 100)}%
        </span>
      </div>
    </div>
  );
}

/* ── Recent Activity Quick Repeat Widget ── */
function RecentActivityWidget({
  workouts,
  loading,
  onStartHistory,
  onNavigateHistory,
  onQuickStart,
}: {
  workouts: SupabaseWorkout[];
  loading: boolean;
  onStartHistory: (w: SupabaseWorkout) => void;
  onNavigateHistory: () => void;
  onQuickStart: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_#38bdf8]" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
            Recent Sessions
          </h3>
        </div>
        <button
          type="button"
          onClick={onNavigateHistory}
          className="text-[11px] font-bold text-sky-400 hover:text-white transition-colors group flex items-center gap-1"
        >
          <span>Full History ({workouts.length})</span>
          <span className="group-hover-arrow">→</span>
        </button>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="liquid-glass rounded-2xl p-4 border border-white/10 flex items-center justify-center gap-2 text-xs text-slate-400">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
            <span>Loading history...</span>
          </div>
        ) : workouts.length === 0 ? (
          <div className="liquid-glass rounded-2xl p-4 border border-white/10 text-center space-y-2">
            <p className="text-xs font-bold text-slate-300">Ready for your first session</p>
            <p className="text-[10px] text-slate-400">
              Start a workout to track volume, load, and telemetry here.
            </p>
            <button
              type="button"
              onClick={onQuickStart}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 hover:text-white border border-sky-500/30 text-[11px] font-bold transition-all button-press"
            >
              <span>Quick Workout</span>
              <span>→</span>
            </button>
          </div>
        ) : (
          workouts.slice(0, 2).map((w, idx) => {
            const durationMins = Math.max(1, Math.round((w.duration_seconds || 0) / 60));
            const exNames = (w.exercises || []).map((e) => e.name);
            return (
              <div
                key={w.id || idx}
                onClick={onNavigateHistory}
                className="liquid-glass card-hover-lift shimmer-hover cursor-pointer rounded-2xl p-3 border border-white/10 hover:border-sky-400/40 transition-all space-y-1.5 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black text-white group-hover:text-cyan-300 transition-colors">
                      {w.day_title}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {formatDashboardDate(w.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="liquid-pill px-1.5 py-0.5 rounded text-[9px] font-bold text-sky-300">
                      {durationMins}m
                    </span>
                    <span className="liquid-pill px-1.5 py-0.5 rounded text-[9px] font-bold text-teal-300">
                      {w.completed_sets} sets
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.05]">
                  <p className="text-[10px] text-slate-400 truncate max-w-[180px] sm:max-w-[220px]">
                    {exNames.length > 0 ? exNames.slice(0, 3).join(" • ") + (exNames.length > 3 ? ` +${exNames.length - 3}` : "") : "Workout session"}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartHistory(w);
                    }}
                    className="liquid-pill flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-cyan-300 hover:text-white border-cyan-500/30 hover:border-cyan-400 rounded-lg transition-all button-press shrink-0"
                    title="Repeat this workout with pre-filled weights"
                  >
                    <svg className="h-3 w-3 text-cyan-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    <span>Repeat</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ── Floating XP Toast Component ── */
function XPToastOverlay({ toasts }: { toasts: { id: string; text: string; isPR?: boolean; x?: number; y?: number }[] }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-[80]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="absolute animate-xp-float"
          style={{
            left: t.x ? `${t.x}px` : "50%",
            top: t.y ? `${t.y}px` : "40%",
            transform: "translateX(-50%)",
          }}
        >
          <div className={`px-3 py-1.5 rounded-xl font-black text-sm shadow-xl backdrop-blur-md ${
            t.isPR
              ? "bg-amber-500/30 border border-amber-400/60 text-amber-200 shadow-amber-500/20"
              : "bg-cyan-500/25 border border-cyan-400/50 text-cyan-200 shadow-cyan-500/20"
          }`}>
            {t.text}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Confetti Overlay ── */
function ConfettiOverlay({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<ReturnType<typeof generateConfettiParticles>>([]);

  useEffect(() => {
    if (active) {
      setParticles(generateConfettiParticles(50));
    }
  }, [active]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[90] overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rotation}deg) scale(${p.scale})`,
          }}
        >
          <div
            style={{
              width: "10px",
              height: "10px",
              backgroundColor: p.color,
              borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            }}
          />
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Minimalist Executive Fitness Dashboard
   ═══════════════════════════════════════════════════════════════ */
function DashboardTab({
  onNavigateTab,
  onQuickStart,
  onStartTemplate,
  onStartHistoryWorkout,
  onSelectExercise,
  metrics,
  exerciseHistory,
  userTemplates,
  unit = "lbs",
  gamificationStats,
  onNavigateProfile,
  aiPlan,
  onStartPlanDay,
  isMainPlanActive,
}: {
  onNavigateTab: (t: HomeTab) => void;
  onQuickStart: () => void;
  onStartTemplate: (t: WorkoutTemplate) => void;
  onStartHistoryWorkout: (w: SupabaseWorkout) => void;
  onSelectExercise: (ex: ExerciseLibraryItem) => void;
  metrics: MetricEntry[];
  exerciseHistory: Record<string, ExerciseHistoryItem[]>;
  userTemplates: WorkoutTemplate[];
  unit?: "lbs" | "kg";
  gamificationStats: GamificationStats;
  onNavigateProfile?: () => void;
  aiPlan?: WorkoutDay[] | null;
  onStartPlanDay?: (day: WorkoutDay) => void;
  isMainPlanActive?: boolean;
}) {
  const { isLoaded: userLoaded, isSignedIn, user } = useUser();
  const [workouts, setWorkouts] = useState<SupabaseWorkout[]>([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(true);

  useEffect(() => {
    async function loadWorkouts() {
      setLoadingWorkouts(true);
      const uid = isSignedIn && user?.id ? user.id : "";
      const { data } = await getUserWorkoutsFromSupabase(uid);
      setWorkouts(data || []);
      setLoadingWorkouts(false);
    }
    if (userLoaded !== false) {
      loadWorkouts();
    }
  }, [userLoaded, isSignedIn, user?.id]);

  const latestMetric = metrics.length > 0 ? metrics[metrics.length - 1] : null;
  const initialMetric = metrics.length > 0 ? metrics[0] : null;
  const displayWeight = latestMetric
    ? unit === "kg"
      ? Math.round((latestMetric.weight / 2.20462262) * 10) / 10
      : Math.round(latestMetric.weight * 10) / 10
    : null;

  const displayDelta =
    latestMetric && initialMetric
      ? unit === "kg"
        ? Math.round(((latestMetric.weight - initialMetric.weight) / 2.20462262) * 10) / 10
        : Math.round((latestMetric.weight - initialMetric.weight) * 10) / 10
      : 0;

  const totalWorkoutMinutes = Math.round(
    workouts.reduce((acc, w) => acc + (w.duration_seconds || 0), 0) / 60
  );

  // Flattened session history items
  const allSessions = useMemo(() => {
    const list: { id: string; exName: string; date: string; setsCount: number; maxWeight: number; unit: string }[] = [];
    Object.entries(exerciseHistory).forEach(([exId, sessions]) => {
      const ex = EXERCISE_LIBRARY.find((e) => e.id === exId);
      sessions.forEach((s) => {
        const maxW = s.sets.reduce((max, cur) => Math.max(max, cur.weight), 0);
        list.push({
          id: s.id,
          exName: ex ? ex.name : "Exercise Set",
          date: s.date,
          setsCount: s.sets.length,
          maxWeight: maxW,
          unit: s.unit,
        });
      });
    });
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);
  }, [exerciseHistory]);

  const [selectedDayForModal, setSelectedDayForModal] = useState<ScheduleDayItem | null>(null);

  async function handleSaveDayWorkout(workoutPayload: Partial<SupabaseWorkout>) {
    const uid = isSignedIn && user?.id ? user.id : "guest";
    const fullWorkout: SupabaseWorkout = {
      user_id: uid,
      day_title: workoutPayload.day_title || "Workout Session",
      duration_seconds: workoutPayload.duration_seconds || 45 * 60,
      completed_sets: workoutPayload.completed_sets || 12,
      total_sets: workoutPayload.total_sets || workoutPayload.completed_sets || 12,
      exercises: (workoutPayload.exercises as any) || [],
      calories: workoutPayload.calories || 300,
      unit,
      created_at: workoutPayload.created_at || new Date().toISOString(),
    };

    const res = await saveWorkoutToSupabase(fullWorkout);
    const saved = res.data || fullWorkout;

    setWorkouts((prev) => [saved, ...prev.filter((w) => w.id !== saved.id)]);

    recordWorkoutCompletion({
      completedSets: fullWorkout.completed_sets,
      totalVolume: fullWorkout.completed_sets * 150,
      prsHit: 0,
      bestCombo: 0,
    });

    setSelectedDayForModal(null);
  }

  async function handleDeleteDayWorkout(workoutId: string) {
    const uid = isSignedIn && user?.id ? user.id : "guest";
    await deleteWorkoutFromSupabase(workoutId, uid);
    setWorkouts((prev) => prev.filter((w) => w.id !== workoutId));
    setSelectedDayForModal(null);
  }

  const weeklySchedule: ScheduleDayItem[] = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

    const planDay1 = aiPlan && aiPlan[0] ? aiPlan[0] : null;
    const planDay2 = aiPlan && aiPlan[1] ? aiPlan[1] : null;
    const planDay3 = aiPlan && aiPlan[2] ? aiPlan[2] : null;

    const daysConfig = [
      { dayKey: 1, day: "Mon", dayFull: "Monday", exercises: planDay1?.exercises },
      { dayKey: 2, day: "Tue", dayFull: "Tuesday" },
      { dayKey: 3, day: "Wed", dayFull: "Wednesday", exercises: planDay2?.exercises },
      { dayKey: 4, day: "Thu", dayFull: "Thursday" },
      { dayKey: 5, day: "Fri", dayFull: "Friday", exercises: planDay3?.exercises },
      { dayKey: 6, day: "Sat", dayFull: "Saturday" },
      { dayKey: 0, day: "Sun", dayFull: "Sunday" },
    ];

    const now = new Date();
    const todayDay = now.getDay(); // 0 is Sunday
    const normalizedToday = todayDay === 0 ? 7 : todayDay;

    // Get current Monday of the active week
    const currentMonday = new Date(now);
    const diffToMonday = (todayDay === 0 ? -6 : 1) - todayDay;
    currentMonday.setDate(now.getDate() + diffToMonday);
    currentMonday.setHours(0, 0, 0, 0);

    return daysConfig.map((item) => {
      const normalizedDay = item.dayKey === 0 ? 7 : item.dayKey;
      const dayDate = new Date(currentMonday);
      dayDate.setDate(currentMonday.getDate() + (normalizedDay - 1));

      const dateFormatted = `${monthNames[dayDate.getMonth()]} ${dayDate.getDate()}`;

      // Match workouts on this exact calendar date
      const matchedWorkouts = workouts.filter((w) => {
        if (!w.created_at) return false;
        const wDate = new Date(w.created_at);
        return (
          wDate.getFullYear() === dayDate.getFullYear() &&
          wDate.getMonth() === dayDate.getMonth() &&
          wDate.getDate() === dayDate.getDate()
        );
      });

      const hasLogged = matchedWorkouts.length > 0;
      const primaryLogged = hasLogged ? matchedWorkouts[0] : null;

      const isToday = normalizedDay === normalizedToday;
      const isPast = normalizedDay < normalizedToday;

      let status: "completed" | "today" | "upcoming";
      if (hasLogged) {
        status = "completed";
      } else if (isToday) {
        status = "today";
      } else {
        status = "upcoming";
      }

      let displayTitle = "—";
      let displaySubtitle = "";

      if (primaryLogged) {
        displayTitle = primaryLogged.day_title || "Workout";
        const durMins = Math.round((primaryLogged.duration_seconds || 0) / 60);
        if (primaryLogged.completed_sets && primaryLogged.completed_sets > 0) {
          displaySubtitle = `${primaryLogged.completed_sets} sets${durMins > 0 ? ` • ${durMins}m` : ""}`;
        } else {
          displaySubtitle = durMins > 0 ? `${durMins}m` : "Logged";
        }
      } else if (isToday) {
        displayTitle = "Unlogged";
        displaySubtitle = "+ Log";
      } else if (isPast) {
        displayTitle = "—";
        displaySubtitle = "No Log";
      } else {
        displayTitle = "—";
        displaySubtitle = "Upcoming";
      }

      return {
        day: item.day,
        dayFull: item.dayFull,
        dayKey: item.dayKey,
        dateString: dayDate.toISOString().split("T")[0],
        dateFormatted,
        dayDate,
        title: displayTitle,
        subtitle: displaySubtitle,
        type: (primaryLogged ? "workout" : "rest") as "workout" | "rest",
        status,
        loggedWorkout: primaryLogged,
        exercises: item.exercises,
      };
    });
  }, [workouts, aiPlan]);

  // Top 4 curated templates for quick launch
  const topTemplates = useMemo(() => {
    const list = [...userTemplates, ...EXAMPLE_TEMPLATES];
    return list.slice(0, 4);
  }, [userTemplates]);

  // Active weekly gamification quest
  const challengeInfo = useMemo(() => getActiveChallenge(gamificationStats), [gamificationStats]);

  return (
    <div className="animate-[fadeInUp_0.3s_ease-out_both] space-y-5">
      {/* ── 1. Creative Centerpiece: Athlete Performance Analytics Hub & Muscle Heatmap ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
        {/* Left: Athlete Performance Analytics Hub (7 cols) */}
        <div className="lg:col-span-7">
          <AthletePerformanceAnalyticsHub
            stats={gamificationStats}
            userName={isSignedIn && user?.firstName ? user.firstName : null}
            onNavigateProfile={onNavigateProfile}
            onQuickStart={onQuickStart}
            onOpenLogToday={() => {
              const todayItem = weeklySchedule.find((s) => s.status === "today");
              setSelectedDayForModal(todayItem || weeklySchedule[0]);
            }}
            workouts={workouts}
            weeklySchedule={weeklySchedule}
          />
        </div>

        {/* Right: Muscle Stimulation Intensity Graphic (5 cols) */}
        <div className="lg:col-span-5">
          <MuscleDistributionGraphic
            workouts={workouts}
            onQuickStart={onQuickStart}
          />
        </div>
      </div>

      {/* ── 2. Visual Weekly Progress & Activity Log ── */}
      <VisualMicrocycleTrack
        schedule={weeklySchedule}
        onStartToday={onQuickStart}
        onSelectDay={(dayItem) => setSelectedDayForModal(dayItem)}
        onOpenLogToday={() => {
          const todayItem = weeklySchedule.find((s) => s.status === "today");
          setSelectedDayForModal(todayItem || weeklySchedule[0]);
        }}
      />

      {/* Log Day Activity Modal */}
      {selectedDayForModal && (
        <LogDayActivityModal
          dayItem={selectedDayForModal}
          onSaveWorkout={handleSaveDayWorkout}
          onDeleteWorkout={handleDeleteDayWorkout}
          onStartLiveSession={(title, exercises) => {
            if (onStartPlanDay) {
              onStartPlanDay({ day: title, exercises: exercises || [] });
            } else {
              onQuickStart();
            }
          }}
          onClose={() => setSelectedDayForModal(null)}
          unit={unit}
        />
      )}

      {/* ── 3. Visual Protocols Grid & Interactive Sidekick ── */}
      <div className="grid gap-5 lg:grid-cols-12 xl:gap-6 items-start">
        {/* Left Column: Vibrant Gradient-Mesh Routine Protocols (7 cols) */}
        <div className="lg:col-span-7 space-y-3.5">
          {/* Active Main Workout Program Card (when saved) */}
          {aiPlan && isMainPlanActive && (
            <div className="p-4 rounded-3xl liquid-glass border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-cyan-500/5 to-transparent space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">
                      Active Main Workout Program
                    </h3>
                    <p className="text-[10px] text-slate-400">Scheduled 3-day weekly routine</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab("ai")}
                  className="text-[10px] font-bold text-cyan-300 hover:text-white transition-colors"
                >
                  Manage Routine →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {aiPlan.slice(0, 3).map((day, dIdx) => (
                  <button
                    key={dIdx}
                    type="button"
                    onClick={() => {
                      if (onStartPlanDay) onStartPlanDay(day);
                    }}
                    className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-emerald-400/40 hover:bg-white/[0.06] text-left transition-all button-press group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white group-hover:text-emerald-200 truncate">
                        {day.day}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold opacity-80 group-hover:opacity-100 shrink-0 ml-1">
                        Start →
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-1">
                      {day.exercises.length} exercises
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#38bdf8]" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                Quick Launch Protocols
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("templates")}
              className="text-[11px] font-bold text-sky-400 hover:text-white transition-colors flex items-center gap-1 group"
            >
              <span>All Blueprints ({topTemplates.length})</span>
              <span className="group-hover-arrow">→</span>
            </button>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            {topTemplates.map((tmpl, idx) => (
              <GraphicalRoutineCard
                key={tmpl.id}
                template={tmpl}
                index={idx}
                onStart={() => onStartTemplate(tmpl)}
              />
            ))}
          </div>
        </div>

        {/* Right Column: Visual Quest, Load Wave & Recent Sessions (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Visual RPG Quest Crest */}
          {challengeInfo && (
            <VisualQuestCrest challengeInfo={challengeInfo} />
          )}

          {/* Recent Activity Quick Repeat */}
          <RecentActivityWidget
            workouts={workouts}
            loading={loadingWorkouts}
            onStartHistory={onStartHistoryWorkout}
            onNavigateHistory={() => onNavigateTab("history")}
            onQuickStart={onQuickStart}
          />

            {/* Recent Performance Telemetry (rendered only when telemetry records exist) */}
            {allSessions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Exercise Lifts Telemetry</h3>
                  <button
                    type="button"
                    onClick={() => onNavigateTab("metrics")}
                    className="text-[11px] font-bold text-sky-400 hover:text-white transition-colors group flex items-center gap-1"
                  >
                    <span>Full Analytics</span>
                    <span className="group-hover-arrow">→</span>
                  </button>
                </div>

                <div className="liquid-glass rounded-2xl p-3 border border-white/10 space-y-1.5">
                  {allSessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/5 px-2.5 py-2 text-xs card-hover-lift transition-all hover:bg-white/[0.05]"
                    >
                      <div>
                        <p className="font-bold text-white text-[11px]">{s.exName}</p>
                        <p className="font-mono text-[9px] text-slate-400">{s.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sky-300 text-[11px]">
                          {s.maxWeight > 0 ? `${s.maxWeight} ${s.unit}` : "Bodyweight"}
                        </p>
                        <p className="text-[9px] text-slate-400">{s.setsCount} sets</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Cloud Workout History Tab (Supabase & Clerk Integration)
   ═══════════════════════════════════════════════════════════════ */
function HistoryTab({
  onQuickStart,
  onStartHistoryWorkout,
}: {
  onQuickStart: () => void;
  onStartHistoryWorkout: (w: SupabaseWorkout) => void;
}) {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300 mb-2">
            <span>Cloud Logs</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Workout <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-teal-300 bg-clip-text text-transparent">History</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Review completed sessions and repeat previous routines with pre-filled weights.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/history"
            className="liquid-pill flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all button-press"
          >
            <span>Full Page View</span>
            <svg className="h-3.5 w-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" />
            </svg>
          </Link>
          <button
            type="button"
            onClick={onQuickStart}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-cyan-500/20 hover:opacity-95 transition-opacity button-press"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>New Workout</span>
          </button>
        </div>
      </div>

      {/* Guest Mode Notice */}
      {isLoaded && !isSignedIn && (
        <div className="liquid-glass rounded-2xl p-4 sm:p-5 border border-cyan-500/30 bg-cyan-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-white">Enable Real-Time Cloud Sync</h3>
            <p className="text-xs text-slate-300">
              Sign in to sync your workout history across all devices and prevent data loss.
            </p>
          </div>
          <SignInButton mode="modal">
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold text-xs shadow-md shrink-0 button-press"
            >
              Sign In to Sync
            </button>
          </SignInButton>
        </div>
      )}

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
          <button
            type="button"
            onClick={onQuickStart}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white text-xs font-bold shadow-md button-press"
          >
            Start Workout Now
          </button>
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
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Repeat Workout Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartHistoryWorkout(w);
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
                        onClick={() => onStartHistoryWorkout(w)}
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
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ╔═══════════════════════════════════════════════════════════╗
   ║                      MAIN DASHBOARD                      ║
   ╚═══════════════════════════════════════════════════════════════╝
   ═══════════════════════════════════════════════════════════════ */
type AppPhase = "home" | "tracking" | "summary";
type HomeTab = "dashboard" | "ai" | "quick" | "templates" | "exercises" | "metrics" | "history" | "trophy";

export default function Home() {
  const router = useRouter();
  const { isLoaded: userLoaded, isSignedIn } = useUser();

  /* ── Sidebar & Navigation state ───────── */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showTipJar, setShowTipJar] = useState(false);
  const [isCoachDrawerOpen, setIsCoachDrawerOpen] = useState(false);

  /* ── Gamification state ───────────────── */
  const [gamificationStats, setGamificationStats] = useState<GamificationStats>(getDefaultStats());
  const [gamificationResult, setGamificationResult] = useState<GamificationResult | null>(null);
  const [xpToasts, setXpToasts] = useState<{ id: string; text: string; isPR?: boolean; x?: number; y?: number }[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [comboCounter, setComboCounter] = useState(0);
  const [bestComboThisWorkout, setBestComboThisWorkout] = useState(0);

  // Refresh gamification stats on mount
  useEffect(() => {
    setGamificationStats(loadGamificationStats());
  }, []);

  // XP toast helper
  const addXPToast = useCallback((text: string, isPR = false) => {
    const id = `xp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    setXpToasts((prev) => [...prev, { id, text, isPR }]);
    setTimeout(() => {
      setXpToasts((prev) => prev.filter((t) => t.id !== id));
    }, 1600);
  }, []);

  // Handle set completion XP
  const onSetCompleted = useCallback((isComboBreak = false) => {
    if (isComboBreak) {
      setComboCounter(0);
      return;
    }
    playSetCompletionSound();
    setComboCounter((prev) => {
      const next = prev + 1;
      setBestComboThisWorkout((best) => Math.max(best, next));
      if (next >= 3 && next % 3 === 0) {
        addXPToast(`${next}x Combo!`);
      }
      return next;
    });
    addXPToast(`+${XP_REWARDS.SET_COMPLETED} XP`);
  }, [addXPToast]);

  /* ── Tab & Form state ─────────────────── */
  const [tab, setTab] = useState<HomeTab>("dashboard");
  const [preferredUnit, setPreferredUnitState] = useState<"lbs" | "kg">("lbs");
  const [goal, setGoal] = useState("");
  const [experience, setExperience] = useState("");
  const [equipment, setEquipment] = useState("");
  const [splitFormat, setSplitFormat] = useState<string>("Push / Pull / Legs (PPL)");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<WorkoutDay[] | null>(null);
  const [isMainPlanActive, setIsMainPlanActive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPreferredUnitState(loadPreferredUnit());
    const savedPlan = loadAiPlan();
    if (savedPlan) {
      setPlan(savedPlan);
      setIsMainPlanActive(isMainPlanMarked());
    }
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") as HomeTab;
      const validTabs: HomeTab[] = ["dashboard", "ai", "quick", "templates", "exercises", "metrics", "history", "trophy"];
      if (tabParam && validTabs.includes(tabParam)) {
        setTab(tabParam);
      }
    } catch {}
  }, []);

  function setPreferredUnit(u: "lbs" | "kg") {
    setPreferredUnitState(u);
    savePreferredUnit(u);
  }

  /* ── Templates state ──────────────────── */
  const [userTemplates, setUserTemplates] = useState<WorkoutTemplate[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  useEffect(() => {
    setUserTemplates(loadUserTemplates());
  }, []);

  function saveTemplate(t: WorkoutTemplate) {
    const updated = [...userTemplates, t];
    setUserTemplates(updated);
    saveUserTemplates(updated);
    setShowCreateModal(false);
  }

  function deleteTemplate(id: string) {
    const updated = userTemplates.filter((t) => t.id !== id);
    setUserTemplates(updated);
    saveUserTemplates(updated);
  }

  /* ── Body Metrics state ───────────────── */
  const [metrics, setMetrics] = useState<MetricEntry[]>([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [activeMetric, setActiveMetric] = useState<ActiveMetricType>("weight");
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("days");

  useEffect(() => {
    setMetrics(loadUserMetrics());
  }, []);

  function addMetricEntry(entry: MetricEntry) {
    const updated = [...metrics, entry];
    setMetrics(updated);
    saveUserMetrics(updated);
    setShowLogModal(false);
  }

  function deleteMetricEntry(id: string) {
    const updated = metrics.filter((m) => m.id !== id);
    setMetrics(updated);
    saveUserMetrics(updated);
  }

  const latestMetric = metrics.length > 0 ? metrics[metrics.length - 1] : null;
  const initialMetric = metrics.length > 0 ? metrics[0] : null;

  /* ── Exercise Library & History state ─── */
  const [exerciseHistory, setExerciseHistory] = useState<Record<string, ExerciseHistoryItem[]>>({});
  const [selectedExercise, setSelectedExercise] = useState<ExerciseLibraryItem | null>(null);

  useEffect(() => {
    setExerciseHistory(loadExerciseHistory());
  }, []);

  function addExerciseHistorySet(exId: string, weight: number, reps: number, unit: "lbs" | "kg") {
    const todayStr = new Date().toISOString().split("T")[0];
    const currentHist = exerciseHistory[exId] || [];
    const todaySession = currentHist.find((h) => h.date === todayStr);

    let updatedHist: ExerciseHistoryItem[];
    if (todaySession) {
      const nextSetNum = todaySession.sets.length + 1;
      const updatedSession = {
        ...todaySession,
        sets: [...todaySession.sets, { setNum: nextSetNum, weight, reps }],
      };
      updatedHist = currentHist.map((h) => (h.id === todaySession.id ? updatedSession : h));
    } else {
      const newSession: ExerciseHistoryItem = {
        id: uid(),
        date: todayStr,
        unit,
        sets: [{ setNum: 1, weight, reps }],
      };
      updatedHist = [newSession, ...currentHist];
    }

    const nextState = { ...exerciseHistory, [exId]: updatedHist };
    setExerciseHistory(nextState);
    saveExerciseHistory(nextState);
  }

  /* ── Tracking state ───────────────────── */
  const [phase, setPhase] = useState<AppPhase>("home");
  const [workoutTitle, setWorkoutTitle] = useState("Custom Session");
  const [trackedExercises, setTrackedExercises] = useState<TrackedExercise[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isReady = goal !== "" && experience !== "" && equipment !== "";

  useEffect(() => {
    if (phase === "tracking") {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => setElapsedSeconds((p) => p + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  /* ── Actions ──────────────────────────── */
  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!isReady || loading) return;
    setLoading(true);
    setError(null);
    setPlan(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, experience, equipment, split: splitFormat }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation request failed");
      if (!data.plan || !Array.isArray(data.plan)) throw new Error("Unexpected response from AI");
      setPlan(data.plan);
      saveAiPlan(data.plan);
      setIsMainPlanActive(false);
      setMainPlanMarked(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate plan");
    } finally {
      setLoading(false);
    }
  }

  function handleSaveAsMainPlan() {
    if (!plan || plan.length === 0) return;
    saveAiPlan(plan);
    setMainPlanMarked(true);
    setIsMainPlanActive(true);

    // Persist each day into userTemplates as "Main Program" category so it appears in Templates & Quick Launch
    const existingTemplates = loadUserTemplates();
    const newTemplates: WorkoutTemplate[] = plan.map((day, idx) => ({
      id: `main-plan-day-${idx + 1}-${Date.now()}`,
      name: day.day,
      category: "Main Program",
      exercises: day.exercises,
    }));

    // Filter out previous "Main Program" templates to avoid duplicates
    const cleanedTemplates = existingTemplates.filter((t) => t.category !== "Main Program");
    const updated = [...newTemplates, ...cleanedTemplates];
    setUserTemplates(updated);
    saveUserTemplates(updated);

    addXPToast("Saved as Main Workout Plan!");
  }

  function handleClearMainPlan() {
    saveAiPlan(null);
    setMainPlanMarked(false);
    setIsMainPlanActive(false);
    setPlan(null);

    const existingTemplates = loadUserTemplates();
    const cleanedTemplates = existingTemplates.filter((t) => t.category !== "Main Program");
    setUserTemplates(cleanedTemplates);
    saveUserTemplates(cleanedTemplates);

    addXPToast("Main Plan Reset");
  }

  function handleExportDaysToTemplates() {
    if (!plan || plan.length === 0) return;
    const existingTemplates = loadUserTemplates();
    const newTemplates: WorkoutTemplate[] = plan.map((day, idx) => ({
      id: `custom-template-${idx + 1}-${Date.now()}`,
      name: day.day,
      category: "Custom Split",
      exercises: day.exercises,
    }));
    const updated = [...newTemplates, ...existingTemplates];
    setUserTemplates(updated);
    saveUserTemplates(updated);

    addXPToast("Exported 3 Days to Templates!");
  }

  function startFromPlanDay(day: WorkoutDay) {
    setWorkoutTitle(day.day);
    setTrackedExercises(exercisesToTracked(day.exercises));
    setPhase("tracking");
    setMobileDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startFromPlan(dayIdx: number) {
    if (!plan || !plan[dayIdx]) return;
    startFromPlanDay(plan[dayIdx]);
  }

  function startFromTemplate(template: WorkoutTemplate) {
    setWorkoutTitle(template.name);
    setTrackedExercises(exercisesToTracked(template.exercises));
    setPhase("tracking");
    setMobileDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startFromHistoryWorkout(workout: SupabaseWorkout) {
    setWorkoutTitle(workout.day_title || "Repeated Workout");
    if (workout.unit) {
      setPreferredUnit(workout.unit);
    }

    const formattedTracked: TrackedExercise[] = (workout.exercises || []).map((ex) => {
      const rawSets = ex.trackedSets || [];
      const targetSets = rawSets.length > 0 ? rawSets.length : 3;
      const firstTargetReps = rawSets[0]?.targetReps || rawSets[0]?.actualReps || "8–12";
      const restSeconds = rawSets[0]?.restSeconds || 90;

      const newTrackedSets = rawSets.map((s) => ({
        targetReps: s.targetReps || s.actualReps || "10",
        weight: s.weight || "",
        actualReps: "",
        completed: false,
        restSeconds: s.restSeconds || restSeconds,
      }));

      return {
        name: ex.name,
        targetSets,
        targetReps: firstTargetReps,
        restSeconds,
        trackedSets: newTrackedSets.length > 0 ? newTrackedSets : [
          { targetReps: "10", weight: "", actualReps: "", completed: false, restSeconds: 90 },
          { targetReps: "10", weight: "", actualReps: "", completed: false, restSeconds: 90 },
          { targetReps: "10", weight: "", actualReps: "", completed: false, restSeconds: 90 },
        ],
      };
    });

    setTrackedExercises(formattedTracked);
    setPhase("tracking");
    setMobileDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Check for repeat workout payload from /history page
  useEffect(() => {
    try {
      const raw = localStorage.getItem("forma_repeat_workout_payload");
      if (raw) {
        localStorage.removeItem("forma_repeat_workout_payload");
        const workout: SupabaseWorkout = JSON.parse(raw);
        startFromHistoryWorkout(workout);
      }
    } catch {
      // Ignore
    }
  }, []);

  function quickStart() {
    setWorkoutTitle("Quick Session");
    setTrackedExercises([]);
    setPhase("tracking");
    setMobileDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function finishWorkout() {
    if (timerRef.current) clearInterval(timerRef.current);

    // Record completed sets into exerciseHistory for telemetry and PR tracking
    const todayStr = new Date().toISOString().split("T")[0];
    const updatedHist = { ...exerciseHistory };
    let hasUpdates = false;
    let prsHit = 0;

    trackedExercises.forEach((tex) => {
      const completed = tex.trackedSets.filter((s) => s.completed && (parseFloat(s.weight) > 0 || s.actualReps));
      if (completed.length > 0) {
        const libMatch = EXERCISE_LIBRARY.find((e) => e.name.toLowerCase() === tex.name.toLowerCase());
        const exKey = libMatch ? libMatch.id : `custom-${tex.name.toLowerCase().replace(/\s+/g, "-")}`;
        const currentSets = completed.map((s, idx) => ({
          setNum: idx + 1,
          weight: parseFloat(s.weight) || 0,
          reps: parseInt(s.actualReps) || parseInt(s.targetReps) || 0,
        }));

        // Check for PRs
        const existingForEx = updatedHist[exKey] || [];
        const prevMaxWeight = existingForEx.flatMap(h => h.sets).reduce((max, s) => Math.max(max, s.weight), 0);
        const currentMaxWeight = currentSets.reduce((max, s) => Math.max(max, s.weight), 0);
        if (currentMaxWeight > prevMaxWeight && currentMaxWeight > 0) {
          prsHit += 1;
        }

        const sessionEntry: ExerciseHistoryItem = {
          id: uid(),
          date: todayStr,
          unit: preferredUnit,
          sets: currentSets,
        };

        updatedHist[exKey] = [sessionEntry, ...existingForEx.filter((s) => s.date !== todayStr)];
        hasUpdates = true;
      }
    });

    if (hasUpdates) {
      setExerciseHistory(updatedHist);
      saveExerciseHistory(updatedHist);
    }

    // ── GAMIFICATION: Record workout completion ──
    const completedSetsCount = trackedExercises.flatMap((ex) => ex.trackedSets).filter((s) => s.completed).length;
    const totalVolume = trackedExercises.flatMap((ex) => ex.trackedSets).filter((s) => s.completed).reduce((sum, s) => {
      const w = parseFloat(s.weight) || 0;
      const r = parseInt(s.actualReps) || parseInt(s.targetReps) || 0;
      return sum + w * r;
    }, 0);

    const gResult = recordWorkoutCompletion({
      completedSets: completedSetsCount,
      totalVolume,
      prsHit,
      bestCombo: bestComboThisWorkout,
    });

    setGamificationResult(gResult);
    setGamificationStats(loadGamificationStats());

    // Trigger confetti
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3500);

    // Level-up fanfare
    if (gResult.leveledUp) {
      playLevelUpFanfare();
    }

    // Reset combo
    setComboCounter(0);
    setBestComboThisWorkout(0);

    setPhase("summary");
  }

  function resetHome() {
    setPhase("home");
    setTrackedExercises([]);
    setElapsedSeconds(0);
    setGoal("");
    setExperience("");
    setEquipment("");
    setTab("dashboard");
    setMobileDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function navigateToTab(targetTab: HomeTab) {
    setTab(targetTab);
    if (phase !== "home") setPhase("home");
    setMobileDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      const url = new URL(window.location.href);
      if (targetTab === "dashboard") {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", targetTab);
      }
      window.history.pushState({}, "", url.toString());
    } catch {}
  }

  /* ═══════════════════════════════════════════════════════════════
     Sidebar / Tabs Navigation Items
     ═══════════════════════════════════════════════════════════════ */
  const NAV_ITEMS: { key: HomeTab | string; label: string; sub: string; icon: React.ReactNode; href?: string }[] = [
    {
      key: "dashboard",
      label: "Dashboard",
      sub: "Overview & Daily Stats",
      icon: (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
        </svg>
      ),
    },
    {
      key: "ai",
      label: "AI Studio",
      sub: "Smart Routine Generator",
      icon: (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
        </svg>
      ),
    },
    {
      key: "quick",
      label: "Quick Start",
      sub: "Freeform & Presets",
      icon: (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
        </svg>
      ),
    },
    {
      key: "templates",
      label: "Templates",
      sub: "Saved Blueprints",
      icon: (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
        </svg>
      ),
    },
    {
      key: "exercises",
      label: "Exercise Library",
      sub: "A to Z Catalog & Videos",
      icon: (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
        </svg>
      ),
    },
    {
      key: "metrics",
      label: "Body & Metrics",
      sub: "Weight, Fat, Calories, BMI",
      icon: (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
        </svg>
      ),
    },
    {
      key: "history",
      label: "History",
      sub: "Cloud Logged Sessions",
      icon: (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
    {
      key: "trophy",
      label: "Trophy Room",
      sub: "XP, Badges & Streaks",
      icon: (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.504-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.004 0H9.496m5.004 0a5.25 5.25 0 0 0 5.25-5.25v-1.5h-15.5v1.5a5.25 5.25 0 0 0 5.25 5.25m10.25-5.25H21a2.25 2.25 0 0 0 2.25-2.25v-.75a2.25 2.25 0 0 0-2.25-2.25h-1.5M4.5 9H3a2.25 2.25 0 0 0-2.25 2.25v.75A2.25 2.25 0 0 0 3 14.25h1.5" />
        </svg>
      ),
    },
  ];

  const currentTabInfo = NAV_ITEMS.find((n) => n.key === tab) || NAV_ITEMS[0];

  return (
    <>
      <LiquidBackground />

      <div className="flex min-h-screen">
        {/* ═══════════════════════════════════════════════════════════
            COLLAPSIBLE SIDEBAR (Desktop)
           ═══════════════════════════════════════════════════════════ */}
        <aside
          className={`hidden lg:flex flex-col border-r border-sky-400/[0.12] bg-[#040914]/90 backdrop-blur-2xl transition-all duration-300 z-40 sticky top-0 h-screen overflow-x-hidden overflow-y-auto no-scrollbar select-none ${
            sidebarCollapsed ? "w-20 p-3" : "w-64 p-5"
          }`}
        >
          {/* Logo & Toggle Header */}
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-white/[0.06]">
            <button
              type="button"
              onClick={resetHome}
              className={`flex items-center gap-2.5 text-left group overflow-hidden ${sidebarCollapsed ? "justify-center w-full" : ""}`}
              title="Return to AI Studio / Home"
            >
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden border border-sky-400/30 bg-sky-950/40 shadow-lg shadow-sky-500/20 group-hover:border-sky-400/60 transition-all p-1">
                <Image
                  src="/forma-logo.png"
                  alt="Fostura Logo"
                  width={36}
                  height={36}
                  className="h-full w-full object-contain drop-shadow-[0_2px_8px_rgba(56,189,248,0.35)]"
                  priority
                />
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <span className="text-base font-black tracking-tight text-white block leading-tight">
                    Fostura
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-sky-400/90 block">
                    Studio v2.4
                  </span>
                </div>
              )}
            </button>

            {!sidebarCollapsed && (
              <button
                type="button"
                onClick={() => setSidebarCollapsed(true)}
                className="liquid-pill h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition-all shrink-0"
                title="Collapse sidebar"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
                </svg>
              </button>
            )}
          </div>

          {/* If Collapsed, quick expand toggle icon */}
          {sidebarCollapsed && (
            <div className="py-1.5 flex justify-center">
              <button
                type="button"
                onClick={() => setSidebarCollapsed(false)}
                className="liquid-pill h-6 w-6 flex items-center justify-center rounded-lg text-sky-400 hover:text-white transition-all"
                title="Expand sidebar"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          )}

          {/* Live Date & Time Widget (Below Logo) */}
          <div className="pt-3 pb-1">
            <LiveDateTime compact={sidebarCollapsed} />
          </div>

          {/* Quick Workout Button */}
          <div className="pt-2 pb-2">
            <button
              type="button"
              onClick={quickStart}
              className={`group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-400 py-2.5 text-xs font-bold text-white shadow-lg transition-all hover:from-sky-400 hover:to-teal-300 active:scale-[0.98] button-press shimmer-hover animate-gradient-flow ${
                sidebarCollapsed ? "px-2 text-[10px]" : "px-4"
              }`}
              title="Start workout session"
            >
              <svg className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:rotate-12" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
              </svg>
              {!sidebarCollapsed && <span>Quick Workout</span>}
            </button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 space-y-1.5 py-3 overflow-y-auto overflow-x-hidden no-scrollbar">
            {!sidebarCollapsed && (
              <p className="px-2 pb-1 text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
                Navigation
              </p>
            )}

            {NAV_ITEMS.map((item) => {
              const active = tab === item.key && phase === "home";
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    if ((item as any).href) {
                      router.push((item as any).href);
                    } else {
                      navigateToTab(item.key as HomeTab);
                    }
                  }}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-all button-press ${
                    active
                      ? "bg-gradient-to-r from-sky-600 via-cyan-600 to-teal-600 text-white shadow-md shadow-sky-500/25 border border-white/20 animate-scale-in"
                      : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
                  } ${sidebarCollapsed ? "justify-center px-2" : ""}`}
                  title={item.label}
                >
                  <span className={`transition-transform duration-200 group-hover:scale-110 group-hover:translate-x-0.5 ${active ? "text-white" : "text-sky-400 group-hover:text-cyan-300"}`}>
                    {item.icon}
                  </span>
                  {!sidebarCollapsed && (
                    <div className="flex-1 min-w-0 transition-transform duration-200 group-hover:translate-x-0.5">
                      <span className="block truncate font-bold text-xs">{item.label}</span>
                      <span
                        className={`text-[10px] block truncate mt-0.5 transition-colors ${
                          active ? "text-sky-100 font-medium" : "text-slate-400 font-normal group-hover:text-slate-300"
                        }`}
                      >
                        {item.sub}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Workout Widget in Sidebar (if active) */}
          {phase === "tracking" && !sidebarCollapsed && (
            <div className="mb-3 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-3 animate-[pulse-glow_3s_ease-in-out_infinite]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
                  </span>
                  Workout In Progress
                </span>
                <span className="font-mono text-xs font-bold text-white">{formatTime(elapsedSeconds)}</span>
              </div>
              <p className="mt-1 truncate text-xs font-extrabold text-white">{workoutTitle}</p>
            </div>
          )}

          {/* Sidebar Footer */}
          <div className="pt-3 border-t border-white/[0.06] space-y-2">
            <button
              type="button"
              onClick={() => setShowTipJar(true)}
              className={`liquid-glass flex w-full items-center gap-2 rounded-xl py-2 text-xs font-semibold text-slate-300 hover:text-white transition-all ${
                sidebarCollapsed ? "justify-center px-1" : "px-3"
              }`}
              title="Support developer"
            >
              <svg className="h-4 w-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
              </svg>
              {!sidebarCollapsed && <span>Tip Jar / Support</span>}
            </button>
          </div>
        </aside>

        {/* ═══════════════════════════════════════════════════════════
            MOBILE DRAWER OVERLAY
           ═══════════════════════════════════════════════════════════ */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" style={{ animation: "fadeIn 0.2s ease-out" }}>
            <div className="absolute inset-0 bg-[#020713]/85 backdrop-blur-md" onClick={() => setMobileDrawerOpen(false)} />
            <div className="liquid-glass absolute left-0 top-0 bottom-0 w-72 p-5 flex flex-col justify-between shadow-2xl z-10 border-r border-sky-400/20">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <button type="button" onClick={resetHome} className="flex items-center gap-2.5">
                    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl overflow-hidden border border-sky-400/30 bg-sky-950/40 p-0.5 shadow-md shadow-sky-500/20">
                      <Image
                        src="/forma-logo.png"
                        alt="Fostura Logo"
                        width={30}
                        height={30}
                        className="h-full w-full object-contain drop-shadow-[0_2px_6px_rgba(56,189,248,0.35)]"
                      />
                    </div>
                    <span className="text-base font-black text-white">Fostura</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="liquid-pill h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                {/* Mobile Live Date & Time */}
                <div>
                  <LiveDateTime />
                </div>

                <div className="space-y-1.5 pt-1 overflow-y-auto overflow-x-hidden no-scrollbar">
                  <p className="px-2 pb-1 text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
                    Navigation Menu
                  </p>
                  {NAV_ITEMS.map((item) => {
                    const active = tab === item.key && phase === "home";
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setMobileDrawerOpen(false);
                          if ((item as any).href) {
                            router.push((item as any).href);
                          } else {
                            navigateToTab(item.key as HomeTab);
                          }
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-xs font-bold transition-all ${
                          active
                            ? "bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-md"
                            : "text-slate-300 hover:text-white hover:bg-white/[0.04]"
                        }`}
                      >
                        <span className={`${active ? "text-white" : "text-sky-400"}`}>{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <span className="block truncate">{item.label}</span>
                          <span
                            className={`text-[10px] block truncate mt-0.5 ${
                              active ? "text-sky-100 font-medium" : "text-slate-400 font-normal"
                            }`}
                          >
                            {item.sub}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 space-y-2.5">
                {isSignedIn ? (
                  <div className="flex items-center gap-3 p-2.5 liquid-glass rounded-xl border border-white/10">
                    <UserButton
                      appearance={{
                        elements: {
                          avatarBox: "h-8 w-8 ring-2 ring-cyan-500/40 rounded-xl",
                        },
                      }}
                    />
                    <span className="text-xs font-bold text-slate-200">Account Profile</span>
                  </div>
                ) : (
                  <SignInButton mode="modal">
                    <button
                      type="button"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold text-xs shadow-md button-press"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                      </svg>
                      <span>Sign In / Create Account</span>
                    </button>
                  </SignInButton>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    setShowTipJar(true);
                  }}
                  className="liquid-glass flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold text-white"
                >
                  <svg className="h-4 w-4 text-rose-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                  </svg>
                  Tip Jar / Donations
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            MAIN BODY / APP CONTENT WRAPPER
           ═══════════════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          {/* Top Sticky App Header */}
          <header className="sticky top-0 z-40 border-b border-sky-400/[0.12] bg-[#040914]/85 backdrop-blur-2xl">
            <div className="mx-auto flex h-16 w-full max-w-[100rem] items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-10">
              {/* Left: Sidebar Toggle & Breadcrumb Navigation */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(true)}
                  className="lg:hidden liquid-pill flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sky-400 hover:text-white"
                  title="Open Navigation Menu"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="hidden lg:flex liquid-pill h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:text-sky-300 transition-colors"
                  title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                </button>

                {/* Mobile Brand (when on Dashboard) */}
                {tab === "dashboard" && phase === "home" ? (
                  <div className="flex lg:hidden items-center gap-2">
                    <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg overflow-hidden border border-sky-400/30 bg-sky-950/40 p-0.5">
                      <Image
                        src="/forma-logo.png"
                        alt="Fostura"
                        width={24}
                        height={24}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <span className="text-sm font-black text-white tracking-tight">Fostura</span>
                  </div>
                ) : null}

                {/* Breadcrumbs / Back button */}
                <div className="flex items-center gap-2 min-w-0">
                  {tab !== "dashboard" && phase === "home" ? (
                    <button
                      type="button"
                      onClick={() => navigateToTab("dashboard")}
                      className="liquid-pill flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-sky-300 hover:text-white hover:border-sky-400/50 transition-all group shrink-0"
                      title="Return to Dashboard"
                    >
                      <svg className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                      </svg>
                      <span>Dashboard</span>
                    </button>
                  ) : null}

                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 min-w-0">
                    <span className="font-semibold text-slate-500">/</span>
                    <span className="font-bold text-white truncate">{currentTabInfo.label}</span>
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-3">
                {phase === "tracking" ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={resetHome}
                      className="liquid-pill flex items-center gap-1 px-3 py-1 text-[11px] font-bold text-slate-300 hover:text-white transition-all rounded-full button-press"
                    >
                      <svg className="h-3.5 w-3.5 text-sky-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                      </svg>
                      <span>Back</span>
                    </button>
                    <div className="liquid-pill flex items-center gap-1.5 rounded-full px-3 py-1 text-cyan-400 border-cyan-500/30">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wider">{formatTime(elapsedSeconds)}</span>
                    </div>
                  </div>
                ) : null}

                {/* Authentication Controls: Sign In button when logged out, UserButton when logged in */}
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
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                      </svg>
                      <span>Sign In</span>
                    </button>
                  </SignInButton>
                )}
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="mx-auto w-full max-w-[100rem] flex-1 px-3 sm:px-6 lg:px-8 xl:px-10 pb-28 lg:pb-16 pt-4 sm:pt-6">
            {phase === "home" && (
              <>
                {/* ─── TAB 0: DASHBOARD ─── */}
                {tab === "dashboard" && (
                  <DashboardTab
                    onNavigateTab={navigateToTab}
                    onQuickStart={quickStart}
                    onStartTemplate={startFromTemplate}
                    onStartHistoryWorkout={startFromHistoryWorkout}
                    onSelectExercise={setSelectedExercise}
                    metrics={metrics}
                    exerciseHistory={exerciseHistory}
                    userTemplates={userTemplates}
                    unit={preferredUnit}
                    gamificationStats={gamificationStats}
                    onNavigateProfile={() => navigateToTab("trophy")}
                    aiPlan={plan}
                    onStartPlanDay={startFromPlanDay}
                    isMainPlanActive={isMainPlanActive}
                  />
                )}

                {/* ─── TAB 1: AI GENERATOR ─── */}
                {tab === "ai" && (
                  <div className="space-y-6">
                    {/* Hero Intro */}
                    <div className="py-2">
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300 mb-2">
                        <span>Intelligent Performance</span>
                      </div>
                      <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
                        Fostura <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-teal-300 bg-clip-text text-transparent">Workout Studio</span>
                      </h1>
                      <p className="mt-1 text-xs text-slate-400 max-w-lg">
                        Synthesize customized 3-day workout routines or browse exercises, track live sessions, and measure progression.
                      </p>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-12 items-start">
                      <form id="workout-form" onSubmit={handleGenerate} className="lg:col-span-6">
                        <div className="liquid-glass relative overflow-hidden rounded-3xl p-6 shadow-2xl">
                          <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

                          <div className="mb-5 flex items-center justify-between">
                            <div>
                              <h2 className="text-sm font-extrabold text-white tracking-tight">Generate Routine</h2>
                              <p className="text-[10px] text-slate-500">Custom 3-day training split synthesis</p>
                            </div>
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-lg bg-white/[0.04] text-slate-400 border border-white/[0.06]">
                              Groq LLM
                            </span>
                          </div>

                          <div className="space-y-5">
                            <FitnessGoalSelector value={goal} onChange={setGoal} />
                            <ExperienceLevelSelector value={experience} onChange={setExperience} />
                            <RoutineSplitSelector value={splitFormat} onChange={setSplitFormat} />
                            <EquipmentMixSelector value={equipment} onChange={setEquipment} />
                          </div>

                          <button
                            type="submit"
                            disabled={!isReady || loading}
                            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-400 px-5 py-3.5 text-xs font-extrabold uppercase tracking-wider text-white shadow-xl transition-all hover:from-sky-400 hover:to-teal-300 disabled:opacity-40 active:scale-[0.98] button-press shimmer-hover animate-gradient-flow"
                            style={isReady && !loading ? { animation: "pulse-glow 3s ease-in-out infinite" } : undefined}
                          >
                            {loading ? (
                              <>
                                <Spinner className="h-4 w-4" /> Synthesizing Plan…
                              </>
                            ) : (
                              <>
                                <span>Build 3-Day Plan</span>
                                <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                </svg>
                              </>
                            )}
                          </button>
                        </div>
                      </form>

                      <div className="lg:col-span-6 space-y-4">
                        {error && (
                          <div className="liquid-glass flex items-start gap-3 rounded-2xl border-red-500/30 bg-red-950/20 p-4 text-xs animate-scale-in">
                            <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                            </svg>
                            <p className="text-red-300 leading-relaxed">{error}</p>
                            <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-200">
                              ✕
                            </button>
                          </div>
                        )}

                        {loading && (
                          <div className="liquid-glass rounded-3xl p-8 animate-fade-in">
                            <div className="flex items-center gap-3">
                              <Spinner className="h-5 w-5 text-sky-400" />
                              <div>
                                <p className="text-sm font-bold text-white">AI Coach is calculating routine…</p>
                                <p className="text-xs text-slate-400">Optimizing volume, rest intervals, and exercises</p>
                              </div>
                            </div>
                            <div className="mt-6 space-y-3">
                              {[1, 2, 3].map((i) => (
                                <div key={i} className="h-4 animate-pulse rounded-lg bg-white/5" style={{ width: `${88 - i * 15}%` }} />
                              ))}
                            </div>
                          </div>
                        )}

                        {plan && !loading && (
                          <div className="space-y-3.5 animate-fade-in-up">
                            {/* Action Bar Header */}
                            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                              <div className="flex items-center gap-2">
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-400">
                                  {isMainPlanActive ? "Active Main Workout Plan" : "Custom 3-Day Plan Generated"}
                                </p>
                                {isMainPlanActive ? (
                                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.15)]">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Active Main Routine
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/15 border border-amber-400/40 text-amber-300">
                                    Unsaved Draft
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {!isMainPlanActive ? (
                                  <button
                                    type="button"
                                    onClick={handleSaveAsMainPlan}
                                    className="liquid-pill flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-400 hover:from-sky-400 hover:to-teal-300 text-white text-xs font-bold shadow-md shadow-cyan-500/20 transition-all button-press"
                                  >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                                    </svg>
                                    <span>Save as Main Plan</span>
                                  </button>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 text-xs font-bold shadow-sm shadow-emerald-500/10">
                                      <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                      </svg>
                                      <span>Saved as Main Plan</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={handleExportDaysToTemplates}
                                      className="liquid-pill px-2.5 py-1.5 rounded-xl text-[10px] font-semibold text-slate-300 hover:text-white border border-white/[0.08] hover:border-white/20 transition-colors"
                                      title="Export to My Templates"
                                    >
                                      Export Days
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleClearMainPlan}
                                      className="text-[10px] text-slate-400 hover:text-rose-400 transition-colors px-1.5 py-1"
                                      title="Reset main plan"
                                    >
                                      Reset
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Informative Guidance Banner */}
                            {isMainPlanActive ? (
                              <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-200 animate-fade-in shadow-inner">
                                <div className="flex items-center gap-2.5">
                                  <svg className="h-4 w-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                  </svg>
                                  <span className="text-[11px] leading-relaxed text-slate-200">
                                    Set as your <strong className="text-emerald-300">Active Main Workout Plan</strong>. It stays permanently saved on your account and appears on your Dashboard every time you log in.
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => navigateToTab("dashboard")}
                                  className="text-[10px] font-bold text-emerald-300 hover:text-white underline underline-offset-2 ml-2 shrink-0 button-press"
                                >
                                  Dashboard →
                                </button>
                              </div>
                            ) : (
                              <div className="p-3.5 rounded-2xl bg-white/[0.025] border border-cyan-500/25 flex items-center justify-between text-xs text-slate-300 animate-fade-in">
                                <div className="flex items-center gap-2.5">
                                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shrink-0 shadow-[0_0_6px_#38bdf8]" />
                                  <span className="text-[11px] leading-relaxed text-slate-300">
                                    Tap <strong className="text-cyan-300">"Save as Main Plan"</strong> to follow this routine across your account without generating another one each time you log in.
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleSaveAsMainPlan}
                                  className="text-[10px] font-bold text-cyan-300 hover:text-white uppercase tracking-wider ml-2 shrink-0 button-press"
                                >
                                  Save Now →
                                </button>
                              </div>
                            )}

                            {/* 3 Days Workout Cards */}
                            {plan.map((day, i) => (
                              <button
                                key={i}
                                onClick={() => startFromPlan(i)}
                                className={`liquid-glass card-hover-lift shimmer-hover group w-full overflow-hidden rounded-2xl p-5 text-left transition-all button-press animate-fade-in-up stagger-${i + 1}`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="liquid-pill rounded-lg px-2.5 py-1 text-xs font-bold text-sky-300 border-sky-500/30">
                                    {day.day}
                                  </span>
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300 opacity-80 group-hover:opacity-100 transition-all">
                                    <span>Start Workout</span>
                                    <svg className="h-3.5 w-3.5 group-hover-arrow" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                    </svg>
                                  </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                  {day.exercises.map((ex, j) => (
                                    <span key={j} className="rounded-lg bg-white/[0.04] border border-white/[0.05] px-2.5 py-1 text-xs text-slate-300">
                                      {ex.name}
                                    </span>
                                  ))}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {!plan && !loading && !error && (
                          <div className="liquid-glass relative overflow-hidden rounded-3xl p-6 border border-white/[0.08] shadow-2xl space-y-4">
                            {/* Blueprint Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${isReady ? "bg-emerald-400 animate-pulse" : "bg-cyan-400"}`} />
                                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300">
                                  Synthesis Architecture
                                </span>
                              </div>
                              <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                                isReady
                                  ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-300"
                                  : "bg-white/[0.04] border-white/[0.08] text-slate-400"
                              }`}>
                                {isReady ? "Ready to Build" : "Awaiting Setup"}
                              </span>
                            </div>

                            <p className="text-xs text-slate-400 leading-relaxed">
                              Select your training goals on the left. The Groq LLM engine adapts exercise selection, set volume, and rest intervals into a balanced 3-day split.
                            </p>

                            {/* 3-Day Split Blueprint Preview */}
                            <div className="space-y-2">
                              {(splitFormat.includes("Upper")
                                ? [
                                    { num: "01", title: "Day 1: Upper Body Power", focus: "Chest, back, deltoids & arm stabilizers", dur: "45-50m", badgeBg: "bg-cyan-500/10 text-cyan-400" },
                                    { num: "02", title: "Day 2: Lower Body Strength", focus: "Quads, posterior chain & core stabilization", dur: "45-50m", badgeBg: "bg-sky-500/10 text-sky-400" },
                                    { num: "03", title: "Day 3: Full Body & Core", focus: "Kinetic chains, balance & volume overload", dur: "40-45m", badgeBg: "bg-teal-500/10 text-teal-400" },
                                  ]
                                : splitFormat.includes("Full Body")
                                ? [
                                    { num: "01", title: "Day 1: Full Body A (Squat focus)", focus: "Squats, bench press, rows & core bracing", dur: "45-50m", badgeBg: "bg-cyan-500/10 text-cyan-400" },
                                    { num: "02", title: "Day 2: Full Body B (Hinge focus)", focus: "Deadlifts, overhead press, chins & abs", dur: "45-50m", badgeBg: "bg-sky-500/10 text-sky-400" },
                                    { num: "03", title: "Day 3: Full Body C (Volume)", focus: "Lunges, dips, pulldowns & accessories", dur: "40-45m", badgeBg: "bg-teal-500/10 text-teal-400" },
                                  ]
                                : splitFormat.includes("Arnold") || splitFormat.includes("Custom")
                                ? [
                                    { num: "01", title: "Day 1: Chest & Back (Antagonists)", focus: "Superset horizontal pushes & pulls", dur: "45-50m", badgeBg: "bg-cyan-500/10 text-cyan-400" },
                                    { num: "02", title: "Day 2: Shoulders & Arms", focus: "Deltoid heads, biceps & triceps hypertrophy", dur: "45-50m", badgeBg: "bg-sky-500/10 text-sky-400" },
                                    { num: "03", title: "Day 3: Legs & Core", focus: "Quads, hamstrings, calves & abs overload", dur: "40-45m", badgeBg: "bg-teal-500/10 text-teal-400" },
                                  ]
                                : [
                                    { num: "01", title: "Day 1: Push (Chest, Shoulders, Triceps)", focus: "Bench press, overhead presses, dips & extensions", dur: "45-50m", badgeBg: "bg-cyan-500/10 text-cyan-400" },
                                    { num: "02", title: "Day 2: Pull (Back, Biceps, Rear Delts)", focus: "Deadlifts, rows, lat pulldowns & curls", dur: "45-50m", badgeBg: "bg-sky-500/10 text-sky-400" },
                                    { num: "03", title: "Day 3: Legs & Core (Quads, Posterior, Abs)", focus: "Squats, lunges, romanian deadlifts & planks", dur: "45-50m", badgeBg: "bg-teal-500/10 text-teal-400" },
                                  ]
                              ).map((step) => (
                                <div key={step.num} className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs font-bold font-mono ${step.badgeBg}`}>
                                      {step.num}
                                    </span>
                                    <div>
                                      <p className="text-xs font-bold text-white">{step.title}</p>
                                      <p className="text-[10px] text-slate-400">{step.focus}</p>
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-mono text-slate-500">{step.dur}</span>
                                </div>
                              ))}
                            </div>

                            {/* Live Configuration Pill Strip */}
                            <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center gap-2 text-[10px]">
                              <span className="text-slate-500 uppercase tracking-wider font-semibold">Live Setup:</span>
                              <span className="px-2 py-0.5 rounded-lg bg-white/[0.04] text-slate-300 font-medium">
                                Goal: <strong className="text-white font-bold">{goal || "—"}</strong>
                              </span>
                              <span className="px-2 py-0.5 rounded-lg bg-white/[0.04] text-slate-300 font-medium">
                                Level: <strong className="text-white font-bold">{experience || "—"}</strong>
                              </span>
                              <span className="px-2 py-0.5 rounded-lg bg-white/[0.04] text-slate-300 font-medium">
                                Split: <strong className="text-cyan-300 font-bold">{splitFormat.includes("PPL") ? "PPL" : splitFormat.split(" ")[0]}</strong>
                              </span>
                              <span className="px-2 py-0.5 rounded-lg bg-white/[0.04] text-slate-300 font-medium">
                                Gear: <strong className="text-cyan-300 font-bold">{equipment ? `${equipment.split(",").filter(Boolean).length} tools` : "—"}</strong>
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB 2: QUICK START ─── */}
                {tab === "quick" && (
                  <div className="space-y-6 animate-[fadeInUp_0.3s_ease-out_both]">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => navigateToTab("ai")}
                        className="liquid-pill flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white group"
                      >
                        <svg className="h-4 w-4 text-sky-400 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                        </svg>
                        <span>Dashboard</span>
                      </button>
                      <h2 className="text-lg font-extrabold text-white">Quick Start Workouts</h2>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="w-full max-w-lg space-y-6">
                        <button
                          onClick={quickStart}
                          className="liquid-glass liquid-glass-interactive group flex w-full items-center gap-5 rounded-3xl p-6 text-left"
                        >
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 shadow-xl shadow-sky-500/25 transition-transform group-hover:scale-105">
                            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-base font-extrabold text-white">Start Empty Workout</h3>
                            <p className="mt-0.5 text-xs text-slate-400">Freely add and track exercises as you train</p>
                          </div>
                          <svg className="ml-auto h-5 w-5 text-slate-500 transition-all group-hover:translate-x-1 group-hover:text-sky-300" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                          </svg>
                        </button>

                        <div>
                          <div className="mb-3 flex items-center justify-between px-1">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Quick Preset Routines</p>
                            <span className="text-[10px] text-slate-500">Popular</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {EXAMPLE_TEMPLATES.slice(0, 4).map((t) => (
                              <button
                                key={t.id}
                                onClick={() => startFromTemplate(t)}
                                className="liquid-glass liquid-glass-interactive rounded-2xl p-4 text-left group"
                              >
                                <span className="liquid-pill inline-block rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-300 mb-2">
                                  {t.category}
                                </span>
                                <p className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">{t.name}</p>
                                <p className="mt-1 text-[10px] text-slate-400">{t.exercises.length} exercises</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB 3: TEMPLATES ─── */}
                {tab === "templates" && (
                  <div className="space-y-6 animate-[fadeInUp_0.3s_ease-out_both]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => navigateToTab("ai")}
                          className="liquid-pill flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white group"
                        >
                          <svg className="h-4 w-4 text-sky-400 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                          </svg>
                          <span>Dashboard</span>
                        </button>
                        <h2 className="text-lg font-extrabold text-white">Routines & Templates</h2>
                      </div>

                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-3.5 py-2 text-xs font-bold text-white shadow-lg transition-all hover:from-sky-400 hover:to-cyan-400 active:scale-[0.98]"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Create Template
                      </button>
                    </div>

                    <div className="space-y-8">
                      <div>
                        <h3 className="text-sm font-extrabold text-white mb-2 px-1">My Saved Templates</h3>
                        {userTemplates.length === 0 ? (
                          <div className="liquid-glass flex items-center gap-4 rounded-3xl p-6">
                            <div className="liquid-pill flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sky-300">
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">No custom templates yet</p>
                              <p className="text-xs text-slate-400">Click &quot;Create Template&quot; to design your own exercise blueprint.</p>
                            </div>
                          </div>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {userTemplates.map((t) => (
                              <div key={t.id} className="liquid-glass liquid-glass-interactive group relative overflow-hidden rounded-2xl">
                                <button onClick={() => startFromTemplate(t)} className="w-full p-4 text-left">
                                  <span className="liquid-pill inline-block rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-300 mb-1.5">
                                    {t.category}
                                  </span>
                                  <p className="text-sm font-extrabold text-white">{t.name}</p>
                                  <p className="mt-0.5 text-[10px] text-slate-400">
                                    {t.exercises.length} exercises • {t.exercises.reduce((s, e) => s + e.sets, 0)} total sets
                                  </p>
                                  <div className="mt-2.5 flex flex-wrap gap-1">
                                    {t.exercises.slice(0, 3).map((e, i) => (
                                      <span key={i} className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-slate-300">
                                        {e.name}
                                      </span>
                                    ))}
                                    {t.exercises.length > 3 && (
                                      <span className="text-[10px] text-slate-500 font-semibold">+{t.exercises.length - 3}</span>
                                    )}
                                  </div>
                                </button>
                                <button
                                  onClick={() => deleteTemplate(t.id)}
                                  className="absolute right-2.5 top-2.5 rounded-lg p-1 text-slate-500 opacity-0 transition-all hover:bg-red-500/20 hover:text-red-300 group-hover:opacity-100"
                                  title="Delete"
                                >
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm font-extrabold text-white mb-2 px-1">Example Templates</h3>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {EXAMPLE_TEMPLATES.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => startFromTemplate(t)}
                              className="liquid-glass liquid-glass-interactive group overflow-hidden rounded-2xl p-4 text-left transition-all"
                            >
                              <div className="flex items-center justify-between">
                                <span className="liquid-pill rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-300">
                                  {t.category}
                                </span>
                                <span className="text-[10px] font-bold text-sky-300 opacity-0 transition-opacity group-hover:opacity-100">
                                  Start →
                                </span>
                              </div>
                              <p className="mt-2 text-sm font-bold text-white group-hover:text-sky-300 transition-colors">{t.name}</p>
                              <p className="text-[10px] text-slate-400">
                                {t.exercises.length} exercises • {t.exercises.reduce((s, e) => s + e.sets, 0)} total sets
                              </p>
                              <div className="mt-2.5 flex flex-wrap gap-1">
                                {t.exercises.map((e, i) => (
                                  <span key={i} className="rounded-md bg-white/[0.04] border border-white/[0.05] px-1.5 py-0.5 text-[10px] text-slate-300">
                                    {e.name}
                                  </span>
                                ))}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB 4: EXERCISE LIBRARY (40+ Exercises A to Z) ─── */}
                {tab === "exercises" && (
                  <ExerciseLibraryTab
                    onSelectExercise={(ex) => setSelectedExercise(ex)}
                    unit={preferredUnit}
                    onSetUnit={(u) => setPreferredUnit(u)}
                    onBack={() => navigateToTab("ai")}
                  />
                )}

                {/* ─── TAB 5: BODY & METRICS ─── */}
                {tab === "metrics" && (
                  <div className="space-y-6 animate-[fadeInUp_0.3s_ease-out_both]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => navigateToTab("dashboard")}
                          className="liquid-pill flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white group shrink-0"
                        >
                          <svg className="h-4 w-4 text-sky-400 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                          </svg>
                          <span>Dashboard</span>
                        </button>
                        <h2 className="text-base sm:text-lg font-extrabold text-white truncate">Body Progression</h2>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Display Unit:</span>
                        <UnitTogglePill unit={preferredUnit} onChange={setPreferredUnit} size="sm" />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div
                        onClick={() => setActiveMetric("weight")}
                        className={`liquid-glass liquid-glass-interactive cursor-pointer rounded-3xl p-5 border transition-all ${
                          activeMetric === "weight"
                            ? "border-sky-400/60 shadow-lg shadow-sky-500/20 ring-1 ring-sky-400/40"
                            : "border-white/10"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Body Weight</span>
                          <span className="liquid-pill flex h-6 w-6 items-center justify-center rounded-lg text-sky-300">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.97ZM5.25 4.97c-.122.499.106 1.028.589 1.202.628.226 1.305.352 2.031.352.726 0 1.403-.126 2.031-.352.483-.174.711-.703.59-1.202L7.87 4.97M5.25 4.97c-1.01.143-2.01.317-3 .52m3-.52L2.63 15.696c-.122.499.106 1.028.589 1.202.628.226 1.305.352 2.031.352.726 0 1.403-.126 2.031-.352.483-.174.711-.703.59-1.202L5.25 4.97Z" />
                            </svg>
                          </span>
                        </div>
                        <p className="mt-2 text-2xl font-black tracking-tight text-white">
                          {latestMetric
                            ? preferredUnit === "kg"
                              ? `${Math.round((latestMetric.weight / 2.20462262) * 10) / 10} kg`
                              : `${Math.round(latestMetric.weight * 10) / 10} lbs`
                            : "—"}
                        </p>
                        <p className="mt-1 text-[11px] font-semibold text-sky-300">
                          {metrics.length > 1
                            ? preferredUnit === "kg"
                              ? `${Math.round(((latestMetric!.weight - metrics[0].weight) / 2.20462262) * 10) / 10} kg overall`
                              : `${Math.round((latestMetric!.weight - metrics[0].weight) * 10) / 10} lbs overall`
                            : "Baseline set"}
                        </p>
                      </div>

                      <div
                        onClick={() => setActiveMetric("bodyFat")}
                        className={`liquid-glass liquid-glass-interactive cursor-pointer rounded-3xl p-5 border transition-all ${
                          activeMetric === "bodyFat"
                            ? "border-teal-400/60 shadow-lg shadow-teal-500/20 ring-1 ring-teal-400/40"
                            : "border-white/10"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Body Fat</span>
                          <span className="liquid-pill flex h-6 w-6 items-center justify-center rounded-lg text-teal-300">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
                            </svg>
                          </span>
                        </div>
                        <p className="mt-2 text-2xl font-black tracking-tight text-white">
                          {latestMetric ? `${latestMetric.bodyFat}%` : "—"}
                        </p>
                        <p className="mt-1 text-[11px] font-semibold text-teal-300">Composition tracking</p>
                      </div>

                      <div
                        onClick={() => setActiveMetric("calories")}
                        className={`liquid-glass liquid-glass-interactive cursor-pointer rounded-3xl p-5 border transition-all ${
                          activeMetric === "calories"
                            ? "border-cyan-400/60 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/40"
                            : "border-white/10"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Daily Intake</span>
                          <span className="liquid-pill flex h-6 w-6 items-center justify-center rounded-lg text-cyan-300">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                            </svg>
                          </span>
                        </div>
                        <p className="mt-2 text-2xl font-black tracking-tight text-white">
                          {latestMetric ? `${latestMetric.calories.toLocaleString()} kcal` : "—"}
                        </p>
                        <p className="mt-1 text-[11px] font-semibold text-cyan-300">Target intake</p>
                      </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-12 items-start">
                      <div className="liquid-glass rounded-3xl p-6 shadow-2xl lg:col-span-7 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
                              <h3 className="text-sm font-extrabold text-white">
                                {activeMetric === "weight" ? "Weight Progression" : activeMetric === "bodyFat" ? "Body Fat Percentage" : "Caloric Intake Log"}
                              </h3>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">Timeline trends & historical measurements</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="liquid-pill flex rounded-xl p-0.5 border-white/10">
                              <button
                                type="button"
                                onClick={() => setTimelineFilter("days")}
                                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                                  timelineFilter === "days" ? "bg-white/15 text-white shadow-sm" : "text-slate-400 hover:text-white"
                                }`}
                              >
                                Days
                              </button>
                              <button
                                type="button"
                                onClick={() => setTimelineFilter("months")}
                                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                                  timelineFilter === "months" ? "bg-white/15 text-white shadow-sm" : "text-slate-400 hover:text-white"
                                }`}
                              >
                                Months
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => setShowLogModal(true)}
                              className="flex items-center gap-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-3 py-1 text-[10px] font-bold transition-all hover:bg-cyan-500/30"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                              Log
                            </button>
                          </div>
                        </div>

                        <div className="pt-2">
                          <MetricsChart
                            metrics={metrics}
                            activeMetric={activeMetric}
                            timelineFilter={timelineFilter}
                            unit={preferredUnit}
                            onLogClick={() => setShowLogModal(true)}
                          />
                        </div>

                        <div className="pt-4 border-t border-white/[0.06]">
                          <div className="flex items-center justify-between mb-2.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recent Logs</p>
                            <span className="text-[10px] text-slate-500">{metrics.length} recorded</span>
                          </div>

                          {metrics.length === 0 ? (
                            <div className="rounded-2xl border border-white/[0.05] bg-white/[0.01] p-4 text-center">
                              <p className="text-xs text-slate-400">
                                No measurement logs recorded yet. Tap <strong className="text-cyan-300">+ Log</strong> above to add your first weight entry!
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                              {[...metrics].reverse().slice(0, 5).map((m) => (
                                <div key={m.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-xs">
                                  <span className="font-mono text-slate-400">{m.date}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold text-white">
                                      {preferredUnit === "kg"
                                        ? `${Math.round((m.weight / 2.20462262) * 10) / 10} kg`
                                        : `${Math.round(m.weight * 10) / 10} lbs`}
                                    </span>
                                    {m.bodyFat > 0 && <span className="text-teal-300">{m.bodyFat}%</span>}
                                    {m.calories > 0 && <span className="text-cyan-300">{m.calories} kcal</span>}
                                    <button
                                      onClick={() => deleteMetricEntry(m.id)}
                                      className="text-slate-500 hover:text-red-400 transition-colors p-0.5"
                                      title="Delete"
                                    >
                                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="lg:col-span-5">
                        <BmiCalculator />
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB 6: CLOUD HISTORY ─── */}
                {tab === "history" && (
                  <HistoryTab
                    onQuickStart={quickStart}
                    onStartHistoryWorkout={startFromHistoryWorkout}
                  />
                )}

                {/* ─── TAB 7: TROPHY ROOM & PROFILE ─── */}
                {tab === "trophy" && (
                  <TrophyRoomTab
                    onQuickStart={quickStart}
                    preferredUnit={preferredUnit}
                    onSetUnit={setPreferredUnit}
                  />
                )}
              </>
            )}

            {/* ══════════════ TRACKING VIEW ══════════════ */}
            {phase === "tracking" && (
              <div className="mx-auto w-full max-w-3xl">
                <ActiveWorkout
                  dayTitle={workoutTitle}
                  tracked={trackedExercises}
                  setTracked={setTrackedExercises}
                  onFinish={finishWorkout}
                  onBack={resetHome}
                  elapsedSeconds={elapsedSeconds}
                  unit={preferredUnit}
                  onSetUnit={setPreferredUnit}
                  onSetCompleted={onSetCompleted}
                  comboCounter={comboCounter}
                />
              </div>
            )}
          </main>

          {/* Footer */}
          {phase === "home" && (
            <footer className="border-t border-sky-400/[0.08] py-6 text-center text-xs text-slate-500 mb-16 lg:mb-0">
              © {new Date().getFullYear()} Fostura — Intelligent Fitness Experience
            </footer>
          )}

          {/* ══════════════ MOBILE BOTTOM NAVIGATION BAR (SMARTPHONES) ══════════════ */}
          {phase === "home" && (
            <nav
              aria-label="Mobile Navigation Bar"
              className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#030814]/94 backdrop-blur-2xl border-t border-sky-400/20 px-1 py-1.5 shadow-[0_-10px_25px_rgba(0,0,0,0.7)] flex items-center justify-around"
            >
              {[
                { key: "dashboard" as HomeTab, label: "Home", icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                  </svg>
                )},
                { key: "ai" as HomeTab, label: "AI Studio", icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
                  </svg>
                )},
                { key: "quick" as HomeTab, label: "Start", isCenter: true, icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                  </svg>
                )},
                { key: "exercises" as HomeTab, label: "Library", icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                  </svg>
                )},
                { key: "metrics" as HomeTab, label: "Metrics", icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                  </svg>
                )},
                { key: "history" as HomeTab, label: "History", icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                )},
                { key: "trophy" as HomeTab, label: "Trophy", icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.504-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.004 0H9.496m5.004 0a5.25 5.25 0 0 0 5.25-5.25v-1.5h-15.5v1.5a5.25 5.25 0 0 0 5.25 5.25m10.25-5.25H21a2.25 2.25 0 0 0 2.25-2.25v-.75a2.25 2.25 0 0 0-2.25-2.25h-1.5M4.5 9H3a2.25 2.25 0 0 0-2.25 2.25v.75A2.25 2.25 0 0 0 3 14.25h1.5" />
                  </svg>
                )},
              ].map((tabItem: any) => {
                const active = tab === tabItem.key;
                if (tabItem.isCenter) {
                  return (
                    <button
                      key={tabItem.key}
                      type="button"
                      onClick={quickStart}
                      className="flex flex-col items-center -mt-3.5 group button-press"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 via-cyan-400 to-teal-300 text-white shadow-lg shadow-cyan-500/40 ring-4 ring-[#040914] group-active:scale-95 transition-transform">
                        {tabItem.icon}
                      </div>
                      <span className="text-[9px] font-extrabold text-cyan-300 mt-0.5">Start</span>
                    </button>
                  );
                }

                return (
                  <button
                    key={tabItem.key}
                    type="button"
                    onClick={() => {
                      if (tabItem.href) {
                        router.push(tabItem.href);
                      } else {
                        navigateToTab(tabItem.key);
                      }
                    }}
                    className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all button-press ${
                      active ? "text-cyan-300" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div className={`transition-transform ${active ? "scale-110 drop-shadow-[0_0_8px_#38bdf8]" : ""}`}>
                      {tabItem.icon}
                    </div>
                    <span className={`text-[9px] tracking-tight mt-0.5 ${active ? "font-black text-white" : "font-medium text-slate-400"}`}>
                      {tabItem.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      </div>

      {/* ══════════════ EXERCISE DETAIL MODAL ══════════════ */}
      {selectedExercise && (
        <ExerciseDetailModal
          exercise={selectedExercise}
          unit={preferredUnit}
          onSetUnit={(u) => setPreferredUnit(u)}
          history={exerciseHistory[selectedExercise.id] || []}
          onAddHistorySet={addExerciseHistorySet}
          onClose={() => setSelectedExercise(null)}
        />
      )}

      {/* ══════════════ SUMMARY MODAL ══════════════ */}
      {phase === "summary" && (
        <WorkoutSummary
          dayTitle={workoutTitle}
          trackedExercises={trackedExercises}
          elapsedSeconds={elapsedSeconds}
          unit={preferredUnit}
          onClose={resetHome}
          gamificationResult={gamificationResult}
          gamificationStats={gamificationStats}
        />
      )}

      {/* ══════════════ CREATE TEMPLATE MODAL ══════════════ */}
      {showCreateModal && (
        <CreateTemplateModal onSave={saveTemplate} onClose={() => setShowCreateModal(false)} />
      )}

      {/* ══════════════ LOG METRICS MODAL ══════════════ */}
      {showLogModal && (
        <LogMetricModal
          onSave={addMetricEntry}
          onClose={() => setShowLogModal(false)}
          defaultUnit={preferredUnit}
          onSetUnit={setPreferredUnit}
        />
      )}

      {/* ══════════════ TIP JAR MODAL ══════════════ */}
      {showTipJar && <TipJarModal onClose={() => setShowTipJar(false)} />}

      {/* ══════════════ FLOATING AI COACH FAB BUTTON ══════════════ */}
      {phase !== "summary" && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-40">
          <button
            type="button"
            onClick={() => setIsCoachDrawerOpen(true)}
            className="group relative flex items-center gap-3 rounded-2xl border border-cyan-500/50 bg-slate-900/95 hover:border-cyan-400 hover:bg-slate-800/95 px-3.5 py-2 sm:px-4 sm:py-2.5 text-white transition-all duration-200 button-press shadow-2xl backdrop-blur-md"
            title="Ask AI Coach (Coach Fostura)"
          >
            {/* Clean AI Badge (No glowing halos, no lucide sparkles) */}
            <div className="flex h-8 w-8 sm:h-8.5 sm:w-8.5 items-center justify-center rounded-xl bg-cyan-400 text-slate-950 font-black text-xs shrink-0 transition-transform group-hover:scale-105">
              <span>AI</span>
            </div>

            {/* Engaging Callout */}
            <div className="flex flex-col text-left pr-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                  Ask AI Coach
                </span>
                <span className="text-[11px] text-cyan-400 font-bold transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                Form cues, meals & routines
              </span>
            </div>
          </button>
        </div>
      )}

      {/* ══════════════ ASK COACH FOSTURA DRAWER ══════════════ */}
      <AiCoachDrawer
        isOpen={isCoachDrawerOpen}
        onClose={() => setIsCoachDrawerOpen(false)}
        unit={preferredUnit}
      />

      {/* ══════════════ GAMIFICATION OVERLAYS ══════════════ */}
      <XPToastOverlay toasts={xpToasts} />
      <ConfettiOverlay active={showConfetti} />
    </>
  );
}
