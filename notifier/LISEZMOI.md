# Rappel WhatsApp des trades « En cours » (22h00 UTC)

Le carnet (GitHub Pages) enregistre ton numéro dans l'onglet **Notifications**.
L'envoi est fait par ce script, lancé chaque jour ouvré à 22h00 UTC par GitHub Actions
(`.github/workflows/whatsapp-notify.yml`). Le jeton WhatsApp ne doit jamais être mis dans `index.html`.

## 1. WhatsApp Cloud API (Meta)
1. Crée une app sur developers.facebook.com → produit **WhatsApp**.
2. Note l'**identifiant du numéro** (Phone number ID) et génère un **jeton permanent** (utilisateur système).
3. Ajoute ton numéro comme destinataire autorisé (obligatoire avec le numéro de test).
4. Crée un **modèle de message** (catégorie Utilitaire), langue français, nom par ex. `rappel_trades`,
   corps : `Carnet de trading : {{1}}` — puis attends son approbation.

## 2. Compte de service Firebase
Console Firebase → Paramètres du projet → Comptes de service → **Générer une clé privée** (fichier JSON).

## 3. Secrets GitHub (Settings → Secrets and variables → Actions)
- `FIREBASE_SERVICE_ACCOUNT` : tout le contenu du JSON
- `WA_TOKEN` : jeton permanent
- `WA_PHONE_NUMBER_ID` : identifiant du numéro émetteur
- `WA_TEMPLATE` : nom du modèle (ex. `rappel_trades`)

## 4. Test
Onglet Actions → « Rappel WhatsApp… » → **Run workflow**. Pour voir le message sans l'envoyer,
lance en local : `DRY_RUN=1 FIREBASE_SERVICE_ACCOUNT="$(cat cle.json)" node notify.js`.
