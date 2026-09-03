import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Device capability helpers used by the onboarding screens.
 *
 * NOTE: biometrics and the image picker are still stubs — no native modules
 * back them yet. Wire `react-native-biometrics` and `react-native-image-picker`
 * into the functions below and the screens need no change; they only depend on
 * the shapes declared here.
 */

export type BiometricKind = 'faceId' | 'touchId' | 'fingerprint' | 'none';

export type PickedImage = { uri: string; fileName?: string; fileSize?: number };

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
