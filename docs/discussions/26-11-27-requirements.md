# 파일매니저(웹): 사전 기획과 요구사항 인터뷰

> 작성일: 26-11-27\
> 최종 수정일: 26-11-28

사전 기획과 리서치(26-11-27)에서 시작해 `/grill-me` 요구사항 인터뷰(26-11-28)로 이어진 대화의 기록이다. 앞쪽의 "요구사항", "사용자가 할 일", "확인하지 못한 것"은 현재 상태를 정리한 절이고, 뒤쪽의 "대화 기록"은 사용자와 에이전트가 나눈 말을 순서대로 둔 것이다. 구현 세션은 "요구사항" 절을 요구사항으로 읽고, 근거가 필요하면 괄호 안의 질문 번호를 대화 기록에서 찾는다.

## 요구사항

**구성**

- 앱은 FileBrowser Quantum(FBQ) v2.1.0-stable이다. 직접 구현하지 않는다. 휴지통이 없어 불편하면 Spring 직접 구현을 다시 검토한다(Q11).
- 외부 접속은 Cloudflare Tunnel과 Access다. 호스트명은 `files.spiaminto.com`이다. Tailscale과 Funnel은 파일매니저에 쓰지 않는다(4장, Q1, Q17).
- `spiaminto.com`의 네임서버를 가비아에서 Cloudflare로 옮긴다(Q8, Q10).
- 로그인은 Access의 Google 로그인 한 번이다. 허용 이메일은 사용자 한 명이고 유지 기간은 24시간이다. Access에는 전용 OAuth 클라이언트를 쓴다(Q18, Q19).
- FBQ는 `Cf-Access-Authenticated-User-Email` 헤더를 믿는 프록시 인증을 쓰고, `127.0.0.1`에서만 연결을 받는다. cloudflared는 같은 PC에서 돈다. 같은 PC의 다른 프로그램이 헤더를 꾸밀 수 있는 위험은 받아들인다(Q12).
- FBQ와 cloudflared는 사용자의 Windows 계정으로 도는 Windows 서비스다. FBQ의 실행 파일과 데이터는 `C:\_Utility\filebrowser-quantum`에 둔다(Q15).

**기능과 권한**

- 루트는 `C:\_workspace` 전체다. 시험하는 동안은 시험용 폴더를 루트로 두고, 사용자가 시험 결과를 확인한 뒤 바꾼다(Q6, CLAUDE.md "경계").
- 탐색, 업로드(FBQ 기본값인 10MB 조각 분할), 내려받기, 폴더 zip 내려받기, 파일 이름 검색을 한다(Q4, Q7, Q9).
- 보기: 이미지, PDF, 텍스트와 코드, 마크다운. 편집: 텍스트와 마크다운. Office와 영상은 처음 범위가 아니다(Q2, Q9).
- 새 폴더, 이름 바꾸기, 이동은 허용한다. 삭제는 끈다. 덮어쓰기는 FBQ의 기본 동작을 따른다(Q6, Q11, Q14).
- `.env`로 시작하는 파일, `.git` 폴더와 파일, `.properties`로 끝나는 파일은 목록, 검색, 색인에서 숨긴다. 정확한 경로로 받거나 폴더를 zip으로 받으면 숨긴 파일도 받아지는 것은 받아들인다. `.env`와 `.properties`를 계속 숨길지는 써 보며 다시 정한다(Q13).
- `files.spiaminto.com`에는 Cloudflare 캐시 우회 규칙을 건다(Q13).
- 공유 링크는 없다(Q7).

**저장소와 작업 순서**

- 저장소에는 설정 파일(비밀값 제외), 설치 스크립트, 설치·운영 기록, 이 PC에서 밖으로 열린 접속 경로의 목록을 둔다. 열린 접속 경로 목록에는 tailnet 이름을 적지 않는다. pstack 작업 틀과 코드 규칙 훅은 그대로 둔다(Q16).
- FBQ를 먼저 설치해 시험용 폴더로 시험한다. Cloudflare 연결은 사용자가 네임서버 이전과 Zero Trust 설정을 마친 뒤에 한다. 대시보드 설정은 사용자가, 이 PC에서 하는 설치와 터널 연결은 에이전트가 한다(Q20).

## 사용자가 할 일

에이전트가 대신하지 않는다. CLAUDE.md "경계"대로 외부에 바로 드러나는 설정이다. 에이전트는 따라 할 절차를 문서로 쓴다.

- [ ] 가비아 관리 화면에서 `spiaminto.com`의 DNS 레코드 목록을 받는다(`notion-viewer` 등 서브도메인, MX, TXT 포함).
- [ ] Cloudflare에 `spiaminto.com`을 추가하고, 가져온 레코드를 가비아의 목록과 하나씩 대조한다. 기존 레코드는 "DNS only"로 둔다.
- [ ] 대조가 끝나면 가비아에서 네임서버를 Cloudflare가 알려 준 값으로 바꾼다.
- [ ] 기존 서브도메인이 그대로 열리는지 확인한다.
- [ ] Google Cloud 콘솔에서 Access 전용 OAuth 클라이언트를 만든다. 리디렉션 URI는 `https://<팀 이름>.cloudflareaccess.com/cdn-cgi/access/callback`이다.
- [ ] Zero Trust에 Google 로그인을 등록한다.
- [ ] Access 애플리케이션을 `files.spiaminto.com`에 만들고 허용 이메일 하나와 유지 기간 24시간을 넣는다.
- [ ] `files.spiaminto.com` 전체에 캐시를 우회하는 Cache Rule을 건다.
- [ ] 에이전트가 요청하면 브라우저에서 `cloudflared tunnel login`을 승인한다.
- [ ] 시험용 폴더로 시험한 결과를 확인하고, 루트를 `C:\_workspace`로 바꿀지 정한다.

## 확인하지 못한 것

설치하면서 확인한다. 요구사항과 어긋나면 사용자에게 묻는다.

- FBQ를 Windows 서비스로 돌리는 방법(자체 기능, WinSW, 안 되면 작업 스케줄러).
- 브라우저 화면에서의 동작. 로컬 시험은 curl로 헤더를 넣어 했고, 브라우저는 Cloudflare 연결 뒤에 확인한다.
- FBQ가 응답에 캐시 금지 헤더를 붙이는지. 캐시 우회 규칙을 걸면 결과는 같다.

FBQ 설정 키 이름과 숨김 패턴(`fileStartsWith`, `fileEndsWith`)은 로컬 설치에서 확인했다. 결과는 `docs/operations.md`에 있다.
- Tunnel 공개 호스트명에 100MB 한도가 걸린다는 Cloudflare의 직접 문장은 찾지 못했다. 두 문장을 이어 걸린다고 추정했다. 100MB를 넘는 파일이 Tunnel을 거쳐 올라가는지 시험한다.

## 용어

- **파일매니저(웹):** 이 프로젝트로 만드는 것. 사용자가 밖에서 브라우저로 홈서버의 파일을 탐색하고 올리고 내려받는 개인용 웹앱이다.
- **홈서버:** 이 저장소가 있는 상시 켜 둔 Windows 11 PC.
- **루트:** 앱이 보여 주는 최상위 폴더. 앱은 루트 밖의 경로를 읽거나 쓰지 않는다.
- **시험용 폴더:** 설치하고 시험하는 동안 루트로 두는 폴더. 실제 `C:\_workspace`의 파일을 건드리지 않으려고 둔다.
- **스킬:** 에이전트 스킬 파일. Q3의 "문서, 스킬 위주"의 스킬이다.
- **열린 접속 경로:** 다른 기기나 인터넷에서 이 PC의 서비스로 들어올 수 있는 길. 지금은 Tailscale serve(tailnet 안)와 Cloudflare Tunnel(파일매니저)이다.

## 확인한 환경

에이전트가 26-11-28에 이 PC에서 확인했다.

- 설치됨: Node 24, .NET, Java 21, Python, Tailscale(로그인되어 있음).
- 설치되지 않음: Docker, Go, cloudflared.
- `C:\_workspace` 바로 아래에 폴더가 33개 있다. `node_modules`를 빼고 `.env`로 시작하는 파일이 3개 있다.
- Tailscale은 `127.0.0.1:8188`과 `127.0.0.1:5001`을 tailnet 안에만 내보내고 있다. Funnel로 공개한 것은 없다.

## 대화 기록 1: 사전 기획과 리서치 (26-11-27)

with-ai 저장소의 세션에서 나눈 대화다. 결정이 아니라 생각을 정리하는 중의 기록이다. 사용자의 말은 원문의 순서대로 두고 맞춤법만 고쳤다. 에이전트의 조사와 판단은 사용자의 말과 나눠 적었다.

### 출발점 (사용자의 말)

> 다음과 같은 웹앱이 갖고 싶다. 이하 '파일매니저(웹)'이라 하겠다.
>
> 1. 내 컴퓨터는 상시 켜져 있는 일종의 홈서버다.
> 2. 외부에서 파일매니저 웹에 로그인하면, 내 홈서버의 설정해 둔 경로가 표시된다(`_workspace` 이하를 상정 중).
> 3. 자유롭게 탐색하고, 파일을 업로드하고, 내려받을 수 있다.
>
> 여기서,
>
> 1. 로그인은 OAuth만 허용했으면 좋겠다(OAuth 클라이언트 있음). 나 혼자만 쓸 거고, 비밀번호 같은 것을 따로 관리하지 않고 구글 OAuth를 쓰는 게 깔끔할 것 같다. 보안적으로도 보증된 방법이다.
> 2. 파일 뷰어. 상용, 오픈소스 중 가장 걸리는 부분이다. 내가 직접 구현하면 여기저기서 뷰어를 떼어 와서 붙일 수 있을 텐데, 기존에 있는 것을 쓰면 이 부분이 크게 제약될 것으로 판단한다.
>
> 위 내용을 인지하고, 현재 프로젝트 지침과는 상관없이 조사 좀.

홈서버는 지금 이 저장소가 있는 PC(Windows 11)다. 이 사실은 에이전트가 세션의 환경 정보로 확인했다.

### 1장. 기존 제품과 인증 방식 조사

#### 에이전트가 짚은 전제

- **뷰어 제약은 제품마다 다르다.** Filestash는 파일 형식마다 직접 만든 JS 뷰어를 플러그인으로 등록할 수 있다. "기존 제품을 쓰면 뷰어가 묶인다"는 FileBrowser Quantum과 copyparty에는 맞고 Filestash에는 맞지 않는다.
- **Google OAuth가 보증하는 것은 "누가 로그인했는가"까지다.** 로그인 전의 요청도 앱이 직접 받으면, 앱의 취약점은 OAuth로 막지 못한다. 그래서 인증을 앱의 앞단(Cloudflare Access, oauth2-proxy)에 두는 구성을 권했다.

#### 후보

원조 filebrowser(`filebrowser/filebrowser`)는 유지보수만 하는 모드라 후보에서 뺐다. 아래 표는 이때의 조사다. "문서에 없다", "확인하지 않았다"로 남은 칸은 인터뷰 중의 "제품 조사"에서 다시 확인했다.

| | Filestash | FileBrowser Quantum | copyparty |
| --- | --- | --- | --- |
| 뷰어 | 플러그인으로 약 140개 형식. Office(LibreOffice wasm, OnlyOffice), PSD·AI, DWG·DXF, 3D, RAW, 영상 HLS 변환 | 미디어 미리보기, 썸네일(Office, 영상, 3D). Office 편집은 OnlyOffice 연동 | 오디오·영상, 이미지 갤러리, 코드 하이라이트, 마크다운, cbz. Office는 Collabora(WOPI) |
| 직접 만든 뷰어를 붙이는 방법 | 있다. 런타임 플러그인(ZIP)의 `xdg-open` 모듈로 MIME별 JS 뷰어를 등록한다 | 문서에 없다 | 문서에 없다. UI를 고치는 JS 플러그인 정도다 |
| 로그인 | OIDC 플러그인, 프록시 헤더 인증 플러그인 | OIDC, 프록시 인증 | 앞단 IdP의 헤더로만 |
| Windows | 문서에 없다. Docker로 띄울 가능성이 크다 | 단일 실행 파일 | `copyparty.exe` |
| 큰 파일 업로드 | 문서에 없다 | 문서에 없다 | 청크 업로드와 이어 올리기. "프록시가 요청 크기를 제한해도 파일 크기 제한이 없다"고 적는다 |
| 라이선스 | 확인하지 않았다 | Apache-2.0 | 확인하지 않았다 |

#### 직접 구현하는 경우 (에이전트의 정리)

앞단 인증 뒤에 얇은 백엔드(목록, 업로드, 다운로드, 영상 탐색용 Range 요청)를 두고 뷰어는 라이브러리(pdf.js, Monaco, docx-preview, SheetJS 등)를 붙이는 구조다. 대신 경로 조작(`../`)으로 루트 밖을 읽히는 문제, 청크 업로드, Range 요청 처리처럼 기존 제품이 이미 다듬어 둔 부분을 직접 맡는다.

에이전트는 이때 "뷰어 확장성이 가장 중요하면 Filestash에 원하는 뷰어 하나를 붙여 보고, 막히면 직접 구현을 검토한다"를 권했다. 사용자는 이 추천에 답하지 않았다. 구성은 인터뷰의 Q11에서 정했다.

### 2장. Tailscale로 하는 방법

사용자: Tailscale이 켜져 있는데, 이걸로는 어떻게 안 되나? 전송량 제한이 있는 게 좀 꺼려져서.

에이전트가 조사한 것은 다음과 같다.

- **`tailscale serve`(tailnet 안에서만):** 인터넷에 공개되지 않는다. Tailscale 계정의 Google 로그인이 곧 관문이다. serve는 요청마다 `Tailscale-User-Login` 헤더로 접속한 사람의 이메일을 넘기고, 외부에서 보낸 같은 헤더는 지운다. 요청 크기 제한은 없다. 직접 연결이면 회선 속도가 나오고, 공용 중계(DERP)로 떨어지면 공정성을 위해 속도가 제한된다(Tailscale 블로그의 측정 하나에서 약 2.2Mbps). Tailscale을 설치한 기기에서만 접속할 수 있다.
- **Funnel(인터넷에 공개):** 아무 브라우저에서 접속할 수 있다. 공식 문서는 "설정으로 바꿀 수 없는 대역폭 제한이 있다"고만 적는다. Funnel 요청에는 신원 헤더가 붙지 않으므로, 앱이 직접 로그인을 처리하고 인터넷에 노출된다.
- **에이전트가 바로잡은 것:** Cloudflare 무료 플랜의 제한은 총 전송량이 아니라 요청 하나의 크기(100MB)다.

### 3장. Cloudflare Tunnel로 갈 때의 유저 플로우

사용자: 만약 Cloudflare Tunnel로 간다면, 유저 플로우가 어떻게 되나?

에이전트의 정리:

1. 브라우저로 `https://files.<도메인>`을 연다.
2. 요청은 Cloudflare에서 멈추고, Access가 로그인 쿠키가 없으면 로그인 화면으로 보낸다.
3. "Google로 로그인"에서 계정을 고른다.
4. Access가 이메일을 허용 목록과 대조한다. 허용되지 않은 계정은 여기서 막히고, 홈서버는 요청을 받지 않는다.
5. 통과하면 `CF_Authorization` 쿠키가 생기고, 요청이 터널을 거쳐 홈서버의 cloudflared를 통해 로컬 앱에 닿는다.
6. 세션 기간(기본 24시간) 안에는 1번에서 바로 앱 화면이 열린다.

이어서 확인한 것은 다음과 같다.

- **도메인이 필요하다.** Cloudflare에 DNS를 맡긴 도메인이 있어야 공개 호스트명과 Access를 붙일 수 있다. 도메인 없는 임시 터널에 Access를 붙일 수 없다는 것은 에이전트의 지식이고 이번에 확인하지 않았다.
- **업로드는 요청 하나에 100MB까지다.** 넘으면 413이다. 청크 업로드를 하는 앱이어야 큰 파일을 올린다. 다운로드에는 이 제한이 없다. 첫 응답이 100초 안에 오지 않으면 524가 난다는 사용자 보고가 있다.
- **앱의 로그인은 따로 남는다.** 셋 중 하나를 고른다. ① 앱이 Access의 JWT(`Cf-Access-Jwt-Assertion` 헤더)를 신뢰해 로그인을 한 번으로 끝낸다. ② 앱도 Google OIDC로 로그인한다(두 번째는 대개 계정 선택만). ③ 앱 자체 비밀번호(사용자가 원하지 않는다). 에이전트는 ①을 권하면서, 앱이 `127.0.0.1`에서만 연결을 받게 해야 한다는 조건을 붙였다. 공식 문서는 터널로 연결한 앱이면 JWT 검증이 필수는 아니라고 하지만, 그것은 터널 말고 다른 길이 없을 때만 성립한다. 사용자는 이때 답하지 않았고, 인터뷰의 Q12에서 정했다.
- **처음 한 번 하는 설정:** 도메인을 Cloudflare DNS에 연결한다. Windows에 cloudflared를 설치하고 터널을 만들어 `files.<도메인>`을 `http://localhost:<앱 포트>`로 잇는다. Zero Trust에 Google을 로그인 수단으로 등록한다(가진 OAuth 클라이언트를 재사용하고, 리디렉션 URI `https://<팀 이름>.cloudflareaccess.com/cdn-cgi/access/callback`을 더한다. 이 주소의 형식은 에이전트의 지식이고 대시보드의 값과 대조해야 한다). Access 애플리케이션을 만들어 사용자의 이메일 하나만 허용한다. 콜백 주소의 형식은 인터뷰 중의 "제품 조사"에서 확인했고, OAuth 클라이언트는 Q19에서 재사용 대신 새로 만들기로 했다.

### 4장. Funnel의 대역폭 제한

사용자: Tailscale Funnel 대역폭 제한은 몇이야? 저걸 저렇게 두면 어떡함.

에이전트가 확인한 것은 다음과 같다.

- 공식 수치는 없다. 문서는 "설정으로 바꿀 수 없는 대역폭 제한"이라고만 적는다.
- 실측은 포럼의 한 보고뿐이다. 영상 스트리밍이 1Mbps를 넘으면 안정적이지 않았고, 그것이 최대치를 잰 것은 아니라고 했다. 2023년 Stack Overflow의 같은 질문에는 답이 없다.
- 에이전트의 추측: 외부 요청은 Tailscale이 운영하는 중계 서버를 거치므로, Funnel은 웹훅, 데모, 가벼운 개인 페이지를 위한 기능으로 보인다.
- 결론: 파일매니저를 Funnel로 공개하는 길은 뺀다.

### 5장. 100MB 제한과 Cloudflare 약관

사용자가 에이전트의 문장("아무 브라우저에서나 접속해야 한다면 Cloudflare Tunnel + Access로 가세요. 제한이 요청 하나당 100MB로 공개돼 있어서, 청크 업로드를 하는 앱이면 피해 갈 수 있어요.")을 인용하고 물었다.

사용자: 이거를 안 막아 놨대? 당연히 대책을 세워 놨을 거라고 생각하는데..

에이전트의 답:

- **대책은 기술이 아니라 약관이다.** 앞의 "피해 갈 수 있다"는 기술적으로만 맞았고, 약관을 빠뜨린 것은 에이전트의 실수였다.
- **100MB는 전송량 장치가 아니다.** 프록시가 요청 하나를 받아 두는 크기의 상한이다. 여러 요청으로 나눠 올리는 것은 S3 멀티파트처럼 흔한 방식이라 우회로 취급되지 않는다.
- **약관(Service-Specific Terms):** Enterprise가 아닌 고객은 CDN으로 영상과 대용량 파일을 서비스하려면 Stream, Images, R2 같은 유료 서비스를 써야 한다. 그렇지 않으면 Cloudflare가 CDN 접근을 끄거나 제한할 수 있다. Tunnel의 공개 호스트명도 Free, Pro, Business에서 이 약관을 따른다. 영상이나 "불균형하게 많은 대용량 파일"을 내보내는 것으로 보이면 콘텐츠를 돌리거나 다른 조치를 할 수 있고, 통지하려고 노력한다고 적는다.
- **예외:** 사설 네트워크 경로(접속하는 기기에 WARP 클라이언트를 설치하는 방식)에는 이 제한이 적용되지 않는다. 구조가 `tailscale serve`와 같아서 "아무 브라우저" 조건은 충족하지 못한다.
- **"불균형하게"의 기준은 공개되지 않았다.** 에이전트의 추측: 문서 확인과 가끔 받는 파일 정도는 문제 되지 않고, 영상을 자주 스트리밍하거나 수 GB를 자주 주고받으면 조치 대상이 될 수 있다. 미디어 서버 사용자에게 실제로 어떻게 집행했는지는 확인하지 못했다.

에이전트는 주 용도에 따라 길을 나눴다.

| 주 용도 | 길 |
| --- | --- |
| 문서, 코드, 가끔 받는 파일 | Cloudflare Tunnel + Access |
| 영상 스트리밍, 대용량을 자주 전송 | `tailscale serve` |
| 둘 다 | 본인 기기는 Tailscale, 남의 기기는 Tunnel로 가볍게 |
| 아무 브라우저 + 대용량 | 포트를 열고 리버스 프록시와 oauth2-proxy를 직접 운영한다. 집 IP가 드러나고 인증서와 보안을 직접 챙긴다 |

에이전트가 "아무 브라우저에서 접속할 때 주로 하는 일"을 물었고, 사용자는 이 질문에 답하지 않고 다음 결정으로 넘어갔다. 주 용도는 인터뷰의 Q3에서 답했다.

### 6장. 방향

사용자: 일단 Cloudflare 쪽으로 구현해 보는 게 나을 듯.

같은 말에서 사용자는 이 프로젝트를 pstack과 얇은 층으로 스캐폴딩하고, 이 대화를 사전 기획과 리서치로 남기라고 했다. 에이전트가 세 가지를 묻고 사용자가 모두 추천대로 골랐다.

| 질문 | 사용자의 선택 |
| --- | --- |
| 디스커션을 어디에 두는가 | 이 프로젝트의 `docs/discussions/` |
| 스캐폴딩의 범위 | 작업 틀만 만든다. 앱의 구성은 `/grill-me`에서 정한다 |
| 코드 규칙과 훅 | 언어와 무관하게 옮긴다. 주석 규칙만 넣고, 훅은 `src/` 아래 소스 파일 전체를 본다 |

사전 기획을 마칠 때 남은 결정은 앱의 구성, 꼭 열어 봐야 하는 형식, 주 용도, 앱 로그인 처리, 100MB를 넘는 업로드, 도메인, 루트 경로와 권한의 일곱 가지였다. 아래 인터뷰가 이것들을 다뤘다.

## 대화 기록 2: 요구사항 인터뷰 (26-11-28)

이 저장소의 세션에서 `/grill-me`로 진행했다. 라운드마다 질문, 에이전트의 추천, 사용자의 답을 적는다. "정리"는 그 답으로 정해진 것이다.

### 1라운드

앱의 구성과 앱 로그인은 이 라운드의 답과 제품 조사에 달려 있어 뒤로 미뤘다.

#### Q1. 접속하는 기기

어디서 주로 여는가. 본인의 폰이나 노트북이면 Tailscale을 함께 쓰는 길이 열린다. 남의 PC(회사, PC방)에서도 열어야 하면 Tunnel만이 길이다.

- 추천: 없음. 사용자만 아는 사실이다.
- 답: 대용량 파일을 주고받는 일은 드물 것 같다. Tailscale을 반드시 설치해야 한다는 제약이 거슬리므로 Cloudflare Tunnel로 구현해 본다.
- 정리: 파일매니저에 Tailscale은 쓰지 않는다. 접속은 Tunnel 하나로 한다.

#### Q2. 꼭 열어 봐야 하는 형식

이미지, PDF, 텍스트와 코드, 마크다운, Office(Word, Excel, PowerPoint), 영상, 오디오, PSD, CAD 가운데 무엇을 브라우저에서 바로 열어야 하는가. 보기만 하는가, 편집도 하는가.

- 추천: 처음 범위는 이미지, PDF, 텍스트와 코드, 마크다운을 보기만 한다. Office와 영상은 Q3의 답을 보고 정한다.
- 답: 추천대로.
- 정리: 처음 범위의 뷰어는 이미지, PDF, 텍스트와 코드, 마크다운이다. Office와 영상은 처음 범위에서 뺀다. 편집은 Q9에서 텍스트와 마크다운을 더했다.

#### Q3. 영상과 대용량 내려받기

Tunnel로 영상을 자주 보거나 수 GB를 자주 내려받는가. 그렇다면 Cloudflare 약관에 따라 조치를 받을 위험이 있다.

- 추천: Tunnel로는 문서와 가끔 받는 파일만 다룬다. 영상과 대용량은 본인 기기에서 Tailscale로 다룬다(Q1에 달려 있다).
- 답: 문서와 스킬 위주로 주고받는다.
- 정리: 주 용도는 문서와 작은 파일이므로 Cloudflare 약관의 위험은 낮다고 본다.

#### Q4. 100MB를 넘는 업로드

100MB를 넘는 파일을 올리는가. 그렇다면 청크 업로드가 필요하고, 앱 구성의 선택지가 좁아진다.

- 추천: 가끔이라도 있다면 청크 업로드를 필수로 둔다. 없다면 단일 요청 업로드로 충분하다.
- 답: 청크 업로드는 어려운 기술이 아니라고 본다. 백엔드는 Spring으로 구현할 것 같고, 멀티파트 업로드로 하면 청킹은 Spring 설정으로 된다고 알고 있다.
- 에이전트가 짚은 전제: Spring의 멀티파트 업로드(`multipart/form-data`)는 파일 하나를 요청 하나에 담아 보낸다. Spring의 크기 설정은 서버가 받는 상한을 바꿀 뿐 요청을 나누지 않으므로, 200MB 파일은 여전히 200MB 요청 하나가 되어 Cloudflare에서 413으로 막힌다. 청크 업로드는 브라우저가 파일을 조각으로 잘라 여러 요청으로 보내고 서버가 다시 합치는 방식이며, 양쪽에 코드가 필요하다. 어렵지는 않고 tus 같은 표준 프로토콜과 라이브러리가 있다.
- 정리: Q11에서 FBQ로 정하면서, FBQ의 기본 10MB 분할 업로드로 100MB를 넘는 파일을 올린다.

#### Q5. 도메인

Cloudflare DNS에 맡겼거나 맡길 도메인이 있는가.

- 추천: 없다면 새로 산다. Access는 Cloudflare DNS에 연결된 호스트명에만 붙는다.
- 답: Cloudflare는 아니고, 가비아에 개인 도메인 `spiaminto.com`이 있다.
- 정리: 이 도메인을 Cloudflare에 붙이는 방법은 Q8과 Q10에서 정했다.

#### Q6. 루트와 권한

루트를 `C:\_workspace` 전체로 할지 일부로 할지, 그리고 어떤 조작을 허용할지 정한다. 조작은 새 폴더, 이름 바꾸기, 이동, 삭제, 덮어쓰기다. 루트 안에는 다른 프로젝트의 `.env`와 `.git`이 있다.

- 추천: 루트는 `C:\_workspace` 전체로 한다. 조작은 모두 허용하되 삭제는 휴지통으로 보내고, 덮어쓰기는 확인을 받는다. `.env*`와 `.git`은 목록에서 숨기고 내려받지도 못하게 한다.
- 답: 루트는 추천대로 한다. 삭제는 휴지통으로 옮기는 것만 허용하고, Shift+Delete 같은 영구 삭제는 막는다. `.env`와 `.git`을 어떻게 다룰지는 기술 스택을 정한 뒤 다시 정한다.
- 정리: 루트는 `C:\_workspace` 전체다(시험에서는 CLAUDE.md "경계"대로 시험용 폴더를 쓴다). 영구 삭제는 없다. 휴지통은 FBQ에 없어 Q11에서 삭제를 끄기로 했다. `.env`와 `.git`은 Q13에서, 덮어쓰기는 Q14에서 정했다.

#### Q7. 기본 기능 밖의 범위

탐색, 업로드, 내려받기 말고 무엇이 필요한가. 후보는 텍스트 편집, 파일 이름 검색, 폴더를 zip으로 내려받기, 남에게 주는 공유 링크다. Access는 사용자 한 명만 허용하므로, 공유 링크를 쓰려면 Access 정책에 예외 경로를 따로 열어야 한다.

- 추천: 처음 범위는 폴더 zip 내려받기와 파일 이름 검색만 한다. 텍스트 편집과 공유 링크는 뺀다.
- 답: 공유 링크는 필요 없다.
- 정리: 공유 링크는 뺀다. 나머지는 Q9에서 정했다.

#### 1라운드 뒤 사용자의 물음

사용자: 기존 오픈소스를 쓰는 방법은 고려하지 않는가? 구현을 통째로 하는 것처럼 느껴진다. 그쪽을 먼저 확인해야 하지 않나.

에이전트의 답: 고려하고 있다. 1라운드는 제품과 무관하게 필요한 조건(형식, 업로드 크기, 삭제 방식, 루트)을 모으는 라운드였고, 앱 구성은 이 답과 제품 조사로 정하기로 했다. 다만 Q6의 "숨긴다", "휴지통으로 보낸다"는 직접 구현을 전제로 한 것처럼 읽힐 수 있었다. 제품 조사(Windows에서 Docker 없이 실행, 청크 업로드, Access 헤더 신뢰, 경로 숨김, 휴지통)는 서브에이전트가 진행 중이며, 결과가 오면 1라운드의 조건으로 세 제품과 직접 구현을 비교한다.

### 2라운드

#### Q8. spiaminto.com을 Cloudflare에 붙이는 방법

Access를 쓰려면 파일매니저의 호스트명이 Cloudflare DNS가 관리하는 영역에 있어야 한다. 에이전트는 네임서버를 Cloudflare로 옮기고 `files.spiaminto.com`을 쓰는 것을 추천했고, 도메인을 지금 다른 곳에 쓰는지 물었다.

- 답: 쓰는 곳이 있다. `notion-viewer.spiaminto.com` 등 서브도메인을 여러 개 쓴다. 반드시 Cloudflare가 DNS를 맡아야 하는가?
- 에이전트가 확인한 것(Cloudflare DNS 문서):
  - 네임서버를 옮기지 않고 서브도메인 몇 개만 Cloudflare로 보내는 CNAME(부분) 설정은 Business와 Enterprise 플랜에서만 된다.
  - 서브도메인 하나(`files.spiaminto.com`)만 Cloudflare에 위임하는 설정은 Enterprise 계정에서만 된다.
  - 따라서 무료 플랜에서 `spiaminto.com` 아래 호스트명을 쓰려면 도메인 전체의 네임서버를 Cloudflare로 옮겨야 한다.
- 정리: 네임서버를 옮길지, 파일매니저용 도메인을 따로 둘지는 Q10에서 정했다.

#### Q9. Q7에서 남은 기능

- 추천: 폴더 zip 내려받기와 파일 이름 검색은 넣고, 텍스트 편집은 뺀다.
- 답: 추천대로. 이어서 텍스트와 마크다운은 편집할 수 있으면 좋겠다고 더했다.
- 정리: 처음 범위에 폴더 zip 내려받기, 파일 이름 검색, 텍스트와 마크다운 편집을 넣는다. 편집해서 저장하는 것은 덮어쓰기이므로 Q14에서 함께 정했다.

### 3라운드

#### Q10. 파일매니저의 도메인

A. `spiaminto.com`의 네임서버를 Cloudflare로 옮긴다(무료, 기존 레코드를 옮겨야 한다). B. 파일매니저용 도메인을 Cloudflare에서 새로 산다(연간 비용, 기존 도메인을 건드리지 않는다).

- 추천: A. 메일(MX)이나 가비아 전용 기능을 쓰고 있다면 B가 편할 수 있다.
- 답: A로 한다. 네임서버를 옮기는 일은 사용자가 한다.
- 정리: 파일매니저의 호스트명은 `files.spiaminto.com`으로 둔다(에이전트의 추천을 따른 가정이며 바꿀 수 있다).

### 제품 조사

3라운드 뒤에 서브에이전트가 공식 문서와 소스(Filestash master, FileBrowser Quantum v2.1.0-stable 이후 main, copyparty v1.20.28)를 읽고 보고했다. [확인]은 문서나 소스에서 직접 본 것, [추정]은 그로부터 추론한 것, [못 찾음]은 찾지 못한 것이다.

| 조건 | Filestash | FileBrowser Quantum(FBQ) | copyparty |
| --- | --- | --- | --- |
| Docker 없이 Windows에서 실행 | 안 된다. 공식 배포는 Linux 바이너리와 Docker뿐이고 Windows는 "Ask us" [확인] | Windows 실행 파일을 릴리스로 낸다 [확인] | `copyparty.exe` [확인] |
| 이미지, PDF, 텍스트·코드, 마크다운 보기 | 된다 [확인] | 된다. Office는 기본 미리보기만 [확인] | 된다 [확인] |
| 텍스트·마크다운 편집 | 된다 [확인] | 텍스트·코드 편집이 된다 [확인] | 마크다운 편집기가 있다(에이전트의 지식, 확인하지 않았다) |
| 사용자 정의 뷰어 | 플러그인으로 된다 [확인] | 방법이 없다. 요청 #1758이 열려 있다 [확인] | UI를 고치는 JS 정도 [확인] |
| 100MB를 넘는 업로드 | TUS 분할. 기본값이 꺼져 있어 켜야 한다 [확인] | 기본 10MB 분할, 일시정지·재개 [확인] | up2k 분할, "Cloudflare에서도 크기 제한 없음" [확인] |
| Cloudflare Access 뒤에서 로그인 | 헤더 인증은 공개 소스 밖의 플러그인, OIDC는 유료 [확인] | 프록시 헤더를 그대로 믿는다(`Cf-Access-Authenticated-User-Email` 지정 가능). JWT는 고정 키 하나만 받아 Cloudflare의 키 교체(6주)를 따라가지 못한다 [확인] | `--idp-h-usr`로 헤더를 믿는다. 프록시 출발지를 `--xff-src`로 제한한다 [확인] |
| 휴지통 | 플러그인이 목록에만 있고 받을 수 없다 [확인] | 없다. 로드맵에 "Unplanned" [확인] | 없다 [못 찾음] |
| 삭제 권한 끄기 | 된다 [확인] | 된다(에이전트의 지식) | 볼륨 권한에서 `d`를 뺀다 [확인] |
| 경로 차단(`.env` 등) | 직접 만든 플러그인으로만 [확인] | 경로 단위 deny는 다운로드에도 걸린다. 패턴 숨김은 목록·검색에서만 빠지고 다운로드는 막지 않을 가능성이 있다 [확인/추정] | 점 파일은 이름을 알면 받을 수 있다. 경로 차단은 README가 Windows에서 믿지 말라고 경고한다 [확인] |
| 라이선스 | AGPL-3.0, 일부 플러그인 유료 [확인] | Apache-2.0 [확인] | MIT [확인] |

- 세 제품 모두 Cloudflare Access의 JWT를 Cloudflare 공개키 목록(JWKS)으로 검증하지 않는다. 헤더를 믿는 방식이면 앱이 `127.0.0.1`에서만 연결을 받게 하는 것이 보안의 전제가 된다.
- Cloudflare: 프록시를 거치는 도메인의 업로드 한도는 Free 100MB이고, Tunnel 공개 호스트명은 Cloudflare 리버스 프록시를 거친다 [확인]. 두 문장을 이으면 Tunnel에도 100MB가 걸린다 [추정]. Google IdP 콜백 URL은 `https://<팀 이름>.cloudflareaccess.com/cdn-cgi/access/callback`이 맞다 [확인].

### 4라운드

#### Q11. 앱의 구성

Filestash는 Docker 없는 Windows와 Google 로그인 조건에서 빠진다. 남은 길은 셋이다.

- A. FBQ를 쓰고 앱의 삭제 권한을 끈다. 휴지통은 없고, 삭제는 PC 앞에서 한다. 나머지 조건은 설정으로 맞춘다.
- B. copyparty를 쓰고 삭제 권한을 끈다. A와 같은 한계에 더해, Windows에서 경로 차단을 믿을 수 없다.
- C. Spring으로 직접 구현한다. 휴지통, `.env` 패턴 차단, JWT 검증을 원하는 대로 만든다. 대신 목록, 분할 업로드, 뷰어, 편집기, zip, 검색, 루트 밖 접근 차단을 모두 직접 만들고 시험한다.

- 추천: A. 휴지통 하나를 빼면 조건을 설정으로 맞출 수 있다. 밖에서 삭제할 일이 잦아 휴지통이 꼭 필요하다면 C다.
- 답: A로 가서 써 보고, 불편하면 그때 직접 구현을 생각한다.
- 정리: 앱은 FBQ다. 앱에서의 삭제는 끈다. 휴지통이 없어 불편하면 C를 다시 검토한다. Cloudflare Tunnel과 Access 설정은 C로 가도 그대로 쓴다.

### 5라운드

FBQ로 정해지면서 열린 질문이다. FBQ의 설정 이름과 동작 가운데 조사 보고에 없는 것은 에이전트의 지식이며, 설치하면서 확인한다. Q12~Q16을 묻는 중에 사용자가 외부 접속 방식을 다시 물어 Q17을 먼저 정했고, Q12~Q16의 답은 그 뒤에 받았다.

#### Q12. 앱 로그인

- 선택지: ① FBQ가 Access가 넣어 주는 `Cf-Access-Authenticated-User-Email` 헤더를 믿는다(프록시 인증). 로그인은 Access에서 한 번이다. ② FBQ도 Google OIDC로 로그인한다. 두 번째 로그인은 대개 계정 선택만이다.
- 추천: ①. FBQ가 `127.0.0.1`에서만 연결을 받고 cloudflared가 같은 PC에서 돈다는 조건을 붙인다. FBQ의 JWT 인증은 Cloudflare의 키 교체를 따라가지 못하므로 쓰지 않는다. 같은 PC의 다른 프로그램은 헤더를 꾸며 보낼 수 있다.
- 답: 추천대로.
- 정리: ①로 한다. 같은 PC의 다른 프로그램이 헤더를 꾸밀 수 있는 위험은 받아들인다.

#### Q13. `.env`와 `.git`

- 처음 물은 것: 조건 규칙으로 `.env*`와 `.git`을 목록과 검색에서 숨기거나(이름을 알면 받을 수 있을 가능성이 있다), 경로 단위 deny 규칙으로 받기까지 막는다(파일마다 경로를 적어야 하고 새로 생긴 `.env`는 막지 못한다). 추천은 숨기기였다.
- 사용자가 되물은 것: 파일매니저에서 `.env`, `.git`을 숨기겠다는 말인가.
- 에이전트의 답: 그렇다. `.git`은 내부 파일이 많아 목록과 검색을 어지럽히고 웹에서 잘못 고치면 저장소가 망가질 수 있다. `.env`는 비밀값이 화면에 보이고, Cloudflare가 HTTPS를 풀었다가 다시 싸므로 내용이 Cloudflare를 평문으로 거친다. 선택지를 "둘 다 숨기기", "`.git`만 숨기기", "둘 다 보이기"로 다시 냈고, 추천은 둘 다 숨기기였다.
- 사용자가 되물은 것: 숨기기는 옵션으로 지원하는가.
- 에이전트의 답: 그렇다. FBQ의 소스별 조건 규칙(`fileNames`, `folderEndsWith`, `ignoreHidden` 등)으로 목록, 검색, 색인에서 뺀다 [확인]. 설정 파일에 적는 것이라 화면에서 켜고 끄지 못한다.
- 답: `.env`, `.git`, `.properties`를 숨긴다.
- 정리: `.env`로 시작하는 파일(`.env.local` 등 포함), `.git` 폴더, `.properties`로 끝나는 파일을 목록, 검색, 색인에서 숨긴다. 이름을 알면 받을 수 있을 가능성은 받아들인다.
- 로컬 설치 뒤에 더한 것: 숨긴 파일도 폴더 zip에는 들어간다는 것이 시험에서 드러났고, FBQ에는 zip에서 패턴으로 빼는 설정이 없다. 사용자는 받아들이는 것은 상관없다고 하면서, 숨긴 이유가 Access 인증보다 Cloudflare가 HTTPS를 풀어 내용을 평문으로 본다는 점이었다고 물었다. 같은 논리면 zip은 노출되지 않는가.
- 에이전트의 답: 평문을 볼 수 있는 것은 Cloudflare뿐이다. 브라우저와 Cloudflare 사이, Cloudflare와 cloudflared 사이는 암호화되고, cloudflared와 FBQ 사이의 평문은 같은 PC 안에서만 오간다. 이것은 터널을 지나는 모든 파일에 해당한다. 숨기기는 열거나 받지 않은 파일이 터널을 지나지 않게 할 뿐이고, zip에 들어간 숨긴 파일은 터널을 지나므로 같은 논리면 Cloudflare에 노출된다. 길은 받아들이고 비밀값이 든 폴더를 zip으로 받지 않기, 경로 단위 차단 시험(zip에 걸리는지 확인하지 않았고 새 파일을 막지 못한다), 비밀값은 Tailscale로 받기였고, 추천은 첫째였다.
- 사용자가 다시 한 말: 그렇다면 비밀값을 굳이 숨길 필요가 있나. Cloudflare가 파일 내용을 하나하나 로깅할까. zip 한 번 잘못 받으면 어차피 노출되는 것인데 고민된다.
- 에이전트가 확인한 것: Cloudflare의 Data Transit Privacy 백서는 프록시를 지나는 요청과 응답을 메모리에서 처리하고, 디스크에 쓰는 것은 캐시한 정적 콘텐츠뿐이라고 적는다. 본문을 남기는 기능은 고객이 켜는 제품(WAF 페이로드 로깅, DLP, Gateway)에 있다. Cloudflare가 밝힌 정책이며 동작을 검증한 것은 아니다.
- 에이전트의 의견: 로그보다 캐시를 챙길 일이다. `files.spiaminto.com` 전체에 캐시 우회 규칙을 건다. 숨김은 보안보다 편의의 문제다. `.git`은 목록을 어지럽히고 잘못 고치면 저장소가 망가지므로 숨긴다. `.env`와 `.properties`는 실수로 화면에 띄우는 일을 줄일 뿐이고, 밖에서 Spring 설정을 고치려면 방해가 되므로 열어 볼 일이 있는지로 정한다.
- 답: 덧붙여 두고 일단 지금 설정(셋 다 숨김)으로 간다.

#### Q14. 덮어쓰기

- 업로드할 때 같은 이름이 있거나, 편집한 파일을 저장할 때 덮어쓰기가 일어난다.
- 추천: FBQ의 기본 동작을 따르고, 써 보며 불편하면 다시 정한다.
- 답: 추천대로.

#### Q15. 실행 방식과 설치 위치

- 추천: FBQ와 cloudflared를 모두 Windows 서비스로 등록해 PC가 켜지면 자동으로 뜨게 한다. FBQ 실행 파일과 데이터(DB, 설정)는 저장소와 루트 밖인 `C:\_Utility\filebrowser-quantum`에 둔다. 루트 안에 두면 앱이 자기 DB를 보여 준다.
- 사용자가 되물은 것: 시작프로그램 등록과 Windows 서비스는 다른가.
- 에이전트의 답: 시작프로그램은 로그인한 뒤에 뜨고, 서비스는 부팅하면 로그인 전에 뜬다. Windows 업데이트로 재부팅되면 시작프로그램은 누가 로그인할 때까지 뜨지 않는다. FBQ는 서비스 등록 기능이 없을 수 있어 감싸는 도구(WinSW 등)가 필요할 수 있고, 번거로우면 작업 스케줄러의 "부팅 시, 로그인 여부와 무관하게 실행"으로 바꾼다(에이전트의 지식). 서비스는 사용자의 Windows 계정으로 돌리기를 권했다. 시스템 계정이면 올린 파일의 소유자가 시스템이 된다.
- 답: Windows 서비스로 하고, 사용자의 계정으로 돌린다.

#### Q16. 이 저장소의 역할과 작업 틀

- 앱 코드를 쓰지 않으므로, 저장소에 남길 것은 설정 파일(비밀값 제외), 설치 스크립트, 설치·운영 기록이다.
- 추천: 저장소는 그 셋을 담는다. Q17의 이야기에 따라 이 PC에서 밖으로 열린 접속 경로의 목록을 더한다(tailnet 이름은 적지 않는다). pstack 작업 틀과 코드 규칙 훅은 C로 갈 때를 위해 그대로 둔다(`src/`가 없으면 훅은 아무것도 막지 않는다). CLAUDE.md의 프로젝트 개요에는 FBQ로 정한 것을 적는다.
- 답: 추천대로.

#### 5라운드 중 사용자의 물음

사용자: 굳이 Cloudflare를 붙여야 하나? FBQ를 실행하면 외부에서 어떻게 접속하나. FBQ 자체에도 외부 접속을 받는 옵션이 있을 것 아닌가.

에이전트의 답:

- FBQ를 `0.0.0.0`으로 열면 다른 기기의 연결을 받지만(에이전트의 지식), 닿는 범위는 같은 공유기 안까지다. 인터넷에서 오는 요청은 공유기에서 멈춘다. 밖에서 닿으려면 인터넷과 홈서버 사이에 길을 따로 내야 하고, 그것은 FBQ가 하는 일이 아니다.
- 길은 두 가지다. ① 공유기 포트포워딩: 바뀌는 집 IP(DDNS), HTTPS 인증서, 로그인 전 요청까지 앱이 직접 받는 보안을 직접 챙긴다. 통신사가 공인 IP를 주지 않으면 할 수 없다(사용자의 회선은 확인하지 않았다). 집 IP가 드러난다. ② 터널: 홈서버가 바깥으로 연결을 맺으므로 포트를 열지 않고, 주소와 HTTPS와 앞단 인증을 Cloudflare가 맡는다.
- 사전 기획에서 Cloudflare를 고른 것도 이 차이 때문이었다.

사용자가 FBQ의 책임과 외부 접속의 경계를 SVG로 그려 달라고 했고, 에이전트는 두 안(Tunnel + Access, 포트포워딩)의 경계와 경계마다 누가 지키는지를 그린 페이지를 Artifact로 만들었다. 사용자는 관리하기 어렵다고 했고, 그 페이지를 [26-11-28-access-boundary.html](26-11-28-access-boundary.html)로 이 폴더에 함께 두었다.

#### Q17. 외부 접속 방식 다시 정하기

- 선택지: Cloudflare Tunnel과 Access를 그대로 쓴다. 또는 공유기 포트포워딩으로 직접 공개하고 FBQ에서 로그인한다.
- 추천: Cloudflare를 그대로 쓴다. 혼자 쓰는 홈서버에서 공개 포트를 열지 않는 것이 가장 크다.
- 사용자가 한 말: Cloudflare 플로우는 괜찮은데, Tailscale과 Cloudflare를 둘 다 켜 두는 것이 거슬린다. 순전히 느낌이지만 꺼림칙하다.
- 에이전트가 확인한 것(`tailscale serve status`, `tailscale funnel status`): Tailscale은 이미 이 PC에서 `127.0.0.1:8188`과 `127.0.0.1:5001`을 tailnet 안에만 내보내고 있다. Funnel로 공개한 것은 없다. tailnet에는 이 PC 말고 기기가 몇 대 더 있다.
- 에이전트의 의견: 두 길은 역할이 겹치지 않는다(Tailscale은 사용자 기기끼리, Cloudflare는 아무 브라우저). 느낌의 근거가 될 수 있는 것은 셋이다. ① 지금까지 이 PC에는 공개 인터넷에 드러난 이름이 없었는데 처음 생긴다. ② 믿고 맡기는 회사와 관리할 곳이 둘이 된다. ③ 두 길의 열쇠가 같은 계정이면 그 계정 하나가 뚫릴 때 둘 다 열린다. 두 데몬이 서로 간섭하는 문제는 없다고 본다(에이전트의 지식).
- 답: 와닿는 것은 ②이고, "켜 둔 것이 많다"는 느낌에 가깝다. Cloudflare로 간다.
- 정리: 외부 접속은 사전 기획대로 Cloudflare Tunnel과 Access다. ②에 대한 대책으로 열린 접속 경로 목록을 Q16에 더했다.

### 6라운드

설치와 Cloudflare 설정에서 남은 것이다.

#### Q18. Access 로그인 유지 기간

- 로그인하면 이 기간 동안 다시 로그인하지 않는다. 기본은 24시간이다.
- 추천: 기본 24시간.
- 답: 추천대로.

#### Q19. Access에 쓸 Google OAuth 클라이언트

- 사용자가 가진 OAuth 클라이언트에 Cloudflare의 콜백 URL을 더해 재사용하거나, Cloudflare Access 전용 클라이언트를 새로 만든다.
- 추천: 전용 클라이언트를 새로 만든다. 다른 앱과 비밀값을 나눠 쓰지 않으므로, 한쪽의 비밀값이 새도 다른 쪽에 번지지 않는다.
- 답: 추천대로.

#### Q20. Cloudflare 설정을 누가 하는가

- 추천: 나눠서 한다. 사용자: 네임서버 이전, Zero Trust에 Google 로그인 등록, Access 애플리케이션과 허용 이메일 설정(대시보드). 에이전트: cloudflared 설치, 사용자가 브라우저로 `cloudflared tunnel login`을 승인한 뒤 터널 생성과 `files.spiaminto.com` 연결, 서비스 등록. 에이전트는 대시보드를 바꾸지 않고, 사용자가 따라 할 절차를 문서로 쓴다.
- 답: 추천대로.

#### 에이전트가 묻지 않고 정하고 알린 것

- FBQ를 먼저 설치해 시험용 폴더를 루트로 시험하고, 사용자가 확인한 뒤 루트를 `C:\_workspace`로 바꾼다. Cloudflare 연결은 네임서버 이전 뒤에 한다.
- FBQ는 v2.1.0-stable로 고정한다.
- 업로드 조각 크기는 FBQ 기본값(10MB)이다.

## 출처

- Filestash: [plugin inventory](https://www.filestash.app/docs/plugin), [plugin development](https://www.filestash.app/docs/guide/plugin-development.html), [OIDC setup](https://filestash.app/setup-oidc.html), [install and upgrade](https://www.filestash.app/docs/install-and-upgrade/)
- FileBrowser Quantum: [README](https://github.com/gtsteffaniak/filebrowser), [Office Support wiki](https://mygithub.libinneed.workers.dev/gtsteffaniak/filebrowser/wiki/Office-Support), [미리보기](https://filebrowserquantum.com/en/docs/features/previewing-files/), [업로드](https://filebrowserquantum.com/en/docs/user-preferences/uploads-downloads/), [프록시 인증](https://filebrowserquantum.com/en/docs/configuration/authentication/proxy/), [JWT 인증](https://filebrowserquantum.com/en/docs/configuration/authentication/jwt/), [접근 규칙](https://filebrowserquantum.com/en/docs/access-control/rules/), [조건 규칙](https://filebrowserquantum.com/en/docs/advanced/source-configuration/conditional-rules/), [로드맵](https://filebrowserquantum.com/en/docs/help/roadmap/)
- copyparty: [README](https://github.com/9001/copyparty), [IdP docs](https://github.com/9001/copyparty/blob/hovudstraum/docs/idp.md)
- filebrowser 유지보수 모드: [README mirror](https://gitlab.cern.ch/atlas-itk/sw/external/filebrowser/-/blob/master/README.md)
- Tailscale: [Serve](https://tailscale.com/kb/1312/serve), [identity](https://tailscale.com/docs/concepts/tailscale-identity), [Funnel](https://tailscale.com/kb/1223/funnel), [connection types](https://tailscale.com/docs/reference/connection-types), [DERP servers](https://tailscale.com/docs/reference/derp-servers), [peer relays 블로그](https://tailscale.com/blog/peer-relays-international-networks), [포럼: bandwidth for free users](https://forum.tailscale.com/t/bandwidth-for-free-users/5242), [Stack Overflow: funnel bandwidth](https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/76091568/tailscale-funnel-bandwidth-limit)
- Cloudflare: [Service-Specific Terms](https://www.cloudflare.com/service-specific-terms-application-services), [Delivering videos](https://developers.cloudflare.com/fundamentals/reference/policies-compliances/delivering-videos-with-cloudflare/index.md), [section 2.8 블로그](https://blog.cloudflare.com/updated-tos/), [Validate JWTs](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/), [Authorization cookie](https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [413 오류](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/4xx-client-error/error-413/), [Tunnel FAQ](https://developers.cloudflare.com/cloudflare-one/faq/cloudflare-tunnels-faq/), [Google IdP](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/google/), [CNAME(부분) 설정](https://developers.cloudflare.com/dns/zone-setups/partial-setup/), [서브도메인 설정](https://developers.cloudflare.com/dns/zone-setups/subdomain-setup/setup/), [Data Transit Privacy 백서](https://cf-assets.www.cloudflare.com/slt3lc6tev37/1S0GCmfDE4rA1CK5dCK9kL/1410444a21bedc1aefaa9e332b4a1e34/Data_Transit_Privacy_Whitepaper_V2.pdf), [WAF 페이로드 암호화](https://blog.cloudflare.com/encrypt-waf-payloads-hpke/), [DLP 로깅 옵션](https://developers.cloudflare.com/cloudflare-one/data-loss-prevention/dlp-policies/logging-options/)
- Cloudflare 사용 사례: [Access로 셀프호스트 앱 보호](https://dev.to/imrhlrvndrn/secure-any-self-hosted-app-with-cloudflare-access-ck0), [Tunnel 설정 가이드](https://fullmetalbrackets.com/blog/setup-cloudflare-tunnel-to-access-self-hosted-apps), [Zero Trust 홈서버](https://akitaonrails.com/en/2025/09/10/protecting-your-home-server-with-cloudflare-zero-trust/), [Nextcloud 포럼: Tunnel 100MB·524](https://help.nextcloud.com/t/large-uploads-via-public-share-link-fail-at-the-end-behind-cloudflare-assembly-move-aborted-then-web-uploader-deletes-the-chunks/250855), [Localtonet: 100MB 413](https://localtonet.com/blog/cloudflare-tunnel-alternative), [Guacamole: 청크 업로드 실패 사례](https://issues.apache.org/jira/browse/GUACAMOLE-1320)
