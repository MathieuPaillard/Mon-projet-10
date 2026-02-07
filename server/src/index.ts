import express from "express";
import type { Request, Response, NextFunction } from "express";
import path, { join } from "node:path";
import dotenv from "dotenv";
import { Pool } from "pg";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { AuthTokenPayload } from "./auth/jwt.types";
import crypto from "node:crypto";
import type { Role } from "./auth/jwt.types";


// Charge .env depuis la racine server/
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
// connexion à la base de données
// users => id/email/password_hash/created_at/name/firstname/is_approved/role
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
//HMAC
const HMAC_KEY = Buffer.from(env("APP_PHONE_HMAC_KEY_B64"), "base64");
if (HMAC_KEY.length !== 32) throw new Error("APP_PHONE_HMAC_KEY_B64 doit faire 32 octets base64.");

function normalizePhoneE164(input: string): string {
    // strict : on supprime espaces/tirets/points
    const s = input.replace(/[\s.-]/g, "");

    return s;
}

function phoneHmac(phoneE164: string): Buffer {
    return crypto.createHmac("sha256", HMAC_KEY).update(phoneE164, "utf8").digest(); // Buffer => bytea
}

//HMAC FIN



// CRYPTO
const KEY = Buffer.from(env("APP_ENC_KEY_B64") ?? "", "base64");
if (KEY.length !== 32) throw new Error("APP_ENC_KEY_B64 doit être une clé base64 de 32 octets.");
const ALGO = "aes-256-gcm";
const IV_LEN = 12; // recommandé pour GCM

export function encryptText(plainText: string): string {
    const iv = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv(ALGO, KEY, iv);

    const ciphertext = Buffer.concat([
        cipher.update(plainText, "utf8"),
        cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    // format: iv.tag.ciphertext (base64)
    return [
        iv.toString("base64"),
        tag.toString("base64"),
        ciphertext.toString("base64"),
    ].join(".");
}

export function decryptText(payload: string): string {
    const [ivB64, tagB64, dataB64] = payload.split(".");
    if (!ivB64 || !tagB64 || !dataB64) throw new Error("Payload invalide.");

    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const data = Buffer.from(dataB64, "base64");

    const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
    decipher.setAuthTag(tag);

    const plain = Buffer.concat([decipher.update(data), decipher.final()]);
    return plain.toString("utf8");
}

// CRYPTO FIN 

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
        const users = await pool.query("SELECT email,id,name,firstname,is_approved,role FROM users WHERE id <> 68 ORDER BY id DESC")

        return res.status(200).json({ success: true, message: "Les données d'utilisateurs ont bien été récupérées.", data: users.rows })
    } catch (error) {
        return res.status(500).json({ success: false, message: "Problème interne au serveur. Veuillez essayer ultérieurement." })
    }

})

app.post("/api/register", async (req, res) => {
    const { name, firstname, email, password, phoneNumber } = req.body;
    console.log(`Contenu du Body : ${name}`)
    let phoneEnc: string | null = null;
    let phoneMac: Buffer | null = null;
    //Vérification de la présence de tous les champs
    if (!name || !firstname || !email || !password) {
        return res.status(400).json({ success: false, message: `Champs manquants...` })
    }
    //vérification existance dans BDD
    try {
        const email_exist = await pool.query(`SELECT email from users WHERE email = $1`, [email]);
        if (email_exist.rows.length == 0) {
            // on crypt le mot de passe :
            const password_hash = await bcrypt.hash(password, 12);
            console.log(password_hash);
            //On insert dans la base les données.
            /* const name_crypt: string = encryptText(name);
             const firstname_crypt: string = encryptText(firstname);*/
            if (typeof phoneNumber === "string" && phoneNumber.trim() !== "") {
                const phone = normalizePhoneE164(phoneNumber);
                phoneEnc = encryptText(phone);
                phoneMac = phoneHmac(phone);
            }
            const insert = await pool.query("INSERT INTO users (name , firstname, email, password_hash, phone_enc,phone_hmac) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,email,created_at", [name, firstname, email, password_hash, phoneEnc, phoneMac])
            const user = insert.rows[0];
            return res.status(201).json({ success: true, message: `Compte créé avec succès : USER ${user.id}` })

        } else {
            console.log("Email déjà utilisé");
            return res.status(409).json({ success: false, message: "Email déjà utilisé." });
        }
    } catch (error: any) {
        // Postgres unique violation
        if (error?.code === "23505") {
            // e.constraint contient souvent le nom de la contrainte
            if (error.constraint === "users_phone_hmac_unique") {
                return res.status(409).json({ success: false, message: "Téléphone déjà utilisé." });
            }
            if (error.constraint === "users_email_key") { // exemple si tu as UNIQUE(email)
                return res.status(409).json({ success: false, message: "Email déjà utilisé." });
            }
            return res.status(409).json({ success: false, message: "Doublon (contrainte unique)." });
        }

        // Postgres check violation
        if (error?.code === "23514") {
            return res.status(400).json({ success: false, message: "Donnée invalide (contrainte CHECK)." });
        }
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
        const email_ok = await pool.query("SELECT id,email,password_hash,is_approved,role,name,firstname FROM users WHERE email=$1", [email])
        if (email_ok.rows.length > 0) {
            const user = email_ok.rows[0];
            const password_hash = user.password_hash;
            console.log("Email trouvé dans la base de données.");
            //Si email ok => vérification password
            const pass_ok = await bcrypt.compare(password, password_hash);

            if (pass_ok) {
                console.log("Mot de passe validé")
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
                console.log(`La connexion est un succès. Role : ${user.role}`);
                return res.status(200).json({ success: true, message: "Connexion réussie", role: user.role, name: user.name, firstname: user.firstname, id: userId })
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

app.patch('/api/admin/set_approved/:id', auth, requireAdmin, async (req, res) => {
    console.log("Requête en cours...")
    const { is_approved, role } = req.body;
    const id = Number(req.params.id);

    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: "Le format ID n'est pas conforme pour valider la requête." });
    if (typeof is_approved !== "undefined" && typeof is_approved !== "boolean") {
        return res.status(400).json({ success: false, message: "Le format de l'approbation n'est pas valide." });
    }
    if (role && role !== "user" && role !== "admin" && role !== "visitor") {
        return res.status(400).json({ success: false, message: "Le format du rôle n'est pas valide. Il doit avoir pour valeur user ou admin." });
    }

    function changerRole(role: Role): Role {
        switch (role) {
            case "user": return "admin";
            case "admin": return "visitor";
            case "visitor": return "user";
        }
    }
    const newRole: Role = changerRole(role);
    try {

        const r = await pool.query(`UPDATE users
    SET is_approved = COALESCE($1 , is_approved),
    role = COALESCE($2 , role) WHERE id = $3 RETURNING id,email,firstname,name,is_approved,role`,
            [typeof is_approved === "boolean" ? is_approved : null, newRole ?? null, id])
        const data = r.rows[0];

        console.log(`Success : ok => ROLE : ${data.role} IS_APPROVED : ${data.is_approved}`);
        return res.status(200).json({ success: true, message: "Les modifications ont bien été réalisé dans la base de données.", data: data })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Erreur serveur." });
    }

})

app.delete('/api/admin/delete/:id', auth, requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ success: false, message: "L'identifiant n'est pas valide." });
    }
    const r = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id, email", [id]);
    if (r.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
    }
    return res.status(200).json({ success: true, message: `Suppression de l'utilisateur : ${r.rows[0].email} id : ${r.rows[0].id}` });
})



app.listen(PORT, () => {
    console.log(`Serveur: http://localhost:${PORT}`);
   
});
