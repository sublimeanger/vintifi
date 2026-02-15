import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { photoUrls, brand, category, size, condition, currentTitle, currentDescription, vintedUrl, fetchOnly } = body;

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: supabaseKey },
    });
    const userData = await userRes.json();
    const userId = userData.id;
    if (!userId) throw new Error("Invalid user");

    // If a Vinted URL is provided, scrape listing details and photos via Firecrawl
    if (vintedUrl && vintedUrl.includes("vinted")) {
      const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
      if (firecrawlKey) {
        try {
          const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              url: vintedUrl,
              formats: ["markdown", "links"],
              onlyMainContent: true,
            }),
          });
          const scrapeData = await scrapeRes.json();
          const markdown = scrapeData.data?.markdown || "";
          const metadata = scrapeData.data?.metadata || {};

          // Extract image URLs from scraped data
          const scraped_links = scrapeData.data?.links || [];
          const imageRegex = /!\[.*?\]\((https?:\/\/[^\s)]+\.(?:jpg|jpeg|png|webp)[^\s)]*)\)/gi;
          const imageUrls: string[] = [];
          let match;
          while ((match = imageRegex.exec(markdown)) !== null) {
            if (imageUrls.length < 4) imageUrls.push(match[1]);
          }
          // Also check og:image from metadata
          if (metadata.ogImage && imageUrls.length < 4) {
            imageUrls.unshift(metadata.ogImage);
          }

          // If fetchOnly, return scraped data without running AI optimisation
          if (fetchOnly) {
            // Try to extract structured info from markdown
            const titleMatch = markdown.match(/^#\s*(.+)/m);
            const brandMatch = markdown.match(/brand[:\s]+([^\n,]+)/i);
            const sizeMatch = markdown.match(/size[:\s]+([^\n,]+)/i);
            const conditionMatch = markdown.match(/condition[:\s]+([^\n,]+)/i);

            return new Response(JSON.stringify({
              photos: imageUrls.slice(0, 4),
              title: metadata.title || titleMatch?.[1] || "",
              brand: brandMatch?.[1]?.trim() || metadata.ogTitle?.split(" ")?.[0] || "",
              description: markdown.substring(0, 500),
              category: "",
              size: sizeMatch?.[1]?.trim() || "",
              condition: conditionMatch?.[1]?.trim() || "",
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          // Merge scraped photos with any existing photoUrls
          if (imageUrls.length > 0 && (!photoUrls || photoUrls.length === 0)) {
            body.photoUrls = imageUrls;
          }
        } catch (scrapeErr) {
          console.error("Firecrawl scrape error:", scrapeErr);
          if (fetchOnly) {
            return new Response(JSON.stringify({ error: "Failed to fetch listing from Vinted" }), {
              status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } else if (fetchOnly) {
        return new Response(JSON.stringify({ error: "Scraping service not configured" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (fetchOnly) {
      return new Response(JSON.stringify({ error: "Please provide a valid Vinted URL" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Re-read photoUrls after potential Vinted scrape enrichment
    const finalPhotoUrls = body.photoUrls || photoUrls || [];

    // Check optimisation credits
    const creditsRes = await fetch(
      `${supabaseUrl}/rest/v1/usage_credits?user_id=eq.${userId}&select=optimizations_used,credits_limit`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    const creditsData = await creditsRes.json();
    if (creditsData.length > 0) {
      const c = creditsData[0];
      const optimLimit = Math.floor(c.credits_limit * 0.6);
      if (c.optimizations_used >= optimLimit) {
        return new Response(
          JSON.stringify({ error: "Monthly optimisation limit reached. Upgrade your plan for more." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI not configured");

    // Build message content with images if provided
    const userContent: any[] = [];

    userContent.push({
      type: "text",
      text: `You are a Vinted listing optimisation expert. Analyse the provided item details and photos to create a fully optimised Vinted listing.

Item details provided by seller:
- Brand: ${brand || "Not specified"}
- Category: ${category || "Not specified"}
- Size: ${size || "Not specified"}
- Condition: ${condition || "Not specified"}
- Current title: ${currentTitle || "None"}
- Current description: ${currentDescription || "None"}

Tasks:
1. Identify the item from photos (if provided) and seller details
2. Generate an SEO-optimised title for Vinted search (max 100 chars, include brand, key features, size)
3. Write a compelling description with measurements prompt, style suggestions, condition notes (200-400 words)
4. Suggest optimal tags/keywords for Vinted search
5. Rate the listing with a health score breakdown

Return a JSON object (no markdown, just raw JSON) with this exact structure:
{
  "optimised_title": "<SEO-optimised title>",
  "optimised_description": "<full optimised description>",
  "suggested_tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "detected_brand": "<detected or confirmed brand>",
  "detected_category": "<detected or confirmed category>",
  "detected_condition": "<assessed condition>",
  "health_score": {
    "overall": <0-100>,
    "title_score": <0-25>,
    "description_score": <0-25>,
    "photo_score": <0-25>,
    "completeness_score": <0-25>,
    "title_feedback": "<specific improvement tip>",
    "description_feedback": "<specific improvement tip>",
    "photo_feedback": "<specific improvement tip>",
    "completeness_feedback": "<specific improvement tip>"
  },
  "improvements": [
    "<specific improvement made>"
  ],
  "style_notes": "<brief style/trend context for this item>"
}`,
    });

    // Add photo URLs as image content — use vision-capable model when photos present
    let hasPhotos = false;
    if (finalPhotoUrls && finalPhotoUrls.length > 0) {
      hasPhotos = true;
      for (const photoUrl of finalPhotoUrls.slice(0, 4)) {
        userContent.push({
          type: "image_url",
          image_url: { url: photoUrl },
        });
      }
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: hasPhotos ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a Vinted listing optimisation expert. Always respond with valid JSON only. You specialise in creating listings that rank high in Vinted search and convert browsers into buyers." },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      if (aiRes.status === 429) throw new Error("AI rate limit reached. Try again in a moment.");
      if (aiRes.status === 402) throw new Error("AI credits exhausted.");
      throw new Error("AI analysis failed");
    }

    const aiData = await aiRes.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    // Robust JSON extraction
    let result;
    try {
      result = JSON.parse(content);
    } catch {
      // Try to find JSON boundaries
      const jsonStart = content.search(/[\{\[]/);
      const jsonEnd = content.lastIndexOf(jsonStart !== -1 && content[jsonStart] === '[' ? ']' : '}');
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        let cleaned = content.substring(jsonStart, jsonEnd + 1)
          .replace(/,\s*}/g, "}").replace(/,\s*]/g, "]")
          .replace(/[\x00-\x1F\x7F]/g, "");
        try {
          result = JSON.parse(cleaned);
        } catch {
          console.error("Failed to parse AI response after cleanup:", content.substring(0, 200));
          throw new Error("AI returned invalid response — please try again");
        }
      } else {
        console.error("No JSON found in AI response:", content.substring(0, 200));
        throw new Error("AI returned invalid response — please try again");
      }
    }

    // Increment optimisation usage
    await fetch(
      `${supabaseUrl}/rest/v1/usage_credits?user_id=eq.${userId}`,
      {
        method: "PATCH",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ optimizations_used: (creditsData[0]?.optimizations_used || 0) + 1 }),
      }
    );

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("optimize-listing error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
