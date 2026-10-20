// Preview service adapter: all authentication and transactions stay in page memory.
// This module never initializes Firebase or makes network requests.
const state = window.__adminPreview;
export const initializeApp = () => ({}), getApps = () => [], getAuth = () => state.auth, getFirestore = () => ({});
export const inMemoryPersistence = {};
export const setPersistence = async () => {};
export const onAuthStateChanged = (_auth, fn) => {
  state.listeners.push(fn);
  queueMicrotask(() => fn(state.auth.currentUser));
  return () => { state.listeners = state.listeners.filter(item => item !== fn); };
};
export const signOut = async () => {
  state.auth.currentUser = null;
  state.listeners.forEach(fn => fn(null));
};
export const signInWithEmailAndPassword = async () => {
  state.auth.currentUser = state.user;
  state.listeners.forEach(fn => fn(state.user));
  return {user: state.user};
};
export const collection = (_db, name) => ({name});
export const doc = (_db, col, id) => ({col, id});
function snapshot(id, data) {
  return {id, exists: () => data !== undefined, data: () => structuredClone(data)};
}
export const getDoc = async ref => snapshot(ref.id, ref.col === 'admins' ? {uid: state.user.uid, isAdmin: true} : state.records[ref.id]);
export const getDocs = async () => {
  const rows = Object.entries(state.records).map(([id, data]) => snapshot(id, data));
  return {empty: !rows.length, forEach: fn => rows.forEach(fn)};
};
let transactionQueue = Promise.resolve();
export const runTransaction = (_db, fn) => {
 const task = transactionQueue.then(async () => {
  if (state.failWrite) throw Object.assign(new Error('Preview permission denied'), {code:'permission-denied'});
  const staged = [];
  const result = await fn({get: getDoc, update: (ref, patch) => staged.push(['update', ref, patch]), set: (ref, data) => staged.push(['set', ref, data]), delete: ref => staged.push(['delete', ref])});
  const next = structuredClone(state.records);
  for (const [kind, ref, data] of staged) {
    if (kind === 'delete') delete next[ref.id];
    else if (kind === 'set') next[ref.id] = structuredClone(data);
    else for (const [path, value] of Object.entries(data)) {
      const keys = path.split('.');
      let target = next[ref.id];
      for (const key of keys.slice(0, -1)) target = target[key] ?? (target[key] = {});
      target[keys.at(-1)] = structuredClone(value);
    }
  }
  state.records = next;
  state.writes.push(...staged.map(([kind, ref, data]) => ({kind, id: ref.id, data})));
  if (state.loseAcknowledgementOnce && staged.length) {state.loseAcknowledgementOnce=false;throw Object.assign(new Error('Connection ended before acknowledgement'),{code:'unavailable'});}
  return result;
 });
 transactionQueue = task.catch(() => {});
 return task;
};
