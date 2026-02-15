import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIER_LIMITS: Record<string, number> = { free: 20, pro: 200, business: 9999, scale: 9999 };
const TIER_MAX_PAGES: Record<string, number> = { free: 1, pro: 3, business: 5, scale: 5 };
const TIER_DEEP_LIMITS: Record<string, number> = { free: 5, pro: 50, business: 9999, scale: 9999 };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { data: profile } = await supabase
      .from("profiles").select("subscription_tier").eq("user_id", user.id).maybeSingle();
    const tier = profile?.subscription_tier || "free";

    const importLimit = TIER_LIMITS[tier] || 20;
    const maxPages = TIER_MAX_PAGES[tier] || 1;
    const deepLimit = TIER_DEEP_LIMITS[tier] || 5;

    // --- Monthly import limit check ---
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
    // --- End monthly limit check ---

    let wardrobeUrl = profile_url.trim();
    if (!wardrobeUrl.startsWith("http")) wardrobeUrl = `https://www.${wardrobeUrl}`;
    if (!wardrobeUrl.includes("/items")) wardrobeUrl = wardrobeUrl.replace(/\/?$/, "/items");

    console.log(`Scraping wardrobe: ${wardrobeUrl} (tier: ${tier}, limit: ${importLimit}, maxPages: ${maxPages}, deep: ${!!deep_import})`);

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      return new Response(JSON.stringify({ success: false, error: "Firecrawl not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Phase 1: Scrape wardrobe overview pages
    const allMarkdown: string[] = [];
    let pagesScraped = 0;

    for (let page = 1; page <= maxPages; page++) {
      const pageUrl = page === 1 ? wardrobeUrl : `${wardrobeUrl}?page=${page}`;
      console.log(`Scraping page ${page}: ${pageUrl}`);

      const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: pageUrl, formats: ["markdown"], waitFor: 3000 }),
      });

      const scrapeData = await scrapeResponse.json();
      if (!scrapeResponse.ok || !scrapeData.success) {
        if (page === 1) {
          console.error("Firecrawl error on first page:", JSON.stringify(scrapeData));
          return new Response(JSON.stringify({ success: false, error: "Could not scrape the wardrobe. Make sure your Vinted profile is public." }), {
            status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        break;
      }

      const pageMarkdown = scrapeData.data?.markdown || scrapeData.markdown || "";
      if (!pageMarkdown || pageMarkdown.length < 100) {
        if (page === 1) {
          return new Response(JSON.stringify({ success: false, error: "Your wardrobe appears empty or private." }), {
            status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        break;
      }

      allMarkdown.push(`--- PAGE ${page} ---\n${pageMarkdown}`);
      pagesScraped++;
    }

    const combinedMarkdown = allMarkdown.join("\n\n");
    console.log(`Scraped ${pagesScraped} page(s), ${combinedMarkdown.length} chars. Sending to AI...`);

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ success: false, error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const urlObj = new URL(wardrobeUrl);
    const baseDomain = `${urlObj.protocol}//${urlObj.hostname}`;
    // Extract member ID from URL for filtering
    const memberMatch = wardrobeUrl.match(/member\/(\d+[-\w]*)/);
    const memberId = memberMatch ? memberMatch[1] : "";

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You extract Vinted listing data from a scraped wardrobe page for member "${memberId}" on ${baseDomain}.

CRITICAL RULES:
- ONLY extract items that belong to this specific member's wardrobe/closet.
- DO NOT include "Similar items", "You might also like", "Recommended for you", "Popular items", sponsored items, or any items from other sellers.
- Items from this member's wardrobe will typically appear in a grid/list under their profile section. They will have URLs containing "/items/" on the same domain.
- If an item's URL contains a different member ID or points to a different seller, EXCLUDE it.
- Look for the main wardrobe listing section, ignore sidebar content, footer recommendations, and promotional sections.

Return a JSON array of items. Each item must have:
- title (string), brand (string or null), current_price (number or null), category (string or null)
- condition (string or null), size (string or null), image_url (string or null)
- vinted_url (string or null) — full URL using base domain: ${baseDomain}
Return ONLY a valid JSON array. No markdown fences. Maximum ${importLimit} items. Deduplicate across pages.`,
          },
          { role: "user", content: `Extract ONLY this member's own wardrobe listings (member: ${memberId}) from these ${pagesScraped} page(s). Ignore all recommended/similar/sponsored items:\n\n${combinedMarkdown.substring(0, 60000)}` },
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
      return new Response(JSON.stringify({ success: false, error: "Failed to parse listing data." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "No listings found." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cappedItems = items.slice(0, Math.min(importLimit, remaining));
    console.log(`Extracted ${items.length} items, importing ${cappedItems.length} (remaining allowance: ${remaining})`);

    // Phase 2: Deep import — scrape individual listing pages for descriptions
    let descriptionsFetched = 0;
    if (deep_import) {
      const itemsToDeepScrape = cappedItems.filter(i => i.vinted_url).slice(0, Math.min(deepLimit, 15));
      console.log(`Deep import: scraping ${itemsToDeepScrape.length} individual listings in parallel batches`);

      const BATCH_SIZE = 5;
      for (let b = 0; b < itemsToDeepScrape.length; b += BATCH_SIZE) {
        const batch = itemsToDeepScrape.slice(b, b + BATCH_SIZE);
        const results = await Promise.allSettled(batch.map(async (item) => {
          try {
            const pageRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
              method: "POST",
              headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({ url: item.vinted_url, formats: ["markdown"], waitFor: 2000 }),
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
- description (string or null) — the full item description text written by the seller
- views_count (number or null) — number of views
- favourites_count (number or null) — number of favourites/hearts
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
              if (details.description) item.description = details.description;
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

    // Phase 3: Upsert into listings table
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of cappedItems) {
      if (!item.title) { skipped++; continue; }
      const vintedUrl = item.vinted_url || null;

      if (vintedUrl) {
        const { data: existing } = await supabase
          .from("listings").select("id").eq("user_id", user.id).eq("vinted_url", vintedUrl).maybeSingle();

        if (existing) {
          const updateData: Record<string, any> = {
            current_price: item.current_price ?? undefined,
            title: item.title,
            brand: item.brand ?? undefined,
            category: item.category ?? undefined,
            condition: item.condition ?? undefined,
            size: item.size ?? undefined,
            image_url: item.image_url ?? undefined,
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
      JSON.stringify({ success: true, imported, updated, skipped, total: imported + updated, descriptions_fetched: descriptionsFetched }),
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
