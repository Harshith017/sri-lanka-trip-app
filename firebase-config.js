// Firebase project config for "Sri Lanka Trip" (project ID: sri-lanka-trip-466a4)
// This is a public client identifier, not a secret — safe to ship in the page.
// Access control is enforced by Firebase Authentication + Firestore Security Rules,
// not by hiding this object.
var firebaseConfig = {
  apiKey: "AIzaSyAoZH78yf5mPfptEGfWaOSN4Ur-iugRSBU",
  authDomain: "sri-lanka-trip-466a4.firebaseapp.com",
  projectId: "sri-lanka-trip-466a4",
  storageBucket: "sri-lanka-trip-466a4.firebasestorage.app",
  messagingSenderId: "108102638292",
  appId: "1:108102638292:web:a47eb9badb8f8dcf663941"
};

firebase.initializeApp(firebaseConfig);

// Address of the push-notification worker (see push-worker/README.md), e.g.
// "https://project-w-push.yourname.workers.dev". Leave empty to hide
// notifications in the app.
var PUSH_WORKER_URL = "";
