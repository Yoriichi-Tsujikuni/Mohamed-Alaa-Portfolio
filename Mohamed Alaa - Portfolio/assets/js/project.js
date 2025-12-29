import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = { 
  apiKey: "AIzaSyDcscBzmbk-pROVNisgMQinUPnvSC0oHIc", 
  authDomain: "portfolio-650d5.firebaseapp.com", 
  projectId: "portfolio-650d5", 
  storageBucket: "portfolio-650d5.firebasestorage.app", 
  messagingSenderId: "519064523638", 
  appId: "1:519064523638:web:f5a49354ab30446af76057", 
  measurementId: "G-N5HVD62SZF"
};

// Init
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ================================
//      Load Project Function
// ================================
async function loadProject() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = decodeURIComponent(urlParams.get("id"));

  if (!projectId || projectId == undefined || projectId == null) {
    return;
  }

  const ref = doc(db, "projects", projectId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return;
  }

  const data = snap.data();

  // ========== Inject Data ==========
  document.title = data.title + " - Portfolio";

  // Display Data
  document.querySelector("header h1").textContent = data.title;
  document.getElementById("Projecttitle").textContent = data.title || "لا يوجد";
  document.getElementById("ProjectType").textContent = data.type || "لا يوجد";
  document.getElementById("Projectdetails").textContent = data.desc || "لا يوجد";

  // Determine Project Type and Apply Class for Styling
  const projectType = data.type || "default";
  const header = document.querySelector("header");

  // Apply class based on project type
  header.classList.add(`project-type-${projectType.toLowerCase()}`);

  // Optional: Add specific styling based on type (you can also do this in CSS)
  const typePlace = document.createElement("p");
  typePlace.style.marginTop = "10px";
  typePlace.style.fontWeight = "900";
  typePlace.textContent = "نوع المشروع: " + data.type;
  document.querySelector("header").appendChild(typePlace);

  // ========== Gallery / Video ==========
  const galleryBox = document.querySelector("#mediaGrid") || document.querySelector(".img-grid");
  galleryBox.innerHTML = "";
  const gallery = data.gallery || [];
  const videos = data.videos || [];

  // Render images
  if (gallery.length > 0) {
    gallery.forEach(img => {
      const div = document.createElement("div");
      div.className = "img-container";

      const image = document.createElement("img");
      image.src = img;
      image.alt = "project image";

      div.appendChild(image);
      galleryBox.appendChild(div);
    });
  }

  // Render small/thumbnail videos next to images
  if (videos.length > 0) {
    videos.forEach(vurl => {
      const div = document.createElement("div");
      
      // Determine video type (e.g., "reels", "normal", etc.)
      const videoType = data.videoType || "normal"; // You can customize this field from Firestore

      // Apply class based on video type
      div.classList.add(`video-container`, `video-type-${videoType.toLowerCase()}`);

      const vid = document.createElement("video");
      vid.src = vurl;
      vid.controls = true;
      vid.muted = true;
      vid.classList.add("video-js");
      vid.preload = "auto";
      vid.setAttribute("data-aos", "fade-up");
      vid.setAttribute("data-aos-dialy", "100");
      vid.setAttribute("data-setup", "{}");

      // Check if video type is "reels" and apply "reels-container" class
      if (videoType === "reels") {
        div.classList.add("reels-container");
      }

      div.appendChild(vid);
      galleryBox.appendChild(div);
      // initialize Video.js
      videojs(vid);
    });
  }

  if (gallery.length === 0 && videos.length === 0) {
    galleryBox.innerHTML = "<p data-aos='fade-left' data-aos-dialy='100' style='text-align:center; padding:20px;'>لا يوجد صور أو فيديو للمشروع</p>";
  }

  // Hero / large video section (bottom of page)
  const heroSection = document.getElementById('heroVideoSection');
  if (heroSection) {
    const heroUrl = data.heroVideo || data.heroVideoUrl || data.videoUrl || null;
    if (heroUrl) {
      heroSection.style.display = '';
      heroSection.innerHTML = '';
      const bigVid = document.createElement('video');
      bigVid.controls = true;
      bigVid.style.border = '2px solid #ccff00';
      bigVid.classList.add("Hero-Video");
      bigVid.style.borderRadius = "8px";
      bigVid.setAttribute("data-aos", "fade-up");
      bigVid.setAttribute("data-aos-dialy", "100");
      bigVid.classList.add("video-js");
      bigVid.preload = "auto";
      bigVid.setAttribute("data-setup", "{}");
      const src = document.createElement('source');
      src.src = heroUrl;
      src.type = 'video/mp4';
      bigVid.appendChild(src);
      document.getElementById("HeroVid_Title").style.display = "block";
      bigVid.innerHTML += 'المتصفح لا يدعم تشغيل الفيديو.';
      heroSection.appendChild(bigVid);
      // initialize Video.js
      videojs(bigVid);
    } else {
      heroSection.style.display = 'none';
      heroSection.innerHTML = '';
      document.getElementById("HeroVid_Title").style.display = "none";
    }
  }
}

// Run
loadProject();