import './style.css';
const form = document.querySelector<HTMLFormElement>("#registerForm");
const out = document.querySelector<HTMLPreElement>("#out");
//const mess = document.querySelector<HTMLPreElement>("#mess");
const buttonRegister = document.querySelector<HTMLButtonElement>("#buttonRegister");
console.log("main.ts chargé");

fetch("/api/ping")
  .then((r) => r.json())
  .then((data) => console.log("ping =", data))
  .catch((e) => console.error("ping failed", e));

if (!form) throw new Error("Form introuvable");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = new FormData(form);
  const payload = {
    name: String(data.get("name") ?? ""),
    firstname: String(data.get("firstname") ?? ""),
    email: String(data.get("email") ?? ""),
    password: String(data.get("password") ?? ""),
  };
  
  const res = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

 if(!res.ok){
  const data = await res.json();
  if (out) out.textContent = `${data.message}`
  
 }
});
