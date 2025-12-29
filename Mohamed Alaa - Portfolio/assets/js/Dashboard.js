// ====== Firebase imports (v9 modular) ======
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// ====== SweetAlert2 (ESM) ======
import Swal from "https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.esm.js";

// ====== Cloudinary config ======
const CLOUDINARY_CLOUD_NAME = 'dlmpljxm7';
const CLOUDINARY_UPLOAD_PRESET = 'portfolio_upload';

// ====== Firebase config ======
const firebaseConfig = {
  apiKey: "AIzaSyDcscBzmbk-pROVNisgMQinUPnvSC0oHIc",
  authDomain: "portfolio-650d5.firebaseapp.com",
  projectId: "portfolio-650d5",
  storageBucket: "portfolio-650d5.appspot.com",
  messagingSenderId: "519064523638",
  appId: "1:519064523638:web:f5a49354ab30446af76057",
  measurementId: "G-N5HVD62SZF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const projectsRef = collection(db, "projects");

// ====== UI elements ======
const projectsList = document.getElementById('projectsList');
const countEl = document.getElementById('count');
const statusEl = document.getElementById('status');

const titleEl = document.getElementById('title');
const descEl = document.getElementById('desc');
const categoryEl = document.getElementById('category');
const typeEl = document.getElementById('type');

// Cover inputs
const coverUrlEl = document.getElementById('coverUrl');
const coverFileEl = document.getElementById('coverFile');
const coverUrlPreviewEl = document.getElementById('coverUrlPreview');
const coverFilePreviewEl = document.getElementById('coverFilePreview');

// Hero video inputs
const heroUrlEl = document.getElementById('heroUrl');
const heroFileEl = document.getElementById('heroFile');
const heroUrlPreviewEl = document.getElementById('heroUrlPreview');
const heroFilePreviewEl = document.getElementById('heroFilePreview');

// Gallery videos
const galleryVideoFilesEl = document.getElementById('galleryVideoFiles');
const galleryVideosUrlsEl = document.getElementById('galleryVideosUrls');
const galleryVideosPreviewEl = document.getElementById('galleryVideosPreview');

// Gallery
const galleryFilesEl = document.getElementById('galleryFiles');
const galleryPreviewEl = document.getElementById('galleryPreview');

const saveBtn = document.getElementById('saveBtn');
const cancelEditBtn = document.getElementById('cancelEdit');
const editingIdEl = document.getElementById('editingId');
const formTitle = document.getElementById('formTitle');

// زرّ إلغاء العملية (لازم يكون موجود في الـ HTML)
const cancelProcessBtn = document.getElementById('cancelProcess');

// state
let isEditing = false;
let coverUploadMethod = 'cover_url';
let heroUploadMethod = 'hero_url';
let currentCoverPublicId = null;
let currentGalleryPublicIds = [];

// حالة رفع
let saveAbortController = null;
let saveInProgress = false;
let tempProjectId = null;
let objectUrls = []; // أي URLs تم إنشاؤها بـ URL.createObjectURL

// status animation state (requestAnimationFrame based) --- smoother animation
let statusAnim = {
  rafId: null,
  startTs: null,
  baseText: '',
  running: false,
  dotCount: 3,
  speed: 700 // ms per full cycle
};

// small toast
const toast = (msg, icon = 'success', timer = 2000) => {
  Swal.fire({ toast:true, position:'top-end', showConfirmButton:false, timer, icon, title: msg });
};

// ---------- helpers ----------
function escapeHtml(str){ if(!str) return ''; return String(str).replace(/[&<>"]|'/g, m=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m])); }
function escapeAttr(s){ return s ? String(s).replace(/"/g,'&quot;') : ''; }

// ---------- status animation helpers (nice moving dots) ----------
// Uses requestAnimationFrame to smoothly animate three dots with staggered scale/opacity
function startStatusAnimation(text, opts = {}){
  stopStatusAnimation();
  if(!statusEl) return;
  statusAnim.baseText = text || '';
  statusAnim.dotCount = opts.dotCount || 3;
  statusAnim.speed = opts.speed || 700; // duration in ms of one full wave
  statusAnim.running = true;
  statusAnim.startTs = performance.now();

  // build HTML structure: base text + container for dots with spans
  const dotsHtml = new Array(statusAnim.dotCount).fill(0).map((_,i)=>`<span class="s-dot" data-i="${i}">•</span>`).join('');
  statusEl.innerHTML = `<span class="s-text">${escapeHtml(statusAnim.baseText)}</span>&nbsp;<span class="s-dots">${dotsHtml}</span>`;

  // ensure basic inline styles for dots (so it looks good without external CSS)
  const styleId = 'status-anim-styles';
  if(!document.getElementById(styleId)){
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      #status { font-weight: 600; }
      #status .s-dots { display:inline-flex; align-items:center; gap:6px; }
      #status .s-dot { display:inline-block; font-size:18px; line-height:1; transform-origin:center; opacity:0.35; transition: transform 120ms linear; }
    `;
    document.head.appendChild(style);
  }

  function frame(ts){
    if(!statusAnim.running){ statusAnim.rafId = null; return; }
    const elapsed = ts - statusAnim.startTs;
    const cycle = statusAnim.speed;
    // for each dot compute phase offset
    const dots = statusEl.querySelectorAll('.s-dot');
    dots.forEach((el, idx)=>{
      // phase for this dot (staggered)
      const phase = ((elapsed + (idx * (cycle / statusAnim.dotCount))) % cycle) / cycle; // 0..1
      // use sine for smooth scale and opacity
      const scale = 1 + Math.sin(phase * Math.PI * 2) * 0.45; // ~0.55 .. 1.45
      const opacity = 0.35 + (Math.max(0, Math.sin(phase * Math.PI * 2)) * 0.65); // 0.35 .. 1
      el.style.transform = `scale(${scale.toFixed(3)})`;
      el.style.opacity = opacity.toFixed(3);
    });

    statusAnim.rafId = requestAnimationFrame(frame);
  }

  statusAnim.rafId = requestAnimationFrame(frame);
}

function stopStatusAnimation(finalText){
  if(!statusEl) return;
  statusAnim.running = false;
  if(statusAnim.rafId) cancelAnimationFrame(statusAnim.rafId);
  statusAnim.rafId = null;
  if(finalText !== undefined && finalText !== null) statusEl.textContent = finalText;
  else statusEl.textContent = '';
}

// ---------- setup ----------
function setupEventListeners() {
  document.querySelectorAll('.upload-option').forEach(opt=>{
    opt.addEventListener('click', (e)=>{
      const method = e.currentTarget.dataset.option;
      // cover options: cover_url or cover_file
      if(method === 'cover_url' || method === 'cover_file') {
        coverUploadMethod = method;
        // toggle only cover options
        document.querySelectorAll('.upload-option').forEach(o=> {
          if(o.dataset.option && o.dataset.option.startsWith('cover_')) o.classList.toggle('active', o.dataset.option === method);
        });
        if(document.getElementById('coverUrlSection')) document.getElementById('coverUrlSection').classList.toggle('active', method === 'cover_url');
        if(document.getElementById('coverFileSection')) document.getElementById('coverFileSection').classList.toggle('active', method === 'cover_file');
        if(coverUrlPreviewEl) coverUrlPreviewEl.innerHTML = '';
        if(coverFilePreviewEl) coverFilePreviewEl.innerHTML = '';
      }

      // hero options: hero_url or hero_file
      if(method === 'hero_url' || method === 'hero_file') {
        heroUploadMethod = method;
        document.querySelectorAll('.upload-option').forEach(o=> {
          if(o.dataset.option && o.dataset.option.startsWith('hero_')) o.classList.toggle('active', o.dataset.option === method);
        });
        if(document.getElementById('heroUrlSection')) document.getElementById('heroUrlSection').classList.toggle('active', method === 'hero_url');
        if(document.getElementById('heroFileSection')) document.getElementById('heroFileSection').classList.toggle('active', method === 'hero_file');
        if(heroUrlPreviewEl) heroUrlPreviewEl.innerHTML = '';
        if(heroFilePreviewEl) heroFilePreviewEl.innerHTML = '';
      }
    });
  });

  if(coverUrlEl) coverUrlEl.addEventListener('blur', previewCoverUrl);
  if(coverFileEl) coverFileEl.addEventListener('change', previewCoverFile);
  if(galleryFilesEl) galleryFilesEl.addEventListener('change', previewGalleryFiles);

  if(heroUrlEl) heroUrlEl.addEventListener('blur', previewHeroUrl);
  if(heroFileEl) heroFileEl.addEventListener('change', previewHeroFile);
  if(galleryVideoFilesEl) galleryVideoFilesEl.addEventListener('change', previewGalleryVideos);

  if(saveBtn) saveBtn.addEventListener('click', saveProject);
  if(cancelEditBtn) cancelEditBtn.addEventListener('click', stopEdit);
  if(cancelProcessBtn) cancelProcessBtn.addEventListener('click', cancelSave);
}

// ---------- previews ----------
function previewCoverUrl() {
  const url = coverUrlEl?.value?.trim() || '';
  if(!coverUrlPreviewEl) return;
  coverUrlPreviewEl.innerHTML = '';
  if(!url) return;
  coverUrlPreviewEl.innerHTML = `<img src="${escapeAttr(url)}" alt="Cover" style="max-width:100%;max-height:200px;border-radius:8px;">`;
}

function previewHeroUrl() {
  const url = (heroUrlEl && heroUrlEl.value) ? heroUrlEl.value.trim() : '';
  if(!heroUrlPreviewEl) return;
  heroUrlPreviewEl.innerHTML = '';
  if(!url) return;
  const v = document.createElement('video');
  v.src = url;
  v.controls = true;
  v.style.maxWidth = '100%';
  v.style.maxHeight = '200px';
  v.style.borderRadius = '8px';
  heroUrlPreviewEl.appendChild(v);
}

function previewHeroFile(e) {
  if(!heroFilePreviewEl) return;
  const file = e?.target?.files?.[0];
  heroFilePreviewEl.innerHTML = '';
  if(!file) return;
  if(file.size > 100 * 1024 * 1024) { // 100MB
    Swal.fire('تحذير','حجم الملف كبير جداً. الحد الأقصى 100 ميجابايت','warning');
    if(heroFileEl) heroFileEl.value = '';
    return;
  }
  const url = URL.createObjectURL(file);
  objectUrls.push(url);
  const v = document.createElement('video');
  v.src = url;
  v.controls = true;
  v.style.maxWidth = '100%';
  v.style.maxHeight = '200px';
  v.style.borderRadius = '8px';
  heroFilePreviewEl.appendChild(v);
}

function previewGalleryVideos() {
  if(!galleryVideosPreviewEl) return;
  galleryVideosPreviewEl.innerHTML = '';
  const files = Array.from(galleryVideoFilesEl?.files || []);
  if(files.length === 0) return;
  files.forEach(file=>{
    if(file.size > 100 * 1024 * 1024) {
      Swal.fire({title:'تحذير',icon:'warning',text:'حجم الملف كبير جداً. الحد الأقصى 100 ميجابايت',confirmButtonText:'حسناً'});
      return; // skip this file
    }
    const url = URL.createObjectURL(file);
    objectUrls.push(url);
    const v = document.createElement('video');
    v.src = url;
    v.controls = true;
    v.style.maxWidth = '140px';
    v.style.maxHeight = '80px';
    v.style.margin = '4px';
    galleryVideosPreviewEl.appendChild(v);
  });
}

function previewCoverFile(e) {
  const file = e?.target?.files?.[0];
  if(!coverFilePreviewEl) return;
  coverFilePreviewEl.innerHTML = '';
  if(!file) return;
  if(file.size > 10 * 1024 * 1024) { // 10MB
    Swal.fire('تحذير','حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت','warning');
    if(coverFileEl) coverFileEl.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    coverFilePreviewEl.innerHTML = `<img src="${ev.target.result}" alt="Cover" style="max-width:100%;max-height:200px;border-radius:8px;">`;
  };
  reader.readAsDataURL(file);
}

function previewGalleryFiles() {
  if(!galleryPreviewEl) return;
  galleryPreviewEl.innerHTML = '';
  const files = Array.from(galleryFilesEl?.files || []);
  if(files.length === 0) return;
  files.forEach(file=>{
    if(file.size > 10 * 1024 * 1024) {
      Swal.fire({ title: "تحذير", icon: "warning", text: "حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت", confirmButtonText: "حسناً" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = document.createElement('img');
      img.src = ev.target.result;
      img.alt = 'thumb';
      galleryPreviewEl.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

// ---------- Cloudinary upload helpers (signal-aware) ----------
async function uploadToCloudinary(file, folder, signal = undefined) {
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  if(folder) fd.append('folder', folder);
  try { if(file && file.type && file.type.startsWith('video/')) fd.append('resource_type','video'); } catch(e) {}

  const res = await fetch(endpoint, { method:'POST', body:fd, signal });
  const data = await res.json();
  if(!res.ok) throw new Error(data.error?.message || 'فشل رفع الملف إلى Cloudinary');

  return {
    url: data.secure_url,
    public_id: data.public_id,
    resource_type: data.resource_type
  };
}

async function uploadMultipleToCloudinary(files, folder, signal = undefined) {
  const arr = Array.from(files || []);
  const promises = arr.map(f => uploadToCloudinary(f, folder, signal));
  return Promise.all(promises);
}

// === دالة لإلغاء وإعادة الحالة ===
async function cancelSave() {
  if(!saveInProgress) {
    // لما مفيش رفع جاري
    stopEdit();
    clearForm();
    stopStatusAnimation('');
    return;
  }

  try {
    if(saveAbortController) saveAbortController.abort();
  } catch(e) {}

  startStatusAnimation('جاري إلغاء العملية');
  if(cancelProcessBtn) cancelProcessBtn.style.display = 'none';
  if(saveBtn) saveBtn.disabled = false;

  // حذف المستند المؤقت لو اتعمل
  if(tempProjectId) {
    try {
      await deleteDoc(doc(db, 'projects', tempProjectId));
    } catch (e) {
      return;
    }
    tempProjectId = null;
  }

  // تنظيف preview object URLs
  objectUrls.forEach(u => { try { URL.revokeObjectURL(u); } catch(e) {} });
  objectUrls = [];

  saveInProgress = false;
  stopStatusAnimation('تم الإلغاء.');
  await Swal.fire({ icon:'info', title:'أُلغيت العملية', showConfirmButton:false, timer:1200 });
  clearForm();
  stopEdit();
}

// ---------- save project ----------
async function saveProject() {
  const title = titleEl?.value?.trim();
  const desc = descEl?.value?.trim();
  const category = categoryEl?.value || '';
  const type = typeEl?.value?.trim() || '';

  if(!title) {
    await Swal.fire({ icon:'warning', title:'ضع عنوان للمشروع', confirmButtonText:'حسناً' });
    return;
  }

  if(saveInProgress) {
    // منع تشغيل عملية ثانية بنفس الوقت
    toast('هناك عملية رفع جارية', 'warning');
    return;
  }

  if(saveBtn) saveBtn.disabled = true;
  startStatusAnimation('جاري الحفظ', { dotCount: 3, speed: 700 });

  // init abort controller
  saveAbortController = new AbortController();
  const signal = saveAbortController.signal;
  saveInProgress = true;
  if(cancelProcessBtn) cancelProcessBtn.style.display = 'inline-block';

  try {
    let cover = { url:'', public_id:null, uploadMethod:'url' };
    let gallery = [];
    let videos = [];
    let heroVideo = null;
    let heroPublicId = null;

    let projectId = isEditing ? editingIdEl?.value : null;
    if(!isEditing) {
      const tempDoc = await addDoc(projectsRef, { createdAt: new Date().toISOString() });
      projectId = tempDoc.id;
      tempProjectId = projectId; // سجل الـ temp id عشان نقدر نحذفه لو اتلغى
    }

    const folderName = `Mohamed Alaa - Portfolio - Images/${projectId}`;

    // ---- cover ----
    if(coverUploadMethod === 'cover_url') {
      const url = coverUrlEl?.value?.trim() || '';
      if(url) {
        cover.url = url;
        cover.uploadMethod = 'url';
      }
    } else if(coverUploadMethod === 'cover_file' && coverFileEl?.files?.[0]) {
      startStatusAnimation('جاري رفع صورة الغلاف');
      const res = await uploadToCloudinary(coverFileEl.files[0], folderName, signal);
      cover.url = res.url;
      cover.public_id = res.public_id;
      cover.uploadMethod = 'file';
    }

    // ---- gallery images ----
    if(galleryFilesEl?.files && galleryFilesEl.files.length > 0) {
      startStatusAnimation('جاري رفع صور المعرض');
      const results = await uploadMultipleToCloudinary(galleryFilesEl.files, folderName, signal);
      gallery = results.map(r => ({ url: r.url, public_id: r.public_id }));
    }

    // ---- gallery videos: links (textarea) ----
    const galleryUrlsRaw = (galleryVideosUrlsEl && galleryVideosUrlsEl.value) ? galleryVideosUrlsEl.value.trim() : '';
    if(galleryUrlsRaw) {
      const parts = galleryUrlsRaw.split(',').map(s=>s.trim()).filter(Boolean);
      videos.push(...parts);
    }

    // ---- gallery videos: files ----
    if(galleryVideoFilesEl?.files && galleryVideoFilesEl.files.length > 0) {
      startStatusAnimation('جاري رفع فيديوهات المعرض');
      const results = await uploadMultipleToCloudinary(galleryVideoFilesEl.files, folderName, signal);
      videos.push(...results.map(r => r.url));
    }

    // ---- hero video ----
    if(heroUploadMethod === 'hero_url') {
      const hurl = (heroUrlEl && heroUrlEl.value) ? heroUrlEl.value.trim() : '';
      if(hurl) heroVideo = hurl;
    } else if(heroUploadMethod === 'hero_file' && heroFileEl?.files?.[0]) {
      startStatusAnimation('جاري رفع فيديو البطل');
      const res = await uploadToCloudinary(heroFileEl.files[0], folderName, signal);
      heroVideo = res.url;
      heroPublicId = res.public_id;
    }

    const payload = {
      title,
      id: title + String(Math.floor(Math.random() * 10000)),
      desc,
      category,
      type,
      coverImage: cover.url || '',
      coverPublicId: cover.public_id || null,
      gallery: gallery.map(g => g.url) || [],
      galleryPublicIds: gallery.map(g => g.public_id) || [],
      videos: videos || [],
      heroVideo: heroVideo || null,
      heroVideoPublicId: heroPublicId || null,
      uploadAt: new Date().toISOString(),
      uploadMethodCover: cover.uploadMethod || 'url'
    };

    if(isEditing) {
      const id = editingIdEl?.value;
      if(!id) throw new Error('لا يوجد id للمشروع الجاري تعديله');
      await updateDoc(doc(db, 'projects', id), payload);
      stopStatusAnimation('تم التحديث.');
      toast('تم تحديث المشروع','success');
      stopEdit();
    } else {
      // update the temporary doc with full payload
      await updateDoc(doc(db, 'projects', projectId), payload);
      stopStatusAnimation('تم الإضافة.');
      toast('تم إضافة المشروع','success');
      clearForm();
    }

    // نجاح: امسح tempProjectId لأن الdocs بالفعل محدثة
    tempProjectId = null;
  } catch (err) {
    if(err && err.name === 'AbortError') {
      stopStatusAnimation('تم إلغاء العملية.');
    } else {
      stopStatusAnimation('فشل العملية');
      await Swal.fire({ icon:'error', title:'فشل العملية', text: err && err.message ? err.message : String(err) });
    }
  } finally {
    saveInProgress = false;
    if(cancelProcessBtn) cancelProcessBtn.style.display = 'none';
    if(saveBtn) saveBtn.disabled = false;

    // تنظيف preview object URLs
    objectUrls.forEach(u => { try { URL.revokeObjectURL(u); } catch(e) {} });
    objectUrls = [];
  }
}

// ---------- realtime listener ----------
onSnapshot(projectsRef, snapshot => {
  const items = [];
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    data._id = docSnap.id;
    items.push(data);
  });
  renderProjects(items);
}, err => {
  stopStatusAnimation('');
  if(statusEl) statusEl.textContent = "خطأ في جلب البيانات: " + (err && err.message ? err.message : err);
  Swal.fire({ icon:'error', title:'فشل جلب البيانات', text: err && err.message ? err.message : String(err) });
});

// ---------- render ----------
function renderProjects(items) {
  if(countEl) countEl.textContent = items.length;
  if(items.length === 0) {
    if(projectsList) projectsList.innerHTML = '<div class="empty-state">لا توجد مشاريع بعد — اضغط "اضف" لإضافة أول مشروع</div>';
    if(projectsList) projectsList.classList.add('empty');
    return;
  }
  if(projectsList) projectsList.classList.remove('empty');

  projectsList.innerHTML = items.map(item => {
    const coverHtml = item.coverImage ? `<img src="${escapeAttr(item.coverImage)}" alt="cover" class="project-card-cover me-2">` : `<div style="width:120px;height:80px;border-radius:6px;background:#f1f1f1;display:inline-block;margin-left:8px;"></div>`;
    const galleryThumbs = (item.gallery || []).slice(0,4).map(url => `<img src="${escapeAttr(url)}" class="project-gallery-thumb">`).join('');

    return `
    <div class="d-flex align-items-start mb-3 p-2" style="border-bottom:1px solid #eef2f6;">
      <div style="flex:0 0 140px;">
        ${coverHtml}
      </div>
      <div style="flex:1;">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h5 style="margin:0;font-weight:700">${escapeHtml(item.title || '')}</h5>
            <small class="text-light">${escapeHtml(item.category || '')}</small>
          </div>
          <div class="project-actions">
            <button class="btn btn-outline-primary btn-sm me-1" data-action="edit" data-id="${escapeAttr(item._id)}">تعديل</button>
            <button class="btn btn-outline-danger btn-sm" data-action="delete" data-id="${escapeAttr(item._id)}">حذف</button>
          </div>
        </div>

        <p class="mt-2 mb-2 text-light">${escapeHtml(item.desc || '')}</p>

        <div class="d-flex align-items-center">
          ${item.type ? `<span class="badge bg-info text-light me-2" style="margin-left: 5px;">النوع: ${escapeHtml(item.type)}</span>` : ''}
          <div class="d-flex ms-2">
            ${galleryThumbs}
          </div>
        </div>
      </div>
    </div>
    `;
  }).join('');

  // attach handlers
  projectsList.querySelectorAll('button[data-action="edit"]').forEach(btn=>{
    btn.onclick = async (e)=>{
      const id = e.currentTarget.dataset.id;
      try {
        const snap = await getDoc(doc(db, 'projects', id));
        if(snap.exists()) startEdit(snap.data(), snap.id);
        else Swal.fire({ icon:'error', title:'خطأ', text:'المشروع غير موجود' });
      } catch (err) {
        Swal.fire({ icon:'error', title:'خطأ', text: err && err.message ? err.message : String(err) });
      }
    };
  });

  projectsList.querySelectorAll('button[data-action="delete"]').forEach(btn=>{
    btn.onclick = async (e)=>{
      const id = e.currentTarget.dataset.id;
      try {
        const itemSnap = await getDoc(doc(db, 'projects', id));
        const item = itemSnap.exists() ? itemSnap.data() : null;

        const result = await Swal.fire({
          title: 'هل أنت متأكد؟',
          html: `المشروع سيتم حذفه نهائياً من لوحة التحكم.<br><small style="color:#6c757d">ملفات Cloudinary قد تبقى في المكتبة ما لم تُحذف من السيرفر.</small>`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'نعم، احذف',
          cancelButtonText: 'إلغاء',
          reverseButtons: true,
          confirmButtonColor: '#dc3545'
        });

        if(!result.isConfirmed) return;

        await deleteDoc(doc(db, 'projects', id));

        if(item) {
          return 0;
        }

        stopStatusAnimation('تم الحذف.');
        toast('تم حذف المشروع','success');
      } catch (err) {
        stopStatusAnimation('');
        if(statusEl) statusEl.textContent = 'خطأ أثناء الحذف: ' + (err && err.message ? err.message : String(err));
        Swal.fire({ icon:'error', title:'فشل الحذف', text: err && err.message ? err.message : String(err) });
      }
    };
  });
}

// ---------- startEdit ----------
function startEdit(data, id) {
  isEditing = true;
  if(editingIdEl) editingIdEl.value = id;
  formTitle.textContent = 'تعديل المشروع';

  if(titleEl) titleEl.value = data.title || '';
  if(descEl) descEl.value = data.desc || '';
  if(categoryEl) categoryEl.value = data.category || 'Content Creator';
  if(typeEl) typeEl.value = data.type || '';

  // cover
  if(data.coverImage) {
    coverUploadMethod = 'cover_url';
    document.querySelectorAll('.upload-option').forEach(o=> o.classList.toggle('active', o.dataset.option === coverUploadMethod));
    if(document.getElementById('coverUrlSection')) document.getElementById('coverUrlSection').classList.add('active');
    if(document.getElementById('coverFileSection')) document.getElementById('coverFileSection').classList.remove('active');
    if(coverUrlEl) coverUrlEl.value = data.coverImage;
    previewCoverUrl();
    currentCoverPublicId = data.coverPublicId || null;
  } else {
    coverUploadMethod = 'cover_url';
    if(coverUrlEl) coverUrlEl.value = '';
    if(coverFileEl) coverFileEl.value = '';
    if(coverUrlPreviewEl) coverUrlPreviewEl.innerHTML = '';
    if(coverFilePreviewEl) coverFilePreviewEl.innerHTML = '';
    currentCoverPublicId = null;
  }

  // gallery
  if(galleryPreviewEl) galleryPreviewEl.innerHTML = '';
  currentGalleryPublicIds = data.galleryPublicIds || [];
  const galleryUrls = data.gallery || [];
  (galleryUrls || []).forEach(u=>{
    if(galleryPreviewEl) {
      const img = document.createElement('img');
      img.src = u;
      galleryPreviewEl.appendChild(img);
    }
  });

  // hero video
  if(heroUrlEl) {
    if(data.heroVideo) {
      heroUploadMethod = 'hero_url';
      heroUrlEl.value = data.heroVideo;
      previewHeroUrl();
    } else {
      heroUploadMethod = 'hero_url';
      heroUrlEl.value = '';
      if(heroFileEl) heroFileEl.value = '';
      if(heroUrlPreviewEl) heroUrlPreviewEl.innerHTML = '';
      if(heroFilePreviewEl) heroFilePreviewEl.innerHTML = '';
    }
  }

  // gallery videos
  if(galleryVideosUrlsEl) {
    const vids = data.videos || [];
    galleryVideosUrlsEl.value = (vids && vids.length) ? vids.join(', ') : '';
    if(galleryVideosPreviewEl) galleryVideosPreviewEl.innerHTML = '';
    (vids || []).forEach(u=>{
      if(galleryVideosPreviewEl) {
        const v = document.createElement('video');
        v.src = u;
        v.controls = true;
        v.style.maxWidth = '140px';
        v.style.maxHeight = '80px';
        v.style.margin = '4px';
        galleryVideosPreviewEl.appendChild(v);
      }
    });
  }

  if(saveBtn) saveBtn.textContent = 'حفظ التعديلات';
  if(cancelEditBtn) cancelEditBtn.style.display = 'inline-block';
  window.scrollTo({ top:0, behavior:'smooth' });
}

// ---------- stopEdit ----------
function stopEdit() {
  isEditing = false;
  if(editingIdEl) editingIdEl.value = '';
  formTitle.textContent = 'إضافة مشروع جديد';
  if(saveBtn) saveBtn.textContent = 'اضف';
  if(cancelEditBtn) cancelEditBtn.style.display = 'none';
  clearForm();
}

// ---------- clear form ----------
function clearForm() {
  if(titleEl) titleEl.value='';
  if(descEl) descEl.value='';
  if(categoryEl) categoryEl.value='Content Creator';
  if(coverUrlEl) coverUrlEl.value='';
  if(coverFileEl) coverFileEl.value='';
  if(coverUrlPreviewEl) coverUrlPreviewEl.innerHTML='';
  if(coverFilePreviewEl) coverFilePreviewEl.innerHTML='';
  if(galleryFilesEl) galleryFilesEl.value='';
  if(galleryPreviewEl) galleryPreviewEl.innerHTML='';

  // clear videos
  if(heroUrlEl) heroUrlEl.value = '';
  if(heroFileEl) heroFileEl.value = '';
  if(heroUrlPreviewEl) heroUrlPreviewEl.innerHTML = '';
  if(heroFilePreviewEl) heroFilePreviewEl.innerHTML = '';
  if(galleryVideoFilesEl) galleryVideoFilesEl.value = '';
  if(galleryVideosUrlsEl) galleryVideosUrlsEl.value = '';
  if(galleryVideosPreviewEl) galleryVideosPreviewEl.innerHTML = '';

  heroUploadMethod = 'hero_url';
  coverUploadMethod = 'cover_url';
  document.querySelectorAll('.upload-option').forEach(o=> o.classList.toggle('active', o.dataset.option === 'cover_url'));
  if(document.getElementById('coverUrlSection')) document.getElementById('coverUrlSection').classList.add('active');
  if(document.getElementById('coverFileSection')) document.getElementById('coverFileSection').classList.remove('active');

  stopStatusAnimation('');
  currentCoverPublicId = null;
  currentGalleryPublicIds = [];

  // cleanup object URLs
  objectUrls.forEach(u => { try { URL.revokeObjectURL(u); } catch(e) {} });
  objectUrls = [];
}

// ---------- initialize ----------
document.addEventListener('DOMContentLoaded', ()=>{
  setupEventListeners();
});