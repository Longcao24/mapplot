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
<p style="font-family:'Poppins',Arial,sans-serif;font-size:18px;color:#111;line-height:1.4;margin:0 0 6px 0;">Hi Customer Atlas User,</p>

<p style="font-family:'Poppins',Arial,sans-serif;font-size:18px;color:#111;line-height:1.4;margin:0 0 6px 0;">
  You’ve been invited to access <b>MapPlot</b> — an interactive, map-based platform that visualizes key datasets and regional trends in a single, intuitive dashboard.
</p>

<p style="font-family:'Poppins',Arial,sans-serif;font-size:18px;color:#111;line-height:1.4;margin:0 0 8px 0;">
  Before registering, take a moment to explore the products below.
</p>

<p style="font-family:'Poppins',Arial,sans-serif;font-size:18px;color:#111;text-align:center;margin:0 0 4px 0;font-weight:500;">
  Select a product to explore:
</p>

<center>

  <a href="https://audiosight.agency" style="display:block;width:220px;margin:3px auto;padding:10px 18px;border-radius:10px;background-color:#111827;color:#ffffff;text-decoration:none;font-family:'Poppins',Arial,sans-serif;font-weight:600;font-size:18px;text-align:center;">🎧 AudioSight</a>

  <a href="https://sate.agency/?utm_source=email&utm_medium=promote&utm_campaign=f2025" style="display:block;width:220px;margin:3px auto;padding:10px 18px;border-radius:10px;background-color:#2563EB;color:#ffffff;text-decoration:none;font-family:'Poppins',Arial,sans-serif;font-weight:600;font-size:18px;text-align:center;">🗣️ SATE</a>

  <a href="https://mrehab.agency/?utm_source=flyer&utm_medium=qr&utm_campaign=asha2025" style="display:block;width:220px;margin:3px auto;padding:10px 18px;border-radius:10px;background-color:#DB2777;color:#ffffff;text-decoration:none;font-family:'Poppins',Arial,sans-serif;font-weight:600;font-size:18px;text-align:center;">💪 mRehab</a>

</center>

<center>

  <a href="http://localhost:5678/register" style="display:inline-block;padding:10px 26px;background:#3B82F6;background:linear-gradient(135deg,#3BB273,#3B82F6);color:#ffffff;text-decoration:none;border-radius:9999px;font-size:18px;font-weight:600;letter-spacing:0.25px;font-family:'Poppins',Arial,sans-serif;box-shadow:0 4px 10px rgba(59,130,246,0.25);margin:14px 0 6px 0;border:1px solid #3B82F6;text-align:center;">Register here!</a>

</center>

<p style="font-family:'Poppins',Arial,sans-serif;font-size:18px;color:#111;line-height:1.4;margin:12px 0 0 0;">
  We’re excited to have you explore a new way of working with location-based insights through MapPlot’s powerful visualization tools.
</p>
`;

  for (const email of emails) {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            to: email,
            subject,
            message
          }),
        }
      );

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
app.listen(PORT, () => console.log(`Invite API running on port ${PORT}`));
