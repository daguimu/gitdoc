export const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp', '.avif'];
export const VIDEO_EXT = ['.mp4', '.webm', '.mov', '.avi'];
export const AUDIO_EXT = ['.mp3', '.wav', '.ogg', '.flac', '.aac'];
export const PDF_EXT = ['.pdf'];

const EXTRA_PREVIEW_ONLY_EXT = [
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.exe', '.dll', '.so', '.dylib', '.wasm',
  '.ttf', '.otf', '.woff', '.woff2',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
];

export function getExt(path: string): string {
  const dot = path.lastIndexOf('.');
  return dot >= 0 ? path.slice(dot).toLowerCase() : '';
}

export function isPreviewOnly(path: string): boolean {
  const ext = getExt(path);
  return [...IMAGE_EXT, ...VIDEO_EXT, ...AUDIO_EXT, ...PDF_EXT, ...EXTRA_PREVIEW_ONLY_EXT].includes(ext);
}
