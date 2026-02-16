import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Category Maps (shared with publish-to-platform) ───
const EBAY_CATEGORY_FALLBACKS: Record<string, string> = {
  "women's clothing": "15724", "men's clothing": "1059",
  "women's shoes": "3034", "men's shoes": "93427",
  "women's bags": "169291", "men's bags": "169285",
  "women's accessories": "4251", "men's accessories": "4250",
  "kids' clothing": "171146", "jewellery": "281",
  "watches": "14324", "vintage clothing": "175759",
  "sportswear": "137084", "coats & jackets": "63862",
  "dresses": "63861", "tops": "53159", "jeans": "11483",
  "trainers": "155202", "boots": "11498", "shirts": "57990",
  "jumpers": "11484", "skirts": "63864", "shorts": "15689",
  "suits": "3001", "swimwear": "15690",
};

const EBAY_CATEGORY_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(EBAY_CATEGORY_FALLBACKS).map(([name, id]) => [id, name.split("'").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join("'")])
);
EBAY_CATEGORY_NAMES["11450"] = "Clothing, Shoes & Accessories";

function getCategoryName(id: string): string {
  return EBAY_CATEGORY_NAMES[id] || "Clothing, Shoes & Accessories";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    const { listing_id } = await req.json();
    if (!listing_id) throw new Error("listing_id is required");

    const { data: listing, error: listingError } = await supabase
      .from("listings").select("*").eq("id", listing_id).eq("user_id", user.id).single();
    if (listingError || !listing) throw new Error("Listing not found");

    // Detect category
    const category = await detectCategory(listing);

    // Build aspects
    const aspects: Record<string, string[]> = {};
    if (listing.brand) aspects["Brand"] = [listing.brand];
    if (listing.size) aspects["Size"] = [listing.size];
    if (listing.colour) aspects["Colour"] = [listing.colour];
    if (listing.material) aspects["Material"] = [listing.material];

    // Validation warnings
    const warnings: string[] = [];
    if (!listing.brand) warnings.push("Brand is missing — will default to 'Unbranded'");
    if (!listing.size) warnings.push("Size not set — buyers filter by size");
    if (!listing.colour) warnings.push("Colour not set — required item specific for most categories");
    if (!listing.material) warnings.push("Material not set — improves eBay search ranking");
    if (!listing.condition) warnings.push("Condition is missing — required by eBay");
    if ((listing.title || "").length > 80) warnings.push("Title exceeds 80 chars — eBay will truncate");

    const imgCount = Array.isArray(listing.images) ? listing.images.filter((u: any) => typeof u === "string" && u.startsWith("http")).length : (listing.image_url ? 1 : 0);
    if (imgCount === 0) warnings.push("No photos — eBay listings without photos rarely sell");
    else if (imgCount < 3) warnings.push(`Only ${imgCount} photo${imgCount === 1 ? "" : "s"} — eBay recommends 3+ for best results`);
    if (listing.shipping_cost == null) warnings.push("Shipping cost not set — will default to £3.99");

    return new Response(JSON.stringify({
      categoryId: category.id,
      categoryName: category.name,
      aspects,
      warnings,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function detectCategory(listing: any): Promise<{ id: string; name: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    const id = quickFallback(listing);
    return { id, name: getCategoryName(id) };
  }

  try {
    const prompt = `Given this item, return the single best eBay UK category ID.

Item: "${listing.title}"
Brand: ${listing.brand || "Unknown"}
Category: ${listing.category || "Unknown"}

IDs: 15724=Women's Clothing, 1059=Men's Clothing, 63861=Dresses, 63862=Coats/Jackets(W), 57990=Shirts(M), 53159=Tops(W), 11483=Jeans, 11484=Jumpers, 63864=Skirts, 15689=Shorts, 3001=Suits, 15690=Swimwear, 3034=Women's Shoes, 93427=Men's Shoes, 155202=Trainers, 11498=Boots, 169291=Women's Bags, 169285=Men's Bags, 4251=Women's Accessories, 4250=Men's Accessories, 281=Jewellery, 14324=Watches, 175759=Vintage, 137084=Activewear, 171146=Kids, 11450=Generic

Return ONLY the numeric ID.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Return only a single eBay category ID number." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const id = quickFallback(listing);
      return { id, name: getCategoryName(id) };
    }

    const data = await aiRes.json();
    const raw = (data.choices?.[0]?.message?.content || "").trim();
    const match = raw.match(/\d{3,6}/);
    if (match) return { id: match[0], name: getCategoryName(match[0]) };

    const id = quickFallback(listing);
    return { id, name: getCategoryName(id) };
  } catch {
    const id = quickFallback(listing);
    return { id, name: getCategoryName(id) };
  }
}

function quickFallback(listing: any): string {
  const cat = (listing.category || "").toLowerCase();
  for (const [key, id] of Object.entries(EBAY_CATEGORY_FALLBACKS)) {
    if (cat.includes(key) || key.includes(cat)) return id;
  }
  return "11450";
}
