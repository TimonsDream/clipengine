import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const BIRD_SIZE = 44;
const BIRD_X = SCREEN_W * 0.28;
const GRAVITY = 1500;
const JUMP_VEL = -480;
const MAX_FALL = 900;

const PIPE_WIDTH = 72;
const PIPE_GAP = 190;
const PIPE_SPEED = 200;
const PIPE_SPACING = 260;

const GROUND_HEIGHT = 90;
const PLAYFIELD_TOP = 0;
const PLAYFIELD_BOTTOM = SCREEN_H - GROUND_HEIGHT;

function randomGapY() {
  const minTop = 70;
  const maxTop = PLAYFIELD_BOTTOM - PIPE_GAP - 70;
  return Math.random() * (maxTop - minTop) + minTop;
}

function makeInitialPipes() {
  const pipes = [];
  let x = SCREEN_W + 120;
  for (let i = 0; i < 4; i++) {
    pipes.push({ id: i, x, gapY: randomGapY(), scored: false });
    x += PIPE_SPACING;
  }
  return pipes;
}

export default function App() {
  const [, forceRender] = useState(0);
  const [gameState, setGameState] = useState('menu'); // 'menu' | 'playing' | 'over'
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const birdY = useRef(SCREEN_H / 2 - BIRD_SIZE / 2);
  const birdV = useRef(0);
  const birdRot = useRef(0);
  const pipes = useRef(makeInitialPipes());
  const nextPipeId = useRef(pipes.current.length);
  const lastFrameTime = useRef(null);
  const rafId = useRef(null);
  const scoreRef = useRef(0);

  const resetGame = () => {
    birdY.current = SCREEN_H / 2 - BIRD_SIZE / 2;
    birdV.current = 0;
    birdRot.current = 0;
    pipes.current = makeInitialPipes();
    nextPipeId.current = pipes.current.length;
    scoreRef.current = 0;
    setScore(0);
    lastFrameTime.current = null;
  };

  const startGame = () => {
    resetGame();
    setGameState('playing');
  };

  const handleTap = () => {
    if (gameState === 'menu') {
      startGame();
      birdV.current = JUMP_VEL;
    } else if (gameState === 'playing') {
      birdV.current = JUMP_VEL;
    } else if (gameState === 'over') {
      startGame();
    }
  };

  useEffect(() => {
    if (gameState !== 'playing') return;

    const step = (t) => {
      if (lastFrameTime.current == null) lastFrameTime.current = t;
      const dt = Math.min((t - lastFrameTime.current) / 1000, 0.05);
      lastFrameTime.current = t;

      birdV.current = Math.min(birdV.current + GRAVITY * dt, MAX_FALL);
      birdY.current += birdV.current * dt;
      birdRot.current = Math.max(-25, Math.min(80, birdV.current * 0.1));

      let gained = 0;
      for (const p of pipes.current) {
        p.x -= PIPE_SPEED * dt;
        if (!p.scored && p.x + PIPE_WIDTH < BIRD_X) {
          p.scored = true;
          gained += 1;
        }
      }
      if (gained > 0) {
        scoreRef.current += gained;
        setScore(scoreRef.current);
      }

      while (pipes.current.length && pipes.current[0].x < -PIPE_WIDTH) {
        pipes.current.shift();
      }
      const last = pipes.current[pipes.current.length - 1];
      if (!last || last.x < SCREEN_W - PIPE_SPACING) {
        const newX = last ? last.x + PIPE_SPACING : SCREEN_W + 100;
        pipes.current.push({
          id: nextPipeId.current++,
          x: newX,
          gapY: randomGapY(),
          scored: false,
        });
      }

      const birdTop = birdY.current;
      const birdBottom = birdY.current + BIRD_SIZE;
      const birdLeft = BIRD_X;
      const birdRight = BIRD_X + BIRD_SIZE;

      let dead = false;
      if (birdBottom >= PLAYFIELD_BOTTOM) {
        birdY.current = PLAYFIELD_BOTTOM - BIRD_SIZE;
        dead = true;
      }
      if (birdTop <= PLAYFIELD_TOP) {
        birdY.current = PLAYFIELD_TOP;
        birdV.current = 0;
      }
      if (!dead) {
        for (const p of pipes.current) {
          if (birdRight > p.x && birdLeft < p.x + PIPE_WIDTH) {
            if (birdTop < p.gapY || birdBottom > p.gapY + PIPE_GAP) {
              dead = true;
              break;
            }
          }
        }
      }

      forceRender((n) => (n + 1) % 1000000);

      if (dead) {
        setHighScore((h) => Math.max(h, scoreRef.current));
        setGameState('over');
        return;
      }

      rafId.current = requestAnimationFrame(step);
    };

    rafId.current = requestAnimationFrame(step);
    return () => {
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
    };
  }, [gameState]);

  return (
    <Pressable style={styles.root} onPress={handleTap}>
      <StatusBar style="light" />

      {/* Sky */}
      <View style={styles.sky} />

      {/* Pipes */}
      {pipes.current.map((p) => (
        <React.Fragment key={p.id}>
          {/* Top pipe */}
          <View
            style={[
              styles.pipe,
              {
                left: p.x,
                top: 0,
                height: p.gapY,
              },
            ]}
          >
            <View style={[styles.pipeCap, { bottom: 0 }]} />
          </View>
          {/* Bottom pipe */}
          <View
            style={[
              styles.pipe,
              {
                left: p.x,
                top: p.gapY + PIPE_GAP,
                height: PLAYFIELD_BOTTOM - (p.gapY + PIPE_GAP),
              },
            ]}
          >
            <View style={[styles.pipeCap, { top: 0 }]} />
          </View>
        </React.Fragment>
      ))}

      {/* Ground */}
      <View style={styles.ground}>
        <View style={styles.groundStripe} />
        <Text style={styles.groundLabel}>· · ·  C R A P P Y  L A N D  · · ·</Text>
      </View>

      {/* Bird */}
      <View
        style={[
          styles.bird,
          {
            top: birdY.current,
            left: BIRD_X,
            transform: [{ rotate: `${birdRot.current}deg` }],
          },
        ]}
      >
        <Text style={styles.birdEmoji}>💩</Text>
      </View>

      {/* Score */}
      {gameState !== 'menu' && (
        <View style={styles.scoreWrap} pointerEvents="none">
          <Text style={styles.scoreText}>{score}</Text>
        </View>
      )}

      {/* Menu overlay */}
      {gameState === 'menu' && (
        <View style={styles.overlay} pointerEvents="none">
          <Text style={styles.title}>CRAPPY BIRD</Text>
          <Text style={styles.subtitle}>like flappy, but worse</Text>
          <View style={styles.panel}>
            <Text style={styles.panelLine}>Tap to flap.</Text>
            <Text style={styles.panelLine}>Don't hit the bad pipes.</Text>
            <Text style={styles.panelLine}>You will lose. Sorry.</Text>
          </View>
          <Text style={styles.cta}>TAP ANYWHERE TO START</Text>
        </View>
      )}

      {/* Game over overlay */}
      {gameState === 'over' && (
        <View style={styles.overlay} pointerEvents="none">
          <Text style={styles.gameOver}>OOPS, YOU CRAPPED OUT</Text>
          <View style={styles.panel}>
            <Text style={styles.panelLine}>Score: {score}</Text>
            <Text style={styles.panelLine}>Best: {Math.max(highScore, score)}</Text>
          </View>
          <Text style={styles.cta}>TAP TO TRY AGAIN</Text>
        </View>
      )}
    </Pressable>
  );
}

const POOP_BROWN = '#7a4a1f';
const POOP_BROWN_DARK = '#4d2e10';
const SKY = '#6dc0d5';
const GROUND = '#caa472';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: SKY,
    overflow: 'hidden',
  },
  sky: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SKY,
  },
  bird: {
    position: 'absolute',
    width: BIRD_SIZE,
    height: BIRD_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  birdEmoji: {
    fontSize: BIRD_SIZE - 4,
    lineHeight: BIRD_SIZE,
    textAlign: 'center',
  },
  pipe: {
    position: 'absolute',
    width: PIPE_WIDTH,
    backgroundColor: POOP_BROWN,
    borderWidth: 3,
    borderColor: POOP_BROWN_DARK,
  },
  pipeCap: {
    position: 'absolute',
    left: -6,
    right: -6,
    height: 22,
    backgroundColor: POOP_BROWN,
    borderWidth: 3,
    borderColor: POOP_BROWN_DARK,
  },
  ground: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: GROUND_HEIGHT,
    backgroundColor: GROUND,
    borderTopWidth: 4,
    borderTopColor: POOP_BROWN_DARK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groundStripe: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#a07d4d',
  },
  groundLabel: {
    color: POOP_BROWN_DARK,
    fontWeight: '700',
    letterSpacing: 2,
    fontSize: 12,
  },
  scoreWrap: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scoreText: {
    color: '#fff',
    fontSize: 72,
    fontWeight: '900',
    textShadowColor: POOP_BROWN_DARK,
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 52,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
    textShadowColor: POOP_BROWN_DARK,
    textShadowOffset: { width: 4, height: 4 },
    textShadowRadius: 0,
  },
  subtitle: {
    color: POOP_BROWN_DARK,
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 24,
  },
  gameOver: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: POOP_BROWN_DARK,
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
    marginBottom: 16,
  },
  panel: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 3,
    borderColor: POOP_BROWN_DARK,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 22,
    marginBottom: 24,
    alignItems: 'center',
  },
  panelLine: {
    color: POOP_BROWN_DARK,
    fontWeight: '700',
    fontSize: 16,
    marginVertical: 2,
  },
  cta: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    backgroundColor: POOP_BROWN,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: POOP_BROWN_DARK,
  },
});
