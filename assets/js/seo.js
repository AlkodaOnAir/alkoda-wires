(function () {
  "use strict";

  const PAGE_SEO = {
    "index.html": {
      en: ["Wires | AV Signal Flow Diagram Software", "Wires is AV signal flow diagram software for clear AV wiring diagrams and audiovisual system documentation with real devices, routes and exports.", "Create readable AV wiring diagrams and audiovisual system documentation with real devices, animated signal routes and offline exports."],
      fr: ["Wires | Logiciel de flux de signal AV", "Wires est un logiciel de flux de signal AV pour créer un schéma clair avec un logiciel de schéma de câblage audiovisuel et produire une documentation d'installation audiovisuelle.", "Créez des schémas lisibles et une documentation d'installation audiovisuelle avec des appareils réels, des routes animées et des exports hors ligne."],
      es: ["Wires | Software de flujo de señales AV", "Wires es un software de flujo de señales AV para crear planos claros con software de diagramas de cableado audiovisual y documentación de sistemas audiovisuales.", "Crea diagramas claros y documentación de sistemas audiovisuales con equipos reales, rutas animadas y exportaciones sin conexión."]
    },
    "fonctions.html": {
      en: ["Wires Features | AV Wiring Diagram Software", "Explore AV wiring diagram software features for real equipment, animated signal paths, cable types, zones, filters and audiovisual system documentation.", "Explore tools for real equipment, animated signal paths, zones, filters, exports and audiovisual system documentation."],
      fr: ["Fonctionnalités Wires | Logiciel de schéma audiovisuel", "Découvrez les fonctions du logiciel de schéma de câblage audiovisuel Wires : appareils réels, routes animées, zones, filtres et documentation d'installation audiovisuelle.", "Découvrez les appareils réels, les routes de signal animées, les zones, les filtres et les exports de Wires."],
      es: ["Funciones de Wires | Diagramas de cableado AV", "Descubre las funciones del software de diagramas de cableado audiovisual Wires: equipos reales, rutas animadas, zonas, filtros y documentación de sistemas audiovisuales.", "Descubre equipos reales, rutas de señal animadas, zonas, filtros y exportaciones para documentar sistemas audiovisuales."]
    },
    "try-it.html": {
      en: ["Try Wires | AV Signal Flow Diagram Software", "Try Wires AV signal flow diagram software in your browser and build a sample AV wiring diagram with devices, cables, zones and labels.", "Build a sample AV wiring diagram in your browser with devices, cables, zones and labels."],
      fr: ["Essayer Wires | Logiciel de flux de signal AV", "Essayez le logiciel de flux de signal AV Wires dans votre navigateur et créez un exemple avec appareils, câbles, zones et libellés.", "Créez un exemple de schéma de câblage audiovisuel dans votre navigateur avec des appareils, câbles, zones et libellés."],
      es: ["Probar Wires | Software de flujo de señales AV", "Prueba el software de flujo de señales AV Wires en el navegador y crea un ejemplo con equipos, cables, zonas y etiquetas.", "Crea un ejemplo de diagrama de cableado audiovisual en el navegador con equipos, cables, zonas y etiquetas."]
    },
    "downloads.html": {
      en: ["Download Wires | AV Wiring Diagram Software", "Download Wires AV wiring diagram software for Windows, macOS or Linux and create clear audiovisual system documentation offline.", "Download Wires for Windows, macOS or Linux and create audiovisual system documentation offline."],
      fr: ["Télécharger Wires | Logiciel de schéma audiovisuel", "Téléchargez le logiciel de schéma de câblage audiovisuel Wires pour Windows, macOS ou Linux et créez votre documentation d'installation audiovisuelle hors ligne.", "Téléchargez Wires pour Windows, macOS ou Linux et créez une documentation audiovisuelle claire hors ligne."],
      es: ["Descargar Wires | Software de diagramas audiovisuales", "Descarga el software de diagramas de cableado audiovisual Wires para Windows, macOS o Linux y crea documentación de sistemas audiovisuales sin conexión.", "Descarga Wires para Windows, macOS o Linux y crea documentación audiovisual clara sin conexión."]
    },
    "licence.html": {
      en: ["Wires License | Free and Pro AV Documentation", "Compare Wires Free and Pro for AV signal flow diagrams and audiovisual system documentation, including devices, routes, PDF exports and sub-projects.", "Compare Wires Free and Pro features for AV diagrams, signal routes, PDF exports and sub-projects."],
      fr: ["Licence Wires | Documentation audiovisuelle Free et Pro", "Comparez Wires Free et Pro pour vos schémas de flux de signal AV et votre documentation d'installation audiovisuelle : appareils, routes, PDF et sous-projets.", "Comparez les fonctions Free et Pro de Wires pour les schémas AV, les routes de signal, les exports PDF et les sous-projets."],
      es: ["Licencia Wires | Documentación audiovisual Free y Pro", "Compara Wires Free y Pro para diagramas de flujo de señales AV y documentación de sistemas audiovisuales: equipos, rutas, PDF y subproyectos.", "Compara las funciones Free y Pro de Wires para diagramas AV, rutas de señal, exportaciones PDF y subproyectos."],
    },
    "help.html": {
      en: ["Wires Documentation | Audiovisual System Documentation", "Read the Wires guide for AV signal flow diagram software, from project creation and AV wiring to exports and audiovisual system documentation.", "Complete Wires AV wiring diagram software guide, from project creation and signal routes to documentation exports."],
      fr: ["Documentation Wires | Documentation d'installation audiovisuelle", "Consultez la documentation Wires pour créer des plans avec un logiciel de schéma de câblage audiovisuel et un logiciel de flux de signal AV.", "Guide complet du logiciel de schéma de câblage audiovisuel Wires, de la création du projet aux exports."],
      es: ["Documentación Wires | Sistemas audiovisuales", "Consulta la guía de Wires para usar software de diagramas de cableado audiovisual y software de flujo de señales AV, desde el proyecto hasta las exportaciones.", "Guía completa de Wires, desde la creación del proyecto y las rutas de señal hasta la documentación de sistemas audiovisuales."]
    },
    "terms-of-service-wires.html": {
      en: ["Wires Terms of Service | Software Use", "Read the terms governing the download, installation, activation and use of Wires audiovisual system documentation software.", "Terms governing the download, installation, activation and use of Wires software."],
      fr: ["Conditions d'utilisation Wires | Utilisation du logiciel", "Consultez les conditions applicables au téléchargement, à l'installation, à l'activation et à l'utilisation du logiciel Wires.", "Conditions applicables au téléchargement, à l'installation, à l'activation et à l'utilisation de Wires."],
      es: ["Condiciones de uso de Wires | Uso del software", "Consulta las condiciones de descarga, instalación, activación y uso del software de documentación de sistemas audiovisuales Wires.", "Condiciones aplicables a la descarga, instalación, activación y uso de Wires."]
    },
    "refund-policy-wires.html": {
      en: ["Wires Refund Policy | Digital Software License", "Read the refund policy and eligibility conditions for Wires digital audiovisual system documentation software licenses.", "Refund policy and eligibility conditions for Wires digital software licenses."],
      fr: ["Politique de remboursement Wires | Licence numérique", "Consultez la politique de remboursement et les conditions d'éligibilité applicables aux licences numériques du logiciel Wires.", "Politique de remboursement et conditions d'éligibilité des licences numériques Wires."],
      es: ["Política de reembolso de Wires | Licencia digital", "Consulta la política de reembolso y las condiciones de elegibilidad de las licencias digitales del software Wires.", "Política de reembolso y condiciones de elegibilidad de las licencias digitales Wires."]
    },
    "privacy-cookies.html": {
      en: ["Wires Privacy and Cookies | Analytics Consent", "Learn how Wires uses Google Analytics only after consent, what traffic data is measured and how to refuse or withdraw consent.", "How Wires handles Analytics consent, traffic measurement and statistical cookies."],
      fr: ["Confidentialité et cookies Wires | Consentement Analytics", "Découvrez comment Wires utilise Google Analytics uniquement après consentement, quelles données sont mesurées et comment refuser ou retirer votre accord.", "Gestion du consentement Analytics, des mesures de fréquentation et des cookies statistiques sur Wires."],
      es: ["Privacidad y cookies de Wires | Consentimiento Analytics", "Descubre cómo Wires utiliza Google Analytics solo tras el consentimiento, qué datos mide y cómo rechazar o retirar tu elección.", "Gestión del consentimiento de Analytics, la medición de visitas y las cookies estadísticas en Wires."]
    }
  };

  const LOCALES = { en: "en_GB", fr: "fr_FR", es: "es_ES" };
  const SOCIAL_IMAGES = {
    en: "https://alkoda-wires.com/images/EN/wires-en.png",
    fr: "https://alkoda-wires.com/images/FR/wires-fr.png",
    es: "https://alkoda-wires.com/images/ES/wires-es.png"
  };

  function pageName() {
    const name = location.pathname.split("/").filter(Boolean).pop();
    return name || "index.html";
  }

  function setMeta(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.setAttribute("content", value);
  }

  function apply(lang) {
    const page = PAGE_SEO[pageName()];
    const values = page && (page[lang] || page.en);
    if (!values) return;
    document.title = values[0];
    setMeta('meta[name="description"]', values[1]);
    setMeta('meta[property="og:title"]', values[0]);
    setMeta('meta[property="og:description"]', values[2]);
    setMeta('meta[property="og:locale"]', LOCALES[lang] || LOCALES.en);
    setMeta('meta[property="og:image"]', SOCIAL_IMAGES[lang] || SOCIAL_IMAGES.en);
    setMeta('meta[name="twitter:title"]', values[0]);
    setMeta('meta[name="twitter:description"]', values[2]);
    setMeta('meta[name="twitter:image"]', SOCIAL_IMAGES[lang] || SOCIAL_IMAGES.en);
  }

  window.WiresSEO = { apply };
})();
