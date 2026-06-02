// src/utils/setting.js

export const SETTING = {
  // 基础物理与网格大小
  CELL_SIZE: 160,               // 每个街区胡同的绝对像素尺寸
  PLAYER_COLLISION_SIZE: 18,     // 玩家（记者）的物理碰撞半径

  // 速度配给
  PLAYER_SPEED: 6.8,            // 玩家的基础移动速度

  // 敌军（军警）在各难度下的自适应追踪移速（保持略慢于玩家，走对路线可以利用高移速甩掉）
  ENEMY_SPEEDS: {
    easy: 0.9,
    normal: 1.4,
    hard: 2.0,
    custom: 1.6
  },

  // 默认地图网格大小配给 (横纵格子数)
  MAP_SIZES: {
    easy: 25,
    normal: 35,
    hard: 45
  },

  // 探照视界与暴盲时间常数
  RAYCAST_BEAM_SPREAD: Math.PI / 2.4, // 手电筒扇形散射张角
  RAYCAST_MAX_RANGE: 650,             // 手电筒与视线最大探照距离
  RAYCAST_COUNT: 130,                 // 视线投射采样的光线总条数
  
  FLASH_FADE_SPEED: 0.04,             // 闪光灯触发后每帧的淡出速率
  STUN_DURATION: 4000,                // 战术暴盲导致的军警瘫痪时间 (毫秒)
  REACTION_TIME_LIMIT: 1300,          // 被包夹贴身后的极限制盲反应生死线 (毫秒)

  // 空间合成音频物理频率配置 (单位: Hz)
  AUDIO: {
    FOOTSTEP_FREQ_START: 110,         // 军警沉闷脚步声的起始频率
    FOOTSTEP_FREQ_END: 40,            // 脚步声落地的低频余震频率
    SHUTTER_CLICK_FREQ: 750,          // 机械快门咬合的基准频率
    STUN_TINNITUS_FREQ: 2600,         // 暴盲耳鸣的高频刺耳波形频率
    HEARTBEAT_BGM_FAST: 65,           // 心跳背景音乐重击一频段
    HEARTBEAT_BGM_SLOW: 60,           // 心跳背景音乐轻击二频段
    VICTORY_CHIME_FREQ: 523.25,       // 绝密长卷解锁时的清脆风铃提示音 (C5)
    GUNSHOT_BANDPASS_FREQ: 450        // 远方流弹枪鸣的中心频率
  }
};