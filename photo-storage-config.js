// Enable only after the separate photo service has been deployed and checked.
// These settings are public. API keys/secrets belong only in Worker secrets.
export const photoStorageConfig = Object.freeze({
    enabled: false,
    cloudName: 'salatmdv',
    uploadPreset: 'ml_default',
    serviceUrl: 'https://rehaan-student-photos.daraashiq9055.workers.dev'
});
