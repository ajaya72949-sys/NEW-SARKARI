// Firebase Firestore sync for the site's existing localStorage-based editors.
(() => {
  const config = {
    apiKey: 'AIzaSyCWG55bgquH4fo1Xf9pqBfoQkcy9cMzcXc',
    authDomain: 'new-sarkari-updates.firebaseapp.com',
    projectId: 'new-sarkari-updates',
    storageBucket: 'new-sarkari-updates.firebasestorage.app',
    messagingSenderId: '537379072099',
    appId: '1:537379072099:web:6df3d6ded66b06c59b7056',
    measurementId: 'G-QQGR1ZYD4C'
  };
  const localSetItem = Storage.prototype.setItem;
  const localRemoveItem = Storage.prototype.removeItem;
  const panel = document.querySelector('.admin-page');
  let auth;
  let database;
  let status;
  let signedIn = false;
  let ready = false;

  const report = (message) => {
    if (status) status.textContent = message;
  };

  if (panel) {
    const box = document.createElement('section');
    box.className = 'firebase-admin-login';
    box.innerHTML = '<h2>Firebase cloud saving</h2><p>Sign in with your Firebase admin account to publish and sync saved changes for all visitors.</p><form><label>Admin email<input type="email" name="email" autocomplete="username" required></label><label>Password<input type="password" name="password" autocomplete="current-password" required></label><div><button type="submit">Sign in</button><button type="button" data-signout hidden>Sign out</button></div></form><p role="status" aria-live="polite"></p>';
    const note = panel.querySelector('.admin-storage-note');
    panel.insertBefore(box, note ? note.nextSibling : panel.firstChild);
    status = box.querySelector('[role="status"]');
    box.querySelector('form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      report('Signing in…');
      try {
        await window.siteCloudReady;
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        await auth.signInWithEmailAndPassword(form.elements.email.value.trim(), form.elements.password.value);
        form.elements.password.value = '';
      } catch (error) {
        report(`Sign-in failed: ${error.message}`);
      } finally {
        button.disabled = false;
      }
    });
    box.querySelector('[data-signout]').addEventListener('click', () => auth.signOut());
  }

  try {
    if (!window.firebase) throw new Error('Firebase SDK did not load.');
    const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(config);
    auth = firebase.auth(app);
    database = firebase.firestore(app);

    const writeToCloud = (key, value) => {
      if (!ready || !signedIn || key.includes('/')) return;
      database.collection('browserData').doc(key).set({ value }).catch((error) => {
        report(`Cloud sync failed: ${error.message}`);
      });
    };

    Storage.prototype.setItem = function (key, value) {
      localSetItem.call(this, key, value);
      if (this === localStorage) writeToCloud(String(key), String(value));
    };
    Storage.prototype.removeItem = function (key) {
      localRemoveItem.call(this, key);
      if (this === localStorage && ready && signedIn && !String(key).includes('/')) {
        database.collection('browserData').doc(String(key)).delete().catch((error) => {
          report(`Cloud sync failed: ${error.message}`);
        });
      }
    };

    window.siteCloudReady = (async () => {
      let changed = false;
      try {
        const snapshot = await database.collection('browserData').get();
        snapshot.forEach((document) => {
          const value = document.data().value;
          if (typeof value !== 'string') return;
          if (localStorage.getItem(document.id) !== value) {
            localSetItem.call(localStorage, document.id, value);
            changed = true;
          }
        });
      } catch (error) {
        report(`Firebase is not connected yet: ${error.message} Local saving is still available.`);
      }
      ready = true;
      auth.onAuthStateChanged(async (user) => {
        signedIn = Boolean(user);
        const signInButton = panel && panel.querySelector('form [type="submit"]');
        const signOutButton = panel && panel.querySelector('[data-signout]');
        if (signInButton) signInButton.hidden = signedIn;
        if (signOutButton) signOutButton.hidden = !signedIn;
        if (user) {
          report(`Signed in as ${user.email || 'admin'}. Syncing saved site data…`);
          const jobs = [];
          for (let index = 0; index < localStorage.length; index += 1) {
            const key = localStorage.key(index);
            if (key && !key.includes('/')) {
              jobs.push(database.collection('browserData').doc(key).set({ value: localStorage.getItem(key) || '' }));
            }
          }
          try {
            await Promise.all(jobs);
            report(`Signed in as ${user.email || 'admin'}. Site data is synced to Firebase.`);
          } catch (error) {
            report(`Cloud sync failed: ${error.message}`);
          }
        } else if (ready) {
          report('Not signed in. Changes stay on this device until you sign in to sync them.');
        }
      });
      if (changed) window.location.reload();
    })();
  } catch (error) {
    window.siteCloudReady = Promise.resolve();
    report(`Firebase is unavailable: ${error.message} Local saving is still available.`);
  }
})();
