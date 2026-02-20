import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    // --- Tier check: Business+ required for multi-language ---
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await anonClient.auth.getUser(token);
    if (userErr || !user) throw new Error("Not authenticated");

    const { data: profile } = await supabase
      .from("profiles").select("subscription_tier").eq("user_id", user.id).maybeSingle();
    const tier = profile?.subscription_tier || "free";
    const tierLevel: Record<string, number> = { free: 0, starter: 1, pro: 2, business: 3 };
    if ((tierLevel[tier] ?? 0) < 2) {
      return new Response(
        JSON.stringify({ error: "This feature requires a Business plan. Upgrade to continue." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // --- End tier check ---

    const { title, description, tags, languages } = await req.json();

    if (!title || !description) {
      return new Response(
        JSON.stringify({ error: "Title and description are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetLanguages: string[] = languages || ["fr", "de", "nl", "es"];
    const langCount = targetLanguages.length;

    // --- Credit pre-check ---
    const { data: usageRow, error: usageErr } = await supabase
      .from("usage_credits")
      .select("credits_limit, price_checks_used, optimizations_used, vintography_used")
      .eq("user_id", user.id)
      .maybeSingle();

    if (usageErr) throw new Error("Failed to fetch credit balance");

    const isUnlimitedAccount = (usageRow?.credits_limit ?? 0) >= 999999;
    if (!isUnlimitedAccount) {
      const totalUsed = (usageRow?.price_checks_used ?? 0) +
        (usageRow?.optimizations_used ?? 0) +
        (usageRow?.vintography_used ?? 0);
      const remaining = (usageRow?.credits_limit ?? 0) - totalUsed;
      if (remaining < langCount) {
        return new Response(
          JSON.stringify({ error: `Insufficient credits. This translation requires ${langCount} credit${langCount > 1 ? "s" : ""} (one per language), but you only have ${remaining} remaining.` }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    // --- End credit pre-check ---

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI not configured");

    const langMap: Record<string, string> = {
      fr: "French",
      de: "German",
      nl: "Dutch",
      es: "Spanish",
      it: "Italian",
      pt: "Portuguese",
      pl: "Polish",
    };

    const langNames = targetLanguages.map((l: string) => langMap[l] || l).join(", ");

    const prompt = `You are a professional translator specialising in e-commerce product listings for Vinted. Translate the following Vinted listing into ${langNames}.

IMPORTANT RULES:
- Keep brand names, model names, and proper nouns UNCHANGED
- Adapt sizing conventions where relevant (e.g. UK sizes)
- Use natural, buyer-friendly language that sounds native (not robotic)
- Optimise for local Vinted search keywords in each language
- Keep the same structure and formatting as the original

ORIGINAL TITLE:
${title}

ORIGINAL DESCRIPTION:
${description}

${tags?.length ? `ORIGINAL TAGS: ${tags.join(", ")}` : ""}

Return a JSON object with language codes as keys. Each value should have "title", "description", and "tags" (array). Example:
{
  "fr": { "title": "...", "description": "...", "tags": ["..."] },
  "de": { "title": "...", "description": "...", "tags": ["..."] }
}
Return ONLY the JSON object, no markdown or other text.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a professional multilingual translator for e-commerce listings. Always respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) throw new Error("Rate limited, try again later.");
      if (aiRes.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`AI error: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let translations;
    try {
      translations = JSON.parse(content);
    } catch {
      console.error("Failed to parse translations:", content);
      throw new Error("AI returned invalid translation data");
    }

    // --- Deduct credits (1 per language translated) ---
    if (!isUnlimitedAccount) {
      await supabase.rpc("increment_usage_credit", {
        p_user_id: user.id,
        p_column: "optimizations_used",
        p_amount: langCount,
      });
    }
    // --- End credit deduction ---

    return new Response(JSON.stringify({ translations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate-listing error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
