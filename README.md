<div align="center">
  <img src="skills/immersive-web-simulation-forge/assets/icon.svg" width="96" height="96" alt="Immersive Web Simulation Forge icon">
  <h1>Immersive Web Simulation Forge</h1>
  <p>브라우저 기반 월드, 시뮬레이션, 데이터 도구, 인터랙티브 제품을 설계·구현·검증하기 위한 Codex 스킬 패키지</p>
</div>

<p align="center">
  <a href="https://ictseoyoungmin.github.io/immersive-web-simulation-forge/docs/">Interactive Demo</a> ·
  <a href="skills/immersive-web-simulation-forge/SKILL.md">Skill instructions</a>
</p>

## 개요

Immersive Web Simulation Forge는 인터랙티브 브라우저 제품을 만들 때 필요한 설계 기준, 재사용 모듈, 검증 도구를 묶은 스킬입니다.

다음과 같은 제품 유형을 대상으로 합니다.

- 브라우저 기반 open world와 game arena
- 물리·과학·공학 simulation lab
- 파라메트릭 design studio와 configurator
- 데이터 instrument와 operations panel
- ambient system과 dashboard panel

이 저장소의 `examples/`는 스킬로 제작된 결과물을 보여주는 전시·검증 자료입니다. 스킬 본체는 [`skills/immersive-web-simulation-forge/`](skills/immersive-web-simulation-forge/)에 있습니다.

## 사용법

설치 후에는 대화창에서 `/immersive-web-simulation-forge`를 호출하고, 만들고 싶은 제품을 프롬프트로 설명하거나 이어지는 대화로 작업을 지시하면 됩니다. 에이전트가 스킬 지침에 따라 계획을 세우고 결과물을 구현합니다. 예시는 아래 [단일 프롬프트 예제](#제작-기록)를 참고하세요.

### 요구사항

Python 3.10 이상과 Node.js 20 이상이 필요합니다.

스킬 패키지 상태를 확인합니다.

```bash
python3 skills/immersive-web-simulation-forge/scripts/forge.py doctor
```

브라우저 실행 검증에는 Playwright가 필요합니다. (optional)

```bash
node skills/immersive-web-simulation-forge/scripts/browser_verify.mjs my-project \
  --workflow-test \
  --domain-test
```

### 설치

이 저장소를 독립 스킬로 설치하려면 다음 명령을 사용할 수 있습니다.

다른 에이전트를 대상으로 설치할 때는 `--agent` 값을 해당 에이전트 이름으로 바꿉니다.

```bash
npx skills add ictseoyoungmin/immersive-web-simulation-forge --agent claude-code
npx skills add ictseoyoungmin/immersive-web-simulation-forge --agent codex
```

Claude Code에서 플러그인 marketplace로 설치할 수도 있습니다.

```text
/plugin marketplace add ictseoyoungmin/immersive-web-simulation-forge
/plugin install immersive-web-simulation-forge@immersive-web-simulation-forge
/reload-plugins
```

Codex CLI에서는 같은 marketplace를 다음처럼 추가하고 설치합니다.

```bash
codex plugin marketplace add ictseoyoungmin/immersive-web-simulation-forge
codex plugin add immersive-web-simulation-forge@immersive-web-simulation-forge
```

이 저장소에는 Codex용 `.codex-plugin/plugin.json`, Codex marketplace용 `.agents/plugins/marketplace.json`, Claude Code용 `.claude-plugin/plugin.json`과 `.claude-plugin/marketplace.json`이 포함되어 있습니다. 스킬 지침과 리소스는 `skills/immersive-web-simulation-forge/` 단일 폴더에 들어 있습니다.

## 예제

현재 전시에는 v0.7 flagship asset gate를 통과한 PELAGIC과 이전 세대 제작 기록이 함께 포함됩니다. v0.7은 모든 결과물의 시각 품질을 자동 보장한다고 주장하지 않으며, 새 gate는 blockout 탈출 증거를 강제하기 위한 계약입니다.

스킬을 설치한 뒤, 에이전트에게 만들고 싶은 제품을 프롬프트로 설명하면 아래와 같은 결과물이 나옵니다.

<table>
  <tr>
    <td width="33%" align="center">
      <a href="examples/0.7.0/realistic-ocean-simulation/dist/">
        <img src="examples/0.7.0/realistic-ocean-simulation/preview.png" width="100%" alt="PELAGIC living ocean preview">
        <br>
        <sub><b>PELAGIC</b><br>A Living Ocean<br>GPT-5.6-SOL · XHIGH</sub>
      </a>
    </td>
    <td width="33%"></td>
    <td width="33%"></td>
  </tr>
  <tr>
    <td width="33%" align="center">
      <a href="examples/0.6.0/armory-bench/">
        <img src="examples/0.6.0/armory-bench/assets/armory-bench-preview.png" width="100%" alt="ARMORY BENCH preview">
        <br>
        <sub><b>ARMORY BENCH</b><br>Modular weapon customization</sub>
      </a>
    </td>
    <td width="33%" align="center">
      <a href="examples/0.6.0/AEROLAB_X4_Drone_Wind_Tunnel/">
        <img src="examples/0.6.0/AEROLAB_X4_Drone_Wind_Tunnel/preview.webp" width="100%" alt="AEROLAB X4 preview">
        <br>
        <sub><b>AEROLAB X4</b><br>Drone wind tunnel</sub>
      </a>
    </td>
    <td width="33%" align="center">
      <a href="examples/0.6.0/VESPER_The_Garden_Remembers/vesper-garden/">
        <img src="examples/0.6.0/VESPER_The_Garden_Remembers/vesper-garden/preview.webp" width="100%" alt="VESPER preview">
        <br>
        <sub><b>VESPER</b><br>The garden remembers</sub>
      </a>
    </td>
  </tr>
  <tr>
    <td width="33%" align="center">
      <a href="examples/0.6.0/Pixel_Minions_Room_Explorer_Phase1/">
        <img src="examples/0.6.0/Pixel_Minions_Room_Explorer_Phase1/2026-08-03-153501.png" width="100%" alt="Pixel Minions preview">
        <br>
        <sub><b>Pixel Minions</b><br>Room explorer</sub>
      </a>
    </td>
    <td width="33%" align="center">
      <a href="examples/0.6.0/k-holo-status-openworld-revision/k-holo-status-openworld/">
        <img src="examples/0.6.0/k-holo-status-openworld-revision/k-holo-status-openworld/preview.webp" width="100%" alt="K-Holo Status revision preview">
        <br>
        <sub><b>K-Holo Status</b><br>Revision surface</sub>
      </a>
    </td>
    <td width="33%" align="center">
      <a href="examples/0.6.0/k-holo-status-openworld/k-holo-status-openworld/">
        <img src="examples/0.6.0/k-holo-status-openworld/k-holo-status-openworld/preview.webp" width="100%" alt="K-Holo Status preview">
        <br>
        <sub><b>K-Holo Status</b><br>Open world</sub>
      </a>
    </td>
  </tr>
  <tr>
    <td width="33%" align="center">
      <a href="examples/0.4.0/aetherwild/">
        <img src="examples/0.4.0/aetherwild/preview.webp" width="100%" alt="AETHERWILD preview">
        <br>
        <sub><b>AETHERWILD</b><br>The living meridian</sub>
      </a>
    </td>
    <td width="33%" align="center">
      <a href="examples/0.4.0/aetherra/">
        <img src="examples/0.4.0/aetherra/preview.webp" width="100%" alt="AETHERRA preview">
        <br>
        <sub><b>AETHERRA</b><br>The breathing expanse</sub>
      </a>
    </td>
    <td width="33%" align="center">
      <a href="examples/0.3.0/aetheris-open-world/">
        <img src="examples/0.3.0/aetheris-open-world/preview.webp" width="100%" alt="AETHERIS preview">
        <br>
        <sub><b>AETHERIS</b><br>The living sky</sub>
      </a>
    </td>
  </tr>
  <tr>
    <td width="33%" align="center">
      <a href="examples/0.3.0/AETHERFALL_OPEN_WORLD/">
        <img src="examples/0.3.0/AETHERFALL_OPEN_WORLD/preview.webp" width="100%" alt="AETHERFALL preview">
        <br>
        <sub><b>AETHERFALL</b><br>The open sky</sub>
      </a>
    </td>
    <td width="33%"></td>
    <td width="33%"></td>
  </tr>
</table>

## 핵심 구성

스킬은 다음 세 영역을 서로 분리해 기록하도록 안내합니다.

1. **제품 경험** — 첫 사용, 핵심 행동, 결과 확인, 완료와 복구
2. **도메인 근거** — 단위, 모델, 가정, 검증 기준, 허용오차와 제한사항
3. **런타임 동작** — lifecycle, 입력, 상태 저장, 취소, 성능 측정과 패키징

시각적 결과만으로 물리적 정확성이나 성능을 주장하지 않도록 하는 것이 주요 원칙입니다.

## 제공 모듈

`kits/`에는 프로젝트의 시작점으로 사용할 수 있는 모듈이 들어 있습니다.

- `runtime/` — 고정 스텝 프레임 루프, lifecycle, 해상도 정책
- `compute/` — Worker 또는 메인 스레드 작업 실행, 진행률, 취소
- `authoring/` — 파라미터 정의, undo/redo, 상태 변경
- `io/` — 버전이 있는 프로젝트 직렬화, migration, round trip
- `systems/` — 공유 필드와 이벤트 디렉터
- `three/`, `canvas/`, `webgl/` — 공간 렌더링, 필드, resolve와 후처리 기반
- `analysis/` — 측정 시리즈, 요약, plot과 CSV 출력
- `input/`, `ui/` — pointer look과 SVG 아이콘 시스템

`references/`에는 profile 선택, 물리 검증, parametric design, perceptual fidelity, 측정 기준 등의 상세 지침이 있습니다.

## 제작 기록

이 스킬은 Codex `skill-creator`를 사용해 만들었습니다. [`PELAGIC`](examples/0.7.0/realistic-ocean-simulation/README.md)은 Codex CLI 0.147.0의 `gpt-5.6-sol` `xhigh`로 제작했습니다. 이전 예제는 대부분 `gpt-5.6-sol-high`를 사용해 단일 프롬프트로 작성했으며, [`armory-bench`](examples/0.6.0/armory-bench/)는 Claude Opus 5로 작성했습니다. [`k-holo-status-openworld-revision`](examples/0.6.0/k-holo-status-openworld-revision/k-holo-status-openworld/README.md)은 첫 결과물에서 한번 수정된 결과입니다.

단일 프롬프트 예제:

- [`examples/0.6.0/AEROLAB_X4_Drone_Wind_Tunnel/PROMPT.md`](examples/0.6.0/AEROLAB_X4_Drone_Wind_Tunnel/PROMPT.md)
- [`examples/0.6.0/armory-bench/PROMPT.md`](examples/0.6.0/armory-bench/PROMPT.md)

## 저장소 구조

```text
.
├── .codex-plugin/                     # Codex plugin manifest
├── .agents/plugins/                   # Codex repo marketplace
├── .claude-plugin/                   # Claude Code plugin manifest
├── docs/                              # GitHub Pages 예제 전시 페이지
├── examples/                          # 버전별 브라우저 예제와 검증 자료
└── skills/                            # Plugin-discoverable skill packages
    └── immersive-web-simulation-forge/
        ├── SKILL.md                   # 스킬 지침
        ├── agents/openai.yaml         # Codex 메타데이터
        ├── skill.yaml                 # 런타임 메타데이터
        ├── assets/                    # 아이콘 등 배포 자산
        ├── kits/                      # 재사용 구현 모듈
        ├── references/                # 선택적으로 읽는 전문 지침
        ├── scripts/                   # audit, verify, package 도구
        ├── templates/                 # 계획·검증 템플릿
        └── tests/                     # Forge 자체 테스트
```

## 범위와 제한

- `visual-concept` 예제는 시각적·상호작용적 결과를 위한 것이며 실제 물리·식물학·음향학 모델을 의미하지 않습니다.
- 공학적 또는 의사결정 지원 수준의 주장은 외부 기준, 알려진 사례, 허용오차와 검토 기록이 필요합니다.
- 브라우저 성능 결과는 GPU, 브라우저, 해상도와 실행 환경에 따라 달라질 수 있습니다.
- `examples/`는 스킬 패키지 자체에 필수인 런타임 파일이 아니라 전시·검증 자료입니다.

## 라이선스

MIT
