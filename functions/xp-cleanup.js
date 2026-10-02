/**
 * functions/xp-cleanup.js — removes a learner's XP / progress data.
 *   deleteXpData(uid)              DELETE ACCOUNT: XP state, leaderboard row, game session, audit events.
 *   deleteProgressData(uid)        userProgress / userProgressV2 / userGame (siblings of users/{uid}, so
 *                                  recursiveDelete(users/{uid}) never touches them).
 *   resetLearnerProgressData(uid)  RESET PROGRESS: keeps Auth + users/{uid}; wipes XP + progress; keeps audit events.
 * Kept out of xp.js so nothing but real Cloud Functions is exported from there.
 */
'use strict';
const admin = require('firebase-admin');
const db = () => admin.firestore();

/** Live XP state: ledger, leaderboard row, open game session. Used by RESET and DELETE. */
async function deleteXpState(uid) {
  await Promise.all([`xpState/${uid}`, `publicProfiles/${uid}`, `xpSessions/${uid}`].map((p) => db().doc(p).delete()));
}

/** Audit rows. DELETE ACCOUNT only; a progress reset keeps them. */
async function deleteXpEvents(uid) {
  for (;;) {                                   // xpEvents can exceed one batch for a heavy user
    const ev = await db().collection('xpEvents').where('uid', '==', uid).limit(400).get();
    if (ev.empty) return;
    const batch = db().batch(); ev.docs.forEach((d) => batch.delete(d.ref)); await batch.commit();
    if (ev.size < 400) return;
  }
}

/** Learning-progress docs keyed by uid. */
async function deleteProgressData(uid) {
  await Promise.all(['userProgress', 'userProgressV2', 'userGame'].map((c) => db().doc(`${c}/${uid}`).delete()));
}

/** DELETE ACCOUNT: unchanged behaviour. */
async function deleteXpData(uid) { await deleteXpState(uid); await deleteXpEvents(uid); }

/** RESET PROGRESS: marker is written LAST so clients only see it once the data is gone. */
async function resetLearnerProgressData(uid) {
  await deleteXpState(uid);
  await deleteProgressData(uid);
  await db().doc(`users/${uid}`).update({ progressResetAt: Date.now() })
    .catch((e) => { if (e.code !== 5) throw e; });   // 5 = NOT_FOUND: profile already gone, xp.js reconcile handles it
}

module.exports = { deleteXpData, deleteProgressData, resetLearnerProgressData };
