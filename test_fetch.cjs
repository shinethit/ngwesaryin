const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const firebaseConfig = require('./firebase-applet-config.json');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log('Fetching users from cloud...');
  try {
    const snap = await getDocs(collection(db, 'users'));
    console.log(`Successfully fetched ${snap.docs.length} users!`);
    snap.docs.forEach(doc => {
      console.log(`- User: ${doc.id} =>`, doc.data());
    });
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

run();
