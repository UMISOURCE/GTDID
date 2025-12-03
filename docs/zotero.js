// ---------------------------------------------
//  CONFIGURATION ZOTERO
// ---------------------------------------------
const ZOTERO_API_KEY = "VIN81ZyvTXKLXwDbIsnTtqHs";   // ta clé API
const GROUP_ID = 6308048;

// ⚠️ URL DE BASE : /items (PAS /top), c'est celle qui contient tout
const API_URL = `https://api.zotero.org/groups/${GROUP_ID}/items?format=json&limit=100&include=data`;

let BIB_ENTRIES = []; // Stocke toutes les références formatées

// ---------------------------------------------
//  TRADUCTIONS MULTILINGUES ("Résumé")
// ---------------------------------------------
const SUMMARY_LABEL = {
  fr: "Résumé",
  en: "Abstract",
  sn: "Tëral"
};

function getCurrentLang() {
  return localStorage.getItem("site-lang") || "fr";
}

// ---------------------------------------------
//  SURBRILLANCE DU MOT RECHERCHÉ
// ---------------------------------------------
function highlight(text, search) {
  if (!text) return "";
  if (!search || search.trim() === "") return text;

  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}

// ---------------------------------------------
//  PAGINATION : CHARGER TOUTES LES PAGES ZOTERO
// ---------------------------------------------
async function fetchAllItems(url) {
  let results = [];
  let nextUrl = url;

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: { "Zotero-API-Key": ZOTERO_API_KEY }
    });

    if (!response.ok) {
      console.error("Erreur Zotero sur", nextUrl, response.status);
      break;
    }

    const page = await response.json();
    results = results.concat(page);

    // Vérifier la présence d'une page suivante via Link: <...>; rel="next"
    const linkHeader = response.headers.get("Link");
    const nextMatch = linkHeader && linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    nextUrl = nextMatch ? nextMatch[1] : null;
  }

  return results;
}

// ---------------------------------------------
//  CHARGEMENT COMPLET DE LA BIBLIOTHÈQUE
// ---------------------------------------------
async function loadZoteroLibrary() {
  const list = document.getElementById("biblio-list");
  list.innerHTML = "<p>Chargement des références Zotero…</p>";

  try {
    const data = await fetchAllItems(API_URL);

    // 🔥 Filtrer uniquement les VRAIS parasites :
    //    - attachments (PDF, fichiers)
    //    - notes Zotero
    const cleanData = data.filter(item => {
      const d = item.data || {};
      if (!d.itemType) return false;           // sécurité
      if (d.itemType === "attachment") return false;
      if (d.itemType === "note") return false;
      return true;
    });

    // Formatage
    BIB_ENTRIES = cleanData.map(formatEntry);

    // Tri par année décroissante
    BIB_ENTRIES.sort((a, b) => (b.year || 0) - (a.year || 0));

    applyFilters(); // affichage initial

  } catch (error) {
    console.error("Erreur Zotero :", error);
    list.innerHTML = "<p>Impossible de charger la bibliographie.</p>";
  }
}

// ---------------------------------------------
//  FORMATAGE D'UNE RÉFÉRENCE
// ---------------------------------------------
function formatEntry(item) {
  const d = item.data || {};

  const title = d.title || "Sans titre";
  const creators = Array.isArray(d.creators) ? d.creators : [];

  const authors = creators
    .map(a => `${a.firstName || ""} ${a.lastName || ""}`.trim())
    .filter(s => s.length > 0)
    .join(", ");

  const year = d.date ? d.date.substring(0, 4) : "—";
  const type = d.itemType || "other";
  const doi = d.DOI ? `https://doi.org/${d.DOI}` : null;
  const url = d.url || null;
  const abstract = d.abstractNote || "";

  return { title, authors, year, type, doi, url, abstract };
}

// ---------------------------------------------
//  AFFICHAGE : GROUPÉ PAR ANNÉE + SURBRILLANCE
// ---------------------------------------------
function renderList(entries) {
  const list = document.getElementById("biblio-list");
  const searchValue = (document.getElementById("biblio-search")?.value || "").toLowerCase();
  const lang = getCurrentLang();

  list.innerHTML = "";

  if (!entries || entries.length === 0) {
    list.innerHTML = "<p>Aucune référence ne correspond à votre recherche.</p>";
    return;
  }

  // Groupement par année
  const groups = {};
  entries.forEach(e => {
    const y = e.year || "Sans année";
    if (!groups[y]) groups[y] = [];
    groups[y].push(e);
  });

  const sortedYears = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  sortedYears.forEach(year => {
    const block = document.createElement("div");
    block.className = "year-block";
    block.innerHTML = `<h2 class="year-title">📅 ${year}</h2>`;

    groups[year].forEach(e => {
      const card = document.createElement("div");
      card.className = "biblio-card";

      const titleHTML = highlight(e.title, searchValue);
      const authorsHTML = highlight(e.authors, searchValue);
      const abstractHTML = highlight(e.abstract, searchValue);

      card.innerHTML = `
        <h3 class="biblio-title">${titleHTML}</h3>

        <div class="biblio-meta">
          <strong>${authorsHTML}</strong>
        </div>

        <div class="biblio-links">
          ${e.doi ? `<a href="${e.doi}" target="_blank">DOI</a>` : ""}
          ${!e.doi && e.url ? `<a href="${e.url}" target="_blank">Lien</a>` : ""}
        </div>

        ${e.abstract ? `
          <details class="abstract-section">
            <summary>${SUMMARY_LABEL[lang]}</summary>
            <p>${abstractHTML}</p>
          </details>
        ` : ""}
      `;

      block.appendChild(card);
    });

    list.appendChild(block);
  });
}

// ---------------------------------------------
//  RECHERCHE + FILTRES
// ---------------------------------------------
function applyFilters() {
  const searchInput = document.getElementById("biblio-search");
  const searchValue = (searchInput?.value || "").toLowerCase();

  const active = document.querySelector(".filter-btn.active");
  const filterType = active ? active.dataset.type : "all";

  let filtered = BIB_ENTRIES.slice(); // copie

  // 🔎 Recherche globale (titre + auteurs + résumé)
  if (searchValue.trim() !== "") {
    filtered = filtered.filter(e => {
      const haystack =
        (e.title || "").toLowerCase() +
        (e.authors || "").toLowerCase() +
        (e.abstract || "").toLowerCase();

      return haystack.includes(searchValue);
    });
  }

  // 🧭 Filtre typologique (journalArticle, book, report, thesis, etc.)
  if (filterType !== "all") {
    filtered = filtered.filter(e => e.type === filterType);
  }

  renderList(filtered);
}

// ---------------------------------------------
//  INSTALLATION DES ÉVÉNEMENTS
// ---------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  // Charger la bibliothèque Zotero
  loadZoteroLibrary();

  // Recherche
  const search = document.getElementById("biblio-search");
  if (search) {
    search.addEventListener("input", applyFilters);
  }

  // Filtres typologiques
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      applyFilters();
    });
  });
});
