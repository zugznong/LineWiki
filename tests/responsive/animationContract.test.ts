import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Helper to recursively walk directories
function getFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.resolve(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

// Extract specific prohibited animation keywords and validate against an allowlist
describe('Animation & Eye Fatigue Contract Tests', () => {
  // Prohibited raw animation identifiers that cause high eye fatigue
  const prohibitedAnimateClasses = [
    'animate-pulse',
    'animate-ping',
    'animate-fade-in',
    'animate-spin',
    'animate-\\[spin_\\d+s_linear_infinite\\]' // dynamic arbitrary spin animations
  ];

  // Specific components or files where certain animations are permitted (e.g. status pings, process spinners, theme preview icons)
  const allowlist: Record<string, string[]> = {
    // Engine Analysis status spinner & indicator
    'src/lib/components/panels/EnginePanel.svelte': ['animate-spin', 'animate-ping'],
    
    // Server status waiting indicators on core Shell layout
    'src/lib/components/position/PositionPageShell.svelte': ['animate-ping'],
    
    // Core loader fallback/skeletons inside Candidate Move List empty feedback
    'src/lib/components/moves/CandidateMoveList.svelte': ['animate-pulse'],
    
    // Theme selection board miniature preview visual effects
    'src/lib/components/settings/BoardThemePreview.svelte': ['animate-pulse'],
    
    // Form component status warning state indicators
    'src/lib/components/ui/TextInput.svelte': ['animate-ping'],
    
    // System recovery refresh widget button spinner
    'src/lib/components/ui/ErrorMessage.svelte': ['animate-spin'],
    
    // Drop grid visual outline activation fade transition
    'src/lib/components/board/BoardOverlay.svelte': ['animate-fade-in'],
  };

  it('should verify components and stylesheets do not contain prohibited eye-fatigue animation classes unless explicitly allowed', () => {
    const libDir = path.resolve(process.cwd(), 'src/lib');
    const allFiles = getFiles(libDir).filter(
      (f) => f.endsWith('.svelte') || f.endsWith('.css') || f.endsWith('.ts')
    );

    const violations: { file: string; match: string }[] = [];

    for (const file of allFiles) {
      // Normalize path to relative for easy matching and convert Windows path separator to POSIX style
      const relativePath = path.relative(process.cwd(), file);
      const normalizedPath = relativePath.split(path.sep).join('/');
      const fileContent = fs.readFileSync(file, 'utf-8');

      // Check each prohibited pattern
      for (const pattern of prohibitedAnimateClasses) {
        const regex = new RegExp(pattern, 'g');
        const matches = fileContent.match(regex);
        if (matches) {
          const allowedClasses = allowlist[normalizedPath];
          
          // Check if any of the matched raw components are not in the allowed classes
          const unallowedMatches = matches.filter(match => {
            if (!allowedClasses) return true;
            // Simply check if any allowed class exactly equals or matches the matched raw class
            return !allowedClasses.includes(match);
          });

          if (unallowedMatches.length === 0) {
            continue;
          }

          violations.push({
            file: normalizedPath,
            match: unallowedMatches[0] || pattern,
          });
        }
      }
    }

    // Assert there are no unlisted/prohibited animations implemented on plain ui elements
    expect(violations, `Found eye fatigue animation contract violations:\n${JSON.stringify(violations, null, 2)}`).toHaveLength(0);
  });
});
