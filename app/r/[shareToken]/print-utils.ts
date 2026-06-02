const PRINT_IMAGE_TIMEOUT_MS = 15000;

function waitForImageToLoad(image: HTMLImageElement) {
  image.loading = "eager";
  image.decoding = "sync";

  if (image.complete && image.naturalWidth > 0) {
    return image.decode?.().catch(() => undefined) ?? Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    let hasSettled = false;

    const settle = () => {
      if (hasSettled) {
        return;
      }

      hasSettled = true;
      window.clearTimeout(timeoutId);
      image.removeEventListener("load", settle);
      image.removeEventListener("error", settle);
      resolve();
    };

    const timeoutId = window.setTimeout(settle, PRINT_IMAGE_TIMEOUT_MS);

    image.addEventListener("load", settle, { once: true });
    image.addEventListener("error", settle, { once: true });

    if (image.src) {
      image.src = image.src;
    }

    image.decode?.().then(settle).catch(() => {
      if (image.complete) {
        settle();
      }
    });
  });
}

function waitForNextFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

export async function prepareReportForPrint(scopeSelector = ".client-report-page") {
  const printScope = document.querySelector(scopeSelector);
  const images = Array.from(
    printScope?.querySelectorAll<HTMLImageElement>("img") ?? []
  );

  await Promise.all(images.map(waitForImageToLoad));
  await document.fonts?.ready;
  await waitForNextFrame();
}
