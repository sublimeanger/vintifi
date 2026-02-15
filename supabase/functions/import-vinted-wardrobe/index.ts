import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIER_LIMITS: Record<string, number> = { free: 20, pro: 200, business: 9999, scale: 9999 };
const TIER_DEEP_LIMITS: Record<string, number> = { free: 5, pro: 50, business: 9999, scale: 9999 };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Invalid auth token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { profile_url, deep_import } = await req.json();
    if (!profile_url || typeof profile_url !== "string") {
      return new Response(JSON.stringify({ success: false, error: "profile_url is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Tier limits ---
    const { data: profile } = await supabase
      .from("profiles").select("subscription_tier").eq("user_id", user.id).maybeSingle();
    const tier = profile?.subscription_tier || "free";
    const importLimit = TIER_LIMITS[tier] || 20;
    const deepLimit = TIER_DEEP_LIMITS[tier] || 5;

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { count: importedThisMonth } = await supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", monthStart.toISOString());

    const usedCount = importedThisMonth ?? 0;
    const remaining = Math.max(0, importLimit - usedCount);

    if (remaining <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: `You've reached your monthly import limit of ${importLimit} listings. Upgrade your plan for more.` }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Build wardrobe URL ---
    let wardrobeUrl = profile_url.trim();
    if (!wardrobeUrl.startsWith("http")) wardrobeUrl = `https://www.${wardrobeUrl}`;
    if (!wardrobeUrl.includes("/items")) wardrobeUrl = wardrobeUrl.replace(/\/?$/, "/items");

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      return new Response(JSON.stringify({ success: false, error: "Firecrawl not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ success: false, error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========================================
    // PHASE 1: SCRAPE links from the member's wardrobe page (JS-rendered)
    // ========================================
    console.log(`Phase 1: Scraping links from ${wardrobeUrl} (tier: ${tier}, limit: ${importLimit})`);

    const urlObj = new URL(wardrobeUrl);
    const baseDomain = `${urlObj.protocol}//${urlObj.hostname}`;

    const linksResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url: wardrobeUrl,
        formats: ["links"],
        onlyMainContent: true,
        waitFor: 5000,
        timeout: 30000,
      }),
    });

    const linksData = await linksResponse.json();
    if (!linksResponse.ok || !linksData.success) {
      console.error("Firecrawl links scrape error:", JSON.stringify(linksData));
      return new Response(JSON.stringify({ success: false, error: "Could not scrape the wardrobe. Make sure your Vinted profile is public." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract links from response (may be in data.links or links)
    const allLinks: string[] = linksData.data?.links || linksData.links || [];

    // Extract member ID from URL to validate items belong to this member
    const memberMatch = wardrobeUrl.match(/member\/(\d+)/);
    const memberId = memberMatch ? memberMatch[1] : "";

    // Item URLs look like: https://www.vinted.co.uk/items/1234567890-item-slug
    const itemUrlPattern = /\/items\/(\d+)/;
    const memberItemUrls = allLinks.filter(link => {
      try {
        const u = new URL(link);
        return u.hostname === urlObj.hostname && itemUrlPattern.test(u.pathname);
      } catch { return false; }
    });

    console.log(`Map found ${allLinks.length} total URLs, ${memberItemUrls.length} item URLs`);

    if (memberItemUrls.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "No items found in this wardrobe. Make sure the profile is public and has active listings." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cap to import limit
    const cappedUrls = memberItemUrls.slice(0, Math.min(importLimit, remaining));

    // ========================================
    // PHASE 2: SCRAPE wardrobe page for item details
    // ========================================
    console.log(`Phase 2: Scraping wardrobe page for details...`);

    // Light scrape — no scrolling, just main content
    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url: wardrobeUrl,
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 3000,
        timeout: 30000,
      }),
    });

    const scrapeData = await scrapeResponse.json();
    let wardrobeMarkdown = "";
    if (scrapeResponse.ok && scrapeData.success) {
      wardrobeMarkdown = scrapeData.data?.markdown || scrapeData.markdown || "";
    }

    console.log(`Wardrobe scrape: ${wardrobeMarkdown.length} chars`);

    // Build a set of valid item IDs from the map phase for validation
    const validItemIds = new Set<string>();
    for (const url of cappedUrls) {
      const match = url.match(/\/items\/(\d+)/);
      if (match) validItemIds.add(match[1]);
    }

    // ========================================
    // PHASE 3: AI extraction — extract items from scraped content, filtered by whitelist
    // ========================================
    console.log(`Phase 3: AI extraction with ${validItemIds.size} whitelisted item IDs...`);

    const whitelistStr = Array.from(validItemIds).join(", ");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You extract Vinted listing data from a scraped wardrobe page.

CRITICAL: You have a WHITELIST of valid item IDs. ONLY extract items whose Vinted item ID appears in this whitelist.
WHITELIST of valid item IDs: [${whitelistStr}]

If an item's ID is NOT in the whitelist, SKIP IT completely. This is the most important rule.

Return a JSON array. Each item must have:
- item_id (string) — the numeric Vinted item ID from the URL
- title (string)
- brand (string or null)
- current_price (number or null)
- category (string or null)
- condition (string or null)
- size (string or null)
- image_url (string or null)
- vinted_url (string or null) — full URL using base domain: ${baseDomain}

Return ONLY a valid JSON array. No markdown fences.`,
          },
          {
            role: "user",
            content: wardrobeMarkdown.length > 200
              ? `Extract items from this wardrobe page. Remember: ONLY include items with IDs in the whitelist.\n\n${wardrobeMarkdown.substring(0, 60000)}`
              : `I have ${cappedUrls.length} item URLs from a Vinted wardrobe. Generate basic listing data from the URL slugs.\n\nURLs:\n${cappedUrls.slice(0, 200).join("\n")}`,
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
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: false, error: "AI extraction failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "[]";

    let items: any[] = [];
    try {
      const cleaned = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      items = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", rawContent.substring(0, 500));
      // Fallback: create items from URLs alone
      items = cappedUrls.map(url => {
        const match = url.match(/\/items\/(\d+)-?(.*)/);
        const slug = match?.[2]?.replace(/-/g, " ") || "Unknown item";
        return {
          item_id: match?.[1] || "",
          title: slug.charAt(0).toUpperCase() + slug.slice(1),
          brand: null,
          current_price: null,
          category: null,
          condition: null,
          size: null,
          image_url: null,
          vinted_url: url,
        };
      });
      console.log(`Fallback: created ${items.length} items from URL slugs`);
    }

    if (!Array.isArray(items)) items = [];

    // POST-EXTRACTION VALIDATION: Only keep items whose ID is in the whitelist
    const validatedItems = items.filter(item => {
      if (!item.item_id && item.vinted_url) {
        const match = item.vinted_url.match(/\/items\/(\d+)/);
        if (match) item.item_id = match[1];
      }
      return item.item_id && validItemIds.has(String(item.item_id));
    });

    console.log(`AI extracted ${items.length} items, ${validatedItems.length} passed whitelist validation`);

    // If AI extraction gave us few results, fill in from URLs
    if (validatedItems.length < cappedUrls.length * 0.5) {
      console.log("Low extraction rate — supplementing with URL-based items");
      const existingIds = new Set(validatedItems.map(i => String(i.item_id)));
      for (const url of cappedUrls) {
        const match = url.match(/\/items\/(\d+)-?(.*)/);
        if (!match) continue;
        const itemId = match[1];
        if (existingIds.has(itemId)) continue;
        const slug = match[2]?.replace(/-/g, " ") || "Unknown item";
        validatedItems.push({
          item_id: itemId,
          title: slug.charAt(0).toUpperCase() + slug.slice(1),
          brand: null,
          current_price: null,
          category: null,
          condition: null,
          size: null,
          image_url: null,
          vinted_url: url,
        });
        existingIds.add(itemId);
      }
      console.log(`After supplementing: ${validatedItems.length} items total`);
    }

    if (validatedItems.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "No listings found." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const finalItems = validatedItems.slice(0, Math.min(importLimit, remaining));

    // ========================================
    // PHASE 4: Deep import — scrape individual listing pages for descriptions
    // ========================================
    let descriptionsFetched = 0;
    if (deep_import) {
      const itemsToDeepScrape = finalItems.filter(i => i.vinted_url).slice(0, Math.min(deepLimit, 15));
      console.log(`Phase 4: Deep import — scraping ${itemsToDeepScrape.length} individual listings`);

      const BATCH_SIZE = 5;
      for (let b = 0; b < itemsToDeepScrape.length; b += BATCH_SIZE) {
        const batch = itemsToDeepScrape.slice(b, b + BATCH_SIZE);
        await Promise.allSettled(batch.map(async (item) => {
          try {
            const pageRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
              method: "POST",
              headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({ url: item.vinted_url, formats: ["markdown"], onlyMainContent: true, waitFor: 2000 }),
            });

            const pageData = await pageRes.json();
            if (!pageRes.ok || !pageData.success) return;

            const md = pageData.data?.markdown || pageData.markdown || "";
            if (md.length < 50) return;

            const detailRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-lite",
                messages: [
                  {
                    role: "system",
                    content: `Extract details from a Vinted listing page. Return JSON with:
- title (string) — the item title
- description (string or null) — the full item description text
- brand (string or null)
- current_price (number or null)
- category (string or null)
- condition (string or null)
- size (string or null)
- image_url (string or null) — the main product image URL
- views_count (number or null)
- favourites_count (number or null)
Return ONLY valid JSON object. No markdown fences.`,
                  },
                  { role: "user", content: md.substring(0, 8000) },
                ],
                temperature: 0,
              }),
            });

            if (detailRes.ok) {
              const detailData = await detailRes.json();
              const detailContent = detailData.choices?.[0]?.message?.content || "{}";
              const details = JSON.parse(detailContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim());
              if (details.title) item.title = details.title;
              if (details.description) item.description = details.description;
              if (details.brand) item.brand = details.brand;
              if (details.current_price != null) item.current_price = details.current_price;
              if (details.category) item.category = details.category;
              if (details.condition) item.condition = details.condition;
              if (details.size) item.size = details.size;
              if (details.image_url) item.image_url = details.image_url;
              if (details.views_count != null) item.views_count = details.views_count;
              if (details.favourites_count != null) item.favourites_count = details.favourites_count;
              descriptionsFetched++;
            }
          } catch (e) {
            console.error(`Deep scrape error for ${item.vinted_url}:`, e);
          }
        }));
      }
      console.log(`Deep import complete: ${descriptionsFetched} descriptions fetched`);
    }

    // ========================================
    // PHASE 5: Upsert into listings table
    // ========================================
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of finalItems) {
      if (!item.title) { skipped++; continue; }
      const vintedUrl = item.vinted_url || null;

      if (vintedUrl) {
        const { data: existing } = await supabase
          .from("listings").select("id").eq("user_id", user.id).eq("vinted_url", vintedUrl).maybeSingle();

        if (existing) {
          const updateData: Record<string, any> = {
            title: item.title,
            brand: item.brand ?? undefined,
            category: item.category ?? undefined,
            condition: item.condition ?? undefined,
            size: item.size ?? undefined,
            image_url: item.image_url ?? undefined,
            current_price: item.current_price ?? undefined,
            updated_at: new Date().toISOString(),
          };
          if (item.description) updateData.description = item.description;
          if (item.views_count != null) updateData.views_count = item.views_count;
          if (item.favourites_count != null) updateData.favourites_count = item.favourites_count;

          await supabase.from("listings").update(updateData).eq("id", existing.id);
          updated++;
          continue;
        }
      }

      const insertData: Record<string, any> = {
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
      };
      if (item.description) insertData.description = item.description;
      if (item.views_count != null) insertData.views_count = item.views_count;
      if (item.favourites_count != null) insertData.favourites_count = item.favourites_count;

      const { error: insertErr } = await supabase.from("listings").insert(insertData);
      if (insertErr) { console.error("Insert error:", insertErr); skipped++; }
      else imported++;
    }

    console.log(`Import complete: ${imported} imported, ${updated} updated, ${skipped} skipped, ${descriptionsFetched} descriptions`);

    return new Response(
      JSON.stringify({ success: true, imported, updated, skipped, total: imported + updated, descriptions_fetched: descriptionsFetched, mapped_urls: memberItemUrls.length }),
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
