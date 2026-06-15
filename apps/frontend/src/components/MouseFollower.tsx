import { useEffect } from "react";
import Shery from "sheryjs";

export function MouseFollower() {
  useEffect(() => {
    Shery.mouseFollower({
      skew: true,
      ease: "cubic-bezier(0.23, 1, 0.320, 1)",
      duration: 0.5,
    });
    Shery.makeMagnet(".magnet", {
      ease: "cubic-bezier(0.23, 1, 0.320, 1)",
      duration: 0.5,
    });
  }, []);

  return null;
}
