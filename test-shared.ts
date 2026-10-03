import { db } from './src/lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

async function run() {
  const coll = collection(db, 'sharedWallets');
  try {
    const snap = await getDocs(coll);
    console.log("Shared wallets count:", snap.size);
    snap.forEach(d => {
      console.log(d.id, "=>", d.data());
    });
  } catch (e) {
    console.error(e);
  }
}
run();
