/**
 * Raised when a screen asks for something the backend does not expose.
 *
 * The alternative — computing a plausible-looking number on the client — is
 * worse than failing: a fabricated ageing bucket or a zeroed count is a wrong
 * answer presented as a right one, and a franchise owner would act on it. Every
 * throw site has a matching row in `docs/api-gaps.md`.
 */
export class NotImplementedOnServer extends Error {
  /** The frontend capability that cannot be served, e.g. `getRegions`. */
  readonly feature: string;

  /** Heading in `docs/api-gaps.md` that explains the gap and the proposed API. */
  readonly gapRef: string;

  constructor(feature: string, gapRef: string, detail?: string) {
    super(
      detail
        ? `${feature} is not available from the backend yet: ${detail} (see docs/api-gaps.md ${gapRef})`
        : `${feature} is not available from the backend yet (see docs/api-gaps.md ${gapRef})`,
    );
    this.name = 'NotImplementedOnServer';
    this.feature = feature;
    this.gapRef = gapRef;
  }

  static is(error: unknown): error is NotImplementedOnServer {
    return error instanceof NotImplementedOnServer;
  }
}

/**
 * True when a query failed only because the endpoint does not exist yet, so a
 * screen can hide the control instead of showing a network-error state that
 * invites the user to retry something that will never succeed.
 */
export const isMissingEndpoint = NotImplementedOnServer.is;
