import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
  const body = await req.json();
    const { photoUrls, brand, category, size, condition, colour, material, currentTitle, currentDescription, vintedUrl, fetchOnly, detectColourOnly, seller_notes } = body;

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

    // ─── detectColourOnly: lightweight vision call to detect primary colour ───
    if (detectColourOnly) {
      const finalPhotoUrlsForDetect = body.photoUrls || photoUrls || [];
      if (finalPhotoUrlsForDetect.length === 0) {
        return new Response(JSON.stringify({ detected_colour: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_KEY) throw new Error("AI not configured");
      const colourContent: any[] = [
        { type: "text", text: "Look at this clothing item photo. Reply with ONLY the primary colour of the item as a single word or short phrase (e.g. Black, White, Grey, Navy, Blue, Red, Green, Pink, Brown, Beige, Cream, Purple, Yellow, Orange, Multi). Nothing else — just the colour." },
        { type: "image_url", image_url: { url: finalPhotoUrlsForDetect[0] } },
      ];
      const colourRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: colourContent }],
          max_tokens: 20,
        }),
      });
      const colourData = await colourRes.json();
      const detectedColour = colourData.choices?.[0]?.message?.content?.trim() || null;
      return new Response(JSON.stringify({ detected_colour: detectedColour }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
- Colour: ${colour && colour.trim() ? colour.trim() : "NOT PROVIDED — DO NOT INCLUDE COLOUR IN TITLE OR DESCRIPTION"}
- Material: ${material || "Not specified"}
- Current title: ${currentTitle || "None"}
- Current description: ${currentDescription || "None"}
- Number of photos: ${finalPhotoUrls.length}

═══════════════════════════════════════════
COLOUR RULE — CRITICAL — READ THIS FIRST
═══════════════════════════════════════════
${colour && colour.trim()
  ? `The seller has confirmed the colour is: ${colour.trim()}. You MUST use this exact colour in the title and description. Do NOT use any other colour.`
  : `The seller has NOT specified a colour. You MUST NOT mention any colour anywhere in the title or description. Omit colour entirely. Do NOT guess, infer, or estimate colour from photos — lighting, shadows, and screen calibration make photo colour unreliable. The seller will be angry if you get the colour wrong.`
}

NEVER INVENT:
- NEVER assume or guess the colour if it was not explicitly provided by the seller above
- NEVER infer colour from photos
- NEVER add any attribute (colour, material, style descriptor) that the seller did not provide
- If colour is "NOT PROVIDED", leave it out of title and description entirely

═══════════════════════════════════════════
TITLE FORMULA (max 80 chars — Vinted's actual character limit)
═══════════════════════════════════════════
Vinted's search algorithm weights the first 5 words most heavily. Follow this exact pattern:
${colour && colour.trim()
  ? "[Brand] [Gender if applicable] [Item Type] [Colour] [Size] [Condition Signal]"
  : "[Brand] [Gender if applicable] [Item Type] [Size] [Condition Signal]  ← NO COLOUR since it was not provided"
}

CONDITION SIGNAL mapping (use these exact terms — they perform well in Vinted search):
- new_with_tags → "BNWT" (Brand New With Tags — widely searched on Vinted)
- new_without_tags → "Brand New"
- very_good → "Excellent Condition"
- good → "Good Condition"
- satisfactory → "Good Used"

GENDER SIGNAL: Add "Mens" or "Womens" (no apostrophe — cleaner in titles) when:
- Category is clearly gendered (e.g. Womenswear, Menswear, Men's shoes)
- Brand is gender-neutral (Nike, Adidas, Carhartt, Stone Island) — always add gender
- Skip for obviously gendered brands (ASOS Women's, Zara Women) to avoid redundancy

Rules:
- NEVER exceed 80 characters
- Never use ALL CAPS
- No special characters or emojis
- No filler words: banned from titles: "stunning", "perfect", "beautiful", "amazing", "gorgeous"
- Include brand name first ALWAYS
- Include size in format buyers search for (UK 9, M, W32, etc.)

═══════════════════════════════════════════
CONDITION & DEFECT DISCLOSURE
═══════════════════════════════════════════
${(() => {
  const hasDefects = seller_notes && seller_notes.trim().length > 0;
  const c = (condition || "").toLowerCase().replace(/[\s-]/g, "_");

  const conditionGuidance = (() => {
    if (c === "new_with_tags") return `CONDITION GRADE: New with tags
Write: "Brand new, never worn, tags still attached." One sentence. No elaboration needed.
${hasDefects ? "IMPORTANT: Seller has noted defects — mention these even for new items (manufacturing flaw, return item, etc.)" : ""}`;
    if (c === "new_without_tags") return `CONDITION GRADE: New without tags
Write: "Brand new condition, never worn — just doesn't have the tags."
${hasDefects ? "IMPORTANT: Seller has noted defects — include them honestly." : ""}`;
    if (c === "very_good") return `CONDITION GRADE: Very Good
Write: Worn a small number of times (think: 1-5 wears). No notable flaws. Fabric in excellent shape.
Typical language: "Really good condition — only worn a few times and always washed carefully."
${hasDefects ? "IMPORTANT: Seller has noted defects below — these MUST be disclosed honestly. Do not contradict them by writing 'no flaws'." : "Do NOT say 'no marks, no bobbling' as a generic filler — only say this if it's genuinely applicable."}`;
    if (c === "good") return `CONDITION GRADE: Good
Write: Clearly used but well looked after. May have minor signs of wear — slight fading, light pilling, small marks — but nothing structural.
Typical language: "Good condition — definitely been worn but looks after itself well. [specific minor issue if noted]"
${hasDefects ? "IMPORTANT: Defects MUST be disclosed. This is a 'Good' item — buyers expect minor issues and will appreciate honesty." : "If no specific defects noted, say something like 'shows gentle signs of wear consistent with age.'"}`;
    if (c === "satisfactory") return `CONDITION GRADE: Satisfactory
IMPORTANT: This is the lowest Vinted condition grade. Buyers choosing this grade KNOW the item has visible wear.
Write condition with full transparency. The description must be upfront — this protects the seller.
Typical language: "Satisfactory condition — shows clear signs of use. [specific issues]. Still has plenty of life in it, priced accordingly."
${hasDefects ? "CRITICAL: All disclosed defects MUST appear explicitly. Do NOT try to minimise or soften them." : "Even without specific defects noted, acknowledge the item shows wear commensurate with its condition grade."}`;
    return `CONDITION GRADE: ${condition || "Not specified"}
Be honest about condition. If defects are noted below, include them.`;
  })();

  const defectSection = hasDefects
    ? `
SELLER DISCLOSURE (MANDATORY — MUST APPEAR IN DESCRIPTION):
The seller has reported the following about this item:
"${seller_notes.trim()}"

DEFECT RULES:
- Every item mentioned in the seller disclosure MUST appear in the description
- Do NOT soften, hide, omit, or euphemise any disclosed defect
- Write disclosures honestly and casually — like a genuine seller would
- Disclosures go in the Condition paragraph — naturally integrated, not as a list
- Example: "There's a small bobble on the back and the collar's faded slightly on one side — nothing you'd notice when wearing it, but want to be upfront."
- NEVER write "No marks" or "No flaws" or "Pristine" when defects have been disclosed`
    : `No defects reported by seller. Write the condition section positively but honestly.`;

  return `${conditionGuidance}

${defectSection}

Condition paragraph writing rules:
- Write 2-3 sentences for the condition section
- If seller notes are provided, integrate them naturally (not as a list)
- NEVER write "No marks, no flaws, pristine" when condition is Good or Satisfactory
- If condition is New (either type), the condition sentence can be very short
- If condition is Satisfactory, the description MUST acknowledge visible wear`;
})()}

═══════════════════════════════════════════
DESCRIPTION — CONVERSATIONAL STYLE (120-200 words)
═══════════════════════════════════════════
Write like a real person selling their own clothes. Use casual British English. Contractions are fine. Short sentences are fine. The buyer should feel like they're reading a message from someone genuine, not a product page or marketing copy.

STRUCTURE — flowing paragraphs, NOT bullet points:

${colour && colour.trim()
  ? `Opening (1-2 sentences): Describe the item naturally. What is it, what colour (use "${colour.trim()}"), what brand. Example: "Really nice Nike crewneck sweatshirt in ${colour.trim()}, size M."`
  : `Opening (1-2 sentences): Describe the item naturally — what it is and what brand. DO NOT mention any colour since it was not provided. Example: "Really nice Nike crewneck sweatshirt, size M."`
}

Feel & fit (1-2 sentences): Describe what it's actually like to wear. How does the fabric feel? How does it fit? Example: "The cotton blend makes it properly warm without being too heavy — perfect for layering or wearing on its own. Fits true to size with a relaxed but not baggy cut."

Condition (2-3 sentences): Be honest and specific. Buyers trust honesty. If a size is provided and the category is Jeans, Trousers, or Shoes, include the size naturally in this section.

${seller_notes && seller_notes.trim()
  ? `DEFECT INTEGRATION: The disclosed defects ("${seller_notes.trim()}") MUST appear in the condition section, written naturally. Never put them in a list.`
  : ``}

Closing (1 sentence): Friendly sign-off. If the listed price is £15 or under, add: "Great for bundling — message me and I'll sort you a deal." If over £15, just say you're happy to answer questions.

Shipping (1 line): "Shipped within 1-2 days."

Hashtags (final line, separated by blank line): 3-5 compound hashtags only. These should mirror how real buyers search on Vinted. Combine words into single hashtags. Examples: #nikecrew #menssweatshirt #streetwearuk #vintedfind. NEVER use more than 5 hashtags. Vinted is NOT Instagram.

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
  "optimised_title": "<title following the formula above — max 80 chars>",
  "optimised_description": "<PLAIN TEXT description in the conversational style above with \\n\\n for paragraph breaks. 3-5 hashtags at the end.>",
  "hashtags": ["#compound1", "#compound2", "#compound3"],
  "suggested_tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "detected_brand": "<detected or confirmed brand>",
  "detected_category": "<detected or confirmed category>",
  "detected_condition": "<assessed condition>",
  "detected_colour": "<detected primary colour>",
  "detected_material": "<detected primary material>",
  "seller_notes_disclosed": ${seller_notes && seller_notes.trim() ? "true or false — set true if seller notes were integrated into the description, false if not" : "null"},
  "health_score": {
    "overall": <0-100>,
    "title_score": <0-25>,
    "description_score": <0-25>,
    "photo_score": <DETERMINISTIC — base this ONLY on the "Number of photos" field above, NOT on any visual assessment: 0 photos = 0, 1 photo = 10, 2 photos = 18, 3 or more photos = 25>,
    "completeness_score": <0-25>,
    "title_feedback": "<specific tip>",
    "description_feedback": "<specific tip>",
    "photo_feedback": "<based ONLY on photo count: 0 photos = 'No photos added yet — listings with photos sell 3x faster', 1 photo = 'Add 2–3 more photos showing different angles for best results', 2 photos = 'Good start — consider adding a care label and detail shots', 3+ photos = 'Great photo coverage!'>",
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
