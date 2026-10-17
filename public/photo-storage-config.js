// Enabled for preview after the owner confirmed the live upload/private-viewing test.
// These settings are public. API keys/secrets belong only in Worker secrets.
export const photoStorageConfig = Object.freeze({
    enabled: true,
    cloudName: 'salatmdv',
    uploadPreset: 'ml_default',
    serviceUrl: 'https://rehaan-student-photos.daraashiq9055.workers.dev'
});
