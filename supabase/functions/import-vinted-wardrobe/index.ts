import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Tier import limits
const TIER_LIMITS: Record<string, number> = {
  free: 20,
  pro: 200,
  business: 9999,
  scale: 9999,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Invalid auth token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { profile_url } = await req.json();
    if (!profile_url || typeof profile_url !== "string") {
      return new Response(JSON.stringify({ success: false, error: "profile_url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user tier for import limits
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("user_id", user.id)
      .maybeSingle();
    const tier = profile?.subscription_tier || "free";
    const importLimit = TIER_LIMITS[tier] || 20;

    // Normalise the profile URL to the wardrobe/items page
    let wardrobeUrl = profile_url.trim();
    if (!wardrobeUrl.startsWith("http")) {
      wardrobeUrl = `https://www.${wardrobeUrl}`;
    }
    // Ensure it ends with /items for the wardrobe view
    if (!wardrobeUrl.includes("/items")) {
      wardrobeUrl = wardrobeUrl.replace(/\/?$/, "/items");
    }

    console.log(`Scraping wardrobe: ${wardrobeUrl} for user ${user.id} (tier: ${tier}, limit: ${importLimit})`);

    // Scrape with Firecrawl
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      return new Response(JSON.stringify({ success: false, error: "Firecrawl not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: wardrobeUrl,
        formats: ["markdown"],
        waitFor: 3000,
      }),
    });

    const scrapeData = await scrapeResponse.json();
    if (!scrapeResponse.ok || !scrapeData.success) {
      console.error("Firecrawl error:", JSON.stringify(scrapeData));
      return new Response(
        JSON.stringify({
          success: false,
          error: "Could not scrape the wardrobe. Make sure your Vinted profile is public.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
    if (!markdown || markdown.length < 100) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Your wardrobe appears empty or private. Make sure your Vinted profile is public and has active listings.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Scraped ${markdown.length} chars of markdown. Sending to AI for extraction...`);

    // Extract structured data via Lovable AI
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ success: false, error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine the base domain from the wardrobe URL for constructing item links
    const urlObj = new URL(wardrobeUrl);
    const baseDomain = `${urlObj.protocol}//${urlObj.hostname}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You extract Vinted listing data from scraped wardrobe markdown. Return a JSON array of items. Each item must have these fields:
- title (string) — the listing title
- brand (string or null) — brand name if visible
- current_price (number or null) — price as a number (no currency symbol)
- category (string or null) — infer from title/context (e.g. Trainers, Jacket, Dress, T-Shirt, Jeans, Hoodie, Bag, Shoes)
- condition (string or null) — if visible (e.g. New with tags, Very good, Good, Satisfactory)
- size (string or null) — if visible
- image_url (string or null) — first image URL if available (full URL)
- vinted_url (string or null) — full URL to the listing (construct from relative paths using base domain: ${baseDomain})

Return ONLY a valid JSON array, nothing else. No markdown fences. Maximum ${importLimit} items.
If you can't find any listings, return an empty array [].`,
          },
          {
            role: "user",
            content: `Extract all Vinted listings from this wardrobe page:\n\n${markdown.substring(0, 30000)}`,
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ success: false, error: "Rate limited. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: false, error: "AI extraction failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "[]";

    // Parse the JSON array from AI response
    let items: any[] = [];
    try {
      // Strip markdown fences if present
      const cleaned = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      items = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Failed to parse AI response:", rawContent.substring(0, 500));
      return new Response(
        JSON.stringify({ success: false, error: "Failed to parse listing data from your wardrobe." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No listings found. Your wardrobe may be empty or private.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit to tier allowance
    const cappedItems = items.slice(0, importLimit);
    console.log(`Extracted ${items.length} items, importing ${cappedItems.length} (limit: ${importLimit})`);

    // Upsert into listings table
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of cappedItems) {
      if (!item.title) {
        skipped++;
        continue;
      }

      const vintedUrl = item.vinted_url || null;

      // Check for existing listing by vinted_url
      if (vintedUrl) {
        const { data: existing } = await supabase
          .from("listings")
          .select("id")
          .eq("user_id", user.id)
          .eq("vinted_url", vintedUrl)
          .maybeSingle();

        if (existing) {
          // Update existing
          await supabase
            .from("listings")
            .update({
              current_price: item.current_price ?? undefined,
              title: item.title,
              brand: item.brand ?? undefined,
              category: item.category ?? undefined,
              condition: item.condition ?? undefined,
              size: item.size ?? undefined,
              image_url: item.image_url ?? undefined,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
          updated++;
          continue;
        }
      }

      // Insert new
      const { error: insertErr } = await supabase.from("listings").insert({
        user_id: user.id,
        title: item.title,
        brand: item.brand || null,
        category: item.category || null,
        condition: item.condition || null,
        size: item.size || null,
        current_price: item.current_price || null,
        image_url: item.image_url || null,
        vinted_url: vintedUrl,
        status: "active",
      });

      if (insertErr) {
        console.error("Insert error:", insertErr);
        skipped++;
      } else {
        imported++;
      }
    }

    console.log(`Import complete: ${imported} imported, ${updated} updated, ${skipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        imported,
        updated,
        skipped,
        total: imported + updated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("import-vinted-wardrobe error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
