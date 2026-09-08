"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import {
  getDefaultStats,
  loadGamificationStats,
  levelFromXP,
  titleForLevel,
  colorForLevel,
  xpProgressInLevel,
  xpForLevel,
  getCurrentStreakStatus,
  getActiveChallenge,
  ACHIEVEMENTS,
  LEVEL_TITLES,
  LEVEL_COLORS,
  XP_REWARDS,
  type GamificationStats,
  type AchievementDef,
} from "@/lib/gamification";
import { AchievementIcon } from "@/app/profile/page";

type AchievementFilter = "all" | "unlocked" | "locked" | "workout" | "streak" | "volume" | "milestone";

interface TrophyRoomTabProps {
  onQuickStart: () => void;
  preferredUnit: "lbs" | "kg";
  onSetUnit?: (unit: "lbs" | "kg") => void;
}

export function TrophyRoomTab({
  onQuickStart,
  preferredUnit,
}: TrophyRoomTabProps) {
  const { user } = useUser();
  const [stats, setStats] = useState<GamificationStats>(getDefaultStats());
  const [selectedFilter, setSelectedFilter] = useState<AchievementFilter>("all");
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementDef | null>(null);

  // Reload stats on mount
  useEffect(() => {
    setStats(loadGamificationStats());
  }, []);

  // Compute player leveling
  const level = levelFromXP(stats.totalXP);
  const title = titleForLevel(level);
  const colors = colorForLevel(level);
  const { xpInLevel, currentLevelXP, nextLevelXP, progress } = xpProgressInLevel(stats.totalXP);
  const xpToNext = nextLevelXP - currentLevelXP;
  const streakStatus = getCurrentStreakStatus(stats);
  const challengeInfo = getActiveChallenge(stats);

  // Generate 90-day consistency heatmap data
  const heatmapData = useMemo(() => {
    const days: { date: string; count: number }[] = [];
    const now = new Date();
    const historyDates = new Set((stats.workoutDates || []).map((d) => d.slice(0, 10)));

    for (let i = 89; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      days.push({
        date: iso,
        count: historyDates.has(iso) ? 1 : 0,
      });
    }
    return days;
  }, [stats.workoutDates]);

  // Achievement unlock lookup map
  const unlockedMap = useMemo(() => {
    const map = new Map<string, string>();
    stats.unlockedAchievements.forEach((u) => {
      map.set(u.id, u.unlockedAt);
    });
    return map;
  }, [stats.unlockedAchievements]);

  // Filtered achievement list
  const filteredAchievements = useMemo(() => {
    return ACHIEVEMENTS.filter((ach) => {
      const isUnlocked = unlockedMap.has(ach.id);
      if (selectedFilter === "unlocked") return isUnlocked;
      if (selectedFilter === "locked") return !isUnlocked;
      if (selectedFilter === "all") return true;
      return ach.category === selectedFilter;
    });
  }, [selectedFilter, unlockedMap]);

  const unlockedCount = stats.unlockedAchievements.length;
  const totalAchievements = ACHIEVEMENTS.length;
  const completionPercentage = Math.round((unlockedCount / totalAchievements) * 100);

  // Volume conversion
  const displayVolume = preferredUnit === "kg"
    ? Math.round((stats.totalVolume / 2.20462) * 10) / 10
    : stats.totalVolume;

  return (
    <div className="space-y-8 animate-[fadeInUp_0.3s_ease-out_both]">
      {/* ═════════════════════════════════════════════════════════════
          1. HERO PLAYER CARD
         ═════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-[#040f24]/80 to-[#020919] p-6 sm:p-8 backdrop-blur-2xl shadow-2xl">
        <div
          aria-hidden
          className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: colors.from }}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Player Avatar & Identity */}
          <div className="flex items-center gap-5">
            <div
              className="relative flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-3xl border-2 font-black text-3xl sm:text-4xl shadow-2xl transition-transform hover:scale-105"
              style={{
                borderColor: colors.from,
                background: `linear-gradient(135deg, ${colors.from}30, ${colors.to}15)`,
                color: colors.from,
                boxShadow: `0 0 35px ${colors.from}40`,
              }}
            >
              <span>{level}</span>
              <span className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#030917] border border-amber-400/30 text-amber-300 text-xs shadow-md">
                <svg className="h-3.5 w-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
                  {user?.fullName || user?.firstName || "Fitness Athlete"}
                </h2>
                <span
                  className="px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider"
                  style={{
                    background: `linear-gradient(135deg, ${colors.from}35, ${colors.to}20)`,
                    color: colors.from,
                    border: `1px solid ${colors.from}50`,
                  }}
                >
                  Level {level} • {title}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                Member of the Iron Pantheon • {stats.totalWorkouts} sessions logged
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 rounded-lg">
                  <svg className="h-3 w-3 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0 3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                  </svg>
                  <span>{stats.totalXP.toLocaleString()} Lifetime XP</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-orange-300 bg-orange-500/10 border border-orange-500/25 px-2.5 py-0.5 rounded-lg">
                  <svg className="h-3 w-3 text-orange-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                  </svg>
                  <span>{streakStatus.current} Day Streak</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action: Start Training */}
          <div className="flex items-center gap-3 self-start md:self-center shrink-0">
            <button
              type="button"
              onClick={onQuickStart}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-400 text-white font-extrabold text-xs uppercase tracking-wider shadow-xl shadow-cyan-500/25 hover:from-sky-400 hover:to-teal-300 transition-all active:scale-95 button-press animate-gradient-flow"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
              </svg>
              <span>Start Training</span>
            </button>
          </div>
        </div>

        {/* XP Level Progress Bar */}
        <div className="mt-8 pt-6 border-t border-white/[0.08] space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-2">
              <span className="text-white font-black">Level {level}</span>
              <span className="text-slate-400">({title})</span>
            </div>
            <span className="text-slate-400 font-mono">
              {xpInLevel.toLocaleString()} / {xpToNext.toLocaleString()} XP to Level {level + 1}
            </span>
          </div>

          <div className="h-3.5 w-full rounded-full bg-white/5 overflow-hidden relative border border-white/10 p-0.5">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out relative"
              style={{
                width: `${progress * 100}%`,
                background: `linear-gradient(90deg, ${colors.from}, ${colors.to})`,
                boxShadow: `0 0 16px ${colors.from}80`,
              }}
            >
              <div className="absolute inset-0 animate-trophy-shimmer rounded-full" />
            </div>
          </div>

          <div className="flex justify-between text-[10px] font-bold text-slate-400">
            <span>{Math.round(progress * 100)}% Complete</span>
            <span>Next Title: {titleForLevel(level + 1)} ({xpForLevel(level + 1).toLocaleString()} XP)</span>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════
          2. LIFETIME STATS & STREAK MATRIX
         ═════════════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Workouts */}
        <div className="liquid-glass rounded-2xl p-4 text-center border border-white/10 card-hover-lift flex flex-col items-center justify-center">
          <svg className="h-5 w-5 text-cyan-400 mb-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
          </svg>
          <p className="text-xl sm:text-2xl font-black font-mono text-cyan-300 tabular-nums">
            {stats.totalWorkouts}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Workouts</p>
        </div>

        {/* Sets Finished */}
        <div className="liquid-glass rounded-2xl p-4 text-center border border-white/10 card-hover-lift flex flex-col items-center justify-center">
          <svg className="h-5 w-5 text-teal-400 mb-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
          </svg>
          <p className="text-xl sm:text-2xl font-black font-mono text-teal-300 tabular-nums">
            {stats.totalSets}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Sets Finished</p>
        </div>

        {/* Total Volume */}
        <div className="liquid-glass rounded-2xl p-4 text-center border border-white/10 card-hover-lift flex flex-col items-center justify-center">
          <svg className="h-5 w-5 text-sky-400 mb-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6v12m12-12v12M3 9v6m18-6v6M6 12h12" />
          </svg>
          <p className="text-xl sm:text-2xl font-black font-mono text-sky-300 tabular-nums truncate">
            {displayVolume.toLocaleString()}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
            Volume ({preferredUnit})
          </p>
        </div>

        {/* PRs Hit */}
        <div className="liquid-glass rounded-2xl p-4 text-center border border-white/10 card-hover-lift flex flex-col items-center justify-center">
          <svg className="h-5 w-5 text-amber-400 mb-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.003 0H9.497m5.003 0A4.5 4.5 0 0 0 18 9.75V4.5H6v5.25a4.5 4.5 0 0 0 3.497 4.5m4.006 0A2.25 2.25 0 0 1 12 16.5a2.25 2.25 0 0 1-1.5-.75" />
          </svg>
          <p className="text-xl sm:text-2xl font-black font-mono text-amber-300 tabular-nums">
            {stats.totalPRs}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">PRs Hit</p>
        </div>

        {/* Current Streak */}
        <div className={`liquid-glass rounded-2xl p-4 text-center border card-hover-lift flex flex-col items-center justify-center ${
          streakStatus.current > 0 ? "border-orange-400/40 bg-orange-950/20" : "border-white/10"
        }`}>
          <svg className="h-5 w-5 text-orange-400 mb-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
          </svg>
          <p className="text-xl sm:text-2xl font-black font-mono text-orange-300 tabular-nums">
            {streakStatus.current}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
            Day Streak (Best: {streakStatus.best})
          </p>
        </div>

        {/* Badges Earned */}
        <div className="liquid-glass rounded-2xl p-4 text-center border border-white/10 card-hover-lift flex flex-col items-center justify-center">
          <svg className="h-5 w-5 text-purple-400 mb-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.003 0H9.497m5.003 0A4.5 4.5 0 0 0 18 9.75V4.5H6v5.25a4.5 4.5 0 0 0 3.497 4.5m4.006 0A2.25 2.25 0 0 1 12 16.5a2.25 2.25 0 0 1-1.5-.75" />
          </svg>
          <p className="text-xl sm:text-2xl font-black font-mono text-purple-300 tabular-nums">
            {unlockedCount}/{totalAchievements}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Badges Unlocked</p>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════
          3. WEEKLY CHALLENGE & HEATMAP ROW
         ═════════════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Active Weekly Challenge */}
        <div className="lg:col-span-5 space-y-4">
          <div className="liquid-glass rounded-3xl p-6 border border-white/10 relative overflow-hidden">
            <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-3.75a5.25 5.25 0 1 0 0-10.5 5.25 5.25 0 0 0 0 10.5Zm0-2.25a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                </svg>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Active Weekly Challenge</h3>
              </div>
              {challengeInfo?.completed ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-black text-emerald-300">
                  COMPLETED
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-[10px] font-black text-amber-300">
                  +{XP_REWARDS.CHALLENGE_COMPLETED} XP
                </span>
              )}
            </div>

            {challengeInfo && (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 shrink-0 text-amber-400">
                    <AchievementIcon icon={challengeInfo.challenge.icon} className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-white">{challengeInfo.challenge.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      {challengeInfo.challenge.description}
                    </p>
                  </div>
                </div>

                <div className="h-3 w-full rounded-full bg-white/5 overflow-hidden border border-white/5">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      challengeInfo.completed
                        ? "bg-gradient-to-r from-emerald-400 to-teal-300"
                        : "bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300"
                    }`}
                    style={{ width: `${challengeInfo.progress * 100}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>Progress: {Math.round(challengeInfo.progress * 100)}%</span>
                  <span>Resets every Monday</span>
                </div>
              </div>
            )}
          </div>

          {/* Streak Multiplier & Protection Info */}
          <div className="liquid-glass rounded-3xl p-5 border border-white/10 space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-white">
              <svg className="h-4 w-4 text-orange-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
              </svg>
              <span>Daily Streak Mechanics</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Log a workout each day to compound your XP multiplier! Every consecutive day awards an extra{" "}
              <strong className="text-amber-300">+{XP_REWARDS.STREAK_DAILY_BONUS} XP</strong> per day of streak.
            </p>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-xs text-slate-400 flex items-center justify-between">
              <span>Current Streak Bonus:</span>
              <span className="font-mono font-black text-orange-300">
                +{XP_REWARDS.STREAK_DAILY_BONUS * Math.min(streakStatus.current, 30)} XP / workout
              </span>
            </div>
          </div>
        </div>

        {/* 90-Day Workout Matrix */}
        <div className="lg:col-span-7 liquid-glass rounded-3xl p-6 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.253 3.75m-16.5 0h21m-21 0v11.25A2.25 2.25 0 0 0 4.5 21h15a2.25 2.25 0 0 0 2.25-2.25V7.5m-21 0" />
              </svg>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                90-Day Workout Matrix
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {stats.totalWorkouts} Total Sessions
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Each tile represents a day of training. Darker cyan indicates higher consistency and volume logged.
          </p>

          {/* Heatmap Grid */}
          <div className="p-4 rounded-2xl bg-[#030814]/90 border border-white/5 overflow-x-auto no-scrollbar">
            <div className="flex flex-wrap gap-1.5 max-w-full">
              {heatmapData.map((cell, i) => (
                <div
                  key={i}
                  className="h-4 w-4 rounded-md transition-all hover:scale-125 cursor-pointer relative group"
                  style={{
                    backgroundColor:
                      cell.count > 0
                        ? `rgba(56, 189, 248, ${Math.min(0.25 + cell.count * 0.75, 1)})`
                        : "rgba(255, 255, 255, 0.04)",
                    border:
                      cell.count > 0
                        ? "1px solid rgba(56, 189, 248, 0.4)"
                        : "1px solid rgba(255, 255, 255, 0.05)",
                  }}
                >
                  <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block z-20 px-2 py-1 rounded-lg bg-slate-900 border border-white/20 text-[9px] font-bold text-white whitespace-nowrap shadow-xl">
                    {cell.date}: {cell.count > 0 ? "Trained" : "Rest Day"}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 mt-4 text-[10px] font-bold text-slate-500">
              <span>Rest</span>
              <div className="h-3 w-3 rounded bg-white/[0.04] border border-white/5" />
              <div className="h-3 w-3 rounded bg-cyan-500/30 border border-cyan-400/40" />
              <div className="h-3 w-3 rounded bg-cyan-500 border border-cyan-300" />
              <span>Active</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════
          4. THE HALL OF ACHIEVEMENTS (TROPHY ROOM)
         ═════════════════════════════════════════════════════════════ */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.003 0H9.497m5.003 0A4.5 4.5 0 0 0 18 9.75V4.5H6v5.25a4.5 4.5 0 0 0 3.497 4.5m4.006 0A2.25 2.25 0 0 1 12 16.5a2.25 2.25 0 0 1-1.5-.75" />
              </svg>
              <h2 className="text-xl font-black text-white tracking-tight">The Hall of Trophies</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {unlockedCount} of {totalAchievements} Unlocked ({completionPercentage}% Complete)
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: "all", label: `All (${totalAchievements})` },
              { id: "unlocked", label: `Unlocked (${unlockedCount})` },
              { id: "locked", label: `Locked (${totalAchievements - unlockedCount})` },
              { id: "workout", label: "Workouts" },
              { id: "streak", label: "Streaks" },
              { id: "volume", label: "Volume" },
              { id: "milestone", label: "Milestones" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedFilter(tab.id as AchievementFilter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all button-press shrink-0 ${
                  selectedFilter === tab.id
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20"
                    : "bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Achievement Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAchievements.map((ach) => {
            const unlocked = unlockedMap.has(ach.id);
            const unlockedDate = unlockedMap.get(ach.id);

            return (
              <div
                key={ach.id}
                onClick={() => setSelectedAchievement(ach)}
                className={`rounded-2xl p-4.5 border transition-all cursor-pointer relative overflow-hidden card-hover-lift ${
                  unlocked
                    ? "border-amber-400/40 bg-gradient-to-br from-amber-950/20 via-[#0a182d]/80 to-[#030919] hover:border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
                    : "border-white/[0.06] bg-white/[0.02] opacity-65 hover:opacity-100 hover:border-white/20"
                }`}
              >
                {unlocked && (
                  <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
                )}

                <div className="flex items-start gap-3.5">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-lg ${
                      unlocked
                        ? "bg-amber-500/20 border border-amber-400/50 shadow-amber-500/20 animate-badge-unlock text-amber-400"
                        : "bg-white/5 border border-white/10 text-slate-500 opacity-50"
                    }`}
                  >
                    <AchievementIcon icon={ach.icon} className="h-6 w-6" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-sm font-black text-white truncate">{ach.title}</h4>
                      {unlocked ? (
                        <span className="text-[9px] font-black text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded uppercase">
                          Unlocked
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-500">Locked</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {ach.description}
                    </p>
                    {unlocked && unlockedDate && (
                      <p className="text-[9px] font-semibold text-slate-500 mt-2">
                        Achieved {new Date(unlockedDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═════════════════════════════════════════════════════════════
          5. LEVEL PROGRESSION ROADMAP
         ═════════════════════════════════════════════════════════════ */}
      <section className="liquid-glass rounded-3xl p-6 sm:p-8 border border-white/10 space-y-6">
        <div>
          <h3 className="text-base font-black text-white tracking-tight">Athlete Progression Roadmap</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Climb the ranks from Recruit to Immortal by consistently crushing your training routines.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {LEVEL_TITLES.map((lvlTitle, idx) => {
            const isCurrent = idx === level;
            const isPassed = idx < level;
            const lvlColor = LEVEL_COLORS[idx];
            const xpNeeded = xpForLevel(idx);

            return (
              <div
                key={idx}
                className={`rounded-2xl p-3.5 border text-center transition-all ${
                  isCurrent
                    ? "border-cyan-400/80 bg-cyan-950/40 shadow-[0_0_20px_rgba(56,189,248,0.3)]"
                    : isPassed
                    ? "border-emerald-500/30 bg-emerald-950/15"
                    : "border-white/[0.06] bg-white/[0.01] opacity-50"
                }`}
              >
                <div
                  className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl font-black text-sm mb-2 shadow-md"
                  style={{
                    borderColor: lvlColor.from,
                    background: `linear-gradient(135deg, ${lvlColor.from}30, ${lvlColor.to}15)`,
                    color: lvlColor.from,
                    border: `1px solid ${lvlColor.from}50`,
                  }}
                >
                  {idx}
                </div>
                <p className="text-xs font-black text-white truncate">{lvlTitle}</p>
                <p className="text-[10px] font-bold text-slate-400 font-mono mt-0.5">
                  {xpNeeded.toLocaleString()} XP
                </p>
                <div className="mt-2">
                  {isCurrent ? (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 text-[8px] font-black uppercase">
                      Current
                    </span>
                  ) : isPassed ? (
                    <span className="text-[9px] text-emerald-400 font-bold">Mastered</span>
                  ) : (
                    <span className="text-[9px] text-slate-500">Locked</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Achievement Detail Modal ── */}
      {selectedAchievement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#020713]/85 backdrop-blur-md"
            onClick={() => setSelectedAchievement(null)}
          />
          <div className="relative w-full max-w-md rounded-3xl border border-amber-400/40 bg-gradient-to-br from-[#0c192d] via-[#051021] to-[#020914] p-6 shadow-2xl z-10 animate-scale-up">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                Badge Details
              </span>
              <button
                type="button"
                onClick={() => setSelectedAchievement(null)}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white flex items-center justify-center text-xs transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-400/50 text-amber-400 shadow-xl">
                <AchievementIcon icon={selectedAchievement.icon} className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">{selectedAchievement.title}</h3>
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wide">
                  {selectedAchievement.category} Badge
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              {selectedAchievement.description}
            </p>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between text-xs">
              <span className="text-slate-400">Status</span>
              <span className={`font-bold ${unlockedMap.has(selectedAchievement.id) ? "text-emerald-400" : "text-slate-500"}`}>
                {unlockedMap.has(selectedAchievement.id) ? "Unlocked" : "In Progress"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
