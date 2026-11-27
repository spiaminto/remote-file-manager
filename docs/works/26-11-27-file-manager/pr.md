# feat: FileBrowser Quantum을 시험용 폴더로 설치하고 설정한다

> 작성일: 26-11-28\
> 최종 수정일: 26-11-28

GitHub PR #1(https://github.com/spiaminto/remote-file-manager/pull/1)의 본문과 같다.

## 요구사항 해석

요구사항은 `docs/works/26-11-27-file-manager/discussion.md`의 "요구사항" 절이다.

- **루트:** 앱이 보여 주는 최상위 폴더로 해석했다. 요구사항은 `C:\_workspace`이지만 CLAUDE.md "경계"와 Q20 이후의 합의대로 이 PR에서는 시험용 폴더(`C:\_Utility\filebrowser-quantum\sandbox`)를 루트로 둔다.
- **삭제는 끈다:** 파일과 폴더 삭제를 API에서 거부하는 것으로 해석했다. 이름 바꾸기, 이동, 덮어쓰기, 편집 저장은 삭제가 아니므로 허용한다(FBQ에서는 `modify` 권한).
- **숨긴다:** 목록, 검색, 색인에서 빠지는 것으로 해석했다(Q13). 숨긴 파일을 정확한 경로로 받을 수 있고 폴더 zip에도 들어가는 것은 사용자가 받아들였다.
- **앱 로그인 한 번:** Access를 통과한 요청의 `Cf-Access-Authenticated-User-Email` 헤더로 FBQ가 사용자를 정하고, FBQ 자체 로그인은 두지 않는 것으로 해석했다(Q12).

## 묻지 않고 정한 것

- 포트는 8090이다. 8188, 5001(Tailscale serve), 8095(다른 프로그램)는 이미 사용 중이다.
- WebDAV를 껐다. 요구사항에 없는 접근 경로다.
- `.git` 폴더뿐 아니라 `.git` 파일(워크트리, 서브모듈)도 숨겼다.
- 관리자 계정을 두지 않았다. 비밀번호 로그인을 끄면 FBQ가 admin을 만들지 않고, 설정을 바꿀 때는 `deploy/fbq/config.yaml`을 수정한다.
- 설치 폴더의 `config.yaml`은 저장소의 원본을 `install.ps1`이 복사해 만든다.
- 이 단위(설치, 설정, 시험)는 서브에이전트가 했고, 메인 세션은 설정 파일과 문서를 요구사항과 대조했다. 요구사항 문서의 Q13 덧붙임과 캐시 우회 항목은 메인 세션이 직접 작성했다.
- 이 세션에는 pstack 플러그인이 올라오지 않아 pstack 스킬을 사용하지 못했다. CLAUDE.md "pstack 운용"의 원칙(단위 위임, PR 본문 앞쪽의 두 절)만 따랐다.

## 바뀐 것

- `deploy/fbq/config.yaml`: FBQ 설정의 원본. `127.0.0.1:8090`, 프록시 인증, 비밀번호 로그인 끔, 기본 권한(삭제 끔), 공유 끔, WebDAV 끔, 숨김 규칙.
- `deploy/fbq/install.ps1`: 고정한 버전을 내려받아 SHA-256을 대조하고, 같을 때만 설치하고 설정을 복사한다.
- `docs/operations.md`: 설치 위치, 검증, 시험 방법과 결과.
- `docs/open-access-paths.md`: 이 PC로 들어오는 열린 접속 경로 목록(Tailscale serve 둘, 계획 중인 Cloudflare Tunnel).
- `docs/works/26-11-27-file-manager/discussion.md`: Q13에 zip과 Cloudflare 평문 논의를 덧붙이고, 캐시 우회 규칙을 요구사항과 사용자가 할 일에 더했다.
- 작업 문서를 `docs/discussions/`에서 `docs/works/26-11-27-file-manager/`로 옮겼다(사용자의 지시). 디스커션은 `discussion.md`, 접속 경계 도식은 `file-manager.html`, 이 PR 본문은 `pr.md`다.
- `CLAUDE.md`: 계획 문서와 인터뷰 기록의 경로를 `docs/works/` 아래로 바꾸고, `pr.md` 작성 규칙을 더하고, PR 본문의 절 이름을 "요구사항 해석"으로 바꿨다.

## 증명

실제 앱을 띄워 curl로 헤더를 직접 넣어 확인했다. 명령은 `docs/operations.md`에 있다.

- `127.0.0.1:8090`에서만 듣는다. LAN 주소, Tailscale 주소, `[::1]`로는 닿지 않는다.
- 헤더 없음, 빈 헤더, 비밀번호 로그인은 401이다.
- `.env*`, `.git`, `*.properties`는 목록과 검색에서 빠진다. 새로 올린 `.env.new`도 빠지고, `.gitignore`와 `sub.env.example`은 보인다.
- 삭제는 403(bulk는 207 `not allowed to delete`)이고 파일이 남는다.
- 새 폴더, 업로드, 이름 바꾸기, 이동, 편집 저장은 200이다. 같은 이름 업로드는 409이고 `override=true`일 때만 덮어쓴다.
- 공유 링크는 403이다.
- 150MB 파일을 10MB 조각 15개로 올렸고, 올라간 파일의 SHA-256이 원본과 같다.
- 시험 뒤 FBQ를 멈췄다. 8090을 듣는 프로세스가 없고, 서비스와 예약 작업은 등록하지 않았다.

확인하지 못한 것: 브라우저 화면(브라우저가 헤더를 보내지 않아 Cloudflare 연결 뒤에 한다), Tunnel을 거친 100MB 초과 업로드.

## 건너뛴 것

- `no-comments` 점검과 `comment-sicko`: CLAUDE.md "pstack 운용"대로 돌리지 않는다.
- `/deslop`: `cursor-team-kit`이 설치되어 있지 않다.

## 다음 단위

- FBQ와 cloudflared를 사용자의 Windows 계정으로 도는 Windows 서비스로 등록한다.
- 사용자가 네임서버 이전과 Zero Trust 설정을 마치면 터널을 `files.spiaminto.com`에 연결하고 브라우저로 확인한다.
- 사용자가 시험 결과를 확인하면 루트를 `C:\_workspace`로 바꾼다.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
