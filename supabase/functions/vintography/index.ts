import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPERATION_PROMPTS: Record<string, (params: Record<string, string>) => string> = {
  remove_bg: () =>
    "Remove the background from this clothing/fashion item photo completely. Replace the background with a clean, pure white background (#FFFFFF). Keep the garment perfectly intact with crisp edges. The result should look like a professional e-commerce product photo on white.",
  smart_bg: (p) => {
    const style = p?.bg_style || "studio";
    const styles: Record<string, string> = {
      studio: "a professional photography studio with soft lighting and a subtle grey gradient backdrop",
      wooden_floor: "a warm wooden floor surface with soft natural side-lighting, lifestyle product photo style",
      outdoor: "a bright outdoor setting with soft bokeh greenery in the background, natural daylight",
      marble: "an elegant white marble surface with soft shadows, luxury product photography style",
      vintage: "a warm vintage aesthetic background with soft textures and muted tones",
    };
    return `Remove the background from this clothing item and place it on ${styles[style] || styles.studio}. The garment must remain perfectly intact and well-lit. Make it look like a professional product photograph.`;
  },
  model_shot: (p) => {
    const gender = p?.gender || "female";
    const pose = p?.pose || "standing";
    return `Take this clothing/fashion garment and show it being worn by a ${gender} model in a ${pose} pose. The model should be attractive and natural-looking, with a clean white studio background. The garment must look realistic on the model — proper fit, natural draping, correct proportions. Professional fashion photography style, well-lit, sharp focus on the garment.`;
  },
  enhance: () =>
    "Enhance this clothing/fashion product photo for e-commerce. Improve the lighting to be bright and even, increase sharpness and clarity, boost colour vibrancy slightly while keeping it natural, and reduce any noise or graininess. Keep the original background and composition. The result should look professional and appealing for an online marketplace listing.",
};

// Models per operation
const MODEL_MAP: Record<string, string> = {
  remove_bg: "google/gemini-2.5-flash-image",
  smart_bg: "google/gemini-2.5-flash-image",
  model_shot: "google/gemini-3-pro-image-preview",
  enhance: "google/gemini-2.5-flash-image",
};

// Tier limits for vintography
const TIER_LIMITS: Record<string, number> = {
  free: 3,
  pro: 15,
  business: 50,
  scale: 999,
};

// Operations allowed per tier
const TIER_OPERATIONS: Record<string, string[]> = {
  free: ["remove_bg", "enhance"],
  pro: ["remove_bg", "enhance", "smart_bg", "model_shot"],
  business: ["remove_bg", "enhance", "smart_bg", "model_shot"],
  scale: ["remove_bg", "enhance", "smart_bg", "model_shot"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { image_url, operation, parameters } = await req.json();

    if (!image_url || !operation) {
      return new Response(JSON.stringify({ error: "image_url and operation are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!OPERATION_PROMPTS[operation]) {
      return new Response(JSON.stringify({ error: "Invalid operation" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service client for DB ops
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check tier
    const { data: profile } = await adminClient
      .from("profiles")
      .select("subscription_tier")
      .eq("user_id", user.id)
      .single();
    const tier = profile?.subscription_tier || "free";

    // Check operation allowed for tier
    const allowedOps = TIER_OPERATIONS[tier] || TIER_OPERATIONS.free;
    if (!allowedOps.includes(operation)) {
      return new Response(
        JSON.stringify({ error: `${operation} requires a higher plan. You're on ${tier}.` }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check credits
    const { data: credits } = await adminClient
      .from("usage_credits")
      .select("vintography_used")
      .eq("user_id", user.id)
      .single();
    const used = credits?.vintography_used || 0;
    const limit = TIER_LIMITS[tier] || 3;

    if (used >= limit) {
      return new Response(
        JSON.stringify({ error: "You've used all your Vintography edits this month." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create job record
    const { data: job, error: jobError } = await adminClient
      .from("vintography_jobs")
      .insert({
        user_id: user.id,
        original_url: image_url,
        operation,
        parameters: parameters || {},
        status: "processing",
      })
      .select("id")
      .single();

    if (jobError) {
      console.error("Job insert error:", jobError);
      return new Response(JSON.stringify({ error: "Failed to create job" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Lovable AI
    const model = MODEL_MAP[operation];
    const prompt = OPERATION_PROMPTS[operation](parameters || {});

    console.log(`Processing ${operation} with model ${model} for user ${user.id}`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: image_url } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);

      await adminClient
        .from("vintography_jobs")
        .update({ status: "failed", error_message: `AI error: ${aiResponse.status}` })
        .eq("id", job.id);

      const status = aiResponse.status === 429 ? 429 : aiResponse.status === 402 ? 402 : 500;
      const msg =
        status === 429
          ? "Rate limit exceeded, please try again shortly."
          : status === 402
          ? "AI credits exhausted. Please add funds."
          : "AI processing failed. Please try again.";

      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const imageResult = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageResult) {
      console.error("No image in AI response:", JSON.stringify(aiData).slice(0, 500));
      await adminClient
        .from("vintography_jobs")
        .update({ status: "failed", error_message: "No image generated" })
        .eq("id", job.id);

      return new Response(JSON.stringify({ error: "AI did not return an image. Try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload to storage
    const base64Data = imageResult.replace(/^data:image\/\w+;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const filePath = `${user.id}/${job.id}.png`;

    const { error: uploadError } = await adminClient.storage
      .from("vintography")
      .upload(filePath, binaryData, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      await adminClient
        .from("vintography_jobs")
        .update({ status: "failed", error_message: "Upload failed" })
        .eq("id", job.id);
      return new Response(JSON.stringify({ error: "Failed to save processed image" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: publicUrl } = adminClient.storage.from("vintography").getPublicUrl(filePath);

    // Update job + credits
    await adminClient
      .from("vintography_jobs")
      .update({ status: "completed", processed_url: publicUrl.publicUrl })
      .eq("id", job.id);

    await adminClient
      .from("usage_credits")
      .update({ vintography_used: used + 1 })
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({
        job_id: job.id,
        processed_url: publicUrl.publicUrl,
        operation,
        credits_used: used + 1,
        credits_limit: limit,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Vintography error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
