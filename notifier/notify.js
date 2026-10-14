// Envoie un rappel WhatsApp listant les trades « En cours » (WhatsApp Cloud API de Meta).
// Lit les réglages enregistrés dans l'onglet « Notifications » du carnet (journals/{uid}.state.meta.notif).
// Variables d'environnement (secrets GitHub) :
//   FIREBASE_SERVICE_ACCOUNT  JSON complet du compte de service Firebase
//   WA_TOKEN                  jeton d'accès permanent WhatsApp Cloud API
//   WA_PHONE_NUMBER_ID        identifiant du numéro émetteur (Meta for Developers)
//   WA_TEMPLATE               nom du modèle approuvé (1 variable {{1}} dans le corps)
//   WA_LANG                   code langue du modèle (défaut : fr)
//   DRY_RUN=1                 affiche les messages sans les envoyer
const admin = require("firebase-admin");

const DRY = process.env.DRY_RUN === "1";
const LANG = process.env.WA_LANG || "fr";

function need(name) {
  if (!process.env[name]) { console.error("Variable manquante : " + name); process.exit(1); }
  return process.env[name];
}

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(need("FIREBASE_SERVICE_ACCOUNT"))) });
const db = admin.firestore();

function openTrades(state) {
  const out = [];
  (state.accounts || []).forEach((a) => {
    (a.trades || []).forEach((t) => {
      if (t.observation === true || t.status === "observation") return;
      if (t.status === "en_cours") {
        out.push((a.name || "Compte") + " : " + (t.pair || "?") + " " + (t.direction === "vente" ? "vente" : "achat") + " (" + (t.date || "?") + ")");
      }
    });
  });
  return out;
}

// Les paramètres d'un modèle WhatsApp n'acceptent ni retour à la ligne ni longues séries d'espaces.
function buildText(list) {
  const head = list.length + " trade" + (list.length > 1 ? "s" : "") + " en cours a la cloture";
  const body = list.slice(0, 8).join(" | ") + (list.length > 8 ? " | +" + (list.length - 8) + " autres" : "");
  return (head + " : " + body).replace(/\s+/g, " ").slice(0, 900);
}

async function send(phone, text) {
  const to = phone.replace(/^\+/, "");
  if (DRY) { console.log("[DRY_RUN] ->", to, ":", text); return; }
  const url = "https://graph.facebook.com/v21.0/" + need("WA_PHONE_NUMBER_ID") + "/messages";
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: "Bearer " + need("WA_TOKEN"), "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: need("WA_TEMPLATE"),
        language: { code: LANG },
        components: [{ type: "body", parameters: [{ type: "text", text }] }],
      },
    }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error("WhatsApp API " + res.status + " : " + body);
  console.log("Envoyé à ***" + to.slice(-4));
}

(async () => {
  const snap = await db.collection("journals").get();
  let sent = 0, failed = 0;
  for (const doc of snap.docs) {
    const st = (doc.data() || {}).state;
    const n = st && st.meta && st.meta.notif;
    if (!n || !n.enabled || !/^\+[1-9]\d{7,14}$/.test(n.phone || "")) continue;
    const list = openTrades(st);
    if (!list.length) { console.log("Aucun trade en cours : rien à envoyer."); continue; }
    try { await send(n.phone, buildText(list)); sent++; }
    catch (e) { failed++; console.error(String(e.message || e)); }
  }
  console.log("Terminé : " + sent + " envoyé(s), " + failed + " échec(s).");
  if (failed) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
