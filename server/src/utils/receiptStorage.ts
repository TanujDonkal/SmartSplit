import { createHash } from "crypto";

type StoredReceipt = {
  url: string | null;
  storageKey: string | null;
};

function isDataUrl(value: string | null | undefined) {
  return typeof value === "string" && value.startsWith("data:image/");
}

function isRemoteUrl(value: string | null | undefined) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  const folder = process.env.CLOUDINARY_FOLDER?.trim() || "smartsplit/receipts";

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  return { cloudName, apiKey, apiSecret, folder };
}

function signParams(params: Record<string, string>, apiSecret: string) {
  const serialized = Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1").update(`${serialized}${apiSecret}`).digest("hex");
}

async function uploadReceiptDataUrl(dataUrl: string) {
  const config = getCloudinaryConfig();

  if (!config) {
    throw new Error(
      "Receipt upload is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    );
  }

  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = signParams(
    {
      folder: config.folder,
      timestamp,
    },
    config.apiSecret,
  );

  const form = new FormData();
  form.append("file", dataUrl);
  form.append("folder", config.folder);
  form.append("api_key", config.apiKey);
  form.append("timestamp", timestamp);
  form.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/upload`,
    {
      method: "POST",
      body: form,
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Receipt upload failed (${response.status}): ${body}`);
  }

  const body = (await response.json()) as { secure_url?: string; public_id?: string };

  if (!body.secure_url || !body.public_id) {
    throw new Error("Receipt upload did not return a usable URL");
  }

  return {
    url: body.secure_url,
    storageKey: body.public_id,
  };
}

export async function deleteStoredReceipt(storageKey: string | null | undefined) {
  if (!storageKey) {
    return;
  }

  const config = getCloudinaryConfig();
  if (!config) {
    return;
  }

  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = signParams(
    {
      public_id: storageKey,
      timestamp,
    },
    config.apiSecret,
  );

  const form = new FormData();
  form.append("public_id", storageKey);
  form.append("api_key", config.apiKey);
  form.append("timestamp", timestamp);
  form.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/destroy`,
    {
      method: "POST",
      body: form,
    },
  );

  if (!response.ok) {
    console.warn(`Receipt deletion failed for ${storageKey} with status ${response.status}`);
  }
}

export async function resolveStoredReceipt(
  incomingReceipt: string | null | undefined,
  existingReceiptUrl: string | null | undefined,
  existingStorageKey: string | null | undefined,
): Promise<StoredReceipt> {
  if (incomingReceipt === undefined) {
    return {
      url: existingReceiptUrl ?? null,
      storageKey: existingStorageKey ?? null,
    };
  }

  const normalized = String(incomingReceipt ?? "").trim();

  if (!normalized) {
    await deleteStoredReceipt(existingStorageKey);
    return {
      url: null,
      storageKey: null,
    };
  }

  if (isRemoteUrl(normalized)) {
    return {
      url: normalized,
      storageKey: existingStorageKey ?? null,
    };
  }

  if (!isDataUrl(normalized)) {
    throw new Error("Receipt must be an image upload or a hosted receipt URL");
  }

  const uploaded = await uploadReceiptDataUrl(normalized);
  if (existingStorageKey && existingStorageKey !== uploaded.storageKey) {
    await deleteStoredReceipt(existingStorageKey);
  }

  return uploaded;
}
