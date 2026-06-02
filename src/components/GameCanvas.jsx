// src/components/GameCanvas.jsx
import React, { useRef, useEffect, useState } from 'react';
import { generateAdvancedMaze, getNextGridStep } from '../utils/gameStructures';
import { LOCALIZATION } from '../utils/localization';
import { SETTING } from '../utils/setting';

export default function GameCanvas() {
  const [lang, setLang] = useState('zh'); // zh, zt, en, ja
  const [gameStage, setGameStage] = useState('boot'); // boot, intro, playing, victory, gameover
  const [difficulty, setDifficulty] = useState('normal'); 
  
  // 自定义难度二级菜单参数控制
  const [customSize, setCustomSize] = useState(30);
  const [customMap, setCustomMap] = useState(true);
  const [showCustomMenu, setShowCustomMenu] = useState(false); 

  const [mapSize, setMapSize] = useState(25);
  const [filmCount, setFilmCount] = useState(5);
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedPhotos, setCapturedPhotos] = useState([]); 
  const [showFullArchive, setShowFullArchive] = useState(false); 
  
  const [failReason, setFailReason] = useState('');
  const [topWhisper, setTopWhisper] = useState('');
  const [developProgress, setDevelopProgress] = useState([0, 0, 0, 0, 0]);
  const [audioStatus, setAudioStatus] = useState('未激活');

  const canvasRef = useRef(null);
  const engine = useRef({
    player: { x: 0, y: 0 },
    exitGrid: { x: 0, y: 0 },
    mouseX: window.innerWidth / 2, mouseY: window.innerHeight / 2,
    keys: { w: false, a: false, s: false, d: false },
    flashOpacity: 0, isFlashing: false,
    maze: null, nodes: [], enemies: [],
    closeEnemyId: null, dangerStartTime: 0, audioCtx: null,
    lastWhisperTime: 0, lastBGMTime: 0
  });

  const t = LOCALIZATION[lang].ui;

  // 入场开场动画生命周期
  useEffect(() => {
    if (gameStage === 'boot') {
      const timer = setTimeout(() => {
        setGameStage('intro');
      }, 2600); 
      return () => clearTimeout(timer);
    }
  }, [gameStage]);

  const startNewGame = (chosenDiff) => {
    let size = SETTING.MAP_SIZES.normal;
    if (chosenDiff === 'easy') size = SETTING.MAP_SIZES.easy;
    if (chosenDiff === 'hard') size = SETTING.MAP_SIZES.hard;
    if (chosenDiff === 'custom') size = Math.min(100, Math.max(25, parseInt(customSize) || 25));
    
    setDifficulty(chosenDiff);
    const mazeData = generateAdvancedMaze(size);
    setMapSize(mazeData.actualSize);
    
    engine.current.maze = mazeData.grid;
    engine.current.nodes = mazeData.photoNodes;
    engine.current.player = { 
      x: mazeData.start.x * SETTING.CELL_SIZE + SETTING.CELL_SIZE / 2, 
      y: mazeData.start.y * SETTING.CELL_SIZE + SETTING.CELL_SIZE / 2 
    };
    engine.current.exitGrid = mazeData.exit;

    engine.current.keys = { w: false, a: false, s: false, d: false };
    engine.current.flashOpacity = 0;
    engine.current.isFlashing = false;
    engine.current.closeEnemyId = null;
    engine.current.dangerStartTime = 0;
    engine.current.lastWhisperTime = 0;
    engine.current.lastBGMTime = 0;

    const enemyCount = chosenDiff === 'hard' ? 6 : chosenDiff === 'normal' ? 4 : chosenDiff === 'custom' ? Math.ceil(size / 8) : 2;
    engine.current.enemies = [];
    for (let i = 0; i < enemyCount; i++) {
      const cell = mazeData.decoyCoords[Math.floor(Math.random() * mazeData.decoyCoords.length)] || { x: 3, y: 3 };
      engine.current.enemies.push({
        id: lang === 'en' ? `Martial-Squad-${i+1}` : `戒严纵队-${i + 1}组`, gx: cell.x, gy: cell.y,
        x: cell.x * SETTING.CELL_SIZE + SETTING.CELL_SIZE / 2, y: cell.y * SETTING.CELL_SIZE + SETTING.CELL_SIZE / 2,
        isStunned: false, stunTime: 0, lastStep: 0, lastFootstep: 0
      });
    }

    engine.current.nodes.forEach(n => {
      const img = new Image(); img.src = n.path; img.onload = () => { n.htmlImg = img; };
    });

    forceUnmuteAudio();
    setFilmCount(5);
    setCapturedPhotos([]); 
    setCapturedImage(null);
    setFailReason('');
    setDevelopProgress([0, 0, 0, 0, 0]);
    setShowFullArchive(false); 
    setGameStage('playing');

    setTimeout(() => playSynthesizedSound(880, 'sine', 0.1, 0.3), 200);
  };

  const forceUnmuteAudio = () => {
    if (!engine.current.audioCtx) engine.current.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (engine.current.audioCtx.state === 'suspended') {
      engine.current.audioCtx.resume().then(() => setAudioStatus('已连接 🔊')).catch(() => setAudioStatus('未激活 🔇'));
    } else {
      setAudioStatus('已连接 🔊');
    }
  };

  const playSynthesizedSound = (freq, type, duration, volume) => {
    const ctx = engine.current.audioCtx; if (!ctx || ctx.state === 'suspended') return;
    const timeStamp = ctx.currentTime; const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, timeStamp);
    gain.gain.setValueAtTime(volume, timeStamp); gain.gain.exponentialRampToValueAtTime(0.001, timeStamp + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(timeStamp); osc.stop(timeStamp + duration + 0.02);
  };

  const playSpatialFootstep = (pan, vol) => {
    const ctx = engine.current.audioCtx; if (!ctx || ctx.state === 'suspended') return;
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = 'triangle'; osc.frequency.setValueAtTime(SETTING.AUDIO.FOOTSTEP_FREQ_START, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(SETTING.AUDIO.FOOTSTEP_FREQ_END, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(vol * 0.9, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    if (panner) { panner.pan.setValueAtTime(pan, ctx.currentTime); osc.connect(gain).connect(panner).connect(ctx.destination); }
    else { osc.connect(gain).connect(ctx.destination); }
    osc.start(); osc.stop(ctx.currentTime + 0.13);
  };

  const playDistantGunshot = () => {
    const ctx = engine.current.audioCtx; if (!ctx || ctx.state === 'suspended') return;
    const timestamp = ctx.currentTime; const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate); const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buffer;
    const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.setValueAtTime(SETTING.AUDIO.GUNSHOT_BANDPASS_FREQ, timestamp);
    const gain = ctx.createGain(); gain.gain.setValueAtTime(0.35, timestamp); gain.gain.exponentialRampToValueAtTime(0.001, timestamp + 0.18);
    noise.connect(filter).connect(gain).connect(ctx.destination); noise.start(timestamp);
  };

  const checkWallCollision = (wx, wy, size) => {
    const grid = engine.current.maze;
    const checkPoints = [{ x: wx - size, y: wy - size }, { x: wx + size, y: wy - size }, { x: wx - size, y: wy + size }, { x: wx + size, y: wy + size }];
    for (let pt of checkPoints) {
      const gx = Math.floor(pt.x / SETTING.CELL_SIZE); const gy = Math.floor(pt.y / SETTING.CELL_SIZE);
      if (gx < 0 || gx >= mapSize || gy < 0 || gy >= mapSize || grid[gy][gx] === 1) return true;
    }
    return false;
  };

  // 绝密洗相流水线
  useEffect(() => {
    if (gameStage === 'victory') {
      const timers = [];
      capturedPhotos.forEach((_, index) => {
        const t = setTimeout(() => {
          let p = 0;
          const inv = setInterval(() => {
            p += 0.02;
            setDevelopProgress(prev => { const n = [...prev]; n[index] = Math.min(p, 1); return n; });
            if (p >= 1) {
              clearInterval(inv);
              if (index === capturedPhotos.length - 1 && capturedPhotos.length === 5) {
                setTimeout(() => { playSynthesizedSound(SETTING.AUDIO.VICTORY_CHIME_FREQ, 'sine', 0.4, 0.25); setShowFullArchive(true); }, 1200);
              }
            }
          }, 30);
        }, index * 1400);
        timers.push(t);
      });
      return () => timers.forEach(clearTimeout);
    }
  }, [gameStage, capturedPhotos]);

  // 物理渲染主循环（已全面消除旧变量 CELL_SIZE）
  useEffect(() => {
    if (gameStage !== 'playing') return;

    const canvas = canvasRef.current; const ctx = canvas.getContext('2d');
    let animId;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize); resize();

    const mouseMove = (e) => { forceUnmuteAudio(); if (!capturedImage) { engine.current.mouseX = e.clientX; engine.current.mouseY = e.clientY; } };
    const keyDown = (e) => {
      forceUnmuteAudio(); if (capturedImage) return;
      const k = e.key.toLowerCase();
      if (k === ' ' && !engine.current.keys[' ']) { engine.current.keys[' '] = true; triggerCameraShutter(); }
      else if (engine.current.keys.hasOwnProperty(k)) engine.current.keys[k] = true;
    };
    const keyUp = (e) => { const k = e.key.toLowerCase(); if (k === ' ') engine.current.keys[' '] = false; else if (engine.current.keys.hasOwnProperty(k)) engine.current.keys[k] = false; };

    window.addEventListener('mousemove', mouseMove); window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp);

    const triggerCameraShutter = () => {
      const state = engine.current; if (filmCount <= 0 || state.isFlashing) return;
      playSynthesizedSound(SETTING.AUDIO.SHUTTER_CLICK_FREQ, 'sawtooth', 0.12, 0.6);
      state.isFlashing = true; state.flashOpacity = 1.0;
      setFilmCount(p => {
        const next = p - 1;
        if (next < 0 && state.closeEnemyId !== null) { setFailReason(t.fail_no_photo); setGameStage('gameover'); }
        return next;
      });

      if (state.closeEnemyId !== null) {
        const en = state.enemies.find(e => e.id === state.closeEnemyId);
        if (en) { playSynthesizedSound(SETTING.AUDIO.STUN_TINNITUS_FREQ, 'sine', 3.0, 0.25); en.isStunned = true; en.stunTime = Date.now() + SETTING.STUN_DURATION; state.closeEnemyId = null; return; }
      }

      const cx = canvas.width / 2; const cy = canvas.height / 2;
      const lookAngle = Math.atan2(state.mouseY - cy, state.mouseX - cx);
      let snapshot = null;

      state.nodes.forEach(n => {
        if (n.isCaptured) return;
        const rx = n.worldX - state.player.x; const ry = n.worldY - state.player.y;
        const dist = Math.sqrt(rx*rx + ry*ry); const ang = Math.atan2(ry, rx);
        const diff = Math.atan2(Math.sin(lookAngle - ang), Math.cos(lookAngle - ang));
        if (dist < 500 && Math.abs(diff) < Math.PI / 6) snapshot = n;
      });

      if (snapshot) {
        snapshot.isCaptured = true;
        setCapturedPhotos(p => [...p, { id: snapshot.id, path: snapshot.path }]);
        Object.keys(state.keys).forEach(k => state.keys[k] = false);
        setTimeout(() => setCapturedImage(snapshot.path), 60);
      }
    };

    const loop = () => {
      const state = engine.current; const now = Date.now();
      const w = canvas.width; const h = canvas.height; const cx = w / 2; const cy = h / 2;
      const exitWorldX = state.exitGrid.x * SETTING.CELL_SIZE + SETTING.CELL_SIZE / 2; const exitWorldY = state.exitGrid.y * SETTING.CELL_SIZE + SETTING.CELL_SIZE / 2;

      if (!capturedImage) {
        const pSpeed = SETTING.PLAYER_SPEED; 
        let nx = state.player.x; let ny = state.player.y;
        if (state.keys.w) ny -= pSpeed; if (state.keys.s) ny += pSpeed;
        if (state.keys.a) nx -= pSpeed; if (state.keys.d) nx += pSpeed;
        if (!checkWallCollision(nx, state.player.y, SETTING.PLAYER_COLLISION_SIZE)) state.player.x = nx;
        if (!checkWallCollision(state.player.x, ny, SETTING.PLAYER_COLLISION_SIZE)) state.player.y = ny;

        if (now - state.lastBGMTime > 1200) {
          playSynthesizedSound(SETTING.AUDIO.HEARTBEAT_BGM_FAST, 'sine', 0.18, 0.65); 
          setTimeout(() => playSynthesizedSound(SETTING.AUDIO.HEARTBEAT_BGM_SLOW, 'sine', 0.14, 0.5), 240);
          state.lastBGMTime = now;
        }
        if (Math.random() < 0.0035) playDistantGunshot();

        if (Math.sqrt(Math.pow(state.player.x - exitWorldX, 2) + Math.pow(state.player.y - exitWorldY, 2)) < 100) {
          if (state.nodes.filter(n => n.isCaptured).length >= 1) { setGameStage('victory'); return; }
          else { setFailReason(t.fail_no_photo); setGameStage('gameover'); return; }
        }

        if (now - state.lastWhisperTime > 7000) {
          const whispersPool = LOCALIZATION[lang].whispers;
          setTopWhisper(whispersPool[Math.floor(Math.random() * whispersPool.length)]); state.lastWhisperTime = now;
        }

        const pgX = Math.floor(state.player.x / SETTING.CELL_SIZE); const pgY = Math.floor(state.player.y / SETTING.CELL_SIZE);
        let anyClose = false;

        state.enemies.forEach(en => {
          if (en.isStunned) { if (now > en.stunTime) en.isStunned = false; return; }
          const egX = Math.floor(en.x / SETTING.CELL_SIZE); const egY = Math.floor(en.y / SETTING.CELL_SIZE);
          
          if (now - en.lastStep > 450) {
            const nextGrid = getNextGridStep(egX, egY, pgX, pgY, state.maze, mapSize);
            en.targetX = nextGrid.x * SETTING.CELL_SIZE + SETTING.CELL_SIZE / 2; en.targetY = nextGrid.y * SETTING.CELL_SIZE + SETTING.CELL_SIZE / 2;
            en.lastStep = now;
          }

          if (en.targetX !== undefined) {
            const dx = en.targetX - en.x; const dy = en.targetY - en.y; const d = Math.sqrt(dx*dx + dy*dy);
            const enemyAdaptiveSpeed = SETTING.ENEMY_SPEEDS[difficulty] || SETTING.ENEMY_SPEEDS.custom;
            if (d > 5) { en.x += (dx/d) * enemyAdaptiveSpeed; en.y += (dy/d) * enemyAdaptiveSpeed; }
          }

          const ex = en.x - state.player.x; const ey = en.y - state.player.y; const dist = Math.sqrt(ex*ex + ey*ey);
          if (dist < 1350) {
            const pan = Math.min(1, Math.max(-1, ex / 450)); const vol = Math.max(0, 1 - dist / 1350);
            en.lastFootstep = en.lastFootstep || 0;
            if (now - en.lastFootstep > Math.max(160, (dist / 1350) * 950)) { playSpatialFootstep(pan, vol); en.lastFootstep = now; }
          }

          if (dist < 80) { anyClose = true; if (state.closeEnemyId === null) { state.closeEnemyId = en.id; state.dangerStartTime = now; } }
        });

        if (state.closeEnemyId !== null) {
          if (now - state.dangerStartTime > SETTING.REACTION_TIME_LIMIT) {
            setFailReason(lang === 'en' ? `Caught inside the dark grid alley by [${state.closeEnemyId}], all frames exposed.` : `在漆黑的不透光胡同里，你遭遇了【${state.closeEnemyId}】的拦截，底片全部曝光。`);
            setGameStage('gameover'); return;
          }
        } else { if (!anyClose) state.closeEnemyId = null; }
      }

      // ==================== RAYCASTING LIGHTING ====================
      ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, w, h);
      const lookAngle = Math.atan2(state.mouseY - cy, state.mouseX - cx);
      const beamSpread = SETTING.RAYCAST_BEAM_SPREAD; const maxRange = SETTING.RAYCAST_MAX_RANGE;

      ctx.save(); ctx.beginPath(); ctx.moveTo(cx, cy);
      const rayCount = SETTING.RAYCAST_COUNT;
      for (let i = 0; i <= rayCount; i++) {
        const ang = (lookAngle - beamSpread / 2) + beamSpread * (i / rayCount);
        let curX = state.player.x; let curY = state.player.y; let stepDist = 0;
        while (stepDist < maxRange) {
          curX += Math.cos(ang) * 12; curY += Math.sin(ang) * 12; stepDist += 12;
          const gx = Math.floor(curX / SETTING.CELL_SIZE); const gy = Math.floor(curY / SETTING.CELL_SIZE);
          if (gx < 0 || gx >= mapSize || gy < 0 || gy >= mapSize || state.maze[gy][gx] === 1) break;
        }
        ctx.lineTo(curX - state.player.x + cx, curY - state.player.y + cy);
      }
      ctx.closePath(); ctx.clip();

      ctx.fillStyle = '#040404'; ctx.fillRect(0, 0, w, h);

      const startGridX = Math.max(0, Math.floor((state.player.x - cx) / SETTING.CELL_SIZE)); const endGridX = Math.min(mapSize, Math.ceil((state.player.x + cx) / SETTING.CELL_SIZE));
      const startGridY = Math.max(0, Math.floor((state.player.y - cy) / SETTING.CELL_SIZE)); const endGridY = Math.min(mapSize, Math.ceil((state.player.y + cy) / SETTING.CELL_SIZE));

      for (let gy = startGridY; gy < endGridY; gy++) {
        for (let gx = startGridX; gx < endGridX; gx++) {
          const sx = gx * SETTING.CELL_SIZE - state.player.x + cx; const sy = gy * SETTING.CELL_SIZE - state.player.y + cy;
          if (state.maze[gy][gx] === 1) { ctx.fillStyle = '#151515'; ctx.fillRect(sx, sy, SETTING.CELL_SIZE, SETTING.CELL_SIZE); ctx.strokeStyle = '#090909'; ctx.lineWidth = 1.5; ctx.strokeRect(sx, sy, SETTING.CELL_SIZE, SETTING.CELL_SIZE); }
        }
      }

      const tAnWorldX = (mapSize/2)*SETTING.CELL_SIZE; const tAnWorldY = (mapSize/2)*SETTING.CELL_SIZE;
      ctx.fillStyle = 'rgba(110,0,0,0.3)'; ctx.fillRect(tAnWorldX - state.player.x + cx - 180, tAnWorldY - state.player.y + cy - 90, 360, 180);

      // 安全撤离大门区
      const exX = exitWorldX - state.player.x + cx; const exY = exitWorldY - state.player.y + cy;
      ctx.fillStyle = 'rgba(0, 230, 70, 0.22)'; ctx.fillRect(exX - SETTING.CELL_SIZE / 2, exY - SETTING.CELL_SIZE / 2, SETTING.CELL_SIZE, SETTING.CELL_SIZE);
      ctx.strokeStyle = '#00ff55'; ctx.lineWidth = 3; ctx.strokeRect(exX - SETTING.CELL_SIZE / 2, exY - SETTING.CELL_SIZE / 2, SETTING.CELL_SIZE, SETTING.CELL_SIZE);
      ctx.fillStyle = '#00ff55'; ctx.font = "bold 15px monospace"; ctx.textAlign = 'center'; ctx.fillText(t.exit_label, exX, exY + 5);

      state.nodes.forEach(n => {
        if (n.isCaptured) return;
        const nx = n.worldX - state.player.x; const ny = n.worldY - state.player.y; const d = Math.sqrt(nx*nx + ny*ny);
        const ang = Math.atan2(ny, nx); const diff = Math.atan2(Math.sin(lookAngle - ang), Math.cos(lookAngle - ang));
        if (d < maxRange && Math.abs(diff) < beamSpread / 2 && !capturedImage) { n.revealLevel = Math.min(n.revealLevel + 0.012, 0.6); }
        else if (!capturedImage) { n.revealLevel = Math.max(n.revealLevel - 0.02, 0); }
        if (n.revealLevel > 0 && n.htmlImg) {
          ctx.save(); ctx.globalAlpha = n.revealLevel; ctx.filter = `grayscale(100%) brightness(0.38) sepia(20%)`;
          ctx.drawImage(n.htmlImg, n.worldX - state.player.x + cx - 60, n.worldY - state.player.y + cy - 45, 120, 90); ctx.restore();
        }
      });

      const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, maxRange * 0.95); grad.addColorStop(0, 'rgba(255, 250, 210, 0.03)'); grad.addColorStop(1, 'rgba(0, 0, 0, 0.99)');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h); ctx.restore();

      const needMap = difficulty === 'easy' || (difficulty === 'custom' && customMap);
      if (needMap) {
        const miniSize = 180; const mapRatio = miniSize / mapSize; const mx = w - miniSize - 30; const my = 30;
        ctx.save(); ctx.fillStyle = 'rgba(0, 0, 0, 0.88)'; ctx.fillRect(mx, my, miniSize, miniSize);
        ctx.strokeStyle = '#00ff00'; ctx.lineWidth = 1.5; ctx.strokeRect(mx, my, miniSize, miniSize);
        for (let y = 0; y < mapSize; y++) {
          for (let x = 0; x < mapSize; x++) { if (state.maze[y][x] === 1) { ctx.fillStyle = '#3a3a3a'; ctx.fillRect(mx + x * mapRatio, my + y * mapRatio, mapRatio + 0.5, mapRatio + 0.5); } }
        }
        ctx.fillStyle = '#00ff00'; ctx.fillRect(mx + state.exitGrid.x * mapRatio, my + state.exitGrid.y * mapRatio, mapRatio * 1.5, mapRatio * 1.5);
        ctx.fillStyle = '#00aaff'; ctx.beginPath(); ctx.arc(mx + (state.player.x / SETTING.CELL_SIZE) * mapRatio, my + (state.player.y / SETTING.CELL_SIZE) * mapRatio, 4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else {
        const vecAngle = Math.atan2(exitWorldY - state.player.y, exitWorldX - state.player.x);
        ctx.save(); ctx.translate(w - 60, 60); ctx.rotate(vecAngle); ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-15, -7); ctx.lineTo(15, 0); ctx.lineTo(-15, 7); ctx.stroke(); ctx.restore();
      }

      if (state.closeEnemyId !== null && !capturedImage) {
        ctx.strokeStyle = `rgba(160, 0, 0, ${Math.sin(now / 50) * 0.4 + 0.5})`; ctx.lineWidth = 10; ctx.strokeRect(0, 0, w, h);
      }
      if (state.flashOpacity > 0) { ctx.fillStyle = `rgba(255,255,255,${state.flashOpacity})`; ctx.fillRect(0, 0, w, h); state.flashOpacity -= SETTING.FLASH_FADE_SPEED; if (state.flashOpacity <= 0) state.isFlashing = false; }
      animId = requestAnimationFrame(loop);
    };

    loop();
    return () => {
      cancelAnimationFrame(animId); window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', mouseMove); window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp);
    };
  }, [gameStage, capturedImage, filmCount, mapSize, lang]);

  const getGuideAngle = () => {
    const state = engine.current; if (!state.player || !state.maze) return 0;
    const exitWorldX = state.exitGrid.x * SETTING.CELL_SIZE + SETTING.CELL_SIZE / 2;
    const exitWorldY = state.exitGrid.y * SETTING.CELL_SIZE + SETTING.CELL_SIZE / 2;
    return Math.atan2(exitWorldY - state.player.y, exitWorldX - state.player.x);
  };

  return (
    <>
      <style>
        {`
          @keyframes cinematicBoot {
            0% { background-color: #000; clip-path: circle(0% at 50% 50%); }
            40% { background-color: #0d0101; clip-path: circle(3% at 50% 50%); }
            55% { clip-path: circle(2% at 50% 50%); }
            100% { background-color: #000; clip-path: circle(100% at 50% 50%); }
          }
          @keyframes scrollArchiveIn {
            from { opacity: 0; transform: translateY(50px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .lang-btn { padding: 6px 14px; background: #111; color: #888; border: 1px solid #333; cursor: pointer; font-family: monospace; font-size: 12px; }
          .lang-btn.active { color: #fff; border-color: #ff1a1a; background: #220a0a; }
          
          .sub-menu-panel {
            max-height: 0px; overflow: hidden; opacity: 0;
            transition: max-height 0.5s cubic-bezier(0.1, 0.8, 0.2, 1), opacity 0.4s ease;
            width: 100%; display: flex; flex-direction: column; gap: 15px; align-items: center;
          }
          .sub-menu-panel.open { max-height: 200px; opacity: 1; margin-top: 15px; }
        `}
      </style>
      
      <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#000' }}>
        
        {/* 开场光圈闪烁仪式感动画 */}
        {gameStage === 'boot' && (
          <div style={{ position: 'absolute', width: '100%', height: '100%', zIndex: 999, animation: 'cinematicBoot 2.6s cubic-bezier(0.7, 0, 0.3, 1) forwards', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid #300', boxShadow: '0 0 30px #f00' }} />
          </div>
        )}

        {/* 难度主选单 */}
        {gameStage === 'intro' && (
          <div style={overlayStyle}>
            <div style={{ position: 'absolute', top: 30, display: 'flex', gap: '10px', zIndex: 300 }}>
              <button className={`lang-btn ${lang === 'zh' ? 'active' : ''}`} onClick={() => setLang('zh')}>简体中文</button>
              <button className={`lang-btn ${lang === 'zt' ? 'active' : ''}`} onClick={() => setLang('zt')}>繁體中文</button>
              <button className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>English</button>
              <button className={`lang-btn ${lang === 'ja' ? 'active' : ''}`} onClick={() => setLang('ja')}>日本語</button>
            </div>

            <h1 style={{ color: '#ff1a1a', letterSpacing: '5px', marginBottom: '25px', fontFamily: 'Georgia, serif', marginTop: '40px' }}>{t.title}</h1>
            <div style={{ maxWidth: '700px', textAlign: 'left', lineHeight: '1.9', color: '#ccc', fontSize: '14px', height: '280px', overflowY: 'auto', paddingRight: '15px', borderBottom: '1px solid #222', marginBottom: '30px' }}>
              <p>{t.intro_1}</p>
              <p style={{ marginTop: '12px' }}>{t.intro_2}</p>
              <p style={{ marginTop: '12px', color: '#ffcc00' }}>{t.intro_3}</p>
              <p style={{ marginTop: '12px', color: '#888', fontStyle: 'italic' }}>{t.intro_4}</p>
            </div>
            
            <h3 style={{ color: '#888', marginBottom: '15px', fontSize: '13px' }}>{t.choose_diff}</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '800px', marginBottom: '25px' }}>
              <button onClick={() => startNewGame('easy')} style={btnStyle('#00ff00', '#0a220a')}>{t.easy}</button>
              <button onClick={() => startNewGame('normal')} style={btnStyle('#ffcc00', '#221a0a')}>{t.normal}</button>
              <button onClick={() => startNewGame('hard')} style={btnStyle('#ff1a1a', '#220a0a')}>{t.hard}</button>
              
              <button onClick={() => setShowCustomMenu(!showCustomMenu)} style={btnStyle('#aaa', showCustomMenu ? '#222' : '#050505')}>
                {t.custom} {showCustomMenu ? '▲' : '▼'}
              </button>
            </div>

            {/* 自定义二级拓展配置菜单 */}
            <div className={`sub-menu-panel ${showCustomMenu ? 'open' : ''}`}>
              <div style={{ padding: '20px 35px', background: '#030303', border: '1px dashed #444', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '25px', fontSize: '13px', color: '#aaa' }}>
                <label>
                  {t.custom_size}
                  <input type="number" value={customSize} onChange={(e) => setCustomSize(Math.min(100, Math.max(25, parseInt(e.target.value) || 25)))} style={{ width: '60px', background: '#111', color: '#fff', border: '1px solid #555', padding: '3px 5px', marginLeft: '6px', fontFamily: 'monospace' }} />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  {t.custom_map}
                  <input type="checkbox" checked={customMap} onChange={(e) => setCustomMap(e.target.checked)} style={{ marginLeft: '8px', cursor: 'pointer', transform: 'scale(1.1)' }} />
                </label>
                <button onClick={() => startNewGame('custom')} style={{ padding: '5px 16px', background: '#ff1a1a', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', borderRadius: '2px' }}>GO</button>
              </div>
            </div>
          </div>
        )}

        {/* 潜行世界 */}
        {gameStage === 'playing' && (
          <>
            <canvas ref={canvasRef} style={{ display: 'block' }} />
            <div style={{ position: 'absolute', bottom: 40, left: 40, color: '#fff', fontFamily: 'monospace', fontSize: '14px', textShadow: '0 0 8px red', pointerEvents: 'none' }}>
              {t.film_remains} {filmCount >= 0 ? filmCount : 0} | {t.audio_status} <span style={{ color: '#00ff00' }}>{audioStatus}</span>
            </div>
            {topWhisper && (
              <div style={{ position: 'absolute', top: 35, left: '50%', transform: 'translateX(-50%)', color: '#ffcc00', fontSize: '14px', fontStyle: 'italic', backgroundColor: 'rgba(0,0,0,0.6)', padding: '6px 16px', borderRadius: '4px' }}>
                {t.whisper_rec} {topWhisper}
              </div>
            )}
            
            {difficulty !== 'easy' && !(difficulty === 'custom' && customMap) && (
              <div style={{ position: 'absolute', top: 40, right: 40, width: '60px', height: '60px', border: '2px solid rgba(0,255,0,0.5)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.6)' }}>
                <div style={{ transform: `rotate(${getGuideAngle()}rad)`, width: '0', height: '0', borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '25px solid #00ff00' }} />
              </div>
            )}

            {capturedImage && (
              <div style={overlayStyle}>
                <img src={capturedImage} style={{ maxWidth: '60%', maxHeight: '60%', border: '8px solid #fff', boxShadow: '0 0 40px #fff' }} alt="evidence" />
                <button onClick={() => { setCapturedImage(null); engine.current.keys[' '] = false; }} style={btnStyle('#000000', '#ffffff')}>
                  {t.btn_resume}
                </button>
              </div>
            )}
          </>
        )}

        {/* 显影暗房 */}
        {gameStage === 'victory' && (
          <div style={{ ...overlayStyle, backgroundColor: '#070000', overflowY: 'scroll', padding: '60px 40px', justifyContent: 'flex-start' }}>
            <div style={{ textAlign: 'center', maxWidth: '1100px', width: '100%', marginBottom: showFullArchive ? '10px' : '50px' }}>
              <h2 style={{ color: '#ff3333', letterSpacing: '3px', marginBottom: '5px' }}>{t.victory_h2}</h2>
              <p style={{ color: '#666', fontSize: '13px', marginBottom: '35px' }}>{t.victory_p1}</p>
              
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {Array.from({ length: 5 }).map((_, idx) => {
                  const hasVal = idx < capturedPhotos.length;
                  const photoData = hasVal ? capturedPhotos[idx] : null; 
                  const op = hasVal ? developProgress[idx] : 0;

                  return (
                    <div key={idx} style={{ width: '190px', height: '300px', background: '#040000', border: '1px dashed #2f0a0a', padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: '100%', height: '120px', background: '#100000', overflow: 'hidden' }}>
                        {hasVal && <img src={photoData.path} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'sepia(100%) saturate(180%) contrast(110%)', opacity: op }} alt="dev" />}
                      </div>
                      <p style={{ marginTop: '12px', fontSize: '11.5px', color: `rgba(245,60,60, ${op})`, lineHeight: '1.4', textAlign: 'left' }}>
                        {photoData ? LOCALIZATION[lang].captions[photoData.id] : "（损毁曝光相纸）"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {showFullArchive && (
              <div style={{ width: '100%', maxWidth: '850px', animation: 'scrollArchiveIn 1.5s cubic-bezier(0.1, 0.8, 0.25, 1) forwards', textAlign: 'center', marginTop: '30px' }}>
                <div style={{ borderTop: '2px solid #4a0f0f', margin: '30px 0', padding: '15px 0' }}>
                  <h2 style={{ color: '#ff2222', letterSpacing: '5px', marginBottom: '8px', textShadow: '0 0 12px #f00' }}>{t.victory_perfect}</h2>
                  <p style={{ color: '#777', fontSize: '13px' }}>{t.victory_perfect_p1}</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '35px', width: '100%', marginBottom: '40px' }}>
                  {Array.from({ length: 28 }).map((_, index) => {
                    const photoNum = index + 1;
                    return (
                      <div key={photoNum} style={{ display: 'flex', background: '#030000', border: '1px solid #1a0202', padding: '15px', alignItems: 'center', gap: '25px', textAlign: 'left' }}>
                        <div style={{ width: '220px', height: '150px', background: '#0c0000', overflow: 'hidden', flexShrink: 0 }}>
                          <img src={`/images/photo${photoNum}.jpg`} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'sepia(90%) contrast(110%)' }} alt="archive" />
                        </div>
                        <div>
                          <h5 style={{ color: '#ff4444', fontFamily: 'monospace', marginBottom: '6px' }}>INDEX_ID: FILE_PHOTO_{photoNum}.JPG</h5>
                          <p style={{ color: '#bbb', fontSize: '13px', lineHeight: '1.5' }}>{LOCALIZATION[lang].captions[photoNum]}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ maxWidth: '650px', borderTop: '1px solid #220505', paddingTop: '25px', marginTop: '20px', color: '#887777', fontSize: '14px', lineHeight: '1.8', fontStyle: 'italic', textAlign: 'center' }}>
              {t.reflection}
            </div>
            <button onClick={() => setGameStage('intro')} style={{ ...btnStyle('#ffffff', '#ff3333'), marginTop: '35px', marginBottom: '30px' }}>{t.btn_menu}</button>
          </div>
        )}

        {/* 失败页 */}
        {gameStage === 'gameover' && (
          <div style={overlayStyle}>
            <h2 style={{ color: '#ff1a1a', fontSize: '26px', marginBottom: '20px' }}>{t.fail_title}</h2>
            <p style={{ color: '#888', maxWidth: '550px', marginBottom: '40px', lineHeight: '1.7', textAlign: 'center' }}>{failReason}</p>
            <button onClick={() => startNewGame(difficulty)} style={btnStyle('#ffffff', '#ff1a1a')}>{t.btn_retry}</button>
          </div>
        )}
      </div>
    </>
  );
}

const overlayStyle = {
  position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh',
  backgroundColor: 'rgba(0,0,0,0.97)', zIndex: 200,
  display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
  padding: '20px', color: '#fff', fontFamily: 'monospace'
};

const btnStyle = (textColor, bgColor) => ({
  padding: '12px 28px', background: bgColor, color: textColor, 
  border: `2px solid ${textColor === '#ffffff' ? '#ffffff' : textColor}`,
  fontFamily: 'monospace', fontSize: '13.5px', cursor: 'pointer', fontWeight: 'bold', borderRadius: '4px'
});