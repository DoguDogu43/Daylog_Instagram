# 데이로그 신청폼 — VPS 배포 절차

대상: `115.71.239.106`, 도메인 `daylog.hannah-log.site`, 컨테이너 포트 `127.0.0.1:3100:3000`.

## 0. 사전 조건 (사용자)

Cloudflare DNS에 A 레코드 추가: `daylog` → `115.71.239.106`.
- certbot 발급 시 프록시(orange)에서 HTTP-01 이 실패하면 일시적으로 DNS only(grey)로 내렸다가 발급 후 다시 orange 로 전환한다.

확인:
```bash
dig +short daylog.hannah-log.site A
```

## 1. 코드 배치

```bash
# 최초
cd /root && git clone https://github.com/DoguDogu43/Daylog_Instagram.git daylog
# 갱신
cd /root/daylog && git pull
```

## 2. 시크릿 (`/root/daylog/.env`, 커밋 금지)

```
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/XXXX/exec
GOOGLE_APPS_SCRIPT_SHARED_SECRET=<shared-secret>
DAYLOG_FORM_TYPE=daylog_life_session
APPS_SCRIPT_TIMEOUT_MS=9000
```

## 3. 컨테이너 빌드/기동

```bash
cd /root/daylog
docker compose up -d --build
docker compose ps
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3100/healthz   # 200
```

## 4. nginx 서버블록 (`/etc/nginx/conf.d/daylog.conf`)

먼저 80 전용 블록으로 시작한다:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name daylog.hannah-log.site;
    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
nginx -t && systemctl reload nginx
```

## 5. TLS 발급 (certbot --nginx)

```bash
certbot --nginx -d daylog.hannah-log.site
```
certbot 이 443 ssl 블록과 80→443 리다이렉트를 자동 삽입한다. 발급 후 `/etc/nginx/conf.d/daylog.conf` 의 **443 `location /`** 블록에 아래 헤더가 포함돼 있는지 확인(없으면 추가):

```nginx
        proxy_pass http://127.0.0.1:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
```
> `X-Forwarded-For` 는 API 의 rate limit 이 클라이언트 IP 를 식별하는 데 사용하므로 반드시 전달.

```bash
nginx -t && systemctl reload nginx
```

## 6. 최종 검증

```bash
curl -I https://daylog.hannah-log.site            # 200
# 화면에서 신청 1건 제출 → Apps Script 스프레드시트 수신 확인
```

## 7. 갱신 배포

```bash
cd /root/daylog && git pull && docker compose up -d --build
```
