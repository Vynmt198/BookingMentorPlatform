import { createRequire } from "module";
import { validateSaveAnalysis, formatValidationError } from "../../src/dto/cvAnalysis.dto.js";

// createRequire cho phép load JSON fixture trong ESM context
const require = createRequire(import.meta.url);

describe("CV Analysis DTO Validator", () => {

  // ============================================================
  // HAPPY PATH
  // ============================================================

  describe("valid payloads", () => {
    test("accepts real frontend payload (fixture)", () => {
      const payload = require("../fixtures/cv-payload-real.json");
      const { error, businessErrors } = validateSaveAnalysis(payload);
      expect(error).toBeNull();
      expect(businessErrors).toBeNull();
    });

    test("accepts minimal basic-tier payload", () => {
      const payload = {
        cvFileName: "cv.pdf",
        mode: "jd",
        tier: "basic",
        result: { matchScore: 65 },
      };
      const { error, value, businessErrors } = validateSaveAnalysis(payload);
      expect(error).toBeNull();
      expect(businessErrors).toBeNull();
      expect(value.result.matchScore).toBe(65);
      // Defaults populated
      expect(value.result.skills).toEqual({ cv: [], jd: [], matched: [], missing: [] });
      expect(value.result.matchedKeywords).toEqual([]);
      expect(value.planAtTime).toBe("free");
    });

    test("accepts full-tier payload with scores", () => {
      const payload = {
        cvFileName: "cv.pdf",
        jdFileName: "jd.pdf",
        mode: "jd",
        tier: "full",
        result: {
          matchScore: 78,
          matchedKeywords: ["React", "Node.js"],
          missingKeywords: ["Kubernetes"],
          scores: {
            clarity: 4,
            structure: 3.5,
            relevance: 4.2,
            credibility: 3,
          },
          skills: {
            cv: [{ name: "React" }, "Node.js"],
            jd: [{ name: "React" }, { name: "Kubernetes" }],
            matched: ["React"],
            missing: ["Kubernetes"],
          },
        },
      };
      const { error, value, businessErrors } = validateSaveAnalysis(payload);
      expect(error).toBeNull();
      expect(businessErrors).toBeNull();
      expect(value.result.scores.clarity).toBe(4);
    });

    test("accepts suggestions-tier payload", () => {
      const payload = {
        cvFileName: "cv.pdf",
        jdFileName: "jd.pdf",
        mode: "jd",
        tier: "suggestions",
        result: {
          matchScore: 82,
          scores: { clarity: 4, structure: 4, relevance: 4, credibility: 4 },
          suggestions: {
            rewrittenBullets: [{
              original: "Worked on React projects",
              rewritten: "Led React migration improving performance by 40%",
              reasoning: "Added quantification and leadership context",
              starElements: { situation: true, task: true, action: true, result: true },
            }],
            missingSkillSuggestions: [{
              skill: "Kubernetes",
              priority: "high",
              reason: "Required by JD",
              resources: ["https://kubernetes.io/docs/"],
              estimatedTimeWeeks: 8,
            }],
            executiveSummary: "Strong match overall with room to add cloud skills.",
          },
        },
      };
      const { error, businessErrors } = validateSaveAnalysis(payload);
      expect(error).toBeNull();
      expect(businessErrors).toBeNull();
    });

    test("accepts mode=field without JD", () => {
      const payload = {
        cvFileName: "cv.pdf",
        mode: "field",
        tier: "basic",
        result: { matchScore: 55 },
      };
      const { error } = validateSaveAnalysis(payload);
      expect(error).toBeNull();
    });

    test("accepts string skills (will be normalized in controller)", () => {
      const payload = {
        cvFileName: "cv.pdf",
        mode: "jd",
        tier: "basic",
        result: {
          matchScore: 70,
          skills: { cv: ["React", "Vue", "Angular"] },
        },
      };
      const { error, value } = validateSaveAnalysis(payload);
      expect(error).toBeNull();
      expect(value.result.skills.cv).toEqual(["React", "Vue", "Angular"]);
    });

    test("accepts mixed string/object skills", () => {
      const payload = {
        cvFileName: "cv.pdf",
        mode: "jd",
        tier: "basic",
        result: {
          matchScore: 70,
          skills: {
            cv: ["React", { name: "Node.js", category: "backend", confidence: 0.95 }],
          },
        },
      };
      const { error } = validateSaveAnalysis(payload);
      expect(error).toBeNull();
    });
  });

  // ============================================================
  // INVALID PAYLOADS
  // ============================================================

  describe("invalid payloads", () => {
    test("rejects missing cvFileName", () => {
      const { error } = validateSaveAnalysis({
        mode: "jd",
        tier: "basic",
        result: { matchScore: 70 },
      });
      expect(error).toBeDefined();
      const formatted = formatValidationError(error);
      expect(formatted.some((e) => e.field === "cvFileName")).toBe(true);
    });

    test("rejects missing result.matchScore", () => {
      const { error } = validateSaveAnalysis({
        cvFileName: "cv.pdf",
        mode: "jd",
        tier: "basic",
        result: {},
      });
      expect(error).toBeDefined();
      expect(
        formatValidationError(error).some((e) => e.field === "result.matchScore")
      ).toBe(true);
    });

    test("rejects matchScore out of range", () => {
      const { error } = validateSaveAnalysis({
        cvFileName: "cv.pdf",
        mode: "jd",
        tier: "basic",
        result: { matchScore: 150 },
      });
      expect(error).toBeDefined();
    });

    test("rejects invalid mode", () => {
      const { error } = validateSaveAnalysis({
        cvFileName: "cv.pdf",
        mode: "invalid_mode",
        tier: "basic",
        result: { matchScore: 70 },
      });
      expect(error).toBeDefined();
    });

    test("rejects invalid tier", () => {
      const { error } = validateSaveAnalysis({
        cvFileName: "cv.pdf",
        mode: "jd",
        tier: "super-premium",
        result: { matchScore: 70 },
      });
      expect(error).toBeDefined();
    });

    test("rejects mock-shaped payload with unknown top-level keys", () => {
      const { error } = validateSaveAnalysis({
        cvFileName: "cv.pdf",
        mode: "jd",
        tier: "basic",
        result: { matchScore: 70 },
        mockField: true,
        someOldField: "legacy",
      });
      expect(error).toBeDefined();
      expect(
        formatValidationError(error).some((e) => e.message.includes("mockField"))
      ).toBe(true);
    });

    test("rejects scores out of 0-5 range", () => {
      const { error } = validateSaveAnalysis({
        cvFileName: "cv.pdf",
        mode: "jd",
        tier: "full",
        result: {
          matchScore: 70,
          scores: { clarity: 10, structure: 3, relevance: 3, credibility: 3 },
        },
      });
      expect(error).toBeDefined();
    });

    test("collects multiple errors (abortEarly=false)", () => {
      const { error } = validateSaveAnalysis({
        cvFileName: "",
        mode: "invalid",
        tier: "invalid",
        result: { matchScore: -5 },
      });
      expect(error).toBeDefined();
      const formatted = formatValidationError(error);
      expect(formatted.length).toBeGreaterThan(2);
    });
  });

  // ============================================================
  // BUSINESS RULES
  // ============================================================

  describe("business rules", () => {
    test("rejects tier=suggestions without suggestions data", () => {
      const { error, businessErrors } = validateSaveAnalysis({
        cvFileName: "cv.pdf",
        mode: "jd",
        tier: "suggestions",
        result: {
          matchScore: 80,
          scores: { clarity: 4, structure: 4, relevance: 4, credibility: 4 },
          // missing suggestions
        },
      });
      expect(error).toBeNull();
      expect(businessErrors).not.toBeNull();
      expect(businessErrors.some((e) => e.field === "result.suggestions")).toBe(true);
    });

    test("rejects tier=full without scores", () => {
      const { error, businessErrors } = validateSaveAnalysis({
        cvFileName: "cv.pdf",
        mode: "jd",
        tier: "full",
        result: { matchScore: 70 },
      });
      expect(error).toBeNull();
      expect(businessErrors).not.toBeNull();
      expect(businessErrors.some((e) => e.field === "result.scores")).toBe(true);
    });

    test("rejects tier=basic with suggestions", () => {
      const { businessErrors } = validateSaveAnalysis({
        cvFileName: "cv.pdf",
        mode: "jd",
        tier: "basic",
        result: {
          matchScore: 70,
          suggestions: {
            rewrittenBullets: [],
            missingSkillSuggestions: [],
            executiveSummary: "",
          },
        },
      });
      expect(businessErrors).not.toBeNull();
      expect(businessErrors.some((e) => e.field === "result.suggestions")).toBe(true);
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================

  describe("edge cases", () => {
    test("handles empty arrays", () => {
      const { error } = validateSaveAnalysis({
        cvFileName: "cv.pdf",
        mode: "jd",
        tier: "basic",
        result: {
          matchScore: 0,
          matchedKeywords: [],
          missingKeywords: [],
          skills: { cv: [], jd: [], matched: [], missing: [] },
        },
      });
      expect(error).toBeNull();
    });

    test("handles matchScore=0 and matchScore=100", () => {
      expect(
        validateSaveAnalysis({ cvFileName: "cv.pdf", mode: "jd", tier: "basic", result: { matchScore: 0 } }).error
      ).toBeNull();

      expect(
        validateSaveAnalysis({ cvFileName: "cv.pdf", mode: "jd", tier: "basic", result: { matchScore: 100 } }).error
      ).toBeNull();
    });

    test("handles long executiveSummary — valid at 4999 chars", () => {
      const payload = {
        cvFileName: "cv.pdf",
        mode: "jd",
        tier: "suggestions",
        result: {
          matchScore: 80,
          scores: { clarity: 4, structure: 4, relevance: 4, credibility: 4 },
          suggestions: {
            rewrittenBullets: [],
            missingSkillSuggestions: [],
            executiveSummary: "A".repeat(4999),
          },
        },
      };
      expect(validateSaveAnalysis(payload).error).toBeNull();
    });

    test("rejects executiveSummary > 5000 chars", () => {
      const payload = {
        cvFileName: "cv.pdf",
        mode: "jd",
        tier: "suggestions",
        result: {
          matchScore: 80,
          scores: { clarity: 4, structure: 4, relevance: 4, credibility: 4 },
          suggestions: {
            rewrittenBullets: [],
            missingSkillSuggestions: [],
            executiveSummary: "A".repeat(5001),
          },
        },
      };
      expect(validateSaveAnalysis(payload).error).toBeDefined();
    });

    test("rejects skill name > 100 chars", () => {
      const { error } = validateSaveAnalysis({
        cvFileName: "cv.pdf",
        mode: "jd",
        tier: "basic",
        result: { matchScore: 70, skills: { cv: ["A".repeat(101)] } },
      });
      expect(error).toBeDefined();
    });

    test("strips trailing whitespace in cvFileName", () => {
      const { value } = validateSaveAnalysis({
        cvFileName: "  cv.pdf  ",
        mode: "jd",
        tier: "basic",
        result: { matchScore: 70 },
      });
      expect(value.cvFileName).toBe("cv.pdf");
    });

    test("handles null/undefined/empty gracefully", () => {
      expect(validateSaveAnalysis(null).error).toBeDefined();
      expect(validateSaveAnalysis(undefined).error).toBeDefined();
      expect(validateSaveAnalysis({}).error).toBeDefined();
    });
  });
});
