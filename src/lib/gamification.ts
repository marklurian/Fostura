/* ═══════════════════════════════════════════════════════════════
   FOSTURA GAMIFICATION ENGINE
   XP, Levels, Streaks, Achievements, Weekly Challenges
   All data persisted in localStorage (matches app patterns)
   ═══════════════════════════════════════════════════════════════ */

// ── XP Reward Constants ──
export const XP_REWARDS = {
  SET_COMPLETED: 10,
  WORKOUT_COMPLETED: 100,
  PR_HIT: 50,
  STREAK_DAILY_BONUS: 25,
  METRIC_LOGGED: 15,
  TEMPLATE_CREATED: 20,
  COMBO_BONUS_PER_LEVEL: 5, // bonus per combo level (x2 = +10, x5 = +25, etc.)
  CHALLENGE_COMPLETED: 150,
} as const;

// ── Level System ──
export const LEVEL_TITLES = [
  "Recruit",     // 0
  "Novice",      // 1
  "Warrior",     // 2
  "Gladiator",   // 3
  "Centurion",   // 4
  "Titan",       // 5
  "Champion",    // 6
  "Olympian",    // 7
  "Legend",       // 8
  "Immortal",    // 9
] as const;

export const LEVEL_COLORS = [
  { from: "#64748b", to: "#94a3b8" }, // Recruit — slate
  { from: "#22d3ee", to: "#06b6d4" }, // Novice — cyan
  { from: "#3b82f6", to: "#2563eb" }, // Warrior — blue
  { from: "#8b5cf6", to: "#7c3aed" }, // Gladiator — violet
  { from: "#f59e0b", to: "#d97706" }, // Centurion — amber
  { from: "#ef4444", to: "#dc2626" }, // Titan — red
  { from: "#ec4899", to: "#db2777" }, // Champion — pink
  { from: "#f97316", to: "#ea580c" }, // Olympian — orange
  { from: "#eab308", to: "#ca8a04" }, // Legend — yellow/gold
  { from: "#a855f7", to: "#9333ea" }, // Immortal — purple
] as const;

/** XP required to reach a given level */
export function xpForLevel(level: number): number {
  // Quadratic curve: level 1 = 100 XP, level 5 = 2500 XP, level 9 = 8100 XP
  return level * level * 100;
}

/** Calculate level from total XP */
export function levelFromXP(totalXP: number): number {
  return Math.floor(Math.sqrt(totalXP / 100));
}

/** Get title for a level */
export function titleForLevel(level: number): string {
  const idx = Math.min(level, LEVEL_TITLES.length - 1);
  return LEVEL_TITLES[idx];
}

/** Get color gradient for a level */
export function colorForLevel(level: number): { from: string; to: string } {
  const idx = Math.min(level, LEVEL_COLORS.length - 1);
  return LEVEL_COLORS[idx];
}

/** Calculate XP progress within current level (0–1) */
export function xpProgressInLevel(totalXP: number): { progress: number; currentLevelXP: number; nextLevelXP: number; xpInLevel: number } {
  const level = levelFromXP(totalXP);
  const currentLevelXP = xpForLevel(level);
  const nextLevelXP = xpForLevel(level + 1);
  const xpInLevel = totalXP - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  return {
    progress: xpNeeded > 0 ? Math.min(1, xpInLevel / xpNeeded) : 1,
    currentLevelXP,
    nextLevelXP,
    xpInLevel,
  };
}

// ── Achievement Definitions ──
export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "workout" | "streak" | "volume" | "milestone" | "special";
  condition: (stats: GamificationStats) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Workout milestones
  { id: "first-blood", title: "First Blood", description: "Complete your first workout", icon: "sword", category: "workout", condition: (s) => s.totalWorkouts >= 1 },
  { id: "getting-started", title: "Getting Started", description: "Complete 5 workouts", icon: "runner", category: "workout", condition: (s) => s.totalWorkouts >= 5 },
  { id: "dedicated", title: "Dedicated", description: "Complete 10 workouts", icon: "bicep", category: "workout", condition: (s) => s.totalWorkouts >= 10 },
  { id: "iron-regular", title: "Iron Regular", description: "Complete 25 workouts", icon: "bolt", category: "workout", condition: (s) => s.totalWorkouts >= 25 },
  { id: "century-club", title: "Century Club", description: "Complete 100 workouts", icon: "century", category: "milestone", condition: (s) => s.totalWorkouts >= 100 },

  // Streak achievements
  { id: "on-fire", title: "On Fire", description: "Maintain a 3-day streak", icon: "flame", category: "streak", condition: (s) => s.bestStreak >= 3 },
  { id: "iron-will", title: "Iron Will", description: "Maintain a 7-day streak", icon: "shield", category: "streak", condition: (s) => s.bestStreak >= 7 },
  { id: "unstoppable", title: "Unstoppable", description: "Maintain a 14-day streak", icon: "zap", category: "streak", condition: (s) => s.bestStreak >= 14 },
  { id: "month-warrior", title: "Month Warrior", description: "Maintain a 30-day streak", icon: "crown", category: "streak", condition: (s) => s.bestStreak >= 30 },

  // Volume achievements
  { id: "volume-starter", title: "Volume Starter", description: "Lift 10,000 lbs total volume", icon: "weight", category: "volume", condition: (s) => s.totalVolume >= 10000 },
  { id: "volume-king", title: "Volume King", description: "Lift 50,000 lbs total volume", icon: "fist", category: "volume", condition: (s) => s.totalVolume >= 50000 },
  { id: "iron-mountain", title: "Iron Mountain", description: "Lift 100,000 lbs total volume", icon: "mountain", category: "volume", condition: (s) => s.totalVolume >= 100000 },
  { id: "titan-lifter", title: "Titan Lifter", description: "Lift 500,000 lbs total volume", icon: "titan", category: "volume", condition: (s) => s.totalVolume >= 500000 },

  // Set milestones
  { id: "set-warrior", title: "Set Warrior", description: "Complete 100 total sets", icon: "check", category: "milestone", condition: (s) => s.totalSets >= 100 },
  { id: "set-machine", title: "Set Machine", description: "Complete 500 total sets", icon: "gear", category: "milestone", condition: (s) => s.totalSets >= 500 },
  { id: "set-legend", title: "Set Legend", description: "Complete 1,000 total sets", icon: "trophy", category: "milestone", condition: (s) => s.totalSets >= 1000 },

  // PR achievements
  { id: "pr-hunter", title: "PR Hunter", description: "Hit 5 personal records", icon: "target", category: "special", condition: (s) => s.totalPRs >= 5 },
  { id: "pr-machine", title: "PR Machine", description: "Hit 25 personal records", icon: "rocket", category: "special", condition: (s) => s.totalPRs >= 25 },

  // XP / Level achievements
  { id: "level-5", title: "Rising Star", description: "Reach Level 5", icon: "star", category: "milestone", condition: (s) => levelFromXP(s.totalXP) >= 5 },
  { id: "level-10", title: "Elite Status", description: "Reach Level 10", icon: "sparkle", category: "milestone", condition: (s) => levelFromXP(s.totalXP) >= 10 },

  // Special
  { id: "combo-master", title: "Combo Master", description: "Hit a 10x set combo in one workout", icon: "link", category: "special", condition: (s) => s.bestCombo >= 10 },
  { id: "early-bird", title: "Early Bird", description: "Complete a workout before 7 AM", icon: "sun", category: "special", condition: (s) => s.earlyBirdWorkouts >= 1 },
  { id: "night-owl", title: "Night Owl", description: "Complete a workout after 10 PM", icon: "moon", category: "special", condition: (s) => s.nightOwlWorkouts >= 1 },
];

// ── Weekly Challenges ──
export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  statKey: "weeklyWorkouts" | "weeklySets" | "weeklyVolume";
}

const CHALLENGE_POOL: WeeklyChallenge[] = [
  { id: "ch-3-workouts", title: "Triple Threat", description: "Complete 3 workouts this week", icon: "target", target: 3, statKey: "weeklyWorkouts" },
  { id: "ch-5-workouts", title: "Five-a-Day", description: "Complete 5 workouts this week", icon: "flame", target: 5, statKey: "weeklyWorkouts" },
  { id: "ch-30-sets", title: "Set Slayer", description: "Complete 30 sets this week", icon: "bolt", target: 30, statKey: "weeklySets" },
  { id: "ch-50-sets", title: "Volume Surge", description: "Complete 50 sets this week", icon: "spark", target: 50, statKey: "weeklySets" },
  { id: "ch-10k-vol", title: "10K Club", description: "Lift 10,000 lbs total this week", icon: "weight", target: 10000, statKey: "weeklyVolume" },
  { id: "ch-20k-vol", title: "Iron Tsunami", description: "Lift 20,000 lbs total this week", icon: "wave", target: 20000, statKey: "weeklyVolume" },
];

// ── Data Types ──
export interface GamificationStats {
  totalXP: number;
  totalWorkouts: number;
  totalSets: number;
  totalVolume: number; // in lbs
  totalPRs: number;
  currentStreak: number;
  bestStreak: number;
  bestCombo: number;
  earlyBirdWorkouts: number;
  nightOwlWorkouts: number;
  lastWorkoutDate: string | null; // YYYY-MM-DD
  workoutDates: string[]; // Array of YYYY-MM-DD for heatmap
  unlockedAchievements: { id: string; unlockedAt: string }[];
  weeklyChallenge: {
    challengeId: string;
    weekStart: string; // YYYY-MM-DD (Monday)
    weeklyWorkouts: number;
    weeklySets: number;
    weeklyVolume: number;
    completed: boolean;
  } | null;
}

export interface XPGainEvent {
  source: string;
  amount: number;
  label: string;
  isPR?: boolean;
  isLevelUp?: boolean;
  newLevel?: number;
}

// ── Storage Keys ──
const STATS_KEY = "fostura-gamification-stats";

// ── Core Functions ──

export function getDefaultStats(): GamificationStats {
  return {
    totalXP: 0,
    totalWorkouts: 0,
    totalSets: 0,
    totalVolume: 0,
    totalPRs: 0,
    currentStreak: 0,
    bestStreak: 0,
    bestCombo: 0,
    earlyBirdWorkouts: 0,
    nightOwlWorkouts: 0,
    lastWorkoutDate: null,
    workoutDates: [],
    unlockedAchievements: [],
    weeklyChallenge: null,
  };
}

export function loadGamificationStats(): GamificationStats {
  if (typeof window === "undefined") return getDefaultStats();
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return getDefaultStats();
    const parsed = JSON.parse(raw);
    return { ...getDefaultStats(), ...parsed };
  } catch {
    return getDefaultStats();
  }
}

export function saveGamificationStats(stats: GamificationStats): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Storage full or unavailable
  }
}

/** Get today as YYYY-MM-DD */
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Get Monday of the current week as YYYY-MM-DD */
function currentWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust if Sunday
  const monday = new Date(d.setDate(diff));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

/** Check and update streak based on last workout date */
function updateStreak(stats: GamificationStats): void {
  const today = todayStr();
  if (stats.lastWorkoutDate === today) return; // Already worked out today

  if (stats.lastWorkoutDate) {
    const lastDate = new Date(stats.lastWorkoutDate);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Consecutive day
      stats.currentStreak += 1;
    } else if (diffDays > 1) {
      // Streak broken
      stats.currentStreak = 1;
    }
  } else {
    stats.currentStreak = 1;
  }

  stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
  stats.lastWorkoutDate = today;

  // Add to workout dates for heatmap
  if (!stats.workoutDates.includes(today)) {
    stats.workoutDates.push(today);
    // Keep last 365 days only
    if (stats.workoutDates.length > 365) {
      stats.workoutDates = stats.workoutDates.slice(-365);
    }
  }
}

/** Get a deterministic challenge index for a given weekStart string (prevents SSR/CSR mismatch) */
function getWeekChallengeIndex(weekStart: string): number {
  let hash = 0;
  for (let i = 0; i < weekStart.length; i++) {
    hash = (hash << 5) - hash + weekStart.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % CHALLENGE_POOL.length;
}

/** Check and rotate weekly challenge */
function ensureWeeklyChallenge(stats: GamificationStats): void {
  const weekStart = currentWeekStart();

  if (!stats.weeklyChallenge || stats.weeklyChallenge.weekStart !== weekStart) {
    // Deterministic week assignment — ensures SSR & CSR match 100% for any given week
    const challengeIdx = getWeekChallengeIndex(weekStart);
    const challenge = CHALLENGE_POOL[challengeIdx];
    stats.weeklyChallenge = {
      challengeId: challenge.id,
      weekStart,
      weeklyWorkouts: 0,
      weeklySets: 0,
      weeklyVolume: 0,
      completed: false,
    };
  }
}

/** Check all achievements and return newly unlocked ones */
function checkAchievements(stats: GamificationStats): AchievementDef[] {
  const newlyUnlocked: AchievementDef[] = [];
  const unlockedIds = new Set(stats.unlockedAchievements.map((a) => a.id));

  for (const achievement of ACHIEVEMENTS) {
    if (!unlockedIds.has(achievement.id) && achievement.condition(stats)) {
      stats.unlockedAchievements.push({
        id: achievement.id,
        unlockedAt: new Date().toISOString(),
      });
      newlyUnlocked.push(achievement);
    }
  }

  return newlyUnlocked;
}

/** Get the active weekly challenge definition */
export function getActiveChallenge(stats: GamificationStats): { challenge: WeeklyChallenge; progress: number; completed: boolean } | null {
  ensureWeeklyChallenge(stats);
  if (!stats.weeklyChallenge) return null;

  const challengeDef = CHALLENGE_POOL.find((c) => c.id === stats.weeklyChallenge!.challengeId);
  if (!challengeDef) return null;

  const current = stats.weeklyChallenge[challengeDef.statKey];
  const progress = Math.min(1, current / challengeDef.target);

  return {
    challenge: challengeDef,
    progress,
    completed: stats.weeklyChallenge.completed,
  };
}

// ── Main Action: Record Workout Completion ──

export interface WorkoutResult {
  completedSets: number;
  totalVolume: number; // in lbs
  prsHit: number;
  bestCombo: number;
}

export interface GamificationResult {
  xpGains: XPGainEvent[];
  totalXPGained: number;
  newLevel: number;
  previousLevel: number;
  leveledUp: boolean;
  newAchievements: AchievementDef[];
  streakUpdated: boolean;
  newStreak: number;
  challengeProgress: { challenge: WeeklyChallenge; progress: number; completed: boolean; justCompleted: boolean } | null;
}

export function recordWorkoutCompletion(result: WorkoutResult): GamificationResult {
  const stats = loadGamificationStats();
  const previousLevel = levelFromXP(stats.totalXP);
  const xpGains: XPGainEvent[] = [];
  let totalXPGained = 0;

  // 1. XP for completed sets
  const setXP = result.completedSets * XP_REWARDS.SET_COMPLETED;
  if (setXP > 0) {
    xpGains.push({ source: "sets", amount: setXP, label: `${result.completedSets} sets completed` });
    totalXPGained += setXP;
  }

  // 2. Workout completion bonus
  xpGains.push({ source: "workout", amount: XP_REWARDS.WORKOUT_COMPLETED, label: "Workout completed" });
  totalXPGained += XP_REWARDS.WORKOUT_COMPLETED;

  // 3. PR bonuses
  if (result.prsHit > 0) {
    const prXP = result.prsHit * XP_REWARDS.PR_HIT;
    xpGains.push({ source: "prs", amount: prXP, label: `${result.prsHit} PR${result.prsHit > 1 ? "s" : ""} hit`, isPR: true });
    totalXPGained += prXP;
  }

  // 4. Combo bonus
  if (result.bestCombo >= 3) {
    const comboXP = result.bestCombo * XP_REWARDS.COMBO_BONUS_PER_LEVEL;
    xpGains.push({ source: "combo", amount: comboXP, label: `${result.bestCombo}x combo bonus` });
    totalXPGained += comboXP;
  }

  // 5. Update streak
  const streakBefore = stats.currentStreak;
  updateStreak(stats);
  const streakUpdated = stats.currentStreak > streakBefore || (streakBefore === 0 && stats.currentStreak === 1);

  if (stats.currentStreak > 1) {
    const streakXP = XP_REWARDS.STREAK_DAILY_BONUS * Math.min(stats.currentStreak, 30); // cap at 30x
    xpGains.push({ source: "streak", amount: streakXP, label: `${stats.currentStreak}-day streak bonus` });
    totalXPGained += streakXP;
  }

  // 6. Update stats
  stats.totalXP += totalXPGained;
  stats.totalWorkouts += 1;
  stats.totalSets += result.completedSets;
  stats.totalVolume += result.totalVolume;
  stats.totalPRs += result.prsHit;
  stats.bestCombo = Math.max(stats.bestCombo, result.bestCombo);

  // Time-based achievements
  const hour = new Date().getHours();
  if (hour < 7) stats.earlyBirdWorkouts += 1;
  if (hour >= 22) stats.nightOwlWorkouts += 1;

  // 7. Update weekly challenge
  ensureWeeklyChallenge(stats);
  let challengeResult: GamificationResult["challengeProgress"] = null;
  if (stats.weeklyChallenge) {
    const wasCompleted = stats.weeklyChallenge.completed;
    stats.weeklyChallenge.weeklyWorkouts += 1;
    stats.weeklyChallenge.weeklySets += result.completedSets;
    stats.weeklyChallenge.weeklyVolume += result.totalVolume;

    const challengeDef = CHALLENGE_POOL.find((c) => c.id === stats.weeklyChallenge!.challengeId);
    if (challengeDef) {
      const current = stats.weeklyChallenge[challengeDef.statKey];
      const progress = Math.min(1, current / challengeDef.target);
      const justCompleted = !wasCompleted && progress >= 1;

      if (justCompleted) {
        stats.weeklyChallenge.completed = true;
        const challengeXP = XP_REWARDS.CHALLENGE_COMPLETED;
        xpGains.push({ source: "challenge", amount: challengeXP, label: "Weekly challenge completed!" });
        totalXPGained += challengeXP;
        stats.totalXP += challengeXP;
      }

      challengeResult = { challenge: challengeDef, progress, completed: stats.weeklyChallenge.completed, justCompleted };
    }
  }

  // 8. Check level up
  const newLevel = levelFromXP(stats.totalXP);
  const leveledUp = newLevel > previousLevel;

  if (leveledUp) {
    xpGains.push({
      source: "level-up",
      amount: 0,
      label: `Level Up! → Level ${newLevel} ${titleForLevel(newLevel)}`,
      isLevelUp: true,
      newLevel,
    });
  }

  // 9. Check achievements
  const newAchievements = checkAchievements(stats);

  // Achievement XP bonus
  for (const ach of newAchievements) {
    const achXP = 75;
    xpGains.push({ source: "achievement", amount: achXP, label: `${ach.title} unlocked!` });
    totalXPGained += achXP;
    stats.totalXP += achXP;
  }

  // 10. Save
  saveGamificationStats(stats);

  return {
    xpGains,
    totalXPGained,
    newLevel: levelFromXP(stats.totalXP), // Recalculate after achievement XP
    previousLevel,
    leveledUp: levelFromXP(stats.totalXP) > previousLevel,
    newAchievements,
    streakUpdated,
    newStreak: stats.currentStreak,
    challengeProgress: challengeResult,
  };
}

/** Award XP for non-workout actions (metrics logging, template creation) */
export function awardMiscXP(source: "metric" | "template"): XPGainEvent[] {
  const stats = loadGamificationStats();
  const amount = source === "metric" ? XP_REWARDS.METRIC_LOGGED : XP_REWARDS.TEMPLATE_CREATED;
  const previousLevel = levelFromXP(stats.totalXP);

  stats.totalXP += amount;
  const newLevel = levelFromXP(stats.totalXP);

  const events: XPGainEvent[] = [
    { source, amount, label: source === "metric" ? "Metrics logged" : "Template created" },
  ];

  if (newLevel > previousLevel) {
    events.push({
      source: "level-up",
      amount: 0,
      label: `Level Up! → Level ${newLevel} ${titleForLevel(newLevel)}`,
      isLevelUp: true,
      newLevel,
    });
  }

  checkAchievements(stats);
  saveGamificationStats(stats);

  return events;
}

/** Generate heatmap data for the last N weeks */
export function getHeatmapData(stats: GamificationStats, weeks: number = 12): { date: string; count: number; dayOfWeek: number }[] {
  const result: { date: string; count: number; dayOfWeek: number }[] = [];
  const today = new Date();
  const totalDays = weeks * 7;
  const dateSet = new Set(stats.workoutDates);

  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    result.push({
      date: dateStr,
      count: dateSet.has(dateStr) ? 1 : 0,
      dayOfWeek: d.getDay(),
    });
  }

  return result;
}

/** Check current streak status (call on app load to detect broken streaks) */
export function getCurrentStreakStatus(stats: GamificationStats): { current: number; best: number; isActive: boolean; daysUntilBreak: number } {
  if (!stats.lastWorkoutDate) {
    return { current: 0, best: stats.bestStreak, isActive: false, daysUntilBreak: 0 };
  }

  const today = new Date(todayStr());
  const lastDate = new Date(stats.lastWorkoutDate);
  const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays > 1) {
    // Streak is broken but not yet recorded
    return { current: 0, best: stats.bestStreak, isActive: false, daysUntilBreak: 0 };
  }

  const isToday = diffDays === 0;
  return {
    current: stats.currentStreak,
    best: stats.bestStreak,
    isActive: true,
    daysUntilBreak: isToday ? 1 : 0, // 0 = must work out today to keep streak
  };
}

/** Play a satisfying set completion sound */
export function playSetCompletionSound(): void {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Quick satisfying "ding"
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(1318.5, ctx.currentTime + 0.08); // E6

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Ignore audio errors
  }
}

/** Play a triumphant level-up fanfare */
export function playLevelUpFanfare(): void {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const playNote = (freq: number, start: number, dur: number, vol = 0.18, type: OscillatorType = "sine") => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    };

    // Ascending arpeggio: C5 → E5 → G5 → C6 (major chord)
    playNote(523.25, 0.0, 0.25, 0.15);
    playNote(659.25, 0.12, 0.25, 0.17);
    playNote(783.99, 0.24, 0.3, 0.19);
    playNote(1046.5, 0.38, 0.6, 0.22);
    // High shimmer
    playNote(2093.0, 0.38, 0.4, 0.08, "triangle");
  } catch {
    // Ignore audio errors
  }
}

/** Generate confetti particles data (for rendering in React) */
export function generateConfettiParticles(count: number = 40): { id: number; x: number; y: number; rotation: number; scale: number; color: string; delay: number }[] {
  const colors = ["#38bdf8", "#22d3ee", "#2dd4bf", "#f59e0b", "#ef4444", "#ec4899", "#a855f7", "#84cc16", "#f97316"];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -(Math.random() * 30 + 10),
    rotation: Math.random() * 360,
    scale: 0.5 + Math.random() * 1,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: Math.random() * 0.6,
  }));
}
