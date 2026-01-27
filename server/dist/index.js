"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const node_path_1 = __importDefault(require("node:path"));
const dotenv_1 = __importDefault(require("dotenv"));
// Charge .env depuis la racine server/
dotenv_1.default.config({ path: node_path_1.default.resolve(__dirname, "..", ".env") });
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 3003;
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// API test
app.post("/api/register", (req, res) => {
    console.log("BODY =", req.body);
    res.status(201).json({ success: true });
});
// Statique (front buildé par Vite)
app.use(express_1.default.static(node_path_1.default.join(__dirname, "../public")));
// Fallback SPA
app.get(/.*/, (_req, res) => {
    res.sendFile(node_path_1.default.join(__dirname, "../public", "index.html"));
});
app.listen(PORT, () => {
    console.log(`Serveur: http://localhost:${PORT}`);
});
