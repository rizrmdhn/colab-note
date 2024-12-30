export interface Base64ConversionOptions {
  filename: string;
  mimeType?: string; // Made optional since we can detect it
  encoding?: string;
}

class Base64ConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Base64ConversionError";
  }
}

// MIME type to file extension mapping
const mimeToExtension: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "application/pdf": ".pdf",
  "application/json": ".json",
  "text/plain": ".txt",
  "text/html": ".html",
  "text/css": ".css",
  "text/javascript": ".js",
  "application/javascript": ".js",
  "application/xml": ".xml",
  "application/zip": ".zip",
  "application/x-zip-compressed": ".zip",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    ".pptx",
  "video/mp4": ".mp4",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
};

/**
 * Extracts MIME type from a base64 data URL
 * @param base64String - The base64 data URL
 * @returns Object containing the cleaned base64 string and detected MIME type
 */
function parseDataUrl(base64String: string): {
  cleanBase64: string;
  detectedMimeType: string | null;
} {
  const dataUrlRegex = /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/;
  const match = dataUrlRegex.exec(base64String);

  if (match) {
    return {
      cleanBase64: base64String.replace(dataUrlRegex, ""),
      detectedMimeType: match[1] ?? null,
    };
  }

  return {
    cleanBase64: base64String,
    detectedMimeType: null,
  };
}

/**
 * Gets appropriate file extension based on MIME type
 * @param mimeType - The MIME type to convert
 * @returns The corresponding file extension or null if not found
 */
function getFileExtension(mimeType: string): string | null {
  return mimeToExtension[mimeType] ?? null;
}

/**
 * Ensures filename has the correct extension based on MIME type
 * @param filename - The original filename
 * @param mimeType - The MIME type to match
 * @returns Filename with correct extension
 */
function ensureFileExtension(filename: string, mimeType: string): string {
  const extension = getFileExtension(mimeType);
  if (!extension) {
    return filename;
  }

  // Remove any existing extension
  const baseFilename = filename.replace(/\.[^/.]+$/, "");
  return `${baseFilename}${extension}`;
}

/**
 * Converts a base64 string to a File object with automatic MIME type and extension detection
 * @param base64String - The base64 string to convert
 * @param options - Configuration options for the conversion
 * @returns Promise<File> - A File object created from the base64 string
 * @throws {Base64ConversionError} If validation fails or conversion errors occur
 */
async function base64ToFile(
  base64String: string,
  options: Base64ConversionOptions,
): Promise<File> {
  try {
    // Validate base64 string
    if (!base64String || typeof base64String !== "string") {
      throw new Base64ConversionError("Invalid base64 string provided");
    }

    if (!options.filename || typeof options.filename !== "string") {
      throw new Base64ConversionError("Invalid filename provided");
    }

    // Parse data URL and get MIME type
    const { cleanBase64, detectedMimeType } = parseDataUrl(base64String);
    const mimeType =
      options.mimeType ?? detectedMimeType ?? "application/octet-stream";

    // Validate base64 format
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(cleanBase64)) {
      throw new Base64ConversionError("Invalid base64 format");
    }

    // Ensure filename has correct extension
    const finalFilename = ensureFileExtension(options.filename, mimeType);

    // Convert base64 to binary
    const byteCharacters = atob(cleanBase64);
    const byteArrays: Uint8Array[] = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);

      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      byteArrays.push(new Uint8Array(byteNumbers));
    }

    // Create Blob and File
    const blob = new Blob(byteArrays, { type: mimeType });
    const file = new File([blob], finalFilename, {
      type: mimeType,
      lastModified: Date.now(),
    });

    // Validate file creation
    if (!(file instanceof File)) {
      throw new Base64ConversionError("Failed to create File object");
    }

    return file;
  } catch (error) {
    if (error instanceof Base64ConversionError) {
      throw error;
    }
    throw new Base64ConversionError(
      `Conversion failed: ${(error as Error).message}`,
    );
  }
}

export {
  base64ToFile,
  Base64ConversionError,
  parseDataUrl,
  getFileExtension,
  ensureFileExtension,
};
