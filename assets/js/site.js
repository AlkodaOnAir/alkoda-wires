const STRINGS = {
  en: {
    nav_home: "Home",
    nav_features: "Features",
    nav_try: "Try Wires",
    nav_license: "License",
    nav_help: "Help",
    nav_contact: "Contact",
    nav_download: "Download Wires",
    footer_terms: "Terms",
    footer_refunds: "Refunds",
    footer_text: "Wires is published by Alkoda.",
    privacy_h1: "Privacy and cookies",
    privacy_intro: "This page explains how Wires uses statistical cookies and Google Analytics.",
    privacy_analytics_h2: "Google Analytics",
    privacy_analytics_text: "Google Analytics is used only after you have explicitly accepted statistical cookies. Before acceptance, no Analytics resource is loaded and no Analytics data is sent.",
    privacy_data_h2: "Traffic data measured",
    privacy_data_text: "When accepted, Analytics measures visits and page views, the pages viewed, approximate visit duration, device and browser information, and the general source of traffic. Wires does not use Analytics to collect information entered into the software or the online demo.",
    privacy_choice_h2: "Your choice",
    privacy_choice_text: "You can accept or refuse statistical cookies. You can withdraw or change your choice at any time with the Cookie settings link in the footer. When consent is withdrawn, Analytics is disabled and Analytics cookies are deleted when technically possible.",
    privacy_duration_h2: "Consent duration",
    privacy_duration_text: "Your acceptance or refusal is stored on this device for six months. After that period, you will be asked again.",
    privacy_controller_h2: "Site controller",
    privacy_controller_text: "The site controller is Alkoda On Air - Christophe Koclejda EI.",

    home_h1: "Wiring diagrams everyone can understand.",
    home_sub: "Wires is the software that transforms your wiring diagrams into clear, interactive and easy-to-share AV documentation.",
    home_features_cta: "Explore features",
    home_wires_img: "images/EN/wires-en.png",
    home_wires_alt: "Wires interface with devices and signal cabling",
    workflow_kicker: "Workflow",
    workflow_h2: "How Wires turns a setup into a readable plan.",
    workflow_text: "In three steps, Wires transforms a hard-to-read installation into a clear, animated and shareable plan.",
    workflow_device_title: "Add your devices",
    workflow_device_text: "Import a real image, crop it, and place ports exactly where they are on the equipment.",
    workflow_connect_title: "Connect the ports",
    workflow_connect_text: "Create cables, choose their type and color, then organize the plan with zones, labels and categories.",
    workflow_signal_title: "Show the signal",
    workflow_signal_text: "Group cables into a route, launch the animation, then export interactive HTML or PDF documentation.",
    audience_kicker: "On site",
    audience_h2: "When cabling needs to be understood immediately.",
    audience_text: "Wires helps you find a fault, change an installation or explain a system without starting from zero. In seconds, the team sees where the signal goes, which devices are involved, which cables are needed and how the setup is really built.",
    audience_1: "Find a signal fault faster",
    audience_2: "Understand cabling in seconds",
    audience_3: "Plan the cables before an installation",
    audience_4: "Modify a setup and explain it clearly",
    audience_visual_title: "Troubleshooting, changes, preparation",
    license_kicker: "License",
    home_license_h2: "Download Wires and start in Free mode.",
    home_license_text: "Free mode lets you test the workflow. Pro unlocks unlimited devices, advanced PDF export and sub-projects.",

    features_page_h1: "Understand your installation at a glance.",
    features_page_sub: "Create clear wiring diagrams with real equipment, real ports and animated signal routes.",
    feature_real_kicker: "Real devices",
    feature_real_h2: "Work with the equipment people recognize.",
    feature_real_text: "Import photos of cameras, switchers, interfaces, racks and screens. Crop them, clean them, and place connection points directly on the image so the plan stays readable for everyone.",
    feature_ports_img: "images/EN/configPorts-en.png",
    feature_ports_alt: "Port configuration in Wires",
    feature_signal_kicker: "Signal paths",
    feature_signal_h2: "Follow the signal across the whole route.",
    feature_signal_text: "Group cables into a route and animate the path from source to destination. It is easier to explain a chain, detect a break, or show how a signal moves through converters, switches and screens.",
    feature_routes_img: "images/EN/routes-en.png",
    feature_routes_alt: "Animated routes in Wires",
    feature_control_kicker: "Control",
    feature_control_h2: "Keep complex plans understandable.",
    feature_control_text: "Use zones, categories, filters, cable types, colors, labels and the minimap to organize larger installations without losing the technical context.",
    feature_filters_img: "images/EN/gauche-en.png",
    feature_filters_alt: "Wires filters and categories",
    features_grid_kicker: "Main strengths",
    features_grid_h2: "Precise enough for technicians.<br>Clear enough for the whole team.",
    feat_real_title: "Real device images",
    feat_real_text: "Use actual equipment photos instead of generic blocks.",
    feat_ports_title: "Physical ports",
    feat_ports_text: "Place inputs and outputs exactly where they are on the device.",
    feat_routes_title: "Animated routes",
    feat_routes_text: "Animate the complete signal path across multiple cable segments.",
    feat_cables_title: "Custom cables",
    feat_cables_text: "Create and style cable families for your own workflow.",
    feat_zones_title: "Zones and filters",
    feat_zones_text: "Isolate a rack, a room, a camera chain or a cable type quickly.",
    feat_export_title: "Interactive exports",
    feat_export_text: "Share a browser-ready HTML viewer, PDF documents and connection lists.",
    feat_offline_title: "Offline desktop",
    feat_offline_text: "Work locally on Windows or macOS without depending on a cloud service.",
    feat_languages_title: "Three languages",
    feat_languages_text: "Use Wires in English, French or Spanish.",
    use_cases_kicker: "Use cases",
    use_cases_h2: "Different setups, one need:<br>knowing where the signal goes.",
    use_stream_title: "Streamers and studios",
    use_stream_text: "Prepare a clean map of cameras, capture cards, switchers, computers and screens before the live starts.",
    use_church_title: "Churches and rooms",
    use_church_text: "Keep volunteer teams aligned with a readable signal map for cameras, projectors, audio interfaces and control desks.",
    use_conf_title: "Conference rooms",
    use_conf_text: "Document installed equipment, wall plates, racks, displays and converters so support stays simple.",
    use_small_title: "Small productions",
    use_small_text: "Build reusable plans for events, rentals, training rooms and compact broadcast setups.",
    visual_slot_label: "AI image slot",
    visual_slot_text: "Future illustration",
    video_kicker: "Video examples",
    video_h2: "Short captures will make the workflow obvious.",
    video_text: "These spaces are reserved for screen recordings from the actual program. The goal is to show Wires moving, not just describe it.",
    video_route_title: "Animated cable",
    video_route_text: "Create a cable, add it to a signal route, then launch the animation to follow the path.",
    video_device_title: "Device and ports",
    video_device_text: "Add a device, adjust its image, then place the ports directly on the equipment visual.",
    video_export_title: "Export and share",
    video_export_text: "Export PDFs and an interactive HTML viewer with signal animation, device descriptions and signal-route details.",
    video_export_alt: "Wires export to PDF and HTML",
    video_slot_label: "Video slot",

    try_h1: "Try Wires live here.",
    try_sub: "Add devices, create cables, place text or zones, and see how Wires makes your cabling easier to read.",
    try_loading_title: "Loading the Wires demo",
    try_loading_text: "Preparing the live workspace...",
    try_mobile_title: "Desktop version required",
    try_mobile_text: "The online demo does not work on mobile. Please use the desktop version to try Wires.",
    try_box_title: "Demo under construction",
    try_box_text: "This space is reserved for the future online Wires test interface.",
    try_guide_eyebrow: "QUICK HELP",
    try_guide_title: "Useful controls",
    try_guide_commands: "Main controls",
    try_guide_routes: "Open the Signal Routes panel.",
    try_guide_add: "Open the creation menu:",
    try_guide_add_items: "New Device · New Cable · Add Text Label · Add Zone",
    try_guide_device_edit: "Edit a device",
    try_guide_device_name: "Click the device name",
    try_guide_device_name_text: "Rename it, type the new name and press Enter.",
    try_guide_device_double_click: "Double-click the device",
    try_guide_device_double_click_text: "Open image configuration to edit its image and ports.",
    try_guide_device_drag: "Drag the device",
    try_guide_device_drag_text: "Move it on the canvas.",
    try_guide_device_resize: "Drag its top-left corner",
    try_guide_device_resize_text: "Resize it proportionally.",
    try_guide_shift_key: "Shift",
    try_guide_shift_click_text: "Bring it to front, above any overlapping device.",
    try_guide_delete_device_text: "Use the red trash icon in the Info panel to delete this device.",
    try_guide_paths: "Edit a cable path",
    try_guide_drag: "Drag a segment",
    try_guide_drag_text: "Move it perpendicularly to adjust the path.",
    try_guide_right_click: "Right-click near a device",
    try_guide_right_click_text: "Open the Change direction / Create bend menu.",
    try_guide_change_dir: "After Change direction:",
    try_guide_change_dir_text: "change the segment exit direction.",
    try_guide_add_bend: "After Create bend:",
    try_guide_add_bend_text: "insert a 90-degree bend.",
    try_guide_multi: "Select multiple devices",
    try_guide_drag_action: "click and drag",
    try_guide_device_click: "device click",
    try_guide_alt_drag_text: "Draw a selection rectangle. Every device it touches is selected.",
    try_guide_ctrl_click_text: "Add or remove that device from the current selection.",
    try_guide_selected_click: "Click a selected device",
    try_guide_selected_click_text: "Remove that device from the selection.",
    try_guide_canvas_click: "Click the canvas",
    try_guide_canvas_click_text: "Clear the selection.",
    try_guide_canvas_drag: "Click and drag the canvas",
    try_guide_canvas_drag_text: "Pan the view without losing the selection.",
    try_guide_delete_key: "Del",
    try_guide_delete_text: "Delete all selected devices after confirmation.",
    try_guide_escape_text: "Clear the selection.",
    try_guide_image: "Configure a device image",
    try_guide_image_double_click: "Double-click a device",
    try_guide_image_double_click_text: "Open its image configuration.",
    try_guide_zoom: "Zoom",
    try_guide_wheel: "Mouse wheel",
    try_guide_wheel_text: "Zoom in or out around the pointer.",
    try_guide_or: "or",
    try_guide_zoom_keys_text: "Zoom in or zoom out.",
    try_guide_pinch: "Pinch gesture",
    try_guide_pinch_text: "Zoom on a touch surface.",
    try_guide_pan: "Pan the view",
    try_guide_right_drag: "Right-click and drag",
    try_guide_right_drag_text: "Pan even when the pointer is over a device.",
    try_guide_space_key: "Space",
    try_guide_space_drag_text: "Pan the view.",
    try_guide_left_drag: "Left-click and drag an empty area",
    try_guide_box_select: "Rectangle selection",
    try_guide_full_help: "Open the full help",
    try_guide_new_tab: "(new tab)",

    license_h1: "Choose the limits that match your projects.",
    license_sub: "Start with Free mode, then use a Pro license when you need unlimited devices, high-resolution PDF export and sub-projects.",
    license_free_devices: "Up to 10 devices",
    license_canvas: "Canvas and cables",
    license_zones: "Zones",
    license_animation: "Route animation",
    license_routes: "Signal routes",
    license_text: "Text labels",
    license_html: "HTML viewer",
    license_patch: "Connection list",
    license_colors: "Custom colors",
    license_pdf_free: "PDF export 75 dpi",
    license_no_subprojects: "No sub-projects",
    license_pro_devices: "Unlimited devices",
    license_subprojects: "Sub-projects",
    license_pdf_pro: "PDF export 75-600 dpi",
    license_price_note: "Excl. tax • One-time purchase",
    license_version_note: "2 activations for V1.x.x",
    license_free_forever: "Free forever",
    license_download_button: "Download Wires",
    license_download_platforms: "Windows, Mac, Linux",
    license_buy_button: "Buy Wires Pro",
    checkout_close_label: "Close payment",
    download_kicker: "Download",
    download_h2: "Download Wires.",
    download_text: "Choose your platform to open the Wires download page.",
    download_windows: "Download for Windows",
    download_macos: "Download for macOS",
    download_linux: "Download for Linux",

    contact_kicker: "Contact",
    contact_h2: "Need help or want to follow Wires?",
    contact_text: "Join the community first, or send an email for license and support questions.",
    contact_discord_label: "Discord",
    contact_discord: "Join the Wires Community",
    contact_mail_label: "Mail",
    downloads_h1: "Download Wires",
    downloads_latest_h2: "Download the latest version of Wires",
    downloads_windows: "Windows",
    downloads_macos_intel: "macOS Intel",
    downloads_macos_apple: "macOS Apple Silicon",
    downloads_linux: "Linux",
    downloads_version: "Version v1.0.0",
    downloads_soon: "Download",
    downloads_example_title: "Test project",
    downloads_example_text: "Open this project to quickly try Wires.",
    downloads_example_alt: "Example AV project open in Wires",
    downloads_example_button: "Download test project",
    install_macos_title: "Installing Wires on macOS",
    install_macos_text: "Open the downloaded <strong>.dmg</strong> file and place Wires in Applications. Wait for the copy to finish, then open the app from that folder.",
    install_macos_note: "<strong>ℹ️ Blocked on first launch?</strong> In Applications, right-click Wires and choose Open. Confirm Open again in the dialog.",
    install_windows_title: "Installing Wires on Windows",
    install_windows_text: "Double-click the downloaded <strong>.exe</strong>, then follow the steps in the Wires setup wizard.",
    install_windows_note: "<strong>ℹ️ Windows SmartScreen may appear the first time.</strong> Choose More info to reveal Run anyway, then confirm.",
    install_linux_title: "Installing Wires on Linux",
    install_linux_text: "Run the <strong>.AppImage</strong> file to install Wires."
  },
  fr: {
    nav_home: "Accueil",
    nav_features: "Fonctions",
    nav_try: "Tester Wires",
    nav_license: "Licence",
    nav_help: "Aide",
    nav_contact: "Contact",
    nav_download: "Télécharger Wires",
    footer_terms: "Conditions",
    footer_refunds: "Remboursements",
    footer_text: "Wires est édité par Alkoda.",
    privacy_h1: "Confidentialité et cookies",
    privacy_intro: "Cette page explique comment Wires utilise les cookies statistiques et Google Analytics.",
    privacy_analytics_h2: "Google Analytics",
    privacy_analytics_text: "Google Analytics est utilisé uniquement après votre acceptation explicite des cookies statistiques. Avant votre accord, aucune ressource Analytics n'est chargée et aucune donnée Analytics n'est envoyée.",
    privacy_data_h2: "Données de fréquentation mesurées",
    privacy_data_text: "Après acceptation, Analytics mesure les visites et pages vues, les pages consultées, la durée approximative des visites, les informations sur l'appareil et le navigateur, ainsi que la provenance générale du trafic. Wires n'utilise pas Analytics pour collecter les informations saisies dans le logiciel ou la démo en ligne.",
    privacy_choice_h2: "Votre choix",
    privacy_choice_text: "Vous pouvez accepter ou refuser les cookies statistiques. Vous pouvez retirer ou modifier votre choix à tout moment avec le lien Gérer les cookies du pied de page. Lors du retrait du consentement, Analytics est désactivé et ses cookies sont supprimés lorsque cela est techniquement possible.",
    privacy_duration_h2: "Durée du choix",
    privacy_duration_text: "Votre acceptation ou votre refus est conservé sur cet appareil pendant six mois. Après cette durée, votre choix sera demandé à nouveau.",
    privacy_controller_h2: "Responsable du site",
    privacy_controller_text: "Le responsable du site est Alkoda On Air - Christophe Koclejda EI.",

    home_h1: "Vos schémas de câblage, enfin compréhensibles.",
    home_sub: "Wires est le logiciel qui transforme vos schémas de câblage en une documentation audiovisuelle claire, interactive et facile à partager.",
    home_features_cta: "Voir les fonctions",
    home_wires_img: "images/FR/wires-fr.png",
    home_wires_alt: "Interface Wires avec appareils et câblage de signal",
    workflow_kicker: "Workflow",
    workflow_h2: "Comment Wires transforme un setup en plan lisible.",
    workflow_text: "En trois étapes, Wires transforme une installation difficile à lire en plan clair, animé et partageable.",
    workflow_device_title: "Ajoutez vos appareils",
    workflow_device_text: "Importez une vraie image, recadrez-la et placez les ports exactement où ils sont sur l'équipement.",
    workflow_connect_title: "Connectez les ports",
    workflow_connect_text: "Créez vos câbles, choisissez leur type et leur couleur, puis organisez le plan avec zones, labels et catégories.",
    workflow_signal_title: "Montrez le signal",
    workflow_signal_text: "Regroupez les câbles en route, lancez l'animation, puis exportez une documentation HTML interactive ou PDF.",
    audience_kicker: "Sur le terrain",
    audience_h2: "Quand le câblage doit être compris tout de suite.",
    audience_text: "Wires aide à retrouver une panne, modifier une installation ou expliquer un système sans repartir de zéro. En quelques secondes, l'équipe voit où passe le signal, quels appareils sont concernés, quels câbles sont nécessaires et comment le setup est réellement construit.",
    audience_1: "Trouver plus vite une panne de signal",
    audience_2: "Comprendre le câblage en quelques secondes",
    audience_3: "Prévoir les câbles avant une installation",
    audience_4: "Modifier un setup et l'expliquer clairement",
    audience_visual_title: "Diagnostic, modification, préparation",
    license_kicker: "Licence",
    home_license_h2: "Téléchargez Wires et commencez en mode Free.",
    home_license_text: "Le mode Free permet de tester le workflow. Pro débloque les appareils illimités, les exports PDF avancés et les sous-projets.",

    features_page_h1: "Comprendre votre installation en un regard.",
    features_page_sub: "Créez des schémas de câblage clairs avec de vrais équipements, de vrais ports et des routes de signal animées.",
    feature_real_kicker: "Appareils réels",
    feature_real_h2: "Travaillez avec l'équipement que l'équipe reconnaît.",
    feature_real_text: "Importez des photos de caméras, mélangeurs, interfaces, racks et écrans. Recadrez, nettoyez et placez les connexions directement sur l'image pour que le plan reste lisible.",
    feature_ports_img: "images/FR/configPorts-fr.png",
    feature_ports_alt: "Configuration des ports dans Wires",
    feature_signal_kicker: "Chemins de signal",
    feature_signal_h2: "Suivez le signal sur toute la route.",
    feature_signal_text: "Regroupez les câbles dans une route et animez le trajet de la source à la destination. C'est plus simple pour expliquer une chaîne, trouver une rupture ou montrer comment le signal traverse convertisseurs, switches et écrans.",
    feature_routes_img: "images/FR/routes-fr.png",
    feature_routes_alt: "Routes animées dans Wires",
    feature_control_kicker: "Contrôle",
    feature_control_h2: "Gardez les plans complexes compréhensibles.",
    feature_control_text: "Utilisez zones, catégories, filtres, types de câbles, couleurs, étiquettes et minimap pour organiser des installations plus grandes sans perdre le contexte technique.",
    feature_filters_img: "images/FR/gauche-fr.png",
    feature_filters_alt: "Filtres et catégories dans Wires",
    features_grid_kicker: "Points forts",
    features_grid_h2: "Assez précis pour les techniciens.<br>Assez clair pour toute l'équipe.",
    feat_real_title: "Images réelles d'appareils",
    feat_real_text: "Utilisez les photos du vrai matériel au lieu de blocs génériques.",
    feat_ports_title: "Ports physiques",
    feat_ports_text: "Placez entrées et sorties exactement là où elles sont sur l'appareil.",
    feat_routes_title: "Routes animées",
    feat_routes_text: "Animez le chemin complet du signal à travers plusieurs segments de câble.",
    feat_cables_title: "Câbles personnalisés",
    feat_cables_text: "Créez et stylisez vos familles de câbles selon votre workflow.",
    feat_zones_title: "Zones et filtres",
    feat_zones_text: "Isolez rapidement un rack, une salle, une chaîne caméra ou un type de câble.",
    feat_export_title: "Exports interactifs",
    feat_export_text: "Partagez une visionneuse HTML, des PDF et des listes de connexions.",
    feat_offline_title: "Desktop offline",
    feat_offline_text: "Travaillez localement sur Windows ou macOS sans dépendance cloud.",
    feat_languages_title: "Trois langues",
    feat_languages_text: "Utilisez Wires en anglais, français ou espagnol.",
    use_cases_kicker: "Usages",
    use_cases_h2: "Des configurations différentes, un même besoin :<br>savoir où passe le signal.",
    use_stream_title: "Streamers et studios",
    use_stream_text: "Préparez une carte claire des caméras, cartes de capture, mélangeurs, ordinateurs et écrans avant le direct.",
    use_church_title: "Églises et salles",
    use_church_text: "Gardez les équipes bénévoles alignées avec une carte lisible des caméras, projecteurs, interfaces audio et régies.",
    use_conf_title: "Salles de conférence",
    use_conf_text: "Documentez les appareils installés, prises murales, racks, écrans et convertisseurs pour simplifier le support.",
    use_small_title: "Petites productions",
    use_small_text: "Construisez des plans réutilisables pour événements, locations, espaces de formation et setups broadcast compacts.",
    visual_slot_label: "Emplacement image IA",
    visual_slot_text: "Future illustration",
    video_kicker: "Exemples vidéo",
    video_h2: "Des captures courtes rendront le workflow évident.",
    video_text: "Ces espaces sont réservés à des captures d'écran vidéo du vrai programme. L'objectif est de montrer Wires en mouvement, pas seulement de le décrire.",
    video_route_title: "Câble animé",
    video_route_text: "Créez un câble, ajoutez-le à une route de signal, puis lancez l'animation pour suivre le chemin.",
    video_device_title: "Appareil et ports",
    video_device_text: "Ajoutez un appareil, ajustez son image, puis placez les ports directement sur le visuel de l'équipement.",
    video_export_title: "Export et partage",
    video_export_text: "Exportez des PDF et une visionneuse HTML interactive avec animation du signal, description des appareils et détail des routes de signal.",
    video_export_alt: "Export Wires vers PDF et HTML",
    video_slot_label: "Emplacement vidéo",

    try_h1: "Tester Wires en ligne.",
    try_sub: "Ajoutez des appareils, créez des câbles, placez des textes ou des zones, et découvrez comment Wires rend votre câblage plus lisible.",
    try_loading_title: "Chargement de la démo Wires",
    try_loading_text: "Préparation de l'espace de travail en ligne...",
    try_mobile_title: "Démo disponible sur ordinateur",
    try_mobile_text: "La démo en ligne ne fonctionne pas sur mobile. Utilisez la version desktop pour tester Wires.",
    try_box_title: "Démo en construction",
    try_box_text: "Cet espace est réservé à la future interface de test en ligne de Wires.",
    try_guide_eyebrow: "AIDE RAPIDE",
    try_guide_title: "Commandes utiles",
    try_guide_commands: "Commandes principales",
    try_guide_routes: "Ouvrir le panneau Routes de signal.",
    try_guide_add: "Ouvrir le menu de création :",
    try_guide_add_items: "New Device · New Cable · Add Text Label · Add Zone",
    try_guide_device_edit: "Modification d'un appareil",
    try_guide_device_name: "Cliquer sur le nom de l'appareil",
    try_guide_device_name_text: "Le renommer, saisir le nouveau nom et appuyer sur Entrée.",
    try_guide_device_double_click: "Double-cliquer sur l'appareil",
    try_guide_device_double_click_text: "Ouvrir la configuration de l'image pour modifier son image et ses ports.",
    try_guide_device_drag: "Faire glisser l'appareil",
    try_guide_device_drag_text: "Déplacer l'appareil sur le canevas.",
    try_guide_device_resize: "Faire glisser son coin supérieur gauche",
    try_guide_device_resize_text: "Redimensionner l'appareil proportionnellement.",
    try_guide_shift_key: "Maj",
    try_guide_shift_click_text: "Mettre l'appareil au premier plan, devant tout appareil qui le chevauche.",
    try_guide_delete_device_text: "Utiliser l'icône corbeille rouge du panneau Info pour supprimer cet appareil.",
    try_guide_paths: "Modifier un chemin de câble",
    try_guide_drag: "Faire glisser un segment",
    try_guide_drag_text: "Le déplacer perpendiculairement pour ajuster le chemin.",
    try_guide_right_click: "Clic droit près d'un appareil",
    try_guide_right_click_text: "Ouvrir le menu « Change direction / Create bend ».",
    try_guide_change_dir: "Après « Change direction » :",
    try_guide_change_dir_text: "modifier la direction de sortie du segment.",
    try_guide_add_bend: "Après « Create bend » :",
    try_guide_add_bend_text: "insérer un coude à 90°.",
    try_guide_multi: "Sélectionner plusieurs appareils",
    try_guide_drag_action: "cliquer et glisser",
    try_guide_device_click: "clic sur l'appareil",
    try_guide_alt_drag_text: "Dessiner un rectangle : tous les appareils qu'il touche sont sélectionnés.",
    try_guide_ctrl_click_text: "Ajouter ou retirer cet appareil de la sélection actuelle.",
    try_guide_selected_click: "Cliquer sur un appareil sélectionné",
    try_guide_selected_click_text: "Retirer cet appareil de la sélection.",
    try_guide_canvas_click: "Cliquer sur le canevas",
    try_guide_canvas_click_text: "Effacer la sélection.",
    try_guide_canvas_drag: "Cliquer et glisser sur le canevas",
    try_guide_canvas_drag_text: "Déplacer la vue sans perdre la sélection.",
    try_guide_delete_key: "Suppr",
    try_guide_delete_text: "Supprimer tous les appareils sélectionnés après confirmation.",
    try_guide_escape_text: "Effacer la sélection.",
    try_guide_image: "Configurer l'image d'un appareil",
    try_guide_image_double_click: "Double-cliquer sur un appareil",
    try_guide_image_double_click_text: "Ouvrir la configuration de son image.",
    try_guide_zoom: "Zoom",
    try_guide_wheel: "Molette de la souris",
    try_guide_wheel_text: "Zoomer autour du curseur.",
    try_guide_or: "ou",
    try_guide_zoom_keys_text: "Zoom avant ou zoom arrière.",
    try_guide_pinch: "Pincer sur une surface tactile",
    try_guide_pinch_text: "Effectuer un zoom tactile.",
    try_guide_pan: "Panoramique : déplacer la vue",
    try_guide_right_drag: "Clic droit et glisser",
    try_guide_right_drag_text: "Déplacer la vue, même au-dessus d'un appareil.",
    try_guide_space_key: "Espace",
    try_guide_space_drag_text: "Déplacer la vue.",
    try_guide_left_drag: "Clic gauche et glisser sur une zone vide",
    try_guide_box_select: "Sélection rectangulaire",
    try_guide_full_help: "Ouvrir l'aide complète",
    try_guide_new_tab: "(nouvel onglet)",

    license_h1: "Choisissez les limites adaptées à vos projets.",
    license_sub: "Commencez avec le mode Free, puis utilisez une licence Pro quand vous avez besoin d'appareils illimités, d'exports PDF haute résolution et de sous-projets.",
    license_free_devices: "Jusqu'à 10 appareils",
    license_canvas: "Canevas et câbles",
    license_zones: "Zones",
    license_animation: "Animation de route",
    license_routes: "Routes de signal",
    license_text: "Étiquettes texte",
    license_html: "Visionneuse HTML",
    license_patch: "Liste de connexions",
    license_colors: "Couleurs personnalisées",
    license_pdf_free: "Export PDF 75 dpi",
    license_no_subprojects: "Pas de sous-projets",
    license_pro_devices: "Appareils illimités",
    license_subprojects: "Sous-projets",
    license_pdf_pro: "Export PDF 75-600 dpi",
    license_price_note: "Hors taxes • Achat unique",
    license_version_note: "2 activations pour V1.x.x",
    license_free_forever: "Gratuit pour toujours",
    license_download_button: "Télécharger Wires",
    license_download_platforms: "Windows, Mac, Linux",
    license_buy_button: "Acheter Wires Pro",
    checkout_close_label: "Fermer le paiement",
    download_kicker: "Téléchargement",
    download_h2: "Télécharger Wires.",
    download_text: "Choisissez votre plateforme pour accéder aux téléchargements de Wires.",
    download_windows: "Télécharger pour Windows",
    download_macos: "Télécharger pour macOS",
    download_linux: "Télécharger pour Linux",

    contact_kicker: "Contact",
    contact_h2: "Besoin d'aide ou envie de suivre Wires ?",
    contact_text: "Rejoignez d'abord la communauté, ou envoyez un e-mail pour les questions de licence et de support.",
    contact_discord_label: "Discord",
    contact_discord: "Join the Wires Community",
    contact_mail_label: "Mail",
    downloads_h1: "Télécharger Wires",
    downloads_latest_h2: "Télécharger la dernière version de Wires",
    downloads_windows: "Windows",
    downloads_macos_intel: "macOS Intel",
    downloads_macos_apple: "macOS Apple Silicon",
    downloads_linux: "Linux",
    downloads_version: "Version v1.0.0",
    downloads_soon: "Télécharger",
    downloads_example_title: "Projet test",
    downloads_example_text: "Ouvrez ce projet pour tester rapidement Wires.",
    downloads_example_alt: "Projet audiovisuel d’exemple ouvert dans Wires",
    downloads_example_button: "Télécharger le projet test",
    install_macos_title: "Installer Wires sur macOS",
    install_macos_text: "Ouvrez le fichier <strong>.dmg</strong> téléchargé et placez Wires dans Applications. Attendez la fin de la copie, puis lancez le logiciel depuis ce dossier.",
    install_macos_note: "<strong>ℹ️ Première ouverture bloquée ?</strong> Dans Applications, faites un clic droit sur Wires et choisissez Ouvrir. Validez encore une fois dans la fenêtre de confirmation.",
    install_windows_title: "Installer Wires sur Windows",
    install_windows_text: "Double-cliquez sur le fichier <strong>.exe</strong> téléchargé, puis suivez les étapes de l’assistant d’installation de Wires.",
    install_windows_note: "<strong>ℹ️ Windows SmartScreen peut apparaître au premier lancement.</strong> Cliquez sur Informations complémentaires pour faire apparaître Exécuter quand même, puis confirmez.",
    install_linux_title: "Installer Wires sur Linux",
    install_linux_text: "Lancez le fichier <strong>.AppImage</strong> pour installer Wires."
  },
  es: {
    nav_home: "Inicio",
    nav_features: "Funciones",
    nav_try: "Probar Wires",
    nav_license: "Licencia",
    nav_help: "Ayuda",
    nav_contact: "Contacto",
    nav_download: "Descargar Wires",
    footer_terms: "Terminos",
    footer_refunds: "Reembolsos",
    footer_text: "Wires esta publicado por Alkoda.",
    privacy_h1: "Privacidad y cookies",
    privacy_intro: "Esta página explica cómo Wires utiliza las cookies estadísticas y Google Analytics.",
    privacy_analytics_h2: "Google Analytics",
    privacy_analytics_text: "Google Analytics se utiliza únicamente después de aceptar explícitamente las cookies estadísticas. Antes de aceptar, no se carga ningún recurso de Analytics ni se envía ningún dato de Analytics.",
    privacy_data_h2: "Datos de tráfico medidos",
    privacy_data_text: "Tras la aceptación, Analytics mide las visitas y páginas vistas, las páginas consultadas, la duración aproximada de las visitas, la información del dispositivo y navegador, y la procedencia general del tráfico. Wires no utiliza Analytics para recopilar información introducida en el software o la demo en línea.",
    privacy_choice_h2: "Tu elección",
    privacy_choice_text: "Puedes aceptar o rechazar las cookies estadísticas. Puedes retirar o cambiar tu elección en cualquier momento mediante el enlace Configurar cookies del pie de página. Al retirar el consentimiento, Analytics se desactiva y sus cookies se eliminan cuando es técnicamente posible.",
    privacy_duration_h2: "Duración de la elección",
    privacy_duration_text: "Tu aceptación o rechazo se guarda en este dispositivo durante seis meses. Después de ese periodo, se te preguntará de nuevo.",
    privacy_controller_h2: "Responsable del sitio",
    privacy_controller_text: "El responsable del sitio es Alkoda On Air - Christophe Koclejda EI.",

    home_h1: "Diagramas de cableado que todos pueden entender.",
    home_sub: "Wires es el software que transforma sus diagramas de cableado en una documentación audiovisual clara, interactiva y fácil de compartir.",
    home_features_cta: "Ver funciones",
    home_wires_img: "images/ES/wires-es.png",
    home_wires_alt: "Interfaz de Wires con dispositivos y cableado de senal",
    workflow_kicker: "Flujo de trabajo",
    workflow_h2: "Cómo Wires convierte un setup en un plano legible.",
    workflow_text: "En tres pasos, Wires transforma una instalación difícil de leer en un plano claro, animado y fácil de compartir.",
    workflow_device_title: "Añade tus dispositivos",
    workflow_device_text: "Importa una imagen real, recórtala y coloca los puertos exactamente donde están en el equipo.",
    workflow_connect_title: "Conecta los puertos",
    workflow_connect_text: "Crea cables, elige su tipo y color, y organiza el plano con zonas, etiquetas y categorías.",
    workflow_signal_title: "Muestra la señal",
    workflow_signal_text: "Agrupa cables en una ruta, lanza la animación y exporta documentación HTML interactiva o PDF.",
    audience_kicker: "En campo",
    audience_h2: "Cuando el cableado debe entenderse al instante.",
    audience_text: "Wires ayuda a encontrar una avería, modificar una instalación o explicar un sistema sin empezar desde cero. En segundos, el equipo ve por dónde pasa la señal, qué equipos están implicados, qué cables hacen falta y cómo está construido realmente el setup.",
    audience_1: "Encontrar antes una avería de señal",
    audience_2: "Entender el cableado en segundos",
    audience_3: "Prever los cables antes de una instalación",
    audience_4: "Modificar un setup y explicarlo con claridad",
    audience_visual_title: "Diagnóstico, modificación, preparación",
    license_kicker: "Licencia",
    home_license_h2: "Descarga Wires y empieza en modo Free.",
    home_license_text: "El modo Free permite probar el flujo. Pro desbloquea dispositivos ilimitados, exportacion PDF avanzada y subproyectos.",

    features_page_h1: "Comprenda su instalación de un vistazo.",
    features_page_sub: "Cree diagramas de cableado claros con equipos reales, puertos reales y rutas de señal animadas.",
    feature_real_kicker: "Dispositivos reales",
    feature_real_h2: "Trabaja con el equipo que todos reconocen.",
    feature_real_text: "Importa fotos de camaras, mezcladores, interfaces, racks y pantallas. Recorta, limpia y coloca puntos de conexion directamente sobre la imagen para que el plano siga siendo legible.",
    feature_ports_img: "images/ES/configPorts-es.png",
    feature_ports_alt: "Configuracion de puertos en Wires",
    feature_signal_kicker: "Caminos de senal",
    feature_signal_h2: "Sigue la senal por toda la ruta.",
    feature_signal_text: "Agrupa cables en una ruta y anima el camino desde la fuente hasta el destino. Es mas facil explicar una cadena, detectar un corte o mostrar como la senal pasa por convertidores, switches y pantallas.",
    feature_routes_img: "images/ES/routes-es.png",
    feature_routes_alt: "Rutas animadas en Wires",
    feature_control_kicker: "Control",
    feature_control_h2: "Manten los planos complejos comprensibles.",
    feature_control_text: "Usa zonas, categorias, filtros, tipos de cables, colores, etiquetas y minimapa para organizar instalaciones grandes sin perder el contexto tecnico.",
    feature_filters_img: "images/ES/gauche-es.png",
    feature_filters_alt: "Filtros y categorias en Wires",
    features_grid_kicker: "Puntos fuertes",
    features_grid_h2: "Preciso para tecnicos.<br>Claro para todo el equipo.",
    feat_real_title: "Imagenes reales de dispositivos",
    feat_real_text: "Usa fotos del equipo real en lugar de bloques genericos.",
    feat_ports_title: "Puertos fisicos",
    feat_ports_text: "Coloca entradas y salidas exactamente donde estan en el dispositivo.",
    feat_routes_title: "Rutas animadas",
    feat_routes_text: "Anima el camino completo de la senal a traves de varios segmentos de cable.",
    feat_cables_title: "Cables personalizados",
    feat_cables_text: "Crea y estiliza familias de cables para tu flujo de trabajo.",
    feat_zones_title: "Zonas y filtros",
    feat_zones_text: "Aisla rapidamente un rack, una sala, una cadena de camara o un tipo de cable.",
    feat_export_title: "Exportaciones interactivas",
    feat_export_text: "Comparte un visor HTML, documentos PDF y listas de conexiones.",
    feat_offline_title: "Desktop offline",
    feat_offline_text: "Trabaja localmente en Windows o macOS sin depender de la nube.",
    feat_languages_title: "Tres idiomas",
    feat_languages_text: "Usa Wires en ingles, frances o espanol.",
    use_cases_kicker: "Usos",
    use_cases_h2: "Configuraciones diferentes, una misma necesidad:<br>saber por dónde pasa la señal.",
    use_stream_title: "Streamers y estudios",
    use_stream_text: "Prepara un mapa claro de camaras, capturadoras, mezcladores, ordenadores y pantallas antes del directo.",
    use_church_title: "Iglesias y salas",
    use_church_text: "Mantén alineados a los equipos voluntarios con un mapa legible de camaras, proyectores, interfaces de audio y control.",
    use_conf_title: "Salas de conferencia",
    use_conf_text: "Documenta equipos instalados, tomas de pared, racks, pantallas y convertidores para simplificar el soporte.",
    use_small_title: "Pequenas producciones",
    use_small_text: "Crea planos reutilizables para eventos, alquileres, salas de formacion y setups broadcast compactos.",
    visual_slot_label: "Espacio imagen IA",
    visual_slot_text: "Futura ilustracion",
    video_kicker: "Ejemplos en video",
    video_h2: "Capturas cortas haran evidente el flujo de trabajo.",
    video_text: "Estos espacios estan reservados para grabaciones de pantalla del programa real. La idea es mostrar Wires en movimiento, no solo describirlo.",
    video_route_title: "Cable animado",
    video_route_text: "Crea un cable, añádelo a una ruta de señal y lanza la animación para seguir el camino.",
    video_device_title: "Dispositivo y puertos",
    video_device_text: "Añade un dispositivo, ajusta su imagen y coloca los puertos directamente sobre el visual del equipo.",
    video_export_title: "Exportar y compartir",
    video_export_text: "Exporta PDF y un visor HTML interactivo con animacion de senal, descripciones de dispositivos y detalles de rutas de senal.",
    video_export_alt: "Exportacion de Wires a PDF y HTML",
    video_slot_label: "Espacio video",

    try_h1: "Probar Wires en linea.",
    try_sub: "Añade dispositivos, crea cables, coloca textos o zonas y descubre cómo Wires hace que tu cableado sea más legible.",
    try_loading_title: "Cargando la demo de Wires",
    try_loading_text: "Preparando el espacio de trabajo online...",
    try_mobile_title: "Versión de escritorio necesaria",
    try_mobile_text: "La demo online no funciona en móvil. Usa la versión de escritorio para probar Wires.",
    try_box_title: "Demo en construccion",
    try_box_text: "Este espacio esta reservado para la futura interfaz de prueba online de Wires.",
    try_guide_eyebrow: "AYUDA RÁPIDA",
    try_guide_title: "Controles útiles",
    try_guide_commands: "Controles principales",
    try_guide_routes: "Abrir el panel Rutas de señal.",
    try_guide_add: "Abrir el menú de creación:",
    try_guide_add_items: "New Device · New Cable · Add Text Label · Add Zone",
    try_guide_device_edit: "Editar un dispositivo",
    try_guide_device_name: "Hacer clic en el nombre del dispositivo",
    try_guide_device_name_text: "Cambiar el nombre, escribir el nuevo y pulsar Intro.",
    try_guide_device_double_click: "Hacer doble clic en el dispositivo",
    try_guide_device_double_click_text: "Abrir la configuración de imagen para modificar su imagen y sus puertos.",
    try_guide_device_drag: "Arrastrar el dispositivo",
    try_guide_device_drag_text: "Mover el dispositivo por el lienzo.",
    try_guide_device_resize: "Arrastrar su esquina superior izquierda",
    try_guide_device_resize_text: "Cambiar su tamaño proporcionalmente.",
    try_guide_shift_key: "Mayús",
    try_guide_shift_click_text: "Traerlo al frente, delante de cualquier dispositivo superpuesto.",
    try_guide_delete_device_text: "Usar el icono rojo de la papelera del panel Info para eliminar este dispositivo.",
    try_guide_paths: "Editar la ruta de un cable",
    try_guide_drag: "Arrastrar un segmento",
    try_guide_drag_text: "Moverlo perpendicularmente para ajustar la ruta.",
    try_guide_right_click: "Clic derecho cerca de un dispositivo",
    try_guide_right_click_text: "Abrir el menú « Change direction / Create bend ».",
    try_guide_change_dir: "Después de « Change direction »:",
    try_guide_change_dir_text: "cambiar la dirección de salida del segmento.",
    try_guide_add_bend: "Después de « Create bend »:",
    try_guide_add_bend_text: "insertar un codo de 90°.",
    try_guide_multi: "Seleccionar varios dispositivos",
    try_guide_drag_action: "hacer clic y arrastrar",
    try_guide_device_click: "clic en el dispositivo",
    try_guide_alt_drag_text: "Dibujar un rectángulo. Todos los dispositivos que toca quedan seleccionados.",
    try_guide_ctrl_click_text: "Añadir o quitar ese dispositivo de la selección actual.",
    try_guide_selected_click: "Hacer clic en un dispositivo seleccionado",
    try_guide_selected_click_text: "Quitar ese dispositivo de la selección.",
    try_guide_canvas_click: "Hacer clic en el lienzo",
    try_guide_canvas_click_text: "Borrar la selección.",
    try_guide_canvas_drag: "Hacer clic y arrastrar el lienzo",
    try_guide_canvas_drag_text: "Desplazar la vista sin perder la selección.",
    try_guide_delete_key: "Supr",
    try_guide_delete_text: "Eliminar todos los dispositivos seleccionados tras confirmación.",
    try_guide_escape_text: "Borrar la selección.",
    try_guide_image: "Configurar la imagen de un dispositivo",
    try_guide_image_double_click: "Hacer doble clic en un dispositivo",
    try_guide_image_double_click_text: "Abrir la configuración de su imagen.",
    try_guide_zoom: "Zoom",
    try_guide_wheel: "Rueda del ratón",
    try_guide_wheel_text: "Acercar o alejar alrededor del puntero.",
    try_guide_or: "o",
    try_guide_zoom_keys_text: "Acercar o alejar.",
    try_guide_pinch: "Gesto de pellizco",
    try_guide_pinch_text: "Hacer zoom en una superficie táctil.",
    try_guide_pan: "Desplazar la vista",
    try_guide_right_drag: "Clic derecho y arrastrar",
    try_guide_right_drag_text: "Desplazar incluso sobre un dispositivo.",
    try_guide_space_key: "Espacio",
    try_guide_space_drag_text: "Desplazar la vista.",
    try_guide_left_drag: "Clic izquierdo y arrastrar una zona vacía",
    try_guide_box_select: "Selección rectangular",
    try_guide_full_help: "Abrir la ayuda completa",
    try_guide_new_tab: "(pestaña nueva)",

    license_h1: "Elige los limites adecuados para tus proyectos.",
    license_sub: "Empieza con el modo Free y usa una licencia Pro cuando necesites dispositivos ilimitados, PDF de alta resolucion y subproyectos.",
    license_free_devices: "Hasta 10 dispositivos",
    license_canvas: "Canvas y cables",
    license_zones: "Zonas",
    license_animation: "Animacion de ruta",
    license_routes: "Rutas de senal",
    license_text: "Etiquetas de texto",
    license_html: "Visor HTML",
    license_patch: "Lista de conexiones",
    license_colors: "Colores personalizados",
    license_pdf_free: "Exportacion PDF 75 dpi",
    license_no_subprojects: "Sin subproyectos",
    license_pro_devices: "Dispositivos ilimitados",
    license_subprojects: "Subproyectos",
    license_pdf_pro: "Exportacion PDF 75-600 dpi",
    license_price_note: "Impuestos no incluidos • Pago único",
    license_version_note: "2 activaciones para V1.x.x",
    license_free_forever: "Gratis para siempre",
    license_download_button: "Descargar Wires",
    license_download_platforms: "Windows, Mac, Linux",
    license_buy_button: "Comprar Wires Pro",
    checkout_close_label: "Cerrar el pago",
    download_kicker: "Descarga",
    download_h2: "Descargar Wires.",
    download_text: "Elige tu plataforma para acceder a las descargas de Wires.",
    download_windows: "Descargar para Windows",
    download_macos: "Descargar para macOS",
    download_linux: "Descargar para Linux",

    contact_kicker: "Contacto",
    contact_h2: "Necesitas ayuda o quieres seguir Wires?",
    contact_text: "Unete primero a la comunidad, o envia un e-mail para preguntas de licencia y soporte.",
    contact_discord_label: "Discord",
    contact_discord: "Join the Wires Community",
    contact_mail_label: "Mail",
    downloads_h1: "Descargar Wires",
    downloads_latest_h2: "Descargar la última versión de Wires",
    downloads_windows: "Windows",
    downloads_macos_intel: "macOS Intel",
    downloads_macos_apple: "macOS Apple Silicon",
    downloads_linux: "Linux",
    downloads_version: "Version v1.0.0",
    downloads_soon: "Descargar",
    downloads_example_title: "Proyecto de prueba",
    downloads_example_text: "Abra este proyecto para probar Wires rápidamente.",
    downloads_example_alt: "Proyecto audiovisual de ejemplo abierto en Wires",
    downloads_example_button: "Descargar el proyecto de prueba",
    install_macos_title: "Instalar Wires en macOS",
    install_macos_text: "Abre el archivo <strong>.dmg</strong> descargado y coloca Wires en Aplicaciones. Espera a que termine la copia y abre el programa desde esa carpeta.",
    install_macos_note: "<strong>ℹ️ ¿Bloqueado en el primer inicio?</strong> En Aplicaciones, haz clic derecho sobre Wires y elige Abrir. Confirma de nuevo en la ventana que aparece.",
    install_windows_title: "Instalar Wires en Windows",
    install_windows_text: "Haz doble clic en el archivo <strong>.exe</strong> descargado y sigue los pasos del asistente de instalación de Wires.",
    install_windows_note: "<strong>ℹ️ Windows SmartScreen puede aparecer durante el primer inicio.</strong> Pulsa Más información para mostrar Ejecutar de todas formas y confirma.",
    install_linux_title: "Instalar Wires en Linux",
    install_linux_text: "Ejecuta el archivo <strong>.AppImage</strong> para instalar Wires."
  }
};

const FLAGS = {
  en: '<svg width="22" height="15" viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="30" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" stroke-width="4"/><path d="M30,0 V30 M0,15 H60" stroke="#fff" stroke-width="10"/><path d="M30,0 V30 M0,15 H60" stroke="#C8102E" stroke-width="6"/></svg>',
  fr: '<svg width="22" height="15" viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg"><rect width="1" height="2" fill="#002395"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#ED2939"/></svg>',
  es: '<svg width="22" height="15" viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg"><rect width="3" height="2" fill="#AA151B"/><rect y=".5" width="3" height="1" fill="#F1BF00"/></svg>'
};

const LANG_NAMES = { en: "English", fr: "Français", es: "Español" };
const LANG_SHORT = { en: "EN", fr: "FR", es: "ES" };
let currentLang = "en";

function translate(key) {
  return (STRINGS[currentLang] && STRINGS[currentLang][key]) || STRINGS.en[key] || key;
}

function setLang(lang) {
  currentLang = STRINGS[lang] ? lang : "en";
  try { localStorage.setItem("wires_lang", currentLang); } catch (error) {}
  document.documentElement.lang = currentLang;
  if (window.WiresSEO) window.WiresSEO.apply(currentLang);

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.innerHTML = translate(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-src]").forEach((el) => {
    el.setAttribute("src", translate(el.getAttribute("data-i18n-src")));
  });
  document.querySelectorAll("[data-i18n-alt]").forEach((el) => {
    el.setAttribute("alt", translate(el.getAttribute("data-i18n-alt")));
  });
  document.querySelectorAll("[data-lang-page]").forEach((el) => {
    el.classList.toggle("active", el.dataset.langPage === currentLang);
  });

  const flag = document.getElementById("lang-flag");
  const name = document.getElementById("lang-name");
  if (flag) flag.innerHTML = FLAGS[currentLang];
  if (name) name.textContent = LANG_SHORT[currentLang];

  Object.keys(FLAGS).forEach((code) => {
    const dropFlag = document.getElementById(`drop-flag-${code}`);
    const option = document.getElementById(`lang-opt-${code}`);
    if (dropFlag) dropFlag.innerHTML = FLAGS[code];
    if (option) {
      option.classList.toggle("active", code === currentLang);
      option.style.display = code === currentLang ? "none" : "flex";
    }
  });

  const toggle = document.getElementById("lang-toggle");
  if (toggle) toggle.setAttribute("aria-label", `Language: ${LANG_NAMES[currentLang]}`);
}

function closeLangDrop() {
  const drop = document.getElementById("lang-drop");
  const toggle = document.getElementById("lang-toggle");
  if (drop) drop.classList.remove("open");
  if (toggle) toggle.setAttribute("aria-expanded", "false");
}

const PARTIAL_PAGES = new Set([
  "index.html",
  "fonctions.html",
  "try-it.html",
  "downloads.html",
  "terms-of-service-wires.html",
  "refund-policy-wires.html"
]);
let isNavigating = false;
let videoModal = null;
let videoModalPlayer = null;
let managedVideoObserver = null;
let managedVideoResizeTimer = 0;

function getPageName(pathname = location.pathname) {
  const cleanPath = pathname.replace(/\\/g, "/");
  const lastSegment = cleanPath.split("/").filter(Boolean).pop();
  return lastSegment && lastSegment.includes(".") ? lastSegment : "index.html";
}

function isPartialPage(url) {
  return url.origin === location.origin && PARTIAL_PAGES.has(getPageName(url.pathname));
}

function closeMobileMenu() {
  const menuButton = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".site-nav");
  nav?.classList.remove("open");
  menuButton?.setAttribute("aria-expanded", "false");
}

function updateDownloadLinks() {
  document.querySelectorAll(".js-download").forEach((link) => {
    link.href = "downloads.html";
  });
}

function setActiveNavigation(url = new URL(location.href)) {
  const currentPage = getPageName(url.pathname);
  const activeHref = url.hash === "#contact" ? "#contact" : currentPage;

  document.querySelectorAll(".site-nav a").forEach((link) => {
    if (link.classList.contains("nav-cta")) return;

    const href = link.getAttribute("href") || "";
    const linkUrl = new URL(href, location.href);
    const linkPage = getPageName(linkUrl.pathname);
    const linkKey = href === "#contact" || linkUrl.hash === "#contact" ? "#contact" : linkPage;
    const active = linkKey === activeHref;

    link.classList.toggle("active", active);
    if (active) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function scrollToPageTarget(hash) {
  if (!hash) {
    window.scrollTo({ top: 0, behavior: "auto" });
    return;
  }

  const target = document.querySelector(hash);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    window.scrollTo({ top: 0, behavior: "auto" });
  }
}

function updateDocumentMeta(nextDoc) {
  if (nextDoc.title) document.title = nextDoc.title;

  const selectors = [
    'meta[name="description"]',
    'meta[name="robots"]',
    'meta[property="og:title"]',
    'meta[property="og:description"]',
    'meta[property="og:type"]',
    'meta[property="og:url"]',
    'meta[property="og:site_name"]',
    'meta[property="og:locale"]',
    'meta[property="og:image"]',
    'meta[property="og:image:alt"]',
    'meta[name="twitter:card"]',
    'meta[name="twitter:title"]',
    'meta[name="twitter:description"]',
    'meta[name="twitter:image"]',
    'meta[name="twitter:image:alt"]'
  ];
  selectors.forEach((selector) => {
    const currentMeta = document.querySelector(selector);
    const nextMeta = nextDoc.querySelector(selector);
    if (currentMeta && nextMeta) currentMeta.setAttribute("content", nextMeta.getAttribute("content") || "");
  });

  const currentCanonical = document.querySelector('link[rel="canonical"]');
  const nextCanonical = nextDoc.querySelector('link[rel="canonical"]');
  if (currentCanonical && nextCanonical) currentCanonical.setAttribute("href", nextCanonical.getAttribute("href") || "");
  if (window.WiresSEO) window.WiresSEO.apply(currentLang);
}

function initDemoLoaders() {
  document.querySelectorAll("[data-demo-loader]").forEach((wrapper) => {
    if (wrapper.dataset.loaderBound === "1") return;

    const iframe = wrapper.querySelector("iframe");
    if (!iframe) return;

    const mobileBlocked = window.matchMedia("(max-width: 760px)").matches;
    const demoSrc = iframe.dataset.demoSrc || iframe.getAttribute("src");
    wrapper.dataset.loaderBound = "1";

    if (mobileBlocked) {
      iframe.removeAttribute("src");
      wrapper.classList.remove("is-loading");
      wrapper.classList.add("is-mobile-blocked");
      return;
    }

    let isReady = false;
    let pollTimer = 0;

    function onDemoReadyMessage(event) {
      if (event.source !== iframe.contentWindow) return;
      if (event.data?.type !== "wires-demo-ready") return;
      window.requestAnimationFrame(() => window.requestAnimationFrame(markReady));
    }

    const cleanup = () => {
      if (pollTimer) window.clearTimeout(pollTimer);
      window.removeEventListener("message", onDemoReadyMessage);
    };

    const markReady = () => {
      if (isReady) return;
      isReady = true;
      cleanup();
      wrapper.classList.remove("is-loading");
      wrapper.classList.add("is-ready");
    };

    const hasRenderedDemo = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc || doc.readyState === "loading") return false;
        if (doc.body?.dataset.demoReady === "1") return true;

        const canvasRoot = doc.getElementById("canvas-root");
        const renderedNodes = doc.querySelectorAll("#nodes-layer .node").length;
        const renderedCables = doc.querySelectorAll("#cables-svg .cable-visual").length;
        const images = [...doc.querySelectorAll("#nodes-layer .node img")];
        const imagesReady = images.every((img) => img.complete && img.naturalWidth > 0);

        return Boolean(canvasRoot && renderedNodes > 0 && renderedCables > 0 && imagesReady);
      } catch (error) {
        return false;
      }
    };

    const startedAt = Date.now();
    const maxWaitMs = 15000;

    const waitForDemo = () => {
      if (hasRenderedDemo()) {
        window.requestAnimationFrame(() => window.requestAnimationFrame(markReady));
        return;
      }

      if (Date.now() - startedAt > maxWaitMs) {
        markReady();
        return;
      }

      pollTimer = window.setTimeout(waitForDemo, 160);
    };

    window.addEventListener("message", onDemoReadyMessage);
    iframe.addEventListener("load", waitForDemo, { once: true });
    if (!iframe.getAttribute("src") && demoSrc) iframe.setAttribute("src", demoSrc);
    waitForDemo();
  });
}

function initManagedFeatureVideos() {
  const videos = [...document.querySelectorAll(".feature-story video, .video-examples-section .video-link video")];
  if (managedVideoObserver) {
    managedVideoObserver.disconnect();
    managedVideoObserver = null;
  }
  if (!videos.length) return;

  const shouldManage = window.matchMedia("(max-width: 760px), (hover: none) and (pointer: coarse)").matches;
  videos.forEach((video) => {
    video.muted = true;
    video.playsInline = true;
  });

  if (!shouldManage) {
    videos.forEach((video) => {
      video.setAttribute("autoplay", "");
      video.play().catch(() => {});
    });
    return;
  }

  videos.forEach((video) => {
    video.removeAttribute("autoplay");
    video.pause();
  });

  managedVideoObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target;
      if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
        videos.forEach((otherVideo) => {
          if (otherVideo !== video) otherVideo.pause();
        });
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, { rootMargin: "120px 0px", threshold: [0, 0.35, 0.65] });

  videos.forEach((video) => managedVideoObserver.observe(video));
}

function refreshPageContent() {
  updateDownloadLinks();
  setActiveNavigation();
  setLang(currentLang);
  initDemoLoaders();
  initManagedFeatureVideos();
}

async function navigatePartial(url, addHistory = true) {
  if (isNavigating) return;

  const currentUrl = new URL(location.href);
  const sameDocument = currentUrl.pathname === url.pathname && currentUrl.search === url.search;
  if (sameDocument) {
    if (addHistory && url.href !== currentUrl.href) history.pushState({ partial: true }, "", url.href);
    setActiveNavigation(url);
    scrollToPageTarget(url.hash);
    return;
  }

  const currentMain = document.querySelector("main");
  if (!currentMain) {
    location.href = url.href;
    return;
  }

  isNavigating = true;
  closeVideoModal();
  closeMobileMenu();
  closeLangDrop();
  currentMain.classList.add("is-leaving");

  try {
    const response = await fetch(url.href, { headers: { "X-Requested-With": "Wires-Partial" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const nextDoc = new DOMParser().parseFromString(html, "text/html");
    const nextMain = nextDoc.querySelector("main");
    const nextFooter = nextDoc.querySelector(".site-footer");
    if (!nextMain) throw new Error("Missing main element");

    updateDocumentMeta(nextDoc);
    currentMain.replaceWith(nextMain);

    const currentFooter = document.querySelector(".site-footer");
    if (currentFooter && nextFooter) currentFooter.replaceWith(nextFooter);

    if (addHistory) history.pushState({ partial: true }, "", url.href);
    refreshPageContent();
    window.dispatchEvent(new CustomEvent("wires:pageview"));
    requestAnimationFrame(() => scrollToPageTarget(url.hash));
  } catch (error) {
    location.href = url.href;
  } finally {
    isNavigating = false;
  }
}

function sizeVideoModal() {
  if (!videoModal || !videoModalPlayer) return;

  const naturalWidth = videoModalPlayer.videoWidth || 1280;
  const naturalHeight = videoModalPlayer.videoHeight || 720;
  const desiredScale = 0.75;
  const desiredWidth = naturalWidth * desiredScale;
  const desiredHeight = naturalHeight * desiredScale;
  const availableWidth = window.innerWidth - 48;
  const availableHeight = window.innerHeight - 48;
  const fitScale = Math.min(1, availableWidth / desiredWidth, availableHeight / desiredHeight);

  videoModal.style.setProperty("--video-modal-width", `${Math.round(desiredWidth * fitScale)}px`);
  videoModal.style.setProperty("--video-modal-height", `${Math.round(desiredHeight * fitScale)}px`);
}

function closeVideoModal() {
  if (!videoModal || !videoModalPlayer) return;
  videoModal.classList.remove("open");
  videoModal.setAttribute("aria-hidden", "true");
  videoModalPlayer.pause();
  videoModalPlayer.removeAttribute("src");
  videoModalPlayer.load();
}

function bindVideoModalPlayer() {
  if (!videoModalPlayer || videoModalPlayer.dataset.modalBound === "true") return;
  videoModalPlayer.addEventListener("loadedmetadata", sizeVideoModal);
  videoModalPlayer.dataset.modalBound = "true";
}

function ensureVideoModal() {
  videoModal = document.getElementById("video-modal");
  videoModalPlayer = document.getElementById("video-modal-player");

  if (videoModal && videoModalPlayer) {
    bindVideoModalPlayer();
    return true;
  }

  videoModal = document.createElement("div");
  videoModal.className = "video-modal";
  videoModal.id = "video-modal";
  videoModal.setAttribute("aria-hidden", "true");
  videoModal.innerHTML = `
    <div class="video-modal-backdrop" data-video-close></div>
    <div class="video-modal-dialog" role="dialog" aria-modal="true" aria-label="Video player">
      <button class="video-modal-close" type="button" data-video-close aria-label="Close video">x</button>
      <video id="video-modal-player" controls autoplay loop playsinline></video>
    </div>
  `;
  document.body.appendChild(videoModal);
  videoModalPlayer = document.getElementById("video-modal-player");
  bindVideoModalPlayer();
  return Boolean(videoModal && videoModalPlayer);
}

ensureVideoModal();

document.addEventListener("click", (event) => {
  const videoButton = event.target.closest("[data-video-src]");
  if (!videoButton) return;
  if (!ensureVideoModal()) return;

  sizeVideoModal();
  videoModalPlayer.src = videoButton.dataset.videoSrc;
  videoModal.classList.add("open");
  videoModal.setAttribute("aria-hidden", "false");
  videoModalPlayer.play().catch(() => {});
});

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-video-close]")) closeVideoModal();
});

window.addEventListener("resize", () => {
  if (videoModal?.classList.contains("open")) sizeVideoModal();
  if (managedVideoResizeTimer) window.clearTimeout(managedVideoResizeTimer);
  managedVideoResizeTimer = window.setTimeout(initManagedFeatureVideos, 180);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeVideoModal();
});

const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".site-nav");

menuButton?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
});

nav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    closeMobileMenu();
  });
});

document.getElementById("lang-toggle")?.addEventListener("click", (event) => {
  event.stopPropagation();
  const drop = document.getElementById("lang-drop");
  const open = drop?.classList.toggle("open");
  event.currentTarget.setAttribute("aria-expanded", String(open));
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

document.addEventListener("click", (event) => {
  const summary = event.target.closest(".try-guide-group > summary");
  if (!summary) return;

  const currentGroup = summary.parentElement;
  currentGroup
    .closest(".try-guide-menu-list")
    ?.querySelectorAll(".try-guide-group[open]")
    .forEach((group) => {
      if (group !== currentGroup) group.removeAttribute("open");
    });
});

document.addEventListener("click", (event) => {
  const directDownload = event.target.closest("a[data-direct-download]");
  if (!directDownload) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  event.preventDefault();

  fetch(directDownload.href)
    .then((response) => {
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);
      return response.blob();
    })
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob);
      const fileLink = document.createElement("a");
      fileLink.href = objectUrl;
      fileLink.download = directDownload.getAttribute("download") || "Wires-example-project.wires";
      fileLink.hidden = true;
      document.body.appendChild(fileLink);
      fileLink.click();
      fileLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    })
    .catch(() => {
      window.location.assign(directDownload.href);
    });
});

document.addEventListener("click", (event) => {
  const downloadButton = event.target.closest("a[data-download-url]");
  if (!downloadButton) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const guideHref = downloadButton.getAttribute("href") || "";
  const downloadUrl = downloadButton.dataset.downloadUrl;
  if (!guideHref.startsWith("#") || !downloadUrl) return;

  event.preventDefault();

  const guideUrl = new URL(guideHref, location.href);
  if (guideUrl.href !== location.href) {
    history.pushState({ partial: true }, "", guideUrl.href);
  }
  scrollToPageTarget(guideUrl.hash);

  const fileLink = document.createElement("a");
  fileLink.href = downloadUrl;
  fileLink.download = downloadButton.dataset.downloadFilename || "";
  fileLink.hidden = true;
  document.body.appendChild(fileLink);
  fileLink.click();
  fileLink.remove();
});

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");
  if (!link) return;
  const rawHref = link.getAttribute("href").trim();
  if (!rawHref || rawHref === "#") return;
  if (location.protocol === "file:") return;
  if (link.target || link.hasAttribute("download")) return;
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const url = new URL(rawHref, location.href);
  if (!isPartialPage(url)) return;

  event.preventDefault();
  navigatePartial(url);
});

window.addEventListener("popstate", () => {
  const url = new URL(location.href);
  if (location.protocol === "file:" || !isPartialPage(url)) return;
  navigatePartial(url, false);
});

(function initLang() {
  let lang;
  try { lang = localStorage.getItem("wires_lang"); } catch (error) {}
  if (!lang) {
    const browserLang = navigator.language || "en";
    lang = browserLang.startsWith("fr") ? "fr" : browserLang.startsWith("es") ? "es" : "en";
  }
  setLang(lang);
  refreshPageContent();
})();
