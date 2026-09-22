import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';

/**
 * Device capability helpers used by the onboarding screens.
 *
 * NOTE: biometrics and `pickProfilePhoto` are still stubs. Wire
 * `react-native-biometrics` and `pickImage` into them and the screens need no
 * change; they only depend on the shapes declared here.
 */

export type BiometricKind = 'faceId' | 'touchId' | 'fingerprint' | 'none';

export type PickedImage = {
  uri: string;
  fileName?: string;
  fileSize?: number;
  /** Present when the image was picked with `includeBase64`, for uploading. */
  base64?: string;
};

const INSTALLATION_ID_KEY = 'cakeconnect.installationId';

let cachedInstallationId: string | null = null;

/**
 * Random enough to distinguish installs without pulling in a uuid dependency.
 * This is an opaque correlation handle, not a security token — the backend
 * treats `deviceId` as a label for the session, so collisions across installs
 * are the only thing worth avoiding.
 */
function generateInstallationId(): string {
  const random = () => Math.random().toString(36).slice(2, 10);
  return `${Platform.OS}-${Date.now().toString(36)}-${random()}${random()}`;
}

/**
 * A stable per-install id sent as `deviceId` on login and OTP verification, so
 * the backend can tie a refresh token to the device that obtained it.
 *
 * Generated once and persisted; it must survive app restarts, or every launch
 * would look like a new device and the server's session list would fill with
 * ghosts. A storage failure falls back to an in-memory id rather than blocking
 * sign-in over a label.
 */
export async function getInstallationId(): Promise<string> {
  if (cachedInstallationId) {
    return cachedInstallationId;
  }

  try {
    const stored = await AsyncStorage.getItem(INSTALLATION_ID_KEY);
    if (stored) {
      cachedInstallationId = stored;
      return stored;
    }

    const created = generateInstallationId();
    await AsyncStorage.setItem(INSTALLATION_ID_KEY, created);
    cachedInstallationId = created;
    return created;
  } catch {
    cachedInstallationId = cachedInstallationId ?? generateInstallationId();
    return cachedInstallationId;
  }
}

export async function getAvailableBiometric(): Promise<BiometricKind> {
  // TODO: replace with ReactNativeBiometrics.isSensorAvailable().
  return Platform.OS === 'ios' ? 'faceId' : 'fingerprint';
}

export function describeBiometric(kind: BiometricKind): string {
  switch (kind) {
    case 'faceId':
      return 'Face ID';
    case 'touchId':
      return 'Touch ID';
    case 'fingerprint':
      return 'fingerprint';
    default:
      return 'biometrics';
  }
}

export async function enableBiometrics(): Promise<{ enabled: boolean; reason?: string }> {
  // TODO: replace with ReactNativeBiometrics.simplePrompt() + key creation.
  return { enabled: true };
}

export async function pickProfilePhoto(): Promise<PickedImage | null> {
  // TODO: launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 }).
  // Returning null leaves the initials avatar in place.
  return null;
}

/**
 * Opens the photo library for a single image, downscaled so an upload stays
 * well under the server's 5 MB limit. Null when the user cancels.
 */
export async function pickImage(): Promise<PickedImage | null> {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    selectionLimit: 1,
    includeBase64: true,
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.8,
  });

  if (result.didCancel) {
    return null;
  }
  if (result.errorCode) {
    throw new Error(result.errorMessage ?? result.errorCode);
  }

  const asset = result.assets?.[0];
  if (!asset?.uri) {
    return null;
  }

  return {
    uri: asset.uri,
    fileName: asset.fileName,
    fileSize: asset.fileSize,
    base64: asset.base64,
  };
}
