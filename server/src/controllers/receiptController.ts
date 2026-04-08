import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { parseReceiptImage } from "../utils/receiptParser";
import { resolveStoredReceipt } from "../utils/receiptStorage";

export const parseReceipt = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const receiptData = String(req.body.receipt_data ?? "").trim();
  const existingReceiptData = String(req.body.existing_receipt_data ?? "").trim() || null;
  const existingStorageKey = String(req.body.existing_receipt_storage_key ?? "").trim() || null;

  if (!receiptData && !existingReceiptData) {
    res.status(400).json({ error: "Receipt image is required for parsing" });
    return;
  }

  try {
    const storedReceipt = await resolveStoredReceipt(
      receiptData || existingReceiptData,
      existingStorageKey,
      existingReceiptData,
      existingStorageKey,
    );

    if (!storedReceipt.url) {
      res.status(400).json({ error: "Receipt image could not be prepared for parsing" });
      return;
    }

    const parsed = await parseReceiptImage(storedReceipt.url);

    res.json({
      receipt_data: storedReceipt.url,
      receipt_storage_key: storedReceipt.storageKey,
      parsed,
    });
  } catch (error) {
    console.error("Parse receipt error:", error);
    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to parse receipt",
    });
  }
};
