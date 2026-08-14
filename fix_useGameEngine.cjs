const fs = require('fs');
const p = 'src/hooks/useGameEngine.ts';
let code = fs.readFileSync(p, 'utf8');

const rendererMap = `const ORB_RENDERERS: Record<string, (ctx: CanvasRenderingContext2D, orb: Orb) => void> = {
  BOMB: (ctx, orb) => {
    ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2); ctx.fillStyle = '#ff0033'; ctx.fill();
    ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.radius * 0.5, 0, Math.PI * 2); ctx.fillStyle = '#000000'; ctx.fill();
    ctx.font = 'bold 12px Courier'; ctx.fillStyle = '#ff0033'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('BOMB', orb.x, orb.y);
  },
  FREEZE: (ctx, orb) => {
    ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2); ctx.fillStyle = '#e0f7fa'; ctx.fill();
    ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 4; ctx.stroke();
    ctx.font = '14px sans-serif'; ctx.fillText('??', orb.x - 7, orb.y + 5);
  },
  GOLD: (ctx, orb) => {
    ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2); ctx.fillStyle = '#ffd700'; ctx.fill();
    ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.radius * 0.7, 0, Math.PI * 2); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
  },
  NORMAL: (ctx, orb) => {
    ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2); ctx.fillStyle = orb.color; ctx.fill();
    ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.radius * 0.8, 0, Math.PI * 2); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  }
};

export const useGameEngine`;

code = code.replace('export const useGameEngine', rendererMap);

const oldRender = /      \/\/ Render Orbs with custom styles per type\n      ctx\.save\(\);\n      ctx\.shadowBlur = isFrozenRef\.current \? 15 : 25;\n      ctx\.shadowColor = orb\.color;[\s\S]*?      ctx\.restore\(\);/;

const newRender = `      // Render Orbs with custom styles per type
      ctx.save();
      ctx.shadowBlur = isFrozenRef.current ? 15 : 25;
      ctx.shadowColor = orb.color;
      
      ORB_RENDERERS[orb.type]?.(ctx, orb);
      
      ctx.restore();`;

code = code.replace(oldRender, newRender);

fs.writeFileSync(p, code);
console.log('done engine');
