# 설치·운영 기록

> 작성일: 26-11-28\
> 최종 수정일: 26-11-28

파일매니저(웹)로 쓰는 FileBrowser Quantum(FBQ)을 홈서버에 어떻게 설치했고, 시험할 때 어떻게 켜고 끄며, 무엇을 어떻게 확인했는지 적는다. 요구사항은 [discussion.md](works/26-11-27-file-manager/discussion.md)의 "요구사항" 절이다.

## 현재 상태

- FBQ v2.1.0-stable을 설치했고, 시험용 폴더를 루트로 시험을 마쳤다. 지금은 꺼져 있다.
- Windows 서비스 등록, cloudflared 설치, Cloudflare 연결은 아직 하지 않았다.
- 루트는 시험용 폴더다. `C:\_workspace`로 바꾸는 것은 사용자가 시험 결과를 확인한 뒤 정한다.

## 설치한 것과 위치

| 항목 | 위치 | 비고 |
| --- | --- | --- |
| 실행 파일 | `C:\_Utility\filebrowser-quantum\filebrowser.exe` | v2.1.0-stable의 `filebrowser.exe`(Windows amd64), 28,762,112바이트 |
| 설정 | `C:\_Utility\filebrowser-quantum\config.yaml` | 저장소의 [deploy/fbq/config.yaml](../deploy/fbq/config.yaml)을 복사한 것이다. 설치 폴더에서 고치지 않는다 |
| DB | `C:\_Utility\filebrowser-quantum\data\filebrowser.sqlite` | 처음 켤 때 만들어진다. 사용자, 권한, 세션 서명 키가 들어간다 |
| 캐시·색인 | `C:\_Utility\filebrowser-quantum\cache\` | 썸네일, 검색 색인(`sql\index_all.db`), 내려받기 임시 파일 |
| 시험용 폴더(루트) | `C:\_Utility\filebrowser-quantum\sandbox\` | 아래 "시험용 폴더" 참고 |

DB와 캐시는 루트 밖에 있으므로 앱 화면에 보이지 않는다.

### 내려받은 파일의 검증

- 내려받은 곳: `https://github.com/gtsteffaniak/filebrowser/releases/download/v2.1.0-stable/filebrowser.exe`
- 릴리스에는 체크섬 파일이 따로 없다. 대신 GitHub가 릴리스 자산마다 SHA-256 다이제스트를 공개한다(`gh api repos/gtsteffaniak/filebrowser/releases/tags/v2.1.0-stable`의 `assets[].digest`).
- 공개된 값과 내려받은 파일의 SHA-256이 같다: `653637B683BE14633D1FA8FB3E79D066A0D048F2FD17A5D8989649B68C57E2B4`
- 실행 파일에는 Authenticode 서명이 없다(`Get-AuthenticodeSignature` 결과 `NotSigned`). 검증은 위의 해시 대조뿐이다.

## 설치 방법

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File deploy\fbq\install.ps1
```

[install.ps1](../deploy/fbq/install.ps1)은 다음을 한다.

1. FBQ가 설치 폴더의 실행 파일로 돌고 있으면 멈추라고 하고 끝낸다.
2. 설치 폴더와 `data`, `cache`, `sandbox` 폴더를 만든다.
3. 설치된 실행 파일의 해시가 고정한 값과 같으면 내려받지 않는다. 다르거나 없으면 새로 만든 빈 임시 폴더에 내려받아 해시를 대조하고, 같을 때만 설치 폴더로 복사한다. 다르면 아무것도 설치하지 않고 실패한다.
4. 저장소의 `config.yaml`을 설치 폴더로 복사한다.

버전을 올릴 때는 스크립트의 `$Version`과 `$ExpectedSha256`을 함께 바꾼다. 서비스 등록과 시험용 폴더의 예시 파일은 이 스크립트가 하지 않는다.

26-11-28에 확인한 것: 처음 실행에서 내려받기와 해시 대조가 통과했다. 다시 실행하면 내려받지 않고 설정만 복사했다. 해시 값을 일부러 틀리게 바꾼 사본을 다른 폴더로 실행하면 "SHA-256 mismatch"로 실패하고 실행 파일이 남지 않았다.

## 설정

설정의 원본은 [deploy/fbq/config.yaml](../deploy/fbq/config.yaml)이다. FBQ는 알 수 없는 키가 있으면 시작하지 않으므로(`yaml.DisallowUnknownField`), 시작했다는 것 자체가 키 이름이 맞다는 확인이 된다.

| 요구사항 | 설정 키 | 확인한 곳 |
| --- | --- | --- |
| `127.0.0.1:8090`에서만 받는다 | `http.listen: "127.0.0.1"`, `http.port: 8090` | [HTTP 문서](https://filebrowserquantum.com/en/docs/configuration/http/), 소스 `backend/pkg/settings/structs.go`의 `Http.ListenAddress`(`json:"listen"`, 기본값 `0.0.0.0`) |
| 루트는 시험용 폴더 | `server.sources[0].path` | [Sources 문서](https://filebrowserquantum.com/en/docs/configuration/sources/) |
| Access 헤더를 믿는 프록시 인증 | `auth.methods.proxy.enabled: true`, `auth.methods.proxy.header: "Cf-Access-Authenticated-User-Email"` | [프록시 인증 문서](https://filebrowserquantum.com/en/docs/configuration/authentication/proxy/), 소스 `backend/pkg/settings/auth.go`의 `ProxyAuthConfig` |
| 비밀번호 로그인 없음 | `auth.methods.password.enabled: false` | 소스 `backend/pkg/settings/config.go`의 `setupAuth`. 비밀번호 로그인의 기본값은 켜짐이라 명시적으로 끈다. 끄면 `backend/internal/state/quick_setup.go`가 admin 계정을 만들지 않는다 |
| 삭제 금지, 그 밖의 파일 조작 허용 | `server.sources[0].config.defaultPermissions`의 `view`, `download`, `modify`, `create`를 `true`, `delete`를 `false` | 소스 `backend/internal/database/users/users.go`의 `SourceFilePermissions`, 권한 검사는 `backend/internal/web/resource.go` |
| 공유 링크 없음 | `userDefaults.account.permissions.share: false`, `server.sources[0].config.private: true` | Sources 문서의 `private`("no sharing permitted"), 소스 `structs.go`의 `UserDefaultsAccountPermissions` |
| `.env*`, `.git`, `*.properties` 숨김 | `server.sources[0].config.rules`의 `fileStartsWith: ".env"`, `folderName: ".git"`, `fileName: ".git"`, `fileEndsWith: ".properties"` | [조건 규칙 문서](https://filebrowserquantum.com/en/docs/advanced/source-configuration/conditional-rules/), 소스 `backend/pkg/indexing/indexingFiles.go`의 `IsViewable`, `ShouldSkip` |
| 업로드 조각 크기 10MB | 설정하지 않는다(기본값) | 소스 `config.go`의 `UploadChunkSize: 10`. 만들어진 사용자의 `fileLoading.uploadChunkSizeMb`가 10이다 |
| DB와 데이터는 루트 밖 | `server.database.path`, `server.cacheDir` | 소스 `structs.go`의 `Database.Path`, `Server.CacheDir` |

요구사항 밖에서 정한 것: `http.disableWebDAV: true`로 WebDAV를 껐다. 요구사항에 없는 접근 경로라서다.

권한 이름과 조작의 대응은 소스에서 확인했다. 새 폴더와 새 파일 업로드는 `create`, 이름 바꾸기와 이동은 `modify`, 같은 이름 덮어쓰기와 편집 저장은 `modify`, 삭제는 `delete`, 내려받기와 zip은 `download`가 필요하다.

### 설정을 바꿀 때 알아 둘 것

- `defaultPermissions`는 프록시 인증으로 사용자가 처음 만들어질 때 그 사용자에게 들어간다. 이미 만들어진 사용자의 권한은 이 값을 바꿔도 그대로다(소스 `backend/internal/web/auth.go`의 `getOrCreateAuthenticatedUser`).
- 숨김 규칙의 이름 비교는 대소문자를 구분한다(`strings.HasPrefix`, `strings.HasSuffix`). `.ENV`나 `x.PROPERTIES`는 숨겨지지 않는다.
- 설정 파일이 있는 폴더의 `*-config.yaml`도 함께 읽힌다(소스 `backend/pkg/settings/yaml.go`). 설치 폴더에 다른 YAML을 두지 않는다.
- 관리자(admin) 계정은 없다. 프록시 인증으로 만들어지는 사용자는 관리자가 아니므로 화면에서 설정과 권한을 바꾸지 못한다. 관리자가 필요하면 `filebrowser.exe -c <config> user promote <사용자>`로 올릴 수 있다(소스 `backend/cmd/kong.go`, 시험하지 않았다).

## 시험할 때 켜고 끄기

Windows 서비스로 등록하기 전의 시험용 절차다.

앞에서 켜기(끌 때는 Ctrl+C):

```powershell
& 'C:\_Utility\filebrowser-quantum\filebrowser.exe' -c 'C:\_Utility\filebrowser-quantum\config.yaml'
```

뒤에서 켜기:

```powershell
$p = Start-Process -FilePath 'C:\_Utility\filebrowser-quantum\filebrowser.exe' `
  -ArgumentList '-c','C:\_Utility\filebrowser-quantum\config.yaml' `
  -WorkingDirectory 'C:\_Utility\filebrowser-quantum' -WindowStyle Hidden -PassThru
```

끄기와 꺼졌는지 확인:

```powershell
Get-Process -Name filebrowser -ErrorAction SilentlyContinue |
  Where-Object Path -eq 'C:\_Utility\filebrowser-quantum\filebrowser.exe' | Stop-Process
Get-NetTCPConnection -LocalPort 8090 -State Listen -ErrorAction SilentlyContinue   # 아무것도 나오지 않아야 한다
```

- 켜진 뒤 `Running at : http://127.0.0.1:8090/`이 찍히기까지 이 PC에서 약 25초 걸렸다.
- 브라우저로 `http://127.0.0.1:8090/`을 바로 열면 헤더가 없어 로그인되지 않는다. 화면으로 시험하려면 헤더를 넣어 주는 브라우저 확장이 필요하거나, Cloudflare를 연결한 뒤에 한다. 이번에는 화면을 시험하지 않았다.
- Git Bash의 curl로 API를 부를 때는 `MSYS_NO_PATHCONV=1`을 둔다. 없으면 `path=/`가 `C:\Program Files\Git`으로 바뀌어 요청이 깨진다.

## 시험용 폴더

`C:\_Utility\filebrowser-quantum\sandbox\`에 시험용 예시 파일을 손으로 만들어 두었다. 저장소에는 넣지 않는다.

| 경로 | 용도 |
| --- | --- |
| `README.md`, `edit-me.md`, `notes.txt` | 마크다운·텍스트 보기와 편집 |
| `src\Hello.java`, `src\app.ts` | 코드 보기 |
| `image.png`, `doc.pdf` | 이미지·PDF 보기 |
| `.env`, `.env.local`, `nested\level1\.env.production` | 숨김(`fileStartsWith`) 확인. 값은 가짜다 |
| `.git\config`, `.git\HEAD` | 숨김(`folderName`) 확인 |
| `nested\worktree\.git`(파일), `nested\worktree\.gitignore` | 워크트리식 `.git` 파일은 숨기고 `.gitignore`는 보이는지 확인 |
| `application.properties`, `nested\level1\db.properties` | 숨김(`fileEndsWith`) 확인 |
| `nested\level1\sub.env.example` | `.env`가 이름 가운데에 있으면 보이는지 확인 |
| `nested\level1\level2\deep.txt` | 중첩 폴더 |
| `big\big-150mb.bin` | 조각 업로드 시험용 150MB(157,286,400바이트) 난수 파일 |

시험 뒤에 시험 중 만든 파일을 지우고 `edit-me.md`를 원래 내용으로 돌렸다. 시험 중에 만들어진 사용자가 남지 않도록 `data\`의 DB와 `cache\`도 비웠다. 다음에 켜면 DB를 새로 만든다.

## 확인한 것 (26-11-28)

FBQ를 뒤에서 켜고 curl로 헤더를 직접 넣어 확인했다. 헤더 값은 가짜 주소 `tester@example.com`을 썼다. API 경로와 매개변수는 소스 `backend/internal/web/httpRouter.go`와 각 핸들러의 주석에서 확인했다. 아래 명령의 `$H`는 `Cf-Access-Authenticated-User-Email: tester@example.com`, `$B`는 `http://127.0.0.1:8090/api`다.

| 확인 | 명령 | 결과 |
| --- | --- | --- |
| `127.0.0.1`에서만 듣는다 | `Get-NetTCPConnection -State Listen -OwningProcess <PID>` | `127.0.0.1:8090` 하나 |
| 다른 주소로는 닿지 않는다 | 이 PC의 LAN IPv4, Tailscale IPv4, `[::1]`로 `curl http://<주소>:8090/` | 모두 연결 실패. `127.0.0.1`은 200 |
| 헤더 없는 요청은 거부 | `curl "$B/resources?source=sandbox&path=%2F"` | 401 |
| 헤더 값이 빈 요청은 거부 | `curl -H 'Cf-Access-Authenticated-User-Email;' ...` | 401 |
| 비밀번호 로그인 없음 | `curl -X POST "$B/auth/login?username=admin" -H 'X-Password: admin'`, 첫 화면 HTML의 설정 값 | 401. `passwordAvailable:false`, `proxyAvailable:true`. 시작 로그 `Auth Methods : [proxy]` |
| 헤더가 있으면 목록이 보인다 | `curl -H "$H" "$B/resources?source=sandbox&path=%2F"` | 200. 폴더 `big`, `nested`, `src`, 파일 `README.md`, `doc.pdf`, `edit-me.md`, `image.png`, `notes.txt` |
| 목록에서 숨김 | 위와 같이 `/`, `/nested/level1/`, `/nested/worktree/`를 본다 | `.env`, `.env.local`, `.env.production`, `.git` 폴더, `.git` 파일, `*.properties`가 없다. `sub.env.example`, `.gitignore`, `keep.txt`는 보인다 |
| 숨긴 폴더 목록 | `curl -H "$H" "$B/resources?source=sandbox&path=%2F.git%2F"` | 500(보이지 않는 경로로 거부) |
| 검색에서 숨김 | `curl -H "$H" "$B/tools/search?query=<낱말>&sources=sandbox"`, 낱말 `env`, `properties`, `git`, `config`, `HEAD`, `local`, `production` | `env`는 `nested/level1/sub.env.example`만, 나머지는 결과 없음. 대조로 `notes`는 `notes.txt`가 나온다 |
| 새로 만든 파일도 숨김 | `/newdir/`에 `.env.new`, `new.properties`, `.git/`, `visible.txt`를 올리고 목록과 검색을 본다 | 목록에는 `visible.txt`만 있다. 디스크에는 넷 다 있다 |
| 숨긴 파일을 정확한 경로로 받기 | `curl -H "$H" "$B/resources/download?source=sandbox&file=%2F.env"`, `"$B/raw?..."` | **받힌다(200, 내용이 그대로 온다).** `.env*`, `.git/config`, `.git/HEAD`, 워크트리 `.git`, `*.properties` 모두 같다. 요구사항이 받아들인 위험이다 |
| 숨긴 파일의 정보·내용 조회 | `curl -H "$H" "$B/resources?source=sandbox&path=%2F.env&content=true"` | 500(거부). 화면의 미리보기와 편집기로는 열리지 않을 것으로 본다(화면은 시험하지 않았다) |
| 폴더 zip에 숨긴 파일이 들어가는가 | `curl -H "$H" "$B/resources/download?source=sandbox&file=%2Fnested"` 후 zip 목록 | **들어간다.** `nested/level1/.env.production`, `nested/level1/db.properties`, `nested/worktree/.git`이 zip 안에 있다 |
| 삭제 거부 | `curl -X DELETE -H "$H" "$B/resources?source=sandbox&path=%2Fnotes.txt"`, 폴더 `/newdir/`, 업로드한 파일, `DELETE $B/resources/bulk` | 403, 403, 403, 207(`user is not allowed to delete`). 파일은 그대로 있다 |
| 새 폴더 | `curl -X POST -H "$H" "$B/resources?source=sandbox&path=%2Fnewdir%2F&isDir=true"` | 200, 디스크에 생긴다 |
| 업로드 | `curl -X POST -H "$H" --data-binary '...' "$B/resources?source=sandbox&path=%2Fnewdir%2Fup.txt"` | 200, 내용이 맞다 |
| 같은 이름 업로드 | 위를 다시, 그다음 `&override=true`를 붙여 | 409, 그다음 200으로 덮어쓴다 |
| 이름 바꾸기 | `curl -X PATCH -H "$H" "$B/resources" --data '{"action":"rename","items":[{"fromSource":"sandbox","fromPath":"/newdir/up.txt","toSource":"sandbox","toPath":"/newdir/renamed.txt"}]}'` | 200 |
| 이동 | 같은 형식으로 `"action":"move"`, `/src/renamed.txt`로 | 200 |
| 편집 저장 | `curl -X PUT -H "$H" --data-binary '...' "$B/resources?source=sandbox&path=%2Fedit-me.md"` | 200, 디스크의 내용이 바뀐다 |
| 공유 링크 거부 | `curl -X POST -H "$H" "$B/share" ...`, `curl -H "$H" "$B/share/list"` | 403, 403 |
| 만들어진 사용자의 권한 | `curl -H "$H" "$B/users?username=self"` | `loginMethod: proxy`, `admin/api/share: false`, 소스 권한 `view/download/modify/create: true`, `delete: false`, `uploadChunkSizeMb: 10` |
| 150MB 조각 업로드 | 10MB씩 15번 `curl -X POST` 헤더 `X-File-Chunk-Offset`, `X-File-Total-Size`, `X-File-Upload-Session`(웹 화면이 보내는 것과 같은 방식, 소스 `resource.go`) | 15번 모두 200, 마지막 응답 `complete:true`. 올라간 파일의 SHA-256이 원본과 같다 |
| 끈 뒤 | `Get-NetTCPConnection -LocalPort 8090 -State Listen`, `Get-Process filebrowser` | 듣는 것 없음, 프로세스 없음 |

### 확인하며 알게 된 것

- 숨김 규칙은 목록, 검색, 색인, 정보 조회에서만 막는다. 정확한 경로를 알면 `/api/resources/download`와 `/api/raw`로 받을 수 있고, 숨긴 파일이 든 폴더를 zip으로 받으면 zip 안에 들어간다. 앞의 것은 요구사항이 받아들인 위험이다. 뒤의 것(폴더 zip)은 요구사항이 다루지 않았다.
- FBQ는 헤더로 처음 확인한 사용자에게 세션 쿠키(유효 기간 2시간+30분, `auth.tokenExpirationHours` 기본값 2)를 준다. 그 쿠키만 있으면 헤더 없이도 요청이 통과한다. Cloudflare를 거치는 요청은 Access가 먼저 막으므로, 이 점이 문제가 되는 것은 같은 PC에서 오는 요청뿐이다. 같은 PC의 위험은 요구사항이 받아들였다.
- Access가 헤더에 다른 이메일을 넣으면 FBQ는 그 이메일로 사용자를 새로 만든다. 누구를 들여보낼지는 Access의 허용 이메일 하나에 달려 있다.

## 남은 일

- FBQ를 사용자의 Windows 계정으로 도는 서비스로 등록한다(방법은 아직 확인하지 않았다).
- cloudflared 설치와 터널 연결. 사용자가 네임서버 이전과 Zero Trust 설정을 마친 뒤에 한다.
- Tunnel을 거쳐 100MB를 넘는 파일이 올라가는지 시험한다.
- 사용자가 시험 결과를 확인하고 루트를 `C:\_workspace`로 바꿀지 정한다.
