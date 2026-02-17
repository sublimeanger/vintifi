import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { photoUrls, brand, category, size, condition, colour, material, currentTitle, currentDescription, vintedUrl, fetchOnly } = body;

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
              formats: ["markdown", "html", "links"],
              onlyMainContent: true,
              waitFor: 5000,
            }),
          });
          const scrapeData = await scrapeRes.json();
          const markdown = scrapeData.data?.markdown || "";
          const html = scrapeData.data?.html || "";
          const metadata = scrapeData.data?.metadata || {};

          // Try to extract description from HTML first (most reliable for Vinted)
          let htmlDescription = "";
          // Vinted uses itemprop="description" or data-testid with description
          const descHtmlPatterns = [
            /itemprop=["']description["'][^>]*>([\s\S]*?)<\//i,
            /class=["'][^"']*description[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|p|span)/i,
            /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i,
            /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i,
          ];
          for (const pat of descHtmlPatterns) {
            const m = html.match(pat);
            if (m?.[1]?.trim() && m[1].trim().length > 15) {
              // Strip HTML tags from matched content
              htmlDescription = m[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
              break;
            }
          }
          // Also try og:description from metadata
          if (!htmlDescription && metadata.ogDescription && metadata.ogDescription.length > 15) {
            htmlDescription = metadata.ogDescription;
          }
          if (!htmlDescription && metadata.description && metadata.description.length > 15) {
            htmlDescription = metadata.description;
          }

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
            const brandMatch = markdown.match(/brand[:\s]+([^\n,()\[\]]+)/i);
            const sizeMatch = markdown.match(/size[:\s]+([A-Za-z0-9\s/"'.\-]+)/i);
            const conditionMatch = markdown.match(/condition[:\s]+([^\n,()\[\]]+)/i);

            // Extract actual seller description from markdown
            // Look for description-like blocks: after metadata, before footer/buttons
            let extractedDescription = "";
            // Try common Vinted markdown patterns for the description section
            const descPatterns = [
              /description[:\s]*\n+([\s\S]*?)(?=\n(?:brand|size|condition|colour|location|uploaded|views|interested|similar|\[|!\[|---)|$)/i,
              /(?:^|\n)(?!.*(?:brand|size|condition|colour|price|location|views|uploaded|interested|delivery|protection|similar|see all|\[|\!\[|#))(.{20,}(?:\n(?!.*(?:brand|size|condition|colour|price|location|views|uploaded|interested|delivery|protection|similar|see all|\[|\!\[|#)).{10,})*)/m,
            ];
            for (const pat of descPatterns) {
              const m = markdown.match(pat);
              if (m?.[1]?.trim() && m[1].trim().length > 15) {
                extractedDescription = m[1].trim();
                break;
              }
            }
            // Fallback: find multi-line text blocks that look like natural language descriptions
            if (!extractedDescription) {
              const lines = markdown.split("\n");
              const descLines: string[] = [];
              for (const line of lines) {
                const trimmed = line.trim();
                // Skip empty, headers, images, links, tables, bullets, markdown artifacts
                if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("[") || trimmed.includes("![") ||
                    trimmed.startsWith("---") || trimmed.startsWith("|") || trimmed.startsWith("*") ||
                    /^(brand|size|condition|colour|color|price|location|views|uploaded|interested|delivery|protection|similar|see all|add to|buy now|make an offer|send message|catalogue|removed|ad)/i.test(trimmed) ||
                    /^\d+[\s]*(views|interested|followers)/i.test(trimmed) ||
                    (/^[A-Z][a-z]+:\s/.test(trimmed) && trimmed.length < 40) ||
                    /^https?:\/\//.test(trimmed) ||
                    trimmed.length < 10) {
                  if (descLines.length > 0) break; // stop after description block ends
                  continue;
                }
                descLines.push(trimmed);
              }
              if (descLines.length > 0) extractedDescription = descLines.join("\n");
            }
            // Clean any remaining markdown image/link syntax from description
            extractedDescription = extractedDescription
              .replace(/!\[.*?\]\(.*?\)/g, "")
              .replace(/\[([^\]]*)\]\(.*?\)/g, "$1")
              .replace(/#{1,6}\s*/g, "")
              .replace(/\n{3,}/g, "\n\n")
              .trim();
            if (!extractedDescription) extractedDescription = "No description available";

            // Prefer HTML-extracted description over markdown-extracted
            const finalDescription = htmlDescription || extractedDescription;

            return new Response(JSON.stringify({
              photos: imageUrls.slice(0, 4),
              title: metadata.title || titleMatch?.[1] || "",
              brand: brandMatch?.[1]?.trim() || metadata.ogTitle?.split(" ")?.[0] || "",
              description: finalDescription,
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

    // Check credits (unified pool)
    const creditsRes = await fetch(
      `${supabaseUrl}/rest/v1/usage_credits?user_id=eq.${userId}&select=price_checks_used,optimizations_used,vintography_used,credits_limit`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    const creditsData = await creditsRes.json();
    if (creditsData.length > 0) {
      const c = creditsData[0];
      if (c.credits_limit < 999) {
        const totalUsed = (c.price_checks_used || 0) + (c.optimizations_used || 0) + (c.vintography_used || 0);
        if (totalUsed >= c.credits_limit) {
          return new Response(
            JSON.stringify({ error: "Monthly credit limit reached. Upgrade your plan for more." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI not configured");

    // Build message content with images if provided
    const userContent: any[] = [];

    userContent.push({
      type: "text",
      text: `You are a real Vinted seller who has completed 2,000+ transactions and knows exactly what makes listings sell fast. You write like a genuine person — not a marketer, not an AI. Your descriptions sound like you're texting a mate about something you're selling.

Item details provided by seller:
- Brand: ${brand || "Not specified"}
- Category: ${category || "Not specified"}
- Size: ${size || "Not specified"}
- Condition: ${condition || "Not specified"}
- Colour: ${colour || "Not specified"}
- Material: ${material || "Not specified"}
- Current title: ${currentTitle || "None"}
- Current description: ${currentDescription || "None"}

═══════════════════════════════════════════
TITLE FORMULA (max 100 chars)
═══════════════════════════════════════════
Vinted's search algorithm weights the first 5 words most heavily. Follow this exact pattern:
[Brand] [Item Type] [Key Detail/Colour] [Size] [Condition Word]

Examples of perfect titles:
- "Nike Air Max 90 White UK 9 Excellent"
- "Levi's 501 Straight Jeans W32 L32 Like New"
- "Zara Oversized Wool Coat Black M Brand New"
- "Adidas Originals Hoodie Grey XL Great Condition"

Rules:
- Never use ALL CAPS
- No special characters or emojis
- Include brand name first ALWAYS
- Include size in format buyers search for (UK 9, M, W32, etc.)
- End with a condition keyword (Brand New / Excellent / Great Condition / Good / Well Worn)

═══════════════════════════════════════════
DESCRIPTION — CONVERSATIONAL STYLE (120-200 words)
═══════════════════════════════════════════
Write like a real person selling their own clothes. Use casual British English. Contractions are fine. Short sentences are fine. The buyer should feel like they're reading a message from someone genuine, not a product page or marketing copy.

STRUCTURE — flowing paragraphs, NOT bullet points:

Opening (1-2 sentences): Describe the item naturally. What is it, what colour, what brand. Keep it simple and honest. Example: "Really nice Nike crewneck sweatshirt in black, size M."

Feel & fit (1-2 sentences): Describe what it's actually like to wear. How does the fabric feel? How does it fit? Example: "The cotton blend makes it properly warm without being too heavy — perfect for layering or wearing on its own. Fits true to size with a relaxed but not baggy cut."

Condition (1-2 sentences): Be honest and specific. Buyers trust honesty. Example: "In very good condition — worn a handful of times and well looked after. No marks, no bobbling, just a solid everyday piece."

Closing (1 sentence): Friendly sign-off. Example: "Happy to answer any questions about fit or bundle with other items for a discount."

Shipping (1 line): "Shipped within 1-2 days."

Hashtags (final line, separated by blank line): 3-5 compound hashtags only. These should mirror how real buyers search on Vinted. Combine words into single hashtags. Examples: #nikecrew #menssweatshirt #streetwearuk #blacksweatshirt #vintedfind. NEVER use more than 5 hashtags. Vinted is NOT Instagram.

EXAMPLE OF A PERFECT DESCRIPTION:
"Really nice Nike crewneck sweatshirt in black, size M. The cotton blend makes it properly warm without being too heavy — perfect for layering or wearing on its own. Fits true to size with a relaxed but not baggy cut.

In very good condition — worn a handful of times and well looked after. No marks, no bobbling, just a solid everyday piece.

Comes from a smoke-free home. Happy to answer any questions about fit or bundle with other items for a discount.

Shipped within 1-2 days.

#nikecrew #menssweatshirt #streetwearuk"

ANOTHER EXAMPLE:
"Gorgeous pair of Levi's 501s in classic blue wash, W32 L32. Proper rigid denim that's broken in just right — not too stiff, not too soft. These have loads of life left in them.

Small fade on the left knee which honestly just adds to the look. No rips or damage anywhere else.

Can post next day. Drop me a message if you want to see more photos or need measurements.

#levis501 #vintagedenim #mensjeans"

═══════════════════════════════════════════
BANNED WORDS — NEVER USE THESE
═══════════════════════════════════════════
elevate, elevated, sophisticated, timeless, versatile, effortless, staple, wardrobe essential, investment piece, must-have, perfect addition, stunning, gorgeous (in a salesy way), absolutely, boasts, game-changer, trendy, chic, standout, exquisite, premium quality, top-notch, level up, take your wardrobe to the next level, step up your style, head-turner, show-stopper, statement piece, coveted, luxurious feel, impeccable, seamlessly, effortlessly, curated

If you catch yourself writing any of these words, replace them with plain, honest language.

═══════════════════════════════════════════
CRITICAL FORMATTING RULES
═══════════════════════════════════════════
1. Output MUST be plain text only. Vinted does NOT support markdown.
2. NEVER use asterisks (*), bold (**), italic (_), bullet points (•/-/*), headers (#), or any markdown.
3. Use blank lines between paragraphs for spacing. That is the ONLY formatting allowed.
4. NEVER include placeholder measurements with blank values.
5. The description must be COMPLETE and FINAL — ready to paste into Vinted immediately.
6. Hashtags go at the END of the description, separated by a blank line.
7. Maximum 3-5 hashtags. NO MORE.

═══════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════
Return a JSON object (no markdown, just raw JSON) with this exact structure:
{
  "optimised_title": "<title following the formula above>",
  "optimised_description": "<PLAIN TEXT description in the conversational style above with \\n\\n for paragraph breaks. 3-5 hashtags at the end.>",
  "hashtags": ["#compound1", "#compound2", "#compound3"],
  "suggested_tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "detected_brand": "<detected or confirmed brand>",
  "detected_category": "<detected or confirmed category>",
  "detected_condition": "<assessed condition>",
  "detected_colour": "<detected primary colour>",
  "detected_material": "<detected primary material>",
  "health_score": {
    "overall": <0-100>,
    "title_score": <0-25>,
    "description_score": <0-25>,
    "photo_score": <0-25>,
    "completeness_score": <0-25>,
    "title_feedback": "<specific tip>",
    "description_feedback": "<specific tip>",
    "photo_feedback": "<specific tip>",
    "completeness_feedback": "<specific tip>"
  },
  "improvements": ["<specific improvement made>"],
  "style_notes": "<brief style/trend context>"
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
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: "You are a real Vinted seller with 2,000+ completed sales. You write descriptions that sound human and genuine — never like AI or marketing copy. Always respond with valid JSON only. NEVER use these words: elevate, sophisticated, timeless, versatile, effortless, staple, wardrobe essential, investment piece, must-have, perfect addition, stunning, boasts, game-changer, trendy, chic, standout, exquisite, premium quality, top-notch, level up, coveted, luxurious, impeccable, seamlessly, curated, head-turner, show-stopper, statement piece." },
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

    // Post-AI sanitisation: strip any markdown that slipped through
    if (result.optimised_description) {
      result.optimised_description = result.optimised_description
        .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")  // strip bold/italic asterisks
        .replace(/_{1,2}([^_]+)_{1,2}/g, "$1")      // strip underscores
        .replace(/^#{1,6}\s+/gm, "")                 // strip markdown headers
        .replace(/^[\-\*•]\s+/gm, "")                // strip bullet points
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")     // strip markdown links
        .replace(/`([^`]+)`/g, "$1")                  // strip inline code
        .replace(/\n{3,}/g, "\n\n")                   // normalise spacing
        .trim();
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
