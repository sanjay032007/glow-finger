const fs = require('fs');
const p = 'src/hooks/useSmoothDrawing.ts';
let code = fs.readFileSync(p, 'utf8');

// 1. Remove saveDrawing
code = code.replace(/  const saveDrawing = \(\) => \{[\s\S]*?  \};\n\n/, '');
code = code.replace('return { clearCanvas, saveDrawing, saveToGallery, undo };', 'return { clearCanvas, saveToGallery, undo };');

// 2. Add symmetric transforms helper inside renderLoop
const target1 = "if (gameEngine?.isGameMode) {\n            const isPaused = !state.position || state.gesture === 'PAUSE';\n            gameEngine.updatePhysics(ctx, canvas.width, canvas.height, state.position?.x || null, state.position?.y || null, false, isPaused);\n          }\n\n          animationFrameId = requestAnimationFrame(renderLoop);\n          return;\n        }";

const helperCode = `const sym = options.symmetry || 'NONE';
        const getSymmetricTransforms = (symmetry: SymmetryMode) => {
          const transforms: ((x: number, y: number, isVelocity?: boolean) => [number, number])[] = [
            (x, y, isVelocity) => [x, y]
          ];
          if (symmetry === 'HORIZONTAL') {
            transforms.push((x, y, isVelocity) => [isVelocity ? -x : 2 * cx - x, y]);
          } else if (symmetry === 'RADIAL') {
            const angles = [Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
            angles.forEach(angle => {
              const cosA = Math.cos(angle);
              const sinA = Math.sin(angle);
              transforms.push((x, y, isVelocity) => isVelocity 
                ? [x * cosA - y * sinA, x * sinA + y * cosA] 
                : [cx + (x - cx) * cosA - (y - cy) * sinA, cy + (x - cx) * sinA + (y - cy) * cosA]);
            });
          }
          return transforms;
        };
        const transforms = getSymmetricTransforms(sym);`;

code = code.replace(target1, target1 + '\n\n        ' + helperCode);

// 3. Replace cursor symmetry
const cursorOld = `            const sym = options.symmetry || 'NONE';
            if (sym === 'HORIZONTAL') {
              drawCursor(2 * cx - state.position.x, state.position.y, activeColor);
            } else if (sym === 'RADIAL') {
              const angles = [Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
              angles.forEach(angle => {
                const rx = cx + (state.position!.x - cx) * Math.cos(angle) - (state.position!.y - cy) * Math.sin(angle);
                const ry = cy + (state.position!.x - cx) * Math.sin(angle) + (state.position!.y - cy) * Math.cos(angle);
                drawCursor(rx, ry, activeColor);
              });
            }`;
const newCursor = `            transforms.forEach(transform => {
              const [tx, ty] = transform(state.position!.x, state.position!.y);
              if (tx !== state.position!.x || ty !== state.position!.y) {
                drawCursor(tx, ty, activeColor);
              }
            });`;
code = code.replace(cursorOld, newCursor);

// 4. Replace drawSymmetric
const drawSymOld = `        const drawSymmetric = (
          xStart: number, yStart: number,
          xControl: number, yControl: number,
          xEnd: number, yEnd: number,
          w: number,
          strokeCol: string,
          shadowCol: string,
          blurVal: number,
          compositeOp: GlobalCompositeOperation = 'source-over'
        ) => {
          drawCurveSegment(xStart, yStart, xControl, yControl, xEnd, yEnd, w, strokeCol, shadowCol, blurVal, compositeOp);

          const sym = options.symmetry || 'NONE';
          if (sym === 'HORIZONTAL') {
            drawCurveSegment(
              2 * cx - xStart, yStart,
              2 * cx - xControl, yControl,
              2 * cx - xEnd, yEnd,
              w, strokeCol, shadowCol, blurVal, compositeOp
            );
          } else if (sym === 'RADIAL') {
            const angles = [Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
            angles.forEach(angle => {
              const rxStart = cx + (xStart - cx) * Math.cos(angle) - (yStart - cy) * Math.sin(angle);
              const ryStart = cy + (xStart - cx) * Math.sin(angle) + (yStart - cy) * Math.cos(angle);
              const rxControl = cx + (xControl - cx) * Math.cos(angle) - (yControl - cy) * Math.sin(angle);
              const ryControl = cy + (xControl - cx) * Math.sin(angle) + (yControl - cy) * Math.cos(angle);
              const rxEnd = cx + (xEnd - cx) * Math.cos(angle) - (yEnd - cy) * Math.sin(angle);
              const ryEnd = cy + (xEnd - cx) * Math.sin(angle) + (yEnd - cy) * Math.cos(angle);
              drawCurveSegment(rxStart, ryStart, rxControl, ryControl, rxEnd, ryEnd, w, strokeCol, shadowCol, blurVal, compositeOp);
            });
          }
        };`;
const newDrawSym = `        const drawSymmetric = (
          xStart: number, yStart: number,
          xControl: number, yControl: number,
          xEnd: number, yEnd: number,
          w: number,
          strokeCol: string,
          shadowCol: string,
          blurVal: number,
          compositeOp: GlobalCompositeOperation = 'source-over'
        ) => {
          transforms.forEach(transform => {
            const [sx, sy] = transform(xStart, yStart);
            const [cx2, cy2] = transform(xControl, yControl);
            const [ex, ey] = transform(xEnd, yEnd);
            drawCurveSegment(sx, sy, cx2, cy2, ex, ey, w, strokeCol, shadowCol, blurVal, compositeOp);
          });
        };`;
code = code.replace(drawSymOld, newDrawSym);

// 5. Replace spawnParticlesSymmetric
const spawnOld = `        const spawnParticlesSymmetric = (
          px: number, py: number,
          vx: number, vy: number,
          col: string,
          pType: Particle['type'] = 'spark'
        ) => {
          particlesRef.current.push({
            x: px, y: py, vx, vy,
            life: Math.random() * (pType === 'fire' ? 20 : 15) + 10,
            maxLife: pType === 'fire' ? 35 : 25,
            color: col, type: pType
          });

          const sym = options.symmetry || 'NONE';
          if (sym === 'HORIZONTAL') {
            particlesRef.current.push({
              x: 2 * cx - px, y: py,
              vx: -vx, vy,
              life: Math.random() * (pType === 'fire' ? 20 : 15) + 10,
              maxLife: pType === 'fire' ? 35 : 25,
              color: col, type: pType
            });
          } else if (sym === 'RADIAL') {
            const angles = [Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
            angles.forEach(angle => {
              const rpx = cx + (px - cx) * Math.cos(angle) - (py - cy) * Math.sin(angle);
              const rpy = cy + (px - cx) * Math.sin(angle) + (py - cy) * Math.cos(angle);
              
              const rvx = vx * Math.cos(angle) - vy * Math.sin(angle);
              const rvy = vx * Math.sin(angle) + vy * Math.cos(angle);

              particlesRef.current.push({
                x: rpx, y: rpy,
                vx: rvx, vy: rvy,
                life: Math.random() * (pType === 'fire' ? 20 : 15) + 10,
                maxLife: pType === 'fire' ? 35 : 25,
                color: col, type: pType
              });
            });
          }
        };`;
const newSpawn = `        const spawnParticlesSymmetric = (
          px: number, py: number,
          vx: number, vy: number,
          col: string,
          pType: Particle['type'] = 'spark'
        ) => {
          transforms.forEach(transform => {
            const [tx, ty] = transform(px, py);
            const [tvx, tvy] = transform(vx, vy, true);
            particlesRef.current.push({
              x: tx, y: ty, vx: tvx, vy: tvy,
              life: Math.random() * (pType === 'fire' ? 20 : 15) + 10,
              maxLife: pType === 'fire' ? 35 : 25,
              color: col, type: pType
            });
          });
        };`;
code = code.replace(spawnOld, newSpawn);

fs.writeFileSync(p, code);
console.log('Done replacement.');
