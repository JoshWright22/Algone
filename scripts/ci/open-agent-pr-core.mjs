// Tries each token source in order until a pull request opens.
export async function openWithFallback(sources, attempt) {
  const errors = [];
  for (const { name, get } of sources) {
    try {
      const token = await get();
      if (!token) throw new Error("no token");
      return { used: name, url: await attempt(token), errors };
    } catch (e) {
      errors.push(`${name}: ${e.message}`);
    }
  }
  return { used: null, url: null, errors };
}

export const prBody = (issue) =>
  `Closes #${issue}.\n\nOpened by the claude-fix workflow after a maintainer labeled the issue. Review before merging.\n`;
