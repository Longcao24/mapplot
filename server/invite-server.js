import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import fetch from "node-fetch";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

app.post("/invite-batch", async (req, res) => {
  const { emails } = req.body;

  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ error: "No emails provided" });
  }

  const results = [];
  const subject = "Invitation to Access MapPlot – Explore the Interactive Data Map";

  const message = `
You’ve been invited to access <b>MapPlot</b> — an interactive, map-based platform that visualizes key datasets and regional trends in a single, intuitive dashboard.<br><br>
Use the link below to register and gain access to the <b>Customer Atlas</b> workspace, where you can explore live data visualizations and analytics tools designed to support institutional planning and outreach.<br><br>
<center>
<a href="http://localhost:5678/register" style="display:inline-block;padding:12px 28px;background:#3B82F6;background:linear-gradient(135deg,#3BB273,#3B82F6);color:#ffffff;text-decoration:none;border-radius:9999px;font-weight:600;letter-spacing:0.3px;font-family:'Poppins',Arial,sans-serif;box-shadow:0 4px 12px rgba(59,130,246,0.3);margin:20px 0;text-align:center;border:1px solid #3B82F6;">Register here!</a>
</center><br><br>
We’re excited to have you experience a new way of exploring location-based insights through MapPlot’s powerful visualization tools.<br><br>
Best regards,<br><b>The MapPlot Team</b>
`;

  for (const email of emails) {
    try {
      const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          to: email,
          subject,
          message,
          customerName: "Customer Atlas User",
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        results.push({ email, ok: false, error: text });
      } else {
        results.push({ email, ok: true });
      }
    } catch (err) {
      results.push({ email, ok: false, error: err.message });
    }
  }

  res.json({ results });
});

const PORT = 3001;
app.listen(PORT, () => console.log(` Invite API running on port ${PORT}`));
