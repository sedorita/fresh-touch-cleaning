



// Helpers
const $ = (sel) => document.querySelector(sel);

function show(el){
  el.style.display = "block";
  el.setAttribute("aria-hidden", "false");
}
function hide(el){
  el.style.display = "none";
  el.setAttribute("aria-hidden", "true");
}

// Quick Estimate modal
function openModal() {
  const modal = $("#estimateModal");
  show(modal);
  recalcEstimate();
}
function closeModal() {
  const modal = $("#estimateModal");
  hide(modal);
}

// Estimate logic (simple ranges, customize as you like)
function getEstimateRange(type, size) {
  const base = {
    kitchen:   { small:[12000,22000], medium:[22000,45000], large:[45000,90000] },
    bathroom:  { small:[8000,14000],  medium:[14000,28000], large:[28000,55000] },
    basement:  { small:[18000,30000], medium:[30000,60000], large:[60000,110000] },
    flooring:  { small:[2500,6000],   medium:[6000,14000],  large:[14000,30000] },
    painting:  { small:[1200,3000],   medium:[3000,7000],   large:[7000,15000] },
  };
  return base[type]?.[size] || [0,0];
}

function formatMoney(n) {
  return "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function recalcEstimate() {
  const type = $("#projectType").value;
  const size = $("#projectSize").value;
  const [min, max] = getEstimateRange(type, size);
  $("#estimateResult").innerHTML = `Estimated range: <strong>${formatMoney(min)} – ${formatMoney(max)}</strong>`;
}

// Chat widget
function openChat() {
  const widget = $("#chatWidget");
  show(widget);
  $("#chatFab").setAttribute("aria-expanded", "true");
}
function closeChat() {
  const widget = $("#chatWidget");
  hide(widget);
  $("#chatFab").setAttribute("aria-expanded", "false");
}

// Mobile menu
function toggleMobileMenu(forceOpen = null) {
  const menu = $("#mobileMenu");
  const btn = $("#hamburger");
  const isOpen = menu.style.display === "block";
  const next = forceOpen === null ? !isOpen : forceOpen;

  menu.style.display = next ? "block" : "none";
  menu.setAttribute("aria-hidden", next ? "false" : "true");
  btn.setAttribute("aria-expanded", next ? "true" : "false");
}

// Login onclick only (no API)
function handleLoginClick() {
  alert("Login clicked (placeholder). Hook this to your real auth later.");
}



/* =========================
   SERVICES: Hybrid tabs + lists
   ========================= */



function slugToCategoryFromPath(pathname) {
  // Maps your SEO pages to the same category names used in data-category-list
  // Adjust if you rename your service page URLs.
  const p = (pathname || "").toLowerCase();
  if (p.includes("deep-cleaning")) return "deep";
  if (p.includes("detailed-cleaning")) return "detailed";
  if (p.includes("move-in-cleaning")) return "move-in";
  if (p.includes("move-out-cleaning")) return "move-out";
  if (p.includes("post-construction")) return "post";
  if (p.includes("carpet-upholstery")) return "carpet";
  if (p.includes("general-cleaning")) return "general";
  return null;
}

async function loadServicesData() {
  const res = await fetch("/content/services.json");
  if (!res.ok) throw new Error("Failed to load services data");
  return res.json();
}

function initServices() {
  const tabsNav = document.querySelector(".service-tabs");
  if (!tabsNav) return;

  const tabs = Array.from(document.querySelectorAll(".service-tab"));
  const cards = Array.from(document.querySelectorAll(".area-card"));
  const selectedOut = document.getElementById("selectedServices");

  let activeCategory = "general";
  const selected = new Set();

    function setActiveCategory(category, {pushUrl = false, url = ""} = {}) {
      activeCategory = category;

      // tabs UI
      tabs.forEach(a => {
        const on = a.dataset.category === category;
        a.classList.toggle("is-active", on);
        if (on) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });

      // show matching UL inside each card
      cards.forEach(card => {
        const lists = card.querySelectorAll("[data-category-list]");
        lists.forEach(list => {
          list.classList.toggle("is-hidden", list.dataset.categoryList !== category);
        });

        // if preview showing, hide it on category switch
        card.classList.remove("is-preview-on");
        const v = card.querySelector(".card-preview__video");
        if (v) { v.pause(); v.removeAttribute("src"); v.load(); }
      });

      // update optional intro
      const intro = document.getElementById("serviceIntro");
      if (intro) {
        const map = {
          "general": "General cleaning for weekly / biweekly upkeep.",
          "deep": "Deep cleaning for buildup, corners, and a full reset.",
          "detailed": "Detailed cleaning for vents, tracks, edges, and precision.",
          "move-in": "Move-in cleaning to freshen up before you settle in.",
          "move-out": "Move-out cleaning for inspection and handover.",
          "post": "Post-construction cleaning for dust control and finishing.",
          "carpet": "Carpet & upholstery refresh add-ons (as available)."
        };
        intro.textContent = map[category] || intro.textContent;
      }

      // Update URL without reload (hybrid)
      if (pushUrl && url) {
        history.pushState({ category }, "", url);
      }
    }

    function updateSummary() {
      selectedOut.textContent = selected.size ? Array.from(selected).join(", ") : "None";
    }

    // Hybrid tab clicks: intercept navigation for instant switching
    tabsNav.addEventListener("click", (e) => {
      const tab = e.target.closest(".service-tab");
      if (!tab) return;

      e.preventDefault(); // keep user on the same page
      const category = tab.dataset.category;
      const url = tab.getAttribute("href");

      setActiveCategory(category, { pushUrl: true, url });
    });

    // Selection toggles (event delegation)
    document.addEventListener("click", (e) => {
      const pick = e.target.closest(".pick");
      if (!pick) return;

      const key = pick.dataset.pick || pick.textContent.trim();

      if (selected.has(key)) {
        selected.delete(key);
        pick.classList.remove("is-selected");
      } else {
        selected.add(key);
        pick.classList.add("is-selected");
      }
      updateSummary();
    });

    // In-card preview (MP4)
    // NOTE: MP4 is recommended over GIF (smaller + smoother).

  document.addEventListener("pointerover", (e) => {
    if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;

    const pick = e.target.closest(".pick");
    if (!pick) return;

    showPreviewForPick(pick);
  });

  document.addEventListener("pointerout", (e) => {
    if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;

    const pick = e.target.closest(".pick");
    if (!pick) return;

    // if pointer is moving into the same pick, ignore
    if (pick.contains(e.relatedTarget)) return;

    hideSharedPreview();
  });

  function showPreviewForPick(pick) {
    const enabled = pick.dataset.previewEnabled === "true";
    const type = pick.dataset.previewType || "none";

    if (!enabled || type === "none") {
      hideSharedPreview();
      return;
    }

    const preview = document.querySelector("#servicesPreview");
    const media = document.querySelector("#servicesPreviewMedia");
    if (!preview || !media) return;

    const pickRect = pick.getBoundingClientRect();

    preview.style.display = "block";
    preview.setAttribute("aria-hidden", "false");
    preview.style.pointerEvents = "none";

    media.innerHTML = "";

    if (type === "video") {
      const videoSrc = pick.dataset.previewVideo;
      if (!videoSrc) {
        hideSharedPreview();
        return;
      }

      const video = document.createElement("video");
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "none";
      video.src = videoSrc;
      media.appendChild(video);
      video.play().catch(() => {});
    }

    if (type === "beforeAfter") {
      const before = pick.dataset.previewBefore;
      const after = pick.dataset.previewAfter;

      if (!before || !after) {
        hideSharedPreview();
        return;
      }

      media.innerHTML = `
        <div class="services-preview__compare">
          <div class="services-preview__pane">
            <span class="services-preview__badge">Before</span>
            <img src="${before}" alt="Before preview">
          </div>
          <div class="services-preview__pane">
            <span class="services-preview__badge">After</span>
            <img src="${after}" alt="After preview">
          </div>
        </div>
      `;
    }

    const gap = 12;
    const pad = 12;
    const previewWidth = preview.offsetWidth || 280;
    const previewHeight = preview.offsetHeight || 200;

    let left = pickRect.left;
    let top = pickRect.bottom + gap;

    if (left + previewWidth > window.innerWidth - pad) {
      left = window.innerWidth - previewWidth - pad;
    }

    if (left < pad) left = pad;

    if (top + previewHeight > window.innerHeight - pad) {
      top = pickRect.top - previewHeight - gap;
    }

    if (top < pad) top = pad;

    preview.style.left = `${left}px`;
    preview.style.top = `${top}px`;
  }

  function hideSharedPreview() {
    const preview = document.querySelector("#servicesPreview");
    const media = document.querySelector("#servicesPreviewMedia");
    if (!preview || !media) return;

    const video = media.querySelector("video");
    if (video) {
      video.pause();
      video.currentTime = 0;
    }

    media.innerHTML = "";
    preview.style.display = "none";
    preview.setAttribute("aria-hidden", "true");
  }


  // Back/Forward navigation support
  window.addEventListener("popstate", (e) => {
    const cat = e.state?.category || slugToCategoryFromPath(location.pathname) || "general";
    setActiveCategory(cat, { pushUrl: false });
  });

  // Initialize category based on current URL path (if user lands on /services/deep-cleaning.html etc)
  const initial = slugToCategoryFromPath(location.pathname) || "general";
  setActiveCategory(initial, { pushUrl: false });
  updateSummary();
}


function renderServiceAreas(data) {
  const areaGrid = document.getElementById("areaGrid");
  if (!areaGrid) return;

  areaGrid.innerHTML = data.areas.map(area => {
    const categoryLists = Object.entries(area.categories).map(([category, items], index) => {
      const hiddenClass = index === 0 ? "" : " is-hidden";

      const listItems = items.map(item => {
        const preview = item.preview || {};
        const previewEnabled = preview.enabled === true;
        const previewType = preview.type || "none";
        const previewVideo = preview.videoMp4 || "";
        const previewBefore = preview.beforeImage || "";
        const previewAfter = preview.afterImage || "";

        return `
          <li>
            <button
              class="pick"
              type="button"
              data-pick="${item.pick}"
              data-preview-enabled="${previewEnabled}"
              data-preview-type="${previewType}"
              data-preview-video="${previewVideo}"
              data-preview-before="${previewBefore}"
              data-preview-after="${previewAfter}">
              <span class="dot" aria-hidden="true"></span>
              <span class="pick__text">${item.text}</span>
            </button>
          </li>
        `;
      }).join("");

      return `
        <ul class="pick-list${hiddenClass}" data-category-list="${category}">
          ${listItems}
        </ul>
      `;
    }).join("");

    const notes = (area.notes || []).map(note => `<p class="note">${note}</p>`).join("");

    return `
      <article class="area-card" data-area="${area.id}">
        <div class="area-card__media" aria-hidden="true">
          <img src="${area.image}" alt="" />
        </div>

        <div class="area-card__body">
          <header class="area-card__header">
            <h3 class="area-card__title">${area.title}</h3>
            <p class="area-card__subtitle muted">${area.subtitle}</p>
          </header>

          ${categoryLists}

          <div class="card-notes">
            ${notes}
          </div>
        </div>
      </article>
    `;
  }).join("");
}

/* =========================
   Main wiring
   ========================= */

document.addEventListener("DOMContentLoaded", async () => {
  // Estimate
  $("#estimateBtn")?.addEventListener("click", openModal);
  $("#estimateClose")?.addEventListener("click", closeModal);
  $("#estimateRecalc")?.addEventListener("click", recalcEstimate);
  $("#projectType")?.addEventListener("change", recalcEstimate);
  $("#projectSize")?.addEventListener("change", recalcEstimate);

  // Close modal by clicking backdrop
  $("#estimateModal")?.addEventListener("click", (e) => {
    if (e.target?.dataset?.close === "true") closeModal();
  });

  // Mobile estimate button
  $("#estimateBtnMobile")?.addEventListener("click", () => {
    toggleMobileMenu(false);
    openModal();
  });

  // Login buttons
  $("#loginBtn")?.addEventListener("click", handleLoginClick);
  $("#loginBtnMobile")?.addEventListener("click", () => {
    toggleMobileMenu(false);
    handleLoginClick();
  });

  // Mobile menu
  $("#hamburger")?.addEventListener("click", () => toggleMobileMenu());

  // Close mobile menu when clicking a link inside it
  $("#mobileMenu")?.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;
    toggleMobileMenu(false);
  });

  // Chat
  $("#chatFab")?.addEventListener("click", () => {
    const shown = $("#chatWidget")?.style.display === "block";
    shown ? closeChat() : openChat();
  });
  $("#chatClose")?.addEventListener("click", closeChat);

  // Chat send
  $("#chatForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#chatInput");
    const text = (input?.value || "").trim();
    if (!text) return;

    const body = $("#chatBody");
    const mine = document.createElement("div");
    mine.className = "chat-bubble chat-bubble--me";
    mine.textContent = text;
    body.appendChild(mine);

    const reply = document.createElement("div");
    reply.className = "chat-bubble chat-bubble--them";
    reply.textContent = "Thanks — we’ll respond soon. If you want faster, tap “Call Candy” above.";
    body.appendChild(reply);

    input.value = "";
    body.scrollTop = body.scrollHeight;
  });

  // Esc key closes modal/chat/mobile menu
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      closeChat();
      toggleMobileMenu(false);
    }
  });

   // Services (tabs + pick toggle + preview)
  try{
    const servicesData = await loadServicesData();
    console.log(servicesData)
    renderServiceAreas(servicesData)
    initServices();
  }catch(err){
    console.error(err)
  }
 

});


// Recent Work 
// Recent Work: filters
(function initRecentWork(){
  const chips = document.querySelectorAll("[data-work-filter]");
  const cards = document.querySelectorAll(".work-card");
  if (!chips.length || !cards.length) return;

  let active = "all";

  function render(){
    chips.forEach(btn => {
      const on = btn.dataset.workFilter === active;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });

    cards.forEach(card => {
      const tag = card.dataset.workTag;
      const show = (active === "all") || (tag === active);
      card.style.display = show ? "" : "none";
    });
  }

  chips.forEach(btn => {
    btn.addEventListener("click", () => {
      active = btn.dataset.workFilter;
      render();
    });
  });

  render();
})();

// Optional Lightbox
(function initLightbox(){
  const box = document.querySelector("#lightbox");
  const img = document.querySelector("#lightboxImg");
  const closeBtn = document.querySelector("#lightboxClose");
  if (!box || !img) return;

  document.addEventListener("click", (e) => {
    const card = e.target.closest(".work-card");
    if (!card) return;

    // open the "After" image by default (2nd img)
    const imgs = card.querySelectorAll("img");
    const chosen = imgs[1] || imgs[0];
    if (!chosen) return;

    img.src = chosen.src;
    img.alt = chosen.alt || "Work preview";
    box.style.display = "block";
    box.setAttribute("aria-hidden", "false");
  });

  function close(){
    box.style.display = "none";
    box.setAttribute("aria-hidden", "true");
    img.src = "";
  }

  closeBtn?.addEventListener("click", close);
  box.addEventListener("click", (e) => {
    if (e.target?.dataset?.close === "true") close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
})();

// About 
//open Modal 
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector("#aboutEstimateBtn");
  if (btn && typeof openModal === "function") btn.addEventListener("click", openModal);
});
// Contact 
(function initContact(){
  const form = document.querySelector("#contactForm");
  const status = document.querySelector("#contactStatus");
  const prefInput = document.querySelector("#preferredInput");
  const chips = document.querySelectorAll('#contactForm [data-pref]');
  if (!form || !status || !prefInput || !chips.length) return;

  let pref = "text";

  function renderChips(){
    chips.forEach(btn => {
      const on = btn.dataset.pref === pref;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    prefInput.value = pref;
  }

  chips.forEach(btn => {
    btn.addEventListener("click", () => {
      pref = btn.dataset.pref;
      renderChips();
    });
  });

  form.addEventListener("submit", (e) => {

    const fd = new FormData(form);
    const name = (fd.get("name") || "").toString().trim();
    const email = (fd.get("email") || "").toString().trim();
    const phone = (fd.get("phone") || "").toString().trim();

    // Minimal validation
    if (!name) {
      status.textContent = "Please add your name.";
      return;
    }
    if (!email && !phone) {
      status.textContent = "Please add either an email or a phone number so we can reply.";
      return;
    }

    // Simulated “sent”
    status.textContent = `Thanks, ${name}! Message saved (demo). Preferred reply: ${pref}.`;
    form.querySelector("#contactSubmit").textContent = "Sent ✓";

    // Optional: reset button text after a bit
    setTimeout(() => {
      const btn = form.querySelector("#contactSubmit");
      if (btn) btn.textContent = "Send message";
    }, 2000);
  });

  renderChips();
})();

// // Helpers
// const $ = (sel) => document.querySelector(sel);

// function openModal() {
//   const modal = $("#estimateModal");
//   modal.style.display = "block";
//   modal.setAttribute("aria-hidden", "false");
//   recalcEstimate();
// }

// function closeModal() {
//   const modal = $("#estimateModal");
//   modal.style.display = "none";
//   modal.setAttribute("aria-hidden", "true");
// }

// // Estimate logic (simple ranges, customize as you like)
// function getEstimateRange(type, size) {
//   const base = {
//     kitchen:   { small:[12000,22000], medium:[22000,45000], large:[45000,90000] },
//     bathroom:  { small:[8000,14000],  medium:[14000,28000], large:[28000,55000] },
//     basement:  { small:[18000,30000], medium:[30000,60000], large:[60000,110000] },
//     flooring:  { small:[2500,6000],   medium:[6000,14000],  large:[14000,30000] },
//     painting:  { small:[1200,3000],   medium:[3000,7000],   large:[7000,15000] },
//   };

//   const pick = base[type]?.[size] || [0, 0];
//   return pick;
// }

// function formatMoney(n) {
//   // whole dollars formatting
//   return "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
// }

// function recalcEstimate() {
//   const type = $("#projectType").value;
//   const size = $("#projectSize").value;
//   const [min, max] = getEstimateRange(type, size);
//   $("#estimateResult").innerHTML = `Estimated range: <strong>${formatMoney(min)} – ${formatMoney(max)}</strong>`;
// }

// // Chat widget
// function openChat() {
//   $("#chatWidget").style.display = "block";
//   $("#chatWidget").setAttribute("aria-hidden", "false");
//   $("#chatFab").setAttribute("aria-expanded", "true");
// }
// function closeChat() {
//   $("#chatWidget").style.display = "none";
//   $("#chatWidget").setAttribute("aria-hidden", "true");
//   $("#chatFab").setAttribute("aria-expanded", "false");
// }

// // Mobile menu
// function toggleMobileMenu() {
//   const menu = $("#mobileMenu");
//   const btn = $("#hamburger");
//   const isOpen = menu.style.display === "block";
//   menu.style.display = isOpen ? "none" : "block";
//   menu.setAttribute("aria-hidden", isOpen ? "true" : "false");
//   btn.setAttribute("aria-expanded", isOpen ? "false" : "true");
// }

// // Login onclick only (no API)
// function handleLoginClick() {
//   alert("Login clicked (placeholder). Hook this to your real auth later.");
// }

// // Wire up events
// document.addEventListener("DOMContentLoaded", () => {
//   // Estimate
//   $("#estimateBtn").addEventListener("click", openModal);
//   $("#estimateClose").addEventListener("click", closeModal);
//   $("#estimateRecalc").addEventListener("click", recalcEstimate);
//   $("#projectType").addEventListener("change", recalcEstimate);
//   $("#projectSize").addEventListener("change", recalcEstimate);

//   // Close modal by clicking backdrop
//   $("#estimateModal").addEventListener("click", (e) => {
//     if (e.target?.dataset?.close === "true") closeModal();
//   });

//   // Mobile estimate button
//   $("#estimateBtnMobile").addEventListener("click", () => {
//     $("#mobileMenu").style.display = "none";
//     $("#mobileMenu").setAttribute("aria-hidden", "true");
//     $("#hamburger").setAttribute("aria-expanded", "false");
//     openModal();
//   });

//   // Login buttons
//   $("#loginBtn").addEventListener("click", handleLoginClick);
//   $("#loginBtnMobile").addEventListener("click", () => {
//     $("#mobileMenu").style.display = "none";
//     handleLoginClick();
//   });

//   // Mobile menu
//   $("#hamburger").addEventListener("click", toggleMobileMenu);

//   // Chat
//   $("#chatFab").addEventListener("click", () => {
//     const shown = $("#chatWidget").style.display === "block";
//     shown ? closeChat() : openChat();
//   });
//   $("#chatClose").addEventListener("click", closeChat);

//   // Chat send
//   $("#chatForm").addEventListener("submit", (e) => {
//     e.preventDefault();
//     const input = $("#chatInput");
//     const text = input.value.trim();
//     if (!text) return;

//     const body = $("#chatBody");
//     const mine = document.createElement("div");
//     mine.className = "chat-bubble chat-bubble--me";
//     mine.textContent = text;
//     body.appendChild(mine);

//     // Basic auto-reply placeholder
//     const reply = document.createElement("div");
//     reply.className = "chat-bubble chat-bubble--them";
//     reply.textContent = "Thanks — we’ll respond soon. If you want faster, tap “Call Candy” above.";
//     body.appendChild(reply);

//     input.value = "";
//     body.scrollTop = body.scrollHeight;
//   });

//   // Esc key closes modal/chat
//   document.addEventListener("keydown", (e) => {
//     if (e.key === "Escape") {
//       closeModal();
//       closeChat();
//       $("#mobileMenu").style.display = "none";
//       $("#hamburger").setAttribute("aria-expanded", "false");
//     }
//   });
// });
