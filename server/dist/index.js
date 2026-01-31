"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const node_path_1 = __importDefault(require("node:path"));
const dotenv_1 = __importDefault(require("dotenv"));
const pg_1 = require("pg");
const bcrypt_1 = __importDefault(require("bcrypt"));
// Charge .env depuis la racine server/
dotenv_1.default.config({ path: node_path_1.default.resolve(__dirname, "..", ".env") });
// connexion à la base de données
const pool = new pg_1.Pool({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT) || 5433,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
});
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 3003;
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// API test
// Statique (front buildé par Vite)
app.use(express_1.default.static(node_path_1.default.join(__dirname, "../public")));
app.get("/index", (_req, res) => {
    res.sendFile(node_path_1.default.join(__dirname, "../public", "index.html"));
});
app.get("/register", (req, res) => {
    res.sendFile(node_path_1.default.join(__dirname, "../public", "register.html"));
});
app.get("/connexion", (req, res) => {
    res.sendFile(node_path_1.default.join(__dirname, "../public", "connexion.html"));
});
app.get("/api/ping", (_req, res) => res.json({ ok: true, message: "Aucun bug à signaler !" }));
app.post("/api/register", async (req, res) => {
    const { name, firstname, email, password } = req.body;
    console.log(`Contenu du Body : ${name}`);
    //Vérification de la présence de tous les champs
    if (!name || !firstname || !email || !password) {
        return res.status(400).json({ success: false, message: `Champs manquants...` });
    }
    //vérification existance dans BDD
    try {
        const email_exist = await pool.query(`SELECT email from users WHERE email = $1`, [email]);
        if (email_exist.rows.length == 0) {
            // on crypt le mot de passe :
            const password_hash = await bcrypt_1.default.hash(password, 15);
            console.log(password_hash);
            //On insert dans la base les données.
            const insert = await pool.query("INSERT INTO users (name , firstname, email, password_hash) VALUES($1,$2,$3,$4) RETURNING id,email,created_at", [name, firstname, email, password_hash]);
            const user = insert.rows[0];
            return res.status(201).json({ success: true, message: `Compte créé avec succès : USER ${user.id}` });
        }
        else {
            console.log("Email déjà utilisé");
            return res.status(409).json({ success: false, message: "Email déjà utilisé." });
        }
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Problème de connexion à la base de données. Veuillez rééssayer ultérieurement." });
    }
});
app.post("/api/connexion", (req, res) => {
    console.log("Tentative de connexion en cours");
});
app.listen(PORT, () => {
    console.log(`Serveur: http://localhost:${PORT}`);
});
