document.addEventListener("DOMContentLoaded", function () {

  // ----------------------------------------
  // 1) Dictionnaire de correspondance logique
  // ----------------------------------------
  // Une "page logique" (home, contact, etc.) a 3 versions (fr, en, sn)
  const logicalPages = {
    home: {
      fr: "index",
      en: "index",
      sn: "index"
    },
    contact: {
      fr: "contact",
      en: "contact",
      sn: "contact"
    },
    enquete: {
      fr: "recherche",
      en: "research",
      sn: "recherche"
    },
    donnees: {
      fr: "donnees",
      en: "data",
      sn: "donnees"
    },
    about: {
      fr: "about",
      en: "about",
      sn: "about"
    },
    biblio: {
      fr: "bibliographie",
      en: "bibliography",
      sn: "dencukaay"
    }
  };

  // Pour passer de (langue, slug) → page logique
  const reverseMap = {
    fr: {
      index: "home",
      contact: "contact",
      recherche: "enquete",
      donnees: "donnees",
      about: "about",
      bibliographie: "biblio"
    },
    en: {
      index: "home",
      contact: "contact",
      research: "enquete",
      data: "donnees",
      about: "about",
      bibliography: "biblio"
    },
    sn: {
      index: "home",
      contact: "contact",
      recherche: "enquete",
      donnees: "donnees",
      about: "about",
      dencukaay: "biblio"
    }
  };

  // ----------------------------------------
  // 2) Détecter la page courante
  // ----------------------------------------
  function getCurrentPage() {
    const url = new URL(window.location.href);
    const parts = url.pathname.split("/").filter(Boolean); 
    // ex: ["fr"] ou ["fr","contact.html"] ou ["GTDID_website","fr","contact.html"]

    const langs = ["fr", "en", "sn"];
    const langIndex = parts.findIndex(p => langs.includes(p));
    if (langIndex === -1) return null;

    const currentLang = parts[langIndex];

    let slug = "index";
    if (langIndex < parts.length - 1) {
      let file = parts[langIndex + 1];
      slug = file.replace(".html", "").replace(".qmd", "");
    }

    const baseParts = parts.slice(0, langIndex); // ex: ["GTDID_website"] ou []

    return { currentLang, slug, baseParts };
  }

  // ----------------------------------------
  // 3) Langue active (stockée ou déduite de l'URL)
  // ----------------------------------------
  let lang;

  const stored = localStorage.getItem("site-lang");
  const info0 = getCurrentPage();

  if (stored) {
    lang = stored;
  } else if (info0) {
    lang = info0.currentLang;
  } else {
    lang = "fr";
  }
  localStorage.setItem("site-lang", lang);

  // ----------------------------------------
  // 4) Taguer les liens du menu avec lang-fr / lang-en / lang-sn
  // ----------------------------------------
  function tagNavbarLinks() {
    const links = document.querySelectorAll("nav .navbar-nav .nav-link");

    links.forEach(link => {
      const href = link.getAttribute("href") || "";

      // Ne pas taguer le bouton de menu langue
      if (link.classList.contains("dropdown-toggle")) return;
      if (!href) return;

      // on enlève d'abord d'anciennes classes
      link.classList.remove("lang-fr", "lang-en", "lang-sn");

      if (href.includes("/fr/")) link.classList.add("lang-fr");
      if (href.includes("/en/")) link.classList.add("lang-en");
      if (href.includes("/sn/")) link.classList.add("lang-sn");
    });
  }

  // ----------------------------------------
  // 5) Afficher / cacher les onglets selon la langue active
  // ----------------------------------------
  function updateNavbar() {
    const links = document.querySelectorAll("nav .navbar-nav .nav-link");

    links.forEach(link => {
      const li = link.closest("li.nav-item");
      if (!li) return;

      // Toujours laisser visible le menu "Langue"
      if (link.classList.contains("dropdown-toggle")) {
        li.style.display = "block";
        return;
      }

      if (link.classList.contains("lang-fr")) {
        li.style.display = (lang === "fr") ? "block" : "none";
      } else if (link.classList.contains("lang-en")) {
        li.style.display = (lang === "en") ? "block" : "none";
      } else if (link.classList.contains("lang-sn")) {
        li.style.display = (lang === "sn") ? "block" : "none";
      } else {
        // Liens sans langue (ex: brand, etc.) → on les laisse tranquilles
        li.style.display = "";
      }
    });

    // S'assurer que le menu langue est visible
    const langToggle = document.getElementById("nav-menu-langue--language");
    if (langToggle) {
      const li = langToggle.closest("li.nav-item");
      if (li) li.style.display = "block";
    }
  }

  // ----------------------------------------
  // 6) Rediriger vers la version équivalente dans une autre langue
  // ----------------------------------------
  function redirectTo(langTarget) {
    const info = getCurrentPage();
    if (!info) return;

    const { currentLang, slug, baseParts } = info;

    const rev = reverseMap[currentLang] || {};
    const logical = rev[slug] || "home"; // si inconnu → home

    const targetMap = logicalPages[logical] || logicalPages["home"];
    const newSlug = targetMap[langTarget] || "index";

    const newParts = [...baseParts, langTarget];

    if (newSlug !== "index") {
      newParts.push(newSlug + ".html");
    }

    const url = new URL(window.location.href);
    url.pathname = "/" + newParts.join("/");

    // éviter boucle infinie
    if (url.pathname !== window.location.pathname) {
      window.location.href = url.toString();
    }
  }

  // ----------------------------------------
  // 7) Initialisation
  // ----------------------------------------
  tagNavbarLinks();
  updateNavbar();

  // ----------------------------------------
  // 8) Clic sur une langue dans le menu
  // ----------------------------------------
  document.querySelectorAll(".dropdown-item").forEach(item => {
    item.addEventListener("click", function (e) {
      e.preventDefault();

      const t = item.textContent.toLowerCase();

      if (t.includes("français")) lang = "fr";
      if (t.includes("english"))  lang = "en";
      if (t.includes("wolof"))    lang = "sn";

      localStorage.setItem("site-lang", lang);

      updateNavbar();
      redirectTo(lang);
    });
  });

});
