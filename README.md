<div align="center">
  <img src="skills/immersive-web-simulation-forge/assets/icon.svg" width="96" height="96" alt="Immersive Web Simulation Forge icon">
  <h1>Immersive Web Simulation Forge</h1>
  <p>브라우저 기반 spatial product, 오픈월드, 시뮬레이션, 디자인 도구를 설계·구현·검증·하드닝하는 expert engineering 스킬 패키지</p>
</div>

<p align="center">
  <a href="https://ictseoyoungmin.github.io/immersive-web-simulation-forge/docs/">Interactive Demo</a> ·
  <a href="skills/immersive-web-simulation-forge/SKILL.md">Skill instructions</a> ·
  <a href="CHANGELOG.md">Changelog</a>
</p>

## 개요

Immersive Web Simulation Forge v0.7은 인터랙티브 브라우저 제품의 제품 설계, 도메인 검증, 런타임 엔지니어링, spatial authoring, hybrid asset orchestration, evidence-driven visual QA를 하나의 품질 체계로 묶고, **spatial flagship의 오브젝트/에셋 품질을 실제 audit gate로 강제**하는 스킬입니다.

다음과 같은 제품 유형을 대상으로 합니다.

- 브라우저 기반 open world와 game arena
- 물리·과학·공학 simulation lab
- 파라메트릭 design studio와 configurator
- 데이터 instrument와 operations panel
- ambient system과 dashboard panel

이 저장소의 `examples/`는 스킬로 제작된 결과물을 보여주는 전시·검증 자료입니다. 스킬 본체는 [`skills/immersive-web-simulation-forge/`](skills/immersive-web-simulation-forge/)에 있습니다.

## v0.7 — Structured Spatial Authoring & Asset Fidelity Gates

v0.7은 WorldSpec·Asset Router·spatial reconciliation을 도입하고, “계획상 hybrid인데 런타임은 primitive blockout”인 결과를 flagship으로 통과시키지 않도록 스키마와 audit를 강화합니다.

- **`asset_fidelity` v6 contract** — `style_mode`, `scope_mode`, visual target, identity-critical classes, hero assets, representative families, Near/Mid/Far authoring budget
- **Primitive placeholder gate** — 현실/레퍼런스 지향 flagship에서 Near placeholder ratio 기본 상한 15%, identity-critical primitive-only 금지
- **Reference-sensitive default** — realistic/reference-driven spatial flagship은 `reference_critical_objects=not-applicable`로 전부 우회할 수 없음
- **Runtime asset evidence** — `window.__FORGE__.reportAssetEvidence()`로 실제 화면에 올라간 object/family/material/contact/placeholder 상태를 보고
- **Asset fidelity audit** — `asset_fidelity_audit.mjs`가 hero/family coverage, near placeholder, material region, contact, shadow, multi-view, target-size evidence를 검사
- **Package blocker** — spatial flagship은 `.forge/asset-fidelity-audit.json`과 `asset_fidelity_validation`이 둘 다 PASS여야 완료
- **Intentional low-poly escape hatch** — `low-poly`/`abstract`는 primitive vocabulary를 의도적으로 사용할 수 있지만 silhouette·material grouping·contact·multi-view evidence는 여전히 요구

세 개의 기존 ledger(Product Outcome / Domain Validity / Runtime Engineering)는 그대로 유지합니다. Asset Quality를 별도 ledger로 추가하지 않고, **Product Outcome을 증명하는 강제 evidence gate**로 다룹니다.

### Spatial authoring foundation

- `WorldSpec`, semantic regions, global→regional world construction
- authored/procedural/reconstructed/generative/retrieved/hybrid Asset Router
- `ObjectSpec`, pass locking, deterministic placement/contact reconciliation
- multi-angle evidence와 Capture→Inspect→Repair→Regression loop

기존 공개 v0.6(v4) 및 호환 가능한 사전 후보(v5) 프로젝트는 다음으로 v6 스키마로 migration할 수 있습니다. migration은 필드만 보존·추가하며 flagship asset evidence를 자동으로 꾸며내지 않습니다.

```bash
python3 skills/immersive-web-simulation-forge/scripts/forge.py migrate my-project
```


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

3D/world 프로젝트는 deterministic spatial evidence도 검사할 수 있습니다.

```bash
node skills/immersive-web-simulation-forge/scripts/spatial_audit.mjs my-project \
  --out my-project/.forge/spatial.json

node skills/immersive-web-simulation-forge/scripts/browser_verify.mjs my-project \
  --evidence-suite \
  --evidence-views hero,alternate,interaction \
  --screenshot-dir my-project/.forge/evidence \
  --out my-project/.forge/evidence.json

node skills/immersive-web-simulation-forge/scripts/asset_fidelity_audit.mjs \
  my-project/.forge/evidence.json --flagship \
  --out my-project/.forge/asset-fidelity-audit.json
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

현재 전시 예제는 주로 v0.6 제작 기록입니다. v0.7은 이 예제의 시각 품질을 자동 보장한다고 주장하지 않으며, 새 flagship asset gate는 이후 제작물에서 blockout 탈출 증거를 강제하기 위한 계약입니다.

스킬을 설치한 뒤, 에이전트에게 만들고 싶은 제품을 프롬프트로 설명하면 아래와 같은 결과물이 나옵니다.

<table>
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
    <td width="33%" align="center">
      <a href="examples/0.7.0/realistic-ocean-simulation/dist/">
        <img src="examples/0.7.0/realistic-ocean-simulation/preview.png" width="100%" alt="PELAGIC living ocean preview">
        <br>
        <sub><b>PELAGIC</b><br>A Living Ocean</sub>
      </a>
    </td>
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
- `authoring/` — 파라미터 정의, undo/redo, 상태 변경, hybrid asset routing
- `io/` — 버전이 있는 프로젝트 직렬화, migration, round trip
- `systems/` — 공유 필드와 semantic-region-aware 이벤트 디렉터
- `world/` — semantic region field, RegionGraph, region-aware height field, scatter policy
- `spatial/` — surface anchor, placement solver, contact/collision validation
- `three/`, `canvas/`, `webgl/` — 공간 렌더링, representation-aware LOD, field, resolve와 후처리 기반
- `analysis/` — 측정 시리즈, 요약, plot과 CSV 출력
- `input/`, `ui/` — pointer look과 SVG 아이콘 시스템

`references/`에는 profile 선택, 물리 검증, parametric design, world/asset authoring, spatial reconciliation, perceptual fidelity, evidence-driven hardening, 측정 기준 등의 상세 지침이 있습니다.

## 제작 기록

이 스킬은 Codex `skill-creator`를 사용해 만들었습니다. 저장소의 예제는 대부분 `gpt-5.6-sol-high`를 사용해 단일 프롬프트로 작성된 결과물이며, [`armory-bench`](examples/0.6.0/armory-bench/)는 Claude Opus 5로 작성했습니다. [`k-holo-status-openworld-revision`](examples/0.6.0/k-holo-status-openworld-revision/k-holo-status-openworld/README.md)은 첫 결과물에서 한번 수정된 결과입니다.

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
        ├── kits/                      # 재사용 구현 모듈 (world/spatial/authoring 포함)
        ├── references/                # product/domain/world/asset/spatial 전문 지침
        ├── scripts/                   # audit, verify, package 도구
        ├── templates/                 # 계획·검증 템플릿
        └── tests/                     # Forge 자체 테스트
```

## 범위와 제한

- `visual-concept` 예제는 시각적·상호작용적 결과를 위한 것이며 실제 물리·식물학·음향학 모델을 의미하지 않습니다.
- 공학적 또는 의사결정 지원 수준의 주장은 외부 기준, 알려진 사례, 허용오차와 검토 기록이 필요합니다.
- 브라우저 성능 결과는 GPU, 브라우저, 해상도와 실행 환경에 따라 달라질 수 있습니다.
- `examples/`는 스킬 패키지 자체에 필수인 런타임 파일이 아니라 전시·검증 자료입니다.


### v0.7 non-goals

- 자체 text-to-3D foundation model을 포함하지 않습니다.
- Blender 또는 특정 생성 모델을 필수 dependency로 만들지 않습니다.
- 모든 asset을 자동 생성하거나 모든 profile에 WorldSpec을 요구하지 않습니다.
- `one prompt → production world`를 보장하지 않습니다.
- 고품질 asset을 자동 생성하는 foundation model을 내장하지 않습니다. 대신 필요한 경우 retrieved/reconstructed/generative/authored route를 선택하고 런타임 결과를 검증합니다.

## 라이선스

MIT
