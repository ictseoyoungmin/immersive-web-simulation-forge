# K-HOLO STATUS — 한국형 오픈월드 상태창

한국형 미래 도시 분위기의 보행 오픈월드 데모와, 다른 웹 게임에 독립적으로 이식할 수 있는 홀로그램 상태창 Web Component를 함께 제공합니다.

## 바로 실행

`index.html`을 브라우저에서 직접 열면 됩니다. 외부 라이브러리, 폰트, 이미지 네트워크 요청이 없습니다.

조작:

- `WASD` / 방향키: 이동
- `Shift`: 달리기
- 마우스 클릭 후 이동: 시점 회전. 포인터 잠금이 거부되면 드래그 회전으로 동작
- `H`: 상태창 호출/닫기
- `Tab`: 기본/확장 상태 전환
- `Q`: 임무 알림
- `R`: 위험 알림 및 자동 호출
- `E`: 특수 이벤트 알림
- `F`: 정보 알림
- `` ` ``: 표시 설정
- `Esc`: 상태창과 설정 닫기

## 패키지 구조

```text
k-holo-status-openworld/
├─ index.html                    # 직접 실행 가능한 완전 독립형 데모
├─ src/
│  └─ holo-status-window.js      # 이식 가능한 상태창 모듈
├─ assets/
│  └─ k-holo-mark.svg            # 동일 아이콘 시스템의 기본 마크
├─ README.md
├─ VALIDATION.json
└─ preview.webp
```

## 상태창 모듈 사용

`src/holo-status-window.js`는 렌더러나 게임 엔진에 의존하지 않습니다. Shadow DOM으로 호스트 CSS와 입력을 격리하며, 단일 상태 저장소를 구독합니다.

```html
<script type="module">
  import {
    HoloStore,
    HoloStatusWindow
  } from './src/holo-status-window.js';

  const store = new HoloStore({
    location: {
      district: '서울 도심 안전구역',
      subtitle: '도시망 정상',
      coordinate: { x: 0, z: 0 }
    },
    player: { hp: 100, shield: 70, energy: 80, speed: 0 },
    resources: { credits: 1200, data: 40, kits: 2 },
    objectives: [
      {
        id: 'main',
        title: '관제소 접속',
        detail: '표식까지 이동',
        progress: 0,
        total: 1,
        distance: 120,
        status: 'active',
        x: 40,
        z: -80
      }
    ],
    alerts: []
  });

  const panel = document.createElement('k-holo-status');
  panel.bind(store);
  document.body.append(panel);

  panel.show({ category: 'info', mode: 'standard' });

  // 게임 루프 또는 엔진 이벤트에서 갱신
  store.patch({
    player: { hp: 82, shield: 41, energy: 73, speed: 4.2 }
  });

  // 이벤트 알림
  panel.notify({
    category: 'danger',
    title: '위험 신호 감지',
    message: '적대 개체가 접근 중입니다.'
  });
</script>
```

### 공개 API

- `bind(store)`: `HoloStore` 또는 동일한 `subscribe(listener)` 계약 연결
- `show({ category, mode })`: 호출. `category`는 `info | quest | danger | event`
- `hide(reason)`, `toggle(options)`
- `setMode('compact' | 'standard' | 'expanded')`
- `setCategory(category)`
- `notify({ category, title, message, icon, duration })`
- `dismissNotification(id)`
- `update(partial)`: 저장소 없이 직접 갱신할 때 사용
- `getSnapshot()`: 테스트와 엔진 디버그용 구조화 상태
- `destroy()`: 구독과 타이머 해제

### 테마와 배치

호스트 요소에 CSS 변수를 설정할 수 있습니다.

```css
k-holo-status {
  --holo-scale: 0.94;
}
```

카테고리 색상은 컴포넌트가 관리합니다. 기본 배치는 화면 전면 우측이며, 720px 이하에서는 하단 시트로 재구성됩니다.

## 상태관리 계약

권장 단일 상태 구조:

- `location`: 구역, 부제, 월드 좌표
- `player`: 생명력, 보호막, 동력, 속도
- `resources`: 크레딧, 데이터, 복구 키트
- `objectives[]`: 안정 ID, 진행도, 거리, 상태, 레이더 좌표
- `alerts[]`: 시간, 카테고리, 메시지
- `telemetry`: 선택적 성능 정보

렌더 오브젝트와 포맷된 문자열은 상태의 소비자이며, 별도 진실 원천으로 사용하지 않습니다.

## 검증 인터페이스

독립형 데모는 다음 함수를 제공합니다.

```js
window.__FORGE__.prepareVerification('panel-open');
window.__FORGE__.verifyWorkflow('reference-case');
window.__FORGE__.verifyDomain('reference-case');
window.__FORGE__.getSnapshot();
window.__FORGE__.resetDemo();
```

## 범위와 제한

이 결과의 클레임 레벨은 `visual-concept`입니다. 월드는 실제 3D 엔진이 아닌 Canvas 2D 원근 투영 데모이며, 평탄 지면·단순 충돌·보행 가속/감속만 구현합니다. 상태창 모듈은 실사용 가능한 DOM 에셋이지만, Unity·Unreal·Godot 네이티브 어댑터는 포함하지 않습니다.
