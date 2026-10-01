/**
 * functions/xp-cleanup.js — removes a learner's XP data (used by deleteLearnerAccount in index.js,
 * so a deleted learner also disappears from the leaderboards). Kept out of xp.js so nothing but
 * real Cloud Functions is exported from there.
 */
'use strict';
const admin = require('firebase-admin');

async function deleteXpData(uid) {
  const db = admin.firestore();
  await Promise.all([`xpState/${uid}`, `publicProfiles/${uid}`, `xpSessions/${uid}`].map((p) => db.doc(p).delete()));
  for (;;) {                                   // xpEvents can exceed one batch for a heavy user
    const ev = await db.collection('xpEvents').where('uid', '==', uid).limit(400).get();
    if (ev.empty) return;
    const batch = db.batch(); ev.docs.forEach((d) => batch.delete(d.ref)); await batch.commit();
    if (ev.size < 400) return;
  }
}
module.exports = { deleteXpData };
