import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Hyper-optimised fashion-photography prompts ──────────────────────
const QUALITY_MANDATE = `OUTPUT REQUIREMENTS: Deliver the highest possible resolution and quality. The result must be indistinguishable from work by a professional fashion photographer using a full-frame camera with a prime lens. Maintain pixel-level sharpness on fabric textures, stitching, and hardware.`;

const NO_TEXT = `ABSOLUTELY ZERO text, watermarks, labels, captions, annotations, logos, signatures, stamps, or any form of written content anywhere in the image. Not even subtle or blurred text. The image must be completely free of any characters or symbols.`;

const GARMENT_PRESERVE = `GARMENT INTEGRITY (NON-NEGOTIABLE): Preserve every single detail of the garment with forensic accuracy — all logos, prints, embroidery, textures, stitching patterns, buttons, zippers, tags, brand markers, fabric weave, and colour must remain perfectly intact, unaltered, and unobscured. Maintain accurate colour reproduction under the new lighting conditions. DO NOT change the garment type — if the input is a crewneck sweatshirt, it must remain a crewneck sweatshirt. DO NOT add a hood, DO NOT change the neckline, DO NOT alter the silhouette. The garment identity must be preserved exactly. ${NO_TEXT}`;

// Build garment context block from optional metadata
function buildGarmentContext(garmentContext?: string): string {
  if (!garmentContext || garmentContext.trim().length === 0) return "";
  return `\n\nGARMENT IDENTITY (CRITICAL): The garment in this image is: ${garmentContext.trim()}. You MUST reproduce this EXACT type of garment. DO NOT substitute it with a similar but different garment (e.g., DO NOT turn a crewneck into a hoodie, DO NOT turn a t-shirt into a long-sleeve, DO NOT change the neckline style). The garment type, neckline, sleeve length, and overall silhouette must match the description precisely.\n`;
}

const OPERATION_PROMPTS: Record<string, (params: Record<string, string>) => string> = {
  remove_bg: () =>
    `You are a professional product photographer specialising in e-commerce fashion imagery. Remove the background from this clothing/fashion item photo completely and replace it with a clean, pure white background (#FFFFFF).

EDGE QUALITY: Produce crisp, anti-aliased edges around the entire garment silhouette. Pay special attention to:
- Semi-transparent fabrics (chiffon, organza, mesh) — preserve their translucency against white
- Fur, faux fur, and fuzzy textures — maintain individual fibre detail at the boundary, no jagged cutouts
- Lace, crochet, and openwork — preserve every hole and gap in the pattern, showing white through them
- Fine details like loose threads, frayed denim, and delicate trims

SHADOW: Preserve a subtle, natural fabric shadow directly beneath the garment on the white background. The shadow should be soft, diffused, and grounded — as if the item is resting on a white surface under soft studio lighting. No harsh or directional shadows.

LIGHTING: Apply clean, even, professional studio lighting. No colour cast. Neutral white balance (5500K). Even exposure across the entire garment.

${GARMENT_PRESERVE}
${QUALITY_MANDATE}`,

  smart_bg: (p) => {
    const style = p?.bg_style || "studio_white";
    const styles: Record<string, string> = {
      // Legacy values for backward compat
      studio: "a professional photography studio with two softboxes creating soft, even lighting and a subtle grey-to-white gradient backdrop",
      wooden_floor: "a warm honey-toned European oak wooden floor surface with soft natural side-lighting from a large window",
      outdoor: "a bright outdoor setting with beautifully blurred green foliage bokeh (f/2.8). Golden-hour natural daylight",
      marble: "an elegant white Carrara marble surface with subtle grey veining and soft directional lighting",
      vintage: "a warm vintage aesthetic with aged cream-coloured paper or linen texture. Muted earth tones, warm tungsten-style lighting",
      concrete: "a minimalist raw concrete surface with subtle aggregate texture. Industrial-chic aesthetic",
      linen: "a soft natural Belgian linen fabric surface with gentle organic folds. Warm side-lighting from camera-left",
      summer: "a bright sun-drenched Mediterranean beach scene with soft golden sand and softly blurred turquoise ocean (f/2.0 bokeh)",
      autumn: "a warm autumnal setting with scattered golden and amber fallen leaves. Rich warm tones",
      winter: "a cool-toned Scandinavian winter scene with soft frost textures and icy blue undertones",
      bedroom: "a stylish modern Scandi-minimal bedroom with a neatly made bed in neutral linen tones and soft ambient window light",
      cafe: "a cozy artisan coffee shop corner with warm reclaimed wood tones and soft tungsten pendant lighting",
      // New enhanced values
      studio_white: "a professional photography studio with a pure white seamless paper sweep backdrop, illuminated with two large softboxes from 45° camera-left and camera-right creating perfectly even, shadowless lighting. The background transitions smoothly from white at the top to barely-off-white at the floor. Professional e-commerce quality — think ASOS or Net-a-Porter",
      studio_grey: "a smooth mid-grey gradient studio backdrop, transitioning from charcoal at the outer edges to lighter grey at the centre. Professional three-point lighting: key light camera-left, fill camera-right, rim light from above-behind creating a subtle halo effect on the garment. Dramatic but refined — editorial fashion quality",
      marble_luxury: "an elegant white Carrara marble surface with delicate grey and gold veining. Soft overhead lighting with a single key light camera-left creating refined directional shadows. The marble veining is visible but secondary to the garment. Luxury fashion e-commerce aesthetic — think Bottega Veneta or The Row campaign",
      linen_flat: "a soft natural Belgian linen fabric surface with gentle organic weave texture and subtle warm-toned creases. Warm side-lighting from camera-left creating soft shadow in the linen fibres. Warm neutral colour temperature (4000K). Organic, tactile, artisan lifestyle feel — think Kinfolk magazine",
      living_room_sofa: "a beautifully styled contemporary living room — a neutral stone-coloured sofa visible in soft focus behind the garment, a healthy monstera plant catching afternoon light, and warm blonde oak wood flooring. Late afternoon golden hour sunlight streaming through unseen windows from camera-right. Aspirational but achievable home lifestyle setting",
      bedroom_mirror: "a stylish bedroom with a full-length standing mirror against a neutral wall. Soft morning light from a large window (camera-left) creates a warm, flattering glow. The bed with crisp white linen is softly visible in the mirror reflection. Aspirational, morning-routine lifestyle feel",
      kitchen_counter: "a beautiful kitchen counter scene — white marble countertop, a French press coffee, a croissant, fresh flowers in a small vase. Soft, bright Sunday morning window light. Clean and aspirational — brunch aesthetic. The kind of kitchen you'd see in an interior design magazine",
      dressing_room: "a stylish personal dressing room with a clothing rail of curated garments visible softly in the background, a full-length mirror, and warm Edison bulb lighting from above. Aspirational 'walk-in wardrobe' energy. Warm, golden-toned ambient light",
      reading_nook: "a cozy reading nook — a plush armchair in warm-toned fabric, floor-to-ceiling bookshelves softly visible in the background, a floor lamp casting warm amber light. Late evening atmosphere with soft pools of warm tungsten light (3000K). Hygge aesthetic",
      bathroom_shelf: "a clean, minimal bathroom shelf setting — white subway tiles with thin grey grout, a vanity light strip creating flattering even illumination. Small green plant, clean glass bottles on the shelf. Bright, clean, spa-like atmosphere. 5000K daylight colour temperature",
      golden_hour_park: "a beautiful park setting captured at golden hour (last 30 minutes before sunset). Lush green foliage in the background rendered as creamy circular bokeh (f/2.0 equivalent). Warm amber-gold rim light from camera-right kissing the garment edges. Long soft shadows. The most flattering light in nature",
      city_street: "a contemporary urban street — blurred city architecture and pedestrian life in the background (f/2.0 bokeh depth of field). Natural overcast daylight (the best street photography light — even, shadow-free). Authentic street-style editorial feel — think Dover Street Market lookbook",
      beach_summer: "a bright summer beach setting — soft, sun-bleached golden sand surface. Turquoise and cerulean ocean visible as beautiful soft bokeh in the far background. Bright, direct summer sunlight slightly diffused by thin cloud creating flattering even beach light. Fresh, aspirational, holiday lifestyle",
      brick_wall: "an exposed red-brown brick wall backdrop with authentic texture, character, and patina. Warm directional tungsten-style accent lighting from camera-left creating dramatic shadows in the brick mortar lines. Industrial-chic editorial — think Dazed & Confused or i-D magazine shoot",
      autumn_leaves: "a rich autumnal outdoor setting — scattered golden, amber, and russet fallen oak leaves covering the ground surface. Warm ambient light (overcast autumn sky creating soft, shadow-free, evenly diffused illumination). The colour palette is warm: ochre, burnt orange, deep red, golden yellow. Cozy seasonal atmosphere",
      christmas_market: "a magical winter market evening setting — strings of warm fairy lights rendered as beautiful golden bokeh (f/1.8 equivalent) filling the background with romantic light points. Cold, crisp air atmosphere. Softly blurred market stalls and wooden huts in the far background. Festive, enchanting, winter lifestyle",
    };

    return `You are an editorial fashion photographer creating lifestyle product imagery. Take this clothing item and place it naturally into the following scene: ${styles[style] || styles.studio_white}.

DEPTH OF FIELD: The garment must be tack-sharp with the background showing natural photographic bokeh (as if shot at f/2.8 on a 50mm lens). The transition from sharp garment to blurred background should be smooth and natural.

SHADOW & LIGHT: Cast a realistic soft shadow beneath/behind the garment that is consistent with the scene's primary light source direction. The shadow should ground the garment in the scene convincingly. Adjust the garment's white balance and colour temperature to match the scene's ambient light — the garment should look like it belongs in this lighting, not pasted on.

COMPOSITION: The garment should be the clear hero of the image, positioned with intentional negative space. Professional editorial composition following the rule of thirds.

${GARMENT_PRESERVE}
${QUALITY_MANDATE}`;
  },

  // Wrap smart_bg to inject garment context
  _smart_bg_with_context: (p: Record<string, string>) => {
    const base = OPERATION_PROMPTS.smart_bg(p);
    return base + buildGarmentContext(p?.garment_context);
  },

  model_shot: (p) => {
    const gender = p?.gender || "female";
    const pose = p?.pose || "standing_front";
    const look = p?.model_look || "classic";
    const bg = p?.model_bg || "studio";

    const looks: Record<string, string> = {
      classic: "clean-cut, approachable, commercial model look. Natural makeup, healthy glowing skin, friendly but composed expression. Think Cos or Uniqlo campaign",
      editorial: "high-fashion editorial presence. Striking bone structure, confident gaze, minimal but precise makeup. Magazine-cover energy. Think Vogue or i-D",
      streetwear: "urban streetwear aesthetic. Relaxed confident attitude, contemporary casual styling. Subtle edge, authentic personality. Think END. or SSENSE lookbook",
      athletic: "fit, athletic build with visible muscle tone. Sporty, energetic presence. Healthy, active lifestyle feel. Think Nike or Adidas campaign",
      mature: "sophisticated 35-45 year old model. Refined, elegant appearance. Subtle distinguished features. Think Loro Piana or Max Mara",
      youthful: "fresh-faced 18-25 year old. Vibrant, trend-forward energy. Natural beauty with minimal makeup. Think ASOS or Zara campaign",
    };

    const poses: Record<string, string> = {
      standing_front: "standing facing camera directly, weight slightly on one hip for a natural S-curve, arms relaxed at sides with fingers gently curved. Chin slightly lifted",
      standing_angled: "standing at a flattering 3/4 angle to camera, one shoulder slightly forward creating depth. Head turned to engage with camera. One arm slightly bent",
      walking: "captured mid-stride walking naturally toward camera, one foot ahead. Arms in natural walking motion. Dynamic yet controlled movement. Hair and fabric showing gentle motion blur at edges",
      casual_leaning: "casually leaning against a wall or surface at a slight angle, one foot crossed. Relaxed, approachable body language. One hand in pocket or resting naturally",
      seated: "seated on a high stool, one foot on a rung. Relaxed posture with good spine alignment, looking at camera with warm expression. Hands resting naturally on thighs",
      action: "dynamic action pose — a confident turn or step with natural movement energy. Fabric flowing with the motion. Engaging, editorial energy",
    };

    const bgs: Record<string, string> = {
      studio: "clean white studio backdrop (seamless paper sweep) with professional three-point softbox lighting. Key light camera-left, fill camera-right, hair light from above-behind",
      grey_gradient: "smooth mid-grey gradient studio backdrop transitioning from charcoal at edges to lighter grey at centre. Professional fashion photography lighting with dramatic but soft contrast",
      urban: "urban street setting with blurred architectural elements and city life in the background (f/2.0 bokeh). Natural daylight with a mix of sun and shade. Authentic street-style feel",
      park: "outdoor park setting with soft green foliage bokeh. Golden-hour lighting (last hour before sunset) creating warm rim light and long gentle shadows",
      brick: "exposed red-brown brick wall backdrop with character and texture. Warm tungsten-style accent lighting. Industrial-chic with editorial feel",
      living_room: "beautifully styled living room — neutral stone sofa, monstera plant, afternoon golden light streaming through windows. Aspirational home lifestyle setting",
      city_street: "contemporary urban street with blurred architecture and pedestrians (f/2.0 bokeh). Overcast natural daylight creating even, shadow-free illumination",
      golden_park: "park at golden hour — lush green foliage as creamy circular bokeh, warm amber rim light, long soft shadows",
      beach: "summer beach — soft-focus turquoise ocean bokeh in background, bright summer sunlight",
      dressing_room: "personal dressing room with clothing rail, full-length mirror, warm Edison bulb lighting. Aspirational walk-in wardrobe energy",
    };

    const garmentCtx = p?.garment_context ? `\n\nGARMENT IDENTITY (CRITICAL — READ BEFORE GENERATING): The garment is: ${p.garment_context}. Generate this EXACT garment type. If it says "crewneck sweatshirt", the model MUST wear a crewneck sweatshirt with a round neckline and NO hood. If it says "t-shirt", it must be a t-shirt. DO NOT substitute with any other garment type. DO NOT add a hood. DO NOT change the neckline.\n` : "";

    return `You are a world-class fashion photographer shooting a lookbook. Create a photo-realistic image of a ${gender} model wearing this exact garment.
${garmentCtx}
MODEL REQUIREMENTS:
- Body: Natural, healthy proportions appropriate for the garment's size. Realistic body type — not exaggerated.
- Skin: Photo-realistic skin with natural pores, subtle imperfections, and realistic subsurface scattering. ABSOLUTELY NO plastic, waxy, or AI-smoothed skin. Must look like a real photograph of a real person.
- Hands: Exactly 5 fingers per hand, natural proportions, relaxed pose. Fingernails clean and natural.
- Face: ${looks[look] || looks.classic}. Natural expression — no uncanny valley. Eyes should have realistic catchlights from the lighting setup. Real-looking hair with individual strand detail.
- Pose: ${poses[pose] || poses.standing_front}

GARMENT FIT:
- The garment must show realistic fabric physics — natural gravity, proper drape based on fabric weight, visible tension points at shoulders and closures, natural wrinkles at elbows and waist. The fabric should react to the pose realistically.
- Sizing should look correct — not too tight, not too loose. Professional fit as you'd see in a well-styled photoshoot.

CAMERA SIMULATION:
- Shot on a full-frame camera with a 50mm f/1.8 lens at approximately 6-8 feet distance.
- Background: ${bgs[bg] || bgs.studio}
- Sharp focus on the garment and model's face, with natural depth-of-field falloff.

${GARMENT_PRESERVE}
${QUALITY_MANDATE}`;
  },

  mannequin_shot: (p) => {
    const gender = p?.gender || "female";
    const bg = p?.model_bg || "studio";

    const bgs: Record<string, string> = {
      studio: "clean white studio backdrop with professional even lighting from two softboxes",
      grey_gradient: "smooth grey gradient studio backdrop with professional three-point lighting",
      urban: "urban street setting with blurred city background and natural daylight",
      park: "outdoor park setting with soft green bokeh and golden-hour warmth",
      brick: "exposed brick wall backdrop with warm directional lighting",
    };

    return `Display this clothing/fashion garment on a ${gender} shop mannequin/dress form. Use a realistic retail display mannequin — smooth, neutral-coloured (matte white or light grey), with a clean professional appearance. No facial features on the mannequin.

The garment should drape naturally on the mannequin form, showing its true 3D shape and fit with natural fabric behaviour. Background: ${bgs[bg] || bgs.studio}. Professional retail product photography style with even, wrap-around lighting and no harsh shadows.

${GARMENT_PRESERVE}
${QUALITY_MANDATE}`;
  },

  ghost_mannequin: () =>
    `Apply a professional ghost mannequin / invisible mannequin effect to this clothing photo. Remove any visible mannequin, hanger, or dress form so the garment appears to float naturally in a 3D shape as if worn by an invisible person.

CRITICAL DETAILS:
- Maintain the garment's natural shape, volume, and 3D structure throughout
- Fill in any gaps where the mannequin was visible (neckline, sleeve openings, waistband) with realistic fabric continuation showing the garment's interior or clean white background
- Inner collar labels and interior fabric should be visible where naturally expected
- Clean, pure white background (#FFFFFF) with a subtle grounding shadow beneath
- The result should match the quality standard of ASOS or Net-a-Porter product imagery

${GARMENT_PRESERVE}
${QUALITY_MANDATE}`,

  flatlay_style: (p) => {
    const style = p?.flatlay_style || "minimal_white";
    const styles: Record<string, string> = {
      minimal_white: "Clean minimal flat-lay styling. Neatly arrange the garment with intentional, clean folds showing the garment's best features. Pure white background (#FFFFFF). Subtle natural drop shadow beneath. No props — let the garment speak. Shot from directly overhead with even, perfectly diffused softbox lighting. Professional e-commerce quality.",
      styled_accessories: "Styled editorial flat-lay with carefully curated complementary accessories — add tasteful items like designer sunglasses, a leather watch strap, quality leather wallet, or a structured belt arranged with intentional spacing following the golden ratio. Maintain generous breathing room around the garment. Soft natural shadows. Light neutral linen or white background. Magazine-quality styling — think Monocle or Kinfolk.",
      seasonal_props: "Seasonal themed flat-lay with contextual natural elements. For spring/summer: fresh flowers, green eucalyptus sprigs, and dried citrus slices. Autumn: scattered golden oak leaves, acorns, and warm-toned dried botanicals. The garment remains the clear hero — seasonal elements frame it with restraint. Warm, inviting overhead composition with soft diffused lighting.",
      denim_denim: "Flat-lay on a rich indigo denim fabric background — the texture of the denim surface creates a complementary backdrop that contrasts beautifully with the garment. Shot from directly overhead with even lighting that shows both the garment detail and the textured denim surface beneath. Fashion-editorial overhead perspective.",
      wood_grain: "Flat-lay on a warm honey-toned oak wood surface photographed directly from above. The wood grain creates natural texture and warmth in the composition. Even, diffused overhead lighting with soft shadows showing the garment's three-dimensional structure. Clean, lifestyle product photography — think Sunday morning market aesthetic.",
    };
    return `Create a professional overhead flat-lay product photo. ${styles[style] || styles.minimal_white}

Straighten and neaten the garment layout so it looks professionally styled — no accidental creases or messy folds. Every fold should be intentional. Even, diffused overhead lighting with no harsh shadows. Professional product photography for e-commerce and social media.

${GARMENT_PRESERVE}
${QUALITY_MANDATE}`;
  },

  selfie_shot: (p) => {
    const scene = p?.selfie_scene || "mirror_selfie_bedroom";
    const scenes: Record<string, string> = {
      mirror_selfie_bedroom: `A casual bedroom mirror selfie taken on a smartphone. The background is a real, lived-in bedroom — a neatly made bed with neutral linen bedding, a houseplant, some items on a side table. Natural morning window light from camera-left. The phone is visible at the top of the frame at a natural arm's length angle, as if the person is actually taking the selfie. Slightly imperfect framing — not perfectly centred. The overall vibe is authentic, aspirational, and real. Shot at f/2.2 equivalent with natural phone bokeh on a modern iPhone/Samsung camera.`,
      mirror_selfie_bathroom: `A bathroom mirror selfie. Clean white subway tiles, a vanity light strip above the mirror creating flattering even illumination. The phone visible in the reflection at mid-chest height. Clean, honest, relatable. Background slightly blurred as per phone camera behaviour. A few toiletries on the shelf add authenticity. Daylight bulbs (5000K), bright and clear.`,
      fitting_room: `A retail fitting room photo. A curtained fitting room cubicle, warm overhead LED lighting. Shot from slightly below shoulder height, as if self-photographed. Curtain slightly open behind. The kind of photo you'd see on a real Vinted listing — honest, direct, well-lit. The garment is the clear focus.`,
      hand_held_outside: `An outdoor candid photo taken hand-held on a smartphone at arm's length. Natural daylight, slightly overcast (diffused light, no harsh shadows). A softly blurred street, park, or building in the background. The photo has the energy of a real person photographing their outfit — direct camera angle, authentic framing. Shot equivalent to f/1.8 on a modern smartphone, background softly defocused.`,
    };
    return `You are simulating a photorealistic smartphone photograph. Create an image that is completely indistinguishable from a real photo taken by a real person — NOT a rendered or AI-generated image. The key is authentic imperfection: real lighting variation, natural depth of field from a phone camera, genuine environment with lived-in details.

Scene: ${scenes[scene] || scenes.mirror_selfie_bedroom}

PHOTOREALISM MANDATE: This image must pass as a real photograph. No AI rendering artefacts. No perfect symmetry. No studio-clean lighting. Real environments, real lighting physics, real phone camera characteristics (slight lens distortion at edges, natural bokeh shape, authentic skin rendering).

${GARMENT_PRESERVE}
${QUALITY_MANDATE}`;
  },

  enhance: () =>
    `You are a professional retoucher enhancing this clothing/fashion product photo for premium e-commerce. Apply the following corrections while keeping the original background and composition exactly the same:

LIGHTING & EXPOSURE:
- Correct white balance to neutral (5500K daylight standard) — remove any colour casts
- Even out exposure — recover detail in shadows and highlights without clipping
- Add clean, professional-quality fill lighting to eliminate any unflattering shadows on the garment

SHARPNESS & DETAIL:
- Apply intelligent sharpening to enhance fabric texture, stitching detail, and garment structure
- Micro-contrast enhancement to make fabric textures pop — you should be able to see the weave
- Reduce noise and graininess while preserving fine detail (smart noise reduction, not blur)

COLOUR:
- Boost colour vibrancy and saturation subtly while keeping colours accurate and true-to-life
- Ensure consistent colour temperature across the entire image
- Colours should look rich and appealing but never oversaturated or artificial

The final result should look like it was shot by a professional photographer with a proper lighting setup, even if the original was taken on a phone.

${GARMENT_PRESERVE}
${QUALITY_MANDATE}`,
};

// Models per operation
const MODEL_MAP: Record<string, string> = {
  remove_bg: "google/gemini-2.5-flash-image",
  smart_bg: "google/gemini-3-pro-image-preview",
  model_shot: "google/gemini-3-pro-image-preview",
  mannequin_shot: "google/gemini-3-pro-image-preview",
  ghost_mannequin: "google/gemini-2.5-flash-image",
  flatlay_style: "google/gemini-3-pro-image-preview",
  selfie_shot: "google/gemini-3-pro-image-preview",
  enhance: "google/gemini-2.5-flash-image",
};

// Operations allowed per tier
const TIER_OPERATIONS: Record<string, string[]> = {
  free: ["remove_bg", "enhance"],
  pro: ["remove_bg", "enhance", "smart_bg", "selfie_shot", "flatlay_style", "model_shot"],
  business: ["remove_bg", "enhance", "smart_bg", "model_shot", "mannequin_shot", "ghost_mannequin", "flatlay_style", "selfie_shot"],
  scale: ["remove_bg", "enhance", "smart_bg", "model_shot", "mannequin_shot", "ghost_mannequin", "flatlay_style", "selfie_shot"],
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

    const { image_url, operation, parameters, garment_context } = await req.json();

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
    // Inject garment_context into parameters so prompts can use it
    const enrichedParams = { ...(parameters || {}), garment_context: garment_context || "" };
    let prompt = OPERATION_PROMPTS[operation](enrichedParams);
    // For operations that don't have built-in garment context injection, append it
    if (garment_context && !["model_shot"].includes(operation)) {
      prompt += buildGarmentContext(garment_context);
    }

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
