import { Platform } from 'react-native';

/**
 * Environment configuration — the single place to repoint the app.
 *
 * Everything the app talks to sits under the `/api/v1` prefix documented in
 * `docs/api-endpoints.md`, so the prefix belongs here rather than being
 * repeated at every call site.
 */

const DEV_API_PORT = 4000;

/**
 * Where the dev backend lives, as seen *from the device*. Set this to your
 * machine's LAN IP to skip the adb tunnel entirely; leave it null to use
 * `localhost`.
 *
 *   e.g. const DEV_HOST_OVERRIDE = '192.168.1.42';
 *
 * Find it with `ipconfig` (Windows) or `ipconfig getifaddr en0` (macOS). The
 * device and the machine must be on the same network, and the backend must bind
 * 0.0.0.0 rather than 127.0.0.1 — check with `netstat -ano | grep :4000`.
 */
const DEV_HOST_OVERRIDE: string | null = null;

/**
 * `localhost` means something different on each target:
 *
 *   - iOS simulator      shares the host's network stack, so it just works.
 *   - Android emulator   resolves it to the emulator itself; the host is
 *                        reachable at the 10.0.2.2 alias instead.
 *   - Physical device    resolves it to the phone. Either run
 *                        `adb reverse tcp:4000 tcp:4000` (which forwards the
 *                        port over the debug bridge, and must be re-run after
 *                        every reconnect or reboot), or set DEV_HOST_OVERRIDE
 *                        above to the machine's LAN IP.
 *
 * A physical device and an emulator are indistinguishable at runtime here, so
 * Android defaults to `localhost` — correct for a device with the reverse
 * tunnel up. On an emulator, set DEV_HOST_OVERRIDE to '10.0.2.2'.
 */
const DEV_API_HOST = DEV_HOST_OVERRIDE
  ? `http://${DEV_HOST_OVERRIDE}:${DEV_API_PORT}`
  : (Platform.select({
      default: `http://localhost:${DEV_API_PORT}`,
    }) as string);

export const API_HOSTS = {
  development: DEV_API_HOST,
  staging: 'https://staging.api.cakeconnect.com',
  production: 'https://api.cakeconnect.com',
} as const;

export type ApiEnvironment = keyof typeof API_HOSTS;

/**
 * Change this line (or make it read a build-time flag) to point a build at
 * staging. `__DEV__` is false in release builds, so a shipped app never talks
 * to a developer's machine.
 */
export const API_ENVIRONMENT: ApiEnvironment = __DEV__ ? 'development' : 'production';

export const API_BASE_URL = `${API_HOSTS[API_ENVIRONMENT]}/api/v1`;

/**
 * PRD §5 asks for a dashboard render under 2s on 4G. A request that has not
 * answered in 15s has failed for the user regardless of what the server does
 * next.
 */
export const REQUEST_TIMEOUT_MS = 15_000;
