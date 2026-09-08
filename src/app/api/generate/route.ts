import Groq from "groq-sdk";

const SYSTEM_PROMPT = `You are an expert fitness coach. Create a 3-day workout plan based on the user's inputs. Return the plan in a clear, structured JSON format containing the day, exercise name, sets, and reps.

By default, the 3-day program MUST strictly follow the gold-standard PPL (Push, Pull, Legs) split:
- Day 1 - Push (Chest, Front/Side Deltoids, Triceps)
- Day 2 - Pull (Back/Lats, Biceps, Rear Deltoids)
- Day 3 - Legs & Core (Quadriceps, Hamstrings, Glutes, Calves, Core)
Unless the user explicitly requests a different split format.

You MUST respond with ONLY a valid JSON object — no markdown formatting, no code fences, no extra conversational text. Use this exact schema:

{
  "plan": [
    {
      "day": "Day 1 - Push (Chest, Shoulders, Triceps)",
      "exercises": [
        { "name": "<exercise name>", "sets": <number>, "reps": "<reps or duration>" }
      ]
    },
    {
      "day": "Day 2 - Pull (Back, Biceps, Rear Delts)",
      "exercises": [
        { "name": "<exercise name>", "sets": <number>, "reps": "<reps or duration>" }
      ]
    },
    {
      "day": "Day 3 - Legs & Core (Quads, Hamstrings, Glutes)",
      "exercises": [
        { "name": "<exercise name>", "sets": <number>, "reps": "<reps or duration>" }
      ]
    }
  ]
}

Include 4-6 exercises per day. Tailor the exercises precisely to the user's fitness goal, experience level, and available equipment:
- Lose Weight: higher reps (12-20), shorter rest, include cardio bursts
- Build Muscle: moderate reps (8-12), hypertrophy focus
- Get Lean: mix of moderate reps and HIIT-style exercises
- Strength: lower reps (3-6), compound lifts, heavier focus

Adjust complexity and exercise selection based on experience level. Only include exercises achievable with the specified equipment.`;

function cleanJsonString(str: string): string {
  let cleaned = str.trim();
  // Remove markdown code blocks if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  }
  // If there's any text before the first '{' or after the last '}', trim it
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "GROQ_API_KEY is not configured in .env.local" },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey });

    const body = await request.json();
    const { goal, experience, equipment, split = "Push / Pull / Legs (PPL)" } = body;

    // Validate inputs
    if (!goal || !experience || !equipment) {
      return Response.json(
        { error: "Missing required fields: goal, experience, equipment" },
        { status: 400 }
      );
    }

    const userMessage = `Create a 3-day workout plan for someone with the following profile:
- Fitness Goal: ${goal}
- Experience Level: ${experience}
- Equipment Available: ${equipment}
- Workout Split Format: ${split}

IMPORTANT REQUIREMENTS:
1. Split Format: Follow ${split}. If PPL, Day 1 must be Push (Chest/Shoulders/Triceps), Day 2 must be Pull (Back/Biceps/Rear Delts), and Day 3 must be Legs & Core.
2. Equipment Compatibility: Only use exercises achievable with: ${equipment}. Do NOT include barbell exercises if barbell is not selected, do NOT include cable exercises if cables are not selected, etc.
3. Sets & Reps: Precisely calibrated for ${goal} at the ${experience} level.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      model: "openai/gpt-oss-120b",
      temperature: 0.7,
      max_tokens: 2048,
    });

    const content = chatCompletion.choices[0]?.message?.content;

    if (!content) {
      return Response.json(
        { error: "No response received from the AI model." },
        { status: 502 }
      );
    }

    // Clean and parse JSON response
    const cleanedJson = cleanJsonString(content);
    const parsed = JSON.parse(cleanedJson);

    if (!parsed.plan || !Array.isArray(parsed.plan)) {
      throw new Error("Invalid plan structure in AI response.");
    }

    return Response.json(parsed);
  } catch (error: unknown) {
    console.error("Groq API error:", error);

    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
}
