import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { brand, category, condition, title } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const conditionLabel = (condition || "")
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c: string) => c.toUpperCase());

    const prompt = `Generate exactly 5 Vinted-optimised compound hashtags for this item:
Brand: ${brand || "Unknown"}
Category: ${category || "Fashion"}
Condition: ${conditionLabel || "Good"}
Title: ${title || ""}

Rules:
- Each hashtag must be a single compound word starting with # (e.g. #VintedFinds, #AnneKleinDress)
- Mix brand-specific, category-specific, and general Vinted discovery hashtags
- Focus on tags real buyers search for on Vinted UK
- Return ONLY a JSON array of 5 hashtag strings, nothing else
Example output: ["#AnneKleinDress","#VintedFashion","#MidiDress","#WomensVintage","#UKVinted"]`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a Vinted selling expert. Return ONLY valid JSON arrays. No markdown, no explanation.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content?.trim() || "[]";

    // Parse the JSON array from the response
    let hashtags: string[] = [];
    try {
      // Strip markdown code fences if present
      const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      hashtags = JSON.parse(cleaned);
      if (!Array.isArray(hashtags)) hashtags = [];
      // Ensure all start with #
      hashtags = hashtags.slice(0, 5).map((h: string) => h.startsWith("#") ? h : `#${h}`);
    } catch {
      // Fallback: try extracting hashtags with regex
      const matches = content.match(/#\w+/g) || [];
      hashtags = matches.slice(0, 5);
    }

    return new Response(JSON.stringify({ hashtags }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-hashtags error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
