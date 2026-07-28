import { PermissionsAndroid, Platform } from "react-native";
import TextRecognition from "@react-native-ml-kit/text-recognition";
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
  type CameraOptions,
  type ImageLibraryOptions,
} from "react-native-image-picker";

export type MedicineOcrSource = "CAMERA" | "GALLERY";

export type MedicineOcrResult = {
  detectedText: string;
  imageUri: string;
  source: MedicineOcrSource;
  ocrConfidence: number;
};

const CAMERA_OPTIONS: CameraOptions = {
  mediaType: "photo",
  cameraType: "back",
  quality: 1,
  maxWidth: 1600,
  maxHeight: 1600,
  includeBase64: false,
  saveToPhotos: false,
};

const GALLERY_OPTIONS: ImageLibraryOptions = {
  mediaType: "photo",
  quality: 1,
  maxWidth: 1600,
  maxHeight: 1600,
  includeBase64: false,
  selectionLimit: 1,
};

const requestCameraPermission = async () => {
  if (Platform.OS !== "android") {
    return true;
  }

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.CAMERA,
    {
      title: "Camera permission required",
      message:
        "CareMate+ needs camera access to scan medicine labels and prescription text.",
      buttonPositive: "Allow",
      buttonNegative: "Cancel",
    }
  );

  return granted === PermissionsAndroid.RESULTS.GRANTED;
};

const getImageUriFromAsset = (asset?: Asset) => {
  if (!asset?.uri) {
    throw new Error("No image was selected. Please try again.");
  }

  return asset.uri;
};

const cleanDetectedText = (value: string) => {
  return value
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const extractTextFromOcrResult = (result: any) => {
  if (typeof result?.text === "string" && result.text.trim()) {
    return cleanDetectedText(result.text);
  }

  if (Array.isArray(result?.blocks)) {
    const blockText = result.blocks
      .map((block: any) => block?.text)
      .filter((text: unknown) => typeof text === "string" && text.trim())
      .join("\n");

    if (blockText.trim()) {
      return cleanDetectedText(blockText);
    }
  }

  return "";
};

const estimateOcrConfidence = (detectedText: string) => {
  const words = detectedText
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  const hasDose = /\d+(?:\.\d+)?\s?(mg|mcg|g|ml|iu|units|%)/i.test(
    detectedText
  );

  const hasPrescriptionPattern =
    /\b[01]\s*[-–—]\s*[01]\s*[-–—]\s*[01]\b/.test(detectedText);

  if (words.length >= 8 && (hasDose || hasPrescriptionPattern)) {
    return 90;
  }

  if (words.length >= 5) {
    return 84;
  }

  if (words.length >= 3) {
    return 74;
  }

  return 60;
};

const runTextRecognition = async ({
  imageUri,
  source,
}: {
  imageUri: string;
  source: MedicineOcrSource;
}): Promise<MedicineOcrResult> => {
  const result = await TextRecognition.recognize(imageUri);

  const detectedText = extractTextFromOcrResult(result);

  if (!detectedText) {
    throw new Error(
      "No readable medicine text was detected. Please retake the photo with better lighting."
    );
  }

  return {
    detectedText,
    imageUri,
    source,
    ocrConfidence: estimateOcrConfidence(detectedText),
  };
};

export const medicineOcrService = {
  async scanFromCamera(): Promise<MedicineOcrResult | null> {
    const hasPermission = await requestCameraPermission();

    if (!hasPermission) {
      throw new Error("Camera permission was denied.");
    }

    const response = await launchCamera(CAMERA_OPTIONS);

    if (response.didCancel) {
      return null;
    }

    if (response.errorCode) {
      throw new Error(
        response.errorMessage || "Unable to open camera. Please try again."
      );
    }

    const imageUri = getImageUriFromAsset(response.assets?.[0]);

    return runTextRecognition({
      imageUri,
      source: "CAMERA",
    });
  },

  async scanFromGallery(): Promise<MedicineOcrResult | null> {
    const response = await launchImageLibrary(GALLERY_OPTIONS);

    if (response.didCancel) {
      return null;
    }

    if (response.errorCode) {
      throw new Error(
        response.errorMessage || "Unable to open gallery. Please try again."
      );
    }

    const imageUri = getImageUriFromAsset(response.assets?.[0]);

    return runTextRecognition({
      imageUri,
      source: "GALLERY",
    });
  },
};