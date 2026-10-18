import { photoStorageConfig as config } from './photo-storage-config.js';
const uploaded = new Map();
const privateViews = new Map();
const objectUrls = new Set();
let generation = 0;

export function isPrivateStudentPhoto(value) {
    return typeof value === 'string' && value.startsWith(`https://res.cloudinary.com/${config.cloudName}/image/authenticated/`);
}
function serviceUrl(path) {
    const url = new URL(config.serviceUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Photo service address is not configured correctly.');
    return url.origin + path;
}
async function photoResponse(response) {
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Could not store the photograph. Please try later.');
    }
    return response;
}
export async function storeStudentPhoto(dataUrl, getToken) {
    if (!dataUrl || !config.enabled || isPrivateStudentPhoto(dataUrl)) return dataUrl || '';
    return uploadStudentPhoto(dataUrl, getToken);
}
async function uploadStudentPhoto(dataUrl, getToken) {
    if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(dataUrl) || dataUrl.length > 500000) throw new Error('Choose a valid cropped JPG photograph.');
    if (uploaded.has(dataUrl)) return uploaded.get(dataUrl);
    const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]),char => char.charCodeAt(0));
    const headers = {'Content-Type':'image/jpeg'};
    const epoch = generation;
    if (getToken) headers.Authorization = `Bearer ${await getToken()}`;
    let response;
    try {
        response = await fetch(serviceUrl('/upload'),{method:'POST',headers,body:bytes,signal:AbortSignal.timeout(35000)});
    } catch { throw new Error('Could not contact photo storage. Your form is still here; no payment was started. Please try later.'); }
    const data = await (await photoResponse(response)).json();
    const pattern = /^v[0-9]{1,15}\/student-photos\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$/;
    const prefix = `https://res.cloudinary.com/${config.cloudName}/image/authenticated/`;
    if (!isPrivateStudentPhoto(data.photo) || !pattern.test(data.photo.slice(prefix.length))) throw new Error('Photo storage returned an invalid reference.');
    if (epoch !== generation) throw new Error('Session changed. Please sign in again before saving.');
    // Keep successful uploads for retrying a failed Firestore save, never to localStorage.
    // Retain only the latest crop instead of accumulating student photos in memory.
    uploaded.clear(); uploaded.set(dataUrl,data.photo);
    // The authenticated admin already has the exact uploaded crop. Use its
    // local object URL immediately instead of waiting for a second private GET.
    // Public applicants never seed administrator viewing, and sign-out revokes it.
    if (getToken) {
        const url = URL.createObjectURL(new Blob([bytes],{type:'image/jpeg'}));
        objectUrls.add(url); privateViews.set(data.photo,Promise.resolve(url));
    }
    return data.photo;
}
export async function displayStudentPhoto(image, photo, getToken) {
    if (!image) return false;
    image.dataset.photoReference = photo;
    if (!isPrivateStudentPhoto(photo)) { image.src = photo; image.dataset.photoState='ready'; return true; }
    image.dataset.photoState='loading';
    image.removeAttribute('src');
    const epoch = generation;
    try {
        let pending = privateViews.get(photo);
        if (!pending) {
            pending = (async () => {
                const token = await getToken();
                const response = await photoResponse(await fetch(serviceUrl('/photo')+'?photo='+encodeURIComponent(photo),{
                    headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(20000),cache:'no-store'
                }));
                if (response.headers.get('Content-Type')?.split(';')[0] !== 'image/jpeg') throw new Error('Invalid photo response.');
                const blob = await response.blob();
                if (epoch !== generation) throw new Error('Session ended.');
                const url = URL.createObjectURL(blob); objectUrls.add(url);return url;
            })();
            privateViews.set(photo,pending);
        }
        const url = await pending;
        if (epoch === generation && image.dataset.photoReference === photo) { image.src = url; image.alt = 'Student photograph'; image.dataset.photoState='ready'; return true; }
        return false;
    } catch {
        privateViews.delete(photo);
        if (epoch === generation && image.dataset.photoReference === photo) {
            image.dataset.photoState='error';
            image.alt = 'Photograph unavailable — select Retry photo to try again.';
        }
        return false;
    }
}
export function clearPhotoSession() {
    generation++;
    uploaded.clear(); privateViews.clear();
    for (const url of objectUrls) URL.revokeObjectURL(url);
    objectUrls.clear();
    if (typeof document !== 'undefined') {
        for (const image of document.querySelectorAll('img[data-photo-reference]')) {
            if (isPrivateStudentPhoto(image.dataset.photoReference)) image.removeAttribute('src');
        }
    }
}
