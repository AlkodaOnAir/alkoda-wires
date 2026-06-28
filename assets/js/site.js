const WIRES_LINKS = {
  download: "#download-wires"
};

const STRINGS = {
  en: {
    meta_title: "Wires - AV signal flow and cable planning software",
    meta_description: "Wires is a professional desktop app for AV diagram software, signal flow documentation, cable planning, broadcast diagrams and interactive signal routing exports.",
    nav_workflow: "Workflow",
    nav_features: "Features",
    nav_use_cases: "Use cases",
    nav_pricing: "License",
    nav_resources: "Resources",
    nav_help: "Help",
    nav_download: "Download Wires",
    mock_project: "LIVE PRODUCTION - SIGNAL FLOW",
    mock_counter: "12 DEVICES / 18 CABLES",
    mock_filters: "FILTERS",
    mock_camera: "Camera",
    mock_network: "Network",
    mock_routes: "ROUTES",
    hero_badge: "Desktop software for professional AV systems",
    hero_h1: "Visualize, document and animate complete audiovisual signal routes.",
    hero_sub: "Wires is not a drawing tool. It is a precise offline workspace for broadcast, streaming, corporate AV, live production and installation teams who need readable signal documentation.",
    hero_media_label: "Media placeholder",
    hero_media_text: "Future screenshot or product video",
    cta_download: "Download Wires",
    trust_offline_title: "Offline",
    trust_offline_text: "Desktop app",
    trust_html_text: "Interactive export",
    trust_pdf_text: "Field documents",
    video_kicker: "Hero video placeholder",
    video_h2: "Designed for a product film, ready before the video exists.",
    video_lead: "The hero video area can later host a short capture showing a route being built, animated, filtered and exported.",
    video_label: "Hero video",
    video_slot: "Product overview - 60 to 90 seconds",
    workflow_kicker: "How Wires works",
    workflow_h2: "From real equipment to a shareable signal map.",
    workflow_lead: "A simple path for building professional AV documentation without turning the site into a manual.",
    step1_title: "Build the devices",
    step1_text: "Import real equipment images, remove backgrounds, crop precisely and place connection points that match the physical ports.",
    step2_title: "Connect the system",
    step2_text: "Create typed cables, define directions, handle bidirectional ports and organize the plan with zones, categories and cable filters.",
    step3_title: "Animate the signal",
    step3_text: "Group cables into signal routes, reorder segments, manage splits and verify the path with animated light points on the canvas.",
    step4_title: "Export and share",
    step4_text: "Deliver interactive HTML exports, PDF documents and pack lists for production crews, clients and technical archives.",
    features_kicker: "Professional feature set",
    features_h2: "Everything revolves around signal clarity.",
    features_lead: "Wires keeps diagrams readable while preserving the details technicians need on real productions.",
    feat1_title: "Signal routes",
    feat1_text: "Document complete paths from source to destination, including multi-segment chains and route colors.",
    feat2_title: "Multi-segment animation",
    feat2_text: "Animate one or several segments to confirm continuity, direction and routing logic at a glance.",
    feat3_title: "Splits and direction",
    feat3_text: "Represent branches, alternate paths and cable direction changes without losing visual structure.",
    feat4_title: "Real device images",
    feat4_text: "Use actual pictures of cameras, switchers, interfaces, racks and displays for instant recognition.",
    feat5_title: "Background removal",
    feat5_text: "Clean imported images, crop them in the app and place ports directly on the device visual.",
    feat6_title: "Filters and ghost mode",
    feat6_text: "Filter by category, cable or zone while connected context remains visible at 35 percent opacity.",
    feat7_title: "Minimap navigation",
    feat7_text: "Navigate large broadcast or installation plans quickly without losing orientation.",
    feat8_title: "Custom cable types",
    feat8_text: "Create your own connector families beyond SDI, HDMI, RJ45, Dante, XLR, USB, optical and more.",
    feat9_title: "Project import",
    feat9_text: "Reuse a rack, room or subsystem by importing one Wires project into another.",
    feat10_title: "Offline desktop app",
    feat10_text: "Work locally on site, in a venue, on a truck or in a studio without relying on cloud availability.",
    feat11_title: "Multilingual interface",
    feat11_text: "Use Wires in English, French or Spanish and switch language directly inside the application.",
    feat12_title: "Integrated documentation",
    feat12_text: "Keep the user guide close while the website remains a product story, not a reference manual.",
    showcase_kicker: "Visual placeholders",
    showcase_h2: "Built to stay elegant while screenshots are still in production.",
    showcase_lead: "Each slot can later receive a real application capture without changing the layout.",
    shot1_title: "Signal route panel",
    shot1_text: "For a screenshot showing route segments, order, direction and split handling.",
    shot2_title: "Device image editor",
    shot2_text: "For background removal, crop handles and port placement.",
    shot3_title: "Interactive export",
    shot3_text: "For HTML, PDF and pack list delivery views.",
    quick_kicker: "Quick start videos",
    quick_h2: "Six tutorial slots ready for YouTube or local videos.",
    quick_lead: "The site can launch with polished placeholders and receive final videos later.",
    quick1: "Quick Start 1 - Create a project",
    quick2: "Quick Start 2 - Add a device",
    quick3: "Quick Start 3 - Place ports",
    quick4: "Quick Start 4 - Connect cables",
    quick5: "Quick Start 5 - Animate routes",
    quick6: "Quick Start 6 - Export and share",
    use_kicker: "Built for AV workflows",
    use_h2: "One language for technical teams, clients and archives.",
    use1_title: "Broadcast studios",
    use1_text: "Map cameras, routers, switchers, encoders, multiviewers and monitors with clear signal flow.",
    use2_title: "Live production",
    use2_text: "Prepare a show before load-in, then export readable diagrams for technicians on site.",
    use3_title: "Corporate AV",
    use3_text: "Document conference rooms, HDMI matrices, displays, audio systems and videoconferencing chains.",
    use4_title: "Church AV",
    use4_text: "Explain sound, video, screens, cameras and streaming architecture to recurring technical teams.",
    use5_title: "Streaming setups",
    use5_text: "Keep cameras, microphones, lighting, capture cards, interfaces and computers organized.",
    use6_title: "System integration",
    use6_text: "Deliver client-facing documentation that remains understandable after installation.",
    pricing_kicker: "License activation",
    pricing_h2: "One application. Free mode by default. Pro unlocked by license.",
    pricing_lead: "Download Wires once, test it immediately, then enter a license key inside the same software when you need Pro limits removed.",
    free_title: "Wires without license",
    price_free: "Free mode",
    free_1: "10 devices maximum",
    free_2: "PDF export limited to 75 dpi",
    free_3: "No sub-projects",
    free_4: "All other features included",
    pro_badge: "Recommended for productions",
    pro_title: "Wires with Pro license",
    price_pro: "Activated in the app",
    pro_1: "Unlimited devices",
    pro_2: "High-resolution PDF export",
    pro_3: "Sub-projects",
    pro_4: "Same Wires installation",
    activation_img: "images/EN/activer-en.png",
    activation_alt: "Wires Pro activation window",
    activation_caption: "The Pro license is entered directly in Wires. The download stays the same.",
    resources_kicker: "Documentation and resources",
    resources_h2: "Everything needed around the software, linked locally.",
    res_manual_title: "User guide",
    res_manual_text: "Complete manual, currently supplied as DOCX.",
    res_faq_text: "Key questions before downloading or upgrading.",
    res_terms_title: "Terms of Service",
    res_terms_text: "Local legal page for Wires.",
    res_refund_title: "Refund Policy",
    res_refund_text: "Local refund policy for digital licenses.",
    res_release_title: "Release notes",
    res_release_text: "Placeholder for version history.",
    res_tutorials_title: "Future tutorials",
    res_tutorials_text: "Prepared video slots for upcoming lessons.",
    faq_h2: "Practical answers for technical visitors.",
    faq1_q: "Is Wires a drawing application?",
    faq1_a: "No. Wires uses visual diagrams, but its purpose is signal documentation: devices, ports, cables, routes, direction, filters and exports.",
    faq2_q: "Can Wires work offline?",
    faq2_a: "Yes. Wires is a desktop Electron application designed to work locally, which is useful on productions, in venues and in technical rooms.",
    faq3_q: "What makes the HTML export useful?",
    faq3_a: "It creates an interactive standalone view of the plan, including device visuals and routes, so a setup can be shared or published without opening the app.",
    faq4_q: "How does the Pro license differ from Free mode?",
    faq4_a: "It is the same Wires application. Without a license, Wires runs in Free mode. Entering a Pro license removes the 10-device limit, enables high-resolution PDF export and unlocks sub-projects.",
    final_h2: "Make the signal visible before the production starts.",
    final_text: "Download Wires, test it on a real setup, then activate Pro with a license key when your documentation needs to scale.",
    footer_text: "Wires is published by Alkoda On Air.",
    footer_terms: "Terms",
    footer_refunds: "Refunds"
  },
  fr: {
    meta_title: "Wires - logiciel de plans de câblage et de signal flow AV",
    meta_description: "Wires est une application desktop professionnelle pour créer des plans AV, documenter les signaux, planifier les câbles, produire des schémas broadcast et exporter des diagrammes interactifs.",
    nav_workflow: "Workflow",
    nav_features: "Fonctions",
    nav_use_cases: "Usages",
    nav_pricing: "Licence",
    nav_resources: "Ressources",
    nav_help: "Aide",
    nav_download: "Télécharger Wires",
    mock_project: "PRODUCTION LIVE - ROUTES DE SIGNAL",
    mock_counter: "12 APPAREILS / 18 CÂBLES",
    mock_filters: "FILTRES",
    mock_camera: "Caméra",
    mock_network: "Réseau",
    mock_routes: "ROUTES",
    hero_badge: "Logiciel desktop pour systèmes audiovisuels professionnels",
    hero_h1: "Visualisez, documentez et animez des routes complètes de signaux audiovisuels.",
    hero_sub: "Wires n'est pas un logiciel de dessin. C'est un espace de travail offline précis pour les équipes broadcast, streaming, corporate AV, live production et installation qui ont besoin d'une documentation lisible.",
    hero_media_label: "Emplacement média",
    hero_media_text: "Future capture d'écran ou vidéo produit",
    cta_download: "Télécharger Wires",
    trust_offline_title: "Offline",
    trust_offline_text: "Application desktop",
    trust_html_text: "Export interactif",
    trust_pdf_text: "Documents terrain",
    video_kicker: "Placeholder vidéo hero",
    video_h2: "Pensé pour un film produit, prêt avant même que la vidéo existe.",
    video_lead: "La zone vidéo pourra accueillir une courte capture montrant une route créée, animée, filtrée puis exportée.",
    video_label: "Vidéo hero",
    video_slot: "Présentation produit - 60 à 90 secondes",
    workflow_kicker: "Comment fonctionne Wires",
    workflow_h2: "De l'appareil réel au plan de signal partageable.",
    workflow_lead: "Un parcours simple pour construire une documentation AV professionnelle sans transformer le site en manuel.",
    step1_title: "Construire les appareils",
    step1_text: "Importez les images réelles, supprimez les fonds, recadrez précisément et placez les points de connexion correspondant aux ports physiques.",
    step2_title: "Connecter le système",
    step2_text: "Créez des câbles typés, définissez les directions, gérez les ports bidirectionnels et organisez le plan avec zones, catégories et filtres.",
    step3_title: "Animer le signal",
    step3_text: "Regroupez les câbles en routes de signal, réordonnez les segments, gérez les splits et vérifiez le trajet avec des points lumineux animés.",
    step4_title: "Exporter et partager",
    step4_text: "Livrez des exports HTML interactifs, des PDF et des pack lists pour les équipes de production, les clients et les archives techniques.",
    features_kicker: "Fonctionnalités professionnelles",
    features_h2: "Tout tourne autour de la lisibilité du signal.",
    features_lead: "Wires garde les plans lisibles tout en conservant les détails nécessaires aux techniciens sur de vraies productions.",
    feat1_title: "Routes de signal",
    feat1_text: "Documentez des trajets complets de la source à la destination, avec chaînes multi-segments et couleurs de routes.",
    feat2_title: "Animation multi-segments",
    feat2_text: "Animez un ou plusieurs segments pour confirmer la continuité, le sens et la logique de routage d'un coup d'œil.",
    feat3_title: "Splits et direction",
    feat3_text: "Représentez les branches, les chemins alternatifs et les changements de sens sans perdre la structure visuelle.",
    feat4_title: "Images réelles des appareils",
    feat4_text: "Utilisez de vraies photos de caméras, mélangeurs, interfaces, racks et écrans pour une reconnaissance immédiate.",
    feat5_title: "Suppression du fond",
    feat5_text: "Nettoyez les images importées, recadrez-les dans l'app et placez les ports directement sur le visuel de l'appareil.",
    feat6_title: "Filtres et mode fantôme",
    feat6_text: "Filtrez par catégorie, câble ou zone, tout en conservant le contexte connecté à 35 pour cent d'opacité.",
    feat7_title: "Navigation minimap",
    feat7_text: "Naviguez rapidement dans de grands plans broadcast ou d'installation sans perdre l'orientation.",
    feat8_title: "Types de câbles personnalisés",
    feat8_text: "Créez vos familles de connecteurs au-delà de SDI, HDMI, RJ45, Dante, XLR, USB, optique et plus encore.",
    feat9_title: "Import de projet",
    feat9_text: "Réutilisez un rack, une salle ou un sous-système en important un projet Wires dans un autre.",
    feat10_title: "Application desktop offline",
    feat10_text: "Travaillez localement sur site, en salle, en car régie ou en studio sans dépendre du cloud.",
    feat11_title: "Interface multilingue",
    feat11_text: "Utilisez Wires en anglais, français ou espagnol et changez de langue directement dans l'application.",
    feat12_title: "Documentation intégrée",
    feat12_text: "Gardez le guide utilisateur à portée de main pendant que le site reste une histoire produit, pas un manuel.",
    showcase_kicker: "Placeholders visuels",
    showcase_h2: "Un design élégant même avant les captures définitives.",
    showcase_lead: "Chaque emplacement pourra recevoir une vraie capture de l'application sans changer la mise en page.",
    shot1_title: "Panneau des routes de signal",
    shot1_text: "Pour une capture montrant segments, ordre, direction et gestion des splits.",
    shot2_title: "Éditeur d'image appareil",
    shot2_text: "Pour la suppression du fond, les poignées de recadrage et le placement des ports.",
    shot3_title: "Export interactif",
    shot3_text: "Pour les vues de livraison HTML, PDF et pack list.",
    quick_kicker: "Vidéos Quick Start",
    quick_h2: "Six emplacements prêts pour YouTube ou des vidéos locales.",
    quick_lead: "Le site peut être publié avec des placeholders soignés et recevoir les vidéos finales plus tard.",
    quick1: "Quick Start 1 - Créer un projet",
    quick2: "Quick Start 2 - Ajouter un appareil",
    quick3: "Quick Start 3 - Placer les ports",
    quick4: "Quick Start 4 - Connecter les câbles",
    quick5: "Quick Start 5 - Animer les routes",
    quick6: "Quick Start 6 - Exporter et partager",
    use_kicker: "Conçu pour les workflows AV",
    use_h2: "Un langage commun pour les équipes techniques, les clients et les archives.",
    use1_title: "Studios broadcast",
    use1_text: "Cartographiez caméras, routeurs, mélangeurs, encodeurs, multiviewers et moniteurs avec un signal flow clair.",
    use2_title: "Production live",
    use2_text: "Préparez un show avant l'installation, puis exportez des plans lisibles pour les techniciens sur site.",
    use3_title: "Corporate AV",
    use3_text: "Documentez salles de conférence, matrices HDMI, écrans, systèmes audio et visioconférence.",
    use4_title: "Church AV",
    use4_text: "Expliquez son, vidéo, écrans, caméras et streaming aux équipes techniques récurrentes.",
    use5_title: "Setups streaming",
    use5_text: "Gardez caméras, microphones, éclairage, cartes de capture, interfaces et ordinateurs organisés.",
    use6_title: "Intégration système",
    use6_text: "Livrez une documentation client qui reste compréhensible après l'installation.",
    pricing_kicker: "Activation de licence",
    pricing_h2: "Une seule application. Mode Free par défaut. Pro déverrouillé par licence.",
    pricing_lead: "Téléchargez Wires une seule fois, testez-le immédiatement, puis entrez une clé de licence dans le même logiciel lorsque vous avez besoin de retirer les limites Pro.",
    free_title: "Wires sans licence",
    price_free: "Mode Free",
    free_1: "10 appareils maximum",
    free_2: "Export PDF limité à 75 dpi",
    free_3: "Pas de sous-projets",
    free_4: "Toutes les autres fonctions incluses",
    pro_badge: "Recommandé pour les productions",
    pro_title: "Wires avec licence Pro",
    price_pro: "Activé dans l'application",
    pro_1: "Appareils illimités",
    pro_2: "Export PDF haute résolution",
    pro_3: "Sous-projets",
    pro_4: "Même installation Wires",
    activation_img: "images/FR/activer-fr.png",
    activation_alt: "Fenêtre d'activation Wires Pro",
    activation_caption: "La licence Pro se saisit directement dans Wires. Le téléchargement reste le même.",
    resources_kicker: "Documentation et ressources",
    resources_h2: "Tout ce qui accompagne le logiciel, avec des liens locaux.",
    res_manual_title: "Guide utilisateur",
    res_manual_text: "Manuel complet, actuellement fourni en DOCX.",
    res_faq_text: "Questions clés avant de télécharger ou de passer en Pro.",
    res_terms_title: "Conditions d'utilisation",
    res_terms_text: "Page légale locale pour Wires.",
    res_refund_title: "Politique de remboursement",
    res_refund_text: "Politique locale pour les licences numériques.",
    res_release_title: "Release notes",
    res_release_text: "Placeholder pour l'historique des versions.",
    res_tutorials_title: "Futurs tutoriels",
    res_tutorials_text: "Emplacements vidéo prêts pour les prochains tutoriels.",
    faq_h2: "Des réponses concrètes pour les visiteurs techniques.",
    faq1_q: "Wires est-il un logiciel de dessin ?",
    faq1_a: "Non. Wires utilise des diagrammes visuels, mais son objectif est la documentation du signal : appareils, ports, câbles, routes, direction, filtres et exports.",
    faq2_q: "Wires peut-il fonctionner hors ligne ?",
    faq2_a: "Oui. Wires est une application desktop Electron pensée pour travailler localement, utile en production, dans une salle ou en local technique.",
    faq3_q: "À quoi sert l'export HTML ?",
    faq3_a: "Il crée une vue interactive autonome du plan, avec visuels d'appareils et routes, afin de partager ou publier un setup sans ouvrir l'application.",
    faq4_q: "Quelle différence entre le mode Free et la licence Pro ?",
    faq4_a: "C'est la même application Wires. Sans licence, Wires fonctionne en mode Free. En entrant une licence Pro, la limite de 10 appareils disparaît, l'export PDF haute résolution est activé et les sous-projets sont débloqués.",
    final_h2: "Rendez le signal visible avant le début de la production.",
    final_text: "Téléchargez Wires, testez-le sur une vraie configuration, puis activez Pro avec une clé de licence lorsque votre documentation doit monter en échelle.",
    footer_text: "Wires est édité par Alkoda On Air.",
    footer_terms: "Conditions",
    footer_refunds: "Remboursements"
  },
  es: {
    meta_title: "Wires - software para diagramas AV y planificación de cableado",
    meta_description: "Wires es una aplicación desktop profesional para diagramas AV, documentación de señales, planificación de cableado, esquemas broadcast y exportaciones interactivas.",
    nav_workflow: "Flujo",
    nav_features: "Funciones",
    nav_use_cases: "Usos",
    nav_pricing: "Licencia",
    nav_resources: "Recursos",
    nav_help: "Ayuda",
    nav_download: "Descargar Wires",
    mock_project: "PRODUCCIÓN LIVE - RUTAS DE SEÑAL",
    mock_counter: "12 DISPOSITIVOS / 18 CABLES",
    mock_filters: "FILTROS",
    mock_camera: "Cámara",
    mock_network: "Red",
    mock_routes: "RUTAS",
    hero_badge: "Software desktop para sistemas audiovisuales profesionales",
    hero_h1: "Visualiza, documenta y anima rutas completas de señales audiovisuales.",
    hero_sub: "Wires no es una herramienta de dibujo. Es un espacio de trabajo offline preciso para equipos de broadcast, streaming, AV corporativo, producción en vivo e integración que necesitan documentación legible.",
    hero_media_label: "Espacio multimedia",
    hero_media_text: "Futura captura de pantalla o vídeo de producto",
    cta_download: "Descargar Wires",
    trust_offline_title: "Offline",
    trust_offline_text: "Aplicación desktop",
    trust_html_text: "Exportación interactiva",
    trust_pdf_text: "Documentos de campo",
    video_kicker: "Placeholder de vídeo hero",
    video_h2: "Pensado para un vídeo de producto, listo antes de que exista el vídeo.",
    video_lead: "La zona hero podrá alojar una captura breve mostrando una ruta creada, animada, filtrada y exportada.",
    video_label: "Vídeo hero",
    video_slot: "Presentación del producto - 60 a 90 segundos",
    workflow_kicker: "Cómo funciona Wires",
    workflow_h2: "Del equipo real a un mapa de señal compartible.",
    workflow_lead: "Un recorrido simple para construir documentación AV profesional sin convertir el sitio en un manual.",
    step1_title: "Construir los dispositivos",
    step1_text: "Importa imágenes reales, elimina fondos, recorta con precisión y coloca puntos de conexión que correspondan a los puertos físicos.",
    step2_title: "Conectar el sistema",
    step2_text: "Crea cables tipados, define direcciones, gestiona puertos bidireccionales y organiza el plano con zonas, categorías y filtros.",
    step3_title: "Animar la señal",
    step3_text: "Agrupa cables en rutas de señal, reordena segmentos, gestiona divisiones y verifica el recorrido con puntos luminosos animados.",
    step4_title: "Exportar y compartir",
    step4_text: "Entrega exportaciones HTML interactivas, PDF y pack lists para equipos de producción, clientes y archivos técnicos.",
    features_kicker: "Funciones profesionales",
    features_h2: "Todo gira alrededor de la claridad de la señal.",
    features_lead: "Wires mantiene los diagramas legibles y conserva los detalles que los técnicos necesitan en producciones reales.",
    feat1_title: "Rutas de señal",
    feat1_text: "Documenta recorridos completos desde la fuente hasta el destino, con cadenas multisegmento y colores de ruta.",
    feat2_title: "Animación multisegmento",
    feat2_text: "Anima uno o varios segmentos para confirmar continuidad, dirección y lógica de enrutamiento de un vistazo.",
    feat3_title: "Splits y dirección",
    feat3_text: "Representa ramificaciones, rutas alternativas y cambios de sentido sin perder estructura visual.",
    feat4_title: "Imágenes reales de dispositivos",
    feat4_text: "Usa fotos reales de cámaras, mezcladores, interfaces, racks y pantallas para una identificación inmediata.",
    feat5_title: "Eliminación de fondo",
    feat5_text: "Limpia imágenes importadas, recórtalas en la app y coloca los puertos directamente sobre el visual del dispositivo.",
    feat6_title: "Filtros y modo fantasma",
    feat6_text: "Filtra por categoría, cable o zona manteniendo el contexto conectado al 35 por ciento de opacidad.",
    feat7_title: "Navegación con minimapa",
    feat7_text: "Navega rápidamente por grandes planos broadcast o instalaciones sin perder orientación.",
    feat8_title: "Tipos de cables personalizados",
    feat8_text: "Crea tus propias familias de conectores además de SDI, HDMI, RJ45, Dante, XLR, USB, óptico y más.",
    feat9_title: "Importación de proyecto",
    feat9_text: "Reutiliza un rack, una sala o un subsistema importando un proyecto Wires dentro de otro.",
    feat10_title: "Aplicación desktop offline",
    feat10_text: "Trabaja localmente en sitio, en un venue, en una unidad móvil o en estudio sin depender de la nube.",
    feat11_title: "Interfaz multilingüe",
    feat11_text: "Usa Wires en inglés, francés o español y cambia de idioma directamente dentro de la aplicación.",
    feat12_title: "Documentación integrada",
    feat12_text: "Mantén la guía de usuario cerca mientras el sitio sigue siendo una historia de producto, no un manual.",
    showcase_kicker: "Placeholders visuales",
    showcase_h2: "Diseñado para seguir elegante mientras las capturas aún están en producción.",
    showcase_lead: "Cada espacio podrá recibir una captura real de la aplicación sin cambiar el diseño.",
    shot1_title: "Panel de rutas de señal",
    shot1_text: "Para una captura que muestre segmentos, orden, dirección y gestión de splits.",
    shot2_title: "Editor de imagen de dispositivo",
    shot2_text: "Para eliminación de fondo, asas de recorte y colocación de puertos.",
    shot3_title: "Exportación interactiva",
    shot3_text: "Para vistas de entrega HTML, PDF y pack list.",
    quick_kicker: "Vídeos Quick Start",
    quick_h2: "Seis espacios listos para YouTube o vídeos locales.",
    quick_lead: "El sitio puede lanzarse con placeholders cuidados y recibir los vídeos finales más tarde.",
    quick1: "Quick Start 1 - Crear un proyecto",
    quick2: "Quick Start 2 - Añadir un dispositivo",
    quick3: "Quick Start 3 - Colocar puertos",
    quick4: "Quick Start 4 - Conectar cables",
    quick5: "Quick Start 5 - Animar rutas",
    quick6: "Quick Start 6 - Exportar y compartir",
    use_kicker: "Diseñado para workflows AV",
    use_h2: "Un lenguaje común para equipos técnicos, clientes y archivos.",
    use1_title: "Estudios broadcast",
    use1_text: "Mapea cámaras, routers, mezcladores, codificadores, multiviewers y monitores con un flujo de señal claro.",
    use2_title: "Producción en vivo",
    use2_text: "Prepara un show antes del montaje y exporta diagramas legibles para técnicos en sitio.",
    use3_title: "AV corporativo",
    use3_text: "Documenta salas de conferencia, matrices HDMI, pantallas, sistemas de audio y videoconferencia.",
    use4_title: "Church AV",
    use4_text: "Explica sonido, vídeo, pantallas, cámaras y streaming a equipos técnicos recurrentes.",
    use5_title: "Setups de streaming",
    use5_text: "Mantén cámaras, micrófonos, luces, capturadoras, interfaces y ordenadores organizados.",
    use6_title: "Integración de sistemas",
    use6_text: "Entrega documentación para clientes que siga siendo comprensible después de la instalación.",
    pricing_kicker: "Activación de licencia",
    pricing_h2: "Una sola aplicación. Modo Free por defecto. Pro se desbloquea con licencia.",
    pricing_lead: "Descarga Wires una sola vez, pruébalo inmediatamente y luego introduce una clave de licencia dentro del mismo software cuando necesites eliminar los límites Pro.",
    free_title: "Wires sin licencia",
    price_free: "Modo Free",
    free_1: "10 dispositivos máximo",
    free_2: "Exportación PDF limitada a 75 dpi",
    free_3: "Sin subproyectos",
    free_4: "Todas las demás funciones incluidas",
    pro_badge: "Recomendado para producciones",
    pro_title: "Wires con licencia Pro",
    price_pro: "Activado en la app",
    pro_1: "Dispositivos ilimitados",
    pro_2: "Exportación PDF en alta resolución",
    pro_3: "Subproyectos",
    pro_4: "La misma instalación de Wires",
    activation_img: "images/ES/activer-es.png",
    activation_alt: "Ventana de activación de Wires Pro",
    activation_caption: "La licencia Pro se introduce directamente en Wires. La descarga sigue siendo la misma.",
    resources_kicker: "Documentación y recursos",
    resources_h2: "Todo lo necesario alrededor del software, con enlaces locales.",
    res_manual_title: "Guía de usuario",
    res_manual_text: "Manual completo, actualmente suministrado como DOCX.",
    res_faq_text: "Preguntas clave antes de descargar o actualizar.",
    res_terms_title: "Términos de servicio",
    res_terms_text: "Página legal local para Wires.",
    res_refund_title: "Política de reembolso",
    res_refund_text: "Política local para licencias digitales.",
    res_release_title: "Notas de versión",
    res_release_text: "Placeholder para el historial de versiones.",
    res_tutorials_title: "Futuros tutoriales",
    res_tutorials_text: "Espacios de vídeo preparados para próximas lecciones.",
    faq_h2: "Respuestas prácticas para visitantes técnicos.",
    faq1_q: "¿Wires es una aplicación de dibujo?",
    faq1_a: "No. Wires utiliza diagramas visuales, pero su propósito es documentar señales: dispositivos, puertos, cables, rutas, dirección, filtros y exportaciones.",
    faq2_q: "¿Wires funciona offline?",
    faq2_a: "Sí. Wires es una aplicación desktop Electron diseñada para trabajar localmente, útil en producciones, venues y salas técnicas.",
    faq3_q: "¿Para qué sirve la exportación HTML?",
    faq3_a: "Crea una vista interactiva autónoma del plano, incluyendo visuales de dispositivos y rutas, para compartir o publicar un setup sin abrir la app.",
    faq4_q: "¿Cuál es la diferencia entre el modo Free y la licencia Pro?",
    faq4_a: "Es la misma aplicación Wires. Sin licencia, Wires funciona en modo Free. Al introducir una licencia Pro, se elimina el límite de 10 dispositivos, se activa la exportación PDF de alta resolución y se desbloquean los subproyectos.",
    final_h2: "Haz visible la señal antes de que empiece la producción.",
    final_text: "Descarga Wires, pruébalo en una configuración real y activa Pro con una clave de licencia cuando tu documentación necesite escalar.",
    footer_text: "Wires está publicado por Alkoda On Air.",
    footer_terms: "Términos",
    footer_refunds: "Reembolsos"
  }
};

const FLAGS = {
  en: '<svg width="22" height="15" viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg" style="border-radius:2px;vertical-align:middle;display:inline-block"><rect width="60" height="30" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" stroke-width="4"/><path d="M30,0 V30 M0,15 H60" stroke="#fff" stroke-width="10"/><path d="M30,0 V30 M0,15 H60" stroke="#C8102E" stroke-width="6"/></svg>',
  fr: '<svg width="22" height="15" viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg" style="border-radius:2px;vertical-align:middle;display:inline-block"><rect width="1" height="2" fill="#002395"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#ED2939"/></svg>',
  es: '<svg width="22" height="15" viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg" style="border-radius:2px;vertical-align:middle;display:inline-block"><rect width="3" height="2" fill="#AA151B"/><rect y=".5" width="3" height="1" fill="#F1BF00"/></svg>'
};

const LANG_NAMES = { en: "English", fr: "Français", es: "Español" };
const LANG_SHORT = { en: "EN", fr: "FR", es: "ES" };
let _lang = "en";

function t(key) {
  return (STRINGS[_lang] && STRINGS[_lang][key]) || STRINGS.en[key] || key;
}

function setLang(lang) {
  if (!STRINGS[lang]) lang = "en";
  _lang = lang;
  try { localStorage.setItem("wires_lang", lang); } catch (error) {}

  document.documentElement.lang = lang;
  document.title = t("meta_title");
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute("content", t("meta_description"));
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute("content", t("meta_title"));
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute("content", t("meta_description"));

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const value = t(el.getAttribute("data-i18n"));
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") el.placeholder = value;
    else el.innerHTML = value;
  });

  document.querySelectorAll("[data-i18n-label]").forEach((el) => {
    el.setAttribute("data-label", t(el.getAttribute("data-i18n-label")));
  });

  document.querySelectorAll("[data-i18n-src]").forEach((el) => {
    el.setAttribute("src", t(el.getAttribute("data-i18n-src")));
  });

  document.querySelectorAll("[data-i18n-alt]").forEach((el) => {
    el.setAttribute("alt", t(el.getAttribute("data-i18n-alt")));
  });

  const flag = document.getElementById("lang-flag");
  const name = document.getElementById("lang-name");
  if (flag) flag.innerHTML = FLAGS[lang];
  if (name) name.textContent = LANG_SHORT[lang];

  Object.keys(FLAGS).forEach((code) => {
    const dropFlag = document.getElementById(`drop-flag-${code}`);
    const option = document.getElementById(`lang-opt-${code}`);
    if (dropFlag) dropFlag.innerHTML = FLAGS[code];
    if (option) {
      option.classList.toggle("active", code === lang);
      option.style.display = code === lang ? "none" : "flex";
    }
  });

  const toggle = document.getElementById("lang-toggle");
  if (toggle) toggle.setAttribute("aria-label", `Language: ${LANG_NAMES[lang]}`);
}

function toggleLangDrop() {
  const drop = document.getElementById("lang-drop");
  const toggle = document.getElementById("lang-toggle");
  if (!drop) return;
  const open = drop.classList.toggle("open");
  if (toggle) toggle.setAttribute("aria-expanded", String(open));
}

function closeLangDrop() {
  const drop = document.getElementById("lang-drop");
  const toggle = document.getElementById("lang-toggle");
  if (drop) drop.classList.remove("open");
  if (toggle) toggle.setAttribute("aria-expanded", "false");
}

document.querySelectorAll(".js-download").forEach((link) => {
  link.href = WIRES_LINKS.download;
});

const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".site-nav");

menuButton?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
});

nav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");
    menuButton?.setAttribute("aria-expanded", "false");
  });
});

document.getElementById("lang-toggle")?.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleLangDrop();
});

document.querySelectorAll(".lang-opt[data-lang]").forEach((button) => {
  button.addEventListener("click", () => {
    setLang(button.dataset.lang);
    closeLangDrop();
  });
});

document.addEventListener("click", (event) => {
  if (!event.target.closest("#lang-selector")) closeLangDrop();
});

(function initLang() {
  let lang;
  try { lang = localStorage.getItem("wires_lang"); } catch (error) {}
  if (!lang) {
    const browserLang = navigator.language || "en";
    lang = browserLang.startsWith("fr") ? "fr" : browserLang.startsWith("es") ? "es" : "en";
  }
  setLang(lang);
})();
