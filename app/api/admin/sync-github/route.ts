import { NextResponse } from "next/server";
import { getRepositories, getUserProfile } from "@/lib/github";

export async function POST() {
  try {
    const [repos, user] = await Promise.all([
      getRepositories(),
      getUserProfile(),
    ]);

    return NextResponse.json({
      success: true,
      message: `Successfully refreshed ${repos.length} repositories for ${user.login}.`,
      count: repos.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("GitHub sync failed:", error);
    return NextResponse.json(
      { error: "Failed to synchronize with GitHub API" },
      { status: 500 }
    );
  }
}
