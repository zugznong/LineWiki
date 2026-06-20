import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Expected migration files matching the main branch standard
const expectedMigrations = [
  '0001_profiles_and_foundation.sql',
  '0002_research_foundation.sql',
  '0003_discussion_foundation.sql',
  '0004_analysis_foundation.sql',
  '0005_rls_policies.sql',
  '0006_auth_profile_trigger.sql',
  '0008_analysis_engine_identity.sql',
  '0009_analysis_score_pov.sql',
  '0010_analysis_stability_columns.sql',
  '0011_analysis_job_locking.sql',
  '0012_research_line_unique.sql',
  '0013_profile_avatar_storage.sql',
  '0014_deep_research_submissions.sql',
  '0015_deep_research_audit.sql',
  '0016_research_tree_nodes.sql',
  '0017_research_annotations.sql',
  '0018_research_contribution_requests.sql',
  '0019_research_votes_comments.sql',
  '0020_analysis_position_summaries.sql',
  '0021_bug_reports.sql',
  '0022_research_root_node.sql',
  '0023_research_line_tree.sql',
  '0024_research_line_occurrences.sql',
  '0025_research_tree_projection_model.sql'
];

// 이 파일의 위치 기준에서의 repository root 경로 고정 계산
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const migrationsDir = path.resolve(repoRoot, 'supabase/migrations');

function verifyIntegrity() {
  console.log(`[Migration Integrity] Checking path: ${migrationsDir}`);
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migration directory not found at: ${migrationsDir}`);
  }

  const actualFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`[Migration Integrity] Expected file count: ${expectedMigrations.length}`);
  console.log(`[Migration Integrity] Actual file count: ${actualFiles.length}`);

  const missingFiles = expectedMigrations.filter(item => !actualFiles.includes(item));
  const unexpectedFiles = actualFiles.filter(item => !expectedMigrations.includes(item));

  if (missingFiles.length > 0) {
    console.error(`[CRITICAL] Missing expected migrations in filesystem:`, missingFiles);
  }
  if (unexpectedFiles.length > 0) {
    console.error(`[CRITICAL] Found unexpected migrations not defined in main contract:`, unexpectedFiles);
  }

  if (missingFiles.length > 0 || unexpectedFiles.length > 0) {
    console.error(`[CRITICAL] Migration parity failed! Real files do not match the expected deployment manifests.`);
    process.exit(1);
  }

  console.log(`[SUCCESS] Migration integrity checks passed! Match count: ${actualFiles.length}/${expectedMigrations.length}`);
}

verifyIntegrity();
