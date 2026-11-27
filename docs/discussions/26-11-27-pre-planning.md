# 파일매니저(웹): 사전 기획과 리서치

> 작성일: 26-11-27\
> 최종 수정일: 26-11-27

이 프로젝트를 만들기 전에 with-ai 저장소의 세션에서 사용자와 에이전트가 나눈 대화의 기록이다. 결정이 아니라 생각을 정리하는 중의 기록이다. 사용자의 말은 원문의 순서대로 두고 맞춤법만 고쳤다. 에이전트의 조사와 판단은 사용자의 말과 나눠 적었다.

요구사항 인터뷰(`/grill-me`)는 이 문서를 출발점으로 삼는다. 끝의 "남은 결정"이 인터뷰의 첫 주제다.

## 출발점 (사용자의 말)

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

## 1. 기존 제품과 인증 방식 조사

### 에이전트가 짚은 전제

- **뷰어 제약은 제품마다 다르다.** Filestash는 파일 형식마다 직접 만든 JS 뷰어를 플러그인으로 등록할 수 있다. "기존 제품을 쓰면 뷰어가 묶인다"는 FileBrowser Quantum과 copyparty에는 맞고 Filestash에는 맞지 않는다.
- **Google OAuth가 보증하는 것은 "누가 로그인했는가"까지다.** 로그인 전의 요청도 앱이 직접 받으면, 앱의 취약점은 OAuth로 막지 못한다. 그래서 인증을 앱의 앞단(Cloudflare Access, oauth2-proxy)에 두는 구성을 권했다.

### 후보

원조 filebrowser(`filebrowser/filebrowser`)는 유지보수만 하는 모드라 후보에서 뺐다.

| | Filestash | FileBrowser Quantum | copyparty |
| --- | --- | --- | --- |
| 뷰어 | 플러그인으로 약 140개 형식. Office(LibreOffice wasm, OnlyOffice), PSD·AI, DWG·DXF, 3D, RAW, 영상 HLS 변환 | 미디어 미리보기, 썸네일(Office, 영상, 3D). Office 편집은 OnlyOffice 연동 | 오디오·영상, 이미지 갤러리, 코드 하이라이트, 마크다운, cbz. Office는 Collabora(WOPI) |
| 직접 만든 뷰어를 붙이는 방법 | 있다. 런타임 플러그인(ZIP)의 `xdg-open` 모듈로 MIME별 JS 뷰어를 등록한다 | 문서에 없다 | 문서에 없다. UI를 고치는 JS 플러그인 정도다 |
| 로그인 | OIDC 플러그인, 프록시 헤더 인증 플러그인 | OIDC, 프록시 인증 | 앞단 IdP의 헤더로만 |
| Windows | 문서에 없다. Docker로 띄울 가능성이 크다 | 단일 실행 파일 | `copyparty.exe` |
| 큰 파일 업로드 | 문서에 없다 | 문서에 없다 | 청크 업로드와 이어 올리기. "프록시가 요청 크기를 제한해도 파일 크기 제한이 없다"고 적는다 |
| 라이선스 | 확인하지 않았다 | Apache-2.0 | 확인하지 않았다 |

### 직접 구현하는 경우 (에이전트의 정리)

앞단 인증 뒤에 얇은 백엔드(목록, 업로드, 다운로드, 영상 탐색용 Range 요청)를 두고 뷰어는 라이브러리(pdf.js, Monaco, docx-preview, SheetJS 등)를 붙이는 구조다. 대신 경로 조작(`../`)으로 루트 밖을 읽히는 문제, 청크 업로드, Range 요청 처리처럼 기존 제품이 이미 다듬어 둔 부분을 직접 맡는다.

에이전트는 이때 "뷰어 확장성이 가장 중요하면 Filestash에 원하는 뷰어 하나를 붙여 보고, 막히면 직접 구현을 검토한다"를 권했다. 사용자는 이 추천에 답하지 않았다. 구성은 아직 정하지 않았다("남은 결정").

## 2. Tailscale로 하는 방법

사용자: Tailscale이 켜져 있는데, 이걸로는 어떻게 안 되나? 전송량 제한이 있는 게 좀 꺼려져서.

에이전트가 조사한 것은 다음과 같다.

- **`tailscale serve`(tailnet 안에서만):** 인터넷에 공개되지 않는다. Tailscale 계정의 Google 로그인이 곧 관문이다. serve는 요청마다 `Tailscale-User-Login` 헤더로 접속한 사람의 이메일을 넘기고, 외부에서 보낸 같은 헤더는 지운다. 요청 크기 제한은 없다. 직접 연결이면 회선 속도가 나오고, 공용 중계(DERP)로 떨어지면 공정성을 위해 속도가 제한된다(Tailscale 블로그의 측정 하나에서 약 2.2Mbps). Tailscale을 설치한 기기에서만 접속할 수 있다.
- **Funnel(인터넷에 공개):** 아무 브라우저에서 접속할 수 있다. 공식 문서는 "설정으로 바꿀 수 없는 대역폭 제한이 있다"고만 적는다. Funnel 요청에는 신원 헤더가 붙지 않으므로, 앱이 직접 로그인을 처리하고 인터넷에 노출된다.
- **에이전트가 바로잡은 것:** Cloudflare 무료 플랜의 제한은 총 전송량이 아니라 요청 하나의 크기(100MB)다.

## 3. Cloudflare Tunnel로 갈 때의 유저 플로우

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
- **앱의 로그인은 따로 남는다.** 셋 중 하나를 고른다. ① 앱이 Access의 JWT(`Cf-Access-Jwt-Assertion` 헤더)를 신뢰해 로그인을 한 번으로 끝낸다. ② 앱도 Google OIDC로 로그인한다(두 번째는 대개 계정 선택만). ③ 앱 자체 비밀번호(사용자가 원하지 않는다). 에이전트는 ①을 권하면서, 앱이 `127.0.0.1`에서만 연결을 받게 해야 한다는 조건을 붙였다. 공식 문서는 터널로 연결한 앱이면 JWT 검증이 필수는 아니라고 하지만, 그것은 터널 말고 다른 길이 없을 때만 성립한다. 사용자는 이 질문에 아직 답하지 않았다.
- **처음 한 번 하는 설정:** 도메인을 Cloudflare DNS에 연결한다. Windows에 cloudflared를 설치하고 터널을 만들어 `files.<도메인>`을 `http://localhost:<앱 포트>`로 잇는다. Zero Trust에 Google을 로그인 수단으로 등록한다(가진 OAuth 클라이언트를 재사용하고, 리디렉션 URI `https://<팀 이름>.cloudflareaccess.com/cdn-cgi/access/callback`을 더한다. 이 주소의 형식은 에이전트의 지식이고 대시보드의 값과 대조해야 한다). Access 애플리케이션을 만들어 사용자의 이메일 하나만 허용한다.

## 4. Funnel의 대역폭 제한

사용자: Tailscale Funnel 대역폭 제한은 몇이야? 저걸 저렇게 두면 어떡함.

에이전트가 확인한 것은 다음과 같다.

- 공식 수치는 없다. 문서는 "설정으로 바꿀 수 없는 대역폭 제한"이라고만 적는다.
- 실측은 포럼의 한 보고뿐이다. 영상 스트리밍이 1Mbps를 넘으면 안정적이지 않았고, 그것이 최대치를 잰 것은 아니라고 했다. 2023년 Stack Overflow의 같은 질문에는 답이 없다.
- 에이전트의 추측: 외부 요청은 Tailscale이 운영하는 중계 서버를 거치므로, Funnel은 웹훅, 데모, 가벼운 개인 페이지를 위한 기능으로 보인다.
- 결론: 파일매니저를 Funnel로 공개하는 길은 뺀다.

## 5. 100MB 제한과 Cloudflare 약관

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

에이전트가 "아무 브라우저에서 접속할 때 주로 하는 일"을 물었고, 사용자는 이 질문에 답하지 않고 다음 결정으로 넘어갔다.

## 6. 방향

사용자: 일단 Cloudflare 쪽으로 구현해 보는 게 나을 듯.

같은 말에서 사용자는 이 프로젝트를 pstack과 얇은 층으로 스캐폴딩하고, 이 대화를 사전 기획과 리서치로 남기라고 했다. 에이전트가 세 가지를 묻고 사용자가 모두 추천대로 골랐다.

| 질문 | 사용자의 선택 |
| --- | --- |
| 디스커션을 어디에 두는가 | 이 프로젝트의 `docs/discussions/` |
| 스캐폴딩의 범위 | 작업 틀만 만든다. 앱의 구성은 `/grill-me`에서 정한다 |
| 코드 규칙과 훅 | 언어와 무관하게 옮긴다. 주석 규칙만 넣고, 훅은 `src/` 아래 소스 파일 전체를 본다 |

## 정해진 것

- 외부 접속은 Cloudflare Tunnel과 Access로 한다. 로그인은 Google이고, 허용하는 계정은 사용자 한 명이다.
- Funnel은 쓰지 않는다.
- 작업은 pstack과 얇은 층으로 한다. 요구사항은 `/grill-me`로 정한다.

## 남은 결정

인터뷰에서 다룰 것이다. 앞의 것이 뒤의 것을 가른다.

1. **앱의 구성:** 직접 구현, Filestash(뷰어 플러그인), FileBrowser Quantum, copyparty 가운데 무엇인가. 사용자는 처음에 뷰어 때문에 직접 구현 쪽으로 기울었다.
2. **꼭 열어 봐야 하는 형식:** Office, PDF, 코드, 영상, PSD, CAD 등. 1번을 가르는 근거다.
3. **주 용도:** Tunnel로 영상을 자주 보거나 대용량을 자주 주고받는가. 그렇다면 Cloudflare 약관의 위험이 있고 Tailscale을 함께 쓸지 정한다.
4. **앱 로그인 처리:** ① Access JWT 신뢰(에이전트의 추천), ② 앱도 Google OIDC.
5. **업로드:** 100MB를 넘는 파일을 올리는가. 그렇다면 청크 업로드가 필요하다.
6. **도메인:** Cloudflare에 맡길 도메인이 있는가.
7. **루트 경로와 권한:** `C:\_workspace` 전체인가, 일부인가. 삭제와 덮어쓰기를 허용하는가.

## 확인하지 못한 사실

- Filestash와 FileBrowser Quantum의 OIDC가 Google로 바로 붙는지. 표준 OIDC라 될 가능성은 높지만 Google 전용 안내는 없었다.
- Filestash를 Windows에서 Docker 없이 띄울 수 있는지. Filestash와 FileBrowser Quantum의 청크 업로드 여부.
- Cloudflare의 100MB 제한이 Tunnel에도 걸린다는 Cloudflare의 직접 문장. 걸린다는 사용자 보고는 여러 건이다.
- 도메인 없는 임시 터널에 Access를 붙일 수 없다는 것, Google IdP의 콜백 URL 형식.
- Windows에서 `tailscale serve`의 신원 헤더가 같게 오는지.

## 출처

- Filestash: [plugin inventory](https://www.filestash.app/docs/plugin), [plugin development](https://www.filestash.app/docs/guide/plugin-development.html), [OIDC setup](https://filestash.app/setup-oidc.html)
- FileBrowser Quantum: [README](https://github.com/gtsteffaniak/filebrowser), [Office Support wiki](https://mygithub.libinneed.workers.dev/gtsteffaniak/filebrowser/wiki/Office-Support)
- copyparty: [README](https://github.com/9001/copyparty), [IdP docs](https://github.com/9001/copyparty/blob/hovudstraum/docs/idp.md)
- filebrowser 유지보수 모드: [README mirror](https://gitlab.cern.ch/atlas-itk/sw/external/filebrowser/-/blob/master/README.md)
- Tailscale: [Serve](https://tailscale.com/kb/1312/serve), [identity](https://tailscale.com/docs/concepts/tailscale-identity), [Funnel](https://tailscale.com/kb/1223/funnel), [connection types](https://tailscale.com/docs/reference/connection-types), [DERP servers](https://tailscale.com/docs/reference/derp-servers), [peer relays 블로그](https://tailscale.com/blog/peer-relays-international-networks), [포럼: bandwidth for free users](https://forum.tailscale.com/t/bandwidth-for-free-users/5242), [Stack Overflow: funnel bandwidth](https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/76091568/tailscale-funnel-bandwidth-limit)
- Cloudflare: [Service-Specific Terms](https://www.cloudflare.com/service-specific-terms-application-services), [Delivering videos](https://developers.cloudflare.com/fundamentals/reference/policies-compliances/delivering-videos-with-cloudflare/index.md), [section 2.8 블로그](https://blog.cloudflare.com/updated-tos/), [Validate JWTs](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/), [Authorization cookie](https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- Cloudflare 사용 사례: [Access로 셀프호스트 앱 보호](https://dev.to/imrhlrvndrn/secure-any-self-hosted-app-with-cloudflare-access-ck0), [Tunnel 설정 가이드](https://fullmetalbrackets.com/blog/setup-cloudflare-tunnel-to-access-self-hosted-apps), [Zero Trust 홈서버](https://akitaonrails.com/en/2025/09/10/protecting-your-home-server-with-cloudflare-zero-trust/), [Nextcloud 포럼: Tunnel 100MB·524](https://help.nextcloud.com/t/large-uploads-via-public-share-link-fail-at-the-end-behind-cloudflare-assembly-move-aborted-then-web-uploader-deletes-the-chunks/250855), [Localtonet: 100MB 413](https://localtonet.com/blog/cloudflare-tunnel-alternative), [Guacamole: 청크 업로드 실패 사례](https://issues.apache.org/jira/browse/GUACAMOLE-1320)
