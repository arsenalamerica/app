import { svgPathBbox } from 'svg-path-bbox';
import svgpath from 'svgpath';

/**
 * Normalizes club logos in src/logos/ to the shape TeamLogo.tsx expects:
 * a single <path> on a square viewBox, cropped to the artwork.
 *
 * Source logos ship with a ~6.25% transparent margin and a 1200x1200 (or
 * 1000x1000) viewBox. This crops to the real bounding box, scales uniformly
 * into SIZE x SIZE, and centers on the non-constraining axis.
 *
 * Paths are merged into one by concatenating their subpaths. No fill-rule is
 * emitted, so rendering uses the SVG default (nonzero) — the same rule the
 * existing logos in src/components/TeamLogo/teams.tsx rely on. Even-odd would
 * punch holes wherever subpaths overlap, and would be silently lost if the
 * path data is ever extracted into a bare `d` string.
 *
 * Idempotent: re-running finds a tight bbox, computes scale 1, and no-ops.
 */

const SIZE = 512;
const PADDING = 0;

// Rounding to 2 decimals leaves a bbox a hair under SIZE (511.9933, say). Without
// a tolerance the next run would rescale by 1.000013 and churn coordinates, so a
// file that is already normalized would never stop producing a diff.
const EPSILON = 0.1;

const fitToSquare = {
  name: 'fitToSquare',
  fn: () => ({
    element: {
      enter: (node, parent) => {
        if (node.name !== 'svg' || parent.type !== 'root') return;

        const paths = [];
        const walk = (n) => {
          for (const child of n.children ?? []) {
            if (child.name === 'path' && child.attributes.d) {
              paths.push({ node: child, parent: n });
            }
            walk(child);
          }
        };
        walk(node);
        if (paths.length === 0) return;

        // Bounding boxes are computed from path data alone. Anything that moves
        // or thickens geometry would make that wrong, so refuse rather than
        // emit a silently mis-cropped logo.
        const unsupported = new Set();
        const check = (n) => {
          for (const child of n.children ?? []) {
            if (child.type === 'element' && child.name !== 'path') {
              unsupported.add(`<${child.name}>`);
            }
            if (child.attributes?.transform)
              unsupported.add(`transform on <${child.name}>`);
            if (
              child.attributes?.stroke &&
              child.attributes.stroke !== 'none'
            ) {
              unsupported.add(`stroke on <${child.name}>`);
            }
            check(child);
          }
        };
        check(node);
        if (unsupported.size > 0) {
          throw new Error(
            `fitToSquare: unsupported content: ${[...unsupported].join(', ')}`,
          );
        }

        const boxes = paths.map((p) => svgPathBbox(p.node.attributes.d));
        const minX = Math.min(...boxes.map((b) => b[0]));
        const minY = Math.min(...boxes.map((b) => b[1]));
        const maxX = Math.max(...boxes.map((b) => b[2]));
        const maxY = Math.max(...boxes.map((b) => b[3]));

        const live = SIZE - PADDING * 2;
        const scale = Math.min(live / (maxX - minX), live / (maxY - minY));
        const dx = (SIZE - (maxX - minX) * scale) / 2 - minX * scale;
        const dy = (SIZE - (maxY - minY) * scale) / 2 - minY * scale;

        const alreadyFitted =
          Math.abs(dx) < EPSILON &&
          Math.abs(dy) < EPSILON &&
          Math.abs(scale - 1) < 0.001;

        for (const p of alreadyFitted ? [] : paths) {
          p.node.attributes.d = svgpath(p.node.attributes.d)
            .scale(scale)
            .translate(dx, dy)
            .round(2)
            .toString();
        }

        // Collapse to a single <path>, dropping any source fill-rule.
        const first = paths[0].node;
        first.attributes.d = paths.map((p) => p.node.attributes.d).join('');
        delete first.attributes['fill-rule'];
        delete first.attributes['clip-rule'];
        for (const p of paths.slice(1)) {
          const siblings = p.parent.children;
          siblings.splice(siblings.indexOf(p.node), 1);
        }

        node.attributes.viewBox = `0 0 ${SIZE} ${SIZE}`;
        delete node.attributes.width;
        delete node.attributes.height;
        if (node.attributes.fill === 'none') delete node.attributes.fill;
      },
    },
  }),
};

export default {
  plugins: [
    fitToSquare,
    { name: 'preset-default', params: { overrides: { removeViewBox: false } } },
    { name: 'convertColors', params: { currentColor: true } },
    'removeDimensions',
  ],
};
