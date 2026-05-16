const videoFileExtensions = [".mp4", ".m4v", ".mov", ".webm", ".ogg"];

export function isVideoUrl(url: string) {
  const path = url.split(/[?#]/)[0].toLowerCase();

  return videoFileExtensions.some((extension) => path.endsWith(extension));
}
