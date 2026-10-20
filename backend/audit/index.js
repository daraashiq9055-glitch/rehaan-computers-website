import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {onDocumentWrittenWithAuthContext} from 'firebase-functions/v2/firestore';
import {defineString} from 'firebase-functions/params';
import {recordAudit} from './audit.js';

initializeApp();
const region=defineString('AUDIT_REGION',{description:'Region compatible with the existing Firestore database location. Confirm in the Firebase console before deployment.'});

export const applicationAudit=onDocumentWrittenWithAuthContext({
  document:'applications/{applicationId}',region,retry:true,
  maxInstances:2,concurrency:10,memory:'256MiB',timeoutSeconds:60
},event=>recordAudit(event,{
  create:(id,payload)=>getFirestore().collection('applicationAudit').doc(id).create(payload)
}));
