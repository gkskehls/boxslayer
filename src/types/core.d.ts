// src/types/core.d.ts

export type CoreType = 'Fire' | 'Water' | 'Wind' | 'Electric';

export interface Core {
  id: string;
  name: string;
  type: CoreType;
  description: string;
  price: number;
  // 추가적인 코어 속성 (예: 강화 효과, 특수 효과 수치 등)은 필요에 따라 추가
  // 예를 들어, Fire 코어의 경우:
  // fireDamagePercentage?: number;
  // waterShieldAmount?: number;
  // windAttackSpeedBoost?: number;
  // electricStunChance?: number;
}
