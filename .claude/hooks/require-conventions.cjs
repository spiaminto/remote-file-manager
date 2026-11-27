// require-conventions — 소스 코드를 다루는 에이전트가 코드 컨벤션을 읽게 하는 훅
//
// [하는 일]
//   메인 세션이 마지막 압축 이후 docs/CONVENTIONS.md를 Read한 기록이 transcript에 없을 때, 파일 도구로
//   src/ 아래 소스 파일을 고치려는 호출은 미리 막고, 셸 명령이 소스 파일을 바꾸면 사후에 점검을 요구한다.
//   서브에이전트에게는 시작할 때 문서의 내용을 컨텍스트에 넣는다.
//
// [만든 이유]
//   코드를 작성하거나 리뷰하는 에이전트가 그 전에 코드 컨벤션을 반드시 읽게 하려는 것이다.
//   컨벤션은 에이전트의 기본 동작이나 기존 코드의 스타일과 다른 것을 모은 문서라서, 읽지 않은 에이전트는
//   자기 기본값대로 작성한다. 메인 세션은 코드를 고치기 직전에 읽게 하고, 압축 뒤에는 읽은 내용이
//   컨텍스트에서 사라지므로 다시 읽게 한다. 서브에이전트는 리뷰만 하면 막을 호출이 없으므로,
//   읽게 하는 대신 넣어 준다.
//   그랑블루 클론(granblue-test-pstack)의 같은 이름 훅을 옮겼다. 그 훅은 Java 소스만 보았고,
//   이 프로젝트는 언어가 정해지지 않아 SOURCE_EXT의 확장자를 모두 본다.
//
// [외부 조건]
//   소스 파일은 Edit·Write 도구로 고친다(docs/CONVENTIONS.md에 명시). 셸 명령은 실행 전에 무엇을
//   바꿀지 알 수 없어 미리 막지 못하므로, 실행 전후의 파일 해시를 비교해 사후에 점검을 요구한다.
//   docs/CONVENTIONS.md는 MAX_INJECT자 이하로 유지한다. 넘으면 서브에이전트에게 내용 대신
//   읽으라는 지시만 들어간다. 언어가 정해지면 SOURCE_EXT를 그 언어의 확장자로 줄인다.
//
// [결과]
//   - 소스 파일과 무관한 호출                                → 통과 (exit 0)
//   - 메인 세션이 문서를 읽은 뒤의 호출                      → 통과 (exit 0)
//   - 메인 세션이 읽지 않고 파일 도구로 소스 파일을 고치려 함  → 차단 (PreToolUse exit 2)
//   - 메인 세션이 읽지 않은 상태에서 셸 명령이 소스 파일을 바꿈 → 점검 요구 (PostToolUse exit 2)
//   - 서브에이전트의 도구 호출                               → 통과 (exit 0). 시작할 때 문서를 받았다
//   - 서브에이전트의 시작                                    → 문서의 내용을 컨텍스트에 넣음 (SubagentStart)
//   - 입력 JSON을 해석하지 못한 경우                         → 통과 (exit 0). 훅 오류로 작업이 멈추지 않게 한다
//
// [한계]
//   셸 명령으로 한 수정은 되돌리지 않는다. 작업 트리를 통째로 바꾸는 git 명령(checkout, merge 등)은
//   사후 점검에서 뺀다. 그 명령에 섞인 수정은 잡지 못한다. 메인 세션이 코드를 고치지 않고 리뷰만
//   하면 막을 호출이 없다. 서브에이전트가 압축되면 넣어 준 내용이 사라진다. Explore와 Plan
//   에이전트에게는 넣지 않는다. src/ 밖의 소스(설정 파일, 스크립트)는 보지 않는다.
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const GUIDE = "docs/CONVENTIONS.md";
const SOURCE_EXT = ["ts", "tsx", "js", "jsx", "mjs", "cjs", "vue", "svelte", "go", "py", "rs", "java", "kt", "cs", "html", "css", "scss"];
const SOURCE = new RegExp(`(^|/)src/.+\\.(${SOURCE_EXT.join("|")})$`, "i");
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "out"]);
const SHELLS = new Set(["Bash", "PowerShell"]);
const TREE_MOVING_GIT = /\bgit\b[^|;&\n]*\s(checkout|switch|merge|rebase|pull|reset|stash|cherry-pick|revert|restore|worktree|am|apply|bisect)\b/;
const NO_INJECT = new Set(["Explore", "Plan"]);
const MAX_INJECT = 9000;
const SNAP_DIR = path.join(os.tmpdir(), "claude-require-conventions");
const SNAP_TTL_MS = 24 * 60 * 60 * 1000;
const TRANSCRIPT_LAG_MS = 400;

const norm = (p) => String(p || "").replace(/\\/g, "/").normalize("NFC");

function guideReadIn(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;
  let read = false;
  for (const line of fs.readFileSync(transcriptPath, "utf8").split("\n")) {
    if (!line) continue;
    let d;
    try { d = JSON.parse(line); } catch { continue; }
    // 압축되면 앞에서 읽은 내용이 컨텍스트에서 사라지므로 다시 읽게 한다
    if ((d.type === "system" && d.subtype === "compact_boundary") || d.isCompactSummary) {
      read = false;
      continue;
    }
    if (d.type !== "assistant") continue;
    for (const b of (d.message && d.message.content) || []) {
      if (b && b.type === "tool_use" && b.name === "Read" && norm(b.input && b.input.file_path).endsWith(GUIDE)) {
        read = true;
      }
    }
  }
  return read;
}

// transcript는 늦게 기록될 수 있으므로, 막기 전에 한 번 기다렸다가 다시 본다
function guideReadBeforeBlocking(transcriptPath) {
  if (guideReadIn(transcriptPath)) return true;
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, TRANSCRIPT_LAG_MS);
  return guideReadIn(transcriptPath);
}

// 프로젝트와 현재 폴더(워크트리)의 src/ 아래 모든 소스 파일의 경로 → 내용 해시
function hashSources(roots) {
  const out = {};
  const walk = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) walk(p);
      } else if (SOURCE.test(norm(p))) {
        out[norm(p)] = crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
      }
    }
  };
  for (const root of roots) walk(path.join(root, "src"));
  return out;
}

function snapPath(input) {
  const key = `${input.session_id || "nosession"}-${input.tool_use_id || "notool"}`.replace(/[^\w.-]/g, "_");
  return path.join(SNAP_DIR, `${key}.json`);
}

// 실행 후 이벤트가 오지 않아 남은 스냅샷을 치운다
function pruneSnapshots() {
  let names;
  try { names = fs.readdirSync(SNAP_DIR); } catch { return; }
  const now = Date.now();
  for (const n of names) {
    const p = path.join(SNAP_DIR, n);
    try { if (now - fs.statSync(p).mtimeMs > SNAP_TTL_MS) fs.unlinkSync(p); } catch {}
  }
}

function block(message) {
  process.stderr.write(message);
  process.exit(2);
}

function onPreToolUse(input, roots, guidePath) {
  const ti = input.tool_input || {};
  if (SHELLS.has(input.tool_name)) {
    if (TREE_MOVING_GIT.test(String(ti.command || ""))) return;
    if (guideReadIn(input.transcript_path)) return;
    pruneSnapshots();
    fs.mkdirSync(SNAP_DIR, { recursive: true });
    fs.writeFileSync(snapPath(input), JSON.stringify(hashSources(roots)));
    return;
  }
  if (!SOURCE.test(norm(ti.file_path || ti.notebook_path))) return;
  if (guideReadBeforeBlocking(input.transcript_path)) return;
  block(
    `소스 파일을 고치기 전에 코드 컨벤션을 Read 도구로 끝까지 읽어야 합니다: ${guidePath}\n` +
      "읽은 뒤 같은 작업을 다시 시도하세요.\n"
  );
}

function onPostToolUse(input, roots, guidePath) {
  if (!SHELLS.has(input.tool_name)) return;
  const p = snapPath(input);
  let before;
  try { before = JSON.parse(fs.readFileSync(p, "utf8")); } catch { return; }
  try { fs.unlinkSync(p); } catch {}
  const after = hashSources(roots);
  const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((f) => before[f] !== after[f])
    .sort();
  if (changed.length === 0) return;
  // 실행 전에는 transcript가 늦어 읽지 않은 것으로 보였을 수 있다
  if (guideReadIn(input.transcript_path)) return;
  block(
    "[반드시 점검] 코드 컨벤션을 읽지 않은 상태에서 셸 명령이 소스 파일을 바꿨습니다.\n" +
      changed.map((f) => `  - ${f}`).join("\n") + "\n" +
      `다른 작업을 하기 전에 반드시 ${guidePath} 를 Read 도구로 끝까지 읽고, 위 파일의 변경이 컨벤션에 맞는지 점검하세요. ` +
      "컨벤션에 어긋나면 바로잡으세요. 이후 소스 파일은 Edit·Write 도구로 고치세요.\n"
  );
}

function onSubagentStart(input, root, guidePath) {
  if (NO_INJECT.has(input.agent_type)) return;
  let text;
  try { text = fs.readFileSync(path.join(root, GUIDE), "utf8"); } catch { return; }
  const context =
    text.length <= MAX_INJECT
      ? `이 프로젝트의 코드 컨벤션(${GUIDE})입니다. 코드를 작성하거나 리뷰하는 일이면 아래 항목을 모두 지키세요. ` +
        "그 밖의 일이면 넘어가세요.\n\n" + text
      : `코드를 작성하거나 리뷰하는 일이면, 시작하기 전에 코드 컨벤션을 Read 도구로 끝까지 읽으세요: ${guidePath}`;
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: "SubagentStart", additionalContext: context } })
  );
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let input;
  try { input = JSON.parse(raw); } catch { process.exit(0); }
  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || ".";
  const guidePath = `${norm(root)}/${GUIDE}`;
  const event = input.hook_event_name;
  if (event === "SubagentStart") onSubagentStart(input, root, guidePath);
  else if (!input.agent_id) {
    const roots = [...new Set([root, input.cwd].filter(Boolean).map((r) => path.resolve(r)))];
    if (event === "PreToolUse") onPreToolUse(input, roots, guidePath);
    else if (event === "PostToolUse" || event === "PostToolUseFailure") onPostToolUse(input, roots, guidePath);
  }
  process.exit(0);
});
