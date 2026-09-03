/**
 * Bidirectional codecs between the domain enums the screens use and the
 * `UPPER_SNAKE` values the backend speaks.
 *
 * The domain types in `src/types/admin.ts` and `src/store/authSlice.ts` stay
 * exactly as they are — every screen, every `Record<Status, …>` label map and
 * every style lookup is keyed on them. Translation happens here, at the service
 * boundary, and nowhere else.
 */

export class UnknownEnumValueError extends Error {
  constructor(name: string, value: unknown, direction: 'toApi' | 'fromApi') {
    super(
      direction === 'toApi'
        ? `Cannot send unknown ${name} to the API: ${String(value)}`
        : `API returned an unknown ${name}: ${String(value)}`,
    );
    this.name = 'UnknownEnumValueError';
  }
}

export type EnumCodec<Domain extends string, Api extends string> = {
  toApi(value: Domain): Api;
  fromApi(value: string): Domain;
  /** True when the API value has a domain counterpart; never throws. */
  isKnown(value: string): value is Api;
  readonly domainValues: readonly Domain[];
  readonly apiValues: readonly Api[];
};

/**
 * Builds a codec from an exhaustive domain -> API map.
 *
 * Both directions throw on an unrecognised value rather than defaulting. A
 * silent default here would surface as an order sitting in the wrong queue
 * column or a shop showing the wrong status — a wrong answer presented as a
 * right one, which is worse than a failed request.
 */
export function createEnumCodec<Domain extends string, Api extends string>(
  name: string,
  pairs: Readonly<Record<Domain, Api>>,
): EnumCodec<Domain, Api> {
  const domainValues = Object.keys(pairs) as Domain[];
  const reverse = {} as Record<Api, Domain>;

  domainValues.forEach(domainValue => {
    reverse[pairs[domainValue]] = domainValue;
  });

  return {
    toApi(value: Domain): Api {
      const mapped = pairs[value];
      if (mapped === undefined) {
        throw new UnknownEnumValueError(name, value, 'toApi');
      }
      return mapped;
    },

    fromApi(value: string): Domain {
      const mapped = reverse[value as Api];
      if (mapped === undefined) {
        throw new UnknownEnumValueError(name, value, 'fromApi');
      }
      return mapped;
    },

    isKnown(value: string): value is Api {
      return reverse[value as Api] !== undefined;
    },

    domainValues,
    apiValues: domainValues.map(domainValue => pairs[domainValue]),
  };
}
