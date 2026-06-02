// src/components/IntroScreen.jsx
import React, { useState } from 'react';
import { LOCALIZATION } from '../utils/localization';
import { DEFAULT_SETTINGS } from '../utils/setting';

export function IntroScreen({ lang, setLang, onStartGame }) {
  const t = LOCALIZATION[lang].ui;
  
  // 建立自定义沙盒状态机
  const [customMapSize, setCustomMapSize] = useState(DEFAULT_SETTINGS.presets.normal.mapSize);
  const [customShowMap, setCustomShowMap] = useState(true);
  const [selectedPlayerSpeed, setSelectedPlayerSpeed] = useState('medium');
  const [selectedEnemySpeed, setSelectedEnemySpeed] = useState('medium');

  // 快中慢底层像素定义的可调状态
  const [pSlow, setPSlow] = useState(DEFAULT_SETTINGS.speedDefinitions.player.slow);
  const [pMed, setPMed] = useState(DEFAULT_SETTINGS.speedDefinitions.player.medium);
  const [pFast, setPFast] = useState(DEFAULT_SETTINGS.speedDefinitions.player.fast);

  const [eSlow, setESlow] = useState(DEFAULT_SETTINGS.speedDefinitions.enemy.slow);
  const [eMed, setEMed] = useState(DEFAULT_SETTINGS.speedDefinitions.enemy.medium);
  const [eFast, setEFast] = useState(DEFAULT_SETTINGS.speedDefinitions.enemy.fast);

  // 快捷触发标准预设
  const handleSelectPreset = (diffKey) => {
    const preset = DEFAULT_SETTINGS.presets[diffKey];
    const config = {
      difficulty: diffKey,
      mapSize: preset.mapSize,
      showMap: preset.showMap,
      playerSpeedVal: DEFAULT_SETTINGS.speedDefinitions.player[preset.playerSpeedKey],
      enemySpeedVal: DEFAULT_SETTINGS.speedDefinitions.enemy[preset.enemySpeedKey]
    };
    onStartGame(config);
  };

  // 组装并触发自定义二级菜单参数
  const handleLaunchCustom = () => {
    const playerSpeedMap = { slow: parseFloat(pSlow), medium: parseFloat(pMed), fast: parseFloat(pFast) };
    const enemySpeedMap = { slow: parseFloat(eSlow), medium: parseFloat(eMed), fast: parseFloat(eFast) };

    const config = {
      difficulty: 'custom',
      mapSize: Math.min(100, Math.max(25, parseInt(customMapSize) || 25)),
      showMap: customShowMap,
      playerSpeedVal: playerSpeedMap[selectedPlayerSpeed],
      enemySpeedVal: enemySpeedMap[selectedEnemySpeed]
    };
    onStartGame(config);
  };

  return (
    <div style={overlayStyle}>
      {/* 顶部多语言快捷选择区 */}
      <div style={{ position: 'absolute', top: 25, display: 'flex', gap: '10px', zIndex: 310 }}>
        {['zh', 'zt', 'en', 'ja'].map(l => (
          <button key={l} className={`lang-btn ${lang === l ? 'active' : ''}`} onClick={() => setLang(l)}>
            {l === 'zh' ? '简体中文' : l === 'zt' ? '繁體中文' : l === 'en' ? 'English' : '日本語'}
          </button>
        ))}
      </div>

      <h1 style={{ color: '#ff1a1a', letterSpacing: '5px', marginBottom: '20px', fontFamily: 'Georgia, serif', marginTop: '35px' }}>{t.title}</h1>
      
      {/* 文学化剧本交代 */}
      <div style={{ maxWidth: '720px', textAlign: 'left', lineHeight: '1.9', color: '#ccc', fontSize: '13.5px', height: '230px', overflowY: 'auto', paddingRight: '15px', borderBottom: '1px solid #222', marginBottom: '25px' }}>
        <p>{t.intro_1}</p>
        <p style={{ marginTop: '10px' }}>{t.intro_2}</p>
        <p style={{ marginTop: '10px', color: '#ffcc00' }}>{t.intro_3}</p>
        <p style={{ marginTop: '10px', color: '#888', fontStyle: 'italic' }}>{t.intro_4}</p>
      </div>
      
      <h3 style={{ color: '#888', marginBottom: '15px', fontSize: '13px', letterSpacing: '1px' }}>{t.choose_diff}</h3>
      
      {/* 标准传统模式快捷入口 */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '25px' }}>
        <button onClick={() => handleSelectPreset('easy')} style={btnStyle('#00ff00', '#0a220a')}>{t.easy}</button>
        <button onClick={() => handleSelectPreset('normal')} style={btnStyle('#ffcc00', '#221a0a')}>{t.normal}</button>
        <button onClick={() => handleSelectPreset('hard')} style={btnStyle('#ff1a1a', '#220a0a')}>{t.hard}</button>
      </div>

      {/* ==================== 核心扩充：高级自定义二级菜单交互面板 ==================== */}
      <div style={customPanelStyle}>
        <div style={{ color: '#ff3333', fontWeight: 'bold', fontSize: '14px', borderBottom: '1px solid #331111', paddingBottom: '6px', marginBottom: '12px', textAlign: 'left' }}>
          ⚙️ 二级深度自定义菜单 (Advanced Parameter Matrix)
        </div>
        
        {/* 基础拓扑与有无地图开关 */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '12px', fontSize: '12.5px' }}>
          <label>
            {t.custom_size}
            <input type="number" value={customMapSize} onChange={(e) => setCustomMapSize(e.target.value)} style={inputStyle} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            {t.custom_map}
            <input type="checkbox" checked={customShowMap} onChange={(e) => setCustomShowMap(e.target.checked)} style={{ marginLeft: '6px' }} />
          </label>
        </div>

        {/* 速度评级分配下拉菜单 */}
        <div style={{ display: 'flex', gap: '25px', marginBottom: '15px', fontSize: '12.5px' }}>
          <label>
            🏃 玩家当前定档:
            <select value={selectedPlayerSpeed} onChange={(e) => setSelectedPlayerSpeed(e.target.value)} style={selectStyle}>
              <option value="slow">慢速 (Slow)</option>
              <option value="medium">中速 (Medium)</option>
              <option value="fast">快速 (Fast)</option>
            </select>
          </label>
          <label>
            特工军队定档:
            <select value={selectedEnemySpeed} onChange={(e) => setSelectedEnemySpeed(e.target.value)} style={selectStyle}>
              <option value="slow">慢速 (Slow)</option>
              <option value="medium">中速 (Medium)</option>
              <option value="fast">快速 (Fast)</option>
            </select>
          </label>
        </div>

        {/* 快、中、慢底层物理数值重写矩阵 */}
        <div style={{ background: '#090101', border: '1px solid #220505', padding: '10px', borderRadius: '3px' }}>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px', textAlign: 'left' }}># 现场重定义快/中/慢数值 (单位: 像素位移/帧)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span style={{ width: '80px', color: '#aaa', textAlign: 'left' }}>玩家参数：</span>
              <label>慢 <input type="number" step="0.1" value={pSlow} onChange={e => setPSlow(e.target.value)} style={miniInputStyle} /></label>
              <label>中 <input type="number" step="0.1" value={pMed} onChange={e => setPMed(e.target.value)} style={miniInputStyle} /></label>
              <label>快 <input type="number" step="0.1" value={pFast} onChange={e => setPFast(e.target.value)} style={miniInputStyle} /></label>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span style={{ width: '80px', color: '#ff5555', textAlign: 'left' }}>军警部队：</span>
              <label>慢 <input type="number" step="0.1" value={eSlow} onChange={e => setESlow(e.target.value)} style={miniInputStyle} /></label>
              <label>中 <input type="number" step="0.1" value={eMed} onChange={e => setEMed(e.target.value)} style={miniInputStyle} /></label>
              <label>快 <input type="number" step="0.1" value={eFast} onChange={e => setEFast(e.target.value)} style={miniInputStyle} /></label>
            </div>
          </div>
        </div>

        <button onClick={handleLaunchCustom} style={{ width: '100%', padding: '8px', background: '#ff1a1a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', marginTop: '12px', letterSpacing: '2px', fontSize: '13px' }}>
          {t.btn_start} (CUSTOM LANUCH)
        </button>
      </div>
    </div>
  );
}

// Styles
const overlayStyle = { position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.97)', zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px', color: '#fff', fontFamily: 'monospace' };
const customPanelStyle = { width: '100%', maxWidth: '560px', padding: '15px 20px', background: '#040404', border: '1px solid #1a0505', borderRadius: '4px' };
const inputStyle = { width: '50px', background: '#111', color: '#fff', border: '1px solid #444', padding: '2px 4px', marginLeft: '5px', fontSize: '12px' };
const miniInputStyle = { width: '45px', background: '#111', color: '#fff', border: '1px solid #400', padding: '1px 3px', fontSize: '11px', marginRight: '8px' };
const selectStyle = { background: '#111', color: '#fff', border: '1px solid #444', padding: '2px 4px', marginLeft: '6px', fontSize: '12px', cursor: 'pointer' };
const btnStyle = (textColor, bgColor) => ({ padding: '10px 24px', background: bgColor, color: textColor, border: `2px solid ${textColor}`, fontFamily: 'monospace', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', borderRadius: '4px' });