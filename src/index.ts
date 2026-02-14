import type { JournalEvent, JournalEvent_BI } from "./generated/index.js";
export * from "./generated/events.js";
export * from "./generated/events.bi.js";

/**
 * Use this converter if you do not care about precision of numbers - primarily if you do not need to handle IDs (e.g. System Adresses).
 *
 * It will treat **any** number as a IEEE 754 64 bit Float. This way integers are precise up to 15 digits, which is not enough for IDs. In these cases,
 * use {@link parseWithBigInt} if large Integers matter.
 */
export function parseWithLossyIntegers(event: string): JournalEvent {
  return JSON.parse(event);
}

/**
 * Converts a Journal Entry to a Journal Event with *all* Integers replaced with BigInts.
 * An Item is considered an integer if it consists of at least one numerical (0..9), which can be prefixed by a `-`.
 * Trailing `.` or `.0` cause the item to be treated as a regular IEEE 754 64 bit Float.
 *
 * Use this if you need to work with System Addresses. Working with BigInt's is a bit more annoying as you cannot directly use some std library functions.
 */
export function parseWithBigInt(event: string): JournalEvent_BI {
  return JSON.parse(event, ((k: any, v: any, { source }: any) => {
    const isInteger = /^-?\d+$/.test(source ?? "");
    return isInteger ? BigInt(source) : v;
  }) as any);
}

/**
 * Stringifies a JSON that may contain BigInt's. Any BigInt is serialized as a number without compromising on accuracy.
 *
 * This is done by stringifying the BigInt with a randomly generated marker, followed by replacing said marker, including the quotes escaping the string.
 * This function can be seen as the inverse to {@link parseWithBigInt}.
 *
 * @param input a JSON-safe object containing BigInt's.
 */
export function stringifyBigIntJSON(input: any): string {
  const randomString = crypto.randomUUID();

  const bigIntPrefix = randomString + "_";
  const bigIntSuffix = "_" + randomString;
  const jsonWithMarkers = JSON.stringify(input, (_, val) => {
    if (typeof val !== "bigint") {
      return val;
    }
    return bigIntPrefix + val.toString() + bigIntSuffix;
  });

  // this turns
  // {
  //   "systemAddress": "someUUID_12345_someUUID"
  // }
  // into
  // {
  //   "systemAddress": 12345
  // }
  // such that the consumer can handle it as a number or do some special stuff to handle as BigInt also

  // we dont use a stable marker such as _BIGINT because this could lead to a payload being broken if said string actually appears (e.g. Ship Name).
  // random UUIDv4s are considered impropable to collide
  return jsonWithMarkers
    .replaceAll(`"${bigIntPrefix}`, "")
    .replaceAll(`${bigIntSuffix}"`, "");
}

export { type JournalEvent, type JournalEvent_BI };
