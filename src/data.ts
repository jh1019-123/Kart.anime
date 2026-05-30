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
    name: '스카이 브라이트닝',
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
    id: 'shadow_knight',
    name: '섀도우크롤러',
    color: 0x475569, // Charcoal Slate
    flameColor: 0x8b5cf6, // Violet flame
    description: '지면 밀착 주행 능력이 뛰어나 드리프트 중 속도 손실이 극단적으로 적습니다.',
    rarity: 'Rare',
    stats: {
      speed: 1.28,
      accel: 0.021,
      drift: 1.9,
      handling: 0.038
    },
    price: 200
  },
  {
    id: 'neon_dragon',
    name: '네온 페라리',
    color: 0xa855f7, // Deep Purple
    flameColor: 0x22c55e, // Bright Green flame
    description: '레전더리 등급 카트. 압도적인 가속력과 초고속 튜닝을 거친 최강의 머신입니다.',
    rarity: 'Legendary',
    stats: {
      speed: 1.55,
      accel: 0.032,
      drift: 2.2,
      handling: 0.036
    },
    price: 450
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
    description: '연속적인 지그재그 헤어핀과 일직선 광속 가속 구간이 어우러진 미래형 테크노 가상터널 맵.',
    difficulty: '★★☆',
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
    difficulty: '★★★',
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
  }
];
