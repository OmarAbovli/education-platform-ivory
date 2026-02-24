"use client";
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-mobile';

export default function NotFound() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMobile = useIsMobile();
  const playerRef = useRef({ x: 0, y: 0, width: 50, height: 30, speed: 5, dx: 0 });
  const bulletsRef = useRef<{ x: number; y: number; width: number; height: number; speed: number }[]>([]);
  const enemyBulletsRef = useRef<{ x: number; y: number; width: number; height: number; speed: number }[]>([]);
  const bulletSpeed = 7;
  const enemyBulletSpeed = 5;
  const gameLoopRef = useRef<number | null>(null);
  const enemyShootIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let score = 0;
    let gameover = false;
    let enemies: { x: number; y: number; width: number; height: number; speed: number, points: number }[] = [];
    let enemySpeed = 1;
    let enemyDirection = 1;

    const player = playerRef.current;
    const bullets = bulletsRef.current;
    const enemyBullets = enemyBulletsRef.current;

    function resetGame() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const isSmallScreen = canvas.width < 768;

      player.width = isSmallScreen ? 40 : 50;
      player.height = isSmallScreen ? 24 : 30;
      player.x = canvas.width / 2 - player.width / 2;
      player.y = canvas.height - player.height - 20;

      const enemyRows = 4;
      const enemyCols = isSmallScreen ? 6 : 8;
      const enemyWidth = isSmallScreen ? 30 : 40;
      const enemyHeight = isSmallScreen ? 22 : 30;
      const enemyPadding = isSmallScreen ? 10 : 20;
      const enemyOffsetTop = 50;
      const totalEnemiesWidth = enemyCols * (enemyWidth + enemyPadding) - enemyPadding;
      const enemyOffsetLeft = (canvas.width - totalEnemiesWidth) / 2;

      enemies = [];
      for (let c = 0; c < enemyCols; c++) {
        for (let r = 0; r < enemyRows; r++) {
          const points = (4 - r) * 10;
          enemies.push({
            x: c * (enemyWidth + enemyPadding) + enemyOffsetLeft,
            y: r * (enemyHeight + enemyPadding) + enemyOffsetTop,
            width: enemyWidth,
            height: enemyHeight,
            speed: enemySpeed,
            points: points,
          });
        }
      }
      score = 0;
      gameover = false;
      bullets.length = 0;
      enemyBullets.length = 0;
    }

    function drawPlayer() {
      ctx!.fillStyle = '#00ff00';
      ctx!.fillRect(player.x, player.y, player.width, player.height);
    }

    function drawBullets() {
      ctx!.fillStyle = '#ffff00';
      bullets.forEach(bullet => {
        ctx!.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
      });
    }

    function drawEnemyBullets() {
      ctx!.fillStyle = '#ff00ff';
      enemyBullets.forEach(bullet => {
        ctx!.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
      });
    }

    function drawEnemies() {
      enemies.forEach(enemy => {
        ctx!.fillStyle = '#ff0000';
        ctx!.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      });
    }

    function drawScore() {
      ctx!.fillStyle = '#fff';
      ctx!.font = '20px Arial';
      ctx!.fillText(`Score: ${score}`, 20, 30);
    }

    function drawGameOver() {
      ctx!.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx!.fillRect(0, 0, canvas.width, canvas.height);
      ctx!.fillStyle = '#fff';
      ctx!.font = '50px Arial';
      ctx!.textAlign = 'center';
      ctx!.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);
      ctx!.font = '20px Arial';
      ctx!.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2);
    }

    function drawYouWin() {
      ctx!.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx!.fillRect(0, 0, canvas.width, canvas.height);
      ctx!.fillStyle = '#00ff00';
      ctx!.font = '50px Arial';
      ctx!.textAlign = 'center';
      ctx!.fillText('YOU WIN!', canvas.width / 2, canvas.height / 2 - 50);
      ctx!.font = '20px Arial';
      ctx!.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2);
    }


    function update() {
      if (gameover) {
        if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        if (enemyShootIntervalRef.current) clearInterval(enemyShootIntervalRef.current);
        return;
      }

      ctx!.clearRect(0, 0, canvas.width, canvas.height);

      drawPlayer();
      drawBullets();
      drawEnemyBullets();
      drawEnemies();
      drawScore();

      // Move player
      player.x += player.dx;

      // Wall detection for player
      if (player.x < 0) {
        player.x = 0;
      }
      if (player.x + player.width > canvas.width) {
        player.x = canvas.width - player.width;
      }

      // Move bullets
      bullets.forEach((bullet, index) => {
        bullet.y -= bullet.speed;
        if (bullet.y < 0) {
          bullets.splice(index, 1);
        }
      });

      // Move enemy bullets
      enemyBullets.forEach((bullet, index) => {
        bullet.y += bullet.speed;
        if (bullet.y > canvas.height) {
          enemyBullets.splice(index, 1);
        }
      });

      // Move enemies
      let changeDirection = false;
      enemies.forEach(enemy => {
        enemy.x += enemy.speed * enemyDirection;
        if (enemy.x + enemy.width > canvas.width || enemy.x < 0) {
          changeDirection = true;
        }
      });

      if (changeDirection) {
        enemyDirection *= -1;
        enemies.forEach(enemy => {
          enemy.y += enemy.height;
        });
      }


      // Collision detection
      bullets.forEach((bullet, bulletIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
          if (
            bullet.x < enemy.x + enemy.width &&
            bullet.x + bullet.width > enemy.x &&
            bullet.y < enemy.y + enemy.height &&
            bullet.y + bullet.height > enemy.y
          ) {
            bullets.splice(bulletIndex, 1);
            score += enemy.points;
            enemies.splice(enemyIndex, 1);
          }
        });
      });

      enemyBullets.forEach((enemyBullet, enemyBulletIndex) => {
        if (
          enemyBullet.x < player.x + player.width &&
          enemyBullet.x + enemyBullet.width > player.x &&
          enemyBullet.y < player.y + player.height &&
          enemyBullet.y + enemyBullet.height > player.y
        ) {
          gameover = true;
          drawGameOver();
        }

        bullets.forEach((bullet, bulletIndex) => {
          if (
            enemyBullet.x < bullet.x + bullet.width &&
            enemyBullet.x + enemyBullet.width > bullet.x &&
            enemyBullet.y < bullet.y + bullet.height &&
            enemyBullet.y + enemyBullet.height > bullet.y
          ) {
            enemyBullets.splice(enemyBulletIndex, 1);
            bullets.splice(bulletIndex, 1);
          }
        });
      });

      // Game over
      enemies.forEach(enemy => {
        if (enemy.y + enemy.height > player.y) {
          gameover = true;
          drawGameOver();
        }
      });

      if (enemies.length === 0) {
        gameover = true;
        drawYouWin();
      }


      gameLoopRef.current = requestAnimationFrame(update);
    }

    function keyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'd') {
        player.dx = player.speed;
      } else if (e.key === 'ArrowLeft' || e.key === 'a') {
        player.dx = -player.speed;
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        shoot();
      }
    }

    function keyUp(e: KeyboardEvent) {
      if (
        e.key === 'ArrowRight' ||
        e.key === 'd' ||
        e.key === 'ArrowLeft' ||
        e.key === 'a'
      ) {
        player.dx = 0;
      }
    }

    function shoot() {
      if (bullets.length < 5) { // Limit number of bullets on screen
        bullets.push({
          x: player.x + player.width / 2 - 2.5,
          y: player.y,
          width: 5,
          height: 10,
          speed: bulletSpeed,
        });
      }
    }

    function enemyShoot() {
      if (enemies.length > 0) {
        const frontEnemies = new Map<number, { x: number; y: number; width: number; height: number; }>();
        enemies.forEach(enemy => {
          if (!frontEnemies.has(enemy.x) || frontEnemies.get(enemy.x)!.y < enemy.y) {
            frontEnemies.set(enemy.x, enemy);
          }
        });

        const shooters = Array.from(frontEnemies.values());
        const randomShooter = shooters[Math.floor(Math.random() * shooters.length)];

        enemyBullets.push({
          x: randomShooter.x + randomShooter.width / 2 - 2.5,
          y: randomShooter.y + randomShooter.height,
          width: 5,
          height: 10,
          speed: enemyBulletSpeed,
        });
      }
    }

    function handleResize() {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      if (enemyShootIntervalRef.current) {
        clearInterval(enemyShootIntervalRef.current);
      }
      resetGame();
      enemyShootIntervalRef.current = setInterval(enemyShoot, 1000);
      update();
    }

    window.addEventListener('resize', handleResize);
    document.addEventListener('keydown', keyDown);
    document.addEventListener('keyup', keyUp);

    resetGame();
    enemyShootIntervalRef.current = setInterval(enemyShoot, 1000);
    update();

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('keydown', keyDown);
      document.removeEventListener('keyup', keyUp);
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      if (enemyShootIntervalRef.current) {
        clearInterval(enemyShootIntervalRef.current);
      }
    }

  }, []);

  const moveLeft = () => {
    playerRef.current.dx = -playerRef.current.speed;
  };

  const moveRight = () => {
    playerRef.current.dx = playerRef.current.speed;
  };

  const stopMoving = () => {
    playerRef.current.dx = 0;
  };

  const shoot = () => {
    if (bulletsRef.current.length < 5) {
      bulletsRef.current.push({
        x: playerRef.current.x + playerRef.current.width / 2 - 2.5,
        y: playerRef.current.y,
        width: 5,
        height: 10,
        speed: bulletSpeed,
      });
    }
  };

  return (
    <div style={{ background: '#020617', color: '#fff', textAlign: 'center', overflow: 'hidden', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10, width: '90%' }}>
        <h1 style={{ fontSize: 'clamp(2.5rem, 10vw, 6rem)', fontWeight: 'bold', color: '#f8fafc', letterSpacing: '-0.02em' }}>404</h1>
        <h2 style={{ fontSize: 'clamp(1.2rem, 4vw, 2rem)', fontWeight: '600', color: '#10b981', marginTop: '-1rem' }}>Page Not Found</h2>
        <p style={{ fontSize: 'clamp(1rem, 3vw, 1.125rem)', margin: '1.5rem auto', color: '#94a3b8', maxWidth: '600px', lineHeight: '1.6' }}>
          You&apos;ve drifted into outer space. Ward off the invaders or use the portal to return home.
        </p>
        <Link href="/" style={{
          display: 'inline-block',
          padding: '12px 28px',
          background: '#059669',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: '8px',
          marginTop: '10px',
          fontWeight: '600',
          transition: 'all 0.2s px',
          boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)'
        }}>
          Return to Safety
        </Link>
      </div>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      {isMobile && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          width: '100%',
          display: 'flex',
          justifyContent: 'space-around',
          zIndex: 20
        }}>
          <button
            onTouchStart={moveLeft}
            onTouchEnd={stopMoving}
            style={{ background: 'rgba(0, 255, 0, 0.5)', color: '#000', padding: '15px 25px', border: '2px solid #00ff00', borderRadius: '5px', fontSize: '1.5rem' }}
          >
            &lt;
          </button>
          <button
            onClick={shoot}
            style={{ background: 'rgba(255, 0, 0, 0.5)', color: '#fff', padding: '15px 25px', border: '2px solid #ff0000', borderRadius: '5px', fontSize: '1.5rem' }}
          >
            SHOOT
          </button>
          <button
            onTouchStart={moveRight}
            onTouchEnd={stopMoving}
            style={{ background: 'rgba(0, 255, 0, 0.5)', color: '#000', padding: '15px 25px', border: '2px solid #00ff00', borderRadius: '5px', fontSize: '1.5rem' }}
          >
            &gt;
          </button>
        </div>
      )}
    </div>
  );
}
