import './style.css';
const section_id = document.querySelector<HTMLDivElement>("#section_id");
const name = localStorage.getItem("name");
const firstname = localStorage.getItem("firstname");
const id = localStorage.getItem("id");
if (section_id) section_id.textContent=`${name} ${firstname} ID : ${id}`;
const button_deconnexion = document.querySelector<HTMLUListElement>("#deconnexion");
button_deconnexion?.addEventListener("click", async (e)=>{
    e.preventDefault();
    await fetch("/api/deconnexion", {
        method:"POST",
        credentials:'same-origin'});
window.location.replace("/connexion");
    })
