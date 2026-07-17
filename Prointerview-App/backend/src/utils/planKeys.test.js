import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizePlanKey, planKeyFromSubscriptionMeta } from "./planKeys.js";

describe("normalizePlanKey", () => {
  it("accepts camelCase and snake_case", () => {
    assert.equal(normalizePlanKey("starterPro"), "starter_pro");
    assert.equal(normalizePlanKey("elite_pro"), "elite_pro");
    assert.equal(normalizePlanKey("free"), "free");
  });

  it("rejects unknown keys", () => {
    assert.equal(normalizePlanKey("pro"), null);
    assert.equal(normalizePlanKey(""), null);
  });
});

describe("planKeyFromSubscriptionMeta", () => {
  it("maps elite/starter substrings", () => {
    assert.equal(planKeyFromSubscriptionMeta("Elite Pro yearly"), "elite_pro");
    assert.equal(planKeyFromSubscriptionMeta("starter"), "starter_pro");
  });

  it("elite ưu tiên hơn starter trong chuỗi lẫn", () => {
    assert.equal(planKeyFromSubscriptionMeta("starter elite bundle"), "elite_pro");
  });
});
