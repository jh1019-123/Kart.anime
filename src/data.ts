import { KartInfo, MapInfo } from './types';

export const KARTS: KartInfo[] = [
  {
    id: 'pink_thunder',
    name: '커먼핑크',
    color: 0xff007f, // Neon Pink
    flameColor: 0x22d3ee, // Cyan flame
    description: '기본형 카트로 부드러운 코너링과 우수한 범용성을 완비하고 있습니다.',
    rarity: 'Normal',
    stats: {
      speed: 1.15,
      accel: 0.02,
      drift: 1.8,
      handling: 0.03
    },
    price: 0
  },
  {
    id: 'blue_lightning',
    name: '크로스 윈드',
    color: 0x06b6d4, // Neon Cyan
    flameColor: 0xec4899, // Pink flame
    description: '최고 속도가 극대화되었으며, 미래형 전자기 충전 가속 엔진을 탑재했습니다.',
    rarity: 'Rare',
    stats: {
      speed: 1.35,
      accel: 0.024,
      drift: 1.5,
      handling: 0.028
    },
    price: 150
  },
  {
    id: 'golden_hero',
    name: '브레이브칼리버',
    color: 0xeab308, // Neon Yellow / Gold
    flameColor: 0xf97316, // Orange flame
    description: '드리프트 시 부스터 충전이 비약적으로 빠르며, 아이템 효율이 탁월합니다.',
    rarity: 'Rare',
    stats: {
      speed: 1.25,
      accel: 0.022,
      drift: 2.5,
      handling: 0.032
    },
    price: 180
  },
  {
    id: 'neon_dragon',
    name: '네온 페라리',
    color: 0xa855f7, // Deep Purple
    flameColor: 0x22c55e, // Bright Green flame
    description: '에픽급 고속 튜닝을 거쳐 안정적인 고속 제어가 가능한 고급형 스포츠 머신입니다.',
    rarity: 'Rare',
    stats: {
      speed: 1.42,
      accel: 0.027,
      drift: 2.1,
      handling: 0.034
    },
    price: 320
  },
  {
    id: 'crimson_vortex',
    name: '플린트',
    color: 0xd946ef, // Soft Fuchsia
    flameColor: 0xef4444, // Red spark
    description: '공기역학 배기 시스템을 통해 강력한 드래그 부스터를 획득할 수 있는 고스펙 머신입니다.',
    rarity: 'Rare',
    stats: {
      speed: 1.48,
      accel: 0.029,
      drift: 1.9,
      handling: 0.036
    },
    price: 480
  },
  {
    id: 'obsidian_shadow',
    name: '다크 옵시디언',
    color: 0x1e293b, // Slate Slate
    flameColor: 0xfacc15, // Golden glow
    description: '심연급 고밀도 복합 외장을 두른 최첨단 기어. 극대형 토크 기어를 통해 고비율의 오버드라이브 속도를 유지합니다.',
    rarity: 'Legendary',
    stats: {
      speed: 1.65,
      accel: 0.035,
      drift: 2.3,
      handling: 0.041
    },
    price: 1250
  },
  {
    id: 'emperor_absolute',
    name: '디 아웃레이지 엠퍼러',
    color: 0xeab308, // Golden yellow
    flameColor: 0x06b6d4, // Cyan fire
    description: '성계 패권 챔피언 기체. 고도화된 타키온 양자 가속 코어를 퓨징하여 모든 트랙 마티네를 비약적으로 단축합니다.',
    rarity: 'Legendary',
    stats: {
      speed: 1.72,
      accel: 0.040,
      drift: 2.7,
      handling: 0.046
    },
    price: 2200
  },
  {
    id: 'outrage_supreme_dev',
    name: '디 아웃레이지 얼티밋 디벨로퍼',
    color: 0xff0055, // Ultimate Neon Pink/Red
    flameColor: 0x00ffcc, // Cyan-Green electric spark
    description: '상점에서 secret 코드를 입력하여 해금된 최고 존엄 개발자 전용 머신. 디 아웃레이지 시리즈를 아득히 초월하는 전설적인 마스터 기어.',
    rarity: 'Legendary',
    stats: {
      speed: 1.95,
      accel: 0.052,
      drift: 3.2,
      handling: 0.055
    },
    price: 99999
  }
];

export const MAPS: MapInfo[] = [
  {
    id: 'neon_sky_way',
    name: '네온 스카이 웨이 (Neon Sky Way)',
    description: '화려한 핑크와 네온 조명이 수놓은 구름 위의 도심 서킷. 초보자에게 이상적인 밸런스형 코스.',
    difficulty: '★☆☆',
    themeColor: 'pink-500',
    skyColor: 0x060b24, // Deep blue
    points: [
      [0, 0, 0],
      [60, 0, 30],
      [120, 0, 15],
      [180, 0, -40],
      [160, 0, -110],
      [90, 0, -150],
      [20, 0, -110],
      [-40, 0, -160],
      [-100, 0, -120],
      [-140, 0, -60],
      [-90, 0, -15],
      [-40, 0, 15],
      [-10, 0, 0]
    ]
  },
  {
    id: 'cyberspace_tunnel',
    name: '사이스페이스 터널 (Cyberspace Tunnel)',
    description: '연속적인 지그재그 헤어핀 and 일직선 광속 가속 구간이 어우러진 미래형 테크노 가상터널 맵.',
    difficulty: '어려움',
    themeColor: 'cyan-400',
    skyColor: 0x05131a, // Dark cyan gray
    points: [
      [0, 0, 0],
      [40, 0, 10],
      [50, 0, -35],
      [95, 0, -40],
      [105, 0, 15],
      [145, 0, 0],
      [165, 0, -65],
      [115, 0, -105],
      [75, 0, -75],
      [35, 0, -125],
      [-20, 0, -85],
      [-65, 0, -125],
      [-115, 0, -75],
      [-85, 0, -25],
      [-35, 0, 20],
      [-10, 0, 0]
    ]
  },
  {
    id: 'cosmic_highway',
    name: '코스믹 하이웨이 (Cosmic Highway)',
    description: '가없는 심우주 공간 속에 펼쳐진 은하수 서킷. 급변하는 고난이도 코너가 도사리고 있습니다.',
    difficulty: '★★★',
    themeColor: 'purple-500',
    skyColor: 0x0a0518, // Cosmic dark purple
    points: [
      [0, 0, 0],
      [70, 0, -20],
      [110, 0, 30],
      [160, 0, 10],
      [170, 0, -75],
      [110, 0, -115],
      [125, 0, -165],
      [55, 0, -185],
      [0, 0, -135],
      [-55, 0, -175],
      [-125, 0, -135],
      [-155, 0, -65],
      [-105, 0, -15],
      [-45, 0, -35],
      [-15, 0, 0]
    ]
  },
  {
    id: 'lava_crevice',
    name: '마그마 크레비스 (Magma Crevice)',
    description: '끓어오르는 빨간 용암 계곡 사이로 설계된 위험천만한 코스. 급정거와 빠른 부스터 드리프트가 중요합니다.',
    difficulty: '중',
    themeColor: 'red-500',
    skyColor: 0x1a0505, // Fiery dark red
    points: [
      [0, 0, 0],
      [45, 0, -25],
      [100, 0, -10],
      [130, 0, -60],
      [170, 0, -40],
      [195, 0, -100],
      [150, 0, -145],
      [95, 0, -120],
      [40, 0, -170],
      [-15, 0, -125],
      [-75, 0, -160],
      [-130, 0, -110],
      [-95, 0, -55],
      [-50, 0, -10],
      [-15, 0, 0]
    ]
  },
  {
    id: 'frozen_glacier',
    name: '아이스 윈드 캠프 (Ice Wind Camp)',
    description: '단단하게 얼어붙은 푸른 빙벽과 하얀 눈밭 위를 가르는 낭만 코스. 미끄럼을 극복하는 카트 컨트롤이 필수입니다.',
    difficulty: '★★☆',
    themeColor: 'blue-400',
    skyColor: 0x001220, // Dark icy blue
    points: [
      [0, 0, 0],
      [50, 0, 20],
      [105, 0, 0],
      [140, 0, -45],
      [90, 0, -90],
      [120, 0, -140],
      [60, 0, -165],
      [0, 0, -105],
      [-60, 0, -145],
      [-115, 0, -100],
      [-80, 0, -50],
      [-35, 0, -15],
      [-10, 0, 0]
    ]
  },
  {
    id: 'spring_cherry_road',
    name: '봄날의 흩날리는 벚꽃길 (Blossom Spring Road)',
    description: '분홍빛 벚꽃 잎이 흩날리는 낭만적인 봄의 연분홍 산악 트랙. 대형 점프 지대와 산수유 지름길이 조화를 이룹니다.',
    difficulty: '★★★☆',
    themeColor: 'pink-300',
    skyColor: 0xfff0f6, // Blossom pink glow
    points: [
      [0, 0, 0],
      [60, 0, 20],        // Slow flat curve (Flattened)
      [110, 0, -10],     // Flat curve (Flattened)
      [150, 0, -60],     // Flat hairpin (Flattened)
      [190, 0, -110],    // High plateau (Flattened)
      [240, 0, -140],    // Apex before jump (Flattened)
      [300, 0, -100],    // Valley receiving jump (Flattened)
      [350, 0, -40],      // Base of valley (Flattened)
      [330, 0, 40],      // Deep lakeside dip (Flattened)
      [270, 0, 100],    // Curving near lakeside (Flattened)
      [190, 0, 150],     // Flat rise back (Flattened)
      [110, 0, 120],      // Hairpin bypass (Flattened)
      [50, 0, 90],        // S-curves (Flattened)
      [-30, 0, 110],     // Steep shortcut entry (Flattened)
      [-80, 0, 60],       // Low land returning (Flattened)
      [-40, 0, 10],       // Final stretch alignment (Flattened)
      [0, 0, 0]
    ],
    boosterPads: [
      [90, 0, 2],
      [220, 0, -135],
      [210, 0, 135]
    ],
    jumpRamps: [
      [240, 0, -140]
    ],
    shortcuts: [
      [80, 0, 105]
    ]
  },
  {
    id: 'summer_coconut_coast',
    name: '여름 빌리지 코코넛 해안 (Sunny Coconut Summer Coast)',
    description: '뜨거운 태양과 에메랄드 해변이 펼쳐지는 시원한 여름 코스. 거대한 모래 언덕 계곡 꼭대기에서의 짜릿한 공중 가속과 비밀 지름길이 기다립니다.',
    difficulty: '★★★★',
    themeColor: 'cyan-450',
    skyColor: 0xe0f2fe, // Bright ocean blue
    points: [
      [0, 0, 0],
      [70, 0, -30],       // Seaside flat strait (Flattened)
      [140, 0, -60],      // Beach dune climb (Flattened)
      [210, 0, -90],     // High dune cliff (Flattened)
      [280, 0, -140],    // Overlook jump point (Flattened)
      [320, 0, -80],      // Sand beach lander (Flattened)
      [380, 0, -20],     // Tropical reef sea-level dip (Flattened)
      [340, 0, 60],     // Underwater glass tunnel (Flattened)
      [280, 0, 130],    // Underwater tunnel deep apex (Flattened)
      [200, 0, 160],     // Climbing out of water (Flattened)
      [130, 0, 100],      // Scenic resort pier drive (Flattened)
      [60, 0, 50],        // Curving hairpins (Flattened)
      [-40, 0, 90],      // Village arch pass (Flattened)
      [-110, 0, 40],     // Elevated cliffside slope (Flattened)
      [-90, 0, -20],      // Plunge down to finish (Flattened)
      [-30, 0, -10],      // Alignment lane (Flattened)
      [0, 0, 0]
    ],
    boosterPads: [
      [40, 0, -15],
      [260, 0, -130],
      [220, 0, 155]
    ],
    jumpRamps: [
      [280, 0, -140]
    ],
    shortcuts: [
      [165, 0, 130]
    ]
  },
  {
    id: 'autumn_maple_valley',
    name: '가을빛 단풍나무 비밀 계곡 (Maple Leaf Autumn Canyon)',
    description: '황금빛 단풍나무들이 가득한 신비로운 붉은 가을 골짜기 트랙. 골짜기를 완전히 스킵하는 붉은 단풍나무 줄기 지름길이 특징입니다.',
    difficulty: '★★★★☆',
    themeColor: 'orange-500',
    skyColor: 0xfff7ed, // Soft sunset gold
    points: [
      [0, 0, 0],
      [50, 0, 40],       // Cozy forest trail rise (Flattened)
      [110, 0, 90],      // Cliff edge winding (Flattened)
      [180, 0, 140],     // Rocky ridge climb (Flattened)
      [250, 0, 110],     // Highest maple scenic overlook (Flattened)
      [290, 0, 40],      // Deep leaf-strewn gorge bottom (Flattened)
      [340, 0, -20],     // Curving riverbed path (Flattened)
      [310, 0, -90],      // Misty marsh loop (Flattened)
      [240, 0, -140],    // Winding marsh S-turns (Flattened)
      [160, 0, -110],    // Rising through wooden suspension bridge (Flattened)
      [90, 0, -150],     // High cliff bridge checkpoint (Flattened)
      [20, 0, -110],      // Descending rock arches (Flattened)
      [-60, 0, -140],     // Dark maple cavern curve (Flattened)
      [-120, 0, -80],    // Hidden temple mossy climb (Flattened)
      [-80, 0, -20],      // Stepping slopes (Flattened)
      [-30, 0, -10],
      [0, 0, 0]
    ],
    boosterPads: [
      [30, 0, 25],
      [230, 0, 115],
      [180, 0, -120]
    ],
    jumpRamps: [
      [250, 0, 110]
    ],
    shortcuts: [
      [200, 0, -15]
    ]
  },
  {
    id: 'winter_snowhead_glacier',
    name: '겨울 왕국 설화의 하얀 트랙 (Frozen Winter Spell S-Track)',
    description: '투명하게 얼어붙은 푸른 빙벽과 영하 40도의 눈 폭풍을 뚫고 달리는 궁극의 겨울 코스. 고속 스카이 점프대와 균열 지름길을 마스터하세요.',
    difficulty: '★★★★★',
    themeColor: 'sky-400',
    skyColor: 0xf0f9ff, // Pale frozen arctic blue
    points: [
      [0, 0, 0],
      [-60, 0, -40],      // Heavy blizzard ascent (Flattened)
      [-130, 0, -90],    // Ice-wall razor ridge (Flattened)
      [-210, 0, -130],   // Ice cavern climb (Flattened)
      [-280, 0, -80],    // Glacial peak apex & jump over crevice (Flattened)
      [-240, 0, -10],    // Deep snow sink drop (Flattened)
      [-310, 0, 50],    // Deepest frozen trench tunnel (Flattened)
      [-260, 0, 120],   // Deepest coordinate point (Flattened)
      [-180, 0, 160],   // Under-ice frozen lake crossing (Flattened)
      [-100, 0, 110],    // Climbing icy banks (Flattened)
      [-30, 0, 140],      // Sharp snowy double hairpins (Flattened)
      [40, 0, 110],       // Glacial lake overlooking straight (Flattened)
      [90, 0, 60],       // Ice sculpture archway climb (Flattened)
      [70, 0, 10],        // Winding down (Flattened)
      [30, 0, 5],         // home stretch (Flattened)
      [0, 0, 0]
    ],
    boosterPads: [
      [-40, 0, -25],
      [-265, 0, -70],
      [-140, 0, 135]
    ],
    jumpRamps: [
      [-280, 0, -80]
    ],
    shortcuts: [
      [-65, 0, 125]
    ]
  },
  {
    id: 'empty_arena',
    name: '콜로세움 경기장 (Colosseum Arena)',
    description: '어떠한 가파른 코너도 굴곡진 고저차도 존재하지 않는 거대한 원형 격투 경기장. 오직 잉크 영역 도색 대전과 플래그 사수전에 특화된 최적의 무대입니다.',
    difficulty: '★☆☆',
    themeColor: 'emerald-500',
    skyColor: 0x060b24,
    points: [
      [0, 0, 0],
      [50, 0, 50],
      [100, 0, 0],
      [50, 0, -50],
      [-50, 0, -50],
      [-100, 0, 0],
      [-50, 0, 50],
      [0, 0, 0]
    ]
  }
];
