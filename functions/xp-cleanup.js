'use strict';
const admin = require('firebase-admin');
const db = () => admin.firestore();

async function deleteXpState(uid) {
  await Promise.all([`xpState/${uid}`, `publicProfiles/${uid}`, `xpSessions/${uid}`].map((p) => db().doc(p).delete()));
}

async function deleteXpEvents(uid) {
  for (;;) {
    const ev = await db().collection('xpEvents').where('uid', '==', uid).limit(400).get();
    if (ev.empty) return;
    const batch = db().batch(); ev.docs.forEach((d) => batch.delete(d.ref)); await batch.commit();
    if (ev.size < 400) return;
  }
}

async function deleteProgressData(uid) {
  await Promise.all(['userProgress', 'userProgressV2', 'userGame'].map((c) => db().doc(`${c}/${uid}`).delete()));
}

async function deleteLearnerSurveyData(uid) {
  for (;;) {
    const surveys = await db().collection('surveys').where('userId', '==', uid).limit(400).get();
    if (surveys.empty) return;
    const batch = db().batch();
    surveys.docs.forEach((survey) => batch.delete(survey.ref));
    await batch.commit();
    if (surveys.size < 400) return;
  }
}

async function deleteXpData(uid) {
  await Promise.all([deleteXpState(uid), deleteXpEvents(uid), deleteLearnerSurveyData(uid)]);
}

async function resetLearnerProgressData(uid) {
  await deleteXpState(uid);
  await deleteProgressData(uid);
  await db().doc(`users/${uid}`).update({ progressResetAt: Date.now() })
    .catch((e) => { if (e.code !== 5) throw e; });
}

module.exports = { deleteXpData, deleteProgressData, resetLearnerProgressData };
