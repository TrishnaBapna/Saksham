import { describe, it, expect } from "vitest";
import { FALLBACK_REPOSITORIES, FALLBACK_USER } from "@/lib/github";

describe("GitHub Integration & Fallback Resilience", () => {
  it("provides complete fallback repositories when GitHub API is rate limited", () => {
    expect(FALLBACK_REPOSITORIES.length).toBeGreaterThanOrEqual(6);
    const names = FALLBACK_REPOSITORIES.map((r) => r.name);
    expect(names).toContain("Saksham");
    expect(names).toContain("Kaushal-Setu");
    expect(names).toContain("Saarthi");
    expect(names).toContain("LUXORA");
  });

  it("fallback user profile matches Trishna Bapna's actual GitHub profile", () => {
    expect(FALLBACK_USER.login).toBe("TrishnaBapna");
    expect(FALLBACK_USER.avatar_url).toBe("https://avatars.githubusercontent.com/u/319284049?v=4");
    expect(FALLBACK_USER.html_url).toBe("https://github.com/TrishnaBapna");
    expect(FALLBACK_USER.public_repos).toBe(7);
  });
});
