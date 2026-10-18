// Selective bloom for the CINEMA preset.
//
// three's own post-processing modules are imported lazily, so the base bundle
// never carries them and ECO / BALANCED do not pay for the pass at all. If the
// modules or the GPU cannot support it, the component stays silent and the
// renderer keeps drawing normally.

import { useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface Composer {
  render: () => void;
  setSize: (width: number, height: number) => void;
  dispose: () => void;
}

export function Effects({ strength = 0.3, radius = 0.62, threshold = 0.88 }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const [composer, setComposer] = useState<Composer | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: Composer | null = null;

    void (async () => {
      try {
        const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
          import('three/examples/jsm/postprocessing/EffectComposer.js'),
          import('three/examples/jsm/postprocessing/RenderPass.js'),
          import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
          import('three/examples/jsm/postprocessing/OutputPass.js'),
        ]);
        if (cancelled) return;

        const dimensions = gl.getSize(new THREE.Vector2());
        const instance = new EffectComposer(gl);
        instance.addPass(new RenderPass(scene, camera));
        instance.addPass(
          new UnrealBloomPass(new THREE.Vector2(dimensions.x, dimensions.y), strength, radius, threshold),
        );
        instance.addPass(new OutputPass());
        instance.setSize(dimensions.x, dimensions.y);
        created = instance;
        setComposer(instance);
      } catch (error) {
        console.warn('[f1] bloom pass unavailable, continuing without it', error);
      }
    })();

    return () => {
      cancelled = true;
      created?.dispose();
      setComposer(null);
    };
  }, [gl, scene, camera, strength, radius, threshold]);

  useEffect(() => {
    composer?.setSize(size.width, size.height);
  }, [composer, size.width, size.height]);

  // Priority 1 takes over rendering from the default loop, so the composer's
  // output (with tone mapping applied by OutputPass) is what reaches the canvas.
  useFrame(() => {
    if (composer) composer.render();
    else gl.render(scene, camera);
  }, 1);

  return null;
}
