# Rapport SEO Wires

## Changements

- Métadonnées SEO complètes sur les neuf pages publiques : titre, description, canonical absolue, robots, Open Graph et Twitter.
- Métadonnées adaptées en anglais, français et espagnol par le sélecteur de langue existant, sans modification du contenu visible.
- Données structurées `SoftwareApplication` sur la page d'accueil, limitées aux informations déjà présentes dans le projet.
- Création de `sitemap.xml` pour les neuf pages publiques et de `robots.txt` avec le lien absolu vers le sitemap.
- Ajout d'une page publique de confidentialité et de gestion des cookies, disponible dans les trois langues.
- La démo interne `renderer-web-demo/index.html` reste volontairement en `noindex` et hors du sitemap.

## Limite du SEO multilingue

Le site utilise une URL unique pour les trois langues. Sans URL distincte par langue, les moteurs de recherche ne peuvent pas indexer et cibler séparément chaque version linguistique, et aucun `hreflang` pertinent ne peut être ajouté pour le moment. Les métadonnées adaptées à la langue active restent toutefois un vrai plus pour les visiteurs, le partage social et la cohérence sémantique de la page après sélection de la langue.

## Validation

- HTML contrôlé sans reformatage global et sans changement du contenu visible du `body`.
- JSON-LD contrôlé comme JSON valide et conforme au type `SoftwareApplication`.
- `sitemap.xml` contrôlé comme XML valide avec uniquement des URLs absolues canoniques.
- `robots.txt` contrôlé avec indexation autorisée et déclaration du sitemap.
- Aucun déploiement, commit ou push effectué.
