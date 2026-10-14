# 스튜디오 오키키 GA4·GTM 이벤트 정의서

작성일: 2026-10-10 · 구현 반영: 2026-10-14
대상: 공개 사이트 `/`, `/about`, `/works`, `/works/{slug}`
상태: GA4 Google tag(`G-H0HPRR40E7`) 및 이벤트 코드 반영. GTM 컨테이너 ID는 아직 제공되지 않았다.

## 측정 목표와 기준

1. **레퍼럴 유입**: 외부 채널에서 사이트로 들어온 세션 수와 해당 세션의 게시물 클릭 수를 본다. 여기서 레퍼럴은 외부 유입 전체를 뜻한다. GA4의 `referral` 매체만 보고 싶을 때는 `세션 매체 = referral`로 따로 필터링한다.
2. **게시물 클릭**: 홈 `Selected Works`와 `/works` 목록에서 작업 카드를 눌러 상세로 이동한 횟수를 센다. 같은 방문자가 같은 게시물을 두 번 누르면 2회다. 상세 URL에 직접 들어온 방문은 클릭 수에 넣지 않는다.
3. **중복 방지**: 클릭 이벤트는 카드 또는 목록 행을 실제로 활성화할 때 한 번만 보낸다. 상세 화면의 `page_view`는 별개로 기록한다.

사이트는 `history.pushState()`로 화면을 바꾸는 단일 페이지 앱이다. 홈과 Works 목록의 게시물은 API 응답 뒤에 동적으로 렌더링되므로, 앱에서 게시물 데이터를 사용해 `gtag()`로 직접 이벤트를 전송한다.

## 이벤트 목록

| 우선순위 | GA4 이벤트 | 발생 조건 | 주요 값 | 현재 전송 방식 | 집계 용도 |
|---|---|---|---|---|---|
| 필수 | `page_view` | 첫 공개 페이지 렌더 및 실제 내부 화면 전환 완료 시 각 1회 | `page_location`, `page_title`, `page_referrer` | 앱의 `gtag('event', 'page_view', …)` | 랜딩 페이지, 상세 조회, 유입 분석 |
| 필수 | `select_content` | `.work-card` 또는 `.work-row`를 눌러 게시물 상세로 이동할 때 | `content_type=project`, `content_id`, `project_title`, `click_location`, `display_mode` | 앱의 `gtag('event', 'select_content', …)` | 게시물별·위치별 클릭 수 |

레퍼럴 유입에 별도 `referral_visit` 이벤트를 만들지 않는다. GA4가 수집하는 유입 차원과 세션 지표를 사용하면 같은 방문을 중복 집계하지 않는다. `select_content`는 GA4 권장 이벤트이며, 선택한 콘텐츠를 나타내는 `content_type`과 `content_id`를 사용한다. `content_id`에는 숫자만으로 된 값을 피한다. [GA4 권장 이벤트 문서](https://developers.google.com/analytics/devguides/collection/ga4/reference/events?client_type=gtm&hl=en)

## `select_content` 상세 정의

| 매개변수 | 형식 | 규칙·예시 | 필수 |
|---|---|---|---|
| `content_type` | 문자열 | 항상 `project` | 예 |
| `content_id` | 문자열 | `project_` + CMS의 변경되지 않는 `project.id` 사용. 예: `project_a1b2c3` | 예 |
| `project_title` | 문자열 | 클릭 당시 공개 제목. 예: `오키키 브랜드 캐릭터` | 예 |
| `click_location` | 문자열 | 홈 카드 `home_selected`, Works 목록 `works_list` | 예 |
| `display_mode` | 문자열 | 홈 카드 `grid`, Works 목록은 `grid` 또는 `list` | 예 |

- `content_id`는 제목이나 URL 슬러그가 바뀌어도 동일 게시물을 묶을 수 있게 CMS의 고정 ID를 쓴다. 공개 `/api/projects` 응답에 DB의 `projects.id`를 추가했고, 클릭 시 목록 데이터를 조회해 사용한다. 관리자용 데이터나 다른 비공개 필드는 추가하지 않았다.
- 이벤트는 카드/행의 좌클릭, 키보드 Enter 활성화, 보조키를 통한 새 탭 열기 등 사용자의 링크 활성화에서 1회 보낸다. 한 번의 동작에서 상위 요소와 하위 요소가 각각 발화하지 않게 한다. `pointerover`의 이미지 미리 불러오기와 `더 불러오기`, 보기 전환은 게시물 클릭으로 세지 않는다.
- `project_title`, `click_location`, `display_mode`는 GA4 **이벤트 범위 맞춤 측정기준**으로 등록한다. `content_id`도 게시물별 표에서 사용하려면 이벤트 범위 맞춤 측정기준으로 등록한다. 원래 있는 유입 차원은 중복 등록하지 않는다. [GA4 맞춤 측정기준 안내](https://support.google.com/analytics/answer/14240153?hl=en-EN)

앱이 GA4로 보내는 호출 예시:

```js
gtag('event', 'select_content', {
  send_to: 'G-H0HPRR40E7',
  content_type: 'project',
  content_id: 'project_a1b2c3',
  project_title: '오키키 브랜드 캐릭터',
  click_location: 'home_selected',
  display_mode: 'grid'
});
```

GTM을 추가로 쓰려면 컨테이너 ID와 태그 소유 방식을 정해야 한다. 동일한 GA4 이벤트를 Google tag와 GTM 양쪽에서 보내면 중복 집계되므로, GTM 전환 시 전송 경로를 하나로 통일한다. [GTM의 GA4 이벤트 설정](https://support.google.com/tagmanager/answer/13034206?hl=en-GB)

## 레퍼럴 유입 정의

| 질문 | GA4 보고 방법 |
|---|---|
| 어느 외부 채널이 방문을 만들었나? | **보고서 → 획득 → 트래픽 획득**에서 `세션 소스/매체`, `세션`, `랜딩 페이지` 확인 |
| 순수 외부 웹사이트 링크 유입은? | 같은 보고서에서 `세션 매체 = referral` 필터, `세션 소스`로 사이트별 비교 |
| 채널별 게시물 클릭은? | 탐색 분석에서 행 `세션 소스/매체`, 열 또는 행 `content_id` / `click_location`, 값 `이벤트 수`, 필터 `이벤트 이름 = select_content` |
| 방문 대비 클릭률은? | 같은 기간·같은 세션 소스/매체 기준 `select_content`가 발생한 세션 ÷ 전체 세션. 단순 이벤트 수 ÷ 세션 수는 **세션당 클릭 수**로 표시 |

운영자가 배포하는 외부 링크에는 UTM을 붙인다. 예: `https://<운영도메인>/works/<slug>?utm_source=instagram&utm_medium=social&utm_campaign=portfolio_launch&utm_content=profile_link`. `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` 값은 소문자와 밑줄로 통일하고 채널별 값 목록을 유지한다. 외부에서 자연스럽게 생성된 링크는 UTM 없이 GA4가 받은 참조 정보를 사용한다. 사이트 내부 링크에는 UTM을 붙이지 않는다. [GA4 캠페인 URL 안내](https://support.google.com/analytics/answer/10917952?hl=en-uk), [유입 차원의 범위](https://support.google.com/analytics/answer/11080067?hl=en)

## 페이지뷰와 계측 범위

- Google tag는 **공개 페이지에만** 로드한다. `/admin/`와 관리자 미리보기에는 태그가 없고, `localhost` 및 `127.0.0.1`에서는 태그를 로드하지 않는다.
- `send_page_view: false`로 태그 자체의 자동 페이지뷰를 끄고, 초기 렌더와 `pushState`/`popstate`로 실제 화면이 바뀐 뒤 앱에서 `page_view`를 1회 보낸다. 데이터 로딩으로 같은 화면을 다시 그리거나 해시만 바뀌면 보내지 않는다.
- **GA4 관리 화면에서 추가 설정 필요:** 관리자 → 데이터 스트림 → 웹 스트림 → 향상된 측정 → 페이지 조회수의 고급 설정에서 **‘브라우저 기록 이벤트 기반 페이지 변경’**을 끈다. 이 설정이 켜져 있으면 `send_page_view: false`를 사용해도 내부 전환에서 자동 페이지뷰가 발생해 앱의 수동 이벤트와 중복된다. 첫 외부 유입의 참조 정보와 UTM은 최초 URL에서 수집되게 둔다. [GA4 수동 페이지뷰 안내](https://developers.google.com/analytics/devguides/collection/ga4/views)
- `/works/{slug}`에 직접 진입하면 게시물 상세 `page_view`만 기록하고 `select_content`는 보내지 않는다. 다른 슬러그에서 현재 슬러그로 정규화하는 `replaceState`는 추가 조회로 세지 않는다.
- 문의 폼에는 이름, 연락처, 이메일, 메시지가 있다. 이 값들을 이벤트 매개변수나 페이지 URL에 보내지 않는다.

## 수용 기준

| 시험 | 기대 결과 |
|---|---|
| UTM이 붙은 외부 링크로 홈 진입 | 첫 `page_view` 1회, 해당 세션의 소스·매체·캠페인 확인 |
| 홈 게시물 카드 클릭 | `select_content` 1회 (`home_selected`, `grid`), 상세 `page_view` 1회 |
| Works 그리드 및 목록에서 같은 게시물 클릭 | 각각 `select_content` 1회, `display_mode`만 실제 보기 형태에 맞게 변경 |
| Works에서 추가 로딩 후 카드 클릭 | 첫 페이지 카드와 동일하게 1회 수집 |
| 상세 URL 직접 진입·새로고침 | `page_view`만 1회, `select_content` 0회 |
| 뒤로 가기, 보기 전환, 같은 화면 재렌더 | 뒤로 가기로 화면이 바뀐 경우에만 `page_view` 1회; 게시물 클릭 0회 |

검증은 GA4 DebugView에서 이벤트 수와 매개변수를 확인한다. 게시 전 운영 도메인과 실제 외부 UTM 링크로 다시 시험한다.
