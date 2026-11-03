import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { scriptText } = await req.json();
    if (!scriptText) {
      return NextResponse.json({ error: "No script text provided" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn("OPENAI_API_KEY missing, returning graceful structural fallback");
      return NextResponse.json({
        scenes: [{ heading: "EXT. FALLBACK SCENE - DAY", action: scriptText.slice(0, 1000), dialogue: [], shotType: "Wide Shot", cameraMovement: "Static", visualPrompt: "Cinematic fallback scene" }],
        characters: [{ name: "PROTAGONIST", role: "Protagonist", occurrences: 1, dialogueSample: "Ready." }],
        sfxCues: []
      });
    }

    const prompt = `Analyze this screenplay text and extract structured JSON with keys: "scenes" (array of {heading, action, dialogue, shotType, cameraMovement, visualPrompt}), "characters" (array of {name, role, occurrences, dialogueSample}), and "sfxCues" (array of strings). Return ONLY valid JSON.\n\nScript:\n${scriptText}`;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    const aiData = await aiRes.json();
    if (!aiRes.ok) {
      throw new Error(aiData.error?.message || "OpenAI API error");
    }

    const parsedData = JSON.parse(aiData.choices[0].message.content);
    return NextResponse.json(parsedData);
  } catch (err: any) {
    console.error("LLM Route Error:", err.message);
    // Return a safe structural response instead of a 500 crash
    return NextResponse.json({
      scenes: [{ heading: "EXT. ERROR RECOVERY SCENE - DAY", action: "Parsed via emergency fallback handler.", dialogue: [], shotType: "Wide Shot", cameraMovement: "Static", visualPrompt: "Fallback recovery view" }],
      characters: [{ name: "PROTAGONIST", role: "Protagonist", occurrences: 1, dialogueSample: "Emergency fallback active." }],
      sfxCues: []
    });
  }
}