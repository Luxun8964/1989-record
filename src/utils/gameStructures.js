// src/utils/gameStructures.js
import { SETTING } from './setting';

export const CELL_SIZE = SETTING.CELL_SIZE;

// 使用 Vite 原生的动态资源解析，保证打包后 100% 不断链
export function getImageUrl(photoId) {
  return new URL(`../assets/images/photo${photoId}.jpg`, import.meta.url).href;
}

export function generateAdvancedMaze(gridSize) {
  const actualSize = gridSize % 2 === 0 ? gridSize + 1 : gridSize;
  const grid = Array.from({ length: actualSize }, () => Array(actualSize).fill(1));
  
  function carve(x, y) {
    grid[y][x] = 0;
    const dirs = [[0,2],[0,-2],[2,0],[-2,0]].sort(() => Math.random() - 0.5);
    for (let [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (nx > 0 && nx < actualSize - 1 && ny > 0 && ny < actualSize - 1 && grid[ny][nx] === 1) {
        grid[y + dy/2][x + dx/2] = 0;
        grid[ny][nx] = 0;
        carve(nx, ny);
      }
    }
  }
  
  const carveStartX = Math.floor(Math.random() * ((actualSize - 3) / 2)) * 2 + 1;
  const carveStartY = Math.floor(Math.random() * ((actualSize - 3) / 2)) * 2 + 1;
  carve(carveStartX, carveStartY);

  const floorTiles = [];
  for (let y = 1; y < actualSize - 1; y++) {
    for (let x = 1; x < actualSize - 1; x++) {
      if (grid[y][x] === 1 && Math.random() > 0.83) grid[y][x] = 0; 
      if (grid[y][x] === 0) floorTiles.push({ x, y });
    }
  }

  const start = floorTiles[Math.floor(Math.random() * floorTiles.length)];
  let exit = floorTiles[0];
  
  const minRequiredDist = actualSize * 0.65;
  const validExits = floorTiles.filter(t => Math.sqrt(Math.pow(t.x - start.x, 2) + Math.pow(t.y - start.y, 2)) >= minRequiredDist);
  
  if (validExits.length > 0) {
    exit = validExits[Math.floor(Math.random() * validExits.length)];
  } else {
    let maxD = 0;
    floorTiles.forEach(t => {
      let d = Math.sqrt(Math.pow(t.x - start.x, 2) + Math.pow(t.y - start.y, 2));
      if (d > maxD) { maxD = d; exit = t; }
    });
  }

  const queue = [[start.x, start.y, []]];
  const visited = Array.from({ length: actualSize }, () => Array(actualSize).fill(false));
  visited[start.y][start.x] = true;
  let mainPathCoords = [];

  while (queue.length > 0) {
    const [cx, cy, path] = queue.shift();
    if (cx === exit.x && cy === exit.y) {
      mainPathCoords = [...path, [cx, cy]];
      break;
    }
    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
    for (let [dx, dy] of dirs) {
      const nx = cx + dx, ny = cy + dy;
      if (nx >= 0 && nx < actualSize && ny >= 0 && ny < actualSize && !visited[ny][nx] && grid[ny][nx] === 0) {
        visited[ny][nx] = true;
        queue.push([nx, ny, [...path, [cx, cy]]]);
      }
    }
  }

  const mainPathSet = new Set(mainPathCoords.map(p => `${p[0]},${p[1]}`));
  const decoyCoords = [];
  for (let tile of floorTiles) {
    if (!mainPathSet.has(`${tile.x},${tile.y}`)) decoyCoords.push(tile);
  }

  const availableTiles = decoyCoords.length >= 28 ? decoyCoords : floorTiles;
  const photoIdPool = Array.from({ length: 28 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
  const shuffledTiles = [...availableTiles].sort(() => Math.random() - 0.5);
  
  const photoNodes = Array.from({ length: 28 }, (_, i) => {
    const targetCell = shuffledTiles[i % shuffledTiles.length] || { x: 2, y: 2 };
    const photoId = photoIdPool[i % photoIdPool.length];
    return {
      id: photoId, 
      worldX: targetCell.x * CELL_SIZE + CELL_SIZE / 2,
      worldY: targetCell.y * CELL_SIZE + CELL_SIZE / 2,
      path: getImageUrl(photoId), // 通过 Vite 原生方法获取绝对不丢失的路径
      revealLevel: 0,
      isCaptured: false,
      error: false
    };
  });

  return { grid, photoNodes, decoyCoords, start, exit, actualSize };
}

export function getNextGridStep(enemyGridX, enemyGridY, playerGridX, playerGridY, grid, gridSize) {
  if (enemyGridX === playerGridX && enemyGridY === playerGridY) return { x: enemyGridX, y: enemyGridY };
  const queue = [[enemyGridX, enemyGridY, []]];
  const visited = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));
  visited[enemyGridY][enemyGridX] = true;

  while (queue.length > 0) {
    const [cx, cy, path] = queue.shift();
    if (cx === playerGridX && cy === playerGridY) return path[0] ? { x: path[0][0], y: path[0][1] } : { x: cx, y: cy };
    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
    for (let [dx, dy] of dirs) {
      const nx = cx + dx, ny = cy + dy;
      if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize && !visited[ny][nx] && grid[ny][nx] === 0) {
        visited[ny][nx] = true; queue.push([nx, ny, [...path, [nx, ny]]]);
      }
    }
  }
  return { x: enemyGridX, y: enemyGridY };
}