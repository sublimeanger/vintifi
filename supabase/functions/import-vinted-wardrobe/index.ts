import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIER_LIMITS: Record<string, number> = { free: 20, pro: 200, business: 9999, scale: 9999 };

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

    const { profile_url } = await req.json();
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

    const urlObj = new URL(wardrobeUrl);

    // ========================================
    // PHASE 1: Discover item URLs via paginated scraping
    // ========================================
    // Vinted wardrobes paginate at ~20 items per page.
    // We scrape multiple pages to discover all items.
    const MAX_PAGES = Math.ceil(Math.min(importLimit, remaining) / 20) + 1; // +1 safety
    const PAGE_CAP = 15; // Max pages to avoid excessive Firecrawl credits
    const pagesToScrape = Math.min(MAX_PAGES, PAGE_CAP);

    console.log(`Phase 1: Discovering URLs from ${wardrobeUrl} via ${pagesToScrape} pages (tier: ${tier}, limit: ${importLimit})`);

    const seen = new Set<string>();
    const itemUrls: { url: string; id: string; slug: string }[] = [];
    const itemUrlPattern = /\/items\/(\d+)-?(.*)/;

    // Scrape pages in parallel batches of 3
    const PAGE_BATCH = 3;
    let emptyPages = 0;

    for (let pageStart = 1; pageStart <= pagesToScrape && emptyPages < 2; pageStart += PAGE_BATCH) {
      const pageBatch = [];
      for (let p = pageStart; p < pageStart + PAGE_BATCH && p <= pagesToScrape; p++) {
        pageBatch.push(p);
      }

      const pageResults = await Promise.allSettled(pageBatch.map(async (pageNum) => {
        const pageUrl = `${wardrobeUrl}?page=${pageNum}`;
        console.log(`Scraping page ${pageNum}: ${pageUrl}`);

        const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            url: pageUrl,
            formats: ["links"],
            onlyMainContent: true,
            waitFor: 5000,
            timeout: 30000,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          console.error(`Page ${pageNum} scrape failed:`, JSON.stringify(data));
          return [];
        }

        const links: string[] = data.data?.links || data.links || [];
        const pageItems: { url: string; id: string; slug: string }[] = [];

        for (const link of links) {
          try {
            const u = new URL(link);
            if (u.hostname !== urlObj.hostname) continue;
            const match = u.pathname.match(itemUrlPattern);
            if (!match) continue;
            const itemId = match[1];
            if (seen.has(itemId)) continue;
            seen.add(itemId);
            pageItems.push({ url: link, id: itemId, slug: match[2] || "" });
          } catch { /* skip */ }
        }

        console.log(`Page ${pageNum}: found ${links.length} URLs, ${pageItems.length} new items`);
        return pageItems;
      }));

      for (const r of pageResults) {
        if (r.status === "fulfilled") {
          if (r.value.length === 0) emptyPages++;
          else emptyPages = 0; // reset if we found items
          itemUrls.push(...r.value);
        }
      }

      // Stop if we've found enough
      if (itemUrls.length >= Math.min(importLimit, remaining)) break;
    }

    console.log(`Phase 1 complete: ${itemUrls.length} unique item URLs discovered across pages`);

    if (itemUrls.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "No items found in this wardrobe. Make sure the profile is public and has active listings." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cap to import limit
    const cappedItems = itemUrls.slice(0, Math.min(importLimit, remaining));

    // ========================================
    // PHASE 2: Deep scrape each item individually
    // ========================================
    const DEEP_SCRAPE_CAP = 50;
    const BATCH_SIZE = 5;
    const deepScrapeItems = cappedItems.slice(0, DEEP_SCRAPE_CAP);
    const slugOnlyItems = cappedItems.slice(DEEP_SCRAPE_CAP);

    console.log(`Phase 2: Deep scraping ${deepScrapeItems.length} items, ${slugOnlyItems.length} slug-only`);

    type ItemData = {
      item_id: string;
      title: string;
      brand: string | null;
      current_price: number | null;
      category: string | null;
      condition: string | null;
      size: string | null;
      image_url: string | null;
      description: string | null;
      views_count: number | null;
      favourites_count: number | null;
      vinted_url: string;
    };

    const results: ItemData[] = [];
    let deepSuccess = 0;

    for (let b = 0; b < deepScrapeItems.length; b += BATCH_SIZE) {
      const batch = deepScrapeItems.slice(b, b + BATCH_SIZE);
      const batchResults = await Promise.allSettled(batch.map(async (item): Promise<ItemData> => {
        const fallback: ItemData = {
          item_id: item.id,
          title: item.slug.replace(/-/g, " ").replace(/^\w/, c => c.toUpperCase()) || "Untitled item",
          brand: null, current_price: null, category: null, condition: null,
          size: null, image_url: null, description: null,
          views_count: null, favourites_count: null, vinted_url: item.url,
        };

        try {
          const pageRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              url: item.url,
              formats: ["markdown"],
              onlyMainContent: true,
              waitFor: 3000,
              timeout: 30000,
            }),
          });

          const pageData = await pageRes.json();
          if (!pageRes.ok || !pageData.success) return fallback;

          const md = pageData.data?.markdown || pageData.markdown || "";
          if (md.length < 50) return fallback;

          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                {
                  role: "system",
                  content: `Extract listing details from a single Vinted item page. Return a JSON object with:
- title (string)
- description (string or null)
- brand (string or null)
- current_price (number or null) — numeric only, no currency symbols
- category (string or null)
- condition (string or null)
- size (string or null)
- image_url (string or null) — main product image URL
- views_count (number or null)
- favourites_count (number or null)
Return ONLY a valid JSON object. No markdown fences.`,
                },
                { role: "user", content: md.substring(0, 8000) },
              ],
              temperature: 0,
            }),
          });

          if (!aiRes.ok) return fallback;

          const aiData = await aiRes.json();
          const raw = aiData.choices?.[0]?.message?.content || "{}";
          const details = JSON.parse(raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim());

          deepSuccess++;
          return {
            item_id: item.id,
            title: details.title || fallback.title,
            brand: details.brand || null,
            current_price: typeof details.current_price === "number" ? details.current_price : null,
            category: details.category || null,
            condition: details.condition || null,
            size: details.size || null,
            image_url: details.image_url || null,
            description: details.description || null,
            views_count: typeof details.views_count === "number" ? details.views_count : null,
            favourites_count: typeof details.favourites_count === "number" ? details.favourites_count : null,
            vinted_url: item.url,
          };
        } catch (e) {
          console.error(`Deep scrape failed for ${item.url}:`, e);
          return fallback;
        }
      }));

      for (const r of batchResults) {
        if (r.status === "fulfilled") results.push(r.value);
      }
    }

    // Add slug-only items (beyond deep scrape cap)
    for (const item of slugOnlyItems) {
      results.push({
        item_id: item.id,
        title: item.slug.replace(/-/g, " ").replace(/^\w/, c => c.toUpperCase()) || "Untitled item",
        brand: null, current_price: null, category: null, condition: null,
        size: null, image_url: null, description: null,
        views_count: null, favourites_count: null, vinted_url: item.url,
      });
    }

    console.log(`Phase 2 complete: ${deepSuccess} deep-scraped, ${results.length} total items`);

    if (results.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "No listings could be processed." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========================================
    // PHASE 3: Upsert into listings table
    // ========================================
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of results) {
      if (!item.title) { skipped++; continue; }

      const { data: existing } = await supabase
        .from("listings").select("id").eq("user_id", user.id).eq("vinted_url", item.vinted_url).maybeSingle();

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
      } else {
        const insertData: Record<string, any> = {
          user_id: user.id,
          title: item.title,
          brand: item.brand || null,
          category: item.category || null,
          condition: item.condition || null,
          size: item.size || null,
          current_price: item.current_price || null,
          image_url: item.image_url || null,
          vinted_url: item.vinted_url,
          status: "active",
        };
        if (item.description) insertData.description = item.description;
        if (item.views_count != null) insertData.views_count = item.views_count;
        if (item.favourites_count != null) insertData.favourites_count = item.favourites_count;

        const { error: insertErr } = await supabase.from("listings").insert(insertData);
        if (insertErr) { console.error("Insert error:", insertErr); skipped++; }
        else imported++;
      }
    }

    console.log(`Import complete: ${imported} imported, ${updated} updated, ${skipped} skipped, ${deepSuccess} deep-scraped`);

    return new Response(
      JSON.stringify({
        success: true,
        imported,
        updated,
        skipped,
        total: imported + updated,
        descriptions_fetched: deepSuccess,
        mapped_urls: itemUrls.length,
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
