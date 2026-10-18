export const isPrivateStudentPhoto=value=>typeof value==="string"&&value.includes("/authenticated/");
export async function storeStudentPhoto(value){return value;}
export async function displayStudentPhoto(image,value){if(/^data:image\/(?:png|jpeg|jpg|webp);base64,[A-Za-z0-9+/]+=*$/.test(value||""))image.src=value;else{image.removeAttribute("src");image.alt="Private photo available in the live dashboard";}}
export function clearPhotoSession(){}
