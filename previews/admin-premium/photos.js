// Preview crops stay in memory as inline images. No Cloudinary/Worker connection.
export const photoStorageConfig = {enabled: false, cloudName: '', serviceUrl: ''};
export const isPrivateStudentPhoto = () => false;
export const storeStudentPhoto = async photo => photo || '';
export const clearPhotoSession = () => {};
export async function displayStudentPhoto(image, photo) {
  if (!image || !photo) return false;
  image.dataset.photoReference = photo;
  image.src = photo;
  image.dataset.photoState = 'ready';
  return true;
}
