import { Platform } from 'react-native';

/**
 * Device capability stubs used by the onboarding screens.
 *
 * NOTE: no native modules back these yet. Wire `react-native-biometrics` and
 * `react-native-image-picker` into the functions below and the screens need no
 * change — they only depend on the shapes declared here.
 */

export type BiometricKind = 'faceId' | 'touchId' | 'fingerprint' | 'none';

export type PickedImage = { uri: string; fileName?: string; fileSize?: number };

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
