/**
 * admin.js — Admin Panel Logic
 * CONNECTS : pages/admin.html
 * PURPOSE  : Tab switching, file upload preview, Firestore writes.
 * TODO     : Add Firebase Auth role check (admin only).
 *            Implement file upload to Firebase Storage.
 *            Implement Firestore writes for signs and questions.
 */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // Tab switching
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('admin-tab--active'));
      document.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');
      tab.classList.add('admin-tab--active');
      document.getElementById(`tab-${tab.dataset.tab}`).style.display = 'block';
    });
  });

  // Image preview
  document.getElementById('sign-image')?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const preview = document.getElementById('image-preview');
    const reader  = new FileReader();
    reader.onload = ev => {
      preview.innerHTML = `<img src="${ev.target.result}" style="max-height:200px;border-radius:8px;" />`;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  });
});

window.uploadSign = function() {
  // TODO: validate fields, upload image & video to Firebase Storage,
  //       then write sign document to Firestore.
  alert('Upload logic not yet implemented — connect Firebase Storage.');
};

window.saveQuestion = function() {
  // TODO: validate fields, write question to Firestore "questions" collection.
  alert('Question save not yet implemented — connect Firestore.');
};
