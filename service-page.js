async function loadServicesData() {
  const res = await fetch("/content/services.json");
  if (!res.ok) throw new Error("Failed to load services data");
  return res.json();
}

function getServiceSlug() {
  return document.body.dataset.serviceSlug || "general";
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value || "";
}

function setMeta(name, content) {
  const el = document.querySelector(`meta[name="${name}"]`);
  if (!el) return;
  el.setAttribute("content", content || "");
}

function renderServicePageAreas(areas = [], slug) {
  const areaGrid = document.getElementById("serviceAreaGrid");
  if (!areaGrid) return;

  const matchingAreas = areas
    .map((area) => {
      const items = area.categories?.[slug] || [];
      if (!items.length) return null;

      return {
        id: area.id,
        title: area.title,
        subtitle: area.subtitle,
        image: area.image,
        notes: area.notes || [],
        items
      };
    })
    .filter(Boolean);

  areaGrid.innerHTML = matchingAreas.map((area) => {
    const listItems = area.items.map((item) => {
      return `<li>${item.text}</li>`;
    }).join("");

    const notes = area.notes.map((note) => {
      return `<p class="note">${note}</p>`;
    }).join("");

    return `
      <article class="area-card" data-area="${area.id}">
        <div class="area-card__media" aria-hidden="true">
          <img src="${area.image}" alt="" />
        </div>

        <div class="area-card__body">
          <header class="area-card__header">
            <h2 class="area-card__title">${area.title}</h2>
            <p class="area-card__subtitle muted">${area.subtitle}</p>
          </header>

          <ul class="pick-list">
            ${listItems}
          </ul>

          <div class="card-notes">
            ${notes}
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderServiceMeta(pageMeta = {}) {
  setText("serviceTitle", pageMeta.title);
  setText("serviceIntro", pageMeta.intro);
  setText("serviceDescription", pageMeta.description);
  setText("ctaTitle", pageMeta.ctaTitle);
  setText("ctaText", pageMeta.ctaText);

  if (pageMeta.metaTitle) {
    document.title = pageMeta.metaTitle;
  }

  if (pageMeta.metaDescription) {
    setMeta("description", pageMeta.metaDescription);
  }

  const heroImg = document.getElementById("serviceHeroImage");
  if (heroImg) {
    heroImg.src = pageMeta.heroImage || "";
    heroImg.alt = pageMeta.heroImageAlt || "";
  }
}

async function initServicePage() {
  try {
    const data = await loadServicesData();
    const slug = getServiceSlug();

    const pageMeta = data.servicePages?.[slug];
    if (!pageMeta) {
      throw new Error(`No servicePages entry found for slug: ${slug}`);
    }

    renderServiceMeta(pageMeta);
    renderServicePageAreas(data.areas, slug);
  } catch (err) {
    console.error(err);

    const areaGrid = document.getElementById("serviceAreaGrid");
    if (areaGrid) {
      areaGrid.innerHTML = `
        <article class="area-card">
          <div class="area-card__body">
            <h2>Service content unavailable</h2>
            <p class="muted">We could not load this service page right now.</p>
          </div>
        </article>
      `;
    }
  }
}

document.addEventListener("DOMContentLoaded", initServicePage);