import { useEffect, useRef, useState, useCallback } from 'react';

export type PadAction =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'confirm'
  | 'back'
  | 'action_x'
  | 'action_y'
  | 'lb'
  | 'rb'
  | 'lt'
  | 'rt'
  | 'menu';

export interface GamepadState {
  connected: boolean;
  activated: boolean;
  gamepadName: string | null;
  padIndex: number | null;
}

interface UseGamepadNavigationOptions {
  enabled?: boolean;
  isGameRunning?: boolean;
  onAction: (action: PadAction) => void;
}

export function useGamepadNavigation({
  enabled = true,
  isGameRunning = false,
  onAction,
}: UseGamepadNavigationOptions) {
  const [padState, setPadState] = useState<GamepadState>({
    connected: false,
    activated: false,
    gamepadName: null,
    padIndex: null,
  });

  // Reference to avoid stale closures in requestAnimationFrame loop
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const isGameRunningRef = useRef(isGameRunning);
  isGameRunningRef.current = isGameRunning;

  // Previous raw inputs for rising-edge detection
  const prevInputsRef = useRef<Record<PadAction, boolean>>({
    up: false,
    down: false,
    left: false,
    right: false,
    confirm: false,
    back: false,
    action_x: false,
    action_y: false,
    lb: false,
    rb: false,
    lt: false,
    rt: false,
    menu: false,
  });

  // Sustained press timing for repeat rates (directional only)
  const repeatTimersRef = useRef<{
    action: PadAction | null;
    startTime: number;
    lastRepeatTime: number;
    isRepeating: boolean;
  }>({
    action: null,
    startTime: 0,
    lastRepeatTime: 0,
    isRepeating: false,
  });

  // Active gamepad index
  const activePadIndexRef = useRef<number | null>(null);
  const activatedRef = useRef<boolean>(false);
  const animFrameIdRef = useRef<number | null>(null);

  // Read standard gamepad
  const readGamepad = useCallback((pad: Gamepad) => {
    const isPressed = (index: number) => Boolean(pad.buttons[index]?.pressed);
    const axisX = pad.axes[0] ?? 0;
    const axisY = pad.axes[1] ?? 0;

    const deadzone = 0.25;
    const thresh = 0.5;

    const filteredX = Math.abs(axisX) > deadzone ? axisX : 0;
    const filteredY = Math.abs(axisY) > deadzone ? axisY : 0;

    // Filter dominant axis to prevent diagonal ambiguity
    let stickUp = false;
    let stickDown = false;
    let stickLeft = false;
    let stickRight = false;

    const absX = Math.abs(filteredX);
    const absY = Math.abs(filteredY);

    if (absX > thresh || absY > thresh) {
      if (absX > absY * 0.9) {
        if (filteredX > thresh) stickRight = true;
        else if (filteredX < -thresh) stickLeft = true;
      }
      if (absY > absX * 0.9) {
        if (filteredY > thresh) stickDown = true;
        else if (filteredY < -thresh) stickUp = true;
      }
    }

    const hatX = pad.axes[6] ?? 0;
    const hatY = pad.axes[7] ?? 0;

    const current: Record<PadAction, boolean> = {
      up: isPressed(12) || stickUp || hatY < -0.5,
      down: isPressed(13) || stickDown || hatY > 0.5,
      left: isPressed(14) || stickLeft || hatX < -0.5,
      right: isPressed(15) || stickRight || hatX > 0.5,
      confirm: isPressed(0), // South button (A / Cross)
      back: isPressed(1),    // East button (B / Circle)
      action_x: isPressed(2),// West button (X / Square)
      action_y: isPressed(3),// North button (Y / Triangle)
      lb: isPressed(4),      // LB / L1
      rb: isPressed(5),      // RB / R1
      lt: isPressed(6) || (pad.axes[2] ?? -1) > 0.5, // LT
      rt: isPressed(7) || (pad.axes[5] ?? -1) > 0.5, // RT
      menu: isPressed(9),    // Start / Options / Menu
    };

    return current;
  }, []);

  // Central polling loop
  useEffect(() => {
    let isRunning = true;

    const pollLoop = () => {
      if (!isRunning) return;

      // 1. If PortStation disabled, game running, or document hidden, sleep loop.
      // Note: Do NOT gate on document.hasFocus() because on Android WebView and
      // Linux WebKitGTK, hasFocus() is false at startup until a touch/mouse click,
      // which would block gamepad navigation on initial launch.
      if (
        !enabledRef.current ||
        isGameRunningRef.current ||
        typeof document === 'undefined' ||
        document.visibilityState === 'hidden'
      ) {
        animFrameIdRef.current = requestAnimationFrame(pollLoop);
        return;
      }

      if (typeof navigator === 'undefined' || !navigator.getGamepads) {
        animFrameIdRef.current = requestAnimationFrame(pollLoop);
        return;
      }

      const gamepads = navigator.getGamepads();
      if (!gamepads) {
        animFrameIdRef.current = requestAnimationFrame(pollLoop);
        return;
      }

      // 2. Select or maintain active gamepad
      let activePad: Gamepad | null = null;
      if (activePadIndexRef.current !== null && gamepads[activePadIndexRef.current]) {
        activePad = gamepads[activePadIndexRef.current];
      } else {
        // Find first available pad
        for (let i = 0; i < gamepads.length; i++) {
          if (gamepads[i]) {
            activePad = gamepads[i];
            activePadIndexRef.current = i;
            break;
          }
        }
      }

      if (!activePad) {
        if (activePadIndexRef.current !== null) {
          activePadIndexRef.current = null;
          activatedRef.current = false;
          setPadState({
            connected: false,
            activated: false,
            gamepadName: null,
            padIndex: null,
          });
        }
        animFrameIdRef.current = requestAnimationFrame(pollLoop);
        return;
      }

      // Check if user has interacted with pad (activation requirement)
      const currentInputs = readGamepad(activePad);
      const anyInputActive = Object.values(currentInputs).some(Boolean);

      if (!activatedRef.current) {
        if (anyInputActive) {
          activatedRef.current = true;
          setPadState({
            connected: true,
            activated: true,
            gamepadName: activePad.id || 'Mando Estándar',
            padIndex: activePad.index,
          });
        } else {
          // Connected but waiting for initial press
          setPadState((prev) => {
            if (prev.connected && !prev.activated) return prev;
            return {
              connected: true,
              activated: false,
              gamepadName: activePad?.id || 'Mando Detectado',
              padIndex: activePad?.index ?? null,
            };
          });
          animFrameIdRef.current = requestAnimationFrame(pollLoop);
          return;
        }
      }

      const prevInputs = prevInputsRef.current;
      const now = performance.now();

      // Directional actions eligible for sustained repeat
      const directionalActions: PadAction[] = ['up', 'down', 'left', 'right'];

      // 3. Process edge detections (rising-edge)
      (Object.keys(currentInputs) as PadAction[]).forEach((action) => {
        const isCurrentlyPressed = currentInputs[action];
        const wasPressed = prevInputs[action];

        if (isCurrentlyPressed && !wasPressed) {
          // Rising edge! Trigger action immediately
          onActionRef.current(action);

          if (directionalActions.includes(action)) {
            repeatTimersRef.current = {
              action,
              startTime: now,
              lastRepeatTime: now,
              isRepeating: false,
            };
          }
        }
      });

      // 4. Handle sustained directional repeat (Initial delay: 350ms, Repeat interval: 110ms)
      const activeRepeat = repeatTimersRef.current;
      if (activeRepeat.action && currentInputs[activeRepeat.action]) {
        const INITIAL_DELAY = 350;
        const REPEAT_INTERVAL = 110;

        if (!activeRepeat.isRepeating) {
          if (now - activeRepeat.startTime >= INITIAL_DELAY) {
            activeRepeat.isRepeating = true;
            activeRepeat.lastRepeatTime = now;
            onActionRef.current(activeRepeat.action);
          }
        } else {
          if (now - activeRepeat.lastRepeatTime >= REPEAT_INTERVAL) {
            activeRepeat.lastRepeatTime = now;
            onActionRef.current(activeRepeat.action);
          }
        }
      } else {
        repeatTimersRef.current.action = null;
      }

      // Update previous inputs for next frame
      prevInputsRef.current = currentInputs;

      animFrameIdRef.current = requestAnimationFrame(pollLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(pollLoop);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [readGamepad]);

  // Listen to standard connection events
  useEffect(() => {
    const handleConnect = (e: GamepadEvent) => {
      activePadIndexRef.current = e.gamepad.index;
      setPadState({
        connected: true,
        activated: false, // Wait for first press to confirm user intent
        gamepadName: e.gamepad.id || 'Mando Conectado',
        padIndex: e.gamepad.index,
      });
    };

    const handleDisconnect = (e: GamepadEvent) => {
      if (activePadIndexRef.current === e.gamepad.index) {
        activePadIndexRef.current = null;
        activatedRef.current = false;
        setPadState({
          connected: false,
          activated: false,
          gamepadName: null,
          padIndex: null,
        });
      }
    };

    window.addEventListener('gamepadconnected', handleConnect);
    window.addEventListener('gamepaddisconnected', handleDisconnect);

    return () => {
      window.removeEventListener('gamepadconnected', handleConnect);
      window.removeEventListener('gamepaddisconnected', handleDisconnect);
    };
  }, []);

  return padState;
}
