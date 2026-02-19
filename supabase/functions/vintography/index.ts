import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Hyper-optimised fashion-photography prompts ──────────────────────
const QUALITY_MANDATE = `OUTPUT REQUIREMENTS: Deliver the highest possible resolution and quality. The result must be indistinguishable from work by a professional fashion photographer using a full-frame camera with a prime lens. Maintain pixel-level sharpness on fabric textures, stitching, and hardware.`;

const NO_TEXT = `ABSOLUTE RULE #1 — ZERO ADDED TEXT OR LABELS: The output image must contain ABSOLUTELY NO text, labels, tags, captions, titles, words, letters, numbers, annotations, watermarks, or any written content that does not exist in the original input image. This includes garment labels — do NOT generate, fabricate, or hallucinate brand labels, size tags, care labels, or neck tags. If no label is visible in the original photo, there must be NO label in the output. If a label IS visible in the original, keep it at the EXACT same size and visibility — do NOT enhance it, enlarge it, sharpen it, or fabricate readable text on it. If the label text is blurry or unreadable in the original, it must remain blurry and unreadable. NEVER guess what a label might say. ANY added text or fabricated label instantly fails the task.`;

const GARMENT_PRESERVE = `GARMENT INTEGRITY (NON-NEGOTIABLE): Preserve every single detail of the garment with forensic accuracy — all logos, prints, embroidery, textures, stitching patterns, buttons, zippers, tags, brand markers, fabric weave, and colour must remain perfectly intact, unaltered, and unobscured. STRUCTURAL DETAILS ARE CRITICAL: all pockets (patch pockets, welt pockets, chest pockets, side pockets, pocket flaps), all visible seams (topstitching, flat-felled seams, French seams, princess seams, yoke seams, waist seams), darts, pleats, belt loops, rivets, grommets, and any other construction details MUST be preserved exactly as they appear in the original image. These are defining features of the garment — removing or smoothing over them fundamentally changes the product. Maintain accurate colour reproduction under the new lighting conditions. DO NOT change the garment type — if the input is a crewneck sweatshirt, it must remain a crewneck sweatshirt. DO NOT add a hood, DO NOT change the neckline, DO NOT alter the silhouette. The garment identity must be preserved exactly.`;

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

    const isStudioScene = ["studio_white", "studio_grey", "marble_luxury", "linen_flat"].includes(style || "studio_white");
    const hangingInstruction = isStudioScene
      ? `GARMENT PRESENTATION: The garment is displayed flat or ghost-style (no body, no hanger visible), floating naturally centred in the scene as a clean product shot.`
      : `GARMENT PRESENTATION: The garment MUST be hung on a slim metal clothing rail or a high-quality wooden coat hanger. The hanger and rail should be visible and look real — this is non-negotiable. The garment hangs naturally under gravity with realistic fabric drape and weight. Do NOT float the garment in space, do NOT show it on a flat surface, do NOT show it being held. It must look like a boutique or editorial styling shot where the garment hangs on a rail in the scene. The rail should be positioned in the upper portion of the frame with the garment hanging down naturally.`;

    return `You are an editorial fashion photographer creating lifestyle product imagery. Take this clothing item and place it naturally into the following scene: ${styles[style] || styles.studio_white}.

${hangingInstruction}

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
    const shotStyle = p?.shot_style || "editorial";
    const fullBody = p?.full_body !== "false"; // default true

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

    const shotStyleMandates: Record<string, string> = {
      editorial: "SHOT STYLE: Clean, professional editorial photography. Perfect studio or location lighting. Every element intentional and composed. Think a high-end fashion campaign — polished, aspirational, precise.",
      natural_photo: "PHOTOREALISM MANDATE: This image must be completely indistinguishable from a real photograph taken by a professional photographer on location. Natural light physics — the light behaves exactly as it would in reality. Real environment textures with depth and character. Authentic depth of field with natural bokeh. ABSOLUTELY NO studio compositing artefacts, no AI smoothing, no perfect symmetry. The model should look like they genuinely exist in this environment — not placed into it. If outdoor, show real sky and ambient fill. If indoor, show realistic room light falloff and ambient shadows. The final image must pass as a real photograph taken on a full-frame camera.",
      street_style: "STREET STYLE MANDATE: Authentic street photography energy. Candid, slightly imperfect framing that feels real rather than staged. Natural pose — the model is caught mid-moment, not posing for a campaign. Urban environment with authentic depth. Overcast or golden-hour natural light — no flash, no studio fill. Think a real influencer photo taken by a friend on the street, or a candid street style shot from a fashion week photographer. The image should feel spontaneous, effortless, and real.",
    };

    const fullBodyMandate = fullBody
      ? `\nCOMPOSITION (NON-NEGOTIABLE): The model must be framed head-to-toe. The COMPLETE garment from neckline to bottom hem must be fully visible in the frame. NEVER crop the garment — not at the hem, not at the sleeves, not at the neckline. If the background feels tight, zoom out. Leave deliberate negative space below the hem and above the head. The garment is the product — it must be entirely visible. A cropped garment is a failed shot.\n`
      : "";

    const garmentCtx = p?.garment_context ? `\n\nGARMENT IDENTITY (CRITICAL — READ BEFORE GENERATING): The garment is: ${p.garment_context}. Generate this EXACT garment type. If it says "crewneck sweatshirt", the model MUST wear a crewneck sweatshirt with a round neckline and NO hood. If it says "t-shirt", it must be a t-shirt. DO NOT substitute with any other garment type. DO NOT add a hood. DO NOT change the neckline.\n` : "";

    return `You are a world-class fashion photographer. Create a photo-realistic image of a ${gender} model wearing this exact garment.
${garmentCtx}
${shotStyleMandates[shotStyle] || shotStyleMandates.editorial}
${fullBodyMandate}
MODEL REQUIREMENTS:
- Body: Natural, healthy proportions appropriate for the garment's size. Realistic body type — not exaggerated or idealised.
- Skin: Photo-realistic skin texture with natural pores, subtle imperfections, and realistic subsurface scattering. ABSOLUTELY NO plastic, waxy, AI-smoothed, or airbrushed skin. Must look like a real photograph of a real person with real skin.
- Hands: Exactly 5 fingers per hand — count them. Natural proportions, relaxed. Fingernails clean and natural length. No extra fingers, no merged fingers, no missing fingers.
- Face: ${looks[look] || looks.classic}. Natural expression — no uncanny valley. Eyes must have realistic catchlights from the scene's light source. Real-looking hair with individual strand definition.
- Pose: ${poses[pose] || poses.standing_front}

GARMENT FIT:
- The garment must show realistic fabric physics — natural gravity, proper drape based on fabric weight, visible tension at shoulders and closures, natural wrinkles at elbows and waist. Fabric must react to the pose realistically.
- Sizing looks correct for the model — not too tight, not too loose.

CAMERA SIMULATION:
- Shot on a full-frame camera with a 50mm f/1.8 lens at approximately 6-8 feet distance.
- Background: ${bgs[bg] || bgs.studio}
- Sharp focus on the garment and model's face, with natural depth-of-field falloff into the background.

${GARMENT_PRESERVE}
${QUALITY_MANDATE}`;
  },

  mannequin_shot: (p) => {
    const mannequinType = p?.mannequin_type || "headless";
    const bg = p?.model_bg || "studio";
    const lighting = p?.lighting_style || "soft_studio";

    const types: Record<string, string> = {
      headless: "a professional retail display mannequin — sleek, matte white/light grey, headless (no head or neck whatsoever), with realistic torso, arms, and legs proportioned for an adult. The mannequin should look like a high-end boutique display fixture you'd see in a premium fashion store. Clean seams, professional finish.",
      ghost: "an invisible/ghost mannequin effect. The garment should appear to float in perfect 3D shape as if worn by an invisible person. Fill the interior of the garment at necklines, sleeve openings, and waistbands with realistic fabric continuation showing the garment's natural inner structure and lining. The result should be indistinguishable from premium e-commerce imagery — think Net-a-Porter or ASOS Premium product shots. The garment holds its shape perfectly with no visible support.",
      dress_form: "a traditional tailor's dress form / seamstress dummy — fabric-covered in natural linen or canvas colour, with visible topstitching and adjustment seams. Mounted on a simple elegant black iron stand with a stable base. The form should look authentic and artisanal, as used in a real couture atelier or bespoke dressing room. The stand adds to the craft-studio aesthetic.",
      half_body: "a professional waist-up half-body retail display mannequin — headless (no head or neck), matte white finish, realistic torso and arm proportions to just below the hips. Ideal for displaying tops, jackets, shirts, and knitwear. The mannequin base is clean and minimal. Professional boutique quality.",
    };

    const lightings: Record<string, string> = {
      soft_studio: "perfectly even wraparound studio lighting with two large softboxes positioned camera-left and camera-right at 45° angles. No harsh shadows anywhere on the garment. Clean, bright, professional e-commerce product lighting — the gold standard for online fashion retail. White balance 5500K.",
      dramatic: "a single strong key light from 45° camera-left creating defined, dramatic shadows that give the garment real dimension, depth, and texture. A weak fill light at 1/4 the key power from camera-right prevents pure black shadows. The result is editorial and impactful — the shadows sculpt the garment and make it look three-dimensional and exciting.",
      natural: "warm, soft window-simulated natural light from camera-left. The light has the quality of afternoon sun filtered through a sheer linen curtain — directional but beautifully diffused. Slightly warm colour temperature (4000K). A soft reflector on camera-right fills shadows with warm ambient bounce light. The result feels organic, premium, and real.",
    };

    const bgs: Record<string, string> = {
      studio: "a professional photography studio with a pure white seamless paper sweep backdrop. Clean, minimal, professional e-commerce quality",
      grey_gradient: "a smooth mid-grey gradient studio backdrop, transitioning from darker grey at the edges to lighter grey at centre. Refined and sophisticated",
      living_room: "a beautifully styled contemporary living room — neutral stone-coloured sofa softly visible in the background, a healthy plant catching ambient light, warm blonde oak flooring. Aspirational lifestyle setting",
      dressing_room: "a stylish personal dressing room with a clothing rail of curated garments softly visible in the background, warm Edison bulb lighting from above. Aspirational walk-in wardrobe energy",
      brick: "an exposed red-brown brick wall backdrop with authentic texture and character. Warm tungsten-style accent lighting creating interesting shadows in the mortar lines. Industrial-chic editorial feel",
      flat_marble: "an elegant white Carrara marble surface with delicate grey veining, shot from a slightly elevated angle. Soft overhead lighting with gentle shadows. Luxury fashion aesthetic",
      park: "a beautiful park setting with soft green foliage bokeh in the background. Natural daylight with warm ambient fill. Fresh, outdoor lifestyle feel",
    };

    const compositionMandates: Record<string, string> = {
      headless: `HEADLESS MANNEQUIN COMPOSITION (NON-NEGOTIABLE):
- The mannequin MUST be completely headless — the torso begins at the shoulder line with a clean, flat horizontal cut. Absolutely NO head, NO neck stub, NO partial skull. The top of the mannequin is the shoulder line, period.
- Frame the shot so the FULL mannequin from the shoulder cut-line down to the base/feet is fully visible — nothing cropped at top or bottom.
- The mannequin must face the camera squarely — front-on, zero rotation. NOT angled. NOT 3/4 view.
- Centre the mannequin in the frame with equal breathing room on left and right sides.`,
      ghost: `GHOST MANNEQUIN — TWO-STAGE PROCESS:
STAGE 1: Mentally extract and isolate the garment from the original photo, removing any background, person, hanger, or support.
STAGE 2: Render the isolated garment floating in perfect 3D shape as if worn by a person who has been made COMPLETELY INVISIBLE.

GHOST MANNEQUIN TECHNICAL REQUIREMENTS (each point is mandatory):
- The garment MUST hold its full 3D shape and volume exactly as it would when worn on a real body — no flat, collapsed, or deflated areas.
- NECKLINE: Fill the neck opening with a realistic view of the garment's interior — inner collar, any visible label, and clean fabric continuation showing the inside of the neckline. Do NOT show a white hole or empty space at the neckline.
- SLEEVE OPENINGS: Fill each sleeve opening with a short realistic view of the sleeve interior fabric — the lining or inside of the sleeve cuff. Not a white void.
- WAIST/HEM: If the garment has a visible hem, show a subtle glimpse of the garment's interior fabric or lining at the hem opening.
- ABSOLUTELY NO visible support structures, NO hanger wire, NO mannequin form, NO stand, NO clips — nothing that supports the garment should appear in the final image.
- The garment must appear completely self-supporting and three-dimensional.
- Cast a soft, diffused shadow directly beneath the garment on the background surface to ground it.`,
      dress_form: `DRESS FORM COMPOSITION:
- The full dress form from shoulder to base stand must be visible — nothing cropped.
- The form faces the camera squarely, centred in frame.
- The stand and base must be visible below the form.`,
      half_body: `HALF-BODY MANNEQUIN COMPOSITION:
- Frame waist-up: show the mannequin from just below the hips to the shoulder cut-line (headless).
- The full garment from neckline to hem must be visible — nothing cropped.
- The mannequin faces camera squarely, centred in frame.
- Headless — the torso ends cleanly at the shoulder line with no head or neck.`,
    };

    return `You are a professional e-commerce product photographer. Display this clothing/fashion garment on ${types[mannequinType]}.

STEP 1 — GARMENT EXTRACTION: First, mentally isolate the garment from the original photo context (person, hanger, background). Identify every detail: colour, texture, brand marks, buttons, zippers, seams, silhouette.

STEP 2 — MANNEQUIN PLACEMENT: Place the extracted garment onto the mannequin form. The garment must fit the mannequin naturally with realistic fabric physics.

${compositionMandates[mannequinType] || ""}

GARMENT DISPLAY (NON-NEGOTIABLE):
- The garment must be positioned perfectly centred on the mannequin with completely natural fabric drape and realistic weight
- Show the COMPLETE garment from neckline to bottom hem — NEVER crop the garment at any edge
- Fabric must show natural gravity, proper drape based on fabric weight and construction, and realistic wrinkle physics
- All buttons, zippers, and closures should be in their natural wearing position (buttoned/zipped unless it's a jacket that would naturally be open)
- The garment must fill the mannequin form convincingly — not baggy or ill-fitting

LIGHTING: ${lightings[lighting] || lightings.soft_studio}

BACKGROUND: ${bgs[bg] || bgs.studio}

SHADOW: Cast a realistic, soft shadow beneath the mannequin/garment that grounds it convincingly in the scene. The shadow direction must be consistent with the lighting setup.

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

  decrease: (p) => {
    const intensity = p?.intensity || "standard";

    const intensities: Record<string, string> = {
      light: "Remove only the most prominent creases — deep fold lines, sharp compression creases from storage, and crumpling wrinkles. Preserve gentle natural drape folds that occur when fabric hangs — these show fabric character. The result should look like the garment was gently hand-pressed but not dry-cleaned.",
      standard: "Remove all storage creases, fold lines, compression wrinkles, and crumpling. Preserve only the structural fabric drape that occurs naturally from gravity — the way fabric hangs from shoulders or drapes over a body form. The result should look like the garment was professionally steamed for 60 seconds.",
      deep: "Remove every wrinkle, crease, fold line, and texture distortion caused by storage, folding, handling, or poor presentation. The fabric surface should appear immaculate — as if the garment is brand new, freshly pressed, and on a high-street shop display rail for the first time. Preserve fabric texture (weave, knit pattern, cord ridges) but eliminate all deformation of that texture.",
    };

    return `You are a professional fashion retoucher specialising in fabric smoothing for e-commerce photography. Your task is to remove creases, wrinkles, and fold lines from this garment photo.

INTENSITY: ${intensities[intensity] || intensities.standard}

WHAT TO REMOVE — CREASES (eliminate these):
- Sharp fold lines from being stored folded in a drawer or shipped in packaging
- Compression wrinkles from being packed tightly
- Crumpling wrinkles across the body of the fabric
- Horizontal banding wrinkles across chest/sleeves from hanging or folding
- Packing creases — the very defined lines from cardboard fold points
- Any fabric deformation caused by poor storage, handling, or transit

WHAT TO KEEP — NATURAL FABRIC BEHAVIOUR (preserve these):
- The garment's overall silhouette and shape — do NOT change how the garment looks
- Natural gravitational drape — the gentle curves of fabric as it hangs or is laid flat
- Fabric texture: weave patterns, knit structure, corduroy ridges, denim twill lines — these are texture, not creases
- Intentional design elements: pleats, gathers, ruched seams, smocking, or fabric tucks that are part of the garment's design
- The accurate colour and shading of the fabric — do NOT bleach or overexpose
- Any deliberate faded or distressed areas (important for denim/vintage)

RETOUCHING TECHNIQUE:
- Work methodically across the fabric surface — chest first, then sleeves, then body
- Smooth fabric by "filling in" the crease valleys to match the surrounding fabric height and texture
- Maintain consistent fabric texture across previously creased areas — the smoothed area should be indistinguishable from uncreased areas
- Preserve natural lighting falloff across the garment — do NOT flatten the lighting or create an artificial airbrushed look
- The final garment should look like it was pressed in a professional steamer for 2–3 minutes

BACKGROUND: Leave the background completely unchanged — only edit the garment itself
GARMENT IDENTITY: The garment type, colour, brand marks, logos, prints, fit, and silhouette must remain 100% identical to the original. Only the fabric surface texture (crease removal) changes.

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
  remove_bg: "google/gemini-3-pro-image-preview",
  smart_bg: "google/gemini-3-pro-image-preview",
  model_shot: "google/gemini-3-pro-image-preview",
  mannequin_shot: "google/gemini-3-pro-image-preview",
  ghost_mannequin: "google/gemini-3-pro-image-preview",
  flatlay_style: "google/gemini-3-pro-image-preview",
  selfie_shot: "google/gemini-3-pro-image-preview",
  enhance: "google/gemini-3-pro-image-preview",
  decrease: "google/gemini-3-pro-image-preview",
};

// Operations allowed per tier
const TIER_OPERATIONS: Record<string, string[]> = {
  free: ["remove_bg", "enhance", "decrease"],
  pro: ["remove_bg", "enhance", "decrease", "smart_bg", "flatlay_style", "mannequin_shot", "selfie_shot"],
  business: ["remove_bg", "enhance", "decrease", "smart_bg", "model_shot", "mannequin_shot", "ghost_mannequin", "flatlay_style", "selfie_shot"],
  scale: ["remove_bg", "enhance", "decrease", "smart_bg", "model_shot", "mannequin_shot", "ghost_mannequin", "flatlay_style", "selfie_shot"],
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

    const { image_url, operation, parameters, garment_context, sell_wizard } = await req.json();

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

    // AI Model shots cost 4 credits (uses expensive Pro model); everything else costs 1
    const creditsToDeduct = operation === "model_shot" ? 4 : 1;

    // ── First-item-free pass check ──────────────────────────────────────
    // AI Model shots are never free — too expensive even on the free pass
    let useFirstItemPass = false;
    if (sell_wizard && operation !== "model_shot") {
      const { data: passProfile } = await adminClient
        .from("profiles")
        .select("first_item_pass_used")
        .eq("user_id", user.id)
        .single();
      if (passProfile?.first_item_pass_used === false) {
        useFirstItemPass = true;
        console.log(`[first-item-pass] User ${user.id} — skipping credit deduction for vintography (${operation})`);
      }
    }
    // ── End first-item-free pass check ──────────────────────────────────

    if (!useFirstItemPass && credits && limit < 999) {
      const totalUsed = (credits.price_checks_used || 0) + (credits.optimizations_used || 0) + (credits.vintography_used || 0);
      if (totalUsed + creditsToDeduct > limit) {
        const msg = operation === "model_shot"
          ? `AI Model shots cost 4 credits. You have ${limit - totalUsed} credit${limit - totalUsed === 1 ? "" : "s"} remaining. Upgrade your plan or top up.`
          : "Monthly credit limit reached. Upgrade your plan for more.";
        return new Response(
          JSON.stringify({ error: msg }),
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
    // Keep no-text rule concise — long negative prompts confuse image generation models
    prompt = `Generate an image following these instructions precisely. Do NOT add any text, labels, or watermarks.\n\n${prompt}\n\nGenerate the final image now.`;

    console.log(`Processing ${operation} with model ${model} for user ${user.id}`);

    let aiResponse: Response;
    try {
      console.log(`Calling AI gateway with model ${model} for operation ${operation}`);
      aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
          // Use multiple parameter names to ensure the gateway picks up image generation mode
          modalities: ["text", "image"],
          response_modalities: ["text", "image"],
          generation_config: { response_modalities: ["TEXT", "IMAGE"] },
        }),
      });
      console.log(`AI gateway responded with status ${aiResponse.status}`);
    } catch (fetchErr) {
      console.error("AI gateway fetch failed:", fetchErr);
      await adminClient
        .from("vintography_jobs")
        .update({ status: "failed", error_message: `AI fetch error: ${fetchErr}` })
        .eq("id", job.id);
      return new Response(JSON.stringify({ error: "AI service unavailable. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    const message = aiData.choices?.[0]?.message;
    
    // Try multiple response formats the gateway might use
    let imageResult: string | null = null;
    
    // Format 1: images array (some gateway versions)
    if (!imageResult && message?.images?.[0]?.image_url?.url) {
      imageResult = message.images[0].image_url.url;
    }
    // Format 2: inline content array with image parts
    if (!imageResult && Array.isArray(message?.content)) {
      const imgPart = message.content.find((p: any) => 
        p.type === "image_url" || p.type === "image" || p.image_url
      );
      imageResult = imgPart?.image_url?.url || imgPart?.url || null;
    }
    // Format 3: content is a base64 data URL string
    if (!imageResult && typeof message?.content === "string" && message.content.startsWith("data:image")) {
      imageResult = message.content;
    }
    
    console.log("Image result found:", !!imageResult, imageResult ? `(length: ${imageResult.length})` : "(null)");

    if (!imageResult) {
      console.error("No image in response. Message keys:", JSON.stringify(message ? Object.keys(message) : "null"));
      console.error("Content type:", typeof message?.content, Array.isArray(message?.content) ? `(array len ${message.content.length})` : "");
      console.error("Content preview:", JSON.stringify(message?.content)?.substring(0, 500));
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

    // Atomic increment — skip if on first-item-free pass
    if (!useFirstItemPass) {
      await fetch(`${supabaseUrl}/rest/v1/rpc/increment_usage_credit`, {
        method: "POST",
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_user_id: user.id, p_column: "vintography_used", p_amount: creditsToDeduct }),
      });
    }

    return new Response(
      JSON.stringify({
        job_id: job.id,
        processed_url: publicUrl.publicUrl,
        operation,
        credits_used: used + creditsToDeduct,
        credits_deducted: creditsToDeduct,
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
