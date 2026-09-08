//import { Platform } from 'react-native';

/**
 * Environment configuration — the single place to repoint the app.
 *
 * Everything the app talks to sits under the `/api/v1` prefix documented in
 * `docs/api-endpoints.md`, so the prefix belongs here rather than being
 * repeated at every call site.
 */

//const DEV_API_PORT = 4001;

/**
 * Where the dev backend lives, as seen *from the device*. Set this to your
 * machine's LAN IP to skip the adb tunnel entirely; leave it null to use
 * `localhost`.
 *
 *   e.g. const DEV_HOST_OVERRIDE = '192.168.1.42';
 *
 * Find it with `ipconfig` (Windows) or `ipconfig getifaddr en0` (macOS). The
 * device and the machine must be on the same network, and the backend must bind
 * 0.0.0.0 rather than 127.0.0.1 — check with `netstat -ano | grep :4001`.
 */
//const DEV_HOST_OVERRIDE: string | null = '192.168.1.44';

const API_HOST = 'http://192.168.1.44:4001';
 
export const API_BASE_URL = `${API_HOST}/api/v1`;
 
export const REQUEST_TIMEOUT_MS = 15_000;