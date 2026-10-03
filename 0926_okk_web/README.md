# STUDIO OKK

PRD v0.3 기반 포트폴리오와 A안 Work 관리 어드민입니다. Python 3.11 이상과 프로젝트 가상환경을 사용합니다.

```sh
cd /Users/choijiyeon/Documents/Project/0926_okk_web
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python manage.py admin
.venv/bin/python server.py
```

http://localhost:3000 에 접속합니다. 중지는 Ctrl+C. 이미 포트가 사용 중이면 `PORT=3001 .venv/bin/python server.py`로 실행합니다.

## 구성

- `/`: 진입 원 확대 → 마스코트 자리 확대 및 인사 모션 → 히어로 → 글자별 낙하, 작업, 클라이언트, 문의
- `/about`: 스튜디오 소개 초안 및 이미지 자리
- `/works`, `/works/project-01`~`04`: 작업 목록 및 상세 이미지 자리
- Contacts: 공통 모달, 키보드 포커스, 필수 입력 검사, 전송 상태 및 오류 표시
- 모바일 대응, 모션 감소 설정 지원, 스크롤로 진입 연출 생략

A안 작업 데이터는 `/admin/`에서 관리하며 SQLite에 저장합니다. 공개된 프로젝트는 `/api/projects`를 통해 불러옵니다. `public/project-view.js`가 공개 화면과 관리자 미리보기의 프로젝트 카드·상세를 공유합니다. 마스코트 동작은 `public/site/hero.js`, 스타일은 `public/styles/`에서 관리합니다. 사용된 15개 클라이언트 기본 로고는 `public/assets`에 복사했습니다.

## 준비할 자료

히어로의 오키키와 오키몽은 제공된 31프레임 원본을 무손실 WebP로 묶어 자동 반복합니다. 동작 줄이기 설정에서는 정지 이미지를 표시합니다. 스튜디오 소개에는 두 캐릭터의 설명, 포스터와 턴어라운드를 반영했습니다. 작업 이미지/실적, 소개 문구, 로고 원본 및 Pretendard 폰트 파일도 준비가 필요합니다. 현재 폰트는 설치된 Pretendard 또는 시스템 폰트로 표시합니다.

히어로 반복 속도는 `build_hero_animations.py`의 `FRAME_DURATION_MS`에서 조절합니다. 현재 50ms/프레임으로 한 바퀴에 1.55초입니다. 값을 바꾼 뒤 `python3 build_hero_animations.py`를 실행하면 두 무손실 WebP가 다시 만들어집니다. 재생성에는 Pillow가 필요하며, 원본 프레임은 `자료/대표캐릭터`의 두 멀티패스 폴더에 있습니다.

## 문의 발송 설정

서버 실행 환경에 `SMTP_HOST`, `SMTP_PORT`(기본 465), `SMTP_FROM`(인증된 발신 주소), `SMTP_USER`, `SMTP_PASSWORD`를 설정합니다. 465는 TLS, 다른 포트는 STARTTLS를 사용합니다. 비밀번호는 public 폴더에 저장하지 않습니다. 수신자는 서버에서 `ouog22@gmail.com`으로 고정되어 있습니다.

설정 전 접수 시 준비 중 메시지를 표시하며 입력을 보존합니다. 실제 발송 성공을 가짜로 표시하지 않습니다. SMTP 서버가 메시지를 접수해야 성공을 반환합니다. 실제 수신함 도착은 운영 설정 후 확인해야 합니다. 문의 데이터는 별도 저장하지 않습니다. 현재 개인정보 안내는 초안이며 보관 기간 등 운영 정책을 확정한 후 공개합니다.

`server.py` 실행은 로컬 검토용입니다. 운영용 Gunicorn·HTTPS·영구 저장소 구성과 관리자 사용법은 [ADMIN_GUIDE.md](ADMIN_GUIDE.md)를 참고해주세요. SMTP 인증 및 개인정보 안내는 운영 환경에 맞게 구성해주세요.
# okk


## A안 Work 어드민

`/admin/`에서 로그인 후 프로젝트 등록·편집, 이미지 업로드·정렬, 저장, 공개 ON/OFF 전환, 휴지통·복구, 노출 순서 변경이 가능합니다. 홈과 Work 목록·상세에 공개본만 반영합니다. 기본 관리자 계정은 없으며 `manage.py admin` 또는 최초 계정 생성용 환경변수로 생성합니다.

실행·배포·백업·검증: [ADMIN_GUIDE.md](ADMIN_GUIDE.md).

## 구현 검토

주석 정리, 접근성 수정, 성능 개선 및 후속 과제: [REVIEW_2026-09-28.md](REVIEW_2026-09-28.md).

## 프로젝트 범위

이 폴더는 A 사이트와 A 전용 관리자만 포함합니다. B/B-1 시안, 전용 검사와 기획서는 형제 폴더 `../0926_okk_web_B/`로 분리했습니다. A 서버는 `/b/`, `/b-1/`을 제공하지 않습니다. B는 A의 CMS·관리자와 연결하지 않는 보관용 시안입니다.

## A 프런트엔드 구조

별도 빌드 과정 없이 브라우저 ES 모듈을 사용합니다.

| 경로 | 역할 |
|---|---|
| `public/app.js` | 화면 전환과 데이터 로딩 결과 반영 |
| `public/site/pages/` | 홈·Studio·Works·작업 상세 화면 구성 |
| `public/site/hero.js`, `contact.js`, `navigation.js` | 히어로 수명주기·문의·내부 이동 |
| `public/site/data.js`, `projects.js`, `clients.js` | 공개 데이터 로딩과 목록 렌더링 |
| `public/project-view.js` | 공개 화면·관리자 미리보기 공통 카드와 상세 |
| `public/shared/paths.js`, `html.js` | URL 생성·정규화와 HTML 이스케이프 |
| `public/styles/` | 기반·레이아웃·프로젝트·히어로·Studio·문의 CSS |
| `public/admin/app.js` | 관리자 메뉴 전환과 편집기 조정 |
| `public/admin/work.js`, `clients.js` | 독립된 Work·Clients 편집 상태 |
| `public/admin/api.js`, `auth.js`, `ui.js` | CSRF 포함 API·로그인·알림·작업 잠금 |

사이트 HTML은 CSS를 직접 로드합니다. `public/style.css`는 기존 링크 호환용 진입 파일이며, 실제 스타일은 `public/styles/`에서 수정합니다. 관리자 미리보기는 `base.css`, `project.css`, `admin/preview.css`만 로드합니다.

JavaScript에서 생성하는 사이트·이미지·API URL은 `shared/paths.js`를 사용합니다. HTML의 초기 리소스·정적 링크와 Flask의 라우트는 명시적 주소를 유지하므로 배포 경로를 변경할 때 함께 확인해야 합니다. `/`와 `/okk/` 기존 진입 경로는 유지합니다.

실행 계획과 검증 결과는 [REFACTOR_PLAN.md](REFACTOR_PLAN.md)를 참고하세요.
