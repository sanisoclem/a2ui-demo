import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { JsonObjectScanner } from "./json-scanner.ts";

const scanInChunks = (text: string, cuts: number[]) => {
  const scanner = new JsonObjectScanner();
  const bounds = [0, ...cuts.map((cut) => cut % (text.length + 1)).sort((a, b) => a - b), text.length];
  return bounds.slice(1).flatMap((end, index) => scanner.push(text.slice(bounds[index], end)));
};

describe("JsonObjectScanner", () => {
  it("yields every top-level object however the stream is chunked, compact or pretty-printed", () => {
    const objects = fc.array(fc.dictionary(fc.string(), fc.jsonValue()), { maxLength: 6 });
    fc.assert(
      fc.property(objects, fc.boolean(), fc.array(fc.nat(), { maxLength: 8 }), (values, pretty, cuts) => {
        const text = values.map((value) => JSON.stringify(value, null, pretty ? 2 : undefined)).join("\n");
        expect(scanInChunks(text, cuts).map((object) => JSON.parse(object))).toEqual(values);
      }),
    );
  });

  it("skips prose, code fences and array brackets around the objects", () => {
    const text = 'Here you go:\n```json\n[{"id":"root"},\n{"id":"title"}]\n```';
    expect(scanInChunks(text, [])).toEqual(['{"id":"root"}', '{"id":"title"}']);
  });
});
