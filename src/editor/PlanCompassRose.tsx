import { Line, Text, Arrow, Group } from 'react-konva';
import { cardinalOffsets, northVectorPlan } from '../lib/compass/orientation';

type Props = {
  cx: number;
  cy: number;
  northAngleDeg: number;
  stageScale: number;
};

export function PlanCompassRose({ cx, cy, northAngleDeg, stageScale }: Props) {
  const radius = 52 / stageScale;
  const fontSize = 13 / stageScale;
  const stroke = 1.5 / stageScale;
  const cardinals = cardinalOffsets(northAngleDeg, radius);
  const north = northVectorPlan(northAngleDeg);

  return (
    <Group x={cx} y={cy} listening={false}>
      <Line
        points={[-radius, 0, radius, 0]}
        stroke="#a8a29e"
        strokeWidth={stroke}
        opacity={0.7}
      />
      <Line
        points={[0, -radius, 0, radius]}
        stroke="#a8a29e"
        strokeWidth={stroke}
        opacity={0.7}
      />
      <Arrow
        points={[0, 0, north.x * radius * 0.85, north.y * radius * 0.85]}
        stroke="#dc2626"
        fill="#dc2626"
        strokeWidth={2 / stageScale}
        pointerLength={8 / stageScale}
        pointerWidth={8 / stageScale}
      />
      {cardinals.map(({ label, x, y }) => (
        <Text
          key={label}
          x={x}
          y={y}
          text={label}
          fontSize={fontSize}
          fontStyle={label === 'N' ? 'bold' : 'normal'}
          fill={label === 'N' ? '#dc2626' : '#57534e'}
          align="center"
          verticalAlign="middle"
          offsetX={fontSize * 0.35}
          offsetY={fontSize * 0.35}
        />
      ))}
    </Group>
  );
}
