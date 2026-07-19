import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App if not already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Drive scopes
provider.addScope("https://www.googleapis.com/auth/drive");
provider.addScope("https://www.googleapis.com/auth/drive.file");
provider.addScope("https://www.googleapis.com/auth/drive.readonly");

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to get access token from Firebase Auth");
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Sign in error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// ==========================================
// Google Drive API Helpers
// ==========================================

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  createdTime?: string;
  size?: string;
}

/**
 * List files in the user's Google Drive.
 * We can filter for images and PDFs by default or list all.
 */
export const listDriveFiles = async (token: string): Promise<DriveFile[]> => {
  try {
    // Query parameters:
    // - q: query string. e.g. "trashed = false" or specific mime types
    // - fields: specify fields to return
    const q = encodeURIComponent("trashed = false and (mimeType contains 'image/' or mimeType = 'application/pdf')");
    const fields = encodeURIComponent("files(id, name, mimeType, thumbnailLink, createdTime, size)");
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=createdTime%20desc`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google Drive API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    return data.files || [];
  } catch (err) {
    console.error("Error listing Drive files:", err);
    throw err;
  }
};

/**
 * Create a folder in Google Drive.
 */
export const createFolderInDrive = async (token: string, folderName: string): Promise<string> => {
  try {
    const metadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    };

    const response = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      throw new Error(`Failed to create folder: ${response.statusText}`);
    }

    const data = await response.json();
    return data.id;
  } catch (err) {
    console.error("Error creating folder:", err);
    throw err;
  }
};

/**
 * Upload a file (e.g. image blob or text) to Google Drive.
 * Option to upload inside a specific parent folder.
 */
export const uploadFileToDrive = async (
  token: string,
  fileName: string,
  mimeType: string,
  blob: Blob,
  parentFolderId?: string
): Promise<DriveFile> => {
  try {
    // 1. Create a multipart upload request
    const metadata: any = {
      name: fileName,
      mimeType: mimeType,
    };

    if (parentFolderId) {
      metadata.parents = [parentFolderId];
    }

    const boundary = "swnw_drive_upload_boundary";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    // Convert metadata to string
    const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
    
    // Read blob as binary string or array buffer
    const arrayBuffer = await blob.arrayBuffer();
    const mediaPartHeader = `\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n`;
    
    // Encode media as base64
    const base64Media = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );
    
    const mediaPart = `${mediaPartHeader}${base64Media}${closeDelimiter}`;
    
    // Since we're sending base64 content-transfer-encoding, we build the multipart payload as a string
    const payload = `${metadataPart}${mediaPart}`;

    const response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: payload,
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${errText}`);
    }

    return await response.json();
  } catch (err) {
    console.error("Error uploading to Google Drive:", err);
    throw err;
  }
};

/**
 * Download a file's content or retrieve a blob of a file from Google Drive.
 */
export const downloadFileBlob = async (token: string, fileId: string): Promise<Blob> => {
  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    return await response.blob();
  } catch (err) {
    console.error("Error downloading file:", err);
    throw err;
  }
};

/**
 * Delete a file in Google Drive (must warn user first!).
 */
export const deleteFileFromDrive = async (token: string, fileId: string): Promise<boolean> => {
  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete file: ${response.statusText}`);
    }

    return true;
  } catch (err) {
    console.error("Error deleting file:", err);
    throw err;
  }
};
