import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ── Operation config ─────────────────────────────────────────────────
const OPERATIONS: Record<string, { credits: number; api: "photoroom" | "fashn"; tier: string }> = {
  remove_bg:     { credits: 1, api: "photoroom", tier: "free" },
  sell_ready:    { credits: 1, api: "photoroom", tier: "free" },
  studio_shadow: { credits: 2, api: "photoroom", tier: "starter" },
  ai_background: { credits: 2, api: "photoroom", tier: "starter" },
  put_on_model:  { credits: 3, api: "fashn",     tier: "starter" },
  virtual_tryon: { credits: 3, api: "fashn",     tier: "starter" },
  swap_model:    { credits: 3, api: "fashn",     tier: "starter" },
};

const TIER_ORDER: Record<string, number> = { free: 0, starter: 1, pro: 2, business: 3 };

function isAtLeastTier(userTier: string, requiredTier: string): boolean {
  return (TIER_ORDER[userTier] ?? 0) >= (TIER_ORDER[requiredTier] ?? 0);
}

// ── Helpers ──────────────────────────────────────────────────────────
async function fetchImageBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

function getExtFromContentType(ct: string | null): string {
  if (ct?.includes("png")) return "png";
  if (ct?.includes("webp")) return "webp";
  return "png";
}

// ── Photoroom calls ──────────────────────────────────────────────────
async function callPhotoroom(
  operation: string,
  imageBytes: Uint8Array,
  parameters: Record<string, string>,
  apiKey: string,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const form = new FormData();

  let url: string;

  if (operation === "remove_bg" || operation === "sell_ready") {
    // v1/segment — Basic plan, proven working
    url = "https://sdk.photoroom.com/v1/segment";
    form.append("image_file", new Blob([imageBytes]), "image.jpg");
  } else {
    // v1/edit — handles shadow, lighting, backgrounds (requires Plus plan)
    url = "https://sdk.photoroom.com/v1/edit";
    form.append("image_file", new Blob([imageBytes]), "image.jpg");

    if (operation === "studio_shadow") {
      const shadowMode = parameters?.shadow_mode || "ai.soft";
      form.append("background.color", "#FFFFFF");
      form.append("shadow.mode", shadowMode);
      form.append("lighting.mode", "ai.balanced");
      form.append("padding", "0.1");
      form.append("outputSize", "hd");
    } else if (operation === "ai_background") {
      const bgPrompt = parameters?.bg_prompt || "marble countertop with soft morning light";
      form.append("background.prompt", bgPrompt);
      form.append("shadow.mode", "ai.soft");
      form.append("lighting.mode", "ai.balanced");
      form.append("padding", "0.05");
      form.append("outputSize", "hd");
    }
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "x-api-key": apiKey },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    console.error(`[photoroom] ${operation} failed (${res.status}): ${errText}`);
    throw new Error(`Photoroom ${operation} failed: ${errText}`);
  }

  const bytes = new Uint8Array(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "image/png";
  return { bytes, contentType };
}

// ── Image compression for Fashn (max 25MB) ──────────────────────────
const FASHN_MAX_BYTES = 25 * 1024 * 1024; // 25MB

async function ensureImageUnderLimit(
  imageUrl: string,
  userId: string,
  admin: ReturnType<typeof createClient>,
): Promise<string> {
  // Check image size via HEAD request
  try {
    const headRes = await fetch(imageUrl, { method: "HEAD" });
    const contentLength = parseInt(headRes.headers.get("content-length") || "0", 10);
    if (contentLength > 0 && contentLength < FASHN_MAX_BYTES) {
      return imageUrl; // Already under limit
    }
  } catch {
    // If HEAD fails, proceed with download + compress anyway
  }

  // Download and re-encode as JPEG to reduce size
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error("Failed to fetch image for compression");
  const originalBytes = new Uint8Array(await imgRes.arrayBuffer());
  
  if (originalBytes.length < FASHN_MAX_BYTES) {
    return imageUrl; // Under limit after all
  }

  console.log(`[photo-studio] Image too large for Fashn (${(originalBytes.length / 1024 / 1024).toFixed(1)}MB), re-encoding as JPEG`);

  // Use Photoroom's segment endpoint to get a compressed version
  // Or simply re-upload as-is but with JPEG conversion via canvas isn't available in Deno
  // Best approach: re-upload the image bytes as JPEG with reduced quality
  // Since we can't do canvas in Deno, upload the original and let Fashn deal with it
  // Actually, we need to convert PNG to JPEG — use a simple approach: 
  // re-upload as the same format but store a compressed reference
  
  // For PNGs from Photoroom, the simplest fix is to fetch, convert to JPEG via an external service
  // or just pass the original pre-removal image. But the best UX is to compress.
  // In Deno we can use the image as-is but need to make it smaller.
  
  // Approach: Re-upload the bytes as-is with upsert — Fashn will need a smaller image
  // Since we can't do image processing in Deno easily, the pragmatic fix is:
  // Use Photoroom to re-process and get a JPEG output
  const photoroomKey = Deno.env.get("PHOTOROOM_API_KEY");
  if (photoroomKey) {
    const form = new FormData();
    form.append("image_file", new Blob([originalBytes]), "image.png");
    form.append("format", "jpg");
    form.append("quality", "85");
    
    const prRes = await fetch("https://sdk.photoroom.com/v1/segment", {
      method: "POST",
      headers: { "x-api-key": photoroomKey },
      body: form,
    });

    if (prRes.ok) {
      const compressedBytes = new Uint8Array(await prRes.arrayBuffer());
      console.log(`[photo-studio] Compressed to ${(compressedBytes.length / 1024 / 1024).toFixed(1)}MB`);
      
      // Upload compressed version
      const compressedPath = `${userId}/compressed_${Date.now()}.jpg`;
      const { error: upErr } = await admin.storage.from("vintography").upload(compressedPath, compressedBytes, {
        contentType: "image/jpeg",
        upsert: true,
      });
      
      if (!upErr) {
        const { data: pubData } = admin.storage.from("vintography").getPublicUrl(compressedPath);
        return pubData.publicUrl;
      }
    }
  }
  
  // Fallback: return original URL and let Fashn error naturally
  return imageUrl;
}

// ── Fashn calls ──────────────────────────────────────────────────────
async function callFashn(
  operation: string,
  imageUrl: string,
  selfieUrl: string | undefined,
  parameters: Record<string, string>,
  apiKey: string,
  userId: string,
  admin: ReturnType<typeof createClient>,
): Promise<{ bytes: Uint8Array; contentType: string }> {
  // Ensure image is under Fashn's size limit
  const safeImageUrl = await ensureImageUnderLimit(imageUrl, userId, admin);
  const safeSelfieUrl = selfieUrl ? await ensureImageUnderLimit(selfieUrl, userId, admin) : undefined;

  const gender = parameters?.gender || "female";
  const ethnicity = parameters?.ethnicity || "";
  const pose = parameters?.pose || "";

  // Build appearance prompt from user selections
  const buildPrompt = (): string => {
    const parts: string[] = [];
    if (gender) parts.push(`${gender} model`);
    if (ethnicity && ethnicity !== "default") parts.push(ethnicity);
    if (pose && pose !== "default") parts.push(`${pose} pose`);
    parts.push("professional studio background, fashion photography, high quality");
    return parts.join(", ");
  };

  let body: Record<string, unknown>;

  if (operation === "put_on_model") {
    // Product-to-Model: takes a flat-lay/product photo and generates a model wearing it
    // When model_image is omitted, Fashn generates a NEW person from the prompt
    body = {
      model_name: "product-to-model",
      inputs: {
        product_image: safeImageUrl,
        prompt: buildPrompt(),
        aspect_ratio: "3:4",
        output_format: "png",
      },
    };
  } else if (operation === "virtual_tryon") {
    // Virtual Try-On: user's selfie + garment image
    if (!safeSelfieUrl) throw new Error("selfie_url is required for virtual try-on");
    body = {
      model_name: "tryon-v1.6",
      inputs: {
        model_image: safeSelfieUrl,
        garment_image: safeImageUrl,
        category: "auto",
        mode: "quality",
      },
    };
  } else {
    // Model Swap: changes the model identity in an existing on-model photo
    // model_image = the existing on-model photo, prompt = the new model description
    body = {
      model_name: "model-swap",
      inputs: {
        model_image: safeImageUrl,
        prompt: buildPrompt(),
      },
    };
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  // Submit job
  const submitRes = await fetch("https://api.fashn.ai/v1/run", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text().catch(() => "Unknown error");
    console.error(`[fashn] ${operation} submit failed (${submitRes.status}): ${errText}`);
    throw new Error(`Fashn ${operation} submission failed: ${errText}`);
  }

  const submitData = await submitRes.json();
  const jobId = submitData.id;
  if (!jobId) throw new Error("Fashn did not return a job ID");

  console.log(`[fashn] ${operation} job submitted: ${jobId}`);

  // Poll for completion
  const MAX_POLLS = 30;
  const POLL_INTERVAL = 2000;

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));

    const statusRes = await fetch(`https://api.fashn.ai/v1/status/${jobId}`, { headers });
    if (!statusRes.ok) {
      console.error(`[fashn] poll failed (${statusRes.status})`);
      continue;
    }

    const statusData = await statusRes.json();
    console.log(`[fashn] poll ${i + 1}/${MAX_POLLS}: status=${statusData.status}`);

    if (statusData.status === "completed") {
      const outputUrl = statusData.output?.[0];
      if (!outputUrl) throw new Error("Fashn completed but returned no output URL");

      const imgRes = await fetch(outputUrl);
      if (!imgRes.ok) throw new Error("Failed to download Fashn result image");
      const bytes = new Uint8Array(await imgRes.arrayBuffer());
      const contentType = imgRes.headers.get("content-type") || "image/png";
      return { bytes, contentType };
    }

    if (statusData.status === "failed") {
      const errMsg = statusData.error?.message || statusData.error || "Processing failed";
      throw new Error(`Fashn processing failed: ${errMsg}`);
    }
  }

  throw new Error("TIMEOUT");
}

// ── Main handler ─────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not authenticated" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const photoroomKey = Deno.env.get("PHOTOROOM_API_KEY");
    const fashnKey = Deno.env.get("FASHN_API_KEY");

    const token = authHeader.replace("Bearer ", "");
    const admin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return json({ error: "Invalid auth" }, 401);

    // ── Parse request ────────────────────────────────────────────────
    const { image_url, operation, parameters = {}, selfie_url, sell_wizard } = await req.json();

    if (!image_url || !operation) {
      return json({ error: "image_url and operation are required" }, 400);
    }

    const opConfig = OPERATIONS[operation];
    if (!opConfig) {
      return json({ error: `Invalid operation: ${operation}` }, 400);
    }

    // ── Check API key availability ───────────────────────────────────
    if (opConfig.api === "photoroom" && !photoroomKey) {
      return json({ error: "Photoroom service not configured" }, 500);
    }
    if (opConfig.api === "fashn" && !fashnKey) {
      return json({ error: "Fashn service not configured" }, 500);
    }

    // ── Selfie validation for virtual_tryon ──────────────────────────
    if (operation === "virtual_tryon" && !selfie_url) {
      return json({ error: "selfie_url is required for virtual try-on" }, 400);
    }

    // ── Tier check ───────────────────────────────────────────────────
    const { data: profile } = await admin
      .from("profiles")
      .select("subscription_tier, first_item_pass_used")
      .eq("user_id", user.id)
      .single();

    const tier = profile?.subscription_tier || "free";

    if (!isAtLeastTier(tier, opConfig.tier)) {
      return json(
        { error: `${operation} requires the ${opConfig.tier} plan or above. You're on ${tier}.`, upgrade_required: true },
        403,
      );
    }

    // ── Credit check ─────────────────────────────────────────────────
    const creditsToDeduct = opConfig.credits;

    const { data: credits } = await admin
      .from("usage_credits")
      .select("price_checks_used, optimizations_used, vintography_used, credits_limit")
      .eq("user_id", user.id)
      .single();

    const limit = credits?.credits_limit ?? 5;

    // First-item-free pass
    let useFirstItemPass = false;
    if (sell_wizard) {
      if (profile?.first_item_pass_used === false) {
        useFirstItemPass = true;
        console.log(`[first-item-pass] User ${user.id} — skipping credit deduction for photo-studio (${operation})`);
      }
    }

    if (!useFirstItemPass && credits && limit < 999999) {
      const totalUsed = (credits.price_checks_used || 0) + (credits.optimizations_used || 0) + (credits.vintography_used || 0);
      if (totalUsed + creditsToDeduct > limit) {
        return json(
          {
            error: `This operation costs ${creditsToDeduct} credit${creditsToDeduct > 1 ? "s" : ""}. You have ${Math.max(0, limit - totalUsed)} remaining. Upgrade your plan or buy a top-up pack.`,
            upgrade_required: true,
          },
          403,
        );
      }
    }

    // ── Create job record ────────────────────────────────────────────
    const { data: job, error: jobError } = await admin
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
      console.error("[photo-studio] Failed to create job:", jobError);
      return json({ error: "Failed to create processing job" }, 500);
    }

    const jobId = job.id;
    console.log(`[photo-studio] Processing ${operation} (${opConfig.api}) for user ${user.id}, job ${jobId}`);

    // ── Process ──────────────────────────────────────────────────────
    let resultBytes: Uint8Array;
    let resultContentType: string;

    try {
      if (opConfig.api === "photoroom") {
        const imageBytes = await fetchImageBytes(image_url);
        const result = await callPhotoroom(operation, imageBytes, parameters, photoroomKey!);
        resultBytes = result.bytes;
        resultContentType = result.contentType;
      } else {
        const result = await callFashn(operation, image_url, selfie_url, parameters, fashnKey!, user.id, admin);
        resultBytes = result.bytes;
        resultContentType = result.contentType;
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[photo-studio] Processing failed for job ${jobId}:`, errMsg);

      await admin
        .from("vintography_jobs")
        .update({ status: "failed", error_message: errMsg })
        .eq("id", jobId);

      if (errMsg === "TIMEOUT") {
        return json({ error: "Processing took too long. Please try again — your credits were not charged." }, 504);
      }
      return json({ error: "Image processing failed. Your credits were not charged." }, 500);
    }

    // ── Upload result to storage ─────────────────────────────────────
    const ext = getExtFromContentType(resultContentType);
    const storagePath = `${user.id}/${jobId}.${ext}`;

    const { error: uploadError } = await admin.storage
      .from("vintography")
      .upload(storagePath, resultBytes, {
        contentType: resultContentType,
        upsert: true,
      });

    if (uploadError) {
      console.error("[photo-studio] Storage upload failed:", uploadError);
      await admin
        .from("vintography_jobs")
        .update({ status: "failed", error_message: "Failed to save result image" })
        .eq("id", jobId);
      return json({ error: "Failed to save result image. Your credits were not charged." }, 500);
    }

    const { data: publicUrlData } = admin.storage.from("vintography").getPublicUrl(storagePath);
    const processedUrl = publicUrlData.publicUrl;

    // ── Update job record ────────────────────────────────────────────
    await admin
      .from("vintography_jobs")
      .update({ status: "completed", processed_url: processedUrl })
      .eq("id", jobId);

    // ── Deduct credits ───────────────────────────────────────────────
    if (!useFirstItemPass) {
      const { error: creditError } = await admin.rpc("increment_usage_credit", {
        p_user_id: user.id,
        p_column: "vintography_used",
        p_amount: creditsToDeduct,
      });

      if (creditError) {
        console.error("[photo-studio] Credit deduction failed, issuing refund is not needed since RPC failed:", creditError);
      }
    }

    console.log(`[photo-studio] Job ${jobId} completed. Credits deducted: ${useFirstItemPass ? 0 : creditsToDeduct}`);

    return json({
      job_id: jobId,
      processed_url: processedUrl,
      operation,
      credits_deducted: useFirstItemPass ? 0 : creditsToDeduct,
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[photo-studio] Unhandled error:", errMsg);
    return json({ error: errMsg }, 500);
  }
});
