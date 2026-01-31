import express from "express";
import path from "node:path";
import dotenv from "dotenv";
import { Pool } from "pg";

// Charge .env depuis la racine server/
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
// connexion à la base de données
const pool = new Pool({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT) || 5433,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
})
const app = express();
const PORT = Number(process.env.PORT) || 3003;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API test


// Statique (front buildé par Vite)
app.use(express.static(path.join(__dirname, "../public")));


app.get("/index", (_req, res) => {
  res.sendFile(path.join(__dirname, "../public", "index.html"));
});
app.get("/register" , (req,res)=>{
  res.sendFile(path.join(__dirname,"../public","register.html"))
})
app.get("/connexion" , (req,res)=>{
  res.sendFile(path.join(__dirname,"../public","connexion.html"))
})

app.get("/api/ping", (_req, res) => res.json({ ok: true , message : "Aucun bug à signaler !"}));

app.post("/api/register",(req,res)=>{
  const { name,firstname,email,password } = req.body;
  console.log(`Contenu du Body : ${name}`)
  //Vérification de la présence de tous les champs
  if(!name || !firstname || !email || !password){
    return res.status(400).json({success : false , message : `Champs manquants...`})
  }




})

app.listen(PORT, () => {
  console.log(`Serveur: http://localhost:${PORT}`);
});
