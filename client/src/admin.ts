import './style.css';
const button_deconnexion = document.querySelector<HTMLUListElement>("#deconnexion");
button_deconnexion?.addEventListener("click", async (e)=>{
    e.preventDefault();
    await fetch("/api/deconnexion", {
        method:"POST",
        credentials:'same-origin'});
window.location.replace("/connexion");
    })
