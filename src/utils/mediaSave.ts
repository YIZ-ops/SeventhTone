import { Capacitor } from "@capacitor/core";
import { Media } from "@capacitor-community/media";

const DEFAULT_ALBUM_NAME = "Seventh Tone";

async function resolveAlbumIdentifier(albumName = DEFAULT_ALBUM_NAME) {
  if (Capacitor.getPlatform() !== "android") return undefined;

  const albums = await Media.getAlbums();
  const existing = albums.albums.find((album) => album.name === albumName);
  if (existing?.identifier) return existing.identifier;

  await Media.createAlbum({ name: albumName });
  const refreshed = await Media.getAlbums();
  return refreshed.albums.find((album) => album.name === albumName)?.identifier;
}

export async function fetchUrlAsDataUrl(url: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read image data."));
    reader.readAsDataURL(blob);
  });
  return base64Data;
}

export async function saveImageToAlbum(options: { path: string; fileName: string; albumName?: string }) {
  const { path, fileName, albumName = DEFAULT_ALBUM_NAME } = options;
  const albumIdentifier = await resolveAlbumIdentifier(albumName);

  if (Capacitor.getPlatform() === "android" && albumIdentifier) {
    return Media.savePhoto({
      path,
      fileName,
      albumIdentifier,
    });
  }

  return Media.savePhoto({
    path,
    fileName,
  });
}

export async function saveRemoteImageToAlbum(options: { imageUrl: string; fileName: string; albumName?: string }) {
  const { imageUrl, fileName, albumName } = options;

  try {
    return await saveImageToAlbum({
      path: imageUrl,
      fileName,
      albumName,
    });
  } catch (error) {
    console.warn("Save via URL failed, retrying with data URL:", error);
    const dataUrl = await fetchUrlAsDataUrl(imageUrl);
    return saveImageToAlbum({
      path: dataUrl,
      fileName,
      albumName,
    });
  }
}

