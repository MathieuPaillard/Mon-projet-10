import './style.css';
const form = document.querySelector<HTMLFormElement>('#connexionForm');
const out = document.querySelector<HTMLPreElement>('#out');
const button = document.querySelector<HTMLButtonElement>('#buttonConnexion');

if (out) out.textContent = "En attente de saisie...";


form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (button) button.disabled = true;
    const data = new FormData(form);
    const payload = {
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
    };
    try {
        const res = await fetch("/api/connexion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),

        });
        if (res.ok) {
            const data = await res.json();
            if (out) out.textContent = `${data.message}`
        } else {
            const data = await res.json();
            if (out) out.textContent = `${data.message}`
            if (button) button.disabled = false;
        }
    } catch (error) {
        if (out) out.textContent = `Erreur relevée : ${error}`
        if (button) button.disabled = false;
    }

})