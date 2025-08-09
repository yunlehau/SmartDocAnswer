export const base64ToUrl = (base64Data, mimeType = "audio/mpeg") => {
  const base64WithoutPrefix = base64Data.split(",")[1] || base64Data;

  const byteCharacters = atob(base64WithoutPrefix);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);

  const blob = new Blob([byteArray], { type: mimeType });

  return URL.createObjectURL(blob);
}