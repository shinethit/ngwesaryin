import { db } from './src/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function run() {
  console.log('Fetching users using app db config...');
  const coll = collection(db, 'users');
  try {
    const snap = await getDocs(coll);
    console.log(`Successfully fetched ${snap.size} users using app db!`);
    snap.forEach(d => {
      console.log(`- User: ${d.id} =>`, d.data());
    });
  } catch (e) {
    console.error('Fetch error:', e);
  }
}
run();
