import './style.css';
const button_deconnexion = document.querySelector<HTMLButtonElement>("#deconnexion");
button_deconnexion?.addEventListener("click", async (e) => {
    e.preventDefault();
    await fetch("/api/deconnexion", {
        method: "POST",
        credentials: 'same-origin'
    });
    window.location.replace("/connexion");
});
(async () => {
    const div_cards = document.querySelector<HTMLDivElement>("#cards");
    const res = await fetch("/api/users", { method: "GET", credentials: 'include' });
    if (!res.ok) return window.location.replace("/connexion");
    const json = await res.json();
    const users = json.data || [];
    for (const u of users) {

        const card = document.createElement("div");
        card.className = "card";
        card.id = `card${u.id}`;

        const firstname = document.createElement("div");
        firstname.className = "card-firstname";
        firstname.textContent = `${u.firstname}`;

        const name = document.createElement("div");
        name.className = "card-name";
        name.textContent = `${u.name}`

        const id = document.createElement("div");
        id.className = "card-id";
        id.textContent = `id : ${u.id}`;

        const email = document.createElement("div");
        email.className = "card-email";
        email.textContent = `${u.email}`;

        const is_approved = document.createElement("toogle");
        is_approved.className = "card-is_approved"
        is_approved.textContent = `Profile approuvé : ${u.is_approved}`;
        is_approved.classList.add(u.is_approved ? "is-true" : "is-false");

        const role = document.createElement("div");
        role.className = "card-role";
        role.textContent = `Role : ${u.role}`;
        role.classList.add(u.role === "admin" ? "role-admin" : "role-user");

        const button_delete = document.createElement("button");
        button_delete.className = "card-button_delete";
        button_delete.textContent = `Suppression`;

        card.append(id, firstname, name, email, is_approved, role, button_delete);
        div_cards?.appendChild(card);
    }

})()