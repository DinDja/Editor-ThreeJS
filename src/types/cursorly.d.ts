declare module 'cursorly.js' {
  export interface CursorlyEffect {
    name: string;
    color: string | string[];
    density?: number;
    size?: [number, number];
    decay?: number;
    shape?: string;
    type?: 'default' | 'emoji' | 'firing' | 'circle';
  }

  export interface CursorlyOptions {
    cursor?: number;
    effect?: Partial<CursorlyEffect>;
    cursorSize?: number;
  }

  export interface CursorlyInstance {
    options: CursorlyOptions;
    enabled: boolean;
    particlesEnabled: boolean;
    effects: string[];
    cursorImage: HTMLImageElement;
    cursorIcons: string[];
    canvas: HTMLCanvasElement;
    addIcon(url: string): number;
    setIcon(index: number): void;
    setEffect(config: Partial<CursorlyEffect>): void;
    enable(): void;
    disable(): void;
    enableEffect(): void;
    disableEffect(): void;
  }

  export interface CursorlyStatic {
    init(options?: CursorlyOptions): CursorlyInstance;
  }

  declare const Cursorly: CursorlyStatic;
  export default Cursorly;
}
