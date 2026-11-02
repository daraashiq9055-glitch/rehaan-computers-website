import {SETTINGS_DEFAULTS,validateSettings} from './admin-settings-model.js?v=20261102-settings-1';
let stored=null,readable=false,loadError='';
export function settingsState(){return {stored:structuredClone(stored),readable,error:loadError,values:stored?validateSettings({institute:stored.institute,documents:stored.documents,messages:stored.messages}):structuredClone(SETTINGS_DEFAULTS)};}
export function setSettingsState(value){if(value){validateSettings({institute:value.institute,documents:value.documents,messages:value.messages});if(!Number.isSafeInteger(value.revision)||value.revision<1)throw Error('Saved settings need review.');}stored=structuredClone(value);readable=true;loadError='';}
export function failSettingsState(){stored=null;readable=false;loadError='Shared settings could not be loaded. Refresh to retry. Existing institute defaults are in use; shared changes cannot be saved until access is restored.';}
export function clearSettingsState(){stored=null;readable=false;loadError='';}
export function documentDefaults(kind){if(!stored)return null;const values=settingsState().values;return {paperColor:values.documents[kind].colour,documentProfile:{institute:values.institute,footer:values.documents[kind].footer}};}
export function customMessage(kind,values){if(!stored||!stored.messages[kind])return null;return {template:stored.messages[kind],values:{...values,institute:stored.institute.name}};}
