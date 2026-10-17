// Separate photo service: no payment endpoints, service account or database writes.
const MAX_BYTES = 375000;
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const encoder = new TextEncoder();
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
async function digest(algorithm, value) {
    return new Uint8Array(await crypto.subtle.digest(algorithm, encoder.encode(value)));
}
export async function uploadSignature(params, secret) {
    const text = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
    return [...await digest('SHA-1', text + secret)].map(x => x.toString(16).padStart(2, '0')).join('');
}
export function privatePhotoPath(photo, cloud) {
    const prefix = `https://res.cloudinary.com/${cloud}/image/authenticated/`;
    if (typeof photo !== 'string' || !photo.startsWith(prefix)) throw new HttpError(400, 'Invalid photo reference.');
    const path = photo.slice(prefix.length);
    if (!new RegExp(`^v[0-9]{1,15}/student-photos/${UUID}\\.jpg$`).test(path)) throw new HttpError(400, 'Invalid photo reference.');
    return path;
}
async function deliveryUrl(path, env) {
    const hash = await digest('SHA-1', path.replace(/^v[0-9]+\//, '') + env.CLOUDINARY_API_SECRET);
    const signature = btoa(String.fromCharCode(...hash)).replace(/\+/g, '-').replace(/\//g, '_').slice(0, 8);
    return `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/authenticated/s--${signature}--/${path}`;
}
async function limitedBytes(response, limit) {
    const reader = response.body?.getReader();
    if (!reader) throw new HttpError(400, 'Empty photo.');
    const chunks = []; let size = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) { await reader.cancel(); throw new HttpError(413, 'Photo is too large.'); }
        chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return bytes;
}
export function jpegDimensions(bytes) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
        if (bytes[offset++] !== 255) break;
        while (bytes[offset] === 255) offset++;
        const marker = bytes[offset++];
        if (marker === 218 || marker === 217) break;
        const length = (bytes[offset] << 8) | bytes[offset + 1];
        if (length < 2 || offset + length > bytes.length) break;
        if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker) && length >= 8) {
            return {height:(bytes[offset + 3] << 8) | bytes[offset + 4],width:(bytes[offset + 5] << 8) | bytes[offset + 6]};
        }
        offset += length;
    }
    throw new HttpError(415, 'Invalid JPG photograph.');
}
async function authorizeAdmin(request, env, fetcher) {
    const header = request.headers.get('Authorization') || '';
    if (!/^Bearer [A-Za-z0-9_.-]+$/.test(header) || header.length > 8192) throw new HttpError(401, 'Sign in as an administrator.');
    let uid;
    try {
        const payload = header.slice(7).split('.')[1];
        uid = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).sub;
        if (typeof uid !== 'string' || !uid.length || uid.length > 128) throw Error();
    } catch { throw new HttpError(401, 'Invalid sign-in token.'); }
    // The decoded UID is untrusted. Firestore verifies the token and deployed
    // rules authorize the read; no local JWT decoding grants access.
    const response = await fetcher(`https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/admins/${encodeURIComponent(uid)}`, {
        headers: { Authorization: header }, redirect: 'error', signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new HttpError(response.status === 401 ? 401 : 403, 'Administrator access required.');
    const data = await response.json();
    if (data.fields?.uid?.stringValue !== uid || data.fields?.isAdmin?.booleanValue !== true) throw new HttpError(403, 'Administrator access required.');
}
export async function handleRequest(request, env, fetcher = fetch) {
    const origin = request.headers.get('Origin');
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
    const cors = { 'Vary': 'Origin', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
    if (!origin || !allowed.includes(origin)) return Response.json({error:'Origin not allowed.'}, {status:403,headers:cors});
    cors['Access-Control-Allow-Origin'] = origin;
    const json = (data, status=200) => Response.json(data, {status,headers:cors});
    if (request.method === 'OPTIONS') return new Response(null, {status:204,headers:{...cors,'Access-Control-Allow-Methods':'POST, GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization'}});
    try {
        const url = new URL(request.url);
        if (url.pathname === '/health' && request.method === 'GET') return json({ok:true,configured:Boolean(env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET),uploadProtection:Boolean(env.PHOTO_UPLOAD_LIMITER)});
        if (!env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET || !/^[a-zA-Z0-9_-]+$/.test(env.CLOUDINARY_CLOUD_NAME || '') || !/^[a-zA-Z0-9_-]+$/.test(env.FIREBASE_PROJECT_ID || '')) throw new HttpError(503, 'Photo service is not configured.');
        if (url.pathname === '/upload' && request.method === 'POST') {
            // Rate limiting is mandatory. CORS is not authentication: public
            // admissions need anonymous uploads, and this route is public.
            const ip = request.headers.get('CF-Connecting-IP');
            if (!ip || !env.PHOTO_UPLOAD_LIMITER) throw new HttpError(503, 'Photo upload protection is unavailable.');
            const limit = await env.PHOTO_UPLOAD_LIMITER.limit({key:ip});
            if (!limit.success) throw new HttpError(429, 'Too many photo uploads. Please wait a minute and try again.');
            if (request.headers.has('Authorization')) await authorizeAdmin(request, env, fetcher);
            if (request.headers.get('Content-Type')?.split(';')[0] !== 'image/jpeg') throw new HttpError(415, 'Choose a cropped JPG photograph.');
            if (Number(request.headers.get('Content-Length')) > MAX_BYTES) throw new HttpError(413, 'Photo is too large.');
            const bytes = await limitedBytes(request, MAX_BYTES);
            if (bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255 || bytes.at(-2) !== 255 || bytes.at(-1) !== 217) throw new HttpError(415, 'Invalid JPG photograph.');
            const dimensions = jpegDimensions(bytes);
            if (!dimensions.width || !dimensions.height || dimensions.width > 512 || dimensions.height > 512) throw new HttpError(415, 'Upload a cropped photo no larger than 512 pixels.');
            const publicId = 'student-photos/' + crypto.randomUUID();
            const params = { timestamp:String(Math.floor(Date.now()/1000)), upload_preset:env.CLOUDINARY_UPLOAD_PRESET || 'ml_default',
                public_id:publicId,type:'authenticated',format:'jpg',
                overwrite:'false',use_filename:'false',unique_filename:'true',transformation:'c_limit,w_360,h_360' };
            const body = new FormData();
            for (const [key,value] of Object.entries(params)) body.append(key,value);
            body.append('api_key',env.CLOUDINARY_API_KEY);
            body.append('signature',await uploadSignature(params,env.CLOUDINARY_API_SECRET));
            body.append('file',new Blob([bytes],{type:'image/jpeg'}),'photo.jpg');
            const response = await fetcher(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`, {method:'POST',body,redirect:'error',signal:AbortSignal.timeout(25000)});
            if (!response.ok) throw new HttpError(502, 'Photo storage could not accept the upload. Please try later.');
            const data = await response.json();
            if (data.type !== 'authenticated' || data.resource_type !== 'image' || data.format !== 'jpg' || data.public_id !== publicId || !/^[0-9]{1,15}$/.test(String(data.version))) throw new HttpError(502, 'Photo storage returned an unexpected response.');
            return json({photo:`https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/authenticated/v${data.version}/${publicId}.jpg`});
        }
        if (url.pathname === '/photo' && request.method === 'GET') {
            await authorizeAdmin(request,env,fetcher);
            const path = privatePhotoPath(url.searchParams.get('photo'),env.CLOUDINARY_CLOUD_NAME);
            const response = await fetcher(await deliveryUrl(path,env), {redirect:'error',signal:AbortSignal.timeout(15000)});
            if (!response.ok) throw new HttpError(502, 'Photograph is temporarily unavailable.');
            if (response.headers.get('Content-Type')?.split(';')[0] !== 'image/jpeg') throw new HttpError(502, 'Unexpected photo format.');
            const bytes = await limitedBytes(response,MAX_BYTES);
            return new Response(bytes,{headers:{...cors,'Content-Type':'image/jpeg','Content-Security-Policy':"default-src 'none'"}});
        }
        throw new HttpError(404,'Photo route not found.');
    } catch (error) {
        return json({error:error instanceof HttpError ? error.message : 'Photo service is temporarily unavailable. Please try later.'},error instanceof HttpError ? error.status : 503);
    }
}
export default {fetch(request, env) { return handleRequest(request, env); }};
