const form = document.querySelector<HTMLFormElement>("#registerForm");
const out = document.querySelector<HTMLPreElement>("#out");

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

  const json = await res.json();
  if (out) out.textContent = JSON.stringify(json, null, 2);
});
