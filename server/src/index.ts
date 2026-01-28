import express from "express";
import path from "node:path";
import dotenv from "dotenv";

// Charge .env depuis la racine server/
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const app = express();
const PORT = Number(process.env.PORT) || 3003;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API test
app.post("/api/register", (req, res) => {
  console.log("BODY =", req.body);
  res.status(201).json({ success: true });
});

// Statique (front buildé par Vite)
app.use(express.static(path.join(__dirname, "../public")));

// Fallback SPA
app.get("/index", (_req, res) => {
  res.sendFile(path.join(__dirname, "../public", "index.html"));
});

app.get("/api/ping", (_req, res) => res.json({ ok: true , message : "Aucun bug à signaler !"}));

app.listen(PORT, () => {
  console.log(`Serveur: http://localhost:${PORT}`);
});
