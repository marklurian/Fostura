"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { playSetCompletionSound } from "@/lib/gamification";

const ROTATING_PHRASES = [
  "Precision Growth.",
  "Maximum Muscle.",
  "Flawless Progression.",
  "Peak Performance.",
  "Scientific Gains.",
  "Zero Guesswork.",
];

function RotatingHeadline() {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      // 1. Fade out
      setFade(false);

      // 2. Change phrase and Fade in after fade-out window
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % ROTATING_PHRASES.length);
        setFade(true);
      }, 450);
    }, 3200);

    return () => clearInterval(interval);
  }, []);

  return (
    <span className="relative inline-flex items-center justify-center px-1">
      {/* Razor-Sharp, High-Contrast Neon Cyan Headline with Zero Blur */}
      <span
        className={`inline-block font-black text-[#38bdf8] transition-all duration-400 ease-in-out whitespace-nowrap tracking-tight ${
          fade
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-2"
        }`}
      >
        {ROTATING_PHRASES[index]}
      </span>
    </span>
  );
}

function ScrollReveal({
  children,
  animation = "fade-up",
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  animation?: "fade-up" | "fade-left" | "fade-right" | "zoom-in" | "glow";
  delay?: number;
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  const getAnimationClass = () => {
    if (!isVisible) {
      switch (animation) {
        case "fade-up":
          return "opacity-0 translate-y-12 blur-sm";
        case "fade-left":
          return "opacity-0 -translate-x-12 blur-sm";
        case "fade-right":
          return "opacity-0 translate-x-12 blur-sm";
        case "zoom-in":
          return "opacity-0 scale-90 blur-sm";
        case "glow":
          return "opacity-0 scale-95 blur-md";
        default:
          return "opacity-0 translate-y-8";
      }
    }
    return "opacity-100 translate-y-0 translate-x-0 scale-100 blur-none";
  };

  return (
    <div
      ref={ref}
      style={{
        transitionDuration: "800ms",
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        transitionDelay: `${delay}ms`,
      }}
      className={`transition-all ${getAnimationClass()} ${className}`}
    >
      {children}
    </div>
  );
}

function InteractiveDeepDive() {
  const [activeTab, setActiveTab] = useState<"routine" | "coach" | "telemetry">("routine");
  const [selectedSplit, setSelectedSplit] = useState<"ppl" | "upper" | "full">("ppl");

  const splitData = {
    ppl: {
      title: "Push / Pull / Legs Hypertrophy Split",
      tag: "Optimal Frequency • 6-Day Microcycle",
      exercises: [
        { name: "Incline Barbell Bench Press", muscle: "Upper Chest", sets: "3 × 8–10", rpe: "8.5", load: "195 lbs" },
        { name: "Weighted Dips", muscle: "Lower Chest & Triceps", sets: "3 × 10–12", rpe: "8.0", load: "+45 lbs" },
        { name: "Seated Cable Flyes", muscle: "Sternal Pecs", sets: "3 × 12–15", rpe: "9.0", load: "35 lbs" },
        { name: "Overhead DB Triceps Ext", muscle: "Triceps Long Head", sets: "4 × 12", rpe: "8.5", load: "65 lbs" },
      ],
      aiScore: "99.4%",
      volumeTonnage: "14,280 lbs",
    },
    upper: {
      title: "Upper Body Strength & Density",
      tag: "High Intensity • 4-Day Microcycle",
      exercises: [
        { name: "Barbell Overhead Press", muscle: "Anterior Delts", sets: "4 × 6–8", rpe: "8.5", load: "135 lbs" },
        { name: "Weighted Pull-Ups", muscle: "Latissimus Dorsi", sets: "4 × 6–8", rpe: "9.0", load: "+30 lbs" },
        { name: "Barbell Bent-Over Row", muscle: "Mid-Back & Rhomboids", sets: "3 × 8", rpe: "8.0", load: "185 lbs" },
        { name: "Incline DB Curl", muscle: "Biceps Brachii", sets: "3 × 12", rpe: "8.5", load: "35 lbs" },
      ],
      aiScore: "98.8%",
      volumeTonnage: "16,100 lbs",
    },
    full: {
      title: "Full Body Functional Power",
      tag: "Max Efficiency • 3-Day Microcycle",
      exercises: [
        { name: "Barbell Back Squat", muscle: "Quadriceps & Glutes", sets: "4 × 6", rpe: "8.5", load: "275 lbs" },
        { name: "Romanian Deadlift", muscle: "Hamstrings & Lower Back", sets: "3 × 8", rpe: "8.0", load: "225 lbs" },
        { name: "Incline Dumbbell Press", muscle: "Upper Chest", sets: "3 × 10", rpe: "8.5", load: "80 lbs" },
        { name: "Hanging Leg Raise", muscle: "Core & Hip Flexors", sets: "3 × 15", rpe: "9.0", load: "BW" },
      ],
      aiScore: "99.1%",
      volumeTonnage: "19,850 lbs",
    },
  };

  const currentSplit = splitData[selectedSplit];

  return (
    <section className="py-16 px-4 sm:px-8 max-w-7xl mx-auto z-10 relative">
      <div className="rounded-3xl border border-cyan-400/30 bg-gradient-to-b from-[#051126]/90 via-[#030a1a]/95 to-[#020613] p-6 sm:p-10 shadow-2xl backdrop-blur-2xl space-y-8">
        {/* Top Header & Tab Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/[0.08]">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400 flex items-center gap-1.5 mb-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              <span>LIVE AI INTERACTIVE EXPERIENCE</span>
            </span>
            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Test-drive the Fostura Intelligence Engine
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl">
              Switch between interactive telemetry modes to see how Fostura transforms routine architecture and progression.
            </p>
          </div>

          {/* Interactive Mode Tabs */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/[0.04] border border-white/10 self-start md:self-auto overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab("routine")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all button-press ${
                activeTab === "routine"
                  ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-cyan-500/25"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              <span>AI Architect</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("coach")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all button-press ${
                activeTab === "coach"
                  ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-cyan-500/25"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-.774-.954c.264-.954.512-1.928.484-2.903C3.654 15.656 3 13.918 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              <span>Live Coach AI</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("telemetry")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all button-press ${
                activeTab === "telemetry"
                  ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-cyan-500/25"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
              <span>Telemetry Matrix</span>
            </button>
          </div>
        </div>

        {/* Tab 1: AI Architect */}
        {activeTab === "routine" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-lg font-black text-white">{currentSplit.title}</h4>
                  <p className="text-xs text-cyan-300 font-semibold">{currentSplit.tag}</p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedSplit("ppl")}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      selectedSplit === "ppl"
                        ? "bg-cyan-500/20 border border-cyan-400 text-cyan-200"
                        : "bg-white/5 text-slate-300 border border-white/10 hover:text-white"
                    }`}
                  >
                    PPL Hypertrophy
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSplit("upper")}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      selectedSplit === "upper"
                        ? "bg-cyan-500/20 border border-cyan-400 text-cyan-200"
                        : "bg-white/5 text-slate-300 border border-white/10 hover:text-white"
                    }`}
                  >
                    Upper / Lower
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSplit("full")}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      selectedSplit === "full"
                        ? "bg-cyan-500/20 border border-cyan-400 text-cyan-200"
                        : "bg-white/5 text-slate-300 border border-white/10 hover:text-white"
                    }`}
                  >
                    Full Body Power
                  </button>
                </div>
              </div>

              {/* Exercise Telemetry Grid */}
              <div className="space-y-2">
                {currentSplit.exercises.map((ex, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-cyan-400/40 hover:bg-white/[0.05] transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-xs font-black text-cyan-300">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-black text-white truncate">{ex.name}</p>
                        <p className="text-[10px] text-slate-300 truncate">{ex.muscle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="px-2.5 py-1 rounded-lg bg-sky-950/60 border border-sky-400/30 font-mono text-xs font-black text-sky-200">
                        {ex.sets}
                      </span>
                      <span className="hidden sm:inline-block px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-mono text-xs text-slate-200">
                        {ex.load}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold text-teal-300 bg-teal-500/15 border border-teal-400/30">
                        RPE {ex.rpe}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar Summary Card */}
            <div className="rounded-2xl bg-gradient-to-b from-sky-950/60 via-[#061838]/80 to-cyan-950/50 border border-cyan-400/40 p-5 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400 block mb-1">
                  ARCHITECT TELEMETRY SPECS
                </span>
                <h5 className="text-lg font-black text-white">Split Optimization</h5>

                <div className="mt-4 space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-200 mb-1">
                      <span>Biomechanical Fit</span>
                      <span className="text-cyan-300 font-mono">{currentSplit.aiScore}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-sky-400 to-cyan-300 rounded-full" style={{ width: currentSplit.aiScore }} />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#030914]/80 border border-white/10 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Est. Microcycle Volume</span>
                    <span className="text-xl font-black text-white font-mono">{currentSplit.volumeTonnage}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-xs text-cyan-100 leading-relaxed">
                    <span className="text-cyan-300 font-bold uppercase text-[10px] tracking-wider block mb-0.5">Note:</span> Frequency calibrated for 48h myofibrillar protein synthesis reset between overlapping motor units.
                  </div>
                </div>
              </div>

              <Link
                href="/dashboard"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-xs font-black text-white shadow-lg shadow-cyan-500/25 button-press hover:opacity-95"
              >
                <span>Launch in Fostura Studio</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        )}

        {/* Tab 2: Live Coach AI */}
        {activeTab === "coach" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            <div className="lg:col-span-2 rounded-2xl bg-[#030917]/90 border border-white/10 p-5 space-y-4 shadow-inner">
              <div className="flex items-center gap-3 pb-3 border-b border-white/[0.08]">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-.774-.954c.264-.954.512-1.928.484-2.903C3.654 15.656 3 13.918 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <span>Coach Fostura Dialogue Simulation</span>
                    <span className="px-2 py-0.2 rounded text-[8px] font-bold text-cyan-300 bg-cyan-500/20">LIVE</span>
                  </h4>
                  <p className="text-[10px] text-slate-300">Contextual sports nutritionist & biomechanics expert</p>
                </div>
              </div>

              <div className="space-y-3 text-xs leading-relaxed max-h-80 overflow-y-auto pr-1">
                <div className="flex justify-end">
                  <div className="bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-2xl rounded-tr-sm p-3.5 max-w-[85%] font-medium">
                    How should I progress my Incline Bench Press weight today?
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="liquid-glass border border-cyan-400/30 text-slate-200 rounded-2xl rounded-tl-sm p-4 max-w-[88%] space-y-2 shadow-lg">
                    <p className="font-bold text-cyan-300 text-xs">Coach Fostura:</p>
                    <p>
                      Looking at your past logs, you crushed <strong className="text-white">190 lbs × 8 reps</strong> at RPE 8.0 last week with pristine bar velocity.
                    </p>
                    <p>
                      Today, let&apos;s apply <strong className="text-white">double progressive overload</strong>:
                    </p>
                    <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/25 space-y-1 text-[11px]">
                      <p>• <strong>Set 1:</strong> 195 lbs × 8 reps (Target +5 lbs PR)</p>
                      <p>• <strong>Set 2:</strong> 195 lbs × 6–8 reps</p>
                      <p>• <strong>Set 3:</strong> 185 lbs × 8–10 reps (Back-off volume)</p>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Focus on a 2-second controlled negative and driving your heels into the floor. Ready to lock it in?
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-b from-sky-950/60 to-cyan-950/40 border border-cyan-400/30 p-5 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400 block mb-1">
                  1-ON-1 AI TRAINER
                </span>
                <h5 className="text-lg font-black text-white">No Robotic Walls of Text</h5>
                <p className="text-xs text-slate-300 leading-relaxed mt-2">
                  Coach Fostura talks like an elite trainer texting you between sets. Instant answers on meal recipes, macro targets, and form cues.
                </p>

                <div className="mt-4 space-y-2">
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[11px] text-slate-200 flex items-center gap-2">
                    <svg className="h-3.5 w-3.5 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    <span>Actionable high-protein meal recipes</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[11px] text-slate-200 flex items-center gap-2">
                    <svg className="h-3.5 w-3.5 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <span>Scientifically timed rest intervals</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[11px] text-slate-200 flex items-center gap-2">
                    <svg className="h-3.5 w-3.5 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                    </svg>
                    <span>Multi-turn contextual conversation memory</span>
                  </div>
                </div>
              </div>

              <Link
                href="/dashboard"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-xs font-black text-white shadow-lg shadow-cyan-500/25 button-press hover:opacity-95"
              >
                <span>Chat with Coach Fostura</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        )}

        {/* Tab 3: Telemetry Matrix */}
        {activeTab === "telemetry" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="liquid-glass rounded-2xl p-3.5 border border-white/10">
                  <span className="text-[9px] uppercase font-bold text-slate-400">Total Tonnage</span>
                  <p className="text-xl font-black text-white mt-1 font-mono">18,450 lbs</p>
                  <p className="text-[10px] text-emerald-400 font-bold mt-0.5">↑ 12.4% vs last week</p>
                </div>
                <div className="liquid-glass rounded-2xl p-3.5 border border-white/10">
                  <span className="text-[9px] uppercase font-bold text-slate-400">Sets Completed</span>
                  <p className="text-xl font-black text-cyan-300 mt-1 font-mono">32 Sets</p>
                  <p className="text-[10px] text-sky-300 font-bold mt-0.5">100% Target Hit</p>
                </div>
                <div className="liquid-glass rounded-2xl p-3.5 border border-white/10">
                  <span className="text-[9px] uppercase font-bold text-slate-400">Average RIR</span>
                  <p className="text-xl font-black text-teal-300 mt-1 font-mono">1.8 RIR</p>
                  <p className="text-[10px] text-teal-400 font-bold mt-0.5">Optimal Fatigue</p>
                </div>
                <div className="liquid-glass rounded-2xl p-3.5 border border-white/10">
                  <span className="text-[9px] uppercase font-bold text-slate-400">Active Streak</span>
                  <p className="text-xl font-black text-amber-300 mt-1 font-mono">5 Days</p>
                  <p className="text-[10px] text-amber-400 font-bold mt-0.5">Consistent</p>
                </div>
              </div>

              {/* Volume Velocity Progression Visualizer */}
              <div className="rounded-2xl bg-[#030917]/90 border border-white/10 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-cyan-300 tracking-wider">
                      Movement Volume Distribution
                    </span>
                    <h5 className="text-sm font-bold text-white">Compound Lift Progression Curve</h5>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30">
                    +14.2% Growth Velocity
                  </span>
                </div>

                <div className="space-y-2 pt-2">
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-200 mb-1">
                      <span>Chest & Anterior Delts (Incline Bench)</span>
                      <span className="font-mono text-cyan-300">6,840 lbs (37%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full" style={{ width: "37%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-200 mb-1">
                      <span>Back & Upper Latissimus (Cable Rows)</span>
                      <span className="font-mono text-sky-300">5,920 lbs (32%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-sky-400 to-teal-300 rounded-full" style={{ width: "32%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-200 mb-1">
                      <span>Triceps & Medial Delts (Accessories)</span>
                      <span className="font-mono text-teal-300">5,690 lbs (31%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full" style={{ width: "31%" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-b from-sky-950/60 to-cyan-950/40 border border-cyan-400/30 p-5 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-teal-400 block mb-1">
                  REAL-TIME METRIC LOGGING
                </span>
                <h5 className="text-lg font-black text-white">Automated PR Alerts</h5>
                <p className="text-xs text-slate-300 leading-relaxed mt-2">
                  Never forget your numbers again. All set metrics, tonnage totals, and personal records automatically sync to your private cloud storage with Supabase.
                </p>

                <div className="mt-4 p-3 rounded-xl bg-[#030914]/80 border border-white/10 space-y-1 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Recent Milestone</span>
                  <p className="font-black text-white flex items-center gap-1.5 text-xs">
                    <svg className="h-4 w-4 text-cyan-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.003 0H9.497m5.003 0A3.375 3.375 0 0 0 17.875 12V6.75A2.25 2.25 0 0 0 15.625 4.5h-7.25A2.25 2.25 0 0 0 6.125 6.75V12a3.375 3.375 0 0 0 3.372 3.375" />
                    </svg>
                    <span>Incline Bench: 195 lbs × 8 (New PR)</span>
                  </p>
                </div>
              </div>

              <Link
                href="/history"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-xs font-black text-white shadow-lg shadow-cyan-500/25 button-press hover:opacity-95"
              >
                <span>View Full History Portal</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ComparisonShowcase() {
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "ai" | "progression" | "cost"
  >("all");

  const comparisonData = [
    {
      category: "ai",
      feature: "Routine Generation",
      traditional: {
        title: "Static Cookie-Cutter PDFs",
        desc: "Rigid templates that ignore individual muscle recovery, equipment access, or previous session fatigue.",
      },
      fostura: {
        title: "Groq Llama 3.3 AI Architect",
        desc: "Sub-second physiological periodization tailored to your exact target muscle focus, available gear, and recovery state.",
        badge: "Adaptive",
      },
    },
    {
      category: "progression",
      feature: "Progressive Overload",
      traditional: {
        title: "Manual Mental Math",
        desc: "You must memorize previous sets and calculate target jumps manually, leading to premature plateaus.",
      },
      fostura: {
        title: "Automated +5 lbs Overload Targets",
        desc: "Prescriptive double-progression algorithms calculate your exact load and rep goals before you unrack the weight.",
        badge: "Prescriptive",
      },
    },
    {
      category: "progression",
      feature: "Form & Biomechanics",
      traditional: {
        title: "Blind Set Logging",
        desc: "Zero real-time cues during sets; static stock illustrations that offer no practical bar-path or joint angle advice.",
      },
      fostura: {
        title: "Live Contextual Biomechanical Cues",
        desc: "Real-time actionable cues (e.g. elbow angles, controlled eccentrics) delivered right inside your active set logging HUD.",
        badge: "Real-Time",
      },
    },
    {
      category: "progression",
      feature: "Rest Interval Management",
      traditional: {
        title: "Basic Dumb Stopwatches",
        desc: "Generic 60-second countdowns that treat heavy deadlifts the same as light bicep curls.",
      },
      fostura: {
        title: "Metabolic ATP Timers",
        desc: "Scientifically calibrated rest intervals based on movement intensity, motor unit recruitment, and target RIR.",
        badge: "Calibrated",
      },
    },
    {
      category: "cost",
      feature: "Cost & Access",
      traditional: {
        title: "Recurring Monthly Paywalls",
        desc: "Basic logging, historical charts, and routine templates locked behind $15–$30/month subscription barriers.",
      },
      fostura: {
        title: "Free Forever with Cloud Sync",
        desc: "Unlimited AI generation, real-time telemetry, PR tracking, and encrypted Supabase cloud synchronization at no cost.",
        badge: "Free Access",
      },
    },
  ];

  const filteredData =
    selectedCategory === "all"
      ? comparisonData
      : comparisonData.filter((item) => item.category === selectedCategory);

  return (
    <section id="comparison" className="py-24 px-4 sm:px-8 max-w-7xl mx-auto z-10 relative">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-cyan-400 block mb-3">
          FOSTURA VS. TRADITIONAL WORKOUT APPS
        </span>
        <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight">
          Engineered for athletes who outgrew generic spreadsheets.
        </h2>
        <p className="text-sm sm:text-base text-slate-300 mt-4 leading-relaxed max-w-2xl mx-auto">
          Most workout apps are just digitized spiral notebooks with expensive paywalls. Fostura is an active biomechanical intelligence system.
        </p>

        {/* Category Filter Chips */}
        <div className="flex items-center justify-center gap-2 mt-8 flex-wrap">
          {[
            { id: "all", label: "All Comparisons" },
            { id: "ai", label: "AI Routine Architecture" },
            { id: "progression", label: "Live Overload & Form Cues" },
            { id: "cost", label: "Cost & Cloud Freedom" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedCategory(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all button-press ${
                selectedCategory === tab.id
                  ? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/60 shadow-md shadow-cyan-500/20"
                  : "bg-white/5 text-slate-400 border border-white/10 hover:text-white hover:bg-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Arena: Dual Side-by-Side Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        {/* Left Side: Traditional Workout Apps (Sleek Neutral Slate) */}
        <div className="rounded-3xl p-6 sm:p-8 bg-slate-900/40 border border-white/10 backdrop-blur-2xl flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between pb-6 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.06] border border-white/10 text-slate-400 text-sm font-bold">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-200">The Traditional Way</h4>
                  <p className="text-xs text-slate-400 font-medium">Standard Loggers & Cookie-Cutter Apps</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/10 text-slate-400 text-[10px] font-bold">
                Legacy Method
              </span>
            </div>

            <div className="space-y-4 pt-6">
              {filteredData.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      {item.feature}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08]">
                      Manual
                    </span>
                  </div>
                  <h5 className="text-sm font-bold text-slate-300">
                    {item.traditional.title}
                  </h5>
                  <p className="text-xs text-slate-400 leading-relaxed font-normal">
                    {item.traditional.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-xs text-slate-400 flex items-center gap-3">
            <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <span>Creates tracking friction, plateaus, and unnecessary subscription overhead.</span>
          </div>
        </div>

        {/* Right Side: The Fostura AI Advantage */}
        <div className="relative rounded-3xl p-1 bg-gradient-to-b from-cyan-400/40 via-sky-500/15 to-transparent shadow-[0_0_50px_rgba(56,189,248,0.2)] flex flex-col">
          <div className="rounded-[22px] bg-[#030c22]/95 border border-cyan-400/30 p-6 sm:p-8 backdrop-blur-2xl flex-1 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-cyan-400/20">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-sm font-bold shadow-[0_0_20px_rgba(56,189,248,0.35)]">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-white flex items-center gap-2">
                      <span>Fostura AI Studio</span>
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/25 border border-cyan-400/40 text-cyan-300 text-[10px] font-extrabold">
                        NEW
                      </span>
                    </h4>
                    <p className="text-xs text-cyan-300 font-semibold">Active Biomechanical Intelligence</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 text-[10px] font-extrabold shadow-sm shadow-cyan-500/20">
                  The Modern Standard
                </span>
              </div>

              <div className="space-y-4 pt-6">
                {filteredData.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/30 to-sky-950/20 border border-cyan-400/30 hover:border-cyan-400/60 transition-all space-y-1.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400">
                        {item.feature}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-[10px] font-extrabold">
                        {item.fostura.badge}
                      </span>
                    </div>
                    <h5 className="text-sm font-black text-white flex items-center gap-2">
                      <svg className="h-4 w-4 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      <span>{item.fostura.title}</span>
                    </h5>
                    <p className="text-xs text-slate-200 leading-relaxed font-medium">
                      {item.fostura.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-cyan-950/60 border border-cyan-400/40 text-xs text-cyan-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="font-bold">Zero guesswork. Scientifically optimized growth.</span>
              </div>
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 text-[11px] font-black text-white shadow-md shadow-cyan-500/20 hover:scale-105 transition-transform"
              >
                Try Free →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Impact Pillars Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-center sm:text-left">
          <div className="text-2xl font-mono font-black text-cyan-300">01. Sub-Second Speed</div>
          <h5 className="text-base font-bold text-white">Instant AI Periodization</h5>
          <p className="text-xs text-slate-400 leading-relaxed">
            Generate complex periodized splits calibrated to your muscle focus and available equipment in under 2 seconds.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-center sm:text-left">
          <div className="text-2xl font-mono font-black text-cyan-300">02. Precision Progression</div>
          <h5 className="text-base font-bold text-white">+14.2% Growth Velocity</h5>
          <p className="text-xs text-slate-400 leading-relaxed">
            Eliminate plateaus with automated double-progression targets and live form cues tailored to every set.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-center sm:text-left">
          <div className="text-2xl font-mono font-black text-cyan-300">03. $0 Forever</div>
          <h5 className="text-base font-bold text-white">Zero Subscription Paywalls</h5>
          <p className="text-xs text-slate-400 leading-relaxed">
            Full access to Groq AI routine generation, telemetry analytics, PR portals, and encrypted Supabase cloud backup.
          </p>
        </div>
      </div>
    </section>
  );
}

function GamificationShowcase() {
  const [demoXP, setDemoXP] = useState(680);
  const [demoCombo, setDemoCombo] = useState(3);
  const [demoToasts, setDemoToasts] = useState<{ id: string; text: string }[]>([]);

  const handleSimulateSet = () => {
    try {
      playSetCompletionSound();
    } catch {
      // Audio autoplay policy
    }
    setDemoXP((prev) => prev + 10);
    setDemoCombo((prev) => prev + 1);
    const id = `toast-${Date.now()}`;
    setDemoToasts((prev) => [...prev, { id, text: `+10 XP` }]);
    setTimeout(() => {
      setDemoToasts((prev) => prev.filter((t) => t.id !== id));
    }, 1400);
  };

  const level = Math.floor(Math.sqrt(demoXP / 100));
  const currentLevelXP = level * level * 100;
  const nextLevelXP = (level + 1) * (level + 1) * 100;
  const xpInLevel = demoXP - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  const progress = Math.min(1, xpInLevel / xpNeeded);

  const demoBadges = [
    { id: "sword", title: "First Blood", desc: "Completed first workout", unlocked: true },
    { id: "flame", title: "On Fire", desc: "7-day streak maintained", unlocked: true },
    { id: "bolt", title: "Centurion", desc: "100 total sets logged", unlocked: true },
    { id: "crown", title: "Olympian", desc: "Reach Level 7 athlete", unlocked: false },
  ];

  return (
    <section id="gamification" className="py-24 px-4 sm:px-8 max-w-7xl mx-auto z-10 relative">
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-400/40 bg-amber-500/10 text-amber-300 text-xs font-black uppercase tracking-widest">
          <svg className="h-3.5 w-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.003 0H9.497m5.003 0A4.5 4.5 0 0 0 18 9.75V4.5H6v5.25a4.5 4.5 0 0 0 3.497 4.5m4.006 0A2.25 2.25 0 0 1 12 16.5a2.25 2.25 0 0 1-1.5-.75" />
          </svg>
          <span>Progression Matrix</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          Train Like an RPG Hero.{" "}
          <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-transparent">
            Never Lose Motivation Again.
          </span>
        </h2>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          Every completed set awards live XP, consecutive days ignite streak multipliers, and personal records trigger epic victory fanfares. Working out has never been this addictive.
        </p>
      </div>

      {/* Interactive Live Demo Card & Feature Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: Interactive Simulated HUD Card */}
        <div className="lg:col-span-6 relative">
          <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-amber-950/20 via-[#061226]/90 to-[#020817] border border-amber-400/30 shadow-[0_0_50px_rgba(245,158,11,0.15)] backdrop-blur-xl space-y-6 overflow-hidden">
            <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

            {/* Simulated Live Toast */}
            {demoToasts.map((t) => (
              <div
                key={t.id}
                className="absolute top-4 right-4 z-20 animate-xp-float pointer-events-none px-3 py-1.5 rounded-xl bg-amber-500/25 border border-amber-400/50 text-amber-200 font-black text-xs shadow-lg backdrop-blur-md"
              >
                {t.text}
              </div>
            ))}

            {/* Level & Title Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-500/30 to-orange-500/15 text-amber-300 font-black text-2xl shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                  {level}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-black text-white">Gladiator</h4>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-[10px] font-black text-amber-300">
                      Level {level}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    {demoXP} Total XP • {xpInLevel}/{xpNeeded} to Level {level + 1}
                  </p>
                </div>
              </div>

              {demoCombo >= 3 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/20 border border-orange-400/40 text-orange-300 animate-combo-pop">
                  <svg className="h-3.5 w-3.5 text-orange-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                  </svg>
                  <span className="text-xs font-black">{demoCombo}x Combo</span>
                </div>
              )}
            </div>

            {/* XP Progress Bar */}
            <div className="space-y-1.5">
              <div className="h-3 w-full rounded-full bg-white/5 overflow-hidden border border-white/10 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 transition-all duration-500 relative"
                  style={{ width: `${progress * 100}%` }}
                >
                  <div className="absolute inset-0 animate-trophy-shimmer rounded-full" />
                </div>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                <span>Rank Tier {level}</span>
                <span>{Math.round(progress * 100)}% Next Tier</span>
              </div>
            </div>

            {/* Badges Preview */}
            <div className="pt-2 border-t border-white/[0.08]">
              <div className="flex items-center justify-between mb-3 text-xs font-bold text-slate-400">
                <span>Recent Trophy Unlocks</span>
                <Link href="/profile" className="text-cyan-400 hover:underline">
                  View Trophy Room →
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {demoBadges.map((b, i) => (
                  <div
                    key={i}
                    className={`flex flex-col items-center p-2.5 rounded-xl border text-center transition-all ${
                      b.unlocked
                        ? "bg-amber-500/10 border-amber-400/30 text-amber-200"
                        : "bg-white/[0.02] border-white/5 text-slate-500 opacity-50"
                    }`}
                  >
                    <div className="h-5 w-5 mb-1 flex items-center justify-center">
                      {b.id === "sword" && <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75 16.5 12l5.25-5.25m-6 3 3-3m-6 3-6 6a2.25 2.25 0 0 1-3.182 0l-.318-.318a2.25 2.25 0 0 1 0-3.182l6-6m3.5 6.5-3.5-3.5" /></svg>}
                      {b.id === "flame" && <svg className="h-4 w-4 text-orange-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" /></svg>}
                      {b.id === "bolt" && <svg className="h-4 w-4 text-teal-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" /></svg>}
                      {b.id === "crown" && <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.003 0H9.497m5.003 0A4.5 4.5 0 0 0 18 9.75V4.5H6v5.25a4.5 4.5 0 0 0 3.497 4.5m4.006 0A2.25 2.25 0 0 1 12 16.5a2.25 2.25 0 0 1-1.5-.75" /></svg>}
                    </div>
                    <span className="text-[10px] font-extrabold text-white truncate max-w-full">{b.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Try Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSimulateSet}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-orange-400 transition-all active:scale-[0.98] button-press flex items-center justify-center gap-2"
              >
                <svg className="h-4 w-4 text-amber-200" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                </svg>
                <span>Complete Set (+10 XP)</span>
                <span className="text-[10px] opacity-80">(Click to Test Live Chime & XP!)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: 4 Pillar Features */}
        <div className="lg:col-span-6 space-y-4">
          {[
            {
              id: "shield",
              title: "10 Distinct Athlete Tiers",
              desc: "From Recruit to Immortal, every set logged accumulates real XP that scales your rank. Unlock titles, badges, and bragging rights.",
              tag: "Quadratic Progression",
            },
            {
              id: "flame",
              title: "Streak Multipliers & Combos",
              desc: "Train consecutively to activate the daily streak multiplier. Hit reps in rhythm to unleash live workout combo multipliers.",
              tag: "Daily compounding",
            },
            {
              id: "trophy",
              title: "The 25+ Badge Trophy Room",
              desc: "Hunt down achievements across volume, PR milestones, night owl sessions, and endurance feats. Displayed in your personal player card.",
              tag: "Persistent hall of fame",
            },
            {
              id: "target",
              title: "Weekly Quests & Bounties",
              desc: "Every Monday brings a fresh challenge tailored to your goals. Complete the weekly objective to pocket a massive +150 XP bonus.",
              tag: "Refreshes every Monday",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-amber-400/30 hover:bg-white/[0.04] transition-all flex items-start gap-4 group"
            >
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/20 text-amber-300 shrink-0">
                {item.id === "shield" && <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>}
                {item.id === "flame" && <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" /></svg>}
                {item.id === "trophy" && <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.003 0H9.497m5.003 0A4.5 4.5 0 0 0 18 9.75V4.5H6v5.25a4.5 4.5 0 0 0 3.497 4.5m4.006 0A2.25 2.25 0 0 1 12 16.5a2.25 2.25 0 0 1-1.5-.75" /></svg>}
                {item.id === "target" && <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-3.75a5.25 5.25 0 1 0 0-10.5 5.25 5.25 0 0 0 0 10.5Zm0-2.25a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /></svg>}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-extrabold text-white">{item.title}</h4>
                  <span className="text-[9px] font-black uppercase text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 shrink-0">
                    {item.tag}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}

          <div className="pt-2 flex items-center gap-4">
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.05] border border-white/10 hover:border-amber-400/40 text-xs font-bold text-white hover:bg-white/[0.08] transition-all"
            >
              <span>Explore Trophy Room</span>
              <span className="text-amber-400">→</span>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-xs font-bold text-cyan-400 hover:underline"
            >
              <span>Launch Studio Dashboard</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [scrollProgress, setScrollProgress] = useState(0);

  // ── Scroll Progress & Parallax Telemetry ──
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        setScrollProgress((window.scrollY / totalScroll) * 100);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Auth Redirect: Automatically route logged-in users to /dashboard ──
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="min-h-screen bg-[#020713] text-slate-100 flex flex-col antialiased selection:bg-cyan-500 selection:text-white relative overflow-hidden font-sans">
      {/* ── Ambient Glowing Background Orbs ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[550px] w-[800px] rounded-full bg-gradient-to-b from-cyan-500/20 via-sky-600/10 to-transparent blur-[120px] opacity-70"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[35%] -left-40 h-[450px] w-[500px] rounded-full bg-cyan-600/10 blur-[130px] opacity-50"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[60%] -right-40 h-[500px] w-[550px] rounded-full bg-teal-500/10 blur-[140px] opacity-50"
      />

      {/* ── Grid Pattern Overlay ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"
      />

      {/* ── Top Navigation Bar with Real-Time Glowing Scroll Progress Bar ── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#030914]/80 backdrop-blur-xl transition-all">
        {/* Glowing Scroll Progress Line */}
        <div
          className="absolute bottom-0 left-0 h-[2.5px] bg-gradient-to-r from-sky-500 via-cyan-400 to-teal-300 shadow-[0_0_12px_rgba(56,189,248,0.85)] transition-all duration-100 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group button-press">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl overflow-hidden border border-cyan-400/40 bg-sky-950/50 shadow-[0_0_20px_rgba(56,189,248,0.25)] transition-all group-hover:border-cyan-300 group-hover:shadow-[0_0_30px_rgba(56,189,248,0.45)] p-1">
              <Image
                src="/forma-logo.png"
                alt="Fostura Logo"
                width={40}
                height={40}
                className="h-full w-full object-contain drop-shadow-[0_2px_10px_rgba(56,189,248,0.4)] transition-transform group-hover:scale-105"
                priority
              />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-cyan-400 ring-2 ring-[#020713]" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-black tracking-tight text-white group-hover:text-cyan-200 transition-colors leading-tight">
                Fostura
              </span>
              <span className="text-[9px] uppercase font-extrabold tracking-widest bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">
                AI Fitness Studio
              </span>
            </div>
          </Link>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <a href="#features" className="hover:text-cyan-300 transition-colors">
              Features
            </a>
            <a href="#comparison" className="hover:text-cyan-300 transition-colors">
              Why Fostura
            </a>
            <a href="#ai-studio" className="hover:text-cyan-300 transition-colors">
              AI Studio
            </a>
            <a href="#gamification" className="hover:text-cyan-300 transition-colors flex items-center gap-1">
              <span>Trophies & XP</span>
              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40">NEW</span>
            </a>
            <Link href="/profile" className="hover:text-cyan-300 transition-colors">
              Trophy Room
            </Link>
            <Link href="/history" className="hover:text-cyan-300 transition-colors">
              Workout History
            </Link>
          </nav>

          {/* Right Action / Auth Buttons */}
          <div className="flex items-center gap-3 min-h-[40px]">
            {isLoaded && !isSignedIn && (
              <>
                <SignInButton mode="modal">
                  <button
                    type="button"
                    className="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/[0.06] border border-white/10 transition-all button-press"
                  >
                    Sign In
                  </button>
                </SignInButton>

                <SignUpButton mode="modal">
                  <button
                    type="button"
                    className="relative group overflow-hidden px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-400 text-xs font-black text-white shadow-[0_0_20px_rgba(56,189,248,0.35)] hover:shadow-[0_0_30px_rgba(56,189,248,0.55)] transition-all button-press"
                  >
                    <span className="relative z-10 flex items-center gap-1.5">
                      <span>Get Started</span>
                      <span className="transition-transform group-hover:translate-x-0.5">→</span>
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-sky-400 to-teal-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </SignUpButton>
              </>
            )}

            {isLoaded && isSignedIn && (
              <>
                <Link
                  href="/dashboard"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-xs font-bold text-white shadow-md shadow-cyan-500/20 hover:opacity-95 transition-opacity button-press"
                >
                  Go to Dashboard
                </Link>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "h-8 w-8 ring-2 ring-cyan-400/40 rounded-xl",
                    },
                  }}
                />
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Landing Page Content ── */}
      <main className="flex-1">
        {/* ═══════════════════════════════════════════════════════════════
            HERO SECTION
            ═══════════════════════════════════════════════════════════════ */}
        <section className="relative pt-20 pb-20 sm:pt-28 sm:pb-32 px-4 sm:px-8 max-w-5xl mx-auto text-center z-10">
          {/* Main Headline with Animated Rotating Phrases */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-[1.12] max-w-4xl mx-auto">
            Intelligent Training.{" "}
            <span className="block mt-1 sm:mt-2">
              <RotatingHeadline />
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="mt-6 sm:mt-8 text-base sm:text-lg md:text-xl text-slate-200 max-w-2xl mx-auto leading-relaxed font-normal">
            Your 24/7 AI-powered fitness coach. Stop guessing and start building with
            perfectly optimized routines and real-time telemetry.
          </p>

          {/* Call to Action Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <SignUpButton mode="modal">
              <button
                type="button"
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-400 text-sm font-black text-white shadow-[0_0_30px_rgba(56,189,248,0.4)] hover:shadow-[0_0_45px_rgba(56,189,248,0.65)] hover:scale-[1.02] active:scale-[0.98] transition-all button-press"
              >
                <span>Start Tracking Free</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </SignUpButton>

            <Link
              href="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/15 hover:border-cyan-400/50 text-sm font-bold text-slate-100 hover:text-white transition-all button-press backdrop-blur-xl"
            >
              <span>Explore Live Studio</span>
              <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
              </svg>
            </Link>
          </div>

          {/* Micro-Features Strip */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-semibold text-slate-300">
            <div className="flex items-center gap-2">
              <svg className="h-3.5 w-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <span>100% Free Forever</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-3.5 w-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <span>77+ Biomechanical Movements</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-3.5 w-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <span>Zero Spreadsheets Needed</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-3.5 w-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <span>Cloud History & Metrics Sync</span>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            INTERACTIVE HERO DEMO PREVIEW (Glassmorphic Mockup)
            ═══════════════════════════════════════════════════════════════ */}
        <section className="px-4 sm:px-8 max-w-5xl mx-auto pb-24 z-10 relative">
          <ScrollReveal animation="glow" delay={100}>
            <div className="relative rounded-3xl p-1 bg-gradient-to-b from-cyan-400/30 via-white/10 to-transparent shadow-[0_0_50px_rgba(0,168,232,0.15)]">
              <div className="rounded-[22px] bg-[#040a17]/90 border border-white/10 p-4 sm:p-8 backdrop-blur-2xl overflow-hidden space-y-6">
                {/* Studio Header Bar */}
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                  <div className="flex items-center gap-3">
                    <span className="flex h-3 w-3 rounded-full bg-red-400/80" />
                    <span className="flex h-3 w-3 rounded-full bg-amber-400/80" />
                    <span className="flex h-3 w-3 rounded-full bg-emerald-400/80" />
                    <span className="text-xs font-mono font-bold text-slate-300 pl-2">fostura-telemetry-engine v2.4</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-[10px] font-bold">
                      LIVE HUD
                    </span>
                    <span className="text-xs font-mono text-slate-300">00:48:12</span>
                  </div>
                </div>

                {/* Mockup Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Active Movement Card */}
                  <div className="md:col-span-2 rounded-2xl bg-white/[0.03] border border-white/10 p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">Active Movement 1 of 5</span>
                        <h4 className="text-lg font-black text-white flex items-center gap-2 mt-0.5">
                          <span>Incline Barbell Bench Press</span>
                          <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-[10px] border border-cyan-400/40">
                            +5 lbs AI Target
                          </span>
                        </h4>
                      </div>
                      <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300">
                        3 / 4 sets done
                      </span>
                    </div>

                    {/* Sets Progress Table */}
                    <div className="space-y-2 text-xs">
                      <div className="grid grid-cols-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
                        <span>Set</span>
                        <span>Weight</span>
                        <span>Target Reps</span>
                        <span className="text-right">Status</span>
                      </div>
                      <div className="grid grid-cols-4 items-center bg-cyan-500/10 border border-cyan-400/30 rounded-xl px-3 py-2 text-white font-semibold">
                        <span className="text-cyan-300 font-bold">1</span>
                        <span>185 lbs</span>
                        <span>10 reps</span>
                        <span className="text-right text-emerald-400 font-bold">10 Done</span>
                      </div>
                      <div className="grid grid-cols-4 items-center bg-cyan-500/10 border border-cyan-400/30 rounded-xl px-3 py-2 text-white font-semibold">
                        <span className="text-cyan-300 font-bold">2</span>
                        <span>195 lbs</span>
                        <span>8 reps</span>
                        <span className="text-right text-emerald-400 font-bold">8 Done</span>
                      </div>
                      <div className="grid grid-cols-4 items-center bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white font-semibold">
                        <span className="text-slate-400 font-bold">3</span>
                        <span>205 lbs</span>
                        <span>6 reps</span>
                        <span className="text-right text-sky-300 animate-pulse font-bold">In Progress</span>
                      </div>
                    </div>
                  </div>

                  {/* AI Coach Live Insight Snippet */}
                  <div className="rounded-2xl bg-gradient-to-b from-sky-950/60 to-cyan-950/40 border border-cyan-400/30 p-4 sm:p-5 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-cyan-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-.774-.954c.264-.954.512-1.928.484-2.903C3.654 15.656 3 13.918 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                        </svg>
                        <span className="text-xs font-black uppercase tracking-wider text-cyan-300">Coach Fostura Live AI</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed mt-3">
                        &quot;Great tempo on Set 2! Rest 90 seconds, then focus on tucking elbows at 45° on Set 3 to maximize upper pec recruitment.&quot;
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-[#030914]/80 border border-white/10 text-[11px] text-slate-200 flex items-center justify-between">
                      <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        <span>Active Rest Timer</span>
                      </span>
                      <span className="font-mono font-bold text-white text-sm">01:14</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            FEATURE SPOTLIGHTS (Each with its own dedicated spotlight)
            ═══════════════════════════════════════════════════════════════ */}
        <section id="features" className="py-20 px-4 sm:px-8 max-w-7xl mx-auto z-10 relative space-y-28 sm:space-y-36">
          {/* Main Section Header */}
          <ScrollReveal animation="fade-up">
            <div className="text-center max-w-3xl mx-auto">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-cyan-400 block mb-3">
                ENGINEERED FOR PEAK HYPERTROPHY & STRENGTH
              </span>
              <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight">
                Every feature given its own spotlight.
              </h2>
              <p className="text-sm sm:text-base text-slate-300 mt-4 leading-relaxed max-w-2xl mx-auto">
                Precision mechanics, sports science data, and real-time biomechanics—engineered with spacious clarity.
              </p>
            </div>
          </ScrollReveal>

          {/* ══════════════════════════════════════════════════════════════
              SPOTLIGHT 1: AI STUDIO (Smart Workout Architect)
              ══════════════════════════════════════════════════════════════ */}
          <div
            id="ai-studio"
            className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center"
          >
            {/* Left: Pitch & Narrative */}
            <ScrollReveal animation="fade-right" className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-[11px] font-extrabold tracking-wider uppercase">
                <span>Spotlight 01 • Intelligent Architect</span>
              </div>

              <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-snug">
                Routines built for your exact biology, not generic PDFs.
              </h3>

              <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                Stop guessing your split. Fostura&apos;s AI analyzes your target muscle priorities, available equipment mix, and historical fatigue to generate a periodized, high-impact routine in seconds.
              </p>

              {/* Value Highlights */}
              <div className="space-y-3.5 pt-2">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs mt-0.5">
                    <svg className="h-3.5 w-3.5 text-cyan-300" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Groq Llama 3.3 Engine</h5>
                    <p className="text-xs text-slate-300 mt-0.5">Sub-second generation calibrated on exercise physiology principles.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs mt-0.5">
                    <svg className="h-3.5 w-3.5 text-cyan-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Volume & Recovery Optimization</h5>
                    <p className="text-xs text-slate-300 mt-0.5">Automatic 48-hour motor unit recovery spacing to prevent overtraining.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs mt-0.5">
                    <svg className="h-3.5 w-3.5 text-cyan-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Universal Equipment Matching</h5>
                    <p className="text-xs text-slate-300 mt-0.5">Seamless adaptation for home gyms, barbells, dumbbells, or commercial machines.</p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-xs font-black text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] transition-all button-press"
                >
                  <span>Launch Workout Architect</span>
                  <span>→</span>
                </Link>
              </div>
            </ScrollReveal>

            {/* Right: Rich Large Visual Terminal Graphic */}
            <ScrollReveal animation="fade-left" delay={150} className="lg:col-span-7">
              <div className="relative rounded-3xl p-1 bg-gradient-to-b from-cyan-400/30 via-white/10 to-transparent shadow-[0_0_50px_rgba(0,168,232,0.2)]">
                <div className="rounded-[22px] bg-[#030917]/95 border border-white/10 p-6 sm:p-8 backdrop-blur-2xl space-y-6">
                  {/* Visual Terminal Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-sm font-bold">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-xs font-black text-white block">AI Routine Generator HUD</span>
                        <span className="text-[10px] text-cyan-400 font-mono">Status: Calibrated (100% Fit)</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold">
                      ● Active Engine
                    </span>
                  </div>

                  {/* Split Selection Bar */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-xs font-black text-cyan-200 shadow-sm shadow-cyan-500/20">
                      Push / Pull / Legs (Hypertrophy)
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300">
                      Upper / Lower Split
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300">
                      Full Body Strength
                    </span>
                  </div>

                  {/* Flow Nodes Pipeline */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-cyan-400/40 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-xs font-bold text-cyan-300">
                          1
                        </span>
                        <div>
                          <p className="text-sm font-bold text-white truncate">Incline Barbell Bench Press</p>
                          <p className="text-[10px] text-slate-300">Upper Sternal Pecs • Primary Compound</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-sky-950/60 border border-sky-400/30 font-mono text-xs font-black text-cyan-200">
                          3 × 8–10
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold text-teal-300 bg-teal-500/15 border border-teal-400/30">
                          RPE 8.5
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-sky-400/40 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-xs font-bold text-sky-300">
                          2
                        </span>
                        <div>
                          <p className="text-sm font-bold text-white truncate">Weighted Chest Dips</p>
                          <p className="text-[10px] text-slate-300">Lower Pec & Triceps • Mechanical Drop</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-sky-950/60 border border-sky-400/30 font-mono text-xs font-black text-sky-200">
                          3 × 10–12
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold text-teal-300 bg-teal-500/15 border border-teal-400/30">
                          RPE 8.0
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-teal-400/40 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 text-xs font-bold text-teal-300">
                          3
                        </span>
                        <div>
                          <p className="text-sm font-bold text-white truncate">Dumbbell Lateral Raise</p>
                          <p className="text-[10px] text-slate-300">Medial Deltoids • Constant Tension</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-sky-950/60 border border-sky-400/30 font-mono text-xs font-black text-teal-200">
                          4 × 12–15
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold text-teal-300 bg-teal-500/15 border border-teal-400/30">
                          RPE 9.0
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Calibration Bar & Specs */}
                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                      <span className="font-semibold text-slate-200">Biomechanics Optimization: 100% Calibrated</span>
                    </div>
                    <span className="font-mono text-cyan-300 font-bold">480 kcal • 52 min</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              SPOTLIGHT 2: LIVE FORM & PROGRESSION (Adaptive Overload Engine)
              ══════════════════════════════════════════════════════════════ */}
          <div
            id="live-progression"
            className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center"
          >
            {/* Left: Rich Large Visual Terminal Graphic (Flipped on Desktop) */}
            <ScrollReveal animation="fade-right" delay={150} className="lg:col-span-7 order-2 lg:order-1">
              <div className="relative rounded-3xl p-1 bg-gradient-to-b from-sky-400/30 via-white/10 to-transparent shadow-[0_0_50px_rgba(14,165,233,0.2)]">
                <div className="rounded-[22px] bg-[#030917]/95 border border-white/10 p-6 sm:p-8 backdrop-blur-2xl space-y-6">
                  {/* Visual Terminal Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-300 text-sm font-bold">
                        <svg className="h-4 w-4 text-sky-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-xs font-black text-white block">Adaptive Progressive Overload Telemetry</span>
                        <span className="text-[10px] text-sky-400 font-mono">Target: Incline Bench +5 lbs PR</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 text-[10px] font-bold">
                      ● Real-Time HUD
                    </span>
                  </div>

                  {/* 3-Week Progression Overload Bar Visualizer */}
                  <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 space-y-3">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-300 block">
                      3-Week Progressive Overload Trajectory
                    </span>

                    <div className="grid grid-cols-3 gap-4 items-end h-32 pt-4 border-b border-white/[0.06] pb-3">
                      {/* Week 1 */}
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-xs font-mono text-slate-300 font-bold">185 lbs</span>
                        <div className="w-full bg-slate-700/50 rounded-t-xl h-14 transition-all" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Week 1</span>
                      </div>
                      {/* Week 2 */}
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-xs font-mono text-slate-200 font-bold">190 lbs</span>
                        <div className="w-full bg-sky-600/60 rounded-t-xl h-20 transition-all" />
                        <span className="text-[10px] font-bold text-slate-300 uppercase">Week 2</span>
                      </div>
                      {/* Today (AI Target) */}
                      <div className="flex flex-col items-center gap-1.5 relative">
                        <span className="absolute -top-6 text-[9px] font-black text-cyan-200 uppercase px-2 py-0.5 rounded-full bg-cyan-500/30 border border-cyan-400/50 whitespace-nowrap shadow-md shadow-cyan-500/30">
                          +5 lbs Target Overload
                        </span>
                        <span className="text-sm font-mono text-cyan-200 font-black">195 lbs</span>
                        <div className="w-full bg-gradient-to-t from-sky-500 via-cyan-400 to-teal-300 rounded-t-xl h-28 shadow-[0_0_25px_rgba(56,189,248,0.55)]" />
                        <span className="text-[10px] font-extrabold text-cyan-300 uppercase">Today</span>
                      </div>
                    </div>
                  </div>

                  {/* Form Cue Callout Badge */}
                  <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 shadow-inner">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.516 0c.85.493 1.508 1.333 1.508 2.316V18" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-cyan-400 block tracking-wider">
                        Live Biomechanical Form Cue
                      </span>
                      <p className="text-xs text-slate-200 font-medium">
                        Tuck elbows at 45° and maintain a 2-second controlled eccentric to maximize upper clavicular recruitment.
                      </p>
                    </div>
                  </div>

                  {/* Rest Timer & RPE Status Strip */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-xl bg-[#020713]/80 border border-white/10 flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        <span>Rest Interval</span>
                      </span>
                      <span className="font-mono font-black text-white text-sm">01:30</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#020713]/80 border border-white/10 flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        <span>Target RIR</span>
                      </span>
                      <span className="font-mono font-black text-cyan-300 text-sm">1–2 RIR</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Right: Pitch & Narrative */}
            <ScrollReveal animation="fade-left" className="lg:col-span-5 space-y-6 order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-sky-500/10 border border-sky-400/30 text-sky-300 text-[11px] font-extrabold tracking-wider uppercase">
                <span>Spotlight 02 • Adaptive Overload</span>
              </div>

              <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-snug">
                Automated progression. Zero math in the gym.
              </h3>

              <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                The hardest part of training is knowing when to push. Fostura tracks your historical weight and reps, automatically prescribing optimal progressive overload targets and biomechanical cues for every set.
              </p>

              {/* Value Highlights */}
              <div className="space-y-3.5 pt-2">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs mt-0.5">
                    <svg className="h-3.5 w-3.5 text-sky-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Double Progression Algorithms</h5>
                    <p className="text-xs text-slate-300 mt-0.5">Weight and rep targets adaptively scale as your strength capacity increases.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs mt-0.5">
                    <svg className="h-3.5 w-3.5 text-sky-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.516 0c.85.493 1.508 1.333 1.508 2.316V18" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Contextual Biomechanical Cues</h5>
                    <p className="text-xs text-slate-300 mt-0.5">Real-time posture and bar-path tips placed right where you log your sets.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs mt-0.5">
                    <svg className="h-3.5 w-3.5 text-sky-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Active Rest Timers</h5>
                    <p className="text-xs text-slate-300 mt-0.5">Scientifically calculated rest periods to optimize ATP recovery between sets.</p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-xs font-black text-white shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:scale-[1.02] transition-all button-press"
                >
                  <span>Explore Active Tracker</span>
                  <span>→</span>
                </Link>
              </div>
            </ScrollReveal>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              SPOTLIGHT 3: ADVANCED TELEMETRY (Volume & Velocity Cloud Analytics)
              ══════════════════════════════════════════════════════════════ */}
          <div
            id="telemetry"
            className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center"
          >
            {/* Left: Pitch & Narrative */}
            <ScrollReveal animation="fade-right" className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-teal-500/10 border border-teal-400/30 text-teal-300 text-[11px] font-extrabold tracking-wider uppercase">
                <span>Spotlight 03 • Deep Telemetry</span>
              </div>

              <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-snug">
                Clinical volume tracking and permanent PR history.
              </h3>

              <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                Watch your strength curve rise over time. Track total tonnage moved, microcycle completion streaks, and workout density—automatically synced to your private cloud profile with zero manual spreadsheet entry.
              </p>

              {/* Value Highlights */}
              <div className="space-y-3.5 pt-2">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-teal-500/20 border border-teal-400/40 text-teal-300 text-xs mt-0.5">
                    <svg className="h-3.5 w-3.5 text-teal-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.003 0H9.497m5.003 0A3.375 3.375 0 0 0 17.875 12V6.75A2.25 2.25 0 0 0 15.625 4.5h-7.25A2.25 2.25 0 0 0 6.125 6.75V12a3.375 3.375 0 0 0 3.372 3.375" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Automated PR Detection</h5>
                    <p className="text-xs text-slate-300 mt-0.5">Instant celebration alerts whenever you hit a new weight or rep personal record.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-teal-500/20 border border-teal-400/40 text-teal-300 text-xs mt-0.5">
                    <svg className="h-3.5 w-3.5 text-teal-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Volume Tonnage Velocity</h5>
                    <p className="text-xs text-slate-300 mt-0.5">Accurate mathematical tracking of total poundage lifted week over week.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-teal-500/20 border border-teal-400/40 text-teal-300 text-xs mt-0.5">
                    <svg className="h-3.5 w-3.5 text-teal-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z" />
                    </svg>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white">Encrypted Cloud Synchronization</h5>
                    <p className="text-xs text-slate-300 mt-0.5">Secure cloud backups powered by Supabase so your training history is always safe.</p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/history"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-400 text-xs font-black text-white shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:scale-[1.02] transition-all button-press"
                >
                  <span>View History & PR Portal</span>
                  <span>→</span>
                </Link>
              </div>
            </ScrollReveal>

            {/* Right: Rich Large Visual Terminal Graphic */}
            <ScrollReveal animation="fade-left" delay={150} className="lg:col-span-7">
              <div className="relative rounded-3xl p-1 bg-gradient-to-b from-teal-400/30 via-white/10 to-transparent shadow-[0_0_50px_rgba(45,212,191,0.2)]">
                <div className="rounded-[22px] bg-[#030917]/95 border border-white/10 p-6 sm:p-8 backdrop-blur-2xl space-y-6">
                  {/* Visual Terminal Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/20 border border-teal-400/40 text-teal-300 text-sm font-bold">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-xs font-black text-white block">Volume & Velocity Telemetry Engine</span>
                        <span className="text-[10px] text-teal-400 font-mono">Microcycle: +14.2% Growth Spike</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30 text-[10px] font-bold">
                      ● Cloud Synced
                    </span>
                  </div>

                  {/* SVG Wave Chart Area */}
                  <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-300 block">Weekly Volume Tonnage</span>
                        <span className="font-mono text-2xl font-black text-white">18,450 lbs</span>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-black">
                        +14.2% Growth Velocity
                      </span>
                    </div>

                    <div className="relative h-28 w-full overflow-hidden pt-2">
                      <svg className="h-full w-full overflow-visible" viewBox="0 0 300 80" fill="none">
                        <defs>
                          <linearGradient id="spotlightTelemetryGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M 0 65 Q 45 60, 90 45 T 180 30 T 240 18 T 300 8 L 300 80 L 0 80 Z"
                          fill="url(#spotlightTelemetryGrad)"
                        />
                        <path
                          d="M 0 65 Q 45 60, 90 45 T 180 30 T 240 18 T 300 8"
                          stroke="#2dd4bf"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                        <circle cx="300" cy="8" r="6" fill="#2dd4bf" fillOpacity="0.25" stroke="#2dd4bf" strokeWidth="1.5" />
                        <circle cx="300" cy="8" r="3.5" fill="#ffffff" />
                      </svg>
                    </div>
                  </div>

                  {/* 4-Metric Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Sets Done</span>
                      <span className="text-base font-black text-white font-mono mt-0.5 block">32 Sets</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Average RIR</span>
                      <span className="text-base font-black text-cyan-300 font-mono mt-0.5 block">1.8 RIR</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Active Streak</span>
                      <span className="text-base font-black text-amber-300 font-mono mt-0.5 block">5 Days Active</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">PRs Hit</span>
                      <span className="text-base font-black text-emerald-300 font-mono mt-0.5 block">3 New PRs</span>
                    </div>
                  </div>

                  {/* Consistency Microcycle Streak */}
                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-semibold">Weekly Consistency Tracker:</span>
                    <div className="flex gap-1.5">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, di) => {
                        const isDone = di < 5;
                        return (
                          <span
                            key={di}
                            className={`px-2 py-1 rounded-lg text-[9px] font-extrabold ${
                              isDone
                                ? "bg-teal-500/25 border border-teal-400/50 text-teal-200"
                                : "bg-white/5 text-slate-400 border border-white/5"
                            }`}
                          >
                            {d}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ── Direct Head-to-Head Comparison Showcase (Why Fostura vs. Traditional Apps) ── */}
        <ScrollReveal animation="fade-up">
          <ComparisonShowcase />
        </ScrollReveal>

        {/* ── Interactive Live Deep Dive Showcase ── */}
        <ScrollReveal animation="fade-up">
          <InteractiveDeepDive />
        </ScrollReveal>

        {/* ── Gamified Progression & Trophy Room Showcase ── */}
        <ScrollReveal animation="fade-up">
          <GamificationShowcase />
        </ScrollReveal>

        {/* ═══════════════════════════════════════════════════════════════
            CALL TO ACTION BANNER (Bottom)
            ═══════════════════════════════════════════════════════════════ */}
        <section className="py-20 px-4 sm:px-8 max-w-5xl mx-auto z-10 relative">
          <ScrollReveal animation="zoom-in">
            <div className="relative rounded-3xl p-8 sm:p-14 bg-gradient-to-r from-sky-950/70 via-[#061838]/90 to-cyan-950/70 border border-cyan-400/40 shadow-[0_0_60px_rgba(56,189,248,0.25)] backdrop-blur-2xl text-center overflow-hidden">
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-400/15 via-transparent to-transparent" />

              <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                <span className="text-xs uppercase font-extrabold tracking-widest text-cyan-300">
                  JOIN THE FUTURE OF STRENGTH TRAINING
                </span>
                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                  Ready to transform your physique with AI precision?
                </h2>
                <p className="text-xs sm:text-base text-slate-300 max-w-lg mx-auto">
                  No credit card required. Start building custom routines, tracking sets, and smashing personal records today.
                </p>

                <div className="pt-2">
                  <SignUpButton mode="modal">
                    <button
                      type="button"
                      className="px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-400 text-sm font-black text-white shadow-xl hover:shadow-[0_0_40px_rgba(56,189,248,0.6)] hover:scale-105 transition-all button-press"
                    >
                      Start Training for Free →
                    </button>
                  </SignUpButton>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.08] bg-[#020611] py-12 px-4 sm:px-8 z-10 relative">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl overflow-hidden border border-cyan-400/40 bg-sky-950/50 p-1 shadow-md shadow-cyan-500/20">
              <Image
                src="/forma-logo.png"
                alt="Fostura Logo"
                width={32}
                height={32}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-extrabold text-white">Fostura</span>
              <span className="text-[9px] uppercase font-bold text-sky-400 -mt-0.5">
                AI Fitness Studio
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs font-semibold text-slate-400">
            <Link href="/dashboard" className="hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/history" className="hover:text-white transition-colors">
              History
            </Link>
            <Link href="/profile" className="hover:text-amber-300 transition-colors">
              Trophy Room
            </Link>
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#comparison" className="hover:text-white transition-colors">
              Why Fostura
            </a>
          </div>

          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Fostura. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
