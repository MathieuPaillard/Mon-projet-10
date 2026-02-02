import express from "express";
import type { Request, Response, NextFunction } from "express";
import path, { join } from "node:path";
import dotenv from "dotenv";
import { Pool } from "pg";
import bcrypt from "bcrypt";
import { json } from "node:stream/consumers";
import jwt, { SignOptions } from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { AuthTokenPayload } from "./auth/jwt.types";

// Charge .env depuis la racine server/
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
// connexion à la base de données
const pool = new Pool({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT) || 5433,
    user: env("PGUSER"),
    password: env("PGPASSWORD"),
    database: env("PGDATABASE"),
})
const app = express();
const PORT = Number(process.env.PORT) || 3004;
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API test


// Statique (front buildé par Vite)
app.use(express.static(path.join(__dirname, "../public")));

function env(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`${name} manquant`);
    return v;
}
function envNumber(name: string): number {
    const v = process.env[name];
    if (!v) throw new Error(`${name} manquant`);
    const n = Number(v);
    if (!Number.isFinite(n)) throw new Error(`${name} doit être un nombre`);
    return n;
}
// MIDDLEWARE
function auth(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.token;
    if (!token) {
        console.log("Absence de cookie d'authorisation.")
        return res.status(401).json({ success: false, message: "Accès non authorisé." })
    }
    try {
        const secret = env("JWT_SECRET");
        const decoded = jwt.verify(token, secret) as AuthTokenPayload;
        req.user = decoded;
        return next();
    } catch (error) {
        console.log("Erreur lors de la vérification du token.")
        console.log("Erreur : ", error);
        return res.status(401).json({ success: false, message: "Erreur d'authentification." });
    }

}
function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Non authentifié." });
    }
    if (req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Accès interdit." });
    }
    return next();
}


app.get("/index", (_req, res) => {
    res.sendFile(path.join(__dirname, "../public", "index.html"));
});
app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "../public", "register.html"))
})
app.get("/connexion", (req, res) => {
    res.sendFile(path.join(__dirname, "../public", "connexion.html"))
})
app.get("/admin", auth, requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, "../public", "admin.html"))
})
app.get("/board", auth, (req, res) => {
    res.sendFile(path.join(__dirname, "../public", "board.html"))
})

app.get("/api/ping", (_req, res) => res.json({ ok: true, message: "Aucun bug à signaler !" }));

app.get("/api/users", auth, requireAdmin, async (req, res) => {
    try {
        const users = await pool.query("SELECT email,id,name,firstname,is_approved,role FROM users ORDER BY id ASC")
        return res.status(200).json({ success: true, message: "Les données d'utilisateurs ont bien été récupérées.", data: users.rows })
    } catch (error) {
        return res.status(500).json({ success: false, message: "Problème interne au serveur. Veuillez essayer ultérieurement." })
    }

})

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
            const password_hash = await bcrypt.hash(password, 18);
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
app.post("/api/connexion", async (req, res) => {
    console.log("Tentative de connexion en cours");
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Champs manquants." });
    }
    try {
        //Vérification email
        const email_ok = await pool.query("SELECT id,email,password_hash,is_approved,role FROM users WHERE email=$1", [email])
        if (email_ok.rows.length > 0) {
            const user = email_ok.rows[0];
            const password_hash = user.password_hash;
            console.log("Email trouvé dans la base de données.");
            //Si email ok => vérification password
            const pass_ok = await bcrypt.compare(password, password_hash);

            if (pass_ok) {
                // id est très probablement un number
                const userId: number = user.id;
                const userEmail: string = user.email;
                const userIsApproved: boolean = user.is_approved;
                const secret = process.env.JWT_SECRET;
                if (!secret) return res.status(500).json({ success: false, message: "JWT_SECRET manquant." });
                if (!userIsApproved) return res.status(403).json({ success: false, message: "Vous n'avez pas encore l'authorisation d'accès. L'admin doit vous l'accorder." })
                const expiresIn = (process.env.JWT_EXPIRES_IN ?? "1h") as SignOptions["expiresIn"];

                const token = jwt.sign(
                    { userId, userEmail, userIsApproved, role: user.role },
                    secret,
                    { expiresIn }
                );
                const max_age = envNumber("COOKIE_MAX_AGE_MS")
                res.cookie("token", token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "strict",
                    maxAge: max_age
                });
                return res.status(200).json({ success: true, message: "Connexion résussie", role: user.role })
                //Renvoie de la réponse 
            } else {
                console.log("Mot de passe erroné.");
                return res.status(401).json({ success: false, message: "Mot de passe erroné." });
            }
        } else {
            console.log("Email inexistant dans BDD.")
            return res.status(404).json({ success: false, message: "L'adresse mail n'a pas été retrouvé dans la base de données." });
        }

    } catch (error) {
        console.log(`Erreur serveur. Connexion impossible à la base de données : ${error}`);
        return res.status(500).json({ success: false, message: "Erreur SERVEUR. Connexion impossible à la base de données." })
    }
})

app.post('/api/deconnexion', (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        path: "/",
    });
    return res.status(200).json({ success: true, message: "Déconnecté" });
})

app.listen(PORT, () => {
    console.log(`Serveur: http://localhost:${PORT}`);
});
