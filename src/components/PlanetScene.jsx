import { useEffect, useState } from 'react';
import { useTheme } from './theme/ThemeProvider';
import { useEarthScene } from './EarthBackdrop';
export default function PlanetScene() {
  const { theme } = useTheme();
  const scene = useEarthScene('login', theme);
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const viewport = window.matchMedia('(min-width: 1024px)');
    const update = () => setDesktop(viewport.matches);
    update();
    viewport.addEventListener('change', update);
    return () => viewport.removeEventListener('change', update);
  }, []);
  const source =
    scene.current?.src || (theme === 'light' ? '/earth/sky-clouds-01.jpg' : '/earth/earth-01.jpg');
  return (
    <>
      {desktop && (
        <div className="planet-scene" aria-hidden="true">
          <img src={source} alt="" />
        </div>
      )}
      <div className="planet-scene-shade" aria-hidden="true" />
    </>
  );
}
