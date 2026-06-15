declare module "sheryjs" {
  interface SheryConfig {
    skew?: boolean;
    ease?: string;
    duration?: number;
    y?: number;
    delay?: number;
    multiplier?: number;
    style?: number;
  }

  interface SheryMagnetConfig {
    ease?: string;
    duration?: number;
  }

  interface SheryTextAnimateConfig {
    style?: number;
    y?: number;
    delay?: number;
    duration?: number;
    ease?: string;
    multiplier?: number;
  }

  const Shery: {
    mouseFollower: (config?: SheryConfig) => void;
    makeMagnet: (selector: string, config?: SheryMagnetConfig) => void;
    textAnimate: (selector: string, config?: SheryTextAnimateConfig) => void;
    imageMasker: (selector: string, config?: Record<string, unknown>) => void;
    hoverWithMediaCircle: (
      selector: string,
      config?: Record<string, unknown>,
    ) => void;
    imageEffect: (selector: string, config?: Record<string, unknown>) => void;
  };

  export default Shery;
}
