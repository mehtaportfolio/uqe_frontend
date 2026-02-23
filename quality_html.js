import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(cors());

// ------------------- DATABASE -------------------
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ------------------- Cache -------------------
let articleCache = { timestamp: 0, data: [] }; // For autocomplete caching

// ------------------- API -------------------

// Fetch data by LotID(s) or date range
app.get("/api/data", async (req, res) => {
  const { startDate, endDate, lotId } = req.query;

  try {
    let query = supabase.from("uqe_data").select("*");

    if (lotId) {
      const lots = lotId.split(",").map(l => l.trim()).filter(Boolean);
      query = query.in("LotID", lots);
    } else if (startDate && endDate) {
      query = query
        .gte("ShiftStartTime", `${startDate} 00:00:00`)
        .lte("ShiftStartTime", `${endDate} 23:59:59`);
    } else {
      return res.json([]);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Supabase query error:", error);
      return res.status(500).json({ error: error.message || "Database query failed" });
    }

    res.json(data || []);
  } catch (err) {
    console.error("Unexpected error (/api/data):", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// ------------------- Unique Article Numbers (Autocomplete) -------------------
app.get("/api/unique-article-numbers", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json([]);

  try {
    const { data, error } = await supabase
      .from("article_numbers")
      .select('"ArticleNumber"') // 👈 case-sensitive, so we quote it
      .ilike('"ArticleNumber"', `%${q}%`)
      .order('"ArticleNumber"', { ascending: true })
      .limit(200); // limit results for autocomplete

    if (error) {
      console.error("Supabase error (unique-article-numbers):", error);
      return res.status(500).json({ error: error.message || "Query failed" });
    }

    // Clean & return only non-empty unique values
    const uniques = (data || [])
      .map(r => r.ArticleNumber?.trim())
      .filter(Boolean);

    res.json(uniques);
  } catch (err) {
    console.error("Unexpected error (/api/unique-article-numbers):", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});


// ------------------- Data by Article Numbers -------------------
app.get("/api/data-by-article", async (req, res) => {
  const raw = String(req.query.articles || "").trim();
  if (!raw) return res.json([]);
  const articles = raw.split(",").map(s => s.trim()).filter(Boolean);
  if (!articles.length) return res.json([]);

  try {
    const { data, error } = await supabase
      .from("uqe_data")
      .select("*")
      .in("ArticleNumber", articles);

    if (error) {
      console.error("Supabase error (data-by-article):", error);
      return res.status(500).json({ error: error.message || "Query failed" });
    }

    res.json(data || []);
  } catch (err) {
    console.error("Unexpected error (/api/data-by-article):", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// ------------------- Restart Render Service -------------------
app.post("/api/restart", async (req, res) => {
  try {
    const renderUrl = `https://api.render.com/v1/services/${process.env.RENDER_SERVICE_ID}/restart`;

    const response = await fetch(renderUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RENDER_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    let responseBody = null;
    try {
      responseBody = await response.json();
    } catch {
      // Ignore JSON parse errors (Render often returns empty body)
      responseBody = {};
    }

    if (response.ok) {
      console.log("✅ Render restart triggered:", responseBody);
      return res.json({ message: "Service restarted successfully!" });
    }

    console.error("❌ Render restart failed:", response.status, responseBody);
    return res
      .status(response.status)
      .json({ error: responseBody.message || "Failed to restart Render service" });
  } catch (err) {
    console.error("❌ Error in /api/restart:", err);
    return res
      .status(500)
      .json({ error: err.message || "Unexpected error calling Render API" });
  }
});


// ------------------- SERVER -------------------
const PORT = process.env.PORT || 9000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`API running at http://localhost:${PORT}`);
});
