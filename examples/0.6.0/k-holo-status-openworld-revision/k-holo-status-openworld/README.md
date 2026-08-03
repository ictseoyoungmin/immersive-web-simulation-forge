# K-HOLO STATUS — WebGL2 한국형 오픈월드 상태창

실제 투시행렬을 사용하는 WebGL2 보행 데모와, 게임 엔진 상태에 연결할 수 있는 독립형 홀로그램 상태창 Web Component를 함께 제공합니다.

## 실행

`index.html`을 브라우저에서 열면 됩니다. 파일 서버를 사용할 경우 프로젝트 폴더에서 다음처럼 실행할 수 있습니다.

```bash
python -m http.server 8080
```

## 조작

- `WASD` / 방향키: 보행
- `Shift`: 달리기
- 화면 클릭 후 마우스: 포인터 잠금 시점 조작
- 드래그: 포인터 잠금이 불가능할 때 시점 조작
- `H`: 상태창 호출/닫기
- `Tab`: 기본/확장 모드 전환
- `Q`, `R`, `E`: 임무·위험·특수 이벤트 알림
- `Esc`: 상태창과 설정 닫기

## 수정본에서 교체된 항목

- Canvas 2.5D 투영 월드 → WebGL2 기하 렌더러
- 수동 화면 투영 → 68° 투시행렬과 0.08m 근접면 클리핑
- 장식용 이동 → 플레이어 반경과 건물 AABB 충돌 판정
- 한글 지명만 사용한 배경 → 아파트 타워, 도시안전센터, 버스 정류장, 횡단보도, 점자블록, 도로명 표지, 방재 게이트로 구성한 한국형 도시 문법
- 전체 상태창 재렌더 중심 → 상태 저장소 구독과 독립 알림 큐를 가진 Shadow DOM Web Component

## 모듈 구조

```text
index.html
styles.css
src/
  holo-status-window.js  # HoloStore + <k-holo-status>
  world-webgl.js         # WebGL2 보행 데모와 충돌
  app.js                 # 월드 상태와 상태창 연결
```

## 상태창 API

```js
const store = new HoloStore(initialState);
const panel = document.querySelector('k-holo-status');
panel.bind(store);
panel.show({ category: 'info', mode: 'standard' });
panel.notify({
  category: 'danger',
  title: '위험 신호 감지',
  message: '적대 개체가 접근 중입니다.'
});
store.patch({ player: { hp: 82, shield: 44, energy: 71, speed: 4.2 } });
```

공개 메서드: `bind`, `update`, `show`, `hide`, `toggle`, `setMode`, `setCategory`, `notify`, `dismissNotification`, `getSnapshot`, `destroy`.

## 범위

클레임 레벨은 `visual-concept`입니다. 데모는 절차적 저폴리 도시이며 실제 서울의 지형·교통·시설 데이터를 재현하지 않습니다. 상태창은 브라우저 게임에 직접 이식할 수 있지만 Unity, Unreal, Godot 네이티브 어댑터는 포함하지 않습니다.
