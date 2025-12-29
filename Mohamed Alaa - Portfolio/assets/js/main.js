import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = { 
  apiKey: "AIzaSyDcscBzmbk-pROVNisgMQinUPnvSC0oHIc", 
  authDomain: "portfolio-650d5.firebaseapp.com", 
  projectId: "portfolio-650d5", 
  storageBucket: "portfolio-650d5.firebasestorage.app", 
  messagingSenderId: "519064523638", 
  appId: "1:519064523638:web:f5a49354ab30446af76057", 
  measurementId: "G-N5HVD62SZF"
};

// Tabs filter logic
let tabs = document.querySelectorAll('#tabs button');
let cards = [];
  
function setActive(btn){
  tabs.forEach(b => b.classList.remove('active'));
  btn.classList.add('active')
}
  
tabs.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const filter = btn.dataset.filter;
    setActive(btn);
  
    cards.forEach(c=>{
      if(filter === 'all' || c.dataset.category === filter){
        c.style.display = '';
      } else {
        c.style.display = 'none';
      }
    });
  });
});
  
// keyboard accessibility
document.getElementById('tabs').addEventListener('keydown', (e)=>{
  const activeIndex = Array.from(tabs).findIndex(t=>t.classList.contains('active'));
  if(e.key === 'ArrowLeft'){
    const idx = (activeIndex - 1 + tabs.length) % tabs.length; 
    tabs[idx].focus(); 
    tabs[idx].click();
  } else if(e.key === 'ArrowRight'){
    const idx = (activeIndex + 1) % tabs.length; 
    tabs[idx].focus(); 
    tabs[idx].click();
  }
});
  
/* === Navbar scroll effect === */
const nav = document.getElementById('mainNav');
function handleScroll() {
  if(window.scrollY > 50) nav.classList.add('scrolled');
  else nav.classList.remove('scrolled');
}
window.addEventListener('scroll', handleScroll);
handleScroll();
  
/* small pulse animation */
(function addPulseStyle(){
  const s = document.createElement('style');
  s.innerHTML = '@keyframes pulse{0%{transform:scale(1)}50%{transform:scale(1.08)}100%{transform:scale(1)}}';
  document.head.appendChild(s);
})();
  
/* ====== Get date ====== */
document.getElementById("date").innerHTML = new Date().getFullYear();
  
/* ====== Load projects ====== */
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const worksGrid = document.getElementById("worksGrid");
  
async function loadProjects() {
  return await getDocs(collection(db, "projects"));
}

async function displayProjects() {
  let snapshot = await loadProjects();
  let projects = "";
  
   snapshot.forEach(doc => {
    const data = doc.data();
    projects += `
    <article class="work-card" data-aos="fade-up" data-aos-dialy="200" data-category="${data.category || "لا يوجد"}">
      <div class="work-thumb">
        <img src="${data.coverImage || "لا يوجد"}" alt="${data.desc || "لا يوجد"}">
        <span class="badge-cat">${data.category || "لا يوجد"}</span>
      </div>
      <div class="work-body">
        <h3 class="work-title">${data.title || "لا يوجد"}</h3>
        <div class="work-cat">${data.type || "لا يوجد"}</div>
        <p class="work-desc">${data.desc || "لا يوجد"}</p>
        <div class="work-actions">
          <a href="#" data-id="${doc.id}" class="open">Open</a>
        </div>
      </div>
    </article>
    `;
  });
  
   worksGrid.innerHTML = projects || `<h1>لا يوجد مشاريع لعرضها</h1>`;
  
  // Update cards after rendering
  cards = Array.from(document.querySelectorAll(".work-card"));
  return document.querySelectorAll(".open");
}
displayProjects();

let elemnt = await displayProjects();
elemnt.forEach(btn => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    let id = btn.dataset.id;
    window.location.href = `Project%20Page.html?id=${encodeURIComponent(id)}`;
  });
});