import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';

async function main() {
  const compositionId = 'ParticleDemo';

  const combinations = [
    { effectId: 'violet_bouquet', motionId: 'orbit' },
    { effectId: 'violet_bouquet', motionId: 'spiral' },
    { effectId: 'galaxy_dust', motionId: 'orbit' },
    { effectId: 'liquid_gold', motionId: 'orbit' },
  ];

  console.log('Bundling project...');
  const bundled = await bundle(path.join(process.cwd(), 'src/index.ts'), () => undefined, {
    webpackOverride: (config) => config,
  });

  for (const props of combinations) {
    const outputName = `particle-${props.effectId}-${props.motionId}.mp4`;
    console.log(`Rendering ${outputName}...`);
    
    const composition = await selectComposition({
      serveUrl: bundled,
      id: compositionId,
      inputProps: props,
    });

    await renderMedia({
      composition,
      serveUrl: bundled,
      codec: 'h264',
      outputLocation: path.join('out', outputName),
      inputProps: props,
    });
    console.log(`Done rendering ${outputName}!`);
  }
}

main().catch((err) => {
  console.error('Error rendering Particle Demo:', err);
  process.exit(1);
});
