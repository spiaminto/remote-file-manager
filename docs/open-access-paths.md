# 열린 접속 경로

> 작성일: 26-11-28\
> 최종 수정일: 26-11-28

다른 기기나 인터넷에서 홈서버의 서비스로 들어올 수 있는 길을 모은다. 길을 새로 열거나 닫으면 이 문서를 고친다. 저장소가 공개되어 있으므로 tailnet 이름, MagicDNS 이름, IP 주소는 적지 않는다.

| 길 | 들어오는 곳 | 닿는 로컬 서비스 | 공개 범위 | 앞단 인증 | 상태 |
| --- | --- | --- | --- | --- | --- |
| Tailscale serve | tailnet 안의 기기 | `127.0.0.1:8188` | tailnet 안만(Funnel 없음) | Tailscale 계정 로그인 | 열림 |
| Tailscale serve | tailnet 안의 기기 | `127.0.0.1:5001` | tailnet 안만(Funnel 없음) | Tailscale 계정 로그인 | 열림 |
| Cloudflare Tunnel | `https://files.spiaminto.com` | `127.0.0.1:8090`(FileBrowser Quantum) | 인터넷 | Cloudflare Access(Google 로그인, 허용 이메일 하나) | 계획. 아직 연결하지 않았다 |

## 길마다 적어 둘 것

### Tailscale serve

- 26-11-28에 `tailscale serve status`와 `tailscale funnel status`로 확인했다. Funnel로 공개한 것은 없다.
- 파일매니저(웹)에는 쓰지 않는다.

### Cloudflare Tunnel (계획)

- cloudflared는 홈서버에서 돌며 바깥으로 연결을 맺는다. 공유기 포트는 열지 않는다.
- FileBrowser Quantum은 `127.0.0.1`에서만 연결을 받는다. 26-11-28에 LAN 주소, Tailscale 주소, `[::1]`로는 `8090`에 닿지 않는 것을 확인했다([operations.md](operations.md)).
- FileBrowser Quantum은 `Cf-Access-Authenticated-User-Email` 헤더를 그대로 믿는다. 이 길 말고는 `8090`에 닿는 길이 없어야 한다. 같은 PC의 다른 프로그램이 헤더를 꾸밀 수 있는 위험은 받아들였다.
- 연결하면 상태를 "열림"으로 바꾸고 연결한 날을 적는다.
