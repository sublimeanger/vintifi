import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Enhanced fashion-photography prompts ──────────────────────────────
const GARMENT_PRESERVE = "CRITICAL: Preserve every detail of the garment — logos, prints, textures, stitching, buttons, zippers, tags, and brand markers must remain perfectly intact and unaltered. Maintain accurate colour reproduction under the new lighting. NEVER add any text, labels, watermarks, captions, annotations, or overlays to the image. The output must contain zero added text of any kind.";

const OPERATION_PROMPTS: Record<string, (params: Record<string, string>) => string> = {
  remove_bg: () =>
    `Remove the background from this clothing/fashion item photo completely. Replace with a clean, pure white background (#FFFFFF). Produce crisp, clean edges around the garment with no artefacts or halos. Professional e-commerce product photography standard. ${GARMENT_PRESERVE}`,

  smart_bg: (p) => {
    const style = p?.bg_style || "studio";
    const styles: Record<string, string> = {
      studio: "a professional photography studio with soft even lighting and a subtle grey-to-white gradient backdrop",
      wooden_floor: "a warm honey-toned wooden floor surface with soft natural side-lighting, lifestyle product photo style",
      outdoor: "a bright outdoor setting with beautifully blurred green bokeh foliage in the background, golden-hour natural daylight",
      marble: "an elegant white Carrara marble surface with soft directional shadows, luxury product photography style",
      vintage: "a warm vintage aesthetic background with aged paper textures, muted earth tones, and soft warm lighting",
      concrete: "a minimalist raw concrete surface with subtle texture, industrial-chic product photography with cool even lighting",
      linen: "a soft natural linen fabric surface with gentle folds and warm side-lighting, organic lifestyle feel",
      summer: "a bright, sun-drenched beach scene with soft sand and ocean blur in background, summer lifestyle photography",
      autumn: "a warm autumnal setting with golden leaves, rich amber tones, and soft diffused lighting",
      winter: "a cool-toned winter scene with soft frost textures, clean whites, and crisp blue undertones",
      bedroom: "a stylish modern bedroom setting with a neatly made bed and soft ambient lighting, lifestyle product placement",
      cafe: "a cozy coffee shop setting with warm wood tones, soft bokeh lighting, and a lifestyle aesthetic",
    };
    return `Remove the background from this clothing item and place it on ${styles[style] || styles.studio}. The garment must appear naturally placed in the scene with realistic shadows and reflections. Lighting should be consistent between the garment and background. ${GARMENT_PRESERVE}`;
  },

  model_shot: (p) => {
    const gender = p?.gender || "female";
    const pose = p?.pose || "standing_front";
    const look = p?.model_look || "classic";
    const bg = p?.model_bg || "studio";

    const looks: Record<string, string> = {
      classic: "clean-cut, neutral styling, natural makeup, approachable and professional",
      editorial: "high-fashion editorial styling, striking features, confident expression, magazine-quality",
      streetwear: "urban streetwear aesthetic, relaxed confident attitude, contemporary casual styling",
      athletic: "fit and athletic build, sporty styling, energetic and dynamic presence",
      mature: "35-45 years old, sophisticated and refined appearance, elegant styling",
      youthful: "18-25 years old, fresh and vibrant, trendy contemporary styling",
    };

    const poses: Record<string, string> = {
      standing_front: "standing facing camera directly, relaxed natural posture, arms at sides",
      standing_angled: "standing at a flattering 3/4 angle to camera, one shoulder slightly forward",
      walking: "mid-stride walking pose, natural movement, one foot slightly ahead",
      casual_leaning: "casually leaning against a wall or surface, relaxed and approachable",
      seated: "seated on a stool or chair, relaxed posture, looking at camera",
      action: "dynamic action pose with natural movement, energetic and engaging",
    };

    const bgs: Record<string, string> = {
      studio: "clean white studio backdrop with professional softbox lighting",
      grey_gradient: "smooth grey gradient studio backdrop, fashion photography lighting",
      urban: "urban street setting with blurred city background, natural daylight",
      park: "outdoor park setting with soft green bokeh, golden-hour lighting",
      brick: "exposed brick wall backdrop, industrial-chic setting with warm lighting",
    };

    return `Take this clothing/fashion garment and show it being worn by a ${gender} model. Model style: ${looks[look] || looks.classic}. Pose: ${poses[pose] || poses.standing_front}. Background: ${bgs[bg] || bgs.studio}. The model should have natural body proportions. The garment must fit realistically with proper draping, natural fabric flow, and correct sizing. Show realistic fabric tension, wrinkles, and movement. Professional fashion photography with sharp focus on the garment. ${GARMENT_PRESERVE}`;
  },

  mannequin_shot: (p) => {
    const gender = p?.gender || "female";
    const bg = p?.model_bg || "studio";

    const bgs: Record<string, string> = {
      studio: "clean white studio backdrop with professional even lighting",
      grey_gradient: "smooth grey gradient studio backdrop",
      urban: "urban street setting with blurred city background",
      park: "outdoor park setting with soft green bokeh",
      brick: "exposed brick wall backdrop with warm lighting",
    };

    return `Take this clothing/fashion garment and display it on a ${gender} shop mannequin/dress form. The mannequin should be a realistic retail display mannequin — smooth, neutral-coloured (white or light grey), with a clean professional appearance. The garment should drape naturally on the mannequin form showing its true shape and fit. Background: ${bgs[bg] || bgs.studio}. Professional retail product photography style with even lighting and no harsh shadows. ${GARMENT_PRESERVE}`;
  },

  ghost_mannequin: () =>
    `Apply a professional ghost mannequin / invisible mannequin effect to this clothing photo. Remove any visible mannequin, hanger, or dress form from the image so the garment appears to float naturally in a 3D shape as if worn by an invisible person. Maintain the garment's natural shape, volume, and structure. Fill in any gaps where the mannequin was visible (neckline, sleeves, waistband) with realistic fabric continuation or clean background. The result should look like professional fashion e-commerce photography with the "hollow man" effect. Clean white background. ${GARMENT_PRESERVE}`,

  flatlay_style: (p) => {
    const style = p?.flatlay_style || "minimal";
    const styles: Record<string, string> = {
      minimal: "Clean minimal flat-lay styling. Add subtle natural shadows beneath the garment. Ensure the garment is neatly arranged with clean folds. White or very light grey background. No props.",
      styled: "Styled flat-lay with tasteful accessories — add complementary items like sunglasses, a watch, shoes, or a bag arranged artfully around the garment. Maintain breathing room. Soft natural shadows. Light neutral background.",
      seasonal: "Seasonal themed flat-lay. Add contextual seasonal elements — flowers and greenery for spring, shells and sand texture for summer, leaves for autumn, pine and knit textures for winter. Warm, inviting composition with the garment as hero. Soft shadows.",
    };
    return `Enhance this flat-lay clothing photo. ${styles[style] || styles.minimal} Professional overhead product photography with even, diffused lighting. Straighten and neaten the garment layout. ${GARMENT_PRESERVE}`;
  },

  enhance: () =>
    `Enhance this clothing/fashion product photo for e-commerce. Improve lighting to be bright, even, and professional. Increase sharpness and clarity. Boost colour vibrancy while keeping colours accurate and natural. Reduce noise and graininess. Correct white balance. Add subtle professional-quality shadows. Keep the original background and composition. ${GARMENT_PRESERVE}`,
};

// Models per operation
const MODEL_MAP: Record<string, string> = {
  remove_bg: "google/gemini-2.5-flash-image",
  smart_bg: "google/gemini-2.5-flash-image",
  model_shot: "google/gemini-3-pro-image-preview",
  mannequin_shot: "google/gemini-3-pro-image-preview",
  ghost_mannequin: "google/gemini-2.5-flash-image",
  flatlay_style: "google/gemini-2.5-flash-image",
  enhance: "google/gemini-2.5-flash-image",
};

// Credit limits now come from usage_credits.credits_limit (unified pool)

// Operations allowed per tier
const TIER_OPERATIONS: Record<string, string[]> = {
  free: ["remove_bg", "enhance", "flatlay_style"],
  pro: ["remove_bg", "enhance", "smart_bg", "model_shot", "mannequin_shot", "ghost_mannequin", "flatlay_style"],
  business: ["remove_bg", "enhance", "smart_bg", "model_shot", "mannequin_shot", "ghost_mannequin", "flatlay_style"],
  scale: ["remove_bg", "enhance", "smart_bg", "model_shot", "mannequin_shot", "ghost_mannequin", "flatlay_style"],
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

    const token = authHeader.replace("Bearer ", "");
    const adminForAuth = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await adminForAuth.auth.getUser(token);
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

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile } = await adminClient
      .from("profiles")
      .select("subscription_tier")
      .eq("user_id", user.id)
      .single();
    const tier = profile?.subscription_tier || "free";

    const allowedOps = TIER_OPERATIONS[tier] || TIER_OPERATIONS.free;
    if (!allowedOps.includes(operation)) {
      return new Response(
        JSON.stringify({ error: `${operation} requires a higher plan. You're on ${tier}.` }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: credits } = await adminClient
      .from("usage_credits")
      .select("price_checks_used, optimizations_used, vintography_used, credits_limit")
      .eq("user_id", user.id)
      .single();

    const used = credits?.vintography_used || 0;
    const limit = credits?.credits_limit ?? 5;

    if (credits && limit < 999) {
      const totalUsed = (credits.price_checks_used || 0) + (credits.optimizations_used || 0) + (credits.vintography_used || 0);
      if (totalUsed >= limit) {
        return new Response(
          JSON.stringify({ error: "Monthly credit limit reached. Upgrade your plan for more." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

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
      return new Response(JSON.stringify({ error: "Failed to create job" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      await adminClient
        .from("vintography_jobs")
        .update({ status: "failed", error_message: "No image generated" })
        .eq("id", job.id);

      return new Response(JSON.stringify({ error: "AI did not return an image. Try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const base64Data = imageResult.replace(/^data:image\/\w+;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const filePath = `${user.id}/${job.id}.png`;

    const { error: uploadError } = await adminClient.storage
      .from("vintography")
      .upload(filePath, binaryData, { contentType: "image/png", upsert: true });

    if (uploadError) {
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
