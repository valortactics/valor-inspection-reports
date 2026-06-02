const PRINT_IMAGE_TIMEOUT_MS = 15000;
const PRINT_IMAGE_TARGET_BYTES = 500 * 1024;
const PRINT_IMAGE_MAX_EDGE = 1600;
const PRINT_IMAGE_MIN_EDGE = 700;
const PRINT_IMAGE_QUALITY_STEPS = [0.86, 0.78, 0.7, 0.62, 0.54, 0.46, 0.38];

type PreparedPrintImage = {
  cleanup: () => void;
};

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

function waitForCanvasImageToLoad(image: HTMLImageElement) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      image.removeEventListener("load", handleLoad);
      image.removeEventListener("error", handleError);
    };
    const handleLoad = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("Unable to load image for print compression"));
    };

    image.addEventListener("load", handleLoad, { once: true });
    image.addEventListener("error", handleError, { once: true });
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
) {
  return new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob(resolve, type, quality);
    } catch {
      resolve(null);
    }
  });
}

function getScaledImageSize(width: number, height: number, maxEdge: number) {
  const largestEdge = Math.max(width, height);

  if (largestEdge <= maxEdge) {
    return { width, height };
  }

  const scale = maxEdge / largestEdge;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function getImageSource(image: HTMLImageElement) {
  return image.currentSrc || image.src;
}

function isBrandImage(image: HTMLImageElement) {
  const source = getImageSource(image);

  if (!source) {
    return true;
  }

  try {
    const url = new URL(source, window.location.href);
    const optimizedSource = url.searchParams.get("url") ?? source;

    return optimizedSource.includes("/brand/");
  } catch {
    return source.includes("/brand/");
  }
}

function shouldCompressImageForPrint(image: HTMLImageElement) {
  const source = getImageSource(image);

  return Boolean(source) && !source.startsWith("blob:") && !isBrandImage(image);
}

async function loadImageForCanvas(source: string) {
  const image = new Image();

  image.crossOrigin = "anonymous";
  image.decoding = "async";
  image.src = source;

  if (!image.complete) {
    await waitForCanvasImageToLoad(image);
  }

  await image.decode?.().catch(() => undefined);

  return image;
}

async function getCompressedImageBlob(image: HTMLImageElement) {
  const source = getImageSource(image);

  if (!source) {
    return null;
  }

  const canvasImage = await loadImageForCanvas(source);
  const originalWidth = canvasImage.naturalWidth || image.naturalWidth;
  const originalHeight = canvasImage.naturalHeight || image.naturalHeight;

  if (!originalWidth || !originalHeight) {
    return null;
  }

  let maxEdge = Math.min(PRINT_IMAGE_MAX_EDGE, Math.max(originalWidth, originalHeight));
  let smallestBlob: Blob | null = null;

  while (maxEdge >= PRINT_IMAGE_MIN_EDGE) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      return smallestBlob;
    }

    const scaledSize = getScaledImageSize(originalWidth, originalHeight, maxEdge);

    canvas.width = scaledSize.width;
    canvas.height = scaledSize.height;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(canvasImage, 0, 0, canvas.width, canvas.height);

    for (const quality of PRINT_IMAGE_QUALITY_STEPS) {
      const blob = await canvasToBlob(canvas, "image/jpeg", quality);

      if (!blob) {
        continue;
      }

      if (!smallestBlob || blob.size < smallestBlob.size) {
        smallestBlob = blob;
      }

      if (blob.size <= PRINT_IMAGE_TARGET_BYTES) {
        return blob;
      }
    }

    maxEdge = Math.floor(maxEdge * 0.82);
  }

  return smallestBlob;
}

async function prepareImageForPrint(image: HTMLImageElement) {
  if (!shouldCompressImageForPrint(image)) {
    return null;
  }

  try {
    const compressedBlob = await getCompressedImageBlob(image);

    if (!compressedBlob) {
      return null;
    }

    const originalSrc = image.getAttribute("src");
    const originalSrcSet = image.getAttribute("srcset");
    const originalSizes = image.getAttribute("sizes");
    const compressedImageUrl = URL.createObjectURL(compressedBlob);
    let hasCleanedUp = false;

    image.removeAttribute("srcset");
    image.removeAttribute("sizes");
    image.src = compressedImageUrl;
    await waitForImageToLoad(image);

    return {
      cleanup: () => {
        if (hasCleanedUp) {
          return;
        }

        hasCleanedUp = true;

        if (originalSrcSet) {
          image.setAttribute("srcset", originalSrcSet);
        } else {
          image.removeAttribute("srcset");
        }

        if (originalSizes) {
          image.setAttribute("sizes", originalSizes);
        } else {
          image.removeAttribute("sizes");
        }

        if (originalSrc) {
          image.src = originalSrc;
        }

        URL.revokeObjectURL(compressedImageUrl);
      },
    };
  } catch {
    return null;
  }
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
  const preparedImages: PreparedPrintImage[] = [];

  await Promise.all(images.map(waitForImageToLoad));

  for (const image of images) {
    const preparedImage = await prepareImageForPrint(image);

    if (preparedImage) {
      preparedImages.push(preparedImage);
    }
  }

  await document.fonts?.ready;
  await waitForNextFrame();

  return {
    cleanup: () => {
      for (const preparedImage of preparedImages) {
        preparedImage.cleanup();
      }
    },
  };
}
