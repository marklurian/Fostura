"use client";

import React from "react";
import bodyData from "./bodyData.json";

export interface MuscleGroupData {
  name: string;
  dotColor: string;
  color: string;
  hexColor: string;
  percent: number;
  sets: number;
  target?: string;
}

interface AnatomicalHumanBodyProps {
  view: "front" | "back";
  distribution: MuscleGroupData[];
  hoveredGroup: string | null;
  onHoverGroup: (group: string | null) => void;
  onClickGroup?: (group: string) => void;
}

// Map individual anatomical muscle regions to the 6 dashboard categories
const ANTERIOR_MAP: Record<string, string> = {
  chest: "Chest",
  "front-deltoids": "Shoulders",
  biceps: "Arms",
  triceps: "Arms",
  forearm: "Arms",
  abs: "Core",
  obliques: "Core",
  quadriceps: "Legs",
  calves: "Legs",
  abductors: "Legs",
  knees: "Legs",
};

const POSTERIOR_MAP: Record<string, string> = {
  trapezius: "Back",
  "upper-back": "Back",
  "lower-back": "Back",
  "back-deltoids": "Shoulders",
  triceps: "Arms",
  forearm: "Arms",
  gluteal: "Legs",
  hamstring: "Legs",
  calves: "Legs",
  adductor: "Legs",
  knees: "Legs",
  "left-soleus": "Legs",
  "right-soleus": "Legs",
};

export function AnatomicalHumanBody({
  view,
  distribution,
  hoveredGroup,
  onHoverGroup,
  onClickGroup,
}: AnatomicalHumanBodyProps) {
  const muscleMap = React.useMemo(() => {
    const map: Record<string, MuscleGroupData> = {};
    distribution.forEach((d) => {
      map[d.name] = d;
    });
    return map;
  }, [distribution]);

  // Picture 2 Signature Color Gradients
  const GRADIENTS: Record<
    string,
    { gradId: string; stroke: string; glow: string; from: string; to: string }
  > = {
    Chest: {
      gradId: "grad-chest-min",
      stroke: "#fb7185",
      glow: "rgba(244, 63, 94, 0.75)",
      from: "#f43f5e",
      to: "#fb7185",
    },
    Back: {
      gradId: "grad-back-min",
      stroke: "#38bdf8",
      glow: "rgba(56, 189, 248, 0.75)",
      from: "#0284c7",
      to: "#38bdf8",
    },
    Legs: {
      gradId: "grad-legs-min",
      stroke: "#c084fc",
      glow: "rgba(168, 85, 247, 0.75)",
      from: "#7c3aed",
      to: "#c084fc",
    },
    Shoulders: {
      gradId: "grad-shoulders-min",
      stroke: "#fbbf24",
      glow: "rgba(245, 158, 11, 0.75)",
      from: "#ea580c",
      to: "#fbbf24",
    },
    Arms: {
      gradId: "grad-arms-min",
      stroke: "#34d399",
      glow: "rgba(16, 185, 129, 0.75)",
      from: "#0d9488",
      to: "#34d399",
    },
    Core: {
      gradId: "grad-core-min",
      stroke: "#4ade80",
      glow: "rgba(34, 197, 94, 0.75)",
      from: "#16a34a",
      to: "#4ade80",
    },
  };

  const isFront = view === "front";
  const modelData = isFront ? bodyData.anteriorData : bodyData.posteriorData;
  const categoryMap = isFront ? ANTERIOR_MAP : POSTERIOR_MAP;

  // Group muscles by their category (Chest, Legs, Arms, Core, Shoulders, Back)
  // Gathering all polygons belonging to the same muscle group so they form a continuous hit target
  const { groupedMuscles, nonInteractiveMuscles } = React.useMemo(() => {
    const groups: Record<string, string[]> = {};
    const nonInteractive: { muscle: string; svgPoints: string[] }[] = [];

    modelData.forEach((item) => {
      const groupName = categoryMap[item.muscle];
      if (groupName) {
        if (!groups[groupName]) {
          groups[groupName] = [];
        }
        groups[groupName].push(...item.svgPoints);
      } else {
        nonInteractive.push(item);
      }
    });

    return { groupedMuscles: groups, nonInteractiveMuscles: nonInteractive };
  }, [modelData, categoryMap]);

  return (
    <div
      className="relative w-full max-w-[170px] sm:max-w-[195px] aspect-[100/200] flex items-center justify-center select-none group"
      onMouseLeave={() => onHoverGroup(null)}
    >
      {/* ── Sleek Minimalist Human Body Model (Clean Outline & Clutter-Free Parts) ── */}
      <svg
        viewBox="0 0 100 200"
        className="w-full h-full drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]"
        onMouseLeave={() => onHoverGroup(null)}
      >
        <defs>
          {/* Picture 2 Gradients */}
          {Object.entries(GRADIENTS).map(([name, conf]) => (
            <linearGradient
              key={conf.gradId}
              id={conf.gradId}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor={conf.from} />
              <stop offset="100%" stopColor={conf.to} />
            </linearGradient>
          ))}
        </defs>

        {/* 1. Render Non-Interactive Parts (Head & Neck) */}
        {nonInteractiveMuscles.map((item) => (
          <g
            key={item.muscle}
            id={`part-${item.muscle}`}
            className="pointer-events-none"
          >
            {item.svgPoints.map((points, pIdx) => (
              <polygon
                key={pIdx}
                points={points}
                fill="rgba(255, 255, 255, 0.02)"
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth={0.5}
                strokeLinejoin="round"
                style={{ pointerEvents: "none" }}
              />
            ))}
          </g>
        ))}

        {/* 2. Render Interactive Muscle Groups with Gap-Bridging Hit Areas */}
        {Object.entries(groupedMuscles).map(([groupName, svgPointsList]) => {
          const data = muscleMap[groupName];
          const grad = GRADIENTS[groupName];
          const isHovered = hoveredGroup === groupName;
          const isTrained = data && data.percent > 0;

          // Compute clean styling
          let fill = "rgba(255, 255, 255, 0.03)";
          let stroke = "rgba(255, 255, 255, 0.16)";
          let strokeWidth = 0.6;
          let opacity = 1;

          if (isTrained && grad) {
            // Trained muscle filled with signature gradient
            fill = `url(#${grad.gradId})`;
            if (isHovered) {
              // Hovered state: elegant saturated fill & crisp keyline border (zero blurry neon haze)
              opacity = 0.82;
              stroke = grad.stroke;
              strokeWidth = 0.95;
            } else if (hoveredGroup) {
              // Another group is hovered: dim further for focal contrast
              opacity = 0.16;
              stroke = `${grad.stroke}40`;
              strokeWidth = 0.5;
            } else {
              // Resting state: subdued lessened brightness without neon halo
              opacity = Math.max(0.24, Math.min(0.38, 0.22 + (data.percent / 100) * 0.14));
              stroke = `${grad.stroke}66`;
              strokeWidth = 0.55;
            }
          } else if (isHovered && grad) {
            // Inactive muscle on hover: subtle preview illumination without blur
            fill = `url(#${grad.gradId})`;
            opacity = 0.42;
            stroke = grad.stroke;
            strokeWidth = 0.85;
          } else if (isHovered) {
            fill = "rgba(255, 255, 255, 0.08)";
            stroke = "rgba(255, 255, 255, 0.35)";
            strokeWidth = 0.75;
          }

          return (
            <g
              key={groupName}
              id={`group-${groupName.toLowerCase()}`}
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => onHoverGroup(groupName)}
              onMouseLeave={() => onHoverGroup(null)}
              onClick={() => {
                if (onClickGroup) onClickGroup(groupName);
              }}
            >
              {/* Hit-detection bridge: covers polygons AND inter-segment dividing lines with continuous coverage */}
              {svgPointsList.map((points, pIdx) => (
                <polygon
                  key={`hit-${pIdx}`}
                  points={points}
                  fill="rgba(0, 0, 0, 0.001)"
                  stroke="rgba(0, 0, 0, 0.001)"
                  strokeWidth={3.8}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  style={{ pointerEvents: "all" }}
                />
              ))}

              {/* Visual render polygons: pristine keyline styling with preserved empty lines */}
              {svgPointsList.map((points, pIdx) => (
                <polygon
                  key={`vis-${pIdx}`}
                  points={points}
                  fill={fill}
                  fillOpacity={opacity}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  strokeLinejoin="round"
                  style={{
                    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                    pointerEvents: "none",
                  }}
                />
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
