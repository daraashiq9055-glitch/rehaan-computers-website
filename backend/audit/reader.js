// Read-only integration for the upgraded dashboard; not imported by the live UI.
// SDK injection keeps this module independently testable with no network access.
export function createAuditReader({db,sdk,identity}) {
  return async function page({applicationId=null,after=null,pageSize=30}={}) {
    const uid=identity()?.uid;if(!uid)throw Error('Sign in as an administrator to read change history.');
    if(!Number.isInteger(pageSize)||pageSize<1||pageSize>100)throw Error('Choose a page size between 1 and 100.');
    if(applicationId!==null&&(typeof applicationId!=='string'||!applicationId||applicationId.includes('/')))throw Error('Invalid student identifier.');
    const constraints=[];
    if(applicationId)constraints.push(sdk.where('applicationId','==',applicationId));
    constraints.push(sdk.orderBy('occurredAt','desc'),sdk.orderBy(sdk.documentId(),'desc'));
    if(after)constraints.push(sdk.startAfter(after));
    constraints.push(sdk.limit(pageSize));
    const result=await sdk.getDocs(sdk.query(sdk.collection(db,'applicationAudit'),...constraints));
    if(identity()?.uid!==uid)throw Error('Your administrator session changed. Reload history.');
    return {entries:result.docs.map(doc=>({id:doc.id,...doc.data()})),cursor:result.docs.at(-1)||null,hasMore:result.docs.length===pageSize};
  };
}
