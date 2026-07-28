import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizePlanKey, planKeyFromSubscriptionMeta } from "./planKeys.js";

describe("normalizePlanKey", () => {
  it("accepts camelCase và snake_case, chuẩn hóa alias gói cũ sang key mới", () => {
    // starterPro/elite_pro là alias gói cũ đã ngừng bán — map sang student/professional.
    assert.equal(normalizePlanKey("starterPro"), "student");
    assert.equal(normalizePlanKey("elite_pro"), "professional");
    assert.equal(normalizePlanKey("free"), "free");
  });

  it("rejects unknown keys", () => {
    assert.equal(normalizePlanKey("pro"), null);
    assert.equal(normalizePlanKey(""), null);
  });
});

describe("planKeyFromSubscriptionMeta", () => {
  it("maps elite/starter substrings sang key gói mới (student/professional)", () => {
    assert.equal(planKeyFromSubscriptionMeta("Elite Pro yearly"), "professional");
    assert.equal(planKeyFromSubscriptionMeta("starter"), "student");
  });

  it("elite ưu tiên hơn starter trong chuỗi lẫn", () => {
    assert.equal(planKeyFromSubscriptionMeta("starter elite bundle"), "professional");
  });
});
