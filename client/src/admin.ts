import './style.css';
const section_id = document.querySelector<HTMLDivElement>("#section_id");
const name = localStorage.getItem("name");
const firstname = localStorage.getItem("firstname");
const id = localStorage.getItem("id");
if (section_id) section_id.textContent = `${name} ${firstname} ID : ${id}`;
const button_deconnexion = document.querySelector<HTMLButtonElement>("#deconnexion");
const out = document.querySelector<HTMLPreElement>("#out");
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

        const is_approved = document.createElement("button");
        is_approved.className = "card-is_approved"
        is_approved.textContent = `Profile approuvé : ${u.is_approved}`;
        is_approved.classList.add(u.is_approved ? "is-true" : "is-false");

        is_approved.addEventListener("click", async (e) => {
            e.preventDefault();
            const payload = {
                is_approved: !u.is_approved
            };
            const res = await fetch(`/api/admin/set_approved/${u.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: 'include',
                body: JSON.stringify(payload)
            })
            const json = await res.json();
            if (!res.ok) {
                if (out) out.textContent = json.message;
                return
            } else {
                is_approved.textContent = `Profile approuvé : ${json.data.is_approved}`;
                u.is_approved = json.data.is_approved;
                is_approved.classList.remove("is-true", "is-false");
                is_approved.classList.add(u.is_approved ? "is-true" : "is-false");
                if (out) out.textContent = json.message;
                return
            }


        })

        const role = document.createElement("button");
        role.className = "card-role";
        role.textContent = `Role : ${u.role}`;
        role.classList.add(`role-${u.role}`);

        role.addEventListener("click", async (e) => {
            e.preventDefault();
            const payload = {
                role: u.role
            };

            try {
                const res = await fetch(`/api/admin/set_approved/${u.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: 'include',
                    body: JSON.stringify(payload),
                })
                const json = await res.json();
                if (!res.ok) {
                    if (out) out.textContent = `Message Erreur : ${json.message}`;
                    return
                } else {

                    if (out) out.textContent = `${json.message}`;
                    role.textContent = `Role : ${json.data.role}`;
                    role.classList.remove("role-admin", "role-user", "role-visitor");
                    role.classList.add(`role-${json.data.role}`);
                    u.role = json.data.role;


                }
            } catch (error) {
                if (out) out.textContent = `Error : ${error}`;
                return
            }


        })

        const button_delete = document.createElement("button");
        button_delete.className = "card-button_delete";
        button_delete.textContent = `Suppression`;
        button_delete.addEventListener("click", async (e) => {
            e.preventDefault();
            if (confirm(`Voulez vous réellement supprimer l'utilisateur : ${u.name} ${u.firstname}`)) {
                const res = await fetch(`/api/admin/delete/${u.id}`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    credentials: 'include'
                })
                if (!res.ok) {
                    const json = await res.json();
                    if (out) out.textContent = json.message;
                } else {

                    const json = await res.json();

                    if (out) out.textContent = json.message;
                    alert(json.message);
                    card.remove();


                }
            }

        })

        card.append(id, firstname, name, email, is_approved, role, button_delete);
        div_cards?.appendChild(card);
    }

})()