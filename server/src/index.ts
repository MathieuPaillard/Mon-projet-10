import express from "express";
import path, { join } from "node:path";
import dotenv from "dotenv";
import { Pool } from "pg";
import bcrypt from "bcrypt";
import { json } from "node:stream/consumers";

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
app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "register.html"))
})
app.get("/connexion", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "connexion.html"))
})

app.get("/api/ping", (_req, res) => res.json({ ok: true, message: "Aucun bug à signaler !" }));

app.post("/api/register", async (req, res) => {
  const { name, firstname, email, password } = req.body;
  console.log(`Contenu du Body : ${name}`)
  //Vérification de la présence de tous les champs
  if (!name || !firstname || !email || !password) {
    return res.status(400).json({ success: false, message: `Champs manquants...` })
  }
  //vérification existance dans BDD
  try {
    const email_exist = await pool.query(`SELECT email from users WHERE email = $1`, [email]);
    if (email_exist.rows.length == 0) {
      // on crypt le mot de passe :
      const password_hash = await bcrypt.hash(password, 15);
      console.log(password_hash);
      //On insert dans la base les données.
      const insert = await pool.query("INSERT INTO users (name , firstname, email, password_hash) VALUES($1,$2,$3,$4) RETURNING id,email,created_at", [name, firstname, email, password_hash])
      const user = insert.rows[0];
      return res.status(201).json({ success: true, message: `Compte créé avec succès : USER ${user.id}` })

    } else {
      console.log("Email déjà utilisé");
      return res.status(409).json({ success: false, message: "Email déjà utilisé." });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Problème de connexion à la base de données. Veuillez rééssayer ultérieurement." })

  }






})
app.post("/api/connexion",(req,res)=>{
  console.log("Tentative de connexion en cours");

})

app.listen(PORT, () => {
  console.log(`Serveur: http://localhost:${PORT}`);
});
