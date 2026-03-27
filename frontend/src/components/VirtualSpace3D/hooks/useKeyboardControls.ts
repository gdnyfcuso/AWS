/**
 * 键盘控制 Hook
 * 监听键盘事件，提供按键状态
 */

import { useEffect, useRef, useCallback } from 'react';

export interface UseKeyboardControlsReturn {
  keysPressedRef: React.RefObject<Set<string>>;
  onKeyDown: (event: KeyboardEvent) => void;
  onKeyUp: (event: KeyboardEvent) => void;
}

export function useKeyboardControls(): UseKeyboardControlsReturn {
  const keysPressedRef = useRef<Set<string>>(new Set());

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    keysPressedRef.current.add(event.key);
  }, []);

  const onKeyUp = useCallback((event: KeyboardEvent) => {
    keysPressedRef.current.delete(event.key);
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [onKeyDown, onKeyUp]);

  return {
    keysPressedRef,
    onKeyDown,
    onKeyUp,
  };
}
